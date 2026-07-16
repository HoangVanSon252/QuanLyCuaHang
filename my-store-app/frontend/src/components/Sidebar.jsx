import React from 'react';
import logo from '../assets/icon/iconLogo.svg';
import { NavLink, useNavigate} from 'react-router-dom';


const Sidebar = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Hàm xử lý khi bấm nút Đăng xuất
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated'); // Tước thẻ ra vào
    localStorage.removeItem('token'); // Hủy thẻ token
    localStorage.removeItem('user');  // Xóa thông tin user
    navigate('/login'); // Đá ra ngoài cửa
  };
  return (
    <aside className="w-[260px] h-screen bg-[#f8f9fa] flex flex-col p-5 border-r border-gray-100 drop-shadow-xl">
        {/* Header sidebar */}
        <div className='flex items-center gap-3 mb-10 pl-2'>
            <div className='w-10 h-10 bg-[#ef6292] rounded-xl flex items-center justify-center font-bold, text-xl shadow-sm'>
                <img src={logo} alt="" />
            </div>
            <div className='flex flex-col'>
                <span className='font-serif font-bold text-gray-800 text-lg leading-tight'>Phương Thúy</span>
                <span className='text-[10px] text-gray-500 uppercase tracking-wider font-medium'>Quản lý kho hàng</span>
            </div>
        </div>
        {/* Menu điều hướng sidebar */}
        <nav className='flex flex-col'>
            {user?.role === 'super_admin' && (
                <NavLink to='/admin/users'
                    className={({isActive}) =>{
                        return `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm transition-all duration-200  
                                ${
                                isActive ? "bg-white text-[#9D2753] font-bold" : "text-gray-500 hover:bg-gray-200"
                                }
                                `
                    }}> 
                    <span className='text-lg'>👥</span> 
                    Quản lý tài khoản
                </NavLink>
            )}
            <NavLink to='/'
                className={({isActive}) =>{
                    return `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm transition-all duration-200  
                            ${
                            isActive ? "bg-white text-[#9D2753] font-bold" : "text-gray-500 hover:bg-gray-200"
                            }
                            `
                }}> 
                <span className='text-lg'>📊</span> 
                Bảng điều khiển
            </NavLink>
            <NavLink to = '/inventory'
                className={({isActive}) =>{
                    return `flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm transition-all duration-200
                    ${
                        isActive ? 'bg-white text-[#9D2753] font-bold' : 'text-gray-500 hover:bg-gray-200'
                    }
                    `
                }}
            >
                <span className='text-lg'>📦</span>
                Kho hàng 
            </NavLink>
            <NavLink to ='/pos'
                className={({isActive}) =>{
                    return `
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm transition-all duration-200
                    ${
                        isActive ? 'bg-white text-[#9D2753] font-bold' : 'text-gray-500 hover:bg-gray-200'
                    }
                    `
                }}
            >
                <span>🛒</span>
                Bán Nhanh   
            </NavLink>
            <NavLink to = '/report'
                className={({isActive})=>{
                    return`
                    flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm transition-all duration-200
                    ${
                        isActive ? 'bg-white text-[#9D2753] font-bold' : 'text-gray-500 hover:bg-gray-200'
                    }
                    `
                }}
            >
                <span>📈</span>
                Phân tích
            </NavLink>
        </nav>
        {/*btn Thêm sản phâm */}
        <div className='mt-auto pt-4'>
            <button 
            onClick={handleLogout}
            className='w-full flex items-center justify-center bg-[#ef6292] hover:bg-[#e05282] text-white py-3.5 rounded-full text-sm font-medium transition-colors shadow-sm"'>
                Đăng xuất 
            </button>
        </div>
    </aside>
  );
};

export default Sidebar;