const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authMiddleware, requireRole, requireStore } = require("../middleware/authMiddleware");

// Chỉ tài khoản cửa hàng; mọi truy vấn đều lọc theo cửa hàng của tài khoản đó
router.use(authMiddleware, requireRole("store_admin"), requireStore);

router.get("/", productController.getAllProducts);
router.post("/", productController.createProduct);
router.get("/categories", productController.getAllCategories);
router.post("/categories", productController.createCategory);
router.get("/:id", productController.getProductByID);
router.put("/:id", productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

module.exports = router;
