// Kịch bản nghiệp vụ đầy đủ trên trình duyệt thật, theo mô hình:
//  - Admin hệ thống quản lý cửa hàng & tài khoản (tạo, sửa, khoá, đặt lại mật khẩu).
//  - Mỗi cửa hàng có ĐÚNG MỘT tài khoản, dùng chung cho cả cửa hàng, tự quản lý sản phẩm & bán hàng.
const { test, expect } = require('@playwright/test');
const { ADMIN_USER, ADMIN_PASSWORD, PW, watchErrors, loginUI, logoutUI } = require('./helpers');

const RUN = Date.now().toString(36);
const OWNER = `cuahang_${RUN}`;
const STORE = `Shop E2E ${RUN}`;
const PRODUCT = `Sữa tươi ${RUN}`;
const BARCODE = `49${String(Date.now()).slice(-10)}`;
const NEW_PW = 'MatKhauMoi789';

test.describe.configure({ mode: 'serial' });

test('1. Admin tạo cửa hàng, sửa thông tin, xem nhật ký', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, ADMIN_USER, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/admin\/stores/);

  // Menu admin chỉ có quản lý cửa hàng, không có chức năng bán hàng
  const nav = page.locator('aside nav');
  await expect(nav.getByRole('link', { name: 'Quản lý cửa hàng' })).toBeVisible();
  for (const hidden of ['Bán nhanh', 'Kho hàng', 'Hoá đơn', 'Nhân viên'])
    await expect(nav.getByRole('link', { name: hidden })).toHaveCount(0);

  await page.getByRole('button', { name: 'Tạo cửa hàng' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo cửa hàng mới' });
  await dialog.getByLabel('Tên cửa hàng *').fill(STORE);
  await dialog.getByLabel('Địa chỉ').fill('12 Trần Phú, Hà Nội');
  await dialog.getByLabel('Tên chủ cửa hàng').fill('Nguyễn Thị Chủ');
  await dialog.getByLabel('Tên đăng nhập *').fill(OWNER);

  // Mật khẩu yếu bị chặn ngay trên giao diện
  await dialog.getByLabel('Mật khẩu *').fill('123');
  await dialog.getByRole('button', { name: 'Tạo cửa hàng' }).click();
  await expect(dialog.getByRole('alert')).toContainText('8 ký tự');

  await dialog.getByLabel('Mật khẩu *').fill(PW);
  await dialog.getByRole('button', { name: 'Tạo cửa hàng' }).click();
  await expect(page.getByRole('status')).toContainText('Đã tạo cửa hàng');

  // Tìm thấy cửa hàng vừa tạo trong danh sách
  await page.getByLabel('Tìm cửa hàng').fill(RUN);
  const row = page.locator('tbody tr', { hasText: STORE });
  await expect(row).toBeVisible();
  await expect(row).toContainText(OWNER);
  await expect(row).toContainText('Hoạt động');

  // Sửa số điện thoại
  await row.getByRole('button', { name: `Sửa ${STORE}` }).click();
  const edit = page.getByRole('dialog', { name: 'Sửa thông tin cửa hàng' });
  await edit.getByLabel('Số điện thoại').fill('0901 234 567');
  await edit.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(row).toContainText('0901 234 567');

  // Nhật ký ghi nhận
  await page.getByRole('tab', { name: /Nhật ký/ }).click();
  await expect(page.getByText('Tạo cửa hàng').first()).toBeVisible();
  await expect(page.getByText('Sửa thông tin cửa hàng').first()).toBeVisible();

  // Admin không vào được trang nghiệp vụ cửa hàng
  for (const url of ['/pos', '/inventory', '/']) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/admin\/stores/);
  }
  expect(errors).toEqual([]);
});

test('2. Tài khoản cửa hàng: dashboard, thêm sản phẩm, kiểm tra dữ liệu sai', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, OWNER);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('TỔNG DOANH THU').first()).toBeVisible();
  await expect(page.getByText(/Chào buổi (sáng|trưa|chiều|tối)/)).toBeVisible();
  await expect(page.locator('aside').getByText(STORE)).toBeVisible();

  // Menu cửa hàng: đủ chức năng, không có quản lý tài khoản / nhân viên
  const nav = page.locator('aside nav');
  for (const shown of ['Bảng điều khiển', 'Bán nhanh', 'Hoá đơn', 'Kho hàng', 'Nhập hàng', 'Phân tích'])
    await expect(nav.getByRole('link', { name: shown })).toBeVisible();
  for (const hidden of ['Nhân viên', 'Quản lý cửa hàng'])
    await expect(nav.getByRole('link', { name: hidden })).toHaveCount(0);
  await page.goto('/admin/stores');
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole('link', { name: 'Kho hàng' }).click();
  await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();
  await page.locator('input[name=name]').fill(PRODUCT);
  await page.locator('input[name=barcode]').fill(BARCODE);
  await page.locator('input[name=cost_price]').fill('100000');
  await page.locator('input[name=sell_price]').fill('150000');
  await page.locator('input[name=stock_quantity]').fill('2');
  await page.getByRole('button', { name: 'Lưu sản phẩm' }).click();
  await expect(page.locator('input[name=name]')).toBeHidden();
  await page.getByPlaceholder('Tìm tên, mã vạch...').fill(RUN);
  await expect(page.getByText(PRODUCT).first()).toBeVisible();

  // Mã vạch trùng → server từ chối, thông báo hiển thị trong form
  await page.getByRole('button', { name: 'Thêm sản phẩm' }).click();
  await page.locator('input[name=name]').fill('Trùng mã');
  await page.locator('input[name=barcode]').fill(BARCODE);
  await page.locator('input[name=cost_price]').fill('1');
  await page.locator('input[name=sell_price]').fill('2');
  await page.locator('input[name=stock_quantity]').fill('1');
  await page.getByRole('button', { name: 'Lưu sản phẩm' }).click();
  await expect(page.getByText(/trùng/i)).toBeVisible();
  await page.goto('/inventory');

  // Xuất CSV tải được file
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Xuất Excel/ }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
  expect(errors).toEqual([]);
});

