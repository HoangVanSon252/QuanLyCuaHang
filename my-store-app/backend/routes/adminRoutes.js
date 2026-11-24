const express = require("express");
const router = express.Router();
const admin = require("../controllers/adminController");
const { authMiddleware, requireRole } = require("../middleware/authMiddleware");

// Toàn bộ API quản trị chỉ dành cho admin hệ thống
router.use(authMiddleware, requireRole("super_admin"));

router.get("/stores", admin.listStores);
router.post("/stores", admin.createStore);
router.get("/stores/:id", admin.getStore);
router.put("/stores/:id", admin.updateStore);
router.patch("/stores/:id/status", admin.setStoreStatus);
router.post("/stores/:id/reset-password", admin.resetStorePassword);
router.get("/audit-logs", admin.getAuditLogs);

module.exports = router;
