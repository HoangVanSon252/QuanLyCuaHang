import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Navbar";
import {
  Package,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Download,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  Loader2,
  Camera,
  Maximize2
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { productApi } from "../../services/api";

const Inventory = () => {


  // --- Utilities ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Filter & Search states
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");

  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchTerm(search);
    }
  }, [searchParams]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Dropdown states (id of product whose dropdown is open)
  const [activeDropdownId, setActiveDropdownId] = useState(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' or 'edit'
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    barcode: "",
    cost_price: "",
    sell_price: "",
    stock_quantity: "",
    category_id: ""
  });
  const [formError, setFormError] = useState("");

  // Delete confirm state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryFormError, setCategoryFormError] = useState("");

  // Camera scanner state cho Modal thêm mới/sửa
  const [isScanningBarcode, setIsScanningBarcode] = useState(false);

  // --- XỬ LÝ CAMERA SCANNER ---
  useEffect(() => {
    let isUnmounted = false;
    let html5QrCode = null;
    let isVideoPlaying = false;

    if (isModalOpen && isScanningBarcode) {
      const readerEl = document.getElementById("inventory-reader");
      if (readerEl) readerEl.innerHTML = "";

      html5QrCode = new Html5Qrcode("inventory-reader");

      const onScanSuccess = (decodedText) => {
        setFormData(prev => ({ ...prev, barcode: decodedText }));
        setIsScanningBarcode(false); // tự động tắt camera khi quét xong
      };

      Html5Qrcode.getCameras().then(devices => {
        if (isUnmounted) return;
        if (devices && devices.length) {
          // Ép trình duyệt luôn dùng camera sau (mặt lưng điện thoại)
          html5QrCode.start(
            { facingMode: "environment" },
            { 
              fps: 30, 
              disableFlip: true, 
              qrbox: 250 
            },
            onScanSuccess,
            () => { } // Bỏ qua lỗi parse
          ).then(() => {
            isVideoPlaying = true;
            if (isUnmounted) {
              html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => { });
            }
          }).catch(err => console.log(err));
        } else {
          alert("Không tìm thấy camera!");
          setIsScanningBarcode(false);
        }
      }).catch(err => console.log(err));
    }

    return () => {
      isUnmounted = true;
      if (html5QrCode) {
        if (isVideoPlaying) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => { });
        } else {
          try { html5QrCode.clear(); } catch (e) { }
        }
      }
    };
  }, [isModalOpen, isScanningBarcode]);

  // --- Fetch Data ---
  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [prodsRes, catsRes] = await Promise.all([
        productApi.getProducts(),
        productApi.getCategories()
      ]);

      setProducts(prodsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (err) {
      console.error("Error loading inventory data:", err);
      setErrorMsg("Không thể kết nối đến server hoặc phiên đăng nhập hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveDropdownId(null);
    window.addEventListener("click", handleOutsideClick);
    return () => window.removeEventListener("click", handleOutsideClick);
  }, []);

  // --- Helpers ---
  const getCategoryName = (categoryId) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? cat.name : "Chưa phân loại";
  };

  const formatPrice = (price) => {
    return Number(price).toLocaleString("vi-VN") + " đ";
  };

  // --- Stats Calculations ---
  const totalStockQuantity = products.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  const lowStockProductsCount = products.filter(p => (p.stock_quantity || 0) < 20).length;
  const totalInventoryValue = products.reduce((sum, p) => sum + (Number(p.cost_price || 0) * (p.stock_quantity || 0)), 0);

  // --- Search and Filter Logic ---
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const indexOfLastProduct = currentPage * pageSize;
  const indexOfFirstProduct = indexOfLastProduct - pageSize;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  // Adjust page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredProducts.length, totalPages, currentPage]);

  // --- Form Handlers ---
  const handleOpenAddModal = () => {
    setModalMode("add");
    setFormData({
      name: "",
      barcode: "",
      cost_price: "",
      sell_price: "",
      stock_quantity: "",
      category_id: categories[0]?.id || ""
    });
    setFormError("");
    setIsModalOpen(true);
    setIsScanningBarcode(false);
  };

  const handleOpenEditModal = (product) => {
    setModalMode("edit");
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      barcode: product.barcode || "",
      cost_price: product.cost_price,
      sell_price: product.sell_price,
      stock_quantity: product.stock_quantity,
      category_id: product.category_id || ""
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    // Validation
    if (!formData.name.trim()) {
      setFormError("Vui lòng nhập tên sản phẩm!");
      return;
    }
    if (Number(formData.cost_price) < 0 || Number(formData.sell_price) < 0) {
      setFormError("Giá tiền không được nhỏ hơn 0!");
      return;
    }
    if (Number(formData.stock_quantity) < 0) {
      setFormError("Số lượng tồn kho không được nhỏ hơn 0!");
      return;
    }

    try {
      if (modalMode === "add") {
        await productApi.createProduct({
          ...formData,
          cost_price: Number(formData.cost_price),
          sell_price: Number(formData.sell_price),
          stock_quantity: Number(formData.stock_quantity),
          category_id: formData.category_id ? Number(formData.category_id) : null
        });
      } else {
        await productApi.updateProduct(selectedProduct.id, {
          ...formData,
          cost_price: Number(formData.cost_price),
          sell_price: Number(formData.sell_price),
          stock_quantity: Number(formData.stock_quantity),
          category_id: formData.category_id ? Number(formData.category_id) : null
        });
      }
      setIsModalOpen(false);
      setIsScanningBarcode(false);
      fetchData(); // Reload list
    } catch (err) {
      console.error("Error submitting form:", err);
      setFormError(err.response?.data?.message || "Đã xảy ra lỗi khi lưu sản phẩm.");
    }
  };

  // --- Category Handlers ---
  const handleAddCategory = async (e) => {
    e.preventDefault();
    setCategoryFormError("");
    if (!newCategoryName.trim()) {
      setCategoryFormError("Vui lòng nhập tên danh mục!");
      return;
    }
    try {
      const res = await productApi.createCategory({ name: newCategoryName });
      setCategories(prev => [...prev, res.data]);
      setFormData(prev => ({ ...prev, category_id: res.data.id }));
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
    } catch (err) {
      console.error("Error creating category:", err);
      setCategoryFormError(err.response?.data?.message || "Đã xảy ra lỗi khi tạo danh mục.");
    }
  };

  // --- Delete Handlers ---
  const handleOpenDeleteConfirm = (product) => {
    setProductToDelete(product);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      if (productToDelete) {
        await productApi.deleteProduct(productToDelete.id);
        setIsDeleteConfirmOpen(false);
        setProductToDelete(null);
        fetchData(); // Reload list
      }
    } catch (err) {
      console.error("Error deleting product:", err);
      alert(err.response?.data?.message || "Đã xảy ra lỗi khi xóa sản phẩm.");
    }
  };

  // --- Export CSV Logic ---
  const handleExportCSV = () => {
    if (products.length === 0) return;
    const headers = ["ID", "Tên sản phẩm", "Mã vạch", "Giá nhập", "Giá bán", "Tồn kho", "Danh mục"];
    const rows = filteredProducts.map(p => [
      p.id,
      p.name,
      p.barcode || '',
      p.cost_price,
      p.sell_price,
      p.stock_quantity,
      getCategoryName(p.category_id)
    ]);

    // Thêm BOM tiếng Việt cho Excel
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `danh_sach_kho_hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12 relative">
      <Header />

      <div className="p-6 max-w-[1400px] mx-auto">

        {/* Header Tiêu đề & Nút Thêm sản phẩm */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kho hàng</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý và theo dõi vật tư thực tế</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#9D2753] to-[#ef6292] hover:opacity-90 transition-opacity text-white text-sm font-bold rounded-xl shadow-md"
          >
            <Plus size={16} />
            <span>Thêm sản phẩm</span>
          </button>
        </div>

        {/* 3 Thẻ Card Thống Kê */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* Card 1: Tổng số lượng tồn */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-400 rounded-l-2xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">TỔNG SẢN PHẨM TRONG KHO</p>
                <h3 className="text-3xl font-black text-gray-800 mb-4">
                  {loading ? "..." : totalStockQuantity.toLocaleString()}
                </h3>
              </div>
              <div className="p-2.5 bg-pink-50 text-pink-500 rounded-xl">
                <Package size={22} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-400 font-medium">Tổng số lượng đơn vị sản phẩm lưu kho</span>
            </div>
          </div>

          {/* Card 2: Sắp hết hàng */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-600 rounded-l-2xl"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">SẮP HẾT HÀNG (&lt; 20)</p>
                <h3 className={`text-3xl font-black mb-4 ${lowStockProductsCount > 0 ? 'text-rose-600' : 'text-gray-800'}`}>
                  {loading ? "..." : lowStockProductsCount}
                </h3>
              </div>
              <div className="p-2.5 bg-red-50 text-red-500 rounded-xl">
                <AlertTriangle size={22} />
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-gray-500 font-medium">Cần bổ sung nguồn cung ngay lập tức</span>
            </div>
          </div>

          {/* Card 3: Tổng giá trị kho */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full"></div>
            <p className="text-rose-100 text-xs font-bold uppercase tracking-wide mb-1 opacity-90">GIÁ TRỊ KHO (GIÁ NHẬP)</p>
            <h3 className="text-3xl font-black tracking-tight mb-1">
              {loading ? "..." : formatPrice(totalInventoryValue)}
            </h3>
            <p className="text-rose-100 text-sm font-medium mb-4">Ước tính tổng tiền nhập</p>
          </div>

        </div>

        {/* Toolbar Phân loại & Tìm kiếm */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">

          {/* Lọc danh mục */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 font-semibold mr-2">Phân loại:</span>
            <button
              onClick={() => { setSelectedCategory(null); setCurrentPage(1); }}
              className={`px-5 py-2 text-sm rounded-full transition-all ${selectedCategory === null
                ? "bg-rose-700 text-white font-bold shadow-sm"
                : "bg-white text-gray-600 font-semibold border border-gray-200 hover:bg-gray-50"
                }`}
            >
              Tất cả
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategory(cat.id); setCurrentPage(1); }}
                className={`px-5 py-2 text-sm rounded-full transition-all ${selectedCategory === cat.id
                  ? "bg-rose-700 text-white font-bold shadow-sm"
                  : "bg-white text-gray-600 font-semibold border border-gray-200 hover:bg-gray-50"
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Tìm kiếm & Xuất file */}
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-initial flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-rose-700/30">
              <Search size={16} className="text-gray-400 mr-2" />
              <input
                type="text"
                placeholder="Tìm tên, mã vạch..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-sm text-gray-700 focus:outline-none w-full sm:w-48"
              />
            </div>
            <button
              onClick={handleExportCSV}
              disabled={products.length === 0}
              className="flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Download size={16} className="mr-2 text-gray-500" /> Xuất Excel (CSV)
            </button>
          </div>

        </div>

        {/* Bảng Danh Sách Sản Phẩm */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8 min-h-[350px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <Loader2 className="w-8 h-8 text-rose-700 animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Đang tải dữ liệu kho hàng...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <p className="text-red-500 font-medium mb-4">{errorMsg}</p>
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-rose-700 text-white rounded-lg text-sm font-bold shadow-sm"
              >
                Tải lại trang
              </button>
            </div>
          ) : currentProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
              <p className="text-gray-500 font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
            </div>
          ) : (
            <>
              {/* GIAO DIỆN DESKTOP: TABLE */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="text-[11px] font-bold tracking-wider text-gray-400 uppercase border-b border-gray-100 bg-gray-50/50">
                      <th className="py-4 px-6 rounded-tl-2xl">SẢN PHẨM</th>
                      <th className="py-4 px-6">MÃ VẠCH (BARCODE)</th>
                      <th className="py-4 px-6">DANH MỤC</th>
                      <th className="py-4 px-6">GIÁ NHẬP</th>
                      <th className="py-4 px-6">GIÁ BÁN</th>
                      <th className="py-4 px-6">SỐ LƯỢNG</th>
                      <th className="py-4 px-6">TRẠNG THÁI</th>
                      <th className="py-4 px-6 text-center rounded-tr-2xl">THAO TÁC</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {currentProducts.map((p) => {
                      const isLowStock = (p.stock_quantity || 0) < 20;
                      return (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-slate-50 transition-colors group">
                          <td className="py-4 px-6 flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center font-bold text-gray-400">
                              {p.image_url ? (
                                <img src={p.image_url} alt="prod" className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} className="text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800 text-base group-hover:text-rose-700 transition-colors">{p.name}</p>
                              <p className="text-gray-400 text-xs mt-0.5">ID: {p.id}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-gray-500 font-mono text-xs">
                            {p.barcode || "N/A"}
                          </td>
                          <td className="py-4 px-6">
                            <span className="inline-block px-3 py-1 bg-sky-50 text-sky-600 text-xs font-bold rounded-md">
                              {getCategoryName(p.category_id)}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-gray-600">
                            {formatPrice(p.cost_price)}
                          </td>
                          <td className="py-4 px-6 font-bold text-gray-800">
                            {formatPrice(p.sell_price)}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col w-24">
                              <span className={`font-bold mb-1.5 ${isLowStock ? 'text-red-600' : 'text-gray-800'}`}>
                                {p.stock_quantity || 0} món
                              </span>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${isLowStock ? 'bg-red-500' : 'bg-rose-700'}`}
                                  style={{ width: `${Math.min(100, ((p.stock_quantity || 0) / 150) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {(p.stock_quantity || 0) === 0 ? (
                              <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Hết hàng</span>
                            ) : isLowStock ? (
                              <span className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-full">Sắp hết</span>
                            ) : (
                              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-full">Còn hàng</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveDropdownId(activeDropdownId === p.id ? null : p.id);
                              }}
                              className="text-gray-400 hover:text-rose-700 transition-colors p-1.5 rounded-lg hover:bg-rose-50"
                            >
                              <MoreVertical size={18} />
                            </button>

                            {/* Actions Dropdown Menu */}
                            {activeDropdownId === p.id && (
                              <div className="absolute right-12 top-4 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-30 py-1 text-left animate-in fade-in duration-100">
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-xs font-bold text-gray-700"
                                >
                                  <Edit size={14} className="text-gray-400" />
                                  Chỉnh sửa
                                </button>
                                <button
                                  onClick={() => handleOpenDeleteConfirm(p)}
                                  className="w-full px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-xs font-bold text-red-600"
                                >
                                  <Trash2 size={14} />
                                  Xóa
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* GIAO DIỆN MOBILE: THẺ CARD (Chỉ hiện trên điện thoại) */}
              <div className="md:hidden flex flex-col p-4 bg-gray-50/50 -mx-4 space-y-4 border-b border-gray-100">
                {currentProducts.map((p) => {
                  const isLowStock = (p.stock_quantity || 0) < 20;
                  return (
                    <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                      {/* Vạch cảnh báo hết hàng */}
                      {isLowStock && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-red-500"></div>}

                      <div className="flex gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                          <Package className="text-gray-300" size={24} />
                        </div>
                        <div className="flex-1 min-w-0 pr-16">
                          <h3 className="font-bold text-gray-800 text-sm mb-1 leading-tight">{p.name}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] bg-[#fee6ed] text-[#9D2753] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              {p.category_name || 'Khác'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono text-ellipsis overflow-hidden">
                              {p.barcode || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-50">
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Giá Bán</p>
                          <p className="text-sm font-black text-gray-800">{parseInt(p.sell_price).toLocaleString()}đ</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Tồn Kho</p>
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${isLowStock ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                            <span className="font-bold text-sm text-gray-700">{p.stock_quantity || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Thao tác (Edit/Delete) */}
                      <div className="absolute top-4 right-4 flex gap-1">
                        <button onClick={() => handleOpenEditModal(p)} className="p-2 text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleOpenDeleteConfirm(p)} className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="border-t border-gray-100 px-6 py-4 flex flex-col md:flex-row items-center justify-between text-sm">
                <span className="text-gray-500 mb-4 md:mb-0">
                  Hiển thị {indexOfFirstProduct + 1} đến {Math.min(indexOfLastProduct, filteredProducts.length)} trong tổng số {filteredProducts.length} sản phẩm
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-50"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold transition-all ${currentPage === i + 1
                        ? "bg-rose-700 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-100 font-medium"
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-50"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* --- ADD / EDIT PRODUCT MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#9D2753] to-[#ef6292] p-5 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Package size={20} />
                {modalMode === "add" ? "Thêm sản phẩm mới" : "Chỉnh sửa sản phẩm"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                    {formError}
                  </div>
                )}

                {/* Tên sản phẩm & Mã vạch */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tên sản phẩm *</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleFormChange}
                      placeholder="VD: Sữa Meiji số 0 800g"
                      className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Mã vạch (Barcode)</span>
                      <button
                        type="button"
                        onClick={() => setIsScanningBarcode(!isScanningBarcode)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[10px] ${isScanningBarcode ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        <Camera size={12} />
                        {isScanningBarcode ? 'Tắt quét' : 'Quét mã'}
                      </button>
                    </label>
                    <input
                      type="text"
                      name="barcode"
                      value={formData.barcode}
                      onChange={handleFormChange}
                      placeholder="Mã vạch số"
                      className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                    />

                    {/* KHU VỰC CAMERA SCANNER */}
                    {isScanningBarcode && (
                      <div className="mt-2 relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                        <div id="inventory-reader" className="absolute inset-0 w-full h-full object-cover [&>video]:object-cover [&>video]:w-full [&>video]:h-full border-none"></div>
                        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center">
                          <div className="relative w-3/4 h-3/4">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-pink-500 rounded-tl-xl"></div>
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-pink-500 rounded-tr-xl"></div>
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-pink-500 rounded-bl-xl"></div>
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-pink-500 rounded-br-xl"></div>
                            <div className="absolute top-1/2 w-full h-0.5 bg-pink-500 shadow-[0_0_10px_2px_rgba(236,72,153,0.8)] animate-pulse"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Giá nhập, Giá bán & Tồn kho */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Giá nhập (VNĐ) *</label>
                    <input
                      type="number"
                      name="cost_price"
                      required
                      min="0"
                      value={formData.cost_price}
                      onChange={handleFormChange}
                      placeholder="Giá nhập mua hàng"
                      className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Giá bán (VNĐ) *</label>
                    <input
                      type="number"
                      name="sell_price"
                      required
                      min="0"
                      value={formData.sell_price}
                      onChange={handleFormChange}
                      placeholder="Giá bán bán lẻ"
                      className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Số lượng tồn *</label>
                    <input
                      type="number"
                      name="stock_quantity"
                      required
                      min="0"
                      value={formData.stock_quantity}
                      onChange={handleFormChange}
                      placeholder="Tồn kho thực tế"
                      className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                    />
                  </div>
                </div>

                {/* Danh mục */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Danh mục sản phẩm</label>
                    <button 
                      type="button" 
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 transition-colors"
                    >
                      + Thêm danh mục mới
                    </button>
                  </div>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                  >
                    <option value="">Chọn danh mục...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-100 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-[#9D2753] to-[#ef6292] text-white font-bold rounded-xl text-sm hover:opacity-95 transition-opacity"
                >
                  Lưu sản phẩm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD CATEGORY MODAL --- */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-[#9D2753] to-[#ef6292] p-4 text-white flex justify-between items-center">
              <h2 className="text-base font-bold">Thêm danh mục mới</h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAddCategory}>
              <div className="p-5 space-y-4">
                {categoryFormError && (
                  <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl">
                    {categoryFormError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tên danh mục *</label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="VD: Đồ ăn vặt"
                    className="w-full px-4 py-2.5 bg-[#f4f5f7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#9D2753] to-[#ef6292] text-white font-bold rounded-xl text-sm hover:opacity-95"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE DIALOG --- */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận xóa sản phẩm</h3>
            <p className="text-sm text-gray-500 mb-6">
              Bạn có chắc chắn muốn xóa sản phẩm <strong className="text-gray-800">"{productToDelete?.name}"</strong>? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded-lg text-sm hover:bg-gray-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg text-sm hover:bg-red-750 transition-colors"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;