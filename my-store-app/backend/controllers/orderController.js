const orderModel = require('../models/orderModel');

const createOrder = async (req, res) => {
    try {
        //lấy store_id từ token 
        const store_id = req.user.store_id;
        //lấy user_id từ token 
        const user_id = req.user.userId;
        //lấy dữ liệu từ body dữ liệu Fe gửi lên
        const orderData = req.body;
        //kiểm tra dữ liệu nhận được có đầy đủ không
        if (!orderData || !orderData.items || orderData.items.length === 0) {
            return res.status(400).json({ message: "Giỏ hàng đang trống" });
        }
        // Tạo hóa đơn
        const result = await orderModel.createOrderTransaction(store_id, user_id, orderData);
        // Trả về kết quả nếu thành công
        res.status(200).json({ message: "Thanh toán thành công", order_code: result.orderCode });
    }
    catch (error) {
        console.error("Lỗi khi tạo hóa đơn", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
// Lấy danh sách lịch sử hóa đơn
const getAllOrders = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const orders = await orderModel.getAllOrders(store_id);
        res.status(200).json(orders);
    } catch (error) {
        console.error("Lỗi khi lấy lịch sử hóa đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Xem chi tiết một hóa đơn
const getOrderById = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const order_id = req.params.id; // Lấy ID từ trên URL /api/orders/:id
        
        const order = await orderModel.getOrderById(order_id, store_id);
        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy hóa đơn này!" });
        }
        
        res.status(200).json(order);
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết hóa đơn:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getOrderById
}