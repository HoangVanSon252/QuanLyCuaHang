const db = require('../config/db');
// Tạo hóa đơn bán hàng sử dụng transaction
const createOrderTransaction = async (store_id, user_id, orderData) => {
    //Xin cấp đường truyền riêng biệt với database
    const connection = await db.getConnection();
    try {
        // Bắt đầu giao dịch (commit nếu thành công, rollback nếu lỗi)
        await connection.beginTransaction();
        const { items, customer_id, total_amount, payment_method } = orderData;

        //Tạo mã đơn ngẫu nhiên theo thời gian
        const orderCode = `ORD_${Date.now()}`;

        //Lưu vào bảng hóa đơn ổng(orders)
        const [orderResult] = await connection.query(
            "INSERT INTO orders (store_id, order_code, user_id, customer_id, total_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?)",
            [store_id, orderCode, user_id, customer_id || null, total_amount, payment_method || 'cash']
        );
        //Lấy id hóa đơn vừa tạo 
        const order_id = orderResult.insertId;

        //Lặp qua từng sản phẩm trong giỏ hàng để lưu vào bảng order_items

        for (const item of items) {
            // Lưu vào bảng order_details
            await connection.query(
                "INSERT INTO order_details (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)",
                [order_id, item.product_id, item.quantity, item.price, item.subtotal]
            );
            // Cập nhật số lượng tồn kho (trừ đi số lượng đã bán)
            await connection.query(
                "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ? AND store_id = ?",
                [item.quantity, item.product_id, store_id]
            );
        }
        await connection.commit();
        return { success: true, orderCode, order_id };
    }
    catch (error) {
        //nếu lỗi thì quay xe luôn không làm cơm cháo j hết
        await connection.rollback();
        throw error;
    }
    finally {
        // trả lại đường truyền cho hệ thống
        connection.release();
    }
}
// Lấy danh sách hóa đơn bán hàng
const getAllOrders = async (store_id) => {
    const [rows] = await db.query(
        `SELECT o.id, o.order_code, o.total_amount, o.payment_method, o.created_at, 
                u.full_name AS cashier_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.store_id = ?
         ORDER BY o.created_at DESC`,
        [store_id]
    );
    return rows;
}

// Xem chi tiết hóa đơn (kèm theo giỏ hàng)
const getOrderById = async (order_id, store_id) => {
    // 1. Lấy thông tin chung của hóa đơn
    const [orderInfo] = await db.query(
        `SELECT o.*, u.full_name AS cashier_name
         FROM orders o
         JOIN users u ON o.user_id = u.id
         WHERE o.id = ? AND o.store_id = ?`,
        [order_id, store_id]
    );

    if (orderInfo.length === 0) return null;

    // 2. Lấy danh sách sản phẩm trong hóa đơn đó
    const [orderDetails] = await db.query(
        `SELECT od.*, p.product_name
         FROM order_details od
         JOIN products p ON od.product_id = p.id
         WHERE od.order_id = ?`,
        [order_id]
    );

    // Gộp chung lại và trả về
    return {
        ...orderInfo[0],
        items: orderDetails
    };
}

module.exports = {
    createOrderTransaction,
    getAllOrders,
    getOrderById
}