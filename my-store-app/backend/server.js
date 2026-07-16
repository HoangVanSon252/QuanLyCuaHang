const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const importOrderRoutes = require("./routes/importOrderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

// 1. Khởi tạo app Express (Con chạy chính của Server)
const app = express();

// Middleware (Khai báo cho phép đọc dữ liệu JSON gửi lên)
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Đăng ký các route
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/imports", importOrderRoutes);
app.use("/api/dashboard", dashboardRoutes);

// 3. API KIỂM TRA MẠNG
app.get("/api/health", async (req, res) => {
  res.status(200).json({ message: "Server hoạt động bình thường!" });
});

// 4. MỞ CỬA SERVER ĐÓN KHÁCH (Lắng nghe tại port 8080)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server đang mở cửa tại cổng: ${PORT}`);
});
