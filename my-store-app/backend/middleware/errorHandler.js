const logger = require("../utils/logger");

// 404 cho route không tồn tại
const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Không tìm thấy API." });
};

// Xử lý lỗi tập trung: không bao giờ lộ stack trace / lỗi SQL ra ngoài
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // JSON gửi lên sai cú pháp / quá lớn (body-parser)
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "Dữ liệu JSON không hợp lệ." });
  if (err.type === "entity.too.large") return res.status(413).json({ message: "Dữ liệu gửi lên quá lớn." });

  if (err.expose && err.status) {
    const body = { message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json(body);
  }

  // Lỗi ràng buộc từ MySQL → thông báo thân thiện
  if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "Dữ liệu bị trùng (mã vạch / tên đã tồn tại)." });
  if (err.code === "ER_CHECK_CONSTRAINT_VIOLATED") return res.status(409).json({ message: "Dữ liệu vi phạm ràng buộc (ví dụ tồn kho âm)." });
  if (err.code === "ER_NO_REFERENCED_ROW_2") return res.status(400).json({ message: "Dữ liệu tham chiếu không tồn tại." });
  if (err.code === "ER_DATA_TOO_LONG") return res.status(400).json({ message: "Dữ liệu quá dài." });

  logger.error("unhandled_error", err, { method: req.method, path: req.originalUrl, reqId: req.id });
  res.status(500).json({ message: "Lỗi hệ thống. Vui lòng thử lại sau.", requestId: req.id });
};

module.exports = { notFoundHandler, errorHandler };
