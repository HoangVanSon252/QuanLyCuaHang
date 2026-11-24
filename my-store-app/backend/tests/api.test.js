// Kiểm thử API dạng hộp đen chạy trên hệ thống thật (Docker).
//   API_URL=http://localhost:8088/api ADMIN_USER=admin ADMIN_PASSWORD=... npm test
// Mỗi lần chạy tạo dữ liệu mới (tên duy nhất) nên có thể chạy lặp lại nhiều lần.
const { test, before, describe } = require("node:test");
const assert = require("node:assert/strict");

const API = process.env.API_URL || "http://localhost:8088/api";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345";
const RUN = Date.now().toString(36);
const PW = "Matkhau123";

// ---------- Tiện ích gọi API ----------
const call = async (method, path, opts = {}, attempt = 0) => {
  const { token, body, cookie, headers = {}, raw } = opts;
  const res = await fetch(API + path, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  // 429 dạng HTML là do Nginx giới hạn tốc độ (bộ test gửi rất nhanh) → chờ rồi thử lại
  if (res.status === 429 && text.startsWith("<") && attempt < 5) {
    await new Promise((ok) => setTimeout(ok, 1000));
    return call(method, path, opts, attempt + 1);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  const setCookie = res.headers.getSetCookie?.() || [];
  const rt = setCookie.find((c) => c.startsWith("refreshToken="));
  return { status: res.status, data, headers: res.headers, cookie: rt ? rt.split(";")[0] : null };
};

const login = async (userName, password = PW) => {
  const r = await call("POST", "/users/login", { body: { userName, password } });
  assert.equal(r.status, 200, `Đăng nhập ${userName} thất bại: ${JSON.stringify(r.data)}`);
  return { token: r.data.token, cookie: r.cookie, user: r.data.user };
};

const ctx = {};

// Admin tạo một cửa hàng mới (kèm tài khoản duy nhất của cửa hàng) rồi đăng nhập vào đó
const newStore = async (prefix, extra = {}) => {
  const userName = `${prefix}_${RUN}`;
  const r = await call("POST", "/admin/stores", {
    token: ctx.admin.token,
    body: { userName, password: PW, fullName: `Chủ ${prefix}`, storeName: `Cửa hàng ${prefix} ${RUN}`, ...extra },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return { ...(await login(userName)), storeId: r.data.storeId, userName };
};

before(async () => {
  ctx.admin = await login(ADMIN_USER, ADMIN_PASSWORD);
  // Hai cửa hàng độc lập để kiểm tra cách ly dữ liệu
  ctx.A = await newStore("ownerA");
  ctx.B = await newStore("ownerB");

  const mk = async (who, body) => {
    const r = await call("POST", "/products", { token: ctx[who].token, body });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    return r.data.data;
  };
  const catB = await call("POST", "/products/categories", { token: ctx.B.token, body: { name: "Danh mục B" } });
  ctx.catB = catB.data.data.id;
  ctx.pA = await mk("A", { name: "Sữa A", barcode: `A${RUN}`, cost_price: 100, sell_price: 150, stock_quantity: 10 });
  ctx.pA2 = await mk("A", { name: "Bánh A", cost_price: 50, sell_price: 80, stock_quantity: 100 });
  ctx.pB = await mk("B", { name: "Sữa B", cost_price: 100, sell_price: 150, stock_quantity: 10 });
});

describe("Hạ tầng & header bảo mật", () => {
  test("health check báo DB hoạt động", async () => {
    const r = await call("GET", "/health");
    assert.equal(r.status, 200);
    assert.equal(r.data.db, "ok");
  });
  test("không lộ X-Powered-By, có header bảo mật", async () => {
    const r = await call("GET", "/health");
    assert.equal(r.headers.get("x-powered-by"), null);
    assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  });
  test("CORS không phản chiếu origin lạ", async () => {
    const r = await call("GET", "/health", { headers: { Origin: "https://evil.example" } });
    assert.equal(r.headers.get("access-control-allow-origin"), null);
  });
  test("JSON sai cú pháp trả 400 dạng JSON, không lộ stack trace", async () => {
    const r = await call("POST", "/users/login", { raw: "{bad", headers: { "Content-Type": "application/json" } });
    assert.equal(r.status, 400);
    assert.equal(typeof r.data, "object");
    assert.doesNotMatch(JSON.stringify(r.data), /node_modules|at JSON|stack/i);
  });
  test("route không tồn tại trả 404 JSON", async () => {
    const r = await call("GET", "/khong-ton-tai");
    assert.equal(r.status, 404);
  });
});

describe("Xác thực", () => {
  test("không có token → 401", async () => {
    assert.equal((await call("GET", "/products")).status, 401);
  });
  test("token rác và token alg=none → 401", async () => {
    assert.equal((await call("GET", "/products", { token: "abc.def.ghi" })).status, 401);
    const e = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const none = `${e({ alg: "none", typ: "JWT" })}.${e({ userId: 1, role: "super_admin", store_id: 1 })}.`;
    assert.equal((await call("GET", "/admin/stores", { token: none })).status, 401);
  });
  test("thông báo lỗi đăng nhập giống nhau (không dò được tài khoản)", async () => {
    const a = await call("POST", "/users/login", { body: { userName: `khongco_${RUN}`, password: "x" } });
    const b = await call("POST", "/users/login", { body: { userName: `ownerB_${RUN}`, password: "SaiMatKhau1" } });
    assert.equal(a.status, 400);
    assert.equal(b.status, 400);
    assert.equal(a.data.message, b.data.message);
  });
  test("dữ liệu đăng nhập sai kiểu không gây lỗi 500", async () => {
    const r = await call("POST", "/users/login", { body: { userName: { a: 1 }, password: ["x"] } });
    assert.equal(r.status, 400);
  });
  test("khoá tài khoản sau 5 lần sai, kể cả khi nhập đúng sau đó", async () => {
    const { userName: u } = await newStore("lock");
    for (let i = 0; i < 5; i++) await call("POST", "/users/login", { body: { userName: u, password: "SaiMatKhau1" } });
    const r = await call("POST", "/users/login", { body: { userName: u, password: PW } });
    assert.equal(r.status, 423);
  });
  test("mật khẩu yếu bị từ chối khi tạo tài khoản", async () => {
    const r = await call("POST", "/admin/stores", {
      token: ctx.admin.token,
      body: { userName: `weak_${RUN}`, password: "1", storeName: "Mật khẩu yếu" },
    });
    assert.equal(r.status, 400);
  });
  test("refresh token xoay vòng; dùng lại token cũ → thu hồi cả phiên", async () => {
    const s = await login(`ownerB_${RUN}`);
    const r1 = await call("POST", "/users/refresh-token", { cookie: s.cookie });
    assert.equal(r1.status, 200);
    assert.ok(r1.cookie && r1.cookie !== s.cookie, "phải cấp refresh token mới");
    const reuse = await call("POST", "/users/refresh-token", { cookie: s.cookie });
    assert.equal(reuse.status, 401);
    const r2 = await call("POST", "/users/refresh-token", { cookie: r1.cookie });
    assert.equal(r2.status, 401, "token mới cùng họ cũng phải bị thu hồi");
  });
  test("đăng xuất thu hồi refresh token", async () => {
    const s = await login(`ownerB_${RUN}`);
    assert.equal((await call("POST", "/users/logout", { cookie: s.cookie })).status, 200);
    assert.equal((await call("POST", "/users/refresh-token", { cookie: s.cookie })).status, 401);
  });
  test("đổi mật khẩu vô hiệu hoá token cũ", async () => {
    const s = await newStore("chpw");
    const u = s.userName;
    const r = await call("POST", "/users/change-password", {
      token: s.token,
      body: { currentPassword: PW, newPassword: "MatKhauMoi456" },
    });
    assert.equal(r.status, 200);
    let status;
    for (let i = 0; i < 15; i++) {
      status = (await call("GET", "/users/me", { token: s.token })).status;
      if (status === 401) break;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
    assert.equal(status, 401);
    assert.equal((await call("GET", "/users/me", { token: r.data.token })).status, 200);
    await login(u, "MatKhauMoi456");
  });
  test("admin khoá cửa hàng → phiên đang dùng bị từ chối, không đăng nhập được; mở khoá → dùng lại được", async () => {
    const st = await newStore("lockstore");
    assert.equal((await call("GET", "/products", { token: st.token })).status, 200);
    const r = await call("PATCH", `/admin/stores/${st.storeId}/status`, { token: ctx.admin.token, body: { is_active: false } });
    assert.equal(r.status, 200);
    let status;
    for (let i = 0; i < 15; i++) {
      status = (await call("GET", "/products", { token: st.token })).status;
      if (status === 401) break;
      await new Promise((ok) => setTimeout(ok, 1000));
    }
    assert.equal(status, 401, "access token của cửa hàng bị khoá phải bị từ chối");
    assert.equal((await call("POST", "/users/refresh-token", { cookie: st.cookie })).status, 401, "phiên phải bị thu hồi");
    const denied = await call("POST", "/users/login", { body: { userName: st.userName, password: PW } });
    assert.equal(denied.status, 403);
    assert.match(denied.data.message, /khoá/);
    const reopen = await call("PATCH", `/admin/stores/${st.storeId}/status`, { token: ctx.admin.token, body: { is_active: true } });
    assert.equal(reopen.status, 200);
    await login(st.userName);
  });
});

describe("Phân quyền & cách ly cửa hàng", () => {
  test("tài khoản cửa hàng không gọi được bất kỳ API quản trị nào", async () => {
    const t = ctx.A.token;
    const body = { is_active: false, newPassword: PW, storeName: "x", userName: "x", password: PW };
    for (const [m, p] of [
      ["GET", "/admin/stores"],
      ["POST", "/admin/stores"],
      ["GET", `/admin/stores/${ctx.B.storeId}`],
      ["PUT", `/admin/stores/${ctx.B.storeId}`],
      ["PATCH", `/admin/stores/${ctx.B.storeId}/status`],
      ["POST", `/admin/stores/${ctx.B.storeId}/reset-password`],
      ["GET", "/admin/audit-logs"],
    ]) {
      assert.equal((await call(m, p, { token: t, body: m === "GET" ? undefined : body })).status, 403, `${m} ${p}`);
    }
  });
  test("không còn khái niệm nhân viên / danh sách tài khoản: API cũ không tồn tại", async () => {
    assert.equal((await call("POST", "/users/staff", { token: ctx.A.token, body: { userName: "x", password: PW } })).status, 404);
    assert.equal((await call("GET", "/users", { token: ctx.A.token })).status, 404);
  });
  test("không đọc / sửa / xoá được sản phẩm của cửa hàng khác", async () => {
    assert.equal((await call("GET", `/products/${ctx.pB}`, { token: ctx.A.token })).status, 404);
    const upd = await call("PUT", `/products/${ctx.pB}`, {
      token: ctx.A.token,
      body: { name: "hack", cost_price: 1, sell_price: 1, stock_quantity: 1 },
    });
    assert.equal(upd.status, 404);
    assert.equal((await call("DELETE", `/products/${ctx.pB}`, { token: ctx.A.token })).status, 404);
  });
  test("không gán được danh mục của cửa hàng khác", async () => {
    const r = await call("POST", "/products", {
      token: ctx.A.token,
      body: { name: "x", category_id: ctx.catB, cost_price: 1, sell_price: 2, stock_quantity: 1 },
    });
    assert.equal(r.status, 400);
  });
  test("không bán được sản phẩm của cửa hàng khác", async () => {
    const r = await call("POST", "/orders/create", { token: ctx.A.token, body: { items: [{ product_id: ctx.pB, quantity: 1 }] } });
    assert.equal(r.status, 400);
  });
  test("tài khoản cửa hàng dùng được toàn bộ chức năng của cửa hàng mình", async () => {
    const t = ctx.A.token;
    for (const p of ["/products", "/products/categories", "/orders", "/imports", "/dashboard/overview", "/dashboard/low-stock", "/dashboard/top-products"])
      assert.equal((await call("GET", p, { token: t })).status, 200, p);
  });
  test("admin không đụng được vào dữ liệu kinh doanh của cửa hàng", async () => {
    const t = ctx.admin.token;
    for (const [m, p] of [
      ["GET", "/products"],
      ["POST", "/products"],
      ["GET", "/orders"],
      ["POST", "/orders/create"],
      ["GET", "/imports"],
      ["GET", "/dashboard/overview"],
    ])
      assert.equal((await call(m, p, { token: t, body: m === "GET" ? undefined : {} })).status, 403, `${m} ${p}`);
  });
  test("admin xem nhật ký theo từng cửa hàng", async () => {
    const r = await call("GET", `/admin/audit-logs?limit=100&store_id=${ctx.A.storeId}`, { token: ctx.admin.token });
    assert.equal(r.status, 200);
    assert.ok(r.data.data.length > 0);
    assert.ok(r.data.data.every((l) => l.store_id === ctx.A.storeId));
    assert.ok(r.data.data.some((l) => l.action === "store_created"));
  });
});

describe("Admin — quản lý cửa hàng", () => {
  test("danh sách cửa hàng có tài khoản & chỉ số hoạt động, KHÔNG có doanh thu", async () => {
    const r = await call("GET", `/admin/stores?q=${encodeURIComponent(`ownerA_${RUN}`)}`, { token: ctx.admin.token });
    assert.equal(r.status, 200);
    assert.equal(r.data.total, 1);
    const s = r.data.data[0];
    assert.equal(s.id, ctx.A.storeId);
    assert.equal(s.username, `ownerA_${RUN}`);
    assert.ok(Number(s.product_count) >= 2);
    assert.equal(s.is_active, 1);
    for (const k of Object.keys(s)) assert.doesNotMatch(k, /revenue|profit|total_amount|password/i, `không được lộ ${k}`);
    assert.ok(r.data.summary.total >= 2);
  });
  test("lọc theo trạng thái và tìm theo tên cửa hàng", async () => {
    const st = await newStore("filter");
    await call("PATCH", `/admin/stores/${st.storeId}/status`, { token: ctx.admin.token, body: { is_active: false } });
    const locked = await call("GET", "/admin/stores?status=locked&limit=100", { token: ctx.admin.token });
    assert.ok(locked.data.data.some((s) => s.id === st.storeId));
    assert.ok(locked.data.data.every((s) => s.is_active === 0));
    const byName = await call("GET", `/admin/stores?q=${encodeURIComponent(`filter ${RUN}`)}`, { token: ctx.admin.token });
    assert.equal(byName.data.total, 1);
    assert.equal((await call("GET", "/admin/stores?status=abc", { token: ctx.admin.token })).status, 400);
  });
  test("tên đăng nhập trùng → 409; thiếu tên cửa hàng → 400", async () => {
    const dup = await call("POST", "/admin/stores", {
      token: ctx.admin.token,
      body: { userName: `ownerA_${RUN}`, password: PW, storeName: "Trùng" },
    });
    assert.equal(dup.status, 409);
    const noName = await call("POST", "/admin/stores", {
      token: ctx.admin.token,
      body: { userName: `noname_${RUN}`, password: PW },
    });
    assert.equal(noName.status, 400);
  });
  test("sửa thông tin cửa hàng; tài khoản cửa hàng thấy tên mới", async () => {
    const st = await newStore("edit");
    const bad = await call("PUT", `/admin/stores/${st.storeId}`, { token: ctx.admin.token, body: { storeName: "X", phone: "abc" } });
    assert.equal(bad.status, 400);
    const r = await call("PUT", `/admin/stores/${st.storeId}`, {
      token: ctx.admin.token,
      body: { storeName: `Tên mới ${RUN}`, phone: "0901 234 567", address: "12 Trần Phú" },
    });
    assert.equal(r.status, 200);
    const me = await call("GET", "/users/me", { token: st.token });
    assert.equal(me.data.data.storeName, `Tên mới ${RUN}`);
    assert.equal((await call("PUT", "/admin/stores/99999999", { token: ctx.admin.token, body: { storeName: "x" } })).status, 404);
  });
  test("đặt lại mật khẩu: mật khẩu cũ hết hiệu lực, mọi phiên bị thu hồi", async () => {
    const st = await newStore("reset");
    const r = await call("POST", `/admin/stores/${st.storeId}/reset-password`, {
      token: ctx.admin.token,
      body: { newPassword: "MatKhauMoi999" },
    });
    assert.equal(r.status, 200);
    assert.equal((await call("POST", "/users/refresh-token", { cookie: st.cookie })).status, 401);
    assert.equal((await call("POST", "/users/login", { body: { userName: st.userName, password: PW } })).status, 400);
    await login(st.userName, "MatKhauMoi999");
    const weak = await call("POST", `/admin/stores/${st.storeId}/reset-password`, { token: ctx.admin.token, body: { newPassword: "123" } });
    assert.equal(weak.status, 400);
  });
});

describe("Sản phẩm — kiểm tra dữ liệu", () => {
  const base = { name: "SP", cost_price: 10, sell_price: 20, stock_quantity: 1 };
  const bad = [
    ["giá dạng 1e3", { cost_price: "1e3" }],
    ["giá âm", { sell_price: -5 }],
    ["tồn kho số lẻ", { stock_quantity: 1.5 }],
    ["tồn kho âm", { stock_quantity: -1 }],
    ["tên quá dài", { name: "a".repeat(300) }],
    ["thiếu tên", { name: "" }],
    ["mã vạch có ký tự lạ", { barcode: "<script>" }],
  ];
  for (const [label, patch] of bad) {
    test(`từ chối ${label}`, async () => {
      const r = await call("POST", "/products", { token: ctx.A.token, body: { ...base, ...patch } });
      assert.equal(r.status, 400, JSON.stringify(r.data));
    });
  }
  test("mã vạch trùng trong cùng cửa hàng → 409", async () => {
    const r = await call("POST", "/products", { token: ctx.A.token, body: { ...base, barcode: `A${RUN}` } });
    assert.equal(r.status, 409);
  });
  test("cùng mã vạch ở cửa hàng khác vẫn được phép", async () => {
    const r = await call("POST", "/products", { token: ctx.B.token, body: { ...base, barcode: `A${RUN}` } });
    assert.equal(r.status, 201);
  });
});

describe("Bán hàng", () => {
  const order = (token, items, extra = {}) => call("POST", "/orders/create", { token, body: { items, ...extra } });
  const stockOf = async (id) => (await call("GET", `/products/${id}`, { token: ctx.A.token })).data.data.stock_quantity;

  test("từ chối số lượng âm / lẻ / bằng 0 / giỏ trống", async () => {
    for (const q of [-3, 0, 1.5, "abc"]) assert.equal((await order(ctx.A.token, [{ product_id: ctx.pA, quantity: q }])).status, 400);
    assert.equal((await order(ctx.A.token, [])).status, 400);
  });
  test("không bán vượt tồn kho (409) và tồn kho không bị âm", async () => {
    const before = await stockOf(ctx.pA);
    const r = await order(ctx.A.token, [{ product_id: ctx.pA, quantity: 9999 }]);
    assert.equal(r.status, 409);
    assert.equal(await stockOf(ctx.pA), before);
  });
  test("server tự tính tiền theo giá DB, bỏ qua giá/tổng do client gửi", async () => {
    const r = await order(ctx.A.token, [{ product_id: ctx.pA, quantity: 2, price: 1, subtotal: 1 }], { total_amount: 1 });
    assert.equal(r.status, 201);
    assert.equal(Number(r.data.total_amount), 300);
    const d = await call("GET", `/orders/${r.data.order_id}`, { token: ctx.A.token });
    assert.equal(d.status, 200, "chi tiết hoá đơn không còn lỗi 500");
    assert.equal(d.data.items[0].product_name, "Sữa A");
    assert.equal(Number(d.data.total_amount), 300);
  });
  test("bán đồng thời 20 đơn cho sản phẩm còn ít hàng → không bán quá tồn kho", async () => {
    const p = await call("POST", "/products", {
      token: ctx.A.token,
      body: { name: "Hàng hot", cost_price: 10, sell_price: 20, stock_quantity: 7 },
    });
    const id = p.data.data;
    const results = await Promise.all(Array.from({ length: 20 }, () => order(ctx.A.token, [{ product_id: id, quantity: 1 }])));
    const ok = results.filter((r) => r.status === 201).length;
    const rejected = results.filter((r) => r.status === 409).length;
    assert.equal(ok, 7);
    assert.equal(rejected, 13);
    assert.equal(await stockOf(id), 0);
  });
  test("huỷ hoá đơn hoàn lại tồn kho; huỷ lần 2 → 409; cửa hàng khác không huỷ được", async () => {
    const before = await stockOf(ctx.pA2);
    const r = await order(ctx.A.token, [{ product_id: ctx.pA2, quantity: 5 }]);
    assert.equal(await stockOf(ctx.pA2), before - 5);
    const id = r.data.order_id;
    assert.equal((await call("POST", `/orders/${id}/cancel`, { token: ctx.B.token, body: { reason: "thử" } })).status, 404);
    assert.equal((await call("POST", `/orders/${id}/cancel`, { token: ctx.A.token, body: { reason: "Khách trả hàng" } })).status, 200);
    assert.equal(await stockOf(ctx.pA2), before);
    assert.equal((await call("POST", `/orders/${id}/cancel`, { token: ctx.A.token, body: { reason: "Lần hai" } })).status, 409);
  });
  test("danh sách hoá đơn có phân trang và lọc trạng thái", async () => {
    const r = await call("GET", "/orders?page=1&limit=5&status=cancelled", { token: ctx.A.token });
    assert.equal(r.status, 200);
    assert.ok(r.data.total >= 1);
    assert.ok(r.data.data.every((o) => o.status === "cancelled"));
    assert.equal((await call("GET", "/orders?limit=1000", { token: ctx.A.token })).status, 400);
  });
});

describe("Nhập hàng & báo cáo", () => {
  test("nhập hàng cộng tồn kho và tính giá vốn bình quân", async () => {
    const p = await call("POST", "/products", {
      token: ctx.A.token,
      body: { name: "Hàng nhập", cost_price: 100, sell_price: 200, stock_quantity: 10 },
    });
    const id = p.data.data;
    const r = await call("POST", "/imports/create", {
      token: ctx.A.token,
      body: { supplier_name: "NCC Test", items: [{ product_id: id, quantity: 10, price: 200 }] },
    });
    assert.equal(r.status, 201, JSON.stringify(r.data));
    assert.equal(Number(r.data.total_amount), 2000);
    const prod = (await call("GET", `/products/${id}`, { token: ctx.A.token })).data.data;
    assert.equal(prod.stock_quantity, 20);
    assert.equal(Number(prod.cost_price), 150);
    const d = await call("GET", `/imports/${r.data.importOrderId}`, { token: ctx.A.token });
    assert.equal(d.status, 200, "chi tiết phiếu nhập không còn lỗi 500");
    assert.equal(d.data.items[0].product_name, "Hàng nhập");
  });
  test("nhập hàng từ chối giá âm / sản phẩm cửa hàng khác", async () => {
    assert.equal(
      (await call("POST", "/imports/create", { token: ctx.A.token, body: { items: [{ product_id: ctx.pA, quantity: 1, price: -1 }] } })).status,
      400
    );
    assert.equal(
      (await call("POST", "/imports/create", { token: ctx.A.token, body: { items: [{ product_id: ctx.pB, quantity: 1, price: 1 }] } })).status,
      400
    );
  });
  test("doanh thu không bao giờ âm và không tính hoá đơn đã huỷ", async () => {
    const before = (await call("GET", "/dashboard/overview", { token: ctx.B.token })).data.data;
    const r = await call("POST", "/orders/create", { token: ctx.B.token, body: { items: [{ product_id: ctx.pB, quantity: 2 }] } });
    const mid = (await call("GET", "/dashboard/overview", { token: ctx.B.token })).data.data;
    assert.equal(mid.total_revenue - before.total_revenue, 300);
    assert.equal(mid.total_profit - before.total_profit, 100);
    await call("POST", `/orders/${r.data.order_id}/cancel`, { token: ctx.B.token, body: { reason: "Huỷ thử" } });
    const after = (await call("GET", "/dashboard/overview", { token: ctx.B.token })).data.data;
    assert.equal(after.total_revenue, before.total_revenue);
    assert.ok(after.total_revenue >= 0 && after.total_profit >= 0);
  });
});
