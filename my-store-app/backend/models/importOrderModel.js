const db = require("../config/db");
const { badRequest } = require("../utils/httpError");
const { newCode, lockProducts } = require("./orderModel");

// Tạo phiếu nhập hàng: cộng tồn kho và cập nhật giá vốn bình quân gia quyền
const createImportOrder = async (store_id, user_id, { items, supplier_name, note }) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const products = await lockProducts(connection, store_id, items.map((i) => i.product_id));
    const lines = items.map((item) => {
      if (!products.has(item.product_id))
        throw badRequest(`Sản phẩm #${item.product_id} không tồn tại hoặc đã ngừng kinh doanh.`);
      return { ...item, subtotal: Math.round(item.price * item.quantity * 100) / 100 };
    });
    const total = Math.round(lines.reduce((s, l) => s + l.subtotal, 0) * 100) / 100;

    const orderCode = newCode("PN");
    const [importResult] = await connection.query(
      "INSERT INTO import_orders (store_id, order_code, user_id, supplier_name, note, total_amount) VALUES (?, ?, ?, ?, ?, ?)",
      [store_id, orderCode, user_id, supplier_name, note, total]
    );
    const importId = importResult.insertId;

    await connection.query(
      "INSERT INTO import_order_details (import_order_id, product_id, quantity, price, subtotal) VALUES ?",
      [lines.map((l) => [importId, l.product_id, l.quantity, l.price, l.subtotal])]
    );

    for (const l of lines) {
      const p = products.get(l.product_id);
      const oldQty = Math.max(0, p.stock_quantity);
      const newQty = oldQty + l.quantity;
      // Giá vốn bình quân = (tồn cũ × giá cũ + nhập mới × giá nhập) / tổng tồn
      const avgCost = Math.round(((oldQty * Number(p.cost_price) + l.quantity * l.price) / newQty) * 100) / 100;
      await connection.query(
        "UPDATE products SET stock_quantity = stock_quantity + ?, cost_price = ? WHERE id = ? AND store_id = ?",
        [l.quantity, avgCost, l.product_id, store_id]
      );
    }

    await connection.commit();
    return { success: true, importOrderId: importId, orderCode, total_amount: total };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getAllImportOrders = async (store_id, { limit, offset, from, to }) => {
  const where = ["i.store_id = ?"];
  const params = [store_id];
  if (from) {
    where.push("i.created_at >= ?");
    params.push(`${from} 00:00:00`);
  }
  if (to) {
    where.push("i.created_at < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(to);
  }
  const whereSql = where.join(" AND ");
  const [rows] = await db.query(
    `SELECT i.id, i.order_code, i.total_amount, i.supplier_name, i.note, i.created_at,
            u.full_name AS importer_name,
            (SELECT COALESCE(SUM(quantity),0) FROM import_order_details WHERE import_order_id = i.id) AS item_count
     FROM import_orders i
     JOIN users u ON i.user_id = u.id
     WHERE ${whereSql}
     ORDER BY i.created_at DESC, i.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM import_orders i WHERE ${whereSql}`, params);
  return { rows, total };
};

const getImportOrderById = async (import_id, store_id) => {
  const [orderInfo] = await db.query(
    `SELECT i.*, u.full_name AS importer_name
     FROM import_orders i
     JOIN users u ON i.user_id = u.id
     WHERE i.id = ? AND i.store_id = ?`,
    [import_id, store_id]
  );
  if (orderInfo.length === 0) return null;

  // Sửa lỗi cũ: cột tên sản phẩm là p.name
  const [orderDetails] = await db.query(
    `SELECT iod.id, iod.product_id, iod.quantity, iod.price, iod.subtotal, p.name AS product_name, p.barcode
     FROM import_order_details iod
     JOIN products p ON iod.product_id = p.id
     WHERE iod.import_order_id = ?`,
    [import_id]
  );
  return { ...orderInfo[0], items: orderDetails };
};

module.exports = { createImportOrder, getAllImportOrders, getImportOrderById };
