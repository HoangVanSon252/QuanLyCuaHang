import { Link } from 'react-router-dom';
import { getUser, homePathFor } from '../../utils/auth';

const NotFound = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
    <div className="text-6xl font-black text-brand-500 mb-2">404</div>
    <h1 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy trang</h1>
    <p className="text-sm text-gray-500 mb-6">Đường dẫn không tồn tại hoặc bạn không có quyền truy cập.</p>
    <Link
      to={homePathFor(getUser())}
      className="px-6 py-2.5 rounded-full text-white font-medium bg-gradient-to-r from-brand-700 to-brand-500 shadow-md"
    >
      Về trang chủ
    </Link>
  </div>
);

export default NotFound;
