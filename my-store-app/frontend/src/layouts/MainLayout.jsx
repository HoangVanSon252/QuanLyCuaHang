import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';

const MainLayout = () => {
  return (
    // 1. KHUNG CHÍNH: Mặc định dọc (cho Mobile), màn hình to (md) thì chuyển sang ngang (cho Desktop)
    <div className="flex flex-col md:flex-row h-screen bg-[#F5F6F8] font-sans overflow-hidden relative">

      {/* 2. SIDEBAR (Dành cho Desktop) */}
      {/* Mặc định là 'hidden' (ẩn), lên màn hình to 'md' thì thành 'block' (hiện) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* 3. KHU VỰC NỘI DUNG CHÍNH (Nơi chứa <Outlet />) */}
      {/* Thêm min-w-0 để fix triệt để lỗi Flexbox bị tràn Layout khi co dãn màn hình */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto pb-24 md:pb-0 ">

        {/* Nút Float (+) trên Mobile. Lên Desktop thì ẩn đi (md:hidden)
        <button className="absolute md:bottom-10 bottom-28  md:right-10 right-5  w-14 h-14 bg-[#e83d73] text-white rounded-full flex items-center justify-center text-3xl shadow-lg z-40">
          +
        </button> */}
        <div className="p-4 md:p-8">
          <Outlet />
        </div>

      </main>
      <div className="block md:hidden">
        <BottomNav />
      </div>

    </div>
  );
};

export default MainLayout;