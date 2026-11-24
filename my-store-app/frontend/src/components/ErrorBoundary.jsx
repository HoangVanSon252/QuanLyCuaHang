import React from 'react';
import { useRouteError } from 'react-router-dom';

const Fallback = ({ isChunkError }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
    <div className="text-5xl mb-4">⚠️</div>
    <h1 className="text-xl font-bold text-gray-800 mb-2">
      {isChunkError ? 'Ứng dụng vừa được cập nhật' : 'Đã xảy ra lỗi không mong muốn'}
    </h1>
    <p className="text-sm text-gray-500 mb-6 max-w-md">
      {isChunkError
        ? 'Vui lòng tải lại trang để dùng phiên bản mới nhất.'
        : 'Dữ liệu của bạn vẫn an toàn. Hãy tải lại trang; nếu lỗi lặp lại, vui lòng liên hệ quản trị viên.'}
    </p>
    <button
      onClick={() => window.location.reload()}
      className="px-6 py-2.5 rounded-full text-white font-medium bg-gradient-to-r from-brand-700 to-brand-500 shadow-md"
    >
      Tải lại trang
    </button>
  </div>
);

// Lỗi tải file JS sau khi deploy phiên bản mới (tên file đã đổi hash)
const isChunkLoadError = (error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(
    String(error?.message || error)
  );

// Bắt lỗi render của toàn ứng dụng → không bị màn hình trắng
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) return <Fallback isChunkError={isChunkLoadError(this.state.error)} />;
    return this.props.children;
  }
}

// Lỗi phát sinh trong router (ví dụ trang lazy không tải được)
const RouteError = () => {
  const error = useRouteError();
  return <Fallback isChunkError={isChunkLoadError(error)} />;
};

ErrorBoundary.RouteError = RouteError;

export default ErrorBoundary;
