-- =====================================================================
--  UniPOS — Phần mềm quản lý đa cửa hàng
--  Schema MySQL 8.0 (utf8mb4). Chạy tự động lần đầu khi container MySQL
--  khởi tạo volume trống (thư mục /docker-entrypoint-initdb.d).
-- =====================================================================
SET NAMES utf8mb4;
SET time_zone = '+07:00';

CREATE TABLE IF NOT EXISTS stores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  store_code  VARCHAR(20)  NOT NULL,
  store_name  VARCHAR(150) NOT NULL,
  address     VARCHAR(255) NULL,
  phone       VARCHAR(20)  NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_store_code (store_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  store_id         INT NULL,
  username         VARCHAR(50)  NOT NULL,
  password         VARCHAR(255) NOT NULL,
  full_name        VARCHAR(100) NULL,
  -- super_admin: quản trị hệ thống (không thuộc cửa hàng nào)
  -- store_admin: tài khoản duy nhất của một cửa hàng, dùng chung cho cả cửa hàng
  role             ENUM('super_admin','store_admin') NOT NULL DEFAULT 'store_admin',
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  failed_attempts  INT          NOT NULL DEFAULT 0,
  locked_until     DATETIME     NULL,
  password_changed_at DATETIME  NULL,
  -- Tăng mỗi khi đổi/đặt lại mật khẩu → mọi access token cũ mất hiệu lực ngay lập tức
  token_version    INT          NOT NULL DEFAULT 0,
  last_login_at    DATETIME     NULL,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_username (username),
  -- Mỗi cửa hàng đúng 1 tài khoản (MySQL cho phép nhiều NULL → nhiều super_admin vẫn hợp lệ)
  UNIQUE KEY uq_users_store (store_id),
  CONSTRAINT fk_users_store FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh token được lưu dạng băm SHA-256 để có thể xoay vòng & thu hồi
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT          NOT NULL,
  token_hash   CHAR(64)     NOT NULL,
  family_id    CHAR(36)     NOT NULL,
  expires_at   DATETIME     NOT NULL,
  revoked_at   DATETIME     NULL,
  created_ip   VARCHAR(64)  NULL,
  user_agent   VARCHAR(255) NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_token_hash (token_hash),
  KEY idx_rt_user (user_id),
  KEY idx_rt_family (family_id),
  CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  store_id   INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_category_store_name (store_id, name),
  CONSTRAINT fk_categories_store FOREIGN KEY (store_id) REFERENCES stores(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  store_id        INT            NOT NULL,
  category_id     INT            NULL,
  name            VARCHAR(200)   NOT NULL,
  barcode         VARCHAR(50)    NULL,
  cost_price      DECIMAL(15,2)  NOT NULL DEFAULT 0,
  sell_price      DECIMAL(15,2)  NOT NULL DEFAULT 0,
  stock_quantity  INT            NOT NULL DEFAULT 0,
  is_active       TINYINT(1)     NOT NULL DEFAULT 1,
  -- Cột sinh tự động: barcode chỉ cần duy nhất giữa các sản phẩm còn hoạt động
  active_barcode  VARCHAR(50) GENERATED ALWAYS AS (IF(is_active = 1, barcode, NULL)) STORED,
  created_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_store_barcode (store_id, active_barcode),
  KEY idx_products_store_active (store_id, is_active),
  CONSTRAINT fk_products_store FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT chk_stock_non_negative CHECK (stock_quantity >= 0),
  CONSTRAINT chk_prices_non_negative CHECK (cost_price >= 0 AND sell_price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  store_id        INT           NOT NULL,
  order_code      VARCHAR(40)   NOT NULL,
  user_id         INT           NOT NULL,
  customer_id     INT           NULL,
  total_amount    DECIMAL(15,2) NOT NULL,
  payment_method  ENUM('cash','transfer','card') NOT NULL DEFAULT 'cash',
  status          ENUM('completed','cancelled') NOT NULL DEFAULT 'completed',
  note            VARCHAR(255)  NULL,
  cancelled_by    INT           NULL,
  cancelled_at    DATETIME      NULL,
  cancel_reason   VARCHAR(255)  NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_order_code (order_code),
  KEY idx_orders_store_created (store_id, created_at),
  CONSTRAINT fk_orders_store FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT chk_order_total CHECK (total_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_details (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT           NOT NULL,
  product_id  INT           NOT NULL,
  quantity    INT           NOT NULL,
  price       DECIMAL(15,2) NOT NULL,
  cost_price  DECIMAL(15,2) NOT NULL DEFAULT 0,  -- giá vốn tại thời điểm bán → lợi nhuận chính xác
  subtotal    DECIMAL(15,2) NOT NULL,
  KEY idx_od_order (order_id),
  KEY idx_od_product (product_id),
  CONSTRAINT fk_od_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_od_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_od_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_orders (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  store_id      INT           NOT NULL,
  order_code    VARCHAR(40)   NOT NULL,
  user_id       INT           NOT NULL,
  supplier_id   INT           NULL,
  supplier_name VARCHAR(150)  NULL,
  note          VARCHAR(255)  NULL,
  total_amount  DECIMAL(15,2) NOT NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_import_code (order_code),
  KEY idx_imports_store_created (store_id, created_at),
  CONSTRAINT fk_imports_store FOREIGN KEY (store_id) REFERENCES stores(id),
  CONSTRAINT fk_imports_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS import_order_details (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  import_order_id  INT           NOT NULL,
  product_id       INT           NOT NULL,
  quantity         INT           NOT NULL,
  price            DECIMAL(15,2) NOT NULL,
  subtotal         DECIMAL(15,2) NOT NULL,
  KEY idx_iod_import (import_order_id),
  CONSTRAINT fk_iod_import FOREIGN KEY (import_order_id) REFERENCES import_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_iod_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT chk_iod_qty CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nhật ký thao tác (ai làm gì, lúc nào)
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  store_id    INT          NULL,
  user_id     INT          NULL,
  action      VARCHAR(50)  NOT NULL,
  entity      VARCHAR(50)  NULL,
  entity_id   VARCHAR(50)  NULL,
  detail      JSON         NULL,
  ip          VARCHAR(64)  NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_store_created (store_id, created_at),
  KEY idx_audit_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
