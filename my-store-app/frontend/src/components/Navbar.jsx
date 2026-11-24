import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import {
  faBell,
  faMagnifyingGlass,
  faRightFromBracket,
  faKey,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';
import axiosClient from '../services/axiosClient';
import { authApi } from '../services/api';
import { getUser, ROLE_LABELS, ROLES } from '../utils/auth';
import { greeting } from '../utils/format';
import BrandLogo from './BrandLogo';

const UserDropdown = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authApi.logout(); // thu hồi phiên trên server
    navigate('/login', { replace: true });
  };

  return (
    <div className="absolute top-12 right-0 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in-down">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-col items-center bg-gray-50">
        <span className="font-bold text-gray-800 text-sm">{user.fullName || user.userName}</span>
        <span className="text-xs text-gray-500">{ROLE_LABELS[user.role] || user.role}</span>
        {user.storeName && <span className="text-[11px] text-brand-700 mt-0.5">{user.storeName}</span>}
      </div>
      <div className="flex flex-col py-1">
        <button
          type="button"
          onClick={() => navigate('/account')}
          className="px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700 text-left"
        >
          <FontAwesomeIcon icon={faKey} className="text-gray-400" />
          <span>Đổi mật khẩu</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="px-4 py-2.5 hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 font-medium text-left"
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

const Navbar = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isDesktopUserOpen, setIsDesktopUserOpen] = useState(false);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);
  const [lowStock, setLowStock] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const notifRef = useRef(null);
  const desktopUserRef = useRef(null);
  const mobileUserRef = useRef(null);

  const user = getUser() || { fullName: 'Người dùng', role: '' };
  const isStoreUser = user.role === ROLES.STORE_ADMIN;

  useEffect(() => {
    let cancelled = false;
    if (isStoreUser) {
      axiosClient
        .get('/dashboard/low-stock')
        .then((res) => { if (!cancelled) setLowStock(res.data.data || []); })
        .catch(() => { /* thông báo không quan trọng, bỏ qua lỗi */ });
    }

    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setIsNotifOpen(false);
      if (desktopUserRef.current && !desktopUserRef.current.contains(event.target)) setIsDesktopUserOpen(false);
      if (mobileUserRef.current && !mobileUserRef.current.contains(event.target)) setIsMobileUserOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isStoreUser]);

  // Tên gọi: tài khoản cửa hàng lấy tên (chữ cuối của họ tên người Việt); admin luôn là "Quản trị viên"
  const isAdmin = user.role === ROLES.SUPER_ADMIN;
  const nameToUse = user.fullName || user.userName || 'Người dùng';
  const firstName = isAdmin ? 'Quản trị viên' : nameToUse.split(' ').pop();
  const subtitle = user.storeName
    ? `${user.storeName}${lowStock.length ? ` • ${lowStock.length} sản phẩm sắp hết hàng` : ' • Kho hàng đang ổn định'}`
    : 'Quản trị hệ thống cửa hàng';

  return (
    <>
      {/* GIAO DIỆN MOBILE */}
      <div className="flex md:hidden items-center justify-between bg-white px-4 py-3 shadow-sm rounded-b-2xl mb-5 mx-[-16px] mt-[-16px]">
        <div className="flex flex-col min-w-0">
          <h1 className="sr-only">UniPOS</h1>
          <BrandLogo size="sm" />
          {user.storeName && <span className="text-[11px] text-gray-500 mt-1 truncate">{user.storeName}</span>}
        </div>

        <div className="relative" ref={mobileUserRef}>
          <button
            type="button"
            aria-label="Tài khoản"
            onClick={() => setIsMobileUserOpen(!isMobileUserOpen)}
            className="w-9 h-9 rounded-full bg-gray-100 border-2 border-brand-700/20 shadow-sm flex items-center justify-center cursor-pointer overflow-hidden"
          >
            <span className="font-bold text-brand-700 text-sm uppercase">{firstName.charAt(0)}</span>
          </button>
          {isMobileUserOpen && <UserDropdown user={user} />}
        </div>
      </div>

      {/* GIAO DIỆN DESKTOP */}
      <div className="hidden md:flex items-center justify-between mb-8 gap-4">
        <div className="flex flex-col gap-2 min-w-0">
          <span className="text-[#2D2F2F] font-bold text-3xl truncate">{greeting()}, {firstName}! 👋</span>
          <span className="text-[#5A5C5C] text-sm truncate">{subtitle}</span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {isStoreUser && (
            <div className="flex items-center gap-2 bg-gray-200 rounded-lg px-3 py-2 transition-all focus-within:ring-2 focus-within:ring-brand-700/30 focus-within:bg-white">
              <FontAwesomeIcon icon={faMagnifyingGlass} className="text-gray-500" />
              <input
                type="text"
                aria-label="Tìm kiếm kho hàng"
                placeholder="Tìm kiếm kho hàng..."
                className="bg-transparent placeholder:text-[#6B7280] focus:outline-none w-56 lg:w-64"
                value={searchQuery}
                maxLength={100}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate('/inventory?search=' + encodeURIComponent(searchQuery.trim()));
                  }
                }}
              />
            </div>
          )}

          {isStoreUser && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                aria-label="Thông báo"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  setIsDesktopUserOpen(false);
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm cursor-pointer transition-colors ${isNotifOpen ? 'bg-brand-50 text-brand-700' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <FontAwesomeIcon icon={faBell} className="text-lg" />
                {lowStock.length > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

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
                        <div key={item.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faCircleExclamation} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">
                              {item.stock_quantity === 0 ? 'Hết hàng' : 'Sắp hết hàng'}: {item.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">Còn <strong className="text-red-500">{item.stock_quantity}</strong> sản phẩm trong kho.</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {lowStock.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate('/inventory')}
                      className="w-full p-3 text-center border-t border-gray-100 bg-white hover:bg-gray-50 transition text-brand-700 text-sm font-bold"
                    >
                      Đến kho hàng
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="relative" ref={desktopUserRef}>
            <button
              type="button"
              aria-label="Tài khoản"
              onClick={() => {
                setIsDesktopUserOpen(!isDesktopUserOpen);
                setIsNotifOpen(false);
              }}
              className={`w-10 h-10 flex items-center justify-center rounded-full shadow-sm cursor-pointer transition-colors border border-gray-100 ${isDesktopUserOpen ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-brand-700 hover:bg-gray-200'}`}
            >
              <span className="font-bold text-sm uppercase">{firstName.charAt(0)}</span>
            </button>
            {isDesktopUserOpen && <UserDropdown user={user} />}
          </div>
        </div>
      </div>
    </>
  );
};
export default Navbar;
