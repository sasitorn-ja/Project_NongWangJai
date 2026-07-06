-- Fix / recreate nongwangjai_app@% user with correct password and privileges
-- Run this on the MySQL server at 192.168.1.196:3306 as root or admin

-- Drop existing user to avoid host/password mismatch
DROP USER IF EXISTS 'nongwangjai_app'@'%';

-- Recreate user with the password used by the app
CREATE USER 'nongwangjai_app'@'%'
  IDENTIFIED BY 'NongwangJ4I@CPAC_2026';

-- Grant CRUD privileges on nong_wang_jai database only
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE TEMPORARY TABLES, EXECUTE, SHOW VIEW
  ON nong_wang_jai.*
  TO 'nongwangjai_app'@'%';

FLUSH PRIVILEGES;

-- Verify
SELECT user, host FROM mysql.user WHERE user = 'nongwangjai_app';
SHOW GRANTS FOR 'nongwangjai_app'@'%';
