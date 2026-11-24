const crypto = require("crypto");
const db = require("../config/db");
const { badRequest, conflict, notFound } = require("../utils/httpError");

// Mã đơn duy nhất kể cả khi nhiều quầy thanh toán cùng một mili-giây
const newCode = (prefix) =>
  `${prefix}${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

// Khoá các dòng sản phẩm theo thứ tự id tăng dần → tránh deadlock khi bán đồng thời
const lockProducts = async (connection, store_id, productIds) => {
  const sorted = [...productIds].sort((a, b) => a - b);
  const [rows] = await connection.query(
    `SELECT id, name, sell_price, cost_price, stock_quantity
     FROM products
     WHERE store_id = ? AND is_active = 1 AND id IN (?)
     ORDER BY id
     FOR UPDATE`,
    [store_id, sorted]
  );
  return new Map(rows.map((r) => [r.id, r]));
};

// Tạo hoá đơn bán hàng. Giá & tổng tiền do SERVER tính từ DB, không tin dữ liệu client.
const createOrderTransaction = async (store_id, user_id, { items, payment_method, note }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const products = await lockProducts(connection, store_id, items.map((i) => i.product_id));
    const lines = [];
    const shortages = [];
    for (const item of items) {
      const p = products.get(item.product_id);
      if (!p) throw badRequest(`Sản phẩm #${item.product_id} không tồn tại hoặc đã ngừng bán.`);
      if (p.stock_quantity < item.quantity)
        shortages.push({ product_id: p.id, name: p.name, requested: item.quantity, available: p.stock_quantity });
      const price = Number(p.sell_price);
      lines.push({ ...item, price, cost_price: Number(p.cost_price), subtotal: Math.round(price * item.quantity * 100) / 100 });
    }
    if (shortages.length) {
      const err = conflict(
        "Không đủ hàng trong kho: " + shortages.map((s) => `${s.name} (còn ${s.available})`).join(", ")
      );
      err.details = shortages;
      throw err;
    }

    const total = Math.round(lines.reduce((s, l) => s + l.subtotal, 0) * 100) / 100;
    const orderCode = newCode("HD");
    const [orderResult] = await connection.query(
      "INSERT INTO orders (store_id, order_code, user_id, total_amount, payment_method, note) VALUES (?, ?, ?, ?, ?, ?)",
      [store_id, orderCode, user_id, total, payment_method, note]
    );
    const order_id = orderResult.insertId;

    await connection.query(
      "INSERT INTO order_details (order_id, product_id, quantity, price, cost_price, subtotal) VALUES ?",
      [lines.map((l) => [order_id, l.product_id, l.quantity, l.price, l.cost_price, l.subtotal])]
    );
    for (const l of lines) {
      await connection.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND store_id = ?", [
        l.quantity,
        l.product_id,
        store_id,
      ]);
    }

    await connection.commit();
    return { success: true, orderCode, order_id, total_amount: total };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Huỷ hoá đơn: hoàn lại tồn kho, giữ lại hoá đơn để đối soát
const cancelOrder = async (store_id, order_id, user_id, reason) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [[order]] = await connection.query("SELECT * FROM orders WHERE id = ? AND store_id = ? FOR UPDATE", [
      order_id,
      store_id,
    ]);
    if (!order) throw notFound("Không tìm thấy hoá đơn.");
    if (order.status === "cancelled") throw conflict("Hoá đơn đã được huỷ trước đó.");

    const [details] = await connection.query(
      "SELECT product_id, quantity FROM order_details WHERE order_id = ? ORDER BY product_id",
      [order_id]
    );
    for (const d of details) {
      await connection.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND store_id = ?", [
        d.quantity,
        d.product_id,
        store_id,
      ]);
    }
    await connection.query(
      "UPDATE orders SET status = 'cancelled', cancelled_by = ?, cancelled_at = NOW(), cancel_reason = ? WHERE id = ?",
      [user_id, reason, order_id]
    );
    await connection.commit();
    return { order_code: order.order_code, total_amount: order.total_amount };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Danh sách hoá đơn có phân trang & lọc theo ngày / trạng thái / mã
const getAllOrders = async (store_id, { limit, offset, from, to, status, q }) => {
  const where = ["o.store_id = ?"];
  const params = [store_id];
  if (from) {
    where.push("o.created_at >= ?");
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where.push("o.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(to);
  }
  if (status) {
    where.push("o.status = ?");
    params.push(status);
  }
  if (q) {
    where.push("o.order_code LIKE ?");
    params.push(`%${q.replace(/[%_\\]/g, "\\$&")}%`);
  }
  const whereSql = where.join(" AND ");
  const [rows] = await db.query(
    `SELECT o.id, o.order_code, o.total_amount, o.payment_method, o.status, o.created_at,
            u.full_name AS cashier_name, u.username AS cashier_username,
            (SELECT COALESCE(SUM(quantity),0) FROM order_details WHERE order_id = o.id) AS item_count
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE ${whereSql}
     ORDER BY o.created_at DESC, o.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM orders o WHERE ${whereSql}`, params);
  return { rows, total };
};

const getOrderById = async (order_id, store_id) => {
  const [orderInfo] = await db.query(
    `SELECT o.*, u.full_name AS cashier_name, cu.full_name AS cancelled_by_name, s.store_name, s.address AS store_address
     FROM orders o
     JOIN users u ON o.user_id = u.id
     JOIN stores s ON s.id = o.store_id
     LEFT JOIN users cu ON cu.id = o.cancelled_by
     WHERE o.id = ? AND o.store_id = ?`,
    [order_id, store_id]
  );
  if (orderInfo.length === 0) return null;

  // Sửa lỗi cũ: cột tên sản phẩm là p.name (không phải p.product_name)
  const [orderDetails] = await db.query(
    `SELECT od.id, od.product_id, od.quantity, od.price, od.subtotal, p.name AS product_name, p.barcode
     FROM order_details od
     JOIN products p ON od.product_id = p.id
     WHERE od.order_id = ?`,
    [order_id]
  );
  return { ...orderInfo[0], items: orderDetails };
};

module.exports = { createOrderTransaction, cancelOrder, getAllOrders, getOrderById, newCode, lockProducts };
