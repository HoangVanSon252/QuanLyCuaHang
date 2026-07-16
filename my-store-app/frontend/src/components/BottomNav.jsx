import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
  return (
    // Mình chốt cứng chiều cao thanh này là h-20 để có không gian cho icon bay lên
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_25px_rgba(0,0,0,0.08)] rounded-t-3xl flex justify-between items-end px-6 pb-3 pt-2 h-20 z-50">
      
      {/* 1. NÚT TỔNG QUAN */}
      {/* relative h-full: Để làm khung tham chiếu cho icon bay nhảy bên trong */}
      <NavLink to="/" className="relative flex flex-col items-center justify-end w-14 h-full">
        {({ isActive }) => (
          <>
            {/* CÁI ICON BÊN TRÊN */}
            <div className={`absolute bottom-4 flex items-center justify-center transition-all duration-300 ease-out
              ${isActive 
                ? "w-12 h-12 bg-[#e83d73] text-white -translate-y-5 rounded-full border-4 border-white shadow-[0_4px_10px_rgba(232,61,115,0.7)]" 
                : "w-8 h-8 bg-transparent text-gray-400 translate-y-0"
              }`}>
              <span className="text-xl">📊</span>
            </div>
            
            {/* CÁI CHỮ BÊN DƯỚI (Đứng im) */}
            <span className={`text-[10px] text-nowrap font-bold transition-colors duration-300 ${isActive ? "text-[#e83d73]" : "text-gray-400"}`}>
              TỔNG QUAN
            </span>
          </>
        )}
      </NavLink>

      {/* 2. NÚT KHO HÀNG */}
      <NavLink to="/inventory" className="relative flex flex-col items-center justify-end w-14 h-full">
        {({ isActive }) => (
          <>
            <div className={`absolute bottom-4 flex items-center justify-center transition-all duration-300 ease-out
              ${isActive 
                ? "w-12 h-12 bg-[#e83d73] text-white -translate-y-5 rounded-full border-4 border-white shadow-[0_4px_10px_rgba(232,61,115,0.7)]" 
                : "w-8 h-8 bg-transparent text-gray-400 translate-y-0"
              }`}>
              <span className="text-xl">📦</span>
            </div>
            <span className={`text-[10px] text-nowrap font-bold transition-colors duration-300 ${isActive ? "text-[#e83d73]" : "text-gray-400"}`}>
              KHO HÀNG
            </span>
          </>
        )}
      </NavLink>

      {/* 3. NÚT QUÉT MÃ (Trung tâm - Luôn luôn nổi và to nhất) */}
      {/* <div className="relative flex flex-col items-center justify-end w-16 h-full">
        <NavLink to="/scan" className="flex flex-col items-center">
          <div className="absolute bottom-6 w-14 h-14 bg-[#e83d73] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-[#F5F6F8] hover:scale-105 transition-transform">
            <span className="text-2xl">📸</span>
          </div>
          <span className="text-[10px] font-bold text-gray-400 mt-auto">QUÉT MÃ</span>
        </NavLink>
      </div> */}
        <NavLink to="/pos" className="relative flex flex-col items-center justify-end w-14 h-full">
        {({ isActive }) => (
          <>
            <div className={`absolute bottom-4 flex items-center justify-center transition-all duration-300 ease-out
              ${isActive 
                ? "w-12 h-12 bg-[#e83d73] text-white -translate-y-5 rounded-full border-4 border-white shadow-[0_4px_10px_rgba(232,61,115,0.7)]" 
                : "w-8 h-8 bg-transparent text-gray-400 translate-y-0"
              }`}>
              <span className="text-xl">🛒</span>
            </div>
            <span className={`text-[10px] text-nowrap font-bold transition-colors duration-300 ${isActive ? "text-[#e83d73]" : "text-gray-400"}`}>
              Bán nhanh
            </span>
          </>
        )}
      </NavLink>
      {/* 4. NÚT BÁO CÁO */}
      <NavLink to="/report" className="relative flex flex-col items-center justify-end w-14 h-full">
        {({ isActive }) => (
          <>
            <div className={`absolute bottom-4 flex items-center justify-center transition-all duration-300 ease-out
              ${isActive 
                ? "w-12 h-12 bg-[#e83d73] text-white -translate-y-5 rounded-full border-4 border-white shadow-[0px_4px_10px_rgba(232,61,115,0.7)]" 
                : "w-8 h-8 bg-transparent text-gray-400 translate-y-0"
              }`}>
              <span className="text-xl">📈</span>
            </div>
            <span className={`text-[10px] text-nowrap font-bold transition-colors duration-300 ${isActive ? "text-[#e83d73]" : "text-gray-400"}`}>
              BÁO CÁO
            </span>
          </>
        )}
      </NavLink>

    </nav>
  );
};

export default BottomNav;