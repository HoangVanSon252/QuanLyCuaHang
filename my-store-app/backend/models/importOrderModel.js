const db = require("../config/db");
const createImportOrder = async (store_id, user_id, importData) => {
    const connection = await db.getConnection();
    try {
        //Bắt đầu giao dịch
        await connection.beginTransaction();
        // nhận và mở gói hàng từ FE gửi lên
        const { items, supplier_id, total_amount } = importData;

        // Tạo mã phiếu nhập đơn 
        const orderCode = `PO-${Date.now()}`
        const [importResult] = await connection.execute(
            "INSERT INTO import_orders (store_id, order_code, user_id, supplier_id, total_amount) VALUES (?, ?, ?, ?, ?)",
            [store_id, orderCode, user_id, supplier_id || null, total_amount]
        );
        const import_orders_id = importResult.insertId;
        for (const item of items) {
            // Lưu vào bảng import_order_details
            const [detailResult] = await connection.execute(
                "INSERT INTO import_order_details (import_order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)",
                [import_orders_id, item.product_id, item.quantity, item.price, item.subtotal]
            );
            //cập nhật lại bảng products (cập nhật số lượng tồn kho)
            await connection.query(
                "UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ? AND store_id = ?",
                [item.quantity, item.product_id, store_id]
            );
        }
        await connection.commit();
        return { success: true, importOrderId: import_orders_id, orderCode };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// Lấy danh sách phiếu nhập hàng
const getAllImportOrders = async (store_id) => {
    const [rows] = await db.query(
        `SELECT i.id, i.order_code, i.total_amount, i.created_at, 
                u.full_name AS importer_name
         FROM import_orders i
         JOIN users u ON i.user_id = u.id
         WHERE i.store_id = ?
         ORDER BY i.created_at DESC`,
        [store_id]
    );
    return rows;
}

// Xem chi tiết phiếu nhập
const getImportOrderById = async (import_id, store_id) => {
    const [orderInfo] = await db.query(
        `SELECT i.*, u.full_name AS importer_name
         FROM import_orders i
         JOIN users u ON i.user_id = u.id
         WHERE i.id = ? AND i.store_id = ?`,
        [import_id, store_id]
    );

    if (orderInfo.length === 0) return null;

    const [orderDetails] = await db.query(
        `SELECT iod.*, p.product_name
         FROM import_order_details iod
         JOIN products p ON iod.product_id = p.id
         WHERE iod.import_order_id = ?`,
        [import_id]
    );

    return {
        ...orderInfo[0],
        items: orderDetails
    };
}

module.exports = {
    createImportOrder,
    getAllImportOrders,
    getImportOrderById
};