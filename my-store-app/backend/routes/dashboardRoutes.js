const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/overview', dashboardController.getOverview);
router.get('/top-products', dashboardController.getTopProducts);
router.get('/low-stock', dashboardController.getLowStock);
router.get('/weekly-revenue', dashboardController.getWeeklyRevenue);
router.get('/monthly-revenue', dashboardController.getMonthlyRevenue);
router.get('/recent-activity', dashboardController.getRecentActivity);

module.exports = router;
