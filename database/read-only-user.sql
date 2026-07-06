-- NongWangJai Dashboard - Read-only database user
-- สร้าง user สำหรับอ่านข้อมูล dashboard (SELECT + SHOW VIEW)

-- ---------------------------------------------------------------------------
-- เปลี่ยน password ก่อนใช้งานจริง
-- ---------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'nongwangjai_reader'@'%'
  IDENTIFIED BY 'ChangeMeToStrongPassword123!';

-- สิทธิ์อ่านทุก table/view ใน database nong_wang_jai
GRANT SELECT, SHOW VIEW ON nong_wang_jai.*
  TO 'nongwangjai_reader'@'%';

FLUSH PRIVILEGES;

-- ---------------------------------------------------------------------------
-- ตัวอย่าง user สำหรับ sync/write (ถ้าต้องการให้ app เขียนข้อมูล)
-- ---------------------------------------------------------------------------
-- CREATE USER IF NOT EXISTS 'nongwangjai_writer'@'%'
--   IDENTIFIED BY 'ChangeMeToStrongPassword456!';
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX
--   ON nong_wang_jai.* TO 'nongwangjai_writer'@'%';
-- FLUSH PRIVILEGES;
