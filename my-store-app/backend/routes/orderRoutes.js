const express = require("express");
const route = express.Router();
const { authMiddleware, requireRole, requireStore } = require("../middleware/authMiddleware");
const { createOrder, getAllOrders, getOrderById, cancelOrder } = require("../controllers/orderController");

// Chỉ tài khoản cửa hàng
route.use(authMiddleware, requireRole("store_admin"), requireStore);

route.post("/create", createOrder);
route.get("/", getAllOrders);
route.get("/:id", getOrderById);
route.post("/:id/cancel", cancelOrder);

module.exports = route;
