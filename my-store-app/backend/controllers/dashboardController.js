const dashboardModel = require('../models/dashboardModel');

const getOverview = async (req, res) => {
    try {
        const store_id = req.user.store_id; 
        const stats = await dashboardModel.getOverviewStats(store_id);
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("Lỗi getOverview:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

const getTopProducts = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const products = await dashboardModel.getTopSellingProducts(store_id);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error("Lỗi getTopProducts:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

const getLowStock = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const products = await dashboardModel.getLowStockProducts(store_id);
        res.json({ success: true, data: products });
    } catch (error) {
        console.error("Lỗi getLowStock:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

const getWeeklyRevenue = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const revenue = await dashboardModel.getWeeklyRevenue(store_id);
        res.json({ success: true, data: revenue });
    } catch (error) {
        console.error("Lỗi getWeeklyRevenue:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

const getRecentActivity = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const activity = await dashboardModel.getRecentActivity(store_id);
        res.json({ success: true, data: activity });
    } catch (error) {
        console.error("Lỗi getRecentActivity:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

const getMonthlyRevenue = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const revenue = await dashboardModel.getMonthlyRevenue(store_id);
        res.json({ success: true, data: revenue });
    } catch (error) {
        console.error("Lỗi getMonthlyRevenue:", error);
        res.status(500).json({ success: false, message: "Lỗi Server" });
    }
};

module.exports = {
    getOverview,
    getTopProducts,
    getLowStock,
    getWeeklyRevenue,
    getRecentActivity,
    getMonthlyRevenue
};
