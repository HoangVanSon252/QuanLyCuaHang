// Quản lý phiên đăng nhập phía trình duyệt.
// Access token sống ngắn (15 phút) lưu trong localStorage; refresh token nằm trong
// cookie HttpOnly (JavaScript không đọc được) và được xoay vòng mỗi lần làm mới.

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  STORE_ADMIN: 'store_admin',
};

export const ROLE_LABELS = {
  super_admin: 'Quản trị hệ thống',
  store_admin: 'Tài khoản cửa hàng',
};

export const getToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(getToken() && getUser());

export const setSession = (token, user) => {
  localStorage.setItem('token', token);
  if (user) localStorage.setItem('user', JSON.stringify(user));
  localStorage.removeItem('isAuthenticated'); // khoá cũ, không còn dùng
};

export const setToken = (token) => localStorage.setItem('token', token);

export const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
};

// Trang mặc định sau khi đăng nhập theo vai trò
export const homePathFor = (user) => {
  if (!user) return '/login';
  if (user.role === ROLES.SUPER_ADMIN) return '/admin/stores';
  return '/';
};

export const hasRole = (user, ...roles) => Boolean(user && roles.includes(user.role));
