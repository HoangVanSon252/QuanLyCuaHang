// Kiểm thử chống SQL injection, gồm 2 phần:
//  1) Quét mã nguồn (không cần server): mọi câu SQL chỉ được chèn ${...} là các
//     chuỗi cố định nằm trong danh sách cho phép; giá trị người dùng phải đi qua dấu "?".
//  2) Tấn công thật vào API đang chạy bằng các payload phổ biến.
//     API_URL=http://localhost:8088/api ADMIN_PASSWORD=... npm test
const { test, describe, before } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const API = process.env.API_URL || "http://localhost:8088/api";
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345";
const RUN = Date.now().toString(36);
const PW = "Matkhau123";

// ======================================================================
// PHẦN 1 — QUÉT MÃ NGUỒN
// ======================================================================

// Các biến được phép chèn vào câu SQL. Chúng chỉ chứa chuỗi cố định do lập trình viên
// viết sẵn (tên cột, điều kiện có dấu ?), không bao giờ chứa dữ liệu người dùng.
// Thêm tên mới vào đây CHỈ KHI biến đó được tạo hoàn toàn từ chuỗi hằng.
const ALLOWED_INTERPOLATIONS = new Set(["COMPLETED", "PUBLIC_COLUMNS", "LIST_COLUMNS", "where", "whereSql"]);

const SOURCE_DIRS = ["models", "controllers", "middleware", "utils", "routes"];
const SQL_CALL = /\.(query|execute)\(\s*`([\s\S]*?)`/g;
const SQL_CONCAT = /\.(query|execute)\(\s*(["'`])[^"'`]*\2\s*\+/g;

const sourceFiles = () =>
  [...SOURCE_DIRS.flatMap((d) =>
    fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(".js")).map((f) => path.join(d, f))
  ), "createAdmin.js", "server.js"];

describe("Quét mã nguồn: câu SQL không chèn dữ liệu người dùng", () => {
  test("mọi ${...} trong câu SQL đều thuộc danh sách chuỗi cố định cho phép", () => {
    const violations = [];
    for (const rel of sourceFiles()) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const m of src.matchAll(SQL_CALL)) {
        for (const [, expr] of m[2].matchAll(/\$\{\s*([^}]+?)\s*\}/g)) {
          if (!ALLOWED_INTERPOLATIONS.has(expr)) {
            const line = src.slice(0, m.index).split("\n").length;
            violations.push(`${rel}:${line} → \${${expr}}`);
          }
        }
      }
    }
    assert.deepEqual(
      violations,
      [],
      "Phát hiện câu SQL chèn biến trực tiếp. Hãy dùng dấu ? và truyền giá trị qua mảng tham số:\n  " +
        violations.join("\n  ")
    );
  });

  test("không nối chuỗi bằng dấu + để tạo câu SQL", () => {
    const violations = [];
    for (const rel of sourceFiles()) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const m of src.matchAll(SQL_CONCAT)) violations.push(`${rel}:${src.slice(0, m.index).split("\n").length}`);
    }
    assert.deepEqual(violations, [], "Câu SQL được nối chuỗi bằng +:\n  " + violations.join("\n  "));
  });

  test("các biến chuỗi SQL cho phép chỉ được gán từ chuỗi hằng", () => {
    // where / whereSql chỉ được push hoặc gán chuỗi hằng (không chứa ${...})
    const violations = [];
    for (const rel of sourceFiles()) {
      const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
      const assigns = src.matchAll(/(?:where\.push\(|(?:const|let)\s+(?:where|COMPLETED|PUBLIC_COLUMNS|LIST_COLUMNS)\s*=)\s*([^;]+)/g);
      for (const [stmt, rhs] of assigns) {
        if (/\$\{/.test(rhs) || /req\.|body|query\.|params\./.test(rhs))
          violations.push(`${rel}: ${stmt.trim().slice(0, 80)}`);
      }
    }
    assert.deepEqual(violations, [], "Biến dùng để ghép SQL chứa dữ liệu động:\n  " + violations.join("\n  "));
  });

  test("không bật multipleStatements (chặn nối thêm lệnh bằng ;)", () => {
    const db = fs.readFileSync(path.join(ROOT, "config", "db.js"), "utf8");
    assert.doesNotMatch(db, /multipleStatements\s*:\s*true/);
  });
});

