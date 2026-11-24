// Kiểm thử E2E trên trình duyệt thật với hệ thống chạy bằng Docker.
//   BASE_URL=http://localhost:8088 ADMIN_PASSWORD=... npx playwright test
// Máy có Chrome: dùng Chrome thật (PW_CHANNEL=chrome, mặc định). CI: PW_CHANNEL=chromium.
const { defineConfig, devices } = require('@playwright/test');

const channel = process.env.PW_CHANNEL || 'chrome';
const browser = channel === 'chromium' ? {} : { channel };

module.exports = defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1, // các bước phụ thuộc dữ liệu tạo ở bước trước
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8088',
    headless: process.env.HEADED ? false : true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    acceptDownloads: true,
    // Cho phép chứng chỉ tự ký khi thử bản production trên máy (DOMAIN=localhost)
    ignoreHTTPSErrors: Boolean(process.env.IGNORE_HTTPS_ERRORS),
    // Camera giả để trang bán hàng (quét mã vạch) chạy được trong môi trường test
    permissions: ['camera'],
    launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /mobile\.spec\.js/,
      use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 1366, height: 820 } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser }, testMatch: /mobile\.spec\.js/ },
  ],
});
