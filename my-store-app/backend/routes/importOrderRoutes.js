const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { createImportOrder, getAllImportOrders, getImportOrderById } = require("../controllers/importOrderController");
router.post("/create", authMiddleware, createImportOrder);
router.get('/', authMiddleware, getAllImportOrders);
router.get('/:id', authMiddleware, getImportOrderById);

module.exports = router;        