const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config/env");
const userModel = require("../models/userModel");
const audit = require("../utils/audit");
const v = require("../utils/validators");
const { invalidateUser } = require("../middleware/authMiddleware");
const { HttpError, badRequest, unauthorized, forbidden, notFound, asyncHandler } = require("../utils/httpError");

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE = "refreshToken";
// Hash giả để so sánh khi user không tồn tại → thời gian phản hồi như nhau (chống dò tài khoản)
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", BCRYPT_ROUNDS);
const GENERIC_LOGIN_ERROR = "Tên đăng nhập hoặc mật khẩu không chính xác.";

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "strict",
  path: "/api/users",
  maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
});

const signAccessToken = (user) =>
  jwt.sign({ userId: user.id, store_id: user.store_id, role: user.role, tv: user.token_version }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessTtl,
    algorithm: "HS256",
  });

// Cấp refresh token mới (cùng "họ" token để phát hiện token bị đánh cắp và dùng lại)
const issueRefreshToken = async (req, res, userId, familyId = crypto.randomUUID()) => {
  const token = jwt.sign({ userId, fid: familyId, jti: crypto.randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: `${config.jwt.refreshTtlDays}d`,
    algorithm: "HS256",
  });
  await userModel.saveRefreshToken({
    userId,
    tokenHash: sha256(token),
    familyId,
    expiresAt: new Date(Date.now() + config.jwt.refreshTtlDays * 86400000),
    ip: req.ip,
    userAgent: (req.get("user-agent") || "").slice(0, 255),
  });
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
};

const publicUser = (u) => ({
  id: u.id,
  userName: u.username,
  fullName: u.full_name,
  role: u.role,
  store_id: u.store_id,
  storeName: u.store_name || null,
});

// ---------------- ĐĂNG NHẬP ----------------
const loginUser = asyncHandler(async (req, res) => {
  const { userName, password } = req.body || {};
  if (typeof userName !== "string" || typeof password !== "string" || !userName.trim() || !password)
    throw badRequest("Vui lòng nhập tên đăng nhập và mật khẩu.");

  const user = await userModel.getUserByUsername(userName.trim().slice(0, 50));
  const isMatch = await bcrypt.compare(password.slice(0, 72), user ? user.password : DUMMY_HASH);

  if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
    await audit(req, "login_blocked_locked", { storeId: user.store_id, userId: user.id });
    throw new HttpError(423, "Tài khoản tạm khoá do đăng nhập sai nhiều lần. Vui lòng thử lại sau.");
  }

  if (!user || !isMatch) {
    if (user) await userModel.recordFailedLogin(user.id, config.login.maxFailedAttempts, config.login.lockMinutes);
    await audit(req, "login_failed", { storeId: user?.store_id ?? null, userId: user?.id ?? null, detail: { userName: userName.slice(0, 50) } });
    throw badRequest(GENERIC_LOGIN_ERROR);
  }
  if (user.store_id) {
    const store = await userModel.getStoreById(user.store_id);
    if (!store || store.is_active !== 1)
      throw forbidden("Cửa hàng đang bị tạm khoá. Vui lòng liên hệ quản trị viên UniPOS.");
  }
  if (user.is_active !== 1) throw forbidden("Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên UniPOS.");

  await userModel.recordSuccessfulLogin(user.id);
  await issueRefreshToken(req, res, user.id);
  await audit(req, "login_success", { storeId: user.store_id, userId: user.id });

  const full = await userModel.getPublicUserById(user.id);
  res.status(200).json({ message: "Đăng nhập thành công", token: signAccessToken(user), user: publicUser(full) });
});

// ---------------- LÀM MỚI PHIÊN (xoay vòng refresh token) ----------------
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized("Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.");

  const clear = () => res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret, { algorithms: ["HS256"] });
  } catch {
    clear();
    throw unauthorized("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const stored = await userModel.findRefreshToken(sha256(token));
  if (!stored) {
    clear();
    throw unauthorized("Phiên đăng nhập không hợp lệ.");
  }
  // Token đã bị thu hồi mà vẫn được dùng lại → có thể bị đánh cắp: thu hồi cả họ token
  if (stored.revoked_at) {
    await userModel.revokeFamily(stored.family_id);
    await audit(req, "refresh_token_reuse_detected", { userId: stored.user_id, storeId: null });
    clear();
    throw unauthorized("Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.");
  }
  if (new Date(stored.expires_at) < new Date()) {
    clear();
    throw unauthorized("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }

  const user = await userModel.getUserById(payload.userId);
  if (!user || user.is_active !== 1) {
    await userModel.revokeAllForUser(payload.userId);
    clear();
    throw unauthorized("Tài khoản không tồn tại hoặc đã bị khoá.");
  }

  // Thu hồi có điều kiện: nếu 2 tab làm mới cùng lúc, chỉ 1 request thắng
  const won = await userModel.revokeRefreshToken(stored.id);
  if (!won) throw unauthorized("Phiên đăng nhập vừa được làm mới ở nơi khác. Vui lòng tải lại trang.");

  await issueRefreshToken(req, res, user.id, stored.family_id);
  res.status(200).json({ message: "Cấp lại token thành công", token: signAccessToken(user) });
});

// ---------------- ĐĂNG XUẤT ----------------
const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    const stored = await userModel.findRefreshToken(sha256(token));
    if (stored) {
      await userModel.revokeFamily(stored.family_id);
      await audit(req, "logout", { userId: stored.user_id, storeId: null });
    }
  }
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.status(200).json({ message: "Đã đăng xuất." });
});

// ---------------- THÔNG TIN CÁ NHÂN ----------------
const getMe = asyncHandler(async (req, res) => {
  const user = await userModel.getPublicUserById(req.user.userId);
  if (!user) throw notFound("Không tìm thấy tài khoản.");
  res.json({ data: publicUser(user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== "string" || !currentPassword) throw badRequest("Vui lòng nhập mật khẩu hiện tại.");
  v.password(newPassword, "Mật khẩu mới");
  if (currentPassword === newPassword) throw badRequest("Mật khẩu mới phải khác mật khẩu hiện tại.");

  const user = await userModel.getUserById(req.user.userId);
  if (!(await bcrypt.compare(currentPassword.slice(0, 72), user.password)))
    throw badRequest("Mật khẩu hiện tại không chính xác.");

  await userModel.updatePassword(user.id, await bcrypt.hash(newPassword, BCRYPT_ROUNDS));
  await userModel.revokeAllForUser(user.id); // đăng xuất mọi thiết bị khác
  invalidateUser(user.id);
  await audit(req, "password_changed", { entity: "user", entityId: user.id });

  // Cấp phiên mới cho thiết bị hiện tại (token mang token_version mới)
  await issueRefreshToken(req, res, user.id);
  const updated = await userModel.getUserById(user.id);
  res.json({ message: "Đổi mật khẩu thành công.", token: signAccessToken(updated) });
});

module.exports = { loginUser, refreshToken, logoutUser, getMe, changePassword, BCRYPT_ROUNDS };
