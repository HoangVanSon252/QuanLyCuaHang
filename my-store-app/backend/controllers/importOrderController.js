const importOrderModel = require("../models/importOrderModel");

const createImportOrder = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const user_id = req.user.userId;
        const importData = req.body;
        if (!importData || !importData.items || importData.items.length === 0) {
            return res.status(400).json({ message: "Danh sách nhập hàng đang trống" });
        }
        //gọi hàm createImportOrder trong model
        const result = await importOrderModel.createImportOrder(store_id, user_id, importData);
        res.status(200).json({ message: "Nhập hàng thành công", importOrderId: result.importOrderId, orderCode: result.orderCode });
    } catch (error) {
        console.error("Lỗi khi tạo phiếu nhập hàng:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
// Lấy danh sách lịch sử phiếu nhập
const getAllImportOrders = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const orders = await importOrderModel.getAllImportOrders(store_id);
        res.status(200).json(orders);
    } catch (error) {
        console.error("Lỗi khi lấy lịch sử phiếu nhập:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Xem chi tiết một phiếu nhập
const getImportOrderById = async (req, res) => {
    try {
        const store_id = req.user.store_id;
        const import_id = req.params.id; // Lấy ID từ trên URL
        
        const order = await importOrderModel.getImportOrderById(import_id, store_id);
        if (!order) {
            return res.status(404).json({ message: "Không tìm thấy phiếu nhập này!" });
        }
        
        res.status(200).json(order);
    } catch (error) {
        console.error("Lỗi khi lấy chi tiết phiếu nhập:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

module.exports = {
    createImportOrder,
    getAllImportOrders,
    getImportOrderById
};