import axiosClient from './axiosClient';

export const productApi = {
  // Lấy danh sách sản phẩm
  getProducts: async () => {
    const response = await axiosClient.get('/products');
    return response.data;
  },

  // Lấy thông tin chi tiết một sản phẩm
  getProductById: async (id) => {
    const response = await axiosClient.get(`/products/${id}`);
    return response.data;
  },

  // Tạo sản phẩm mới
  createProduct: async (productData) => {
    const response = await axiosClient.post('/products', productData);
    return response.data;
  },

  // Cập nhật sản phẩm
  updateProduct: async (id, productData) => {
    const response = await axiosClient.put(`/products/${id}`, productData);
    return response.data;
  },

  // Xóa sản phẩm
  deleteProduct: async (id) => {
    const response = await axiosClient.delete(`/products/${id}`);
    return response.data;
  },

  // Lấy danh sách danh mục
  getCategories: async () => {
    const response = await axiosClient.get('/products/categories');
    return response.data;
  },

  // Thêm danh mục mới
  createCategory: async (categoryData) => {
    const response = await axiosClient.post('/products/categories', categoryData);
    return response.data;
  }
};
