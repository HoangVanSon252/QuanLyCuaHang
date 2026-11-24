const orderModel = require("../models/orderModel");
const audit = require("../utils/audit");
const v = require("../utils/validators");
const { notFound, asyncHandler } = require("../utils/httpError");

const createOrder = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const orderData = {
    items: v.items(body.items),
    payment_method: v.oneOf(body.payment_method, "Phương thức thanh toán", ["cash", "transfer", "card"], "cash"),
    note: v.str(body.note, "Ghi chú", { max: 255 }),
  };
  const result = await orderModel.createOrderTransaction(req.user.store_id, req.user.userId, orderData);
  await audit(req, "order_created", {
    entity: "order",
    entityId: result.order_id,
    detail: { code: result.orderCode, total: result.total_amount, items: orderData.items.length },
  });
  res.status(201).json({
    message: "Thanh toán thành công",
    order_code: result.orderCode,
    order_id: result.order_id,
    total_amount: result.total_amount,
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { page, limit, offset } = v.pagination(req.query);
  const filters = {
    limit,
    offset,
    from: v.date(req.query.from, "Từ ngày"),
    to: v.date(req.query.to, "Đến ngày"),
    status: v.oneOf(req.query.status, "Trạng thái", ["completed", "cancelled"], null),
    q: v.str(req.query.q, "Từ khoá", { max: 40 }),
  };
  const { rows, total } = await orderModel.getAllOrders(req.user.store_id, filters);
  res.status(200).json({ data: rows, page, limit, total });
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await orderModel.getOrderById(v.id(req.params.id, "Mã hoá đơn"), req.user.store_id);
  if (!order) throw notFound("Không tìm thấy hóa đơn này!");
  res.status(200).json(order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const orderId = v.id(req.params.id, "Mã hoá đơn");
  const reason = v.str(req.body?.reason, "Lý do huỷ", { required: true, min: 3, max: 255 });
  const result = await orderModel.cancelOrder(req.user.store_id, orderId, req.user.userId, reason);
  await audit(req, "order_cancelled", { entity: "order", entityId: orderId, detail: { ...result, reason } });
  res.json({ message: "Đã huỷ hoá đơn và hoàn lại tồn kho." });
});

module.exports = { createOrder, getAllOrders, getOrderById, cancelOrder };
