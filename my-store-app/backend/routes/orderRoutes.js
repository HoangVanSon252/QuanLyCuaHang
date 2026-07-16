const express = require('express');
const route = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createOrder, getAllOrders, getOrderById } = require('../controllers/orderController');

route.post('/create', authMiddleware, createOrder);
route.get('/', authMiddleware, getAllOrders);
route.get('/:id', authMiddleware, getOrderById);

module.exports = route;