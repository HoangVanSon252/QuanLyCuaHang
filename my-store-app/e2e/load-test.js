// Kiểm thử tải: mô phỏng nhiều cửa hàng với nhiều thu ngân thao tác đồng thời.
//   BASE_URL=http://localhost:8088 ADMIN_PASSWORD=... VUS=100 DURATION=60 STORES=20 node load-test.js
// Lưu ý: chạy từ 1 máy = 1 IP → cần nới giới hạn tốc độ khi test (xem README, mục Kiểm thử tải).
const BASE = (process.env.BASE_URL || 'http://localhost:8088') + '/api';
const VUS = Number(process.env.VUS || 100);
const DURATION = Number(process.env.DURATION || 60) * 1000;
const STORES = Number(process.env.STORES || 20);
const PRODUCTS = Number(process.env.PRODUCTS || 50);
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345';
const PW = 'Matkhau123';

const stats = new Map(); // tên thao tác → { lat: [], ok, fail, codes }
const record = (name, ms, ok, code) => {
  if (!stats.has(name)) stats.set(name, { lat: [], ok: 0, fail: 0, codes: {} });
  const s = stats.get(name);
  s.lat.push(ms);
  ok ? s.ok++ : s.fail++;
  if (!ok) s.codes[code] = (s.codes[code] || 0) + 1;
};

const call = async (name, method, path, token, body) => {
  const t0 = performance.now();
  let status = 0;
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    status = res.status;
    const data = await res.json().catch(() => null);
    if (name) record(name, performance.now() - t0, res.ok, status);
    return { status, data };
  } catch (e) {
    if (name) record(name, performance.now() - t0, false, e.code || 'NETWORK');
    return { status, data: null };
  }
};

const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

async function seed() {
  const run = Date.now().toString(36);
  const admin = (await call(null, 'POST', '/users/login', null, { userName: ADMIN_USER, password: ADMIN_PASSWORD })).data?.token;
  if (!admin) throw new Error('Không đăng nhập được admin — kiểm tra ADMIN_PASSWORD');
  const stores = [];
  for (let i = 0; i < STORES; i++) {
    const userName = `load_${run}_${i}`;
    await call(null, 'POST', '/admin/stores', admin, { userName, password: PW, storeName: `Load ${run} #${i}` });
    const token = (await call(null, 'POST', '/users/login', null, { userName, password: PW })).data.token;
    const ids = [];
    for (let p = 0; p < PRODUCTS; p++) {
      const r = await call(null, 'POST', '/products', token, {
        name: `Sản phẩm ${p}`, cost_price: 10000, sell_price: 15000, stock_quantity: 1_000_000,
      });
      ids.push(r.data.data);
    }
    stores.push({ token, ids });
  }
  return stores;
}

async function virtualUser(store, until) {
  const pick = () => store.ids[Math.floor(Math.random() * store.ids.length)];
  while (performance.now() < until) {
    await call('GET  /products (danh sách hàng)', 'GET', '/products', store.token);
    const items = Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({ product_id: pick(), quantity: 1 }));
    await call('POST /orders/create (thanh toán)', 'POST', '/orders/create', store.token, { items });
    if (Math.random() < 0.3) await call('GET  /orders (lịch sử hoá đơn)', 'GET', '/orders?limit=20', store.token);
    if (Math.random() < 0.2) await call('GET  /dashboard/overview', 'GET', '/dashboard/overview', store.token);
  }
}

(async () => {
  console.log(`Chuẩn bị dữ liệu: ${STORES} cửa hàng × ${PRODUCTS} sản phẩm...`);
  const stores = await seed();
  console.log(`Chạy tải: ${VUS} người dùng đồng thời trong ${DURATION / 1000}s → ${BASE}`);
  const t0 = performance.now();
  const until = t0 + DURATION;
  await Promise.all(Array.from({ length: VUS }, (_, i) => virtualUser(stores[i % stores.length], until)));
  const secs = (performance.now() - t0) / 1000;

  let total = 0;
  let failed = 0;
  const rows = [];
  for (const [name, s] of stats) {
    total += s.ok + s.fail;
    failed += s.fail;
    rows.push({
      'Thao tác': name,
      'Số request': s.ok + s.fail,
      'Lỗi': s.fail,
      'p50 (ms)': Math.round(pct(s.lat, 50)),
      'p95 (ms)': Math.round(pct(s.lat, 95)),
      'p99 (ms)': Math.round(pct(s.lat, 99)),
      'Mã lỗi': JSON.stringify(s.codes),
    });
  }
  console.table(rows);
  const orders = stats.get('POST /orders/create (thanh toán)');
  console.log(`Tổng: ${total} request trong ${secs.toFixed(1)}s → ${(total / secs).toFixed(0)} request/giây`);
  console.log(`Hoá đơn tạo thành công: ${orders?.ok || 0} (${((orders?.ok || 0) / secs).toFixed(1)} hoá đơn/giây)`);
  console.log(`Tỉ lệ lỗi: ${((failed / Math.max(1, total)) * 100).toFixed(2)}%`);
  process.exit(failed / Math.max(1, total) > 0.01 ? 1 : 0);
})();
