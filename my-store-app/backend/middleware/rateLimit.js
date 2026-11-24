const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const config = require("../config/env");

const message = (msg) => ({ message: msg });

// Giới hạn chung cho toàn bộ API (chống spam / DoS nhẹ)
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: config.rateLimit.apiPerMinute,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút."),
});

// Chống dò mật khẩu: tính theo IP + tên đăng nhập, chỉ đếm lần thất bại
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimit.loginPerWindow,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const u = typeof req.body?.userName === "string" ? req.body.userName.toLowerCase().slice(0, 50) : "";
    return `${ipKeyGenerator(req.ip)}|${u}`;
  },
  message: message("Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút."),
});

// Giới hạn cấp lại token
const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: message("Quá nhiều yêu cầu làm mới phiên."),
});

module.exports = { apiLimiter, loginLimiter, refreshLimiter };
