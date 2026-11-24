const importOrderModel = require("../models/importOrderModel");
const audit = require("../utils/audit");
const v = require("../utils/validators");
const { notFound, asyncHandler } = require("../utils/httpError");

const createImportOrder = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const importData = {
    items: v.items(body.items, { withPrice: true }),
    supplier_name: v.str(body.supplier_name, "Nhà cung cấp", { max: 150 }),
    note: v.str(body.note, "Ghi chú", { max: 255 }),
  };
  const result = await importOrderModel.createImportOrder(req.user.store_id, req.user.userId, importData);
  await audit(req, "import_created", {
    entity: "import_order",
    entityId: result.importOrderId,
    detail: { code: result.orderCode, total: result.total_amount, items: importData.items.length },
  });
  res.status(201).json({
    message: "Nhập hàng thành công",
    importOrderId: result.importOrderId,
    orderCode: result.orderCode,
    total_amount: result.total_amount,
  });
});

const getAllImportOrders = asyncHandler(async (req, res) => {
  const { page, limit, offset } = v.pagination(req.query);
  const { rows, total } = await importOrderModel.getAllImportOrders(req.user.store_id, {
    limit,
    offset,
    from: v.date(req.query.from, "Từ ngày"),
    to: v.date(req.query.to, "Đến ngày"),
  });
  res.status(200).json({ data: rows, page, limit, total });
});

const getImportOrderById = asyncHandler(async (req, res) => {
  const order = await importOrderModel.getImportOrderById(v.id(req.params.id, "Mã phiếu nhập"), req.user.store_id);
  if (!order) throw notFound("Không tìm thấy phiếu nhập này!");
  res.status(200).json(order);
});

module.exports = { createImportOrder, getAllImportOrders, getImportOrderById };
