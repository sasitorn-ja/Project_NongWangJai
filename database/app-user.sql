-- NongWangJai Dashboard - Application database user
-- สร้าง user สำหรับ application ที่ต้อง SELECT / INSERT / UPDATE / DELETE
-- ไม่มีสิทธิ์ DROP database หรือจัดการ user

-- เปลี่ยน password ก่อนใช้งานจริง
CREATE USER IF NOT EXISTS 'nongwangjai_app'@'%'
  IDENTIFIED BY 'ChangeMeToStrongPassword123!';

-- CRUD + temporary tables + views + routines บน database nong_wang_jai เท่านั้น
GRANT SELECT, INSERT, UPDATE, DELETE,
      CREATE TEMPORARY TABLES, EXECUTE, SHOW VIEW
  ON nong_wang_jai.*
  TO 'nongwangjai_app'@'%';

FLUSH PRIVILEGES;
