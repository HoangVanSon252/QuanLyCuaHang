import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  // bộ nhớ để lưu chữ người dùng gõ
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Chặn việc tự động submit form của HTML
    if (!username || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    try {
      // Dùng fetch để gọi API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userName: username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('isAuthenticated', 'true');

        // Lưu thông tin Token và User vào Local Storage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Điều hướng sang trang chủ (Dashboard)
        navigate('/');
      } else {
        setErrorMsg(data.message || 'Sai tài khoản hoặc mật khẩu. Vui lòng thử lại!');
      }
    } catch (error) {
      setErrorMsg('Lỗi kết nối đến server. Vui lòng kiểm tra backend!');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col items-center justify-center p-4 font-sans">
      <div className=" flex md:flex-row w-full max-w-[1000px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden min-h-[600px]">
        <div className="hidden md:flex w-1/2 relative p-12 flex-col justify-between bg-rose-50">
          <div className="relative z-10">
            <h1 className="text-4xl font-serif text-[#9D2753] font-bold mb-4">Phương Thúy</h1>
            <p className="text-xl text-gray-700 font-serif leading-relaxed max-w-sm">
              Quản lý kho
            </p>
          </div>
          <div className="relative z-10 flex items-center space-x-3 text-sm text-gray-700">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#9D2753] shadow-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.642 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.358-.166-2.001A11.954 11.954 0 0110 1.944zM10 14a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" /></svg>
            </div>
            <span>An tâm tuyệt đối trong từng khâu quản lý</span>
          </div>
        </div>

        {/* CỘT PHẢI (Form) */}
        <div className="w-full md:w-1/2 p-10 lg:p-14 flex flex-col justify-center">

          <div className="mb-8">
            <h2 className="text-3xl font-bold font-serif text-gray-800 mb-2">Chào mừng trở lại</h2>
            <p className="text-sm text-gray-500">Đăng nhập vào hệ thống quản lý Phương Thúy</p>
          </div>

          {/* Móc hàm handleLogin vào form */}
          <form onSubmit={handleLogin} className="flex flex-col space-y-5">

            {/* HIỂN THỊ LỖI NẾU CÓ */}
            {errorMsg && (
              <div className="p-3 text-sm text-red-600 bg-red-100 rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-gray-500 tracking-wider mb-2 uppercase">
                Tên đăng nhập
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-400">👤</span>
                <input
                  type="text"
                  value={username} // Móc biến vào input
                  onChange={(e) => setUsername(e.target.value)} // Cập nhật biến khi gõ
                  placeholder="Email hoặc tên tài khoản"
                  className="w-full pl-10 pr-4 py-3 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                  Mật khẩu
                </label>
                {/* <a href="#" className="text-[11px] text-[#9D2753] font-bold hover:underline">
                    Quên mật khẩu?
                </a> */}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-400">🔒</span>
                <input
                  type="password"
                  value={password} // Móc biến vào input
                  onChange={(e) => setPassword(e.target.value)} // Cập nhật biến khi gõ
                  placeholder="password"
                  className="w-full pl-10 pr-4 py-3 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              {/* <input type="checkbox" id="remember" className="w-4 h-4 text-[#9D2753] border-gray-300 rounded focus:ring-[#9D2753]"/> */}
              {/* <label htmlFor="remember" className="text-sm text-gray-600">Ghi nhớ đăng nhập</label> */}
            </div>

            <button type="submit" className="w-full py-3.5 mt-2 rounded-full text-white font-medium bg-gradient-to-r from-[#9D2753] to-[#ef6292] hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 shadow-md">
              <span>Đăng nhập</span>
              <span>→</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-6">
              Chưa có tài khoản? <a href="#" className="text-[#9D2753] font-bold hover:underline">Liên hệ quản trị viên</a>
            </p>
            <div className="flex items-center justify-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="px-4 text-[10px] tracking-widest text-gray-400 uppercase">Phương Thúy System</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 text-[11px] text-gray-400 text-center uppercase tracking-wider">
        © 2026 Phương Thúy • PHIÊN BẢN 2.0
      </div>
    </div>
  );
};

export default Login;