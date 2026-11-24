const mysql = require("mysql2");
const config = require("./env");

const pool = mysql.createPool({
  host: config.db.host,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  port: config.db.port,
  ssl: config.db.ssl,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  timezone: "+07:00",
  dateStrings: false,
  charset: "utf8mb4",
});

// Mỗi connection mới dùng múi giờ Việt Nam để các hàm DATE()/CURDATE() đúng ngày
pool.on("connection", (conn) => {
  conn.query("SET time_zone = '+07:00'");
});

const promisePool = pool.promise();

// Kiểm tra DB còn sống (dùng cho /api/health)
promisePool.ping = async () => {
  const [rows] = await promisePool.query("SELECT 1 AS ok");
  return rows[0].ok === 1;
};

module.exports = promisePool;
