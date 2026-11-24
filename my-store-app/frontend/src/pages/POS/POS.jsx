import React from "react";
import Header from "../../components/Navbar";
import axiosClient, { errorMessage } from '../../services/axiosClient';
import { orderApi } from '../../services/api';
import { formatCurrency, PAYMENT_LABELS } from '../../utils/format';
import {
    Trash2,
    Camera,
    Search,
    X,
    ShoppingCart,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import BarcodeScanner from "../../components/BarcodeScanner";

const POS = () => {
    const [products, setProducts] = React.useState([]);
    const [cart, setCart] = React.useState([]);
    const isDesktop = window.innerWidth >= 768;
    const [showCamera, setShowCamera] = React.useState(isDesktop);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [showDropdown, setShowDropdown] = React.useState(false);

    // State cho Modal thông báo
    const [toast, setToast] = React.useState({ isOpen: false, type: 'success', message: '' });

    const showToast = (type, message) => {
        setToast({ isOpen: true, type, message });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isOpen: false }));
        }, 3000);
    };

    const [paymentMethod, setPaymentMethod] = React.useState('cash');
    const [submitting, setSubmitting] = React.useState(false);

    // Tải (lại) danh sách sản phẩm để có tồn kho mới nhất
    const loadProducts = React.useCallback(async () => {
        try {
            const response = await axiosClient.get("/products");
            const payload = response.data;
            setProducts(payload.data || (Array.isArray(payload) ? payload : []));
        } catch (error) {
            setToast({ isOpen: true, type: 'error', message: errorMessage(error, 'Không tải được danh sách sản phẩm.') });
        }
    }, []);

    React.useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    // Thêm 1 sản phẩm vào giỏ, không vượt quá số lượng tồn kho
    const addProductToCart = (product) => {
        if ((product.stock_quantity || 0) <= 0) {
            showToast('error', `"${product.name}" đã hết hàng.`);
            return;
        }
        let exceeded = false;
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                if (existingItem.quantity >= product.stock_quantity) {
                    exceeded = true;
                    return prevCart;
                }
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
        if (exceeded) showToast('error', `Chỉ còn ${product.stock_quantity} "${product.name}" trong kho.`);
    };
    const addProductRef = React.useRef(addProductToCart);
    React.useEffect(() => { addProductRef.current = addProductToCart; });

    // Lưu trữ tham chiếu mới nhất của products để không bị stale closure
    const productsRef = React.useRef(products);
    React.useEffect(() => {
        productsRef.current = products;
    }, [products]);

    // --- QUÉT MÃ VẠCH BẰNG CAMERA ---
    const handleScanned = (code) => {
        const product = productsRef.current.find(p => String(p.barcode) === String(code));
        if (product) addProductRef.current(product);
        else showToast('error', 'Không tìm thấy sản phẩm có mã vạch: ' + code);
    };

    // --- HÀM THANH TOÁN ---
    // Chỉ gửi mã sản phẩm + số lượng. Giá và tổng tiền do server tính từ dữ liệu gốc.
    const handleCheckout = async () => {
        if (cart.length === 0 || submitting) return;
        setSubmitting(true);
        try {
            const res = await orderApi.create({
                payment_method: paymentMethod,
                items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
            });
            showToast('success', `Thanh toán thành công ${formatCurrency(res.total_amount)} — Mã đơn: ${res.order_code}`);
            setCart([]);
        } catch (error) {
            showToast('error', errorMessage(error, 'Thanh toán thất bại.'));
        } finally {
            setSubmitting(false);
            loadProducts(); // cập nhật tồn kho mới nhất (kể cả khi quầy khác vừa bán)
        }
    };

    // --- CÁC HÀM XỬ LÝ GIỎ HÀNG ---
    const handleAddToCart = (product) => {
        addProductToCart(product);
        setSearchQuery(""); // Xóa thanh tìm kiếm sau khi thêm
        setShowDropdown(false);
    };

    const handleUpdateQuantity = (id, delta) => {
        const stock = products.find(p => p.id === id)?.stock_quantity ?? Infinity;
        if (delta > 0 && (cart.find(i => i.id === id)?.quantity || 0) >= stock) {
            showToast('error', `Chỉ còn ${stock} sản phẩm trong kho.`);
            return;
        }
        setCart(prevCart => prevCart.map(item => {
            if (item.id === id) {
                const newQuantity = item.quantity + delta;
                return { ...item, quantity: newQuantity > 0 ? newQuantity : 1 };
            }
            return item;
        }));
    };

    const handleRemoveItem = (id) => {
        setCart(prevCart => prevCart.filter(item => item.id !== id));
    };

    const handleClearCart = () => {
        setCart([]);
    };

    // --- TÍNH TOÁN ---
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);

    // --- TÌM KIẾM SẢN PHẨM ---
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.includes(searchQuery))
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col overflow-hidden pb-16 md:pb-0">
            <div className="z-20 relative bg-white md:bg-transparent">
                <Header />
            </div>

            <div className="flex-1 flex flex-col md:flex-row p-0 md:p-6 md:gap-6 max-w-[1600px] w-full mx-auto relative h-[calc(100vh-60px)]">

                {/* ================= CỘT TRÁI (TÌM KIẾM + CAMERA) ================= */}
                <div className="relative w-full h-[50vh] md:h-auto md:flex-1 md:rounded-3xl flex flex-col bg-white overflow-hidden shadow-inner border border-gray-100">

                    {/* THANH TÌM KIẾM */}
                    <div className="p-4 flex gap-2 border-b border-gray-100 z-30 bg-white shadow-sm shrink-0 relative">
                        <div className="flex-1 relative flex items-center bg-gray-50 border-none rounded-xl focus-within:ring-2 focus-within:ring-brand-500 transition px-4 py-3">
                            <Search size={18} className="text-gray-400 mr-2" />
                            <input
                                type="text"
                                aria-label="Tìm sản phẩm"
                                maxLength={100}
                                onKeyDown={(e) => {
                                    // Máy quét mã vạch USB gõ mã rồi nhấn Enter → thêm ngay sản phẩm khớp mã
                                    if (e.key === 'Enter' && searchQuery.trim()) {
                                        const exact = products.find(p => p.barcode && p.barcode === searchQuery.trim());
                                        const target = exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);
                                        if (target) handleAddToCart(target);
                                    }
                                }}
                                placeholder="Tìm tên sản phẩm hoặc mã vạch..."
                                className="flex-1 bg-transparent outline-none font-medium text-gray-700"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                            />
                            {searchQuery && (
                                <button onClick={() => { setSearchQuery(""); setShowDropdown(false); }} className="text-gray-400 hover:text-gray-600">
                                    <X size={16} />
                                </button>
                            )}

                            {/* DROPDOWN KẾT QUẢ TÌM KIẾM */}
                            {showDropdown && searchQuery && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                                    {filteredProducts.length === 0 ? (
                                        <div className="p-4 text-center text-gray-500 text-sm">Không tìm thấy sản phẩm nào</div>
                                    ) : (
                                        filteredProducts.map(item => (
                                            <div
                                                key={item.id}
                                                onClick={() => handleAddToCart(item)}
                                                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                                    <span className="text-gray-400 text-[10px] font-bold uppercase">{item.name.substring(0, 2)}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-gray-800 truncate">{item.name}</h4>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-brand-600 font-bold text-xs">{item.sell_price ? parseInt(item.sell_price).toLocaleString() : 0}đ</span>
                                                        <span className={`text-[10px] ${item.stock_quantity > 0 ? 'text-gray-400' : 'text-red-500 font-bold'}`}>
                                                            {item.stock_quantity > 0 ? `Kho: ${item.stock_quantity}` : 'Hết hàng'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setShowCamera(!showCamera);
                                setSearchQuery("");
                                setShowDropdown(false);
                            }}
                            aria-label={showCamera ? 'Tắt camera quét mã' : 'Bật camera quét mã'}
                            title={showCamera ? 'Tắt camera quét mã' : 'Bật camera quét mã'}
                            className={`p-3 rounded-xl transition-colors ${showCamera ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <Camera size={24} />
                        </button>
                    </div>

                    {/* VÙNG CAMERA */}
                    {showCamera && (
                        <BarcodeScanner
                            className="w-full flex-1"
                            onDetected={handleScanned}
                            onError={(msg) => showToast('error', msg)}
                        />
                    )}

                    {!showCamera && (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400 p-6 text-center">
                            <Camera size={48} className="mb-4 opacity-20" />
                            <p className="font-medium text-sm">Camera đang tắt.</p>
                            <p className="text-xs mt-1">Bấm nút Camera để quét mã vạch, hoặc gõ tên / dùng máy quét mã vạch USB rồi nhấn Enter.</p>
                        </div>
                    )}
                </div>

                {/* ================= CỘT PHẢI (GIỎ HÀNG) ================= */}
                <div className="bg-white flex flex-col flex-1 md:flex-none md:w-[400px] lg:w-[480px] -mt-8 md:mt-0 rounded-t-[32px] md:rounded-3xl shadow-2xl md:shadow-lg z-20 h-[55vh] md:h-full border border-gray-100">

                    <div className="w-full flex justify-center py-3 md:hidden">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                    </div>

                    {/* Header giỏ hàng */}
                    <div className="px-6 py-4 md:py-6 border-b border-gray-50 flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-gray-800">Giỏ hàng</h2>
                            <p className="text-sm text-gray-500 font-medium">{totalItems} sản phẩm đã chọn</p>
                        </div>
                        <button
                            onClick={handleClearCart}
                            disabled={cart.length === 0}
                            className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Danh sách giỏ hàng */}
                    <div className="p-4 md:p-6 flex-1 overflow-y-auto space-y-3">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <ShoppingCart size={48} className="mb-4 opacity-20" />
                                <p className="font-medium">Chưa có sản phẩm nào</p>
                                <p className="text-sm mt-1">Vui lòng quét mã hoặc tìm kiếm để thêm</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="relative flex items-center p-3 border border-gray-100 rounded-2xl shadow-sm bg-white overflow-hidden transition hover:shadow-md">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-brand-500"></div>
                                    <div className="w-14 h-14 bg-gray-100 rounded-xl mr-4 flex items-center justify-center shrink-0">
                                        <span className="text-gray-400 text-xs font-bold uppercase">{item.name.substring(0, 2)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                                        <div className="flex items-center mt-1 space-x-2">
                                            <span className="font-bold text-brand-600">{item.sell_price ? parseInt(item.sell_price).toLocaleString() : 0}đ</span>
                                        </div>
                                    </div>

                                    {/* Cụm Tăng giảm số lượng */}
                                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                                        <button onClick={() => handleUpdateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-white shadow-sm font-bold text-gray-600 hover:text-brand-600 transition-colors">-</button>
                                        <span className="font-black text-gray-800 text-sm w-5 text-center">{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-white shadow-sm font-bold text-gray-600 hover:text-brand-600 transition-colors">+</button>
                                    </div>

                                    <button onClick={() => handleRemoveItem(item.id)} className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer tính tiền */}
                    <div className="p-4 md:p-6 space-y-4 bg-white border-t border-gray-50 flex-shrink-0 md:rounded-b-3xl">
                        <div className="flex gap-2" role="radiogroup" aria-label="Phương thức thanh toán">
                            {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="radio"
                                    aria-checked={paymentMethod === key}
                                    onClick={() => setPaymentMethod(key)}
                                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${paymentMethod === key ? 'bg-brand-50 border-brand-400 text-brand-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-between items-center px-2">
                            <span className="text-gray-500 font-bold">Tổng thanh toán:</span>
                            <span className="text-3xl font-black text-brand-600">{formatCurrency(totalPrice)}</span>
                        </div>
                        <button
                            disabled={cart.length === 0 || submitting}
                            onClick={handleCheckout}
                            className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-500 text-white font-bold rounded-2xl flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {submitting ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN'}
                        </button>
                    </div>

                </div>

            </div>

            {/* TOAST THÔNG BÁO */}
            <div className={`fixed top-4 right-4 z-[9999] transition-all duration-300 transform ${toast.isOpen ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0 pointer-events-none'}`}>
                <div className="bg-white rounded-2xl shadow-2xl p-4 flex items-center gap-4 min-w-[300px] border border-gray-100">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                        {toast.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                    </div>
                    <div className="flex-1">
                        <h4 className={`font-bold ${toast.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {toast.type === 'success' ? 'Thành công' : 'Thất bại'}
                        </h4>
                        <p className="text-gray-600 text-sm font-medium mt-0.5">{toast.message}</p>
                    </div>
                    <button onClick={() => setToast(prev => ({ ...prev, isOpen: false }))} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default POS;