const jwt = require("jsonwebtoken");
const config = require("../config/env");
const userModel = require("../models/userModel");
const { unauthorized, forbidden } = require("../utils/httpError");

// Cache ngắn hạn trạng thái tài khoản để không phải truy vấn DB ở mọi request,
// nhưng vẫn khoá được tài khoản bị vô hiệu hoá trong vòng tối đa CACHE_MS.
const CACHE_MS = 10 * 1000;
const cache = new Map();

const loadAccount = async (userId) => {
  const hit = cache.get(userId);
  if (hit && hit.exp > Date.now()) return hit.data;
  const user = await userModel.getAuthInfo(userId);
  const data = user
    ? {
        // Tài khoản cửa hàng chỉ hoạt động khi cả tài khoản lẫn cửa hàng đều đang mở
        active: user.is_active === 1 && (user.store_id === null || user.store_active === 1),
        role: user.role,
        store_id: user.store_id,
        tokenVersion: user.token_version,
      }
    : null;
  cache.set(userId, { data, exp: Date.now() + CACHE_MS });
  if (cache.size > 10000) cache.delete(cache.keys().next().value);
  return data;
};

// Xoá cache khi đổi trạng thái/quyền/mật khẩu để có hiệu lực ngay
const invalidateUser = (userId) => cache.delete(Number(userId));

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.header("Authorization") || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw unauthorized("Truy cập bị từ chối. Không tìm thấy token.");

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret, { algorithms: ["HS256"] });
    } catch {
      throw unauthorized("Token không hợp lệ hoặc đã hết hạn.");
    }

    const account = await loadAccount(Number(payload.userId));
    if (!account || !account.active) throw unauthorized("Tài khoản không tồn tại hoặc đã bị khoá.");

    // Token cấp trước lần đổi mật khẩu gần nhất thì không còn hiệu lực
    if ((payload.tv ?? 0) !== account.tokenVersion)
      throw unauthorized("Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.");

    // Luôn dùng quyền & cửa hàng từ DB, không tin hoàn toàn vào token
    req.user = { userId: Number(payload.userId), role: account.role, store_id: account.store_id };
    next();
  } catch (err) {
    next(err);
  }
};

// Chỉ cho phép các vai trò được liệt kê
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(forbidden());
  next();
};

// Các API nghiệp vụ cửa hàng bắt buộc tài khoản phải thuộc một cửa hàng
const requireStore = (req, res, next) => {
  if (!req.user?.store_id) return next(forbidden("Tài khoản không thuộc cửa hàng nào."));
  next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.requireStore = requireStore;
module.exports.invalidateUser = invalidateUser;
