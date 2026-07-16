const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'quanlycuahang',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
const promisePool = db.promise();

// Chạy thử kết nối
promisePool.getConnection()
  .then((connection) => {
    console.log("✅ Kết nối MySQL đã thông thành công!");
    connection.release();
  })
  .catch((err) => {
    console.error("❌ Kết nối thất bại!", err);
  });

module.exports = promisePool;