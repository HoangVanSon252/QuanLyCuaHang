// Nhận và trả về dữ liệu dưới dạng JSON 
const productsModel = require('../models/productModel');

const getAllProducts = async (req, res) => {
    try {
        // BẢO MẬT 1: Trích xuất store_id của chủ cửa hàng từ Token
        const store_id = req.user.store_id;

        // BẢO BẬT 2: Truyền store_id xuống Model để lọc đúng sản phẩm của họ
        const productList = await productsModel.getAllProducts(store_id);

        return res.status(200).json({
            message: 'Lấy danh sách sản phẩm thành công!',
            data: productList
        })
    } catch (error) {
        console.error("Error fetching all products:", error);
        return res.status(500).json({
            message: 'Lỗi server khi lấy danh sách sản phẩm!',
            error: error.message
        })
    }
}

const getAllCategories = async (req, res) => {
    try {
        // BẢO MẬT 1: Lấy store_id
        const store_id = req.user.store_id;

        // BẢO MẬT 2: Lọc danh mục theo store_id
        const categoryList = await productsModel.getAllCategories(store_id);

        return res.status(200).json({
            message: 'Lấy danh sách danh mục thành công!',
            data: categoryList
        })
    } catch (error) {
        console.error("Error fetching all categories:", error);
        return res.status(500).json({
            message: 'Lỗi server khi lấy danh sách danh mục!',
            error: error.message
        })
    }
}

const createProduct = async (req, res) => {
    try {
        // kiểm tra quyền chủ của hàng 
        const store_id = req.user.store_id;
        const { category_id, supplier_id, name, barcode, cost_price, sell_price, stock_quantity } = req.body;
        if (!name) {
            return res.status(400).json(
                { message: "Tên sản phẩm bắt buộc phải có" }
            )
        }
        //kiểm tra giá bán, giá nhập phải là số và lớn hơn 0
        if (cost_price === undefined || isNaN(cost_price) || Number(cost_price) < 0 ||
            sell_price === undefined || isNaN(sell_price) || Number(sell_price) < 0) {
            return res.status(400).json(
                { message: "Giá bán, giá nhập phải là số và lớn hơn 0" }
            )
        }
        //kiểm tra số lượng tồn kho phải là số và lớn hơn 0
        if (stock_quantity === undefined || isNaN(stock_quantity) || Number(stock_quantity) < 0) {
            return res.status(400).json(
                { message: "Số lượng tồn kho phải là số và lớn hơn 0" }
            )
        }
        //kiểm tra danh mục và nhà cung cấp phải là số
        if (category_id !== undefined && category_id !== "" && category_id !== null) {
            if (isNaN(category_id) || Number(category_id) <= 0) {
                return res.status(400).json(
                    { message: "Danh mục phải là số dương" }
                )
            }
        }
        if (supplier_id !== undefined && supplier_id !== "" && supplier_id !== null) {
            if (isNaN(supplier_id) || Number(supplier_id) <= 0) {
                return res.status(400).json(
                    { message: "Nhà cung cấp không hợp lệ" }
                )
            }
        }
        //kiểm tra mã vạch phải là số
        if (barcode !== undefined && barcode !== "" && barcode !== null) {
            if (isNaN(barcode) || Number(barcode) <= 0) {
                return res.status(400).json(
                    { message: "Mã vạch phải là số dương" }
                )
            }
        }
        // tạo sản phẩm mới

        const newProduct = {
            store_id,
            category_id: category_id || null,
            supplier_id: supplier_id || null,
            name,
            barcode: barcode || null,
            cost_price: Number(cost_price),
            sell_price: Number(sell_price),
            stock_quantity: Number(stock_quantity)
        }
        const result = await productsModel.createProduct(newProduct);
        return res.status(201).json({
            message: "Thêm sản phẩm thành công!",
            data: result
        })
    } catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({
            message: 'Lỗi server khi tạo sản phẩm!',
            error: error.message
        })
    }
}
const getProductByID = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const { id } = req.params;

        const product = await productsModel.getProductByID(store_id, id);
        if (!product) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
        }

        return res.status(200).json({
            message: "Lấy thông tin chi tiết sản phẩm thành công!",
            data: product
        });
    } catch (error) {
        console.error("Error getting product detail:", error);
        return res.status(500).json({
            message: "Lỗi server khi lấy chi tiết sản phẩm!",
            error: error.message
        });
    }
}

const updateProduct = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const { id } = req.params;
        const { category_id, supplier_id, name, barcode, cost_price, sell_price, stock_quantity } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Tên sản phẩm bắt buộc phải có" });
        }
        if (cost_price === undefined || isNaN(cost_price) || Number(cost_price) < 0 ||
            sell_price === undefined || isNaN(sell_price) || Number(sell_price) < 0) {
            return res.status(400).json({ message: "Giá bán, giá nhập không được âm" });
        }
        if (stock_quantity === undefined || isNaN(stock_quantity) || Number(stock_quantity) < 0) {
            return res.status(400).json({ message: "Số lượng tồn kho không được âm" });
        }

        if (category_id !== undefined && category_id !== null && category_id !== "") {
            if (isNaN(category_id) || Number(category_id) <= 0) {
                return res.status(400).json({ message: "Danh mục không hợp lệ" })
            }
        }
        if (supplier_id !== undefined && supplier_id !== null && supplier_id !== "") {
            if (isNaN(supplier_id) || Number(supplier_id) <= 0) {
                return res.status(400).json({ message: "Nhà cung cấp không hợp lệ" })
            }
        }
        if (barcode !== undefined && barcode !== null && barcode !== "") {
            if (isNaN(barcode) || Number(barcode) <= 0) {
                return res.status(400).json({ message: "Mã vạch không hợp lệ" })
            }
        }

        const updateData = {
            name,
            barcode: barcode || null,
            cost_price: Number(cost_price),
            sell_price: Number(sell_price),
            stock_quantity: Number(stock_quantity),
            category_id: category_id || null,
            supplier_id: supplier_id || null
        };

        const success = await productsModel.updateProduct(store_id, id, updateData);
        if (!success) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm để cập nhật hoặc dữ liệu không đổi!" });
        }

        return res.status(200).json({
            message: "Cập nhật sản phẩm thành công!"
        });
    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({
            message: "Lỗi server khi cập nhật sản phẩm!",
            error: error.message
        });
    }
}

const deleteProduct = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const { id } = req.params;

        const success = await productsModel.deleteProduct(store_id, id);
        if (!success) {
            return res.status(404).json({ message: "Không tìm thấy sản phẩm để xóa!" });
        }

        return res.status(200).json({
            message: "Xóa sản phẩm thành công!"
        });
    } catch (error) {
        console.error("Error deleting product:", error);
        return res.status(500).json({
            message: "Lỗi server khi xóa sản phẩm!",
            error: error.message
        });
    }
}

const getAllSuppliers = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const supplierList = await productsModel.getAllSuppliers(store_id);

        return res.status(200).json({
            message: "Lấy danh sách nhà cung cấp thành công!",
            data: supplierList
        });
    } catch (error) {
        console.error("Error fetching all suppliers:", error);
        return res.status(500).json({
            message: "Lỗi server khi lấy danh sách nhà cung cấp!",
            error: error.message
        });
    }
}

module.exports = {
    getAllProducts,
    getAllCategories,
    createProduct,
    getProductByID,
    updateProduct,
    deleteProduct,
    getAllSuppliers,
}