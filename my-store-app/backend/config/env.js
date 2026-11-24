// Đọc & kiểm tra biến môi trường ngay khi khởi động (fail fast).
// Nếu cấu hình sai/thiếu, server sẽ dừng thay vì chạy với cấu hình không an toàn.
require("dotenv").config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";
const errors = [];

const required = (name) => {
  const v = process.env[name];
  if (v === undefined || v === "") errors.push(`Thiếu biến môi trường ${name}`);
  return v;
};

const int = (name, def) => {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return def;
  const n = Number(raw);
  if (!Number.isInteger(n)) errors.push(`${name} phải là số nguyên`);
  return n;
};

const config = {
  isProduction,
  port: int("PORT", 8080),
  db: {
    host: required("DB_HOST"),
    port: int("DB_PORT", 3306),
    user: required("DB_USER"),
    password: process.env.DB_PASSWORD || "",
    database: required("DB_NAME"),
    connectionLimit: int("DB_POOL_SIZE", 20),
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  },
  jwt: {
    accessSecret: required("JWT_SECRET"),
    refreshSecret: required("JWT_REFRESH_TOKEN"),
    accessTtl: process.env.JWT_ACCESS_TTL || "15m",
    refreshTtlDays: int("JWT_REFRESH_TTL_DAYS", 7),
  },
  // Danh sách origin được phép gọi API (phân tách bằng dấu phẩy).
  // Khi frontend và API cùng domain (qua Nginx) thì có thể để trống.
  corsOrigins: (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  // Số lớp proxy phía trước (Nginx = 1, Caddy + Nginx = 2) để lấy đúng IP người dùng
  trustProxy: int("TRUST_PROXY", 1),
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction,
  login: {
    maxFailedAttempts: int("LOGIN_MAX_FAILED", 5),
    lockMinutes: int("LOGIN_LOCK_MINUTES", 15),
  },
  rateLimit: {
    loginPerWindow: int("RATE_LIMIT_LOGIN", 10),
    apiPerMinute: int("RATE_LIMIT_API", 600),
  },
};

const MIN_SECRET = 32;
if (config.jwt.accessSecret && config.jwt.accessSecret.length < MIN_SECRET)
  errors.push(`JWT_SECRET phải dài tối thiểu ${MIN_SECRET} ký tự`);
if (config.jwt.refreshSecret && config.jwt.refreshSecret.length < MIN_SECRET)
  errors.push(`JWT_REFRESH_TOKEN phải dài tối thiểu ${MIN_SECRET} ký tự`);
if (config.jwt.accessSecret && config.jwt.accessSecret === config.jwt.refreshSecret)
  errors.push("JWT_SECRET và JWT_REFRESH_TOKEN không được trùng nhau");

if (errors.length) {
  console.error("❌ Cấu hình không hợp lệ:\n - " + errors.join("\n - "));
  process.exit(1);
}

module.exports = config;
