<p align="center">
  <img src="my-store-app/frontend/src/assets/icon/iconLogo.svg" width="96" alt="UniPOS">
</p>

<h1 align="center">UniPOS</h1>
<p align="center"><b>Quản lý đa cửa hàng • Tối ưu vận hành</b></p>

**UniPOS** là phần mềm quản lý **kho hàng, bán hàng (POS), nhập hàng và báo cáo doanh thu** cho cửa hàng bán lẻ.

**Mô hình:** mỗi cửa hàng là **một tài khoản độc lập**. Cửa hàng tự quyết định bán mặt hàng gì: tự tạo danh mục, sản phẩm, giá. Mọi cửa hàng dùng **cùng một bộ tính năng**. Một hệ thống phục vụ nhiều cửa hàng; dữ liệu mỗi cửa hàng được cách ly hoàn toàn, cửa hàng này không thấy dữ liệu của cửa hàng khác. Không có khái niệm chuỗi hay chi nhánh.

> Tên thương hiệu, khẩu hiệu: `frontend/src/config/brand.js` · Màu: `frontend/tailwind.config.js` (`brand`, `accent`, `growth`) · Logo: `frontend/src/assets/icon/iconLogo.svg`, favicon: `frontend/public/favicon.svg`.

- **Frontend:** React 19 + Vite + Tailwind CSS, phục vụ bởi Nginx
- **Backend:** Node.js 22 + Express 5, xác thực JWT
- **CSDL:** MySQL 8.0
- **Triển khai:** Docker Compose (kèm HTTPS tự động bằng Caddy, sao lưu tự động)

---

## Mục lục

