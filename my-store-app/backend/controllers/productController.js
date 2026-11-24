// Nhận và trả về dữ liệu dưới dạng JSON
const productsModel = require("../models/productModel");
const audit = require("../utils/audit");
const v = require("../utils/validators");
const { badRequest, notFound, asyncHandler } = require("../utils/httpError");

// Kiểm tra & chuẩn hoá dữ liệu sản phẩm gửi lên (dùng cho cả thêm và sửa)
const parseProduct = async (store_id, body = {}) => {
  const data = {
    name: v.str(body.name, "Tên sản phẩm", { required: true, max: 200 }),
    barcode: v.barcode(body.barcode),
    cost_price: v.money(body.cost_price, "Giá nhập"),
    sell_price: v.money(body.sell_price, "Giá bán"),
    stock_quantity: v.int(body.stock_quantity, "Số lượng tồn kho", { min: 0 }),
    category_id: v.isBlank(body.category_id) ? null : v.id(body.category_id, "Danh mục"),
  };
  // Danh mục phải thuộc đúng cửa hàng (chống gán chéo dữ liệu giữa các cửa hàng)
  if (data.category_id && !(await productsModel.categoryBelongsToStore(store_id, data.category_id)))
    throw badRequest("Danh mục không tồn tại.");
  return data;
};

const getAllProducts = asyncHandler(async (req, res) => {
  const productList = await productsModel.getAllProducts(req.user.store_id);
  res.status(200).json({ message: "Lấy danh sách sản phẩm thành công!", data: productList });
});

const getAllCategories = asyncHandler(async (req, res) => {
  const categoryList = await productsModel.getAllCategories(req.user.store_id);
  res.status(200).json({ message: "Lấy danh sách danh mục thành công!", data: categoryList });
});

const createProduct = asyncHandler(async (req, res) => {
  const store_id = req.user.store_id;
  const data = await parseProduct(store_id, req.body);
  const id = await productsModel.createProduct({ store_id, ...data });
  await audit(req, "product_created", { entity: "product", entityId: id, detail: data });
  res.status(201).json({ message: "Thêm sản phẩm thành công!", data: id });
});

const getProductByID = asyncHandler(async (req, res) => {
  const id = v.id(req.params.id, "Mã sản phẩm");
  const product = await productsModel.getProductByID(req.user.store_id, id);
  if (!product) throw notFound("Không tìm thấy sản phẩm!");
  res.status(200).json({ message: "Lấy thông tin chi tiết sản phẩm thành công!", data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const store_id = req.user.store_id;
  const id = v.id(req.params.id, "Mã sản phẩm");
  const before = await productsModel.getProductByID(store_id, id);
  if (!before) throw notFound("Không tìm thấy sản phẩm để cập nhật!");

  const data = await parseProduct(store_id, req.body);
  await productsModel.updateProduct(store_id, id, data);

  // Ghi lại các trường thay đổi (đặc biệt là giá và tồn kho)
  const changes = {};
  for (const k of Object.keys(data)) {
    if (String(before[k] ?? "") !== String(data[k] ?? "") && Number(before[k]) !== Number(data[k]))
      changes[k] = { from: before[k], to: data[k] };
  }
  await audit(req, "product_updated", { entity: "product", entityId: id, detail: changes });
  res.status(200).json({ message: "Cập nhật sản phẩm thành công!" });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const id = v.id(req.params.id, "Mã sản phẩm");
  const success = await productsModel.deleteProduct(req.user.store_id, id);
  if (!success) throw notFound("Không tìm thấy sản phẩm để xóa!");
  await audit(req, "product_deleted", { entity: "product", entityId: id });
  res.status(200).json({ message: "Xóa sản phẩm thành công!" });
});

const createCategory = asyncHandler(async (req, res) => {
  const store_id = req.user.store_id;
  const name = v.str(req.body?.name, "Tên danh mục", { required: true, max: 100 });
  const categoryId = await productsModel.createCategory(store_id, name);
  await audit(req, "category_created", { entity: "category", entityId: categoryId, detail: { name } });
  res.status(201).json({ message: "Tạo danh mục thành công!", data: { id: categoryId, name, store_id } });
});

module.exports = {
  getAllProducts,
  getAllCategories,
  createProduct,
  getProductByID,
  updateProduct,
  deleteProduct,
  createCategory,
};
