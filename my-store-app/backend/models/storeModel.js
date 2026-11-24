// Quản lý cửa hàng (chỉ dành cho admin hệ thống).
// Mô hình: mỗi cửa hàng có đúng MỘT tài khoản (role store_admin) dùng chung cho cả cửa hàng.
const db = require("../config/db");

// Chỉ số hoạt động hiển thị cho admin. KHÔNG trả doanh thu: đó là dữ liệu kinh doanh riêng của cửa hàng.
const LIST_COLUMNS = `s.id, s.store_code, s.store_name, s.address, s.phone, s.is_active, s.created_at,
  u.id AS owner_id, u.username, u.full_name, u.last_login_at, u.locked_until,
  (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id AND p.is_active = 1) AS product_count,
  (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id) AS order_count,
  (SELECT MAX(o.created_at) FROM orders o WHERE o.store_id = s.id) AS last_order_at`;

const listStores = async ({ q, status, limit, offset }) => {
  const where = ["1 = 1"];
  const params = [];
  if (q) {
    where.push("(s.store_name LIKE ? OR s.store_code LIKE ? OR u.username LIKE ? OR s.phone LIKE ?)");
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    params.push(like, like, like, like);
  }
  if (status === "active") where.push("s.is_active = 1");
  if (status === "locked") where.push("s.is_active = 0");
  const whereSql = where.join(" AND ");

  const [rows] = await db.query(
    `SELECT ${LIST_COLUMNS}
     FROM stores s LEFT JOIN users u ON u.store_id = s.id
     WHERE ${whereSql}
     ORDER BY s.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM stores s LEFT JOIN users u ON u.store_id = s.id WHERE ${whereSql}`,
    params
  );
  const [[summary]] = await db.query(
    "SELECT COUNT(*) AS total, COALESCE(SUM(is_active = 1), 0) AS active, COALESCE(SUM(is_active = 0), 0) AS locked FROM stores"
  );
  return {
    rows,
    total,
    summary: { total: Number(summary.total), active: Number(summary.active), locked: Number(summary.locked) },
  };
};

const getStoreWithOwner = async (id) => {
  const [rows] = await db.query(
    `SELECT ${LIST_COLUMNS} FROM stores s LEFT JOIN users u ON u.store_id = s.id WHERE s.id = ?`,
    [id]
  );
  return rows[0];
};

const createStore = async (conn, { store_code, store_name, address, phone }) => {
  const [r] = await conn.execute(
    "INSERT INTO stores (store_code, store_name, address, phone) VALUES (?, ?, ?, ?)",
    [store_code, store_name, address, phone]
  );
  return r.insertId;
};

const updateStore = async (id, { store_name, address, phone }) => {
  const [r] = await db.query("UPDATE stores SET store_name = ?, address = ?, phone = ? WHERE id = ?", [
    store_name,
    address,
    phone,
    id,
  ]);
  return r.affectedRows > 0;
};

// Khoá / mở khoá cửa hàng; tài khoản của cửa hàng khoá / mở theo
const setStoreActive = async (id, isActive) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("UPDATE stores SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, id]);
    await conn.query("UPDATE users SET is_active = ? WHERE store_id = ?", [isActive ? 1 : 0, id]);
    if (!isActive) {
      await conn.query(
        `UPDATE refresh_tokens rt JOIN users u ON u.id = rt.user_id
         SET rt.revoked_at = NOW() WHERE u.store_id = ? AND rt.revoked_at IS NULL`,
        [id]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { listStores, getStoreWithOwner, createStore, updateStore, setStoreActive };
