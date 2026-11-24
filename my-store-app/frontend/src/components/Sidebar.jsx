import React from 'react';
import BrandLogo from './BrandLogo';
import { NavLink, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { getUser, ROLES } from '../utils/auth';

const { SUPER_ADMIN, STORE_ADMIN } = ROLES;

// Menu theo vai trò: mỗi mục chỉ hiện với vai trò được phép
const NAV_ITEMS = [
  { to: '/admin/stores', icon: '🏪', label: 'Quản lý cửa hàng', roles: [SUPER_ADMIN] },
  { to: '/account', icon: '🔑', label: 'Đổi mật khẩu', roles: [SUPER_ADMIN] },
  { to: '/', icon: '📊', label: 'Bảng điều khiển', roles: [STORE_ADMIN] },
  { to: '/pos', icon: '🛒', label: 'Bán nhanh', roles: [STORE_ADMIN] },
  { to: '/orders', icon: '🧾', label: 'Hoá đơn', roles: [STORE_ADMIN] },
  { to: '/inventory', icon: '📦', label: 'Kho hàng', roles: [STORE_ADMIN] },
  { to: '/imports', icon: '🚚', label: 'Nhập hàng', roles: [STORE_ADMIN] },
  { to: '/report', icon: '📈', label: 'Phân tích', roles: [STORE_ADMIN] },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm transition-all duration-200 ${
    isActive ? 'bg-white text-brand-700 font-bold' : 'text-gray-500 hover:bg-gray-200'
  }`;

const Sidebar = () => {
  const navigate = useNavigate();
  const user = getUser() || {};

  const handleLogout = async () => {
    await authApi.logout(); // thu hồi refresh token trên server
    navigate('/login', { replace: true });
  };

  return (
    <aside className="w-[260px] h-screen bg-[#f8f9fa] flex flex-col p-5 border-r border-gray-100 drop-shadow-xl">
      <div className="mb-8 pl-1">
        <BrandLogo size="md" />
        {user.storeName && (
          <div className="mt-4 px-3 py-2.5 rounded-xl bg-brand-50 border border-brand-100">
            <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cửa hàng</div>
            <div className="text-sm font-bold text-brand-950 truncate" title={user.storeName}>{user.storeName}</div>
          </div>
        )}
      </div>

      <nav className="flex flex-col" aria-label="Điều hướng chính">
        {NAV_ITEMS.filter((item) => item.roles.includes(user.role)).map((item) => (
          <NavLink key={`${item.to}-${item.label}`} to={item.to} end={item.to === '/'} className={linkClass}>
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center bg-brand-500 hover:bg-brand-600 text-white py-3.5 rounded-full text-sm font-medium transition-colors shadow-sm"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
