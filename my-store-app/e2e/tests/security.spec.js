// Kiểm thử bảo mật & phiên đăng nhập trên trình duyệt thật
const { test, expect } = require('@playwright/test');
const { seedStore, watchErrors, loginUI, logoutUI } = require('./helpers');

let store;
test.beforeAll(async () => {
  store = await seedStore(`sec${Date.now().toString(36)}`);
});

test('chưa đăng nhập → chuyển về /login và quay lại đúng trang sau khi đăng nhập', async ({ page }) => {
  await page.goto('/orders');
  await expect(page).toHaveURL(/\/login\?next=%2Forders/);
  await page.getByPlaceholder('Tên tài khoản').fill(store.owner);
  await page.getByPlaceholder('Mật khẩu').fill(store.ownerPassword);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page).toHaveURL(/\/orders$/);
});

test('không thể chuyển hướng ra trang ngoài qua tham số next', async ({ page }) => {
  await page.goto('/login?next=//evil.example.com');
  await page.getByPlaceholder('Tên tài khoản').fill(store.owner);
  await page.getByPlaceholder('Mật khẩu').fill(store.ownerPassword);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page).toHaveURL(/localhost.*\/$/);
});

test('giả cờ đăng nhập trong localStorage không vượt được bảo vệ', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify({ role: 'store_admin', userName: 'hacker' }));
    localStorage.setItem('token', 'gia.mao.token');
  });
  await page.goto('/inventory');
  // Token giả → API trả 401 → làm mới phiên thất bại → về trang đăng nhập
  await expect(page).toHaveURL(/\/login/);
});

test('access token hết hạn → tự làm mới phiên trong nền, người dùng không bị gián đoạn', async ({ page }) => {
  await loginUI(page, store.owner, store.ownerPassword);
  await page.evaluate(() => localStorage.setItem('token', 'het.han.roi'));
  const refreshed = page.waitForResponse((r) => r.url().includes('/api/users/refresh-token') && r.status() === 200);
  await page.goto('/inventory');
  await refreshed;
  await expect(page.getByText(`Sữa tươi ${store.owner.replace('owner_', '')}`).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toMatch(/^eyJ/);
});

test('refresh token nằm trong cookie HttpOnly + SameSite=Strict, JavaScript không đọc được', async ({ page, context }) => {
  await loginUI(page, store.owner, store.ownerPassword);
  const cookie = (await context.cookies()).find((c) => c.name === 'refreshToken');
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe('Strict');
  expect(cookie.path).toBe('/api/users');
  expect(await page.evaluate(() => document.cookie)).not.toContain('refreshToken');
});

test('đăng xuất thu hồi phiên trên server (không thể làm mới lại)', async ({ page }) => {
  await loginUI(page, store.owner, store.ownerPassword);
  await logoutUI(page);
  const status = await page.evaluate(async () => (await fetch('/api/users/refresh-token', { method: 'POST' })).status);
  expect(status).toBe(401);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login/);
});

test('tên sản phẩm chứa mã độc không được thực thi (XSS)', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, store.owner, store.ownerPassword);
  await page.goto('/inventory');
  await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();
  await page.locator('input[name=name]').fill('<img src=x onerror="window.__xss=1">Bánh');
  await page.locator('input[name=cost_price]').fill('1000');
  await page.locator('input[name=sell_price]').fill('2000');
  await page.locator('input[name=stock_quantity]').fill('1');
  await page.getByRole('button', { name: 'Lưu sản phẩm' }).click();
  await expect(page.getByText('<img src=x onerror="window.__xss=1">Bánh').first()).toBeVisible();
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('header bảo mật được trả về cho trang và API', async ({ request }) => {
  const html = await request.get('/');
  expect(html.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(html.headers()['x-frame-options']).toBe('DENY');
  expect(html.headers()['x-content-type-options']).toBe('nosniff');
  // Không lộ phiên bản máy chủ (Nginx: "nginx"; sau Caddy ở production: header bị xoá hẳn)
  expect(html.headers()['server'] || '').not.toMatch(/\d/);
  const api = await request.get('/api/health');
  expect(api.headers()['x-powered-by']).toBeUndefined();
  expect(api.headers()['cache-control']).toBe('no-store');
});

test('trang không tồn tại hiển thị 404 thân thiện', async ({ page }) => {
  await loginUI(page, store.owner, store.ownerPassword);
  await page.goto('/khong-co-trang-nay');
  await expect(page.getByText('Không tìm thấy trang')).toBeVisible();
  await page.getByRole('link', { name: 'Về trang chủ' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('tải lại trang (F5) trên mọi đường dẫn vẫn hoạt động (SPA fallback)', async ({ page }) => {
  await loginUI(page, store.owner, store.ownerPassword);
  for (const url of ['/inventory', '/orders', '/imports', '/report', '/account']) {
    await page.goto(url);
    await page.reload();
    await expect(page).toHaveURL(new RegExp(url));
    await expect(page.locator('aside')).toBeVisible();
  }
});
