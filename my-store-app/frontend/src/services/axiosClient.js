import axios from 'axios';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for automatic token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 or invalid token 400
    const isUnauthorized = error.response?.status === 401 ||
      (error.response?.status === 400 && error.response?.data?.message === "Token không hợp lệ.");

    if (isUnauthorized && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        axios
          .post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/users/refresh-token`,
            {},
            { withCredentials: true }
          )
          .then(({ data }) => {
            localStorage.setItem('token', data.token);
            axiosClient.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
            processQueue(null, data.token);
            resolve(axiosClient(originalRequest));
          })
          .catch((err) => {
            processQueue(err, null);
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            reject(err);
          })
          .finally(() => {
            isRefreshing = false;
          });
      });
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
