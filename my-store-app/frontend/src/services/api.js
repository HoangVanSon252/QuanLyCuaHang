import axios from 'axios';
import axiosClient, { API_BASE_URL } from './axiosClient';
import { clearSession } from '../utils/auth';

export const productApi = {
  getProducts: async () => (await axiosClient.get('/products')).data,
  getProductById: async (id) => (await axiosClient.get(`/products/${id}`)).data,
  createProduct: async (productData) => (await axiosClient.post('/products', productData)).data,
  updateProduct: async (id, productData) => (await axiosClient.put(`/products/${id}`, productData)).data,
  deleteProduct: async (id) => (await axiosClient.delete(`/products/${id}`)).data,
  getCategories: async () => (await axiosClient.get('/products/categories')).data,
  createCategory: async (categoryData) => (await axiosClient.post('/products/categories', categoryData)).data,
};

export const authApi = {
  // Đăng nhập không đi qua interceptor làm mới token
  login: async (userName, password) =>
    (await axios.post(`${API_BASE_URL}/users/login`, { userName, password }, { withCredentials: true })).data,
  // Đăng xuất: thu hồi refresh token trên server rồi xoá phiên cục bộ
  logout: async () => {
    try {
      await axios.post(`${API_BASE_URL}/users/logout`, {}, { withCredentials: true, timeout: 5000 });
    } catch {
      /* vẫn đăng xuất cục bộ dù server lỗi */
    } finally {
      clearSession();
    }
  },
  me: async () => (await axiosClient.get('/users/me')).data,
  changePassword: async (currentPassword, newPassword) =>
    (await axiosClient.post('/users/change-password', { currentPassword, newPassword })).data,
};

// Quản trị hệ thống (chỉ admin): cửa hàng + tài khoản duy nhất của mỗi cửa hàng
export const adminApi = {
  listStores: async (params) => (await axiosClient.get('/admin/stores', { params })).data,
  createStore: async (data) => (await axiosClient.post('/admin/stores', data)).data,
  updateStore: async (id, data) => (await axiosClient.put(`/admin/stores/${id}`, data)).data,
  setStoreStatus: async (id, is_active) => (await axiosClient.patch(`/admin/stores/${id}/status`, { is_active })).data,
  resetStorePassword: async (id, newPassword) =>
    (await axiosClient.post(`/admin/stores/${id}/reset-password`, { newPassword })).data,
  getAuditLogs: async (params) => (await axiosClient.get('/admin/audit-logs', { params })).data,
};

export const orderApi = {
  create: async (data) => (await axiosClient.post('/orders/create', data)).data,
  list: async (params) => (await axiosClient.get('/orders', { params })).data,
  get: async (id) => (await axiosClient.get(`/orders/${id}`)).data,
  cancel: async (id, reason) => (await axiosClient.post(`/orders/${id}/cancel`, { reason })).data,
};

export const importApi = {
  create: async (data) => (await axiosClient.post('/imports/create', data)).data,
  list: async (params) => (await axiosClient.get('/imports', { params })).data,
  get: async (id) => (await axiosClient.get(`/imports/${id}`)).data,
};
