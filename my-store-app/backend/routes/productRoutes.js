const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/authMiddleware'); // BẢO MẬT: Nhúng Bác bảo vệ

// BẢO MẬT: Mọi request phải đi qua authMiddleware để kiểm tra Token
router.get('/', authMiddleware, productController.getAllProducts);
router.post('/', authMiddleware, productController.createProduct);
router.get('/categories', authMiddleware, productController.getAllCategories);
router.post('/categories', authMiddleware, productController.createCategory);
router.get('/:id', authMiddleware, productController.getProductByID);
router.put('/:id', authMiddleware, productController.updateProduct);
router.delete('/:id', authMiddleware, productController.deleteProduct);

module.exports = router;
