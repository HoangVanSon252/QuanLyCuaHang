import React from "react";
import Header from "../../components/Navbar";
import axiosClient from '../../services/axiosClient';
import {
    Trash2,
    Camera,
    Maximize2,
    Search,
    X,
    ShoppingCart,
    CheckCircle,
    AlertCircle
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

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

    React.useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await axiosClient.get("/products");
                setProducts(response.data.data);
            } catch (error) {
                console.log(error);
            }
        };
        fetchProducts();
    }, []);

    // Lưu trữ tham chiếu mới nhất của products để không bị stale closure
    const productsRef = React.useRef(products);
    React.useEffect(() => {
        productsRef.current = products;
    }, [products]);

    // --- KHỞI TẠO CAMERA SCANNER ---
    React.useEffect(() => {
        let isUnmounted = false;
        let html5QrCode = null;
        let isVideoPlaying = false;

        if (showCamera) {
            // Xóa sạch các thẻ còn sót lại do React StrictMode render 2 lần
            const readerEl = document.getElementById("reader");
            if (readerEl) readerEl.innerHTML = "";

            html5QrCode = new Html5Qrcode("reader");

            const config = { 
                fps: 30, 
                disableFlip: true, 
                qrbox: 250 
            };
            const onScanSuccess = (decodedText) => {
                // Xử lý khi quét thành công
                const product = productsRef.current.find(p => String(p.barcode) === String(decodedText));
                if (product) {
                    // Thêm vào giỏ hàng
                    setCart(prevCart => {
                        const existingItem = prevCart.find(item => item.id === product.id);
                        if (existingItem) {
                            return prevCart.map(item =>
                                item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                            );
                        }
                        return [...prevCart, { ...product, quantity: 1 }];
                    });
                } else {
                    showToast('error', "Không tìm thấy sản phẩm có mã vạch: " + decodedText);
                }
            };

            Html5Qrcode.getCameras().then(devices => {
                if (isUnmounted) return;

                if (devices && devices.length) {
                    // Ép trình duyệt luôn dùng camera sau (mặt lưng điện thoại)
                    html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        onScanSuccess,
                        () => { } // Bỏ qua lỗi parse
                    ).then(() => {
                        isVideoPlaying = true;
                        // Nếu component đã bị tắt trong lúc camera đang khởi động, ta tắt ngay lập tức
                        if (isUnmounted) {
                            html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => { });
                        }
                    }).catch(err => {
                        console.log("Lỗi khởi tạo camera:", err);
                    });
                } else {
                    showToast('error', "Không tìm thấy camera trên thiết bị!");
                }
            }).catch(err => {
                console.log("Lỗi getCameras:", err);
            });
        }

        return () => {
            isUnmounted = true;
            if (html5QrCode) {
                if (isVideoPlaying) {
                    html5QrCode.stop().then(() => {
                        html5QrCode.clear();
                    }).catch(() => { });
                } else {
                    try { html5QrCode.clear(); } catch (e) { }
                }
            }
        };
    }, [showCamera]);

    // --- HÀM THANH TOÁN ---
    const handleCheckout = async () => {
        if (cart.length === 0) return;

        const orderData = {
            total_amount: totalPrice,
            payment_method: 'cash',
            items: cart.map(item => ({
                product_id: item.id,
                quantity: item.quantity,
                price: item.sell_price,
                subtotal: item.quantity * item.sell_price
            }))
        };

        try {
            const res = await axiosClient.post('/orders/create', orderData);
            showToast('success', "Thanh toán thành công! Mã đơn: " + res.data.order_code);
            setCart([]); // Xóa giỏ hàng
        } catch (error) {
            console.error(error);
            showToast('error', "Lỗi khi thanh toán: " + (error.response?.data?.message || error.message));
        }
    };

    // --- CÁC HÀM XỬ LÝ GIỎ HÀNG ---
    const handleAddToCart = (product) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
        setSearchQuery(""); // Xóa thanh tìm kiếm sau khi thêm
        setShowDropdown(false);
    };

    const handleUpdateQuantity = (id, delta) => {
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
            <div className="z-20 relative bg-white">
                <Header />
            </div>

            <div className="flex-1 flex flex-col md:flex-row p-0 md:p-6 md:gap-6 max-w-[1600px] w-full mx-auto relative h-[calc(100vh-60px)]">

                {/* ================= CỘT TRÁI (TÌM KIẾM + CAMERA) ================= */}
                <div className="relative w-full h-[50vh] md:h-full md:flex-1 md:rounded-3xl flex flex-col bg-white overflow-hidden shadow-inner border border-gray-100">

                    {/* THANH TÌM KIẾM */}
                    <div className="p-4 flex gap-2 border-b border-gray-100 z-30 bg-white shadow-sm shrink-0 relative">
                        <div className="flex-1 relative flex items-center bg-gray-50 border-none rounded-xl focus-within:ring-2 focus-within:ring-pink-500 transition px-4 py-3">
                            <Search size={18} className="text-gray-400 mr-2" />
                            <input
                                type="text"
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
                                                        <span className="text-pink-600 font-bold text-xs">{item.sell_price ? parseInt(item.sell_price).toLocaleString() : 0}đ</span>
                                                        <span className="text-[10px] text-gray-400">Kho: {item.stock_quantity}</span>
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
                            className={`p-3 rounded-xl transition-colors ${showCamera ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            <Camera size={24} />
                        </button>
                    </div>

                    {/* VÙNG CAMERA */}
                    {showCamera && (
                        <div className="relative bg-zinc-900 w-full flex-1 flex items-center justify-center overflow-hidden transition-all duration-300">
                            {/* Khu vực chứa video của Html5Qrcode */}
                            <div id="reader" className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full border-none"></div>

                            {/* Lớp phủ trang trí Camera */}
                            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                                <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex flex-col items-center justify-center">
                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-pink-500 rounded-tl-2xl"></div>
                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-pink-500 rounded-tr-2xl"></div>
                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-pink-500 rounded-bl-2xl"></div>
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-pink-500 rounded-br-2xl"></div>
                                    <div className="absolute top-1/2 w-full h-0.5 bg-pink-500 shadow-[0_0_15px_3px_rgba(236,72,153,0.8)] animate-pulse"></div>
                                </div>
                            </div>

                            <button className="absolute top-4 right-4 p-3 bg-black/40 text-white rounded-full backdrop-blur-md hover:bg-black/60 transition z-20 pointer-events-auto">
                                <Maximize2 size={20} />
                            </button>

                            <div className="absolute bottom-10 bg-zinc-800/80 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center backdrop-blur-md z-20 shadow-lg border border-white/10 pointer-events-auto">
                                <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2.5 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                                Đang tìm mã vạch...
                            </div>
                        </div>
                    )}

                    {!showCamera && (
                        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50 text-gray-400 p-6 text-center">
                            <Camera size={48} className="mb-4 opacity-20" />
                            <p className="font-medium text-sm">Giao diện Camera đang bị ẩn.</p>
                            <p className="text-xs mt-1">Bấm nút Camera ở góc phải thanh tìm kiếm để bật lại.</p>
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
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500"></div>
                                    <div className="w-14 h-14 bg-gray-100 rounded-xl mr-4 flex items-center justify-center shrink-0">
                                        <span className="text-gray-400 text-xs font-bold uppercase">{item.name.substring(0, 2)}</span>
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h3 className="font-bold text-gray-800 text-sm truncate">{item.name}</h3>
                                        <div className="flex items-center mt-1 space-x-2">
                                            <span className="font-bold text-pink-600">{item.sell_price ? parseInt(item.sell_price).toLocaleString() : 0}đ</span>
                                        </div>
                                    </div>

                                    {/* Cụm Tăng giảm số lượng */}
                                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                                        <button onClick={() => handleUpdateQuantity(item.id, -1)} className="w-7 h-7 rounded-lg bg-white shadow-sm font-bold text-gray-600 hover:text-pink-600 transition-colors">-</button>
                                        <span className="font-black text-gray-800 text-sm w-5 text-center">{item.quantity}</span>
                                        <button onClick={() => handleUpdateQuantity(item.id, 1)} className="w-7 h-7 rounded-lg bg-white shadow-sm font-bold text-gray-600 hover:text-pink-600 transition-colors">+</button>
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
                        <div className="flex justify-between items-center px-2">
                            <span className="text-gray-500 font-bold">Tổng thanh toán:</span>
                            <span className="text-3xl font-black text-pink-600">{totalPrice.toLocaleString()}đ</span>
                        </div>
                        <button
                            disabled={cart.length === 0}
                            onClick={handleCheckout}
                            className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold rounded-2xl flex items-center justify-center shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            THANH TOÁN
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