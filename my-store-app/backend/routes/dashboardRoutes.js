const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authMiddleware, requireRole, requireStore } = require("../middleware/authMiddleware");

// Chỉ tài khoản cửa hàng; số liệu là của riêng cửa hàng đó
router.use(authMiddleware, requireRole("store_admin"), requireStore);

router.get("/low-stock", dashboardController.getLowStock);
router.get("/overview", dashboardController.getOverview);
router.get("/top-products", dashboardController.getTopProducts);
router.get("/weekly-revenue", dashboardController.getWeeklyRevenue);
router.get("/monthly-revenue", dashboardController.getMonthlyRevenue);
router.get("/recent-activity", dashboardController.getRecentActivity);

module.exports = router;
