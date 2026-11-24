// Tạo tài khoản Super Admin đầu tiên từ biến môi trường.
// - Chạy được nhiều lần: nếu đã có super_admin thì bỏ qua (idempotent).
// - Không còn mật khẩu mặc định cố định trong mã nguồn.
//   SUPER_ADMIN_USERNAME=admin SUPER_ADMIN_PASSWORD='MatKhauManh123' node createAdmin.js
require("./config/env");
const bcrypt = require("bcrypt");
const db = require("./config/db");
const v = require("./utils/validators");

async function seedAdmin() {
  try {
    const [[existing]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE role = 'super_admin'");
    if (existing.n > 0) {
      console.log("ℹ️  Đã có tài khoản Super Admin — bỏ qua bước tạo.");
      process.exit(0);
    }

    const username = process.env.SUPER_ADMIN_USERNAME || "admin";
    const password = process.env.SUPER_ADMIN_PASSWORD;
    if (!password) {
      console.error("❌ Chưa có Super Admin. Hãy đặt SUPER_ADMIN_PASSWORD trong .env rồi chạy lại.");
      process.exit(1);
    }
    v.username(username);
    v.password(password, "SUPER_ADMIN_PASSWORD");

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.execute(
      "INSERT INTO users (store_id, username, password, full_name, role) VALUES (NULL, ?, ?, ?, 'super_admin')",
      [username, hashedPassword, "Quản trị viên"]
    );
    console.log(`✅ Đã tạo Super Admin "${username}". Hãy đổi mật khẩu sau lần đăng nhập đầu tiên.`);
    process.exit(0);
  } catch (error) {
    // Nhiều bản sao backend khởi động cùng lúc → bản nào tạo trước thì thắng, bản sau coi như xong
    if (error.code === "ER_DUP_ENTRY") {
      console.log("ℹ️  Super Admin vừa được tạo bởi tiến trình khác — bỏ qua.");
      process.exit(0);
    }
    console.error("❌ Lỗi tạo Super Admin:", error.message);
    process.exit(1);
  }
}

seedAdmin();
