// Lỗi có mã HTTP + thông báo an toàn để trả cho client.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.expose = true;
    if (details) this.details = details;
  }
}

const badRequest = (msg, details) => new HttpError(400, msg, details);
const unauthorized = (msg = "Chưa đăng nhập hoặc phiên đã hết hạn.") => new HttpError(401, msg);
const forbidden = (msg = "Bạn không có quyền thực hiện thao tác này.") => new HttpError(403, msg);
const notFound = (msg = "Không tìm thấy dữ liệu.") => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

// Bọc controller async: lỗi được chuyển cho errorHandler, không cần try/catch lặp lại.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, asyncHandler };
