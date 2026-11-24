// Tiện ích dùng chung cho các kịch bản E2E
const { expect, request } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8088';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345';
const PW = 'Matkhau123';

// Tạo nhanh dữ liệu nền qua API (cửa hàng + chủ + sản phẩm) để các kịch bản UI độc lập nhau
async function seedStore(tag) {
  const api = await request.newContext({ baseURL: BASE_URL });
  const login = async (userName, password) => {
    const r = await api.post('/api/users/login', { data: { userName, password } });
    expect(r.status(), `login ${userName}`).toBe(200);
    return (await r.json()).token;
  };
  const admin = await login(ADMIN_USER, ADMIN_PASSWORD);
  const owner = `owner_${tag}`;
  const c = await api.post('/api/admin/stores', {
    headers: { Authorization: `Bearer ${admin}` },
    data: { userName: owner, password: PW, fullName: `Chủ ${tag}`, storeName: `Cửa hàng ${tag}` },
  });
  expect(c.status()).toBe(201);
  const ownerToken = await login(owner, PW);
  const auth = { Authorization: `Bearer ${ownerToken}` };
  const mk = async (body) => (await (await api.post('/api/products', { headers: auth, data: body })).json()).data;
  const products = {
    milk: await mk({ name: `Sữa tươi ${tag}`, barcode: `893${Date.now() % 1e9}`, cost_price: 20000, sell_price: 28000, stock_quantity: 5 }),
    candy: await mk({ name: `Kẹo dẻo ${tag}`, cost_price: 5000, sell_price: 8000, stock_quantity: 50 }),
  };
  await api.dispose();
  return { owner, ownerPassword: PW, products };
}

// Theo dõi lỗi JavaScript và lỗi console trên trang
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

async function loginUI(page, userName, password = PW) {
  await page.goto('/login');
  await page.getByPlaceholder('Tên tài khoản').fill(userName);
  await page.getByPlaceholder('Mật khẩu').fill(password);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

async function logoutUI(page) {
  const sidebarLogout = page.locator('aside').getByRole('button', { name: 'Đăng xuất' });
  if (await sidebarLogout.isVisible()) {
    await sidebarLogout.click();
  } else {
    await page.getByRole('button', { name: 'Tài khoản' }).first().click();
    await page.getByRole('button', { name: 'Đăng xuất' }).click();
  }
  await expect(page).toHaveURL(/\/login/);
}

module.exports = { BASE_URL, ADMIN_USER, ADMIN_PASSWORD, PW, seedStore, watchErrors, loginUI, logoutUI };
