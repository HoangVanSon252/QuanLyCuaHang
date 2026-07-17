const db = require('../config/db');
const getAllProducts = async (store_id) => {
    const [rows] = await db.query("SELECT * FROM products WHERE store_id = ? AND is_active = 1", [store_id]);
    return rows;
}

const getAllCategories = async (store_id) => {
    // Tương tự, chỉ lấy danh mục của đúng cửa hàng
    const [rows] = await db.query("SELECT * FROM categories WHERE store_id = ?", [store_id]);
    return rows;
}

const createProduct = async (productData) => {
    const { store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity } = productData;

    const query = `
    INSERT INTO products (store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity)
    values (?,?,?,?,?,?,?);`
    const [result] = await db.query(query,
        [store_id, category_id, name, barcode, cost_price, sell_price, stock_quantity]
    )
    return result.insertId;
}
// Lấy sản phẩm theo id
const getProductByID = async (store_id, id) => {
    const [rows] = await db.query("SELECT * FROM products WHERE id = ? AND store_id = ?", [id, store_id]);
    return rows[0];
}
// xóa sản phẩm
const deleteProduct = async (store_id, id) => {
    const [result] = await db.query(
        "UPDATE products SET is_active = 0 WHERE id = ? AND store_id = ?",
        [id, store_id]
    );
    return result.affectedRows > 0
}
// Cập nhật sản phẩm
const updateProduct = async (store_id, id, updateData) => {
    const { name, barcode, cost_price, sell_price, stock_quantity, category_id } = updateData;

    const query = `
        UPDATE products 
        SET name = ?, barcode = ?, cost_price = ?, sell_price = ?, stock_quantity = ?, category_id = ?
        WHERE id = ? AND store_id = ?;
    `;
    const [result] = await db.query(query, [
        name, barcode, cost_price, sell_price, stock_quantity, category_id, id, store_id
    ]);

    return result.affectedRows > 0;
}

// Thêm danh mục mới
const createCategory = async (store_id, name) => {
    const query = `INSERT INTO categories (store_id, name) VALUES (?, ?);`;
    const [result] = await db.query(query, [store_id, name]);
    return result.insertId;
}

module.exports = {
    getAllProducts,
    getAllCategories,
    createProduct,
    deleteProduct,
    getProductByID,
    updateProduct,
    createCategory
}