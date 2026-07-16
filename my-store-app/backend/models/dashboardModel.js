const db = require('../config/db');

// Lấy thống kê tổng quan (Doanh thu, Đơn hàng, Lợi nhuận)
const getOverviewStats = async (store_id) => {
    const [[revenueResult]] = await db.query(
        `SELECT COUNT(id) AS total_orders, COALESCE(SUM(total_amount), 0) AS total_revenue
         FROM orders WHERE store_id = ?`, [store_id]
    );

    const [[profitResult]] = await db.query(
        `SELECT COALESCE(SUM((od.price - p.cost_price) * od.quantity), 0) AS total_profit
         FROM order_details od
         JOIN orders o ON od.order_id = o.id
         JOIN products p ON od.product_id = p.id
         WHERE o.store_id = ?`, [store_id]
    );

    return {
        total_orders: revenueResult.total_orders || 0,
        total_revenue: parseFloat(revenueResult.total_revenue) || 0,
        total_profit: parseFloat(profitResult.total_profit) || 0
    };
};

// Lấy Top 5 sản phẩm bán chạy nhất
const getTopSellingProducts = async (store_id) => {
    const [rows] = await db.query(
        `SELECT p.id, p.name, p.barcode, SUM(od.quantity) AS total_sold, SUM(od.subtotal) AS total_revenue
         FROM order_details od
         JOIN orders o ON od.order_id = o.id
         JOIN products p ON od.product_id = p.id
         WHERE o.store_id = ?
         GROUP BY p.id, p.name, p.barcode
         ORDER BY total_sold DESC LIMIT 5`, [store_id]
    );
    return rows;
};

// Cảnh báo hàng tồn kho thấp (Mặc định < 20)
const getLowStockProducts = async (store_id, threshold = 20) => {
    const [rows] = await db.query(
        `SELECT id, name, barcode, stock_quantity FROM products
         WHERE store_id = ? AND stock_quantity <= ? AND is_active = 1
         ORDER BY stock_quantity ASC`, [store_id, threshold]
    );
    return rows;
};

// Lấy doanh thu theo 7 ngày gần nhất
const getWeeklyRevenue = async (store_id) => {
    const [rows] = await db.query(
        `SELECT DATE(created_at) as date, SUM(total_amount) as revenue
         FROM orders 
         WHERE store_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC`, [store_id]
    );
    return rows;
};

// Lấy 5 hoạt động gần nhất (Bán hàng và Nhập hàng)
const getRecentActivity = async (store_id) => {
    // Kết hợp từ orders và import_orders
    const [rows] = await db.query(
        `SELECT 
            'order' as type, 
            id, 
            total_amount as amount, 
            created_at 
         FROM orders WHERE store_id = ?
         UNION ALL
         SELECT 
            'import' as type, 
            id, 
            total_amount as amount, 
            created_at 
         FROM import_orders WHERE store_id = ?
         ORDER BY created_at DESC LIMIT 5`, [store_id, store_id]
    );
    return rows;
};

// Lấy doanh thu theo từng tháng trong năm hiện tại
const getMonthlyRevenue = async (store_id) => {
    const [rows] = await db.query(
        `SELECT MONTH(created_at) as month, SUM(total_amount) as revenue
         FROM orders 
         WHERE store_id = ? AND YEAR(created_at) = YEAR(CURDATE())
         GROUP BY MONTH(created_at)
         ORDER BY MONTH(created_at) ASC`, [store_id]
    );
    return rows;
};

module.exports = { getOverviewStats, getTopSellingProducts, getLowStockProducts, getWeeklyRevenue, getRecentActivity, getMonthlyRevenue };