test('3. Nhập hàng → tồn kho tăng', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, OWNER);
  await page.getByRole('link', { name: 'Nhập hàng' }).click();
  await page.getByLabel('Tìm sản phẩm để nhập').fill(RUN);
  await page.getByRole('button', { name: new RegExp(PRODUCT) }).click();
  await page.getByLabel(`Số lượng ${PRODUCT}`).fill('10');
  await page.getByLabel(`Giá nhập ${PRODUCT}`).fill('110000');
  await page.getByLabel('Nhà cung cấp').fill('Công ty Sữa VN');
  await expect(page.getByText('1.100.000 ₫').first()).toBeVisible();
  await page.getByRole('button', { name: 'Lưu phiếu nhập' }).click();
  await expect(page.getByRole('status')).toContainText('Đã nhập kho phiếu PN');

  await page.goto('/inventory');
  await page.getByPlaceholder('Tìm tên, mã vạch...').fill(RUN);
  await expect(page.getByText('12 món')).toBeVisible(); // 2 + 10
  expect(errors).toEqual([]);
});

test('4. Bán hàng: thanh toán thành công, không bán quá tồn kho', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, OWNER);
  await page.getByRole('link', { name: 'Bán nhanh' }).click();

  await page.getByPlaceholder('Tìm tên sản phẩm hoặc mã vạch...').fill(RUN);
  await page.getByText(PRODUCT).first().click();
  const plus = page.getByRole('button', { name: '+', exact: true });
  for (let i = 0; i < 2; i++) await plus.click();
  await expect(page.getByText('450.000 ₫')).toBeVisible(); // 3 × 150.000
  await page.getByRole('radio', { name: 'Chuyển khoản' }).click();
  await page.getByRole('button', { name: 'THANH TOÁN' }).click();
  await expect(page.getByText(/Thanh toán thành công 450\.000/)).toBeVisible();

  // Còn 9 → thêm 10 cái thì bị chặn ở lần thứ 10
  await page.getByPlaceholder('Tìm tên sản phẩm hoặc mã vạch...').fill(BARCODE);
  await page.keyboard.press('Enter'); // mô phỏng máy quét mã vạch USB
  for (let i = 0; i < 9; i++) await plus.click();
  await expect(page.getByText(/Chỉ còn 9/)).toBeVisible();
  await page.getByRole('button', { name: 'THANH TOÁN' }).click();
  await expect(page.getByText(/Thanh toán thành công/)).toBeVisible();

  // Hết hàng
  await page.getByPlaceholder('Tìm tên sản phẩm hoặc mã vạch...').fill(RUN);
  await expect(page.getByText('Hết hàng').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('5. Tra cứu, in và huỷ hoá đơn → tồn kho được hoàn lại', async ({ page }) => {
  const errors = watchErrors(page);
  await loginUI(page, OWNER);
  await page.getByRole('link', { name: 'Hoá đơn' }).click();
  const rows = page.locator('tbody tr');
  await expect(rows.first()).toContainText('HD');
  await expect(page.getByText('Chuyển khoản').first()).toBeVisible();

  await page.getByText('450.000 ₫').first().click();
  const dialog = page.getByRole('dialog', { name: 'Chi tiết hoá đơn' });
  await expect(dialog.getByText(PRODUCT)).toBeVisible();
  await expect(dialog.getByText(STORE).first()).toBeVisible();

  await dialog.getByRole('button', { name: 'Huỷ hoá đơn' }).click();
  await expect(dialog.getByRole('alert')).toContainText('lý do');
  await dialog.getByLabel('Lý do huỷ').fill('Khách đổi ý, trả hàng');
  await dialog.getByRole('button', { name: 'Huỷ hoá đơn' }).click();
  await expect(dialog.getByText('ĐÃ HUỶ')).toBeVisible();
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(page.locator('tbody').getByText('Đã huỷ').first()).toBeVisible();

  await page.goto('/inventory');
  await page.getByPlaceholder('Tìm tên, mã vạch...').fill(RUN);
  await expect(page.getByText('3 món')).toBeVisible(); // 0 + 3 hoàn lại
  expect(errors).toEqual([]);
});

test('6. Báo cáo không tính hoá đơn đã huỷ', async ({ page }) => {
  await loginUI(page, OWNER);
  await page.getByRole('link', { name: 'Phân tích' }).click();
  // Chỉ còn hoá đơn 9 × 150.000 = 1.350.000
  await expect(page.getByText('1.350.000').first()).toBeVisible();
  await expect(page.getByText(/-\d/)).toHaveCount(0); // không có số âm
});

test('7. Cửa hàng tự đổi mật khẩu: mật khẩu cũ không đăng nhập được nữa', async ({ page }) => {
  await loginUI(page, OWNER);
  await page.goto('/account');
  await page.getByLabel('Mật khẩu hiện tại').fill(PW);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill(NEW_PW);
  await page.getByLabel('Nhập lại mật khẩu mới').fill(NEW_PW);
  await page.getByRole('button', { name: 'Cập nhật mật khẩu' }).click();
  await expect(page.getByRole('status')).toContainText('Đổi mật khẩu thành công');

  // Phiên hiện tại vẫn dùng được
  await page.goto('/pos');
  await expect(page.getByRole('button', { name: 'THANH TOÁN' })).toBeVisible();
  await logoutUI(page);

  await page.getByPlaceholder('Tên tài khoản').fill(OWNER);
  await page.getByPlaceholder('Mật khẩu').fill(PW);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page.getByRole('alert')).toContainText('không chính xác');
  await loginUI(page, OWNER, NEW_PW);
});

