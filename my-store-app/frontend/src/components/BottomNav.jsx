import React from 'react';
import { NavLink } from 'react-router-dom';
import { getUser, ROLES } from '../utils/auth';

const { SUPER_ADMIN, STORE_ADMIN } = ROLES;

// Thanh điều hướng dưới cùng trên điện thoại (tối đa 5 mục theo vai trò)
const ITEMS = [
  { to: '/admin/stores', icon: '🏪', label: 'CỬA HÀNG', roles: [SUPER_ADMIN] },
  { to: '/', icon: '📊', label: 'TỔNG QUAN', roles: [STORE_ADMIN] },
  { to: '/inventory', icon: '📦', label: 'KHO HÀNG', roles: [STORE_ADMIN] },
  { to: '/pos', icon: '🛒', label: 'BÁN NHANH', roles: [STORE_ADMIN] },
  { to: '/orders', icon: '🧾', label: 'HOÁ ĐƠN', roles: [STORE_ADMIN] },
  { to: '/report', icon: '📈', label: 'BÁO CÁO', roles: [STORE_ADMIN] },
  { to: '/account', icon: '🔑', label: 'TÀI KHOẢN', roles: [SUPER_ADMIN] },
];

const BottomNav = () => {
  const user = getUser() || {};
  const items = ITEMS.filter((i) => i.roles.includes(user.role)).slice(0, 5);

  return (
    <nav
      aria-label="Điều hướng"
      className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_25px_rgba(0,0,0,0.08)] rounded-t-3xl flex justify-around items-end px-4 pb-3 pt-2 h-20 z-50"
    >
      {items.map((item) => (
        <NavLink
          key={`${item.to}-${item.label}`}
          to={item.to}
          end={item.to === '/'}
          className="relative flex flex-col items-center justify-end w-14 h-full"
        >
          {({ isActive }) => (
            <>
              <div
                className={`absolute bottom-4 flex items-center justify-center transition-all duration-300 ease-out ${
                  isActive
                    ? 'w-12 h-12 bg-brand-600 text-white -translate-y-5 rounded-full border-4 border-white shadow-[0_4px_10px_rgba(29,116,224,0.45)]'
                    : 'w-8 h-8 bg-transparent text-gray-400 translate-y-0'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
              </div>
              <span
                className={`text-[10px] text-nowrap font-bold transition-colors duration-300 ${
                  isActive ? 'text-brand-600' : 'text-gray-400'
                }`}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