1. [Tính năng](#1-tính-năng)
2. [Kiến trúc](#2-kiến-trúc)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Chạy thử nhanh bằng Docker](#4-chạy-thử-nhanh-bằng-docker)
5. [Triển khai production](#5-triển-khai-production)
6. [Biến môi trường](#6-biến-môi-trường)
7. [Phát triển không dùng Docker](#7-phát-triển-không-dùng-docker)
8. [Kiểm thử](#8-kiểm-thử)
9. [Bảo mật](#9-bảo-mật)
10. [Vận hành](#10-vận-hành)
11. [Tài liệu API](#11-tài-liệu-api)
12. [Xử lý sự cố](#12-xử-lý-sự-cố)
13. [Giới hạn hiện tại & hướng phát triển](#13-giới-hạn-hiện-tại--hướng-phát-triển)

---

## 1. Tính năng

### Phân quyền

Chỉ có **2 loại tài khoản**. Không có tài khoản nhân viên: **mỗi cửa hàng có đúng 1 tài khoản**, dùng chung cho cả cửa hàng. DB ràng buộc `UNIQUE(store_id)`, nên không thể tạo tài khoản thứ hai.

| Chức năng | Admin hệ thống (`super_admin`) | Tài khoản cửa hàng (`store_admin`) |
|---|:---:|:---:|
| Tạo cửa hàng (kèm tài khoản duy nhất của cửa hàng) | ✅ | |
| Danh sách cửa hàng, tìm kiếm, lọc theo trạng thái | ✅ | |
| Sửa thông tin cửa hàng (tên, địa chỉ, SĐT) | ✅ | |
| Khoá / mở khoá cửa hàng (khoá thì đăng xuất ngay, dữ liệu giữ nguyên) | ✅ | |
| Đặt lại mật khẩu tài khoản cửa hàng | ✅ | |
| Nhật ký thao tác toàn hệ thống | ✅ | |
| Bảng điều khiển, báo cáo doanh thu & lợi nhuận | | ✅ |
| Thêm / sửa / xoá sản phẩm, danh mục | | ✅ |
| Bán hàng (POS), quét mã vạch | | ✅ |
| Xem, in, huỷ hoá đơn (huỷ thì hoàn tồn kho) | | ✅ |
| Nhập hàng (cộng kho, tính giá vốn bình quân) | | ✅ |
| Đổi mật khẩu của mình | ✅ | ✅ |

Admin **không** xem hay sửa được sản phẩm, hoá đơn, doanh thu của cửa hàng. Trang quản lý chỉ hiện số sản phẩm, số hoá đơn và lần đăng nhập gần nhất, để hỗ trợ khách.

### Nghiệp vụ chính

- **Bán hàng (POS):** tìm theo tên/mã vạch, quét bằng camera điện thoại hoặc máy quét USB (gõ mã + Enter).
  Không cho thêm vượt số tồn kho. Chọn tiền mặt / chuyển khoản / thẻ.
  **Server tự tính giá và tổng tiền** từ dữ liệu gốc; client chỉ gửi mã sản phẩm và số lượng.
- **Chống bán vượt tồn kho khi nhiều quầy thanh toán cùng lúc:** khoá dòng sản phẩm bằng `SELECT … FOR UPDATE`.
  DB còn có ràng buộc `CHECK (stock_quantity >= 0)`.
- **Hoá đơn:** tra cứu theo mã / ngày / trạng thái, phân trang, in hoá đơn khổ 80mm.
  Huỷ hoá đơn bắt buộc nhập lý do và tự hoàn lại tồn kho.
- **Nhập hàng:** phiếu nhập nhiều dòng, ghi nhà cung cấp và ghi chú, tự cập nhật **giá vốn bình quân gia quyền**.
- **Báo cáo:** doanh thu tổng / hôm nay / 7 ngày / 12 tháng, top sản phẩm bán chạy, cảnh báo sắp hết hàng, xuất PDF.
  Lợi nhuận tính theo **giá vốn tại thời điểm bán**. Hoá đơn đã huỷ không được tính.
- **Kho hàng:** lọc theo danh mục, tìm kiếm, phân trang, xuất CSV (đã chống chèn công thức Excel).
- **Giao diện:** dùng được trên máy tính và điện thoại (thanh điều hướng dưới cùng trên mobile).

---

## 2. Kiến trúc

```
                    Internet (HTTPS 443)
                           │
                ┌──────────▼──────────┐
                │   Caddy (prod)      │  Tự xin/gia hạn chứng chỉ Let's Encrypt, HSTS
                └──────────┬──────────┘
                           │ HTTP nội bộ
                ┌──────────▼──────────┐
                │   web (Nginx)       │  File tĩnh React + /api → backend
                │                     │  CSP, chống clickjacking, gzip, giới hạn tốc độ
                └──────────┬──────────┘
                           │ /api  (cân bằng tải qua DNS nội bộ Docker)
          ┌────────────────┼────────────────┐
  ┌───────▼───────┐ ┌──────▼────────┐       ...   N bản sao (BACKEND_REPLICAS)
  │ backend #1    │ │ backend #2    │  Express: helmet, rate limit, JWT, phân quyền,
  └───────┬───────┘ └──────┬────────┘  kiểm tra dữ liệu, nhật ký thao tác
          └────────┬───────┘
          ┌────────▼────────┐        ┌─────────────────┐
          │  MySQL 8.0 (db) │◄───────│ backup          │  mysqldump định kỳ → ./backups
          └─────────────────┘        └─────────────────┘
```

- Frontend và API **cùng một domain** (Nginx chuyển tiếp `/api`). Vì vậy không cần mở CORS, và cookie phiên dùng được `SameSite=Strict`.
- Backend **không lưu trạng thái**: JWT và refresh token nằm trong DB. Muốn chịu thêm tải thì tăng `BACKEND_REPLICAS`.
- DB **không mở cổng ra ngoài**, chỉ backend và dịch vụ backup truy cập được.

---

## 3. Cấu trúc thư mục

```
QuanLyCuaHang/
├── README.md
├── .github/workflows/ci.yml        # CI: lint, build, kiểm thử API + E2E trên Docker
└── my-store-app/
    ├── docker-compose.yml          # Toàn bộ hệ thống (db, backend, web, backup)
    ├── docker-compose.prod.yml     # Lớp production: Caddy + HTTPS
    ├── .env.example                # Mẫu cấu hình → copy thành .env
    ├── deploy/
    │   ├── caddy/Caddyfile         # Cấu hình HTTPS
    │   └── backup/                 # backup.sh (tự động), restore.sh (khôi phục)
    ├── backend/
    │   ├── server.js               # Khởi tạo Express, middleware bảo mật, health check
    │   ├── createAdmin.js          # Tạo Super Admin đầu tiên từ biến môi trường
    │   ├── config/                 # env.js (kiểm tra cấu hình), db.js (pool MySQL)
    │   ├── db/schema.sql           # Lược đồ CSDL (tự chạy khi DB khởi tạo lần đầu)
    │   ├── middleware/             # auth + phân quyền, rate limit, xử lý lỗi
    │   ├── routes/ controllers/ models/
    │   ├── utils/                  # validators, audit log, logger, HttpError
    │   ├── tests/                  # 57 kiểm thử API (api.test.js, sql-injection.test.js)
    │   └── Dockerfile
    ├── frontend/
    │   ├── src/
    │   │   ├── pages/              # Dashboard, Inventory, POS, Orders, Imports, Report,
    │   │   │                       # UserManagement, Account, Login, NotFound
    │   │   ├── components/         # Navbar, Sidebar, BottomNav, Pagination, ErrorBoundary
    │   │   ├── services/           # axiosClient (tự làm mới phiên), api.js
    │   │   └── utils/              # auth.js (phiên, vai trò), format.js
    │   ├── nginx/                  # Template Nginx + header bảo mật
    │   └── Dockerfile
    └── e2e/
        ├── tests/                  # Kịch bản Playwright (nghiệp vụ, bảo mật, mobile)
        └── load-test.js            # Kiểm thử tải
```

---

## 4. Chạy thử nhanh bằng Docker

**Yêu cầu:** Docker Desktop (Windows/macOS) hoặc Docker Engine + Compose v2 (Linux).

```bash
cd my-store-app
cp .env.example .env
```

Mở `.env` và **đổi toàn bộ mật khẩu và chuỗi bí mật**. Tạo chuỗi ngẫu nhiên bằng một trong hai lệnh:

```bash
openssl rand -hex 48
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Khởi động toàn bộ hệ thống (lần đầu mất vài phút để build):

```bash
docker compose up -d --build
docker compose ps        # các dịch vụ đều "healthy"
```

Mở **http://localhost** (hoặc `http://localhost:<WEB_PORT>`). Đăng nhập bằng `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` đã đặt trong `.env`.

**Quy trình dùng lần đầu:**

1. Admin → **Quản lý cửa hàng** → **Tạo cửa hàng**: nhập thông tin cửa hàng, tên đăng nhập và mật khẩu của cửa hàng. Gửi tài khoản này cho chủ cửa hàng qua kênh an toàn.
2. Đăng nhập bằng tài khoản cửa hàng → **Kho hàng** → tạo danh mục, sản phẩm (cửa hàng tự quyết định bán gì). Có thể vào **Nhập hàng** để cộng thêm tồn kho.
3. **Bán nhanh** để bán hàng; **Hoá đơn** để tra cứu, in, huỷ; **Phân tích** để xem doanh thu.
4. Khi cửa hàng ngừng sử dụng hoặc quên mật khẩu: Admin → **Quản lý cửa hàng** → khoá cửa hàng hoặc đặt lại mật khẩu.

> Camera quét mã vạch chỉ hoạt động trên `https://` hoặc `http://localhost` (quy định của trình duyệt).

Dừng / xoá:

```bash
docker compose down        # dừng, GIỮ dữ liệu
docker compose down -v     # dừng và XOÁ TOÀN BỘ dữ liệu (cẩn thận!)
```

---

## 5. Triển khai production

### 5.1. Chuẩn bị

| Hạng mục | Khuyến nghị |
|---|---|
| Máy chủ | VPS Linux (Ubuntu 22.04/24.04), tối thiểu **2 vCPU / 4 GB RAM / 40 GB SSD** cho khoảng 50 cửa hàng |
| Tên miền | Bản ghi `A` trỏ về IP máy chủ, ví dụ `quanly.tencuahang.vn` |
| Tường lửa | Chỉ mở **22** (SSH, nên giới hạn IP), **80**, **443** |
| SSH | Tắt đăng nhập bằng mật khẩu, chỉ dùng SSH key; tắt đăng nhập `root` |
| Cập nhật | Bật `unattended-upgrades` để tự vá bảo mật hệ điều hành |

```bash
# Cài Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # đăng xuất rồi đăng nhập lại

# Tường lửa
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

### 5.2. Triển khai

```bash
git clone <repo> && cd QuanLyCuaHang/my-store-app
cp .env.example .env && nano .env      # điền DOMAIN, ACME_EMAIL, mật khẩu, bí mật
chmod 600 .env

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Caddy tự xin chứng chỉ HTTPS cho `DOMAIN` (cần cổng 80/443 mở và DNS đã trỏ đúng). Truy cập `https://<DOMAIN>`.

> Có thể đặt bí danh để gõ lệnh ngắn hơn:
> `alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'`

### 5.3. Danh sách kiểm tra trước khi mở cho người dùng thật

- [ ] Mọi mật khẩu và bí mật trong `.env` đều mới, ngẫu nhiên. `JWT_SECRET` khác `JWT_REFRESH_TOKEN`.
- [ ] Đã đăng nhập Super Admin và **đổi mật khẩu** ngay lần đầu.
- [ ] `https://<DOMAIN>` có ổ khoá hợp lệ; `http://` tự chuyển sang `https://`.
- [ ] `docker compose ps`: mọi dịch vụ đều `healthy`.
- [ ] Thư mục `backups/` có file mới. Bản sao lưu được **chép ra ngoài máy chủ** (xem [10.1](#101-sao-lưu--khôi-phục)).
- [ ] Đã **thử khôi phục** một bản sao lưu ít nhất một lần.
- [ ] Đã cài giám sát uptime cho `https://<DOMAIN>/api/health` (UptimeRobot, BetterStack…).
- [ ] `MYSQL_BUFFER_POOL` chỉnh theo RAM máy chủ (khoảng 50–70% RAM dành cho MySQL).

---

## 6. Biến môi trường

Khai báo trong `my-store-app/.env` (xem `.env.example`).

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `quanlycuahang` / `app` / — | Tài khoản MySQL dùng cho ứng dụng (chỉ có quyền trên DB này) |
| `MYSQL_ROOT_PASSWORD` | — | Mật khẩu root MySQL (dùng cho sao lưu / quản trị) |
| `MYSQL_BUFFER_POOL` | `256M` | RAM cho InnoDB |
| `JWT_SECRET` / `JWT_REFRESH_TOKEN` | — | Bí mật ký token, **≥ 32 ký tự, khác nhau** (server từ chối khởi động nếu sai) |
| `JWT_ACCESS_TTL` | `15m` | Thời hạn access token |
| `JWT_REFRESH_TTL_DAYS` | `7` | Thời hạn phiên đăng nhập |
| `SUPER_ADMIN_USERNAME` / `SUPER_ADMIN_PASSWORD` | `admin` / — | Tạo Super Admin ở lần khởi động đầu (bỏ qua nếu đã có) |
| `WEB_PORT` | `80` | Cổng HTTP khi chạy không có Caddy |
| `DOMAIN` / `ACME_EMAIL` | — | Tên miền và email nhận thông báo chứng chỉ, **bắt buộc** khi chạy `docker-compose.prod.yml` |
| `COOKIE_SECURE` | `false` | Cookie chỉ gửi qua HTTPS (prod overlay tự bật `true`) |
| `CORS_ORIGINS` | *(trống)* | Chỉ cần khi frontend chạy ở domain khác API |
| `BACKEND_REPLICAS` | `2` | Số bản sao backend |
| `DB_POOL_SIZE` | `20` | Số kết nối DB mỗi bản sao (tổng phải < `max_connections` = 300) |
| `RATE_LIMIT_API` | `600` | Số request/phút/IP ở backend |
| `RATE_LIMIT_LOGIN` | `10` | Số lần đăng nhập **sai** / 15 phút / (IP + tài khoản) |
| `LOGIN_MAX_FAILED` / `LOGIN_LOCK_MINUTES` | `5` / `15` | Khoá tài khoản sau N lần sai liên tiếp |
| `NGINX_API_RATE` / `NGINX_API_BURST` / `NGINX_LOGIN_RATE` | `50r/s` / `100` / `30r/m` | Giới hạn tốc độ ở Nginx (theo IP) |
| `BACKUP_DIR` / `BACKUP_INTERVAL_HOURS` / `BACKUP_RETENTION_DAYS` | `./backups` / `24` / `14` | Sao lưu tự động |

---

## 7. Phát triển không dùng Docker

Cần Node.js ≥ 20 và MySQL 8.

```bash
# 1. Tạo database
mysql -u root -p -e "CREATE DATABASE quanlycuahang CHARACTER SET utf8mb4;"
mysql -u root -p quanlycuahang < my-store-app/backend/db/schema.sql

# 2. Backend
cd my-store-app/backend
cp .env.example .env          # điền DB_*, JWT_*, SUPER_ADMIN_PASSWORD
npm install
npm run seed:admin
npm run dev                   # http://localhost:8080

# 3. Frontend (terminal khác)
cd my-store-app/frontend
npm install
npm run dev                   # http://localhost:5173, tự proxy /api → :8080
npm run lint
```

### Thay đổi lược đồ CSDL

`db/schema.sql` chỉ tự chạy khi volume MySQL **còn trống** (lần đầu). Khi cần đổi lược đồ trên hệ thống đang chạy:

1. Viết file SQL thay đổi, ví dụ `backend/db/migrations/2026-12-01-them-cot.sql`, dùng `ALTER TABLE …`.
2. **Sao lưu trước**, rồi áp dụng:
   `docker compose exec -T db sh -c 'mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backend/db/migrations/<file>.sql`
3. Cập nhật luôn `schema.sql` để cài mới vẫn có đủ cột.

---

## 8. Kiểm thử

Các bộ kiểm thử chạy trên **hệ thống thật** (Docker), không dùng dữ liệu giả lập.

```bash
cd my-store-app
docker compose up -d --build
```

### 8.1. Kiểm thử API — 57 kịch bản

```bash
cd backend
API_URL=http://localhost/api ADMIN_PASSWORD=<SUPER_ADMIN_PASSWORD> npm test
npm run test:static     # chỉ quét mã nguồn chống SQL injection — không cần server
```

Bao gồm:

- **SQL injection** (`tests/sql-injection.test.js`):
  - **Quét mã nguồn:** mọi `${...}` trong câu SQL phải thuộc danh sách chuỗi cố định cho phép. Không nối câu SQL bằng `+`. Không bật `multipleStatements`.
  - **Tấn công thật:** 15 payload (`' OR 1=1`, `UNION SELECT`, `DROP TABLE`, `SLEEP()`, `extractvalue`…) vào đăng nhập, tham số lọc/tìm kiếm, ID trên đường dẫn và dữ liệu trong body. Kiểm tra: không vượt qua đăng nhập, không lộ lỗi SQL, không bị trễ do `SLEEP`, không rò dữ liệu cửa hàng khác, dữ liệu được lưu nguyên văn, DB còn nguyên sau tấn công.
  - Test tự tạo tài khoản "nạn nhân" riêng, **không tấn công tài khoản thật**, để không kích hoạt cơ chế khoá tài khoản admin.

- **Xác thực:** token giả / `alg=none`, dò tài khoản, khoá sau 5 lần sai, xoay vòng refresh token và phát hiện dùng lại, đăng xuất thu hồi phiên, đổi mật khẩu vô hiệu token cũ, khoá tài khoản.
- **Phân quyền & cách ly:** truy cập chéo cửa hàng (IDOR), danh mục và sản phẩm của cửa hàng khác; tài khoản cửa hàng không gọi được API quản trị; admin không đụng được dữ liệu kinh doanh của cửa hàng.
- **Admin quản lý cửa hàng:** tạo, tìm kiếm, lọc, sửa thông tin, khoá cửa hàng (phiên đang dùng bị từ chối ngay, mở khoá dùng lại được), đặt lại mật khẩu (mọi phiên bị thu hồi); danh sách không lộ doanh thu.
- **Dữ liệu sai:** số âm, số lẻ, `1e3`, quá dài, mã vạch trùng.
- **Bán hàng:** không vượt tồn, server tự tính tiền, **20 đơn đồng thời cho 7 sản phẩm còn lại** → đúng 7 đơn thành công, huỷ đơn hoàn kho.
- **Báo cáo:** nhập hàng tính giá vốn bình quân; báo cáo bỏ qua hoá đơn đã huỷ.

### 8.2. Kiểm thử E2E trên trình duyệt — 22 kịch bản (Playwright)

```bash
cd e2e
npm install
npx playwright install chromium        # nếu máy chưa có Google Chrome
BASE_URL=http://localhost ADMIN_PASSWORD=<...> npx playwright test
# PW_CHANNEL=chromium nếu không dùng Chrome cài sẵn; thêm --headed để xem trình duyệt chạy
npx playwright show-report             # xem báo cáo HTML
```

Bao gồm:

- **Luồng nghiệp vụ đầy đủ:** admin tạo và sửa cửa hàng → tài khoản cửa hàng thêm sản phẩm, nhập hàng, bán hàng (kể cả máy quét USB), in và huỷ hoá đơn → báo cáo đúng → cửa hàng tự đổi mật khẩu → admin khoá cửa hàng (cửa hàng bị đăng xuất ngay) rồi mở khoá → admin đặt lại mật khẩu.
- **Bảo mật:** chuyển hướng `next` an toàn, giả `localStorage`, tự làm mới phiên, cookie HttpOnly, XSS, header bảo mật, 404, F5 trên mọi trang.
- **Mobile:** mọi trang không tràn ngang, bán hàng trên điện thoại.

Kiểm thử trên **bản production có HTTPS** ngay trên máy. Đặt `DOMAIN=localhost` thì Caddy tự cấp chứng chỉ nội bộ. Nếu cổng 80/443 đã bận, đổi cổng của Caddy bằng một file override:

```bash
DOMAIN=localhost ACME_EMAIL=you@example.com docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
cd e2e && IGNORE_HTTPS_ERRORS=1 BASE_URL=https://localhost ADMIN_PASSWORD=<...> npx playwright test
cd ../backend && NODE_TLS_REJECT_UNAUTHORIZED=0 API_URL=https://localhost/api ADMIN_PASSWORD=<...> npm test
```

### 8.3. Kiểm thử tải

Chạy từ một máy nghĩa là chỉ có một IP, nên cần tạm nới giới hạn tốc độ:

```bash
NGINX_API_RATE=100000r/s NGINX_API_BURST=100000 NGINX_LOGIN_RATE=60000r/m \
RATE_LIMIT_API=10000000 RATE_LIMIT_LOGIN=100000 docker compose up -d backend web

cd e2e && VUS=100 DURATION=60 STORES=20 ADMIN_PASSWORD=<...> node load-test.js

# Xong thì trả lại giới hạn mặc định:
cd .. && docker compose up -d backend web
```

**Kết quả đo** trên laptop (Docker Desktop, 2 bản sao backend). Có 100 người dùng đồng thời, mỗi người thao tác liên tục không nghỉ, trên 20 cửa hàng × 50 sản phẩm, trong 60 giây:

| Thao tác | Số request | Lỗi | p50 | p95 | p99 |
|---|---:|---:|---:|---:|---:|
| Xem danh sách hàng | 8.674 | 0 | 244 ms | 448 ms | 522 ms |
| **Thanh toán (tạo hoá đơn)** | **8.674** | **0** | 314 ms | 554 ms | 698 ms |
| Lịch sử hoá đơn | 2.667 | 0 | 244 ms | 460 ms | 537 ms |
| Báo cáo tổng quan | 1.666 | 0 | 248 ms | 467 ms | 562 ms |

- **≈ 358 request/giây, ≈ 143 hoá đơn/giây, tỉ lệ lỗi 0%.**
- Sau bài test, tồn kho bị trừ (17.357) **khớp tuyệt đối** với tổng số lượng đã bán. Không có tổng tiền sai, không trùng mã hoá đơn, không có tồn kho âm.
- Một cửa hàng thật thao tác khoảng 10–30 giây/lần. Vì vậy mức tải này tương đương **vài nghìn cửa hàng đang bán hàng cùng lúc**.
  Khi cần thêm, tăng `BACKEND_REPLICAS`, RAM cho MySQL, hoặc nâng cấp máy chủ.

### 8.4. CI

`.github/workflows/ci.yml` chạy mỗi lần push hoặc Pull Request: lint, build, kiểm tra lỗ hổng thư viện, dựng Docker, kiểm thử API và E2E.

---

## 9. Bảo mật

| Lớp | Cơ chế |
|---|---|
| **Mạng** | HTTPS + HSTS (Caddy), DB không mở cổng ra ngoài, container chạy **không phải root**, filesystem chỉ đọc, `no-new-privileges` |
| **Header** | CSP chặt (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, ẩn `X-Powered-By` và phiên bản Nginx |
| **Xác thực** | bcrypt (cost 12). Access token 15 phút. Refresh token 7 ngày trong **cookie HttpOnly + SameSite=Strict + Secure**, path `/api/users`. Lưu **dạng băm SHA-256** trong DB, **xoay vòng** mỗi lần dùng, **phát hiện dùng lại** (nghi bị đánh cắp) → thu hồi cả phiên |
| **Thu hồi phiên** | Đăng xuất thu hồi trên server. Đổi/đặt lại mật khẩu tăng `token_version` → mọi token cũ mất hiệu lực. Khoá tài khoản có hiệu lực trong ≤ 10 giây |
| **Chống dò mật khẩu** | Giới hạn tốc độ ở Nginx và Express. Khoá tài khoản 15 phút sau 5 lần sai. Thông báo lỗi giống nhau và thời gian phản hồi như nhau (không dò được tên tài khoản) |
| **Phân quyền** | Kiểm tra ở **backend** cho mọi API. Vai trò và cửa hàng đọc từ DB chứ không tin token. Mọi truy vấn lọc theo `store_id` (chống IDOR). Giao diện ẩn chức năng theo vai trò |
| **Dữ liệu vào** | Kiểm tra kiểu, độ dài, khoảng giá trị cho mọi trường. Câu lệnh SQL tham số hoá (CI tự quét mã nguồn để chặn câu SQL chèn biến trực tiếp). Ràng buộc `CHECK` / `UNIQUE` / `FOREIGN KEY` ở DB. Giới hạn body 100 KB |
| **Nghiệp vụ** | Giá và tổng tiền do server tính. Khoá dòng khi bán đồng thời. Huỷ đơn có lý do và nhật ký. Không xoá cứng hoá đơn |
| **Lỗi** | Không lộ stack trace hay lỗi SQL. Mỗi lỗi 500 trả về `requestId` để tra log |
| **Truy vết** | Bảng `audit_logs`: đăng nhập (thành công/sai), đổi mật khẩu, tạo/khoá tài khoản, thêm/sửa/xoá sản phẩm (kèm giá trị cũ → mới), bán, huỷ, nhập hàng |
| **Frontend** | React tự escape (chống XSS), chuyển hướng `next` chỉ trong nội bộ, CSV chống chèn công thức |
| **Cấu hình** | Server **từ chối khởi động** nếu thiếu biến hoặc bí mật yếu. `.env` không vào Git |
| **Thư viện** | `npm audit`: 0 lỗ hổng ở dependency production (kiểm tra tự động trong CI) |

---

## 10. Vận hành

### 10.1. Sao lưu & khôi phục

- Dịch vụ `backup` tự chạy `mysqldump` **ngay khi khởi động** và sau đó mỗi `BACKUP_INTERVAL_HOURS` giờ.
  File lưu ở `./backups/` và tự xoá sau `BACKUP_RETENTION_DAYS` ngày.
- **Bắt buộc chép bản sao lưu ra ngoài máy chủ.** Máy chủ hỏng hoặc bị xoá thì backup nằm trên đó cũng mất theo. Ví dụ dùng cron và `rclone` lên Google Drive / S3:
  ```
  0 3 * * * rclone copy /path/my-store-app/backups remote:unipos-backups
  ```
- Khôi phục (có hỏi xác nhận, dừng backend trong lúc khôi phục):
  ```bash
  bash deploy/backup/restore.sh backups/quanlycuahang-YYYYmmdd-HHMMSS.sql.gz
  ```
- Nên diễn tập khôi phục định kỳ (mỗi tháng) để chắc chắn bản sao lưu dùng được.

### 10.2. Theo dõi

```bash
docker compose ps                         # trạng thái, health
docker compose logs -f backend            # log JSON: method, path, status, ms, user, requestId
docker compose logs backend | grep '"level":"error"'
docker stats                              # CPU / RAM
curl https://<DOMAIN>/api/health          # {"status":"ok","db":"ok"} — dùng cho giám sát uptime
```

Log mỗi container được xoay vòng tự động (tối đa 5 × 10 MB). Truy vấn chậm hơn 1 giây được MySQL ghi vào slow log.

### 10.3. Cập nhật phiên bản

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Backend tắt an toàn (hoàn tất request đang xử lý). Nginx tự chuyển request sang bản sao còn sống. Đã kiểm chứng: tắt hẳn 1 trong 2 backend, 40/40 request vẫn thành công.

### 10.4. Mở rộng

- Tăng bản sao backend: đặt `BACKEND_REPLICAS=4` trong `.env` rồi `up -d`. Nhớ giữ `BACKEND_REPLICAS × DB_POOL_SIZE < 300`.
- Tăng `MYSQL_BUFFER_POOL` theo RAM.
- Khi vượt quá một máy chủ: chuyển MySQL sang dịch vụ DB có quản lý (có backup và bản sao đọc). Lúc đó đặt `DB_SSL=true`.

---

## 11. Tài liệu API

Mọi API (trừ đăng nhập, làm mới phiên, đăng xuất, health) cần header `Authorization: Bearer <accessToken>`.
Lỗi luôn trả về dạng `{ "message": "..." }`.

| Phương thức | Đường dẫn | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/health` | công khai | Kiểm tra server + DB |
| POST | `/api/users/login` | công khai | `{userName, password}` → `{token, user}` + cookie phiên |
| POST | `/api/users/refresh-token` | cookie | Cấp access token mới (xoay vòng cookie) |
| POST | `/api/users/logout` | cookie | Thu hồi phiên |
| GET | `/api/users/me` | đăng nhập | Thông tin tài khoản |
| POST | `/api/users/change-password` | đăng nhập | `{currentPassword, newPassword}` |
| GET | `/api/admin/stores?q&status&page&limit` | super_admin | Danh sách cửa hàng + tài khoản + số sản phẩm / hoá đơn (không có doanh thu) |
| POST | `/api/admin/stores` | super_admin | Tạo cửa hàng + tài khoản duy nhất: `{storeName, address, phone, userName, password, fullName}` |
| GET | `/api/admin/stores/:id` | super_admin | Chi tiết cửa hàng |
| PUT | `/api/admin/stores/:id` | super_admin | Sửa `{storeName, address, phone}` |
| PATCH | `/api/admin/stores/:id/status` | super_admin | `{is_active: true/false}` — khoá thì thu hồi mọi phiên |
| POST | `/api/admin/stores/:id/reset-password` | super_admin | `{newPassword}` — thu hồi mọi phiên |
| GET | `/api/admin/audit-logs?store_id&page&limit` | super_admin | Nhật ký thao tác |
| GET | `/api/products` | store_admin | Danh sách sản phẩm |
| GET | `/api/products/:id` | store_admin | Chi tiết sản phẩm |
| POST / PUT / DELETE | `/api/products[/:id]` | store_admin | Thêm / sửa / xoá mềm |
| GET / POST | `/api/products/categories` | store_admin | Danh mục |
| POST | `/api/orders/create` | store_admin | `{items:[{product_id, quantity}], payment_method}` |
| GET | `/api/orders?page&limit&from&to&status&q` | store_admin | Danh sách hoá đơn |
| GET | `/api/orders/:id` | store_admin | Chi tiết hoá đơn |
| POST | `/api/orders/:id/cancel` | store_admin | `{reason}`, hoàn tồn kho |
| POST | `/api/imports/create` | store_admin | `{items:[{product_id, quantity, price}], supplier_name, note}` |
| GET | `/api/imports[/:id]` | store_admin | Lịch sử / chi tiết phiếu nhập |
| GET | `/api/dashboard/low-stock?threshold=20` | store_admin | Sắp hết hàng |
| GET | `/api/dashboard/{overview,top-products,weekly-revenue,monthly-revenue,recent-activity}` | store_admin | Báo cáo |

Mã trạng thái thường gặp: `400` dữ liệu sai · `401` chưa đăng nhập / phiên hết hạn · `403` không đủ quyền ·
`404` không tìm thấy (kể cả dữ liệu thuộc cửa hàng khác) · `409` hết hàng / trùng dữ liệu · `423` tài khoản tạm khoá ·
`429` thao tác quá nhanh.

---

## 12. Xử lý sự cố

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Backend khởi động rồi tắt ngay, log `Cấu hình không hợp lệ` | Thiếu biến hoặc bí mật < 32 ký tự / hai bí mật trùng nhau. Sửa `.env` |
| `Chưa có Super Admin. Hãy đặt SUPER_ADMIN_PASSWORD` | Lần chạy đầu cần `SUPER_ADMIN_PASSWORD` (≥ 8 ký tự, có chữ và số) |
| Đổi `DB_PASSWORD` trong `.env` nhưng backend báo `Access denied` | MySQL chỉ đọc mật khẩu ở lần khởi tạo volume đầu tiên. Đổi bằng `ALTER USER` trong MySQL, hoặc (khi chưa có dữ liệu) `docker compose down -v` |
| Đăng nhập xong bị đẩy ra ngay, hoặc phiên không giữ được | Đang chạy `http://` nhưng `COOKIE_SECURE=true`. Dùng HTTPS, hoặc đặt `false` khi thử nghiệm nội bộ |
| `423 Tài khoản tạm khoá` | Sai mật khẩu 5 lần. Đợi 15 phút, hoặc nhờ chủ cửa hàng / admin đặt lại mật khẩu |
| `429` khi nhiều quầy dùng chung một mạng | Tăng `NGINX_API_RATE` / `RATE_LIMIT_API` |
| Camera không bật | Cần HTTPS (hoặc `localhost`) và cấp quyền camera. Vẫn có thể gõ tên hoặc dùng máy quét USB |
| Caddy không xin được chứng chỉ | DNS chưa trỏ về server, hoặc cổng 80/443 bị chặn. Xem `docker compose logs caddy` |
| Lỗi 500 trên giao diện | Tìm `requestId` trong log: `docker compose logs backend \| grep <requestId>` |

---

## 13. Giới hạn hiện tại & hướng phát triển

- **Hoá đơn điện tử theo quy định thuế:** chưa tích hợp. Hoá đơn in ra hiện là phiếu bán hàng nội bộ.
- **Bán khi mất mạng:** POS cần kết nối tới máy chủ.
- **Khách hàng / nhà cung cấp:** mới lưu tên nhà cung cấp trên phiếu nhập; chưa có danh bạ khách hàng hay tích điểm.
- **Trả hàng một phần:** hiện chỉ huỷ được cả hoá đơn.
- **Quên mật khẩu qua email/SMS:** chưa có; hiện chủ cửa hàng hoặc admin đặt lại giúp.
- **Giới hạn tốc độ:** đếm riêng trong từng bản sao backend. Khoá tài khoản thì dùng chung vì lưu trong DB.
- Nếu lưu thông tin cá nhân khách hàng, cần tuân thủ **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân.