// ======================================================================
// PHẦN 2 — TẤN CÔNG THẬT VÀO API
// ======================================================================

const PAYLOADS = [
  "' OR '1'='1",
  "' OR 1=1-- -",
  "admin'-- -",
  "\" OR \"\"=\"",
  "1; DROP TABLE products; --",
  "1' ; DROP TABLE users; --",
  "1 UNION SELECT username,password,1,1,1,1,1 FROM users-- -",
  "' UNION SELECT NULL,NULL,NULL-- -",
  "' AND SLEEP(3)-- -",
  "1 AND SLEEP(3)",
  "1' AND (SELECT 1 FROM (SELECT SLEEP(3))x)-- -",
  "%' OR '%'='",
  "\\' OR 1=1 #",
  "1)) OR ((1=1",
  "' AND extractvalue(1,concat(0x7e,(SELECT version())))-- -",
];
const SLEEP_THRESHOLD_MS = 2500;
const SQL_ERROR_PATTERN = /ER_[A-Z_]+|SQL syntax|sqlMessage|sqlState|mysql|XPATH syntax/i;

const call = async (method, p, { token, body } = {}, attempt = 0) => {
  const t0 = performance.now();
  const res = await fetch(API + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  // 429 dạng HTML là giới hạn tốc độ của Nginx → chờ rồi thử lại
  if (res.status === 429 && text.startsWith("<") && attempt < 5) {
    await new Promise((r) => setTimeout(r, 1000));
    return call(method, p, { token, body }, attempt + 1);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, text, ms: performance.now() - t0 };
};

// Phản hồi an toàn: không lỗi 500, không lộ lỗi SQL, không bị trễ do SLEEP
const assertSafe = (r, label) => {
  assert.notEqual(r.status, 500, `${label}: lỗi 500 — ${r.text.slice(0, 200)}`);
  assert.doesNotMatch(r.text, SQL_ERROR_PATTERN, `${label}: lộ thông tin lỗi SQL`);
  assert.ok(r.ms < SLEEP_THRESHOLD_MS, `${label}: phản hồi ${Math.round(r.ms)}ms — có thể SLEEP() đã được thực thi`);
};

const ctx = {};

describe("Tấn công SQL injection vào API đang chạy", () => {
  before(async () => {
    const a = await call("POST", "/users/login", { body: { userName: ADMIN_USER, password: ADMIN_PASSWORD } });
    assert.equal(a.status, 200, "Không đăng nhập được admin — kiểm tra API_URL / ADMIN_PASSWORD");
    ctx.admin = a.data.token;
    const mkStore = async (userName) => {
      const c = await call("POST", "/admin/stores", {
        token: ctx.admin,
        body: { userName, password: PW, storeName: `SQLi ${userName}` },
      });
      assert.equal(c.status, 201, JSON.stringify(c.data));
      return c.data.storeId;
    };
    for (const k of ["A", "B"]) {
      const userName = `sqli${k}_${RUN}`;
      ctx[`store${k}`] = await mkStore(userName);
      ctx[k] = (await call("POST", "/users/login", { body: { userName, password: PW } })).data.token;
    }
    // Cửa hàng "nạn nhân" riêng chỉ dùng cho kịch bản tấn công đăng nhập
    ctx.victim = `victim_${RUN}`;
    await mkStore(ctx.victim);

    // Cửa hàng B có dữ liệu bí mật — tấn công từ cửa hàng A không được thấy
    const p = await call("POST", "/products", {
      token: ctx.B,
      body: { name: `BI_MAT_B_${RUN}`, cost_price: 1, sell_price: 2, stock_quantity: 5 },
    });
    ctx.secretId = p.data.data;
  });

  test("không vượt qua được đăng nhập", async () => {
    // KHÔNG tấn công tài khoản thật (admin...) vì sẽ kích hoạt cơ chế khoá tài khoản.
    // Dùng tài khoản "nạn nhân" riêng và thử ít hơn ngưỡng khoá (LOGIN_MAX_FAILED = 5).
    const attempts = [
      // Payload ở tên đăng nhập (vượt qua bằng cách làm điều kiện WHERE luôn đúng)
      ...PAYLOADS.map((p) => ({ userName: p, password: p })),
      // Payload ở mật khẩu của một tài khoản có thật
      ...["' OR '1'='1", "' OR 1=1-- -", "\" OR \"\"=\"", "') OR ('1'='1"].map((p) => ({ userName: ctx.victim, password: p })),
    ];
    for (const body of attempts) {
      const r = await call("POST", "/users/login", { body });
      assertSafe(r, `login ${JSON.stringify(body)}`);
      assert.notEqual(r.status, 200, `Đăng nhập thành công với ${JSON.stringify(body)}`);
      assert.equal(r.data.token, undefined);
    }
    // Tài khoản nạn nhân vẫn đăng nhập bình thường bằng mật khẩu đúng (chưa bị khoá)
    const ok = await call("POST", "/users/login", { body: { userName: ctx.victim, password: PW } });
    assert.equal(ok.status, 200);
  });

  test("tham số tìm kiếm / lọc / phân trang trên URL", async () => {
    const params = [
      "/orders?q=",
      "/orders?status=",
      "/orders?from=",
      "/orders?to=",
      "/orders?page=",
      "/orders?limit=",
      "/imports?from=",
      "/imports?to=",
      "/dashboard/low-stock?threshold=",
      ["/admin/stores?q=", "admin"],
      ["/admin/stores?status=", "admin"],
      ["/admin/stores?page=", "admin"],
      ["/admin/audit-logs?store_id=", "admin"],
      ["/admin/audit-logs?limit=", "admin"],
    ];
    for (const p of PAYLOADS) {
      for (const entry of params) {
        const [prefix, who] = Array.isArray(entry) ? entry : [entry, "A"];
        const r = await call("GET", prefix + encodeURIComponent(p), { token: ctx[who] });
        assertSafe(r, `GET ${prefix}${p}`);
        assert.ok([200, 400].includes(r.status), `GET ${prefix}${p} → ${r.status}`);
        // Nếu trả 200 thì không được rò dữ liệu cửa hàng B
        assert.doesNotMatch(r.text, new RegExp(`BI_MAT_B_${RUN}`), `Rò dữ liệu cửa hàng khác qua ${prefix}`);
      }
    }
  });

  test("tìm theo mã hoá đơn: payload chỉ được coi là chữ, không trả về toàn bộ dữ liệu", async () => {
    await call("POST", "/products", {
      token: ctx.A,
      body: { name: "Hàng thật", cost_price: 1, sell_price: 2, stock_quantity: 10 },
    });
    for (const p of ["%", "_", "%' OR '%'='", "' OR 1=1-- -"]) {
      const r = await call("GET", `/orders?q=${encodeURIComponent(p)}`, { token: ctx.A });
      assertSafe(r, `q=${p}`);
      if (r.status === 200) assert.equal(r.data.total, 0, `q=${p} không được khớp mọi hoá đơn`);
    }
  });

  test("ID trên đường dẫn", async () => {
    for (const p of PAYLOADS) {
      for (const [m, prefix, suffix, who] of [
        ["GET", "/products/", ""],
        ["PUT", "/products/", ""],
        ["DELETE", "/products/", ""],
        ["GET", "/orders/", ""],
        ["POST", "/orders/", "/cancel"],
        ["GET", "/imports/", ""],
        ["GET", "/admin/stores/", "", "admin"],
        ["PUT", "/admin/stores/", "", "admin"],
        ["PATCH", "/admin/stores/", "/status", "admin"],
        ["POST", "/admin/stores/", "/reset-password", "admin"],
      ]) {
        const r = await call(m, prefix + encodeURIComponent(p) + suffix, {
          token: ctx[who || "A"],
          body: m === "GET" || m === "DELETE" ? undefined : { name: "x", cost_price: 1, sell_price: 1, stock_quantity: 1, reason: "abc", is_active: true, newPassword: PW, storeName: "x" },
        });
        assertSafe(r, `${m} ${prefix}${p}${suffix}`);
        assert.ok([400, 404].includes(r.status), `${m} ${prefix}${p}${suffix} → ${r.status}`);
      }
    }
  });

  test("dữ liệu trong body được lưu nguyên văn, không bị thực thi", async () => {
    for (const p of PAYLOADS) {
      const name = p.slice(0, 200);
      const r = await call("POST", "/products", {
        token: ctx.A,
        body: { name, cost_price: 1, sell_price: 2, stock_quantity: 1 },
      });
      assertSafe(r, `POST /products name=${p}`);
      assert.equal(r.status, 201);
      const back = await call("GET", `/products/${r.data.data}`, { token: ctx.A });
      assert.equal(back.data.data.name, name, "Dữ liệu đọc lại phải giống hệt dữ liệu đã gửi");

      const cat = await call("POST", "/products/categories", { token: ctx.A, body: { name: `${p.slice(0, 80)}#${RUN}` } });
      assertSafe(cat, `POST /categories name=${p}`);

      const imp = await call("POST", "/imports/create", {
        token: ctx.A,
        body: { supplier_name: p, note: p, items: [{ product_id: r.data.data, quantity: 1, price: 1 }] },
      });
      assertSafe(imp, `POST /imports supplier=${p}`);
      assert.equal(imp.status, 201);
      const detail = await call("GET", `/imports/${imp.data.importOrderId}`, { token: ctx.A });
      assert.equal(detail.data.supplier_name, p);
    }
    // Admin: tên & địa chỉ cửa hàng chứa payload → lưu nguyên văn
    for (const [i, p] of PAYLOADS.slice(0, 5).entries()) {
      const c = await call("POST", "/admin/stores", {
        token: ctx.admin,
        body: { userName: `body${i}_${RUN}`, password: PW, storeName: p, address: p },
      });
      assertSafe(c, `POST /admin/stores storeName=${p}`);
      assert.equal(c.status, 201);
      const back = await call("GET", `/admin/stores/${c.data.storeId}`, { token: ctx.admin });
      assert.equal(back.data.data.store_name, p);
      assert.equal(back.data.data.address, p);
    }
  });

  test("các trường số / mã trong body bị từ chối khi chứa payload", async () => {
    for (const p of PAYLOADS) {
      const cases = [
        ["POST", "/products", { name: "x", barcode: p, cost_price: 1, sell_price: 2, stock_quantity: 1 }],
        ["POST", "/products", { name: "x", cost_price: p, sell_price: 2, stock_quantity: 1 }],
        ["POST", "/products", { name: "x", category_id: p, cost_price: 1, sell_price: 2, stock_quantity: 1 }],
        ["POST", "/orders/create", { items: [{ product_id: p, quantity: 1 }] }],
        ["POST", "/orders/create", { items: [{ product_id: 1, quantity: p }] }],
        ["POST", "/orders/create", { items: [{ product_id: 1, quantity: 1 }], payment_method: p }],
        ["POST", "/imports/create", { items: [{ product_id: 1, quantity: 1, price: p }] }],
        ["POST", "/admin/stores", { userName: p, password: PW, storeName: "x" }, "admin"],
        ["POST", "/admin/stores", { userName: `ph_${RUN}`, password: PW, storeName: "x", phone: p }, "admin"],
      ];
      for (const [m, url, body, who] of cases) {
        const r = await call(m, url, { token: ctx[who || "A"], body });
        assertSafe(r, `${m} ${url} ${JSON.stringify(body)}`);
        assert.equal(r.status, 400, `${m} ${url} với payload ${p} → ${r.status}`);
      }
    }
  });

  test("sau toàn bộ cuộc tấn công: DB còn nguyên, dữ liệu cửa hàng khác không bị đụng tới", async () => {
    const h = await call("GET", "/health");
    assert.equal(h.data.db, "ok");
    const secret = await call("GET", `/products/${ctx.secretId}`, { token: ctx.B });
    assert.equal(secret.status, 200);
    assert.equal(secret.data.data.name, `BI_MAT_B_${RUN}`);
    assert.equal(secret.data.data.stock_quantity, 5);
    const list = await call("GET", "/products", { token: ctx.B });
    assert.ok(list.data.data.length >= 1, "Bảng products vẫn còn dữ liệu");
  });
});
