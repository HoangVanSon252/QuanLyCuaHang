const db = require("../config/db");

// Chỉ tính hoá đơn đã hoàn thành (bỏ qua hoá đơn đã huỷ)
const COMPLETED = "o.status = 'completed'";

// Thống kê tổng quan (Doanh thu, Đơn hàng, Lợi nhuận) + số liệu hôm nay
const getOverviewStats = async (store_id) => {
  const [[revenueResult]] = await db.query(
    `SELECT COUNT(o.id) AS total_orders, COALESCE(SUM(o.total_amount), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN DATE(o.created_at) = CURDATE() THEN o.total_amount END), 0) AS today_revenue,
            COUNT(CASE WHEN DATE(o.created_at) = CURDATE() THEN 1 END) AS today_orders
     FROM orders o WHERE o.store_id = ? AND ${COMPLETED}`,
    [store_id]
  );

  // Lợi nhuận dùng giá vốn lưu tại thời điểm bán (không bị sai khi giá nhập thay đổi về sau)
  const [[profitResult]] = await db.query(
    `SELECT COALESCE(SUM((od.price - od.cost_price) * od.quantity), 0) AS total_profit
     FROM order_details od
     JOIN orders o ON od.order_id = o.id
     WHERE o.store_id = ? AND ${COMPLETED}`,
    [store_id]
  );

  const [[stock]] = await db.query(
    `SELECT COUNT(*) AS product_count, COALESCE(SUM(stock_quantity), 0) AS total_units,
            COALESCE(SUM(stock_quantity * cost_price), 0) AS stock_value
     FROM products WHERE store_id = ? AND is_active = 1`,
    [store_id]
  );

  return {
    total_orders: Number(revenueResult.total_orders) || 0,
    total_revenue: parseFloat(revenueResult.total_revenue) || 0,
    total_profit: parseFloat(profitResult.total_profit) || 0,
    today_orders: Number(revenueResult.today_orders) || 0,
    today_revenue: parseFloat(revenueResult.today_revenue) || 0,
    product_count: Number(stock.product_count) || 0,
    total_units: Number(stock.total_units) || 0,
    stock_value: parseFloat(stock.stock_value) || 0,
  };
};

// Top 5 sản phẩm bán chạy nhất
const getTopSellingProducts = async (store_id) => {
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.barcode, SUM(od.quantity) AS total_sold, SUM(od.subtotal) AS total_revenue
     FROM order_details od
     JOIN orders o ON od.order_id = o.id
     JOIN products p ON od.product_id = p.id
     WHERE o.store_id = ? AND ${COMPLETED}
     GROUP BY p.id, p.name, p.barcode
     ORDER BY total_sold DESC LIMIT 5`,
    [store_id]
  );
  return rows.map((r) => ({ ...r, total_sold: Number(r.total_sold), total_revenue: Number(r.total_revenue) }));
};

// Cảnh báo hàng tồn kho thấp
const getLowStockProducts = async (store_id, threshold = 20) => {
  const [rows] = await db.query(
    `SELECT id, name, barcode, stock_quantity FROM products
     WHERE store_id = ? AND stock_quantity <= ? AND is_active = 1
     ORDER BY stock_quantity ASC LIMIT 50`,
    [store_id, threshold]
  );
  return rows;
};

// Doanh thu 7 ngày gần nhất (tính cả hôm nay)
const getWeeklyRevenue = async (store_id) => {
  const [rows] = await db.query(
    `SELECT DATE_FORMAT(o.created_at, '%Y-%m-%d') AS date, SUM(o.total_amount) AS revenue
     FROM orders o
     WHERE o.store_id = ? AND ${COMPLETED} AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE_FORMAT(o.created_at, '%Y-%m-%d')
     ORDER BY date ASC`,
    [store_id]
  );
  return rows;
};

// 5 hoạt động gần nhất (bán hàng và nhập hàng)
const getRecentActivity = async (store_id) => {
  const [rows] = await db.query(
    `SELECT 'order' AS type, id, order_code AS code, total_amount AS amount, created_at
     FROM orders WHERE store_id = ? AND status = 'completed'
     UNION ALL
     SELECT 'import' AS type, id, order_code AS code, total_amount AS amount, created_at
     FROM import_orders WHERE store_id = ?
     ORDER BY created_at DESC LIMIT 5`,
    [store_id, store_id]
  );
  return rows;
};

// Doanh thu theo tháng trong năm hiện tại
const getMonthlyRevenue = async (store_id) => {
  const [rows] = await db.query(
    `SELECT MONTH(o.created_at) AS month, SUM(o.total_amount) AS revenue
     FROM orders o
     WHERE o.store_id = ? AND ${COMPLETED} AND YEAR(o.created_at) = YEAR(CURDATE())
     GROUP BY MONTH(o.created_at)
     ORDER BY month ASC`,
    [store_id]
  );
  return rows;
};

module.exports = {
  getOverviewStats,
  getTopSellingProducts,
  getLowStockProducts,
  getWeeklyRevenue,
  getRecentActivity,
  getMonthlyRevenue,
};
