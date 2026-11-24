import axios from 'axios';
import { getToken, setToken, clearSession } from '../utils/auth';

// Mặc định gọi API cùng domain qua Nginx (/api). Khi dev, Vite proxy /api → backend.
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 20000,
});

axiosClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ---------- Tự động làm mới access token khi hết hạn ----------
let refreshPromise = null;

// Dùng chung một lần làm mới cho mọi request đang chờ (tránh gọi refresh nhiều lần song song)
export const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/users/refresh-token`, {}, { withCredentials: true })
      .then(({ data }) => {
        setToken(data.token);
        return data.token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const redirectToLogin = () => {
  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.assign('/login?expired=1');
  }
};

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const token = await refreshAccessToken();
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Lấy thông báo lỗi thân thiện từ response
export const errorMessage = (err, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.') => {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response?.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.';
  if (err?.code === 'ECONNABORTED') return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.';
  if (err?.request && !err?.response) return 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.';
  return fallback;
};

export default axiosClient;
