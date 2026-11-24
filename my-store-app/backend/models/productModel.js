const db = require("../config/db");

const getAllProducts = async (store_id) => {
  const [rows] = await db.query(
    `SELECT id, store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity, is_active, created_at, updated_at
     FROM products WHERE store_id = ? AND is_active = 1 ORDER BY id DESC`,
    [store_id]
  );
  return rows;
};

const getAllCategories = async (store_id) => {
  const [rows] = await db.query("SELECT id, store_id, name FROM categories WHERE store_id = ? ORDER BY name", [store_id]);
  return rows;
};

const categoryBelongsToStore = async (store_id, category_id) => {
  const [rows] = await db.query("SELECT id FROM categories WHERE id = ? AND store_id = ?", [category_id, store_id]);
  return rows.length > 0;
};

const createProduct = async (productData) => {
  const { store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity } = productData;
  const [result] = await db.query(
    `INSERT INTO products (store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity]
  );
  return result.insertId;
};

const getProductByID = async (store_id, id) => {
  const [rows] = await db.query("SELECT * FROM products WHERE id = ? AND store_id = ? AND is_active = 1", [id, store_id]);
  return rows[0];
};

// Xoá mềm để giữ lịch sử hoá đơn
const deleteProduct = async (store_id, id) => {
  const [result] = await db.query("UPDATE products SET is_active = 0 WHERE id = ? AND store_id = ? AND is_active = 1", [
    id,
    store_id,
  ]);
  return result.affectedRows > 0;
};

const updateProduct = async (store_id, id, updateData) => {
  const { name, barcode, cost_price, sell_price, stock_quantity, category_id } = updateData;
  const [result] = await db.query(
    `UPDATE products
     SET name = ?, barcode = ?, cost_price = ?, sell_price = ?, stock_quantity = ?, category_id = ?
     WHERE id = ? AND store_id = ? AND is_active = 1`,
    [name, barcode, cost_price, sell_price, stock_quantity, category_id, id, store_id]
  );
  return result.affectedRows > 0;
};

const createCategory = async (store_id, name) => {
  const [result] = await db.query("INSERT INTO categories (store_id, name) VALUES (?, ?)", [store_id, name]);
  return result.insertId;
};

module.exports = {
  getAllProducts,
  getAllCategories,
  categoryBelongsToStore,
  createProduct,
  deleteProduct,
  getProductByID,
  updateProduct,
  createCategory,
};