test('8. Admin khoá cửa hàng → cửa hàng bị đăng xuất ngay; mở khoá → dùng lại được', async ({ browser }) => {
  const storeCtx = await browser.newContext();
  const storePage = await storeCtx.newPage();
  await loginUI(storePage, OWNER, NEW_PW);

  const adminCtx = await browser.newContext();
  const adminPage = await adminCtx.newPage();
  await loginUI(adminPage, ADMIN_USER, ADMIN_PASSWORD);
  await adminPage.getByLabel('Tìm cửa hàng').fill(RUN);
  const row = adminPage.locator('tbody tr', { hasText: STORE });
  await row.getByRole('button', { name: `Khoá ${STORE}` }).click();
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Khoá cửa hàng' }).click();
  await expect(adminPage.getByRole('status')).toContainText('Đã khoá');
  await expect(row).toContainText('Đang khoá');

  // Phiên của cửa hàng hết hiệu lực (tối đa ~10 giây do bộ nhớ đệm trạng thái tài khoản)
  await expect(async () => {
    await storePage.goto('/orders');
    await expect(storePage).toHaveURL(/\/login/);
  }).toPass({ timeout: 20_000 });

  await storePage.getByPlaceholder('Tên tài khoản').fill(OWNER);
  await storePage.getByPlaceholder('Mật khẩu').fill(NEW_PW);
  await storePage.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(storePage.getByRole('alert')).toContainText('tạm khoá');

  // Mở khoá → đăng nhập lại được, dữ liệu còn nguyên
  await row.getByRole('button', { name: `Mở khoá ${STORE}` }).click();
  await adminPage.getByRole('dialog').getByRole('button', { name: 'Mở khoá' }).click();
  await expect(row).toContainText('Hoạt động');
  await loginUI(storePage, OWNER, NEW_PW);
  await storePage.goto('/inventory');
  await storePage.getByPlaceholder('Tìm tên, mã vạch...').fill(RUN);
  await expect(storePage.getByText(PRODUCT).first()).toBeVisible();

  await storeCtx.close();
  await adminCtx.close();
});

test('9. Admin đặt lại mật khẩu cửa hàng → mật khẩu cũ hết hiệu lực', async ({ page }) => {
  await loginUI(page, ADMIN_USER, ADMIN_PASSWORD);
  await page.getByLabel('Tìm cửa hàng').fill(RUN);
  const row = page.locator('tbody tr', { hasText: STORE });
  await row.getByRole('button', { name: `Đặt lại mật khẩu ${STORE}` }).click();
  const dialog = page.getByRole('dialog', { name: 'Đặt lại mật khẩu' });
  await dialog.getByLabel('Mật khẩu mới', { exact: true }).fill('DatLai2026xyz');
  await dialog.getByLabel('Nhập lại mật khẩu mới').fill('DatLai2026xyz');
  await dialog.getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
  await expect(page.getByRole('status')).toContainText('Đã đặt lại mật khẩu');
  await logoutUI(page);

  await page.getByPlaceholder('Tên tài khoản').fill(OWNER);
  await page.getByPlaceholder('Mật khẩu').fill(NEW_PW);
  await page.getByRole('button', { name: /Đăng nhập/ }).click();
  await expect(page.getByRole('alert')).toContainText('không chính xác');
  await loginUI(page, OWNER, 'DatLai2026xyz');
});
