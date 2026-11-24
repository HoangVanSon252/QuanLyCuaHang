const config = require("./config/env"); // Kiểm tra cấu hình trước tiên (fail fast)
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const db = require("./config/db");
const logger = require("./utils/logger");
const { apiLimiter } = require("./middleware/rateLimit");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

const productRoutes = require("./routes/productRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const importOrderRoutes = require("./routes/importOrderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// ---------- Bảo mật nền tảng ----------
app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy); // Lấy đúng IP người dùng phía sau Nginx/Caddy
app.use(helmet());

// CORS: chỉ cho phép các origin được khai báo. Khi chạy qua Nginx (cùng domain) không cần CORS.
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // cùng origin / curl / health check
      return cb(null, config.corsOrigins.includes(origin));
    },
    credentials: true,
  })
);

// Gắn mã request để truy vết lỗi + log truy cập dạng JSON
app.use((req, res, next) => {
  req.id = req.header("X-Request-Id") || crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    if (req.path === "/api/health") return;
    logger.info("request", {
      reqId: req.id,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: Number((process.hrtime.bigint() - start) / 1000000n),
      ip: req.ip,
      user: req.user?.userId,
    });
  });
  next();
});

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
// API không được cache bởi trình duyệt/proxy
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// ---------- Health check (không giới hạn tốc độ) ----------
app.get("/api/health", async (req, res) => {
  try {
    await db.ping();
    res.status(200).json({ status: "ok", db: "ok", uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: "error", db: "down" });
  }
});

app.use("/api", apiLimiter);

// ---------- Route nghiệp vụ ----------
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/imports", importOrderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info("server_started", { port: config.port, env: process.env.NODE_ENV || "development" });
});

// Dọn refresh token hết hạn mỗi 6 giờ
setInterval(() => {
  require("./models/userModel")
    .purgeExpiredTokens()
    .catch((err) => logger.error("purge_tokens_failed", err));
}, 6 * 60 * 60 * 1000).unref();

// Giữ kết nối lâu hơn timeout của proxy để tránh lỗi 502 ngẫu nhiên
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;

// ---------- Tắt máy an toàn (docker stop / deploy) ----------
const shutdown = (signal) => {
  logger.info("shutdown_started", { signal });
  server.close(async () => {
    try {
      await db.end();
    } catch {
      /* bỏ qua */
    }
    logger.info("shutdown_complete");
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) => logger.error("unhandled_rejection", err));
