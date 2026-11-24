const dashboardModel = require("../models/dashboardModel");
const v = require("../utils/validators");
const { asyncHandler } = require("../utils/httpError");

const ok = (res, data) => res.json({ success: true, data });

const getOverview = asyncHandler(async (req, res) => ok(res, await dashboardModel.getOverviewStats(req.user.store_id)));
const getTopProducts = asyncHandler(async (req, res) =>
  ok(res, await dashboardModel.getTopSellingProducts(req.user.store_id))
);
const getLowStock = asyncHandler(async (req, res) => {
  const threshold = v.int(req.query.threshold, "Ngưỡng", { required: false, min: 0, max: 100000 }) ?? 20;
  ok(res, await dashboardModel.getLowStockProducts(req.user.store_id, threshold));
});
const getWeeklyRevenue = asyncHandler(async (req, res) =>
  ok(res, await dashboardModel.getWeeklyRevenue(req.user.store_id))
);
const getRecentActivity = asyncHandler(async (req, res) =>
  ok(res, await dashboardModel.getRecentActivity(req.user.store_id))
);
const getMonthlyRevenue = asyncHandler(async (req, res) =>
  ok(res, await dashboardModel.getMonthlyRevenue(req.user.store_id))
);

module.exports = {
  getOverview,
  getTopProducts,
  getLowStock,
  getWeeklyRevenue,
  getRecentActivity,
  getMonthlyRevenue,
};
