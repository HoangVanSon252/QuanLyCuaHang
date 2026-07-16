import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NavLink, useNavigate} from 'react-router-dom';
import { 
  faBell, 
  faUser, 
  faMagnifyingGlass, 
  faRightFromBracket, 
  faGear,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';
import axiosClient from '../services/axiosClient';

// Chuyển sang dùng Ngoặc Nhọn { } để có không gian viết logic
const UserDropdown = () => {
  // Bắt buộc phải khởi tạo useNavigate thì mới dùng hàm navigate() được
  const navigate = useNavigate(); 

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated'); // Tước thẻ ra vào
    localStorage.removeItem('token'); // Hủy thẻ token
    localStorage.removeItem('user');  // Xóa thông tin user
    navigate('/login'); // Đá ra ngoài cửa
  };

  // Lấy thông tin user từ localStorage
  const user = JSON.parse(localStorage.getItem('user')) || { fullName: 'Người dùng', role: 'admin' };

  return (
    <div className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in-down">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center bg-gray-50">
        <span className="font-bold text-gray-800 text-sm">{user.fullName || user.userName}</span>
        <span className="text-xs text-gray-500 capitalize">{user.role === 'admin' ? 'Quản lý' : 'Nhân viên'}</span>
      </div>
      <div className="flex flex-col py-1">
        <div className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer flex items-center gap-3 text-sm text-gray-700">
          <FontAwesomeIcon icon={faGear} className="text-gray-400" />
          <span>Cài đặt hệ thống</span>
        </div>
        <div className="px-4 py-2.5 hover:bg-red-50 cursor-pointer flex items-center gap-3 text-sm text-red-600 font-medium">
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span onClick={handleLogout}>Đăng xuất</span>
        </div>
      </div>
    </div>
  );
};
// 2. COMPONENT CHÍNH 
const Navbar = () => {
  // --- (State) ---
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDesktopUserOpen, setIsDesktopUserOpen] = useState(false);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  // ---(Ref) ---
  const notifRef = useRef(null);
  const desktopUserRef = useRef(null);
  const mobileUserRef = useRef(null);

  // ---(Effect) ---
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const res = await axiosClient.get('/dashboard/low-stock');
        setLowStock(res.data.data);
      } catch (error) {
        console.error("Lỗi lấy thông báo:", error);
      }
    };
    fetchLowStock();

    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (desktopUserRef.current && !desktopUserRef.current.contains(event.target)) {
        setIsDesktopUserOpen(false);
      }
      if (mobileUserRef.current && !mobileUserRef.current.contains(event.target)) {
        setIsMobileUserOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lấy thông tin user cho câu chào
  const user = JSON.parse(localStorage.getItem('user')) || { fullName: 'Người dùng' };
  const nameToUse = user.fullName || user.userName || 'Người dùng';
  const firstName = nameToUse.split(' ').pop(); // Lấy tên cuối

  return (
    <>
      {/* GIAO DIỆN MOBILE */}
      <div className="flex md:hidden items-center justify-between bg-white px-4 py-3 shadow-sm rounded-b-2xl mb-5 mx-[-16px] mt-[-16px]">
        <div className="flex items-center gap-4 text-[#9D2753]">
          <h1 className="font-bold text-lg tracking-wide">Lullaby Inventory</h1>
        </div>

        {/* Avatar Mobile */}
        <div className="relative" ref={mobileUserRef}>
          <div 
            onClick={() => setIsMobileUserOpen(!isMobileUserOpen)}
            className="w-9 h-9 rounded-full bg-gray-100 border-2 border-[#9D2753]/20 shadow-sm flex items-center justify-center cursor-pointer overflow-hidden"
          >
            <span className="font-bold text-[#9D2753] text-sm uppercase">{firstName.charAt(0)}</span>
          </div>
          {isMobileUserOpen && <UserDropdown />}
        </div>
      </div>

      {/* GIAO DIỆN DESKTOP */}
      <div className="hidden md:flex items-center justify-between mb-8 gap-4">
        <div className="flex flex-col gap-2">
          <span className="text-[#2D2F2F] font-bold text-3xl">Chào {firstName} Buổi Sáng! 👋</span>
          <span className="text-[#5A5C5C] text-sm">Hôm nay kho hàng của bé đang ổn định.</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-200 rounded-lg px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-[#9D2753]/30 focus-within:bg-white">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-500" />
            <input 
              type="text" 
              placeholder="Tìm kiếm kho hàng..." 
              className="bg-transparent placeholder:text-[#6B7280] focus:outline-none w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  navigate('/inventory?search=' + encodeURIComponent(searchQuery.trim()));
                }
              }}
            />
          </div>
          
          {/* Nút Chuông */}
          <div className="relative" ref={notifRef}>
            <div 
              onClick={() => { 
                setIsNotifOpen(!isNotifOpen); 
                setIsDesktopUserOpen(false); 
              }} 
              className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm cursor-pointer transition-colors ${isNotifOpen ? 'bg-[#fee6ed] text-[#9D2753]' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              <FontAwesomeIcon icon={faBell} className="text-lg" />
              {lowStock.length > 0 && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </div>
            
            {/* Bảng thông báo */}
            {isNotifOpen && (
              <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-0 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-bold text-gray-800 text-sm">Thông báo</h3>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{lowStock.length} mới</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {lowStock.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Chưa có thông báo mới.</div>
                  ) : (
                    lowStock.map(item => (
                      <div key={item.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer flex gap-3 items-start">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                          <FontAwesomeIcon icon={faCircleExclamation} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">Sắp hết hàng: {item.name}</p>
                          <p className="text-xs text-gray-500 mt-1">Chỉ còn <strong className="text-red-500">{item.stock_quantity}</strong> sản phẩm trong kho.</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {lowStock.length > 0 && (
                  <div className="p-3 text-center border-t border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition">
                    <span className="text-[#9D2753] text-sm font-bold" onClick={() => navigate('/inventory')}>Đến kho hàng</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Avatar Desktop */}
          <div className="relative" ref={desktopUserRef}>
            <div 
              onClick={() => { 
                setIsDesktopUserOpen(!isDesktopUserOpen); 
                setIsNotifOpen(false); 
              }} 
              className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm cursor-pointer transition-colors border border-gray-100 ${isDesktopUserOpen ? 'bg-[#fee6ed] text-[#9D2753]' : 'bg-gray-100 text-[#9D2753] hover:bg-gray-200'}`}
            >
              <span className="font-bold text-sm uppercase">{firstName.charAt(0)}</span>
            </div>
            {isDesktopUserOpen && <UserDropdown />}
          </div>

        </div>
      </div>
    </>
  );
};
export default Navbar;