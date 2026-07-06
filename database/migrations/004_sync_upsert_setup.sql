-- Migration: Prepare schema for upsert sync (no DELETE/TRUNCATE needed)
-- Run this as root/admin on the MySQL server at 192.168.1.196

-- 1. Remove FK from dealer_sites to dealers (sites may reference dealers outside cutoff filter)
SET @fk_site_dealer = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'dealer_sites'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME = 'fk_sites_dealer'
);
SET @sql = IF(@fk_site_dealer IS NOT NULL,
  'ALTER TABLE dealer_sites DROP FOREIGN KEY fk_sites_dealer',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Remove FK from customer_usage to dealers
SET @fk_cu_dealer = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_usage'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME = 'fk_cu_dealer'
);
SET @sql = IF(@fk_cu_dealer IS NOT NULL,
  'ALTER TABLE customer_usage DROP FOREIGN KEY fk_cu_dealer',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Add unique key on customer_usage for upsert
SET @uk = (
  SELECT CONSTRAINT_NAME
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'customer_usage'
    AND CONSTRAINT_TYPE = 'UNIQUE'
    AND CONSTRAINT_NAME = 'uk_dealer_customer'
);
SET @sql = IF(@uk IS NULL,
  'ALTER TABLE customer_usage ADD UNIQUE KEY uk_dealer_customer (dealer_id, customer_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
