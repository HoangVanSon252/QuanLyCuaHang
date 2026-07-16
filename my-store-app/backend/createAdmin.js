require('dotenv').config();
const bcrypt = require('bcrypt');
const db = require('./config/db');

async function seedAdmin() {
    try {
        console.log("Đang kết nối Database và tạo tài khoản...");
        
        // Băm mật khẩu "admin123"
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        
        // Thêm vào Database
        const [result] = await db.execute(
            `INSERT INTO users (store_id, username, password, full_name, role)
            VALUES (?, ?, ?, ?, ?)`,
            [null, 'admin', hashedPassword, 'Người quản trị', 'super_admin']
        );
        
        console.log("✅ Tạo tài khoản admin thành công!");
        console.log("👉 Tên đăng nhập: admin");
        console.log("👉 Mật khẩu: admin123");
        process.exit(0);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            console.log("⚠️ Tài khoản 'admin' đã tồn tại trong CSDL rồi!");
        } else {
            console.error("❌ Lỗi:", error.message);
        }
        process.exit(1);
    }
}

seedAdmin();
