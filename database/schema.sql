-- NongWangJai Dashboard - Full MySQL schema
-- Run: mysql -u root -p < database/schema.sql
-- Charset utf8mb4 รองรับภาษาไทย

CREATE DATABASE IF NOT EXISTS nong_wang_jai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nong_wang_jai;

-- ---------------------------------------------------------------------------
-- Reference: regions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS regions (
  region_id     INT PRIMARY KEY,
  region_name   VARCHAR(64) NOT NULL,
  created_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_region_name (region_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ภูมิภาคของ Dealer';

-- ---------------------------------------------------------------------------
-- Reference: provinces
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS provinces (
  province_id         INT PRIMARY KEY,
  province_bluenet_id VARCHAR(16)  NULL,
  province_name       VARCHAR(64)  NOT NULL,
  region_id           INT          NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_province_name (province_name),
  INDEX idx_region_id (region_id),
  CONSTRAINT fk_provinces_region
    FOREIGN KEY (region_id) REFERENCES regions (region_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='จังหวัดของ Dealer';

-- ---------------------------------------------------------------------------
-- dealers
-- จาก /api/ai-wangjai/dealers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealers (
  dealer_id         BIGINT PRIMARY KEY,
  dealer_code       VARCHAR(32)  NOT NULL,
  dealer_name       VARCHAR(255) NOT NULL,
  osr_dealer        TINYINT(1)   NOT NULL DEFAULT 0,
  osr_dealer_code   VARCHAR(32)  NULL,
  status            VARCHAR(16)  NULL,
  region_id         INT          NULL,
  region            VARCHAR(64)  NULL,
  province_id       INT          NULL,
  province          VARCHAR(64)  NULL,
  group_count       INT          NOT NULL DEFAULT 0,
  volume            DECIMAL(12, 4) NOT NULL DEFAULT 0,
  unit              VARCHAR(16)  NOT NULL DEFAULT 'คิว',
  last_active_at    DATETIME     NULL,
  last_active_days  INT          NULL,
  api_created_at    DATETIME     NULL,
  api_updated_at    DATETIME     NULL,
  row_created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_dealer_code (dealer_code),
  INDEX idx_dealer_code (dealer_code),
  INDEX idx_dealer_name (dealer_name(100)),
  INDEX idx_region_id (region_id),
  INDEX idx_province_id (province_id),
  INDEX idx_status (status),
  INDEX idx_last_active_at (last_active_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Dealer จาก CPAC API';

-- ---------------------------------------------------------------------------
-- dealer_groups
-- จาก /api/ai-wangjai/dealers/{dealerId}/groups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_groups (
  group_id            BIGINT PRIMARY KEY,
  group_name          VARCHAR(255) NOT NULL,
  group_type          VARCHAR(64)  NULL,
  delivered_volume    DECIMAL(12, 4) NOT NULL DEFAULT 0,
  booked_volume       DECIMAL(12, 4) NOT NULL DEFAULT 0,
  unit                VARCHAR(16)  NOT NULL DEFAULT 'คิว',
  price_check_count   INT          NOT NULL DEFAULT 0,
  booking_count       INT          NOT NULL DEFAULT 0,
  status              VARCHAR(16)  NULL,
  api_created_at      DATETIME     NULL,
  api_updated_at      DATETIME     NULL,
  row_created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_group_name (group_name(100)),
  INDEX idx_group_type (group_type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='กลุ่มของ Dealer';

-- ---------------------------------------------------------------------------
-- dealer_group_members
-- many-to-many ระหว่าง dealer กับ group
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_group_members (
  dealer_id   BIGINT NOT NULL,
  group_id    BIGINT NOT NULL,
  joined_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (dealer_id, group_id),
  INDEX idx_group_id (group_id),

  CONSTRAINT fk_dgm_dealer
    FOREIGN KEY (dealer_id) REFERENCES dealers (dealer_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_dgm_group
    FOREIGN KEY (group_id) REFERENCES dealer_groups (group_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ความสัมพันธ์ Dealer กับ Group';

-- ---------------------------------------------------------------------------
-- dealer_usage
-- จาก /api/ai-wangjai/dealers/usage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_usage (
  dealer_id              BIGINT PRIMARY KEY,
  dealer_code            VARCHAR(32)  NOT NULL,
  dealer_name            VARCHAR(255) NOT NULL,
  region_id              INT          NULL,
  region                 VARCHAR(64)  NULL,
  province_id            INT          NULL,
  province               VARCHAR(64)  NULL,
  price_concrete_count   INT          NOT NULL DEFAULT 0,
  booking_create_count   INT          NOT NULL DEFAULT 0,
  customer_create_count  INT          NOT NULL DEFAULT 0,
  api_updated_at         DATETIME     NULL,
  row_created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dealer_code (dealer_code),
  INDEX idx_region_id (region_id),
  INDEX idx_province_id (province_id),

  CONSTRAINT fk_du_dealer
    FOREIGN KEY (dealer_id) REFERENCES dealers (dealer_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='สถิติการใช้งานของ Dealer';

-- ---------------------------------------------------------------------------
-- customer_usage
-- จาก /api/ai-wangjai/dealers/{dealerId}/customers/usage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_usage (
  customer_usage_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
  dealer_id             BIGINT       NOT NULL,
  dealer_code           VARCHAR(32)  NULL,
  dealer_name           VARCHAR(255) NULL,
  customer_id           BIGINT       NOT NULL,
  customer_code         VARCHAR(32)  NOT NULL,
  customer_name         VARCHAR(255) NOT NULL,
  price_concrete_count  INT          NOT NULL DEFAULT 0,
  booking_create_count  INT          NOT NULL DEFAULT 0,
  api_updated_at        DATETIME     NULL,
  row_created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_dealer_customer (dealer_id, customer_id),
  INDEX idx_dealer_id (dealer_id),
  INDEX idx_customer_id (customer_id),
  INDEX idx_customer_code (customer_code),
  INDEX idx_customer_name (customer_name(100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='สถิติการใช้งานของลูกค้าในแต่ละ Dealer';

-- ---------------------------------------------------------------------------
-- dealer_sites
-- จาก /api/ai-wangjai/dealers/{dealerId}/sites
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dealer_sites (
  site_id             BIGINT PRIMARY KEY,
  dealer_id           BIGINT       NULL,
  dealer_code         VARCHAR(32)  NULL,
  dealer_name         VARCHAR(255) NULL,
  site_code           VARCHAR(32)  NOT NULL,
  site_name           VARCHAR(255) NOT NULL,
  province_id         INT          NULL,
  province_bluenet_id VARCHAR(16)  NULL,
  province_name       VARCHAR(64)  NULL,
  region_id           INT          NULL,
  region              VARCHAR(64)  NULL,
  customer_id         BIGINT       NULL,
  customer_code       VARCHAR(32)  NULL,
  customer_name       VARCHAR(255) NULL,
  total_ordered       DECIMAL(12, 4) NOT NULL DEFAULT 0,
  total_delivered     DECIMAL(12, 4) NOT NULL DEFAULT 0,
  unit                VARCHAR(16)  NOT NULL DEFAULT 'คิว',
  last_pour_datetime  DATETIME     NULL,
  status              VARCHAR(16)  NULL,
  api_created_at      DATETIME     NULL,
  api_updated_at      DATETIME     NULL,
  row_created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_dealer_id (dealer_id),
  INDEX idx_dealer_code (dealer_code),
  INDEX idx_site_code (site_code),
  INDEX idx_site_name (site_name(100)),
  INDEX idx_customer_id (customer_id),
  INDEX idx_province_id (province_id),
  INDEX idx_region_id (region_id),
  INDEX idx_last_pour (last_pour_datetime)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='ไซต์งานของ Dealer';

-- ---------------------------------------------------------------------------
-- so_orders
-- raw data จาก /api/ai-wangjai/so-orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS so_orders (
  so_id                     BIGINT PRIMARY KEY,
  project_id                BIGINT          NULL,
  qo_id                     BIGINT          NULL,
  truck_queue_id            BIGINT          NULL,
  sale_order_id             VARCHAR(64)     NULL,
  temp_sale_order_id        VARCHAR(64)     NULL,
  sale_order_num            BIGINT          NULL,
  dispatch_code             VARCHAR(32)     NULL,

  -- Ship-to (ไซต์/ลูกค้าที่รับของ)
  ship_to_comp_code         VARCHAR(32)     NULL,
  ship_to_code              VARCHAR(32)     NOT NULL,
  ship_to_name              VARCHAR(255)    NULL,
  ship_to_lat               DECIMAL(10, 7)  NULL,
  ship_to_lng               DECIMAL(10, 7)  NULL,

  -- Sold-to (ลูกค้าหลัก)
  sold_to_code              VARCHAR(32)     NULL,
  sold_to_name              VARCHAR(255)    NULL,
  sold_to_mobile            VARCHAR(32)     NULL,
  sold_to_telephone         VARCHAR(32)     NULL,
  sold_to_sale_type         VARCHAR(32)     NULL,

  -- Sub sold-to
  sub_sold_to_code          VARCHAR(32)     NULL,
  sub_sold_to_name          VARCHAR(255)    NULL,
  sub_sold_to_mobile        VARCHAR(32)     NULL,
  sub_sold_to_telephone     VARCHAR(32)     NULL,

  -- Quantity
  initial_order_quantity    DECIMAL(12, 4)  NULL,
  current_order_quantity    DECIMAL(12, 4)  NOT NULL DEFAULT 0,
  approve_order_quantity    DECIMAL(12, 4)  NULL,

  -- Status / Booking
  current_status            VARCHAR(16)     NULL,
  book_by_name              VARCHAR(255)    NULL,
  book_by_phone_number      VARCHAR(32)     NULL,

  -- Dates
  document_date             DATE            NULL,
  delivery_date_time        DATETIME        NULL,

  -- Truck / Unload
  truck_type                VARCHAR(16)     NULL,
  truck_service             VARCHAR(64)     NULL,
  unload_id                 VARCHAR(16)     NULL,
  unload_method             VARCHAR(64)     NULL,
  unload_time_duration_per_truck VARCHAR(16) NULL,

  -- Notes
  memo                      TEXT            NULL,
  internal_note             TEXT            NULL,

  -- Transport rate
  transport_rate_quantity   DECIMAL(12, 4)  NULL,
  transport_rate_time       INT             NULL,

  -- QC
  request_qc_sampling_concrete CHAR(1)      NULL,
  request_qc_service_on_site   CHAR(1)      NULL,
  qc_person_number          VARCHAR(8)      NULL,

  -- Franchisee / Material / Structure
  franchisee_code           VARCHAR(32)     NULL,
  material_code             VARCHAR(32)     NULL,
  material_description      VARCHAR(255)    NULL,
  comp_group                VARCHAR(32)     NULL,
  sale_order_type           VARCHAR(32)     NULL,
  structure_id              VARCHAR(16)     NULL,
  structure_name            VARCHAR(64)     NULL,
  groupline_id              BIGINT          NULL,

  -- Source / Loop flags
  create_form_wangjai       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = Full Loop, 0 = ไม่ Full Loop',
  create_form               VARCHAR(32)     NULL COMMENT 'เช่น Wang Jai, Other',
  is_test                   TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '1 = test order, 0 = production order',

  -- Row metadata
  api_created_at            DATETIME        NULL COMMENT 'created_at จาก upstream',
  api_modified_at           DATETIME        NULL COMMENT 'modify_at จาก upstream',
  row_created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_document_date (document_date),
  INDEX idx_delivery_date_time (delivery_date_time),
  INDEX idx_ship_to_code (ship_to_code),
  INDEX idx_ship_to_name (ship_to_name(100)),
  INDEX idx_sold_to_code (sold_to_code),
  INDEX idx_create_form (create_form),
  INDEX idx_create_form_wangjai (create_form_wangjai),
  INDEX idx_is_test (is_test),
  INDEX idx_material_code (material_code),
  INDEX idx_current_status (current_status),
  INDEX idx_sale_order_id (sale_order_id),
  INDEX idx_full_loop_combo (create_form, create_form_wangjai),
  INDEX idx_region_date (ship_to_code, document_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='SO Orders ดิบจาก CPAC API';

-- ---------------------------------------------------------------------------
-- orders_normalized
-- canonical OrderItem หลัง normalize จาก so_orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders_normalized (
  order_id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  so_id             BIGINT          NULL,
  dealer_id         BIGINT          NULL,
  dealer_code       VARCHAR(32)     NOT NULL,
  dealer_name       VARCHAR(255)    NOT NULL,
  customer_id       BIGINT          NULL,
  customer_code     VARCHAR(32)     NULL,
  customer_name     VARCHAR(255)    NULL,
  customer_phone    VARCHAR(32)     NULL,
  site_id           BIGINT          NULL,
  site_code         VARCHAR(32)     NULL,
  site_name         VARCHAR(255)    NULL,
  order_no          VARCHAR(64)     NULL,
  product_sku       VARCHAR(32)     NULL,
  product_name      VARCHAR(255)    NULL,
  ordered_quantity  DECIMAL(12, 4)  NOT NULL DEFAULT 0,
  delivered_quantity DECIMAL(12, 4) NOT NULL DEFAULT 0,
  unit              VARCHAR(16)     NOT NULL DEFAULT 'คิว',
  full_loop         TINYINT(1)      NOT NULL DEFAULT 0,
  order_status      VARCHAR(16)     NULL,
  pour_datetime     DATETIME        NULL,
  created_at        DATETIME        NULL,
  updated_at        DATETIME        NULL,
  row_created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  row_updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_so_id (so_id),
  INDEX idx_dealer_id (dealer_id),
  INDEX idx_dealer_code (dealer_code),
  INDEX idx_customer_code (customer_code),
  INDEX idx_site_code (site_code),
  INDEX idx_order_no (order_no),
  INDEX idx_pour_datetime (pour_datetime),
  INDEX idx_full_loop (full_loop),
  INDEX idx_order_status (order_status),

  CONSTRAINT fk_orders_dealer
    FOREIGN KEY (dealer_id) REFERENCES dealers (dealer_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_orders_site
    FOREIGN KEY (site_id) REFERENCES dealer_sites (site_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_orders_so
    FOREIGN KEY (so_id) REFERENCES so_orders (so_id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Orders หลัง normalize เพื่อใช้ใน Dashboard';
