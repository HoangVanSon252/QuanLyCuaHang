// Chức năng của admin hệ thống: quản lý cửa hàng và tài khoản cửa hàng.
// Mỗi cửa hàng có đúng một tài khoản (store_admin); admin tạo, sửa, khoá/mở khoá, đặt lại mật khẩu.
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const userModel = require("../models/userModel");
const storeModel = require("../models/storeModel");
const audit = require("../utils/audit");
const v = require("../utils/validators");
const { invalidateUser } = require("../middleware/authMiddleware");
const { BCRYPT_ROUNDS } = require("./userController");
const { conflict, notFound, asyncHandler } = require("../utils/httpError");

const parseStoreInfo = (body = {}) => ({
  store_name: v.str(body.storeName, "Tên cửa hàng", { required: true, max: 150 }),
  address: v.str(body.address, "Địa chỉ", { max: 255 }),
  phone: v.str(body.phone, "Số điện thoại", { max: 20, pattern: /^[0-9+\s.-]+$/, patternMsg: "Số điện thoại không hợp lệ." }),
});

const loadStore = async (req) => {
  const id = v.id(req.params.id, "Mã cửa hàng");
  const store = await storeModel.getStoreWithOwner(id);
  if (!store) throw notFound("Không tìm thấy cửa hàng.");
  return store;
};

// GET /api/admin/stores?q=&status=active|locked&page=&limit=
const listStores = asyncHandler(async (req, res) => {
  const { page, limit, offset } = v.pagination(req.query);
  const result = await storeModel.listStores({
    q: v.str(req.query.q, "Từ khoá", { max: 100 }),
    status: v.oneOf(req.query.status, "Trạng thái", ["active", "locked"], null),
    limit,
    offset,
  });
  res.json({ data: result.rows, summary: result.summary, page, limit, total: result.total });
});

// GET /api/admin/stores/:id
const getStore = asyncHandler(async (req, res) => {
  res.json({ data: await loadStore(req) });
});

// POST /api/admin/stores — tạo cửa hàng mới kèm tài khoản duy nhất của cửa hàng
const createStore = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const info = parseStoreInfo(body);
  const userName = v.username(body.userName);
  const password = v.password(body.password);
  const fullName = v.str(body.fullName, "Tên chủ cửa hàng", { max: 100 });

  if (await userModel.getUserByUsername(userName)) throw conflict("Tên đăng nhập đã tồn tại.");
  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const storeId = await storeModel.createStore(conn, {
      store_code: `CH${Date.now().toString(36).toUpperCase()}${crypto.randomInt(100, 999)}`,
      ...info,
    });
    const userId = await userModel.createUser(storeId, userName, hashed, fullName, "store_admin", conn);
    await conn.commit();
    await audit(req, "store_created", { entity: "store", entityId: storeId, storeId, detail: { ...info, userName } });
    res.status(201).json({ message: "Tạo cửa hàng thành công", storeId, userId });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// PUT /api/admin/stores/:id — sửa thông tin cửa hàng
const updateStore = asyncHandler(async (req, res) => {
  const store = await loadStore(req);
  const info = parseStoreInfo(req.body);
  await storeModel.updateStore(store.id, info);
  const changes = {};
  for (const k of Object.keys(info)) if ((store[k] ?? null) !== (info[k] ?? null)) changes[k] = { from: store[k], to: info[k] };
  await audit(req, "store_updated", { entity: "store", entityId: store.id, storeId: store.id, detail: changes });
  res.json({ message: "Đã cập nhật thông tin cửa hàng." });
});

// PATCH /api/admin/stores/:id/status — khoá / mở khoá cửa hàng (đăng xuất ngay khi khoá)
const setStoreStatus = asyncHandler(async (req, res) => {
  const store = await loadStore(req);
  const isActive = req.body?.is_active === true || req.body?.is_active === 1;
  await storeModel.setStoreActive(store.id, isActive);
  if (store.owner_id) invalidateUser(store.owner_id);
  await audit(req, isActive ? "store_unlocked" : "store_locked", { entity: "store", entityId: store.id, storeId: store.id });
  res.json({ message: isActive ? "Đã mở khoá cửa hàng." : "Đã khoá cửa hàng. Tài khoản cửa hàng đã bị đăng xuất." });
});

// POST /api/admin/stores/:id/reset-password — đặt lại mật khẩu tài khoản cửa hàng
const resetStorePassword = asyncHandler(async (req, res) => {
  const store = await loadStore(req);
  if (!store.owner_id) throw notFound("Cửa hàng chưa có tài khoản.");
  const newPassword = v.password(req.body?.newPassword, "Mật khẩu mới");
  await userModel.updatePassword(store.owner_id, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
  await userModel.revokeAllForUser(store.owner_id);
  invalidateUser(store.owner_id);
  await audit(req, "password_reset", { entity: "store", entityId: store.id, storeId: store.id });
  res.json({ message: "Đã đặt lại mật khẩu. Tài khoản cửa hàng đã bị đăng xuất khỏi mọi thiết bị." });
});

// GET /api/admin/audit-logs?store_id=&page=&limit=
const getAuditLogs = asyncHandler(async (req, res) => {
  const { limit, offset, page } = v.pagination(req.query);
  const storeId = v.isBlank(req.query.store_id) ? null : v.id(req.query.store_id, "Mã cửa hàng");
  const where = storeId ? "WHERE a.store_id = ?" : "";
  const params = storeId ? [storeId] : [];
  const [rows] = await db.query(
    `SELECT a.id, a.store_id, s.store_name, a.user_id, u.username, a.action, a.entity, a.entity_id, a.ip, a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN stores s ON s.id = a.store_id
     ${where}
     ORDER BY a.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM audit_logs a ${where}`, params);
  res.json({ data: rows, page, limit, total });
});

module.exports = { listStores, getStore, createStore, updateStore, setStoreStatus, resetStorePassword, getAuditLogs };
