const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware'); // Import middleware bảo vệ

// [POST] /api/users/create-store-admin - Super Admin tạo tài khoản Chủ cửa hàng (Bảo mật: Phải có Token của Super Admin)
router.post('/create-store-admin', authMiddleware, userController.createStoreAdmin);

// [GET] /api/users - Lấy danh sách tài khoản (Chỉ Super Admin)
router.get('/', authMiddleware, userController.getAllUsers);

router.post('/login', userController.loginUser);

router.post('/refresh-token', userController.refreshToken);

module.exports = router;