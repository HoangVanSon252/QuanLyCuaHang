// Giao diện điện thoại: thanh điều hướng dưới, không tràn ngang, bán hàng được
const { test, expect } = require('@playwright/test');
const { seedStore, watchErrors, loginUI, ADMIN_USER, ADMIN_PASSWORD } = require('./helpers');

let store;
test.beforeAll(async () => {
  store = await seedStore(`mob${Date.now().toString(36)}`);
});

test('mọi trang hiển thị vừa màn hình điện thoại, không lỗi JavaScript', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, store.owner, store.ownerPassword);
  for (const url of ['/', '/inventory', '/pos', '/orders', '/imports', '/report', '/account']) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `tràn ngang ở ${url}`).toBeLessThanOrEqual(1);
  }
  await expect(page.getByRole('navigation', { name: 'Điều hướng' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'UniPOS' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('admin quản lý cửa hàng trên điện thoại', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, ADMIN_USER, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/admin\/stores/);
  await page.waitForLoadState('networkidle');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'trang quản lý cửa hàng tràn ngang').toBeLessThanOrEqual(1);
  await page.getByLabel('Tìm cửa hàng').fill(store.owner);
  await expect(page.locator('tbody tr', { hasText: store.owner })).toBeVisible();
  await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
  await expect(page.getByRole('dialog', { name: 'Tạo cửa hàng mới' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('bán hàng trên điện thoại', async ({ page }) => {
  await loginUI(page, store.owner, store.ownerPassword);
  await page.getByRole('navigation', { name: 'Điều hướng' }).getByRole('link', { name: 'BÁN NHANH' }).click();
  await page.getByPlaceholder('Tìm tên sản phẩm hoặc mã vạch...').fill('Kẹo dẻo');
  await page.getByText(/Kẹo dẻo/).first().click();
  await page.getByRole('button', { name: 'THANH TOÁN' }).click();
  await expect(page.getByText(/Thanh toán thành công 8\.000/)).toBeVisible();
});
