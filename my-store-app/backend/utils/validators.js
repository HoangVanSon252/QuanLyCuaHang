// Bộ kiểm tra dữ liệu đầu vào dùng chung. Mọi hàm ném HttpError 400 khi dữ liệu sai.
const { badRequest } = require("./httpError");

const MAX_MONEY = 1e12; // 1.000 tỷ — giới hạn hợp lý cho DECIMAL(15,2)
const MAX_QTY = 1_000_000;

const isBlank = (v) => v === undefined || v === null || v === "";

const str = (value, field, { required = false, min = 0, max = 255, pattern, patternMsg } = {}) => {
  if (isBlank(value)) {
    if (required) throw badRequest(`${field} là bắt buộc.`);
    return null;
  }
  if (typeof value !== "string" && typeof value !== "number") throw badRequest(`${field} không hợp lệ.`);
  const s = String(value).trim();
  if (required && s.length === 0) throw badRequest(`${field} là bắt buộc.`);
  if (s.length < min) throw badRequest(`${field} phải có ít nhất ${min} ký tự.`);
  if (s.length > max) throw badRequest(`${field} tối đa ${max} ký tự.`);
  if (pattern && !pattern.test(s)) throw badRequest(patternMsg || `${field} không hợp lệ.`);
  return s;
};

// Số tiền: >= 0, tối đa 2 chữ số thập phân, chỉ chấp nhận dạng số thường (không 1e3, không hex)
const money = (value, field, { required = true, min = 0 } = {}) => {
  if (isBlank(value)) {
    if (required) throw badRequest(`${field} là bắt buộc.`);
    return null;
  }
  const s = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw badRequest(`${field} phải là số không âm (tối đa 2 chữ số thập phân).`);
  const n = Number(s);
  if (n < min) throw badRequest(`${field} phải lớn hơn hoặc bằng ${min}.`);
  if (n > MAX_MONEY) throw badRequest(`${field} vượt quá giới hạn cho phép.`);
  return n;
};

// Số nguyên trong khoảng [min, max]
const int = (value, field, { required = true, min = 0, max = MAX_QTY } = {}) => {
  if (isBlank(value)) {
    if (required) throw badRequest(`${field} là bắt buộc.`);
    return null;
  }
  const s = String(value).trim();
  if (!/^-?\d+$/.test(s)) throw badRequest(`${field} phải là số nguyên.`);
  const n = Number(s);
  if (n < min || n > max) throw badRequest(`${field} phải nằm trong khoảng ${min} – ${max}.`);
  return n;
};

const id = (value, field = "ID", opts = {}) => int(value, field, { min: 1, max: 2_147_483_647, ...opts });

const barcode = (value) =>
  str(value, "Mã vạch", { max: 50, pattern: /^[0-9A-Za-z\-_.]+$/, patternMsg: "Mã vạch chỉ gồm chữ, số và - _ ." });

const username = (value) =>
  str(value, "Tên đăng nhập", {
    required: true,
    min: 3,
    max: 50,
    pattern: /^[a-zA-Z0-9_.]+$/,
    patternMsg: "Tên đăng nhập chỉ gồm chữ không dấu, số, dấu chấm hoặc gạch dưới.",
  });

// Chính sách mật khẩu: >= 8 ký tự, có chữ và số
const password = (value, field = "Mật khẩu") => {
  if (typeof value !== "string" || value.length === 0) throw badRequest(`${field} là bắt buộc.`);
  if (value.length < 8) throw badRequest(`${field} phải có ít nhất 8 ký tự.`);
  if (value.length > 72) throw badRequest(`${field} tối đa 72 ký tự.`);
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) throw badRequest(`${field} phải gồm cả chữ và số.`);
  return value;
};

const oneOf = (value, field, allowed, def) => {
  if (isBlank(value)) return def;
  if (!allowed.includes(value)) throw badRequest(`${field} không hợp lệ.`);
  return value;
};

// Danh sách mặt hàng (bán / nhập). Gộp các dòng trùng sản phẩm.
const items = (value, { withPrice = false, maxItems = 200 } = {}) => {
  if (!Array.isArray(value) || value.length === 0) throw badRequest("Danh sách sản phẩm đang trống.");
  if (value.length > maxItems) throw badRequest(`Tối đa ${maxItems} dòng sản phẩm mỗi phiếu.`);
  const merged = new Map();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") throw badRequest("Dòng sản phẩm không hợp lệ.");
    const productId = id(raw.product_id, "Mã sản phẩm");
    const quantity = int(raw.quantity, "Số lượng", { min: 1, max: MAX_QTY });
    const price = withPrice ? money(raw.price, "Giá nhập") : undefined;
    const prev = merged.get(productId);
    if (prev) {
      prev.quantity += quantity;
      if (prev.quantity > MAX_QTY) throw badRequest("Số lượng vượt quá giới hạn.");
      if (withPrice && prev.price !== price) throw badRequest("Một sản phẩm không thể có hai giá nhập trong cùng phiếu.");
    } else {
      merged.set(productId, { product_id: productId, quantity, price });
    }
  }
  return [...merged.values()];
};

const pagination = (query) => {
  const page = int(query.page, "page", { required: false, min: 1, max: 100000 }) || 1;
  const limit = int(query.limit, "limit", { required: false, min: 1, max: 100 }) || 20;
  return { page, limit, offset: (page - 1) * limit };
};

const date = (value, field) => {
  if (isBlank(value)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) || Number.isNaN(Date.parse(value)))
    throw badRequest(`${field} phải có dạng YYYY-MM-DD.`);
  return String(value);
};

module.exports = { str, money, int, id, barcode, username, password, oneOf, items, pagination, date, isBlank };
