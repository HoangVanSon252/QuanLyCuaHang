const userModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Hàm tạo tài khoản chủ cửa hàng (Chỉ Super Admin mới được tạo)
const createStoreAdmin = async (req, res) => {
    try {
        // BẢO MẬT: Chỉ Super Admin (Bạn) mới có quyền tạo tài khoản chủ cửa hàng
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ message: "Từ chối truy cập. Chỉ Super Admin mới có quyền tạo tài khoản." });
        }

        const { store_id, userName, password, fullName } = req.body;

        if (!userName || !password) {
            return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
        }

        const existingUser = await userModel.getUserByUsername(userName);
        if (existingUser) {
            return res.status(400).json({ message: "Tên đăng nhập đã tồn tại" });
        }

        // băm Mật Khẩu Dữ liệu
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // BẢO MẬT: Ép quyền mặc định là Store Admin
        const role = 'store_admin';

        // tạo User mới 
        const newUserId = await userModel.createUser(
            store_id || null,
            userName,
            hashedPassword,
            fullName || null,
            role
        )
        return res.status(201).json({ message: "Tạo tài khoản chủ cửa hàng thành công", userId: newUserId })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
}


// Hàm đăng nhập user
const loginUser = async (req, res) => {
    try {
        const { userName, password } = req.body;

        if (!userName || !password) {
            return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu" });
        }

        // Kiểm tra user có tồn tại không
        const user = await userModel.getUserByUsername(userName);
        if (!user) {
            return res.status(400).json({ message: "Tài khoản không tồn tại" });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Mật khẩu không chính xác" });
        }

        // Tạo JWT Token
        const token = jwt.sign(
            { userId: user.id, store_id: user.store_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_TOKEN,
            { expiresIn: '7d' }
        )
        // 1. Cài đặt HttpOnly Cookie chứa Refresh Token
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true, // Chỉ HTTP mới đọc được, JavaScript (XSS) không thể đụng vào
            secure: process.env.NODE_ENV === 'production',  // Đặt là false khi test ở localhost (HTTP). Khi lên Production (HTTPS) thì phải đổi thành true.
            sameSite: 'strict', // Chống lỗi bảo mật CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000 // Thời gian sống của Cookie (7 ngày, tính bằng miligiây)
        });

        // 2. Chỉ trả về Access Token qua JSON Body cho Frontend
        return res.status(200).json({
            message: "Đăng nhập thành công",
            token,
            user: {
                id: user.id,
                userName: user.username,
                fullName: user.full_name,
                role: user.role,
                store_id: user.store_id
            }
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Lỗi server" });
    }
};

// Hàm cấp lại Access Token mới dựa vào Refresh Token
const refreshToken = async (req, res) => {
    // 1. Lấy Refresh Token từ Cookie
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ message: "Không tìm thấy Refresh Token. Vui lòng đăng nhập lại." });
    }

    try {
        // 2. Giải mã Refresh Token
        const verified = jwt.verify(token, process.env.JWT_REFRESH_TOKEN);

        // 3. Lấy thông tin user từ DB để tạo Access Token mới có đủ dữ liệu
        const user = await userModel.getUserById(verified.userId);
        if (!user) {
            return res.status(403).json({ message: "Tài khoản không tồn tại." });
        }

        // 4. Tạo Access Token MỚI
        const newAccessToken = jwt.sign(
            { userId: user.id, store_id: user.store_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '10m' }
        );

        // 5. Trả Access Token mới về cho Frontend
        return res.status(200).json({
            message: "Cấp lại token thành công",
            token: newAccessToken
        });

    } catch (error) {
        console.log(error);
        return res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại." });
    }
};

module.exports = { createStoreAdmin, loginUser, refreshToken }