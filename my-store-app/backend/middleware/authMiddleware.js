const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    // Lấy token từ header 'Authorization'
    const token = req.header('Authorization');

    if (!token) {
        return res.status(401).json({ message: "Truy cập bị từ chối. Không tìm thấy token." });
    }

    try {
        // Bearer <token_string> -> Lấy phần <token_string>
        const tokenString = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;

        // Giải mã token
        const verified = jwt.verify(tokenString, process.env.JWT_SECRET);

        // Lưu thông tin giải mã vào req.user để các API sau có thể sử dụng
        req.user = verified;

        // Tiếp tục chạy API
        next();
    } catch (error) {
        return res.status(400).json({ message: "Token không hợp lệ." });
    }
};

module.exports = authMiddleware;
