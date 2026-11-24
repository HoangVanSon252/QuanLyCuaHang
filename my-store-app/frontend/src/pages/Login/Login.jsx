import React, { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../../services/api';
import { errorMessage } from '../../services/axiosClient';
import { getUser, homePathFor, isAuthenticated, setSession } from '../../utils/auth';
import { BRAND } from '../../config/brand';
import BrandLogo from '../../components/BrandLogo';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const [errorMsg, setErrorMsg] = useState(
    searchParams.get('expired') ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : ''
  );

  const navigate = useNavigate();

  // Chỉ quay lại đường dẫn nội bộ (chống chuyển hướng sang trang lừa đảo)
  const safeNext = (user) => {
    const next = searchParams.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//') && next !== '/login') return next;
    return homePathFor(user);
  };

  // Đã đăng nhập rồi thì không cần ở trang đăng nhập (giữ nguyên đích ?next nếu có)
  if (isAuthenticated()) return <Navigate to={safeNext(getUser())} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const data = await authApi.login(username.trim(), password);
      setSession(data.token, data.user);
      navigate(safeNext(data.user), { replace: true });
    } catch (error) {
      setErrorMsg(errorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại!'));
      setPassword('');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] flex flex-col items-center justify-center p-4 font-sans">
      <div className=" flex md:flex-row w-full max-w-[1000px] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.3)] overflow-hidden min-h-[600px]">
        <div className="hidden md:flex w-1/2 relative p-12 flex-col justify-between bg-brand-50">
          <div className="relative z-10">
            <h1 className="sr-only">{BRAND.name}</h1>
            <BrandLogo size="lg" />
            <p className="mt-6 text-xl text-gray-700 leading-relaxed max-w-sm">{BRAND.slogan}</p>
            <ul className="mt-8 space-y-3 text-sm text-gray-700">
              <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-brand-500" />Mỗi cửa hàng một tài khoản riêng, tự quản lý mặt hàng của mình</li>
              <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-growth-500" />Bán hàng, kho, hoá đơn, báo cáo theo thời gian thực</li>
              <li className="flex items-center gap-3"><span className="w-2 h-2 rounded-full bg-accent-500" />Dữ liệu từng cửa hàng tách biệt, bảo mật</li>
            </ul>
          </div>
          <div className="relative z-10 flex items-center space-x-3 text-sm text-gray-700">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-700 shadow-sm">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.642 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.358-.166-2.001A11.954 11.954 0 0110 1.944zM10 14a4 4 0 100-8 4 4 0 000 8z" clipRule="evenodd" /></svg>
            </div>
            <span>An tâm tuyệt đối trong từng khâu quản lý</span>
          </div>
        </div>

        {/* CỘT PHẢI (Form) */}
        <div className="w-full md:w-1/2 p-10 lg:p-14 flex flex-col justify-center">

          <div className="mb-8">
            <BrandLogo size="sm" className="md:hidden mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Chào mừng trở lại</h2>
            <p className="text-sm text-gray-500">Đăng nhập vào {BRAND.name} để quản lý cửa hàng của bạn</p>
          </div>

          {/* Móc hàm handleLogin vào form */}
          <form onSubmit={handleLogin} className="flex flex-col space-y-5">

            {/* HIỂN THỊ LỖI NẾU CÓ */}
            {errorMsg && (
              <div role="alert" className="p-3 text-sm text-red-600 bg-red-100 rounded-lg border border-red-200">
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
                  name="username"
                  autoComplete="username"
                  autoFocus
                  maxLength={50}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Tên tài khoản"
                  className="w-full pl-10 pr-4 py-3 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/30 transition-all" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[11px] font-bold text-gray-500 tracking-wider uppercase">
                  Mật khẩu
                </label>
                {/* <a href="#" className="text-[11px] text-brand-700 font-bold hover:underline">
                    Quên mật khẩu?
                </a> */}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-gray-400">🔒</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full pl-10 pr-4 py-3 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/30 transition-all"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              {/* <input type="checkbox" id="remember" className="w-4 h-4 text-brand-700 border-gray-300 rounded focus:ring-brand-700"/> */}
              {/* <label htmlFor="remember" className="text-sm text-gray-600">Ghi nhớ đăng nhập</label> */}
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3.5 mt-2 rounded-full text-white font-medium bg-gradient-to-r from-brand-700 to-brand-500 hover:opacity-90 transition-opacity flex items-center justify-center space-x-2 shadow-md disabled:opacity-60 disabled:cursor-wait">
              <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              {!submitting && <span>→</span>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-6">
              Chưa có tài khoản hoặc quên mật khẩu? <span className="text-brand-700 font-bold">Liên hệ chủ cửa hàng / quản trị viên</span>
            </p>
            <div className="flex items-center justify-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="px-4 text-[10px] tracking-widest text-gray-400 uppercase">{BRAND.name}</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 text-[11px] text-gray-400 text-center uppercase tracking-wider">
        © {BRAND.year} {BRAND.name} • {BRAND.slogan}
      </div>
    </div>
  );
};

export default Login;