const db = require("../config/db");

const PUBLIC_COLUMNS = `u.id, u.store_id, u.username, u.full_name, u.role, u.is_active,
  u.last_login_at, u.created_at, s.store_name, s.store_code`;

const getUserByUsername = async (username) => {
  const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
  return rows[0];
};

const getUserById = async (id) => {
  const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0];
};

const getPublicUserById = async (id) => {
  const [rows] = await db.query(
    `SELECT ${PUBLIC_COLUMNS} FROM users u LEFT JOIN stores s ON s.id = u.store_id WHERE u.id = ?`,
    [id]
  );
  return rows[0];
};

const createUser = async (store_id, username, hashed_password, full_name, role, conn = db) => {
  const [result] = await conn.execute(
    `INSERT INTO users (store_id, username, password, full_name, role, password_changed_at)
     VALUES (?, ?, ?, ?, ?, NULL)`,
    [store_id, username, hashed_password, full_name, role]
  );
  return result.insertId;
};

// Thông tin dùng cho middleware xác thực: trạng thái tài khoản + trạng thái cửa hàng
const getAuthInfo = async (id) => {
  const [rows] = await db.query(
    `SELECT u.id, u.role, u.store_id, u.is_active, u.token_version, s.is_active AS store_active
     FROM users u LEFT JOIN stores s ON s.id = u.store_id WHERE u.id = ?`,
    [id]
  );
  return rows[0];
};

// MySQL đánh giá SET từ trái sang phải: biểu thức thứ hai thấy giá trị failed_attempts mới.
// Nếu lần khoá trước đã hết hạn thì bộ đếm bắt đầu lại từ 1.
const recordFailedLogin = async (id, maxAttempts, lockMinutes) => {
  await db.query(
    `UPDATE users
     SET failed_attempts = IF(locked_until IS NOT NULL AND locked_until <= NOW(), 1, failed_attempts + 1),
         locked_until = IF(failed_attempts >= ?, DATE_ADD(NOW(), INTERVAL ? MINUTE),
                           IF(locked_until IS NOT NULL AND locked_until <= NOW(), NULL, locked_until))
     WHERE id = ?`,
    [maxAttempts, lockMinutes, id]
  );
};

const recordSuccessfulLogin = async (id) => {
  await db.query("UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?", [id]);
};

const updatePassword = async (id, hashed) => {
  await db.query(
    `UPDATE users SET password = ?, password_changed_at = NOW(), token_version = token_version + 1,
       failed_attempts = 0, locked_until = NULL WHERE id = ?`,
    [hashed, id]
  );
};

const getStoreById = async (id) => {
  const [rows] = await db.query("SELECT * FROM stores WHERE id = ?", [id]);
  return rows[0];
};

// ---------- Refresh token ----------
const saveRefreshToken = async ({ userId, tokenHash, familyId, expiresAt, ip, userAgent }) => {
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, created_ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, tokenHash, familyId, expiresAt, ip, userAgent]
  );
};

const findRefreshToken = async (tokenHash) => {
  const [rows] = await db.query("SELECT * FROM refresh_tokens WHERE token_hash = ?", [tokenHash]);
  return rows[0];
};

// Thu hồi có điều kiện để chống 2 request làm mới cùng lúc dùng chung 1 token
const revokeRefreshToken = async (id) => {
  const [r] = await db.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL", [id]);
  return r.affectedRows > 0;
};

const revokeFamily = async (familyId) => {
  await db.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL", [familyId]);
};

const revokeAllForUser = async (userId) => {
  await db.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL", [userId]);
};

const purgeExpiredTokens = async () => {
  await db.query("DELETE FROM refresh_tokens WHERE expires_at < NOW() - INTERVAL 1 DAY");
};

module.exports = {
  getUserByUsername,
  getUserById,
  getPublicUserById,
  createUser,
  getAuthInfo,
  recordFailedLogin,
  recordSuccessfulLogin,
  updatePassword,
  getStoreById,
  saveRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeFamily,
  revokeAllForUser,
  purgeExpiredTokens,
};
