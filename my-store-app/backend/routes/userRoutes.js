const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authMiddleware } = require("../middleware/authMiddleware");
const { loginLimiter, refreshLimiter } = require("../middleware/rateLimit");

// ---------- Công khai (có giới hạn tốc độ) ----------
router.post("/login", loginLimiter, userController.loginUser);
router.post("/refresh-token", refreshLimiter, userController.refreshToken);
router.post("/logout", userController.logoutUser);

// ---------- Tài khoản đang đăng nhập (admin hoặc cửa hàng) ----------
router.use(authMiddleware);
router.get("/me", userController.getMe);
router.post("/change-password", userController.changePassword);

// Quản lý cửa hàng & tài khoản: xem routes/adminRoutes.js (/api/admin, chỉ admin hệ thống)

module.exports = router;
