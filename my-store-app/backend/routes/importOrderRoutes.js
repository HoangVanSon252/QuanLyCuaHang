const express = require("express");
const router = express.Router();
const { authMiddleware, requireRole, requireStore } = require("../middleware/authMiddleware");
const { createImportOrder, getAllImportOrders, getImportOrderById } = require("../controllers/importOrderController");

// Chỉ tài khoản cửa hàng
router.use(authMiddleware, requireRole("store_admin"), requireStore);

router.post("/create", createImportOrder);
router.get("/", getAllImportOrders);
router.get("/:id", getImportOrderById);

module.exports = router;
