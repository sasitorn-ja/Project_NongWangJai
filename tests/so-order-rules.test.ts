import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { CANCEL_TEST_SO_ORDERS_SQL, COMPLETE_SO_ORDERS_SQL, getSoOrderCompletionCutoff, MARK_WANGJAI_ORDERS_SQL } from "../scripts/lib/so-order-rules.js";

function createDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE dealer_sites (site_code TEXT);
    CREATE TABLE so_orders (
      so_id INTEGER PRIMARY KEY,
      ship_to_code TEXT,
      ship_to_name TEXT,
      create_form TEXT,
      create_form_wangjai INTEGER DEFAULT 0,
      delivery_date_time TEXT,
      current_status TEXT,
      row_created_at TEXT DEFAULT '2025-06-01 00:00:00'
    );
  `);
  return db;
}

test("matching sites mark all stored orders as Wang Jai, including baseline rows", () => {
  const db = createDatabase();
  try {
    db.exec(`
      INSERT INTO dealer_sites VALUES ('SITE-A'), ('SITE-A'), ('SITE-B');
      INSERT INTO so_orders (so_id, ship_to_code, create_form, create_form_wangjai) VALUES
        (1, 'SITE-A', 'Other', 0),
        (2, 'SITE-B', NULL, 0),
        (3, 'UNMATCHED', 'Other', 0),
        (4, 'UPSTREAM-WANGJAI', 'Wang Jai', 1);
    `);
    db.exec(MARK_WANGJAI_ORDERS_SQL);
    const rows = db.prepare("SELECT so_id, create_form, create_form_wangjai FROM so_orders ORDER BY so_id").all();
    assert.deepEqual(rows.map((row) => [row.so_id, row.create_form, row.create_form_wangjai]), [
      [1, "Wang Jai", 1], [2, "Wang Jai", 1], [3, "Other", 0], [4, "Wang Jai", 1]
    ]);
    db.exec(MARK_WANGJAI_ORDERS_SQL);
    assert.deepEqual(db.prepare("SELECT so_id, create_form, create_form_wangjai FROM so_orders ORDER BY so_id").all(), rows);
  } finally {
    db.close();
  }
});

test("completion includes the target day and all older orders, preserving C and newer dates", () => {
  const db = createDatabase();
  try {
    db.exec(`
      INSERT INTO so_orders (so_id, delivery_date_time, current_status) VALUES
        (1, '2026-10-27 00:00:00', 'N'),
        (2, '2026-10-27 23:59:59', 'P'),
        (3, '2026-10-27 12:00:00', 'C'),
        (4, '2026-10-27 12:00:00', NULL),
        (5, '2026-10-27 12:00:00', 'E'),
        (6, '2026-10-26 23:59:59', 'N'),
        (7, '2026-10-28 00:00:00', 'N'),
        (8, '2026-10-29 12:00:00', 'N'),
        (9, NULL, 'N'),
        (10, '2026-07-06 16:00:00', 'A'),
        (11, '2026-07-06 16:00:00', 'C');
    `);
    const statement = db.prepare(COMPLETE_SO_ORDERS_SQL);
    const cutoff = getSoOrderCompletionCutoff("2026-10-29");
    assert.equal(statement.run(cutoff).changes, 5);
    assert.deepEqual(db.prepare("SELECT current_status FROM so_orders ORDER BY so_id").all().map((row) => row.current_status), [
      "E", "E", "C", "E", "E", "E", "N", "N", "N", "E", "C"
    ]);
    assert.equal(statement.run(cutoff).changes, 0);
    // A later API sync returning an old status must not leave an overdue order open.
    db.exec("UPDATE so_orders SET current_status = 'A' WHERE so_id = 10");
    assert.equal(statement.run(cutoff).changes, 1);
    assert.equal(db.prepare("SELECT current_status FROM so_orders WHERE so_id = 10").get()?.current_status, "E");
  } finally {
    db.close();
  }
});

test("test site names become C regardless of case or date and stay C after completion", () => {
  const db = createDatabase();
  try {
    db.exec(`
      INSERT INTO so_orders (so_id, ship_to_name, current_status, delivery_date_time) VALUES
        (1, 'Test เทพื้นใหม่', 'E', '2026-07-06 16:00:00'),
        (2, 'งาน TEST ลูกค้า', 'A', '2026-10-29 12:00:00'),
        (3, 'ไซต์ tEsT ใหม่', NULL, NULL),
        (4, 'ไซต์ทดสอบระบบ', 'I', '2026-07-06 16:00:00'),
        (5, 'test ยกเลิกแล้ว', 'C', NULL),
        (6, 'ไซต์ลูกค้าปกติ', 'E', '2026-07-06 16:00:00'),
        (7, NULL, 'A', NULL);
    `);
    assert.equal(db.prepare(CANCEL_TEST_SO_ORDERS_SQL).run().changes, 4);
    db.prepare(COMPLETE_SO_ORDERS_SQL).run(getSoOrderCompletionCutoff('2026-10-29'));
    assert.deepEqual(db.prepare('SELECT current_status FROM so_orders ORDER BY so_id').all().map(row => row.current_status), [
      'C', 'C', 'C', 'C', 'C', 'E', 'A'
    ]);
    assert.equal(db.prepare(CANCEL_TEST_SO_ORDERS_SQL).run().changes, 0);
  } finally {
    db.close();
  }
});

test("completion date boundaries handle month, year and leap-day transitions", () => {
  assert.equal(getSoOrderCompletionCutoff("2026-10-29"), "2026-10-28 00:00:00");
  assert.equal(getSoOrderCompletionCutoff("2026-01-01"), "2025-12-31 00:00:00");
  assert.equal(getSoOrderCompletionCutoff("2024-03-01"), "2024-02-29 00:00:00");
  assert.equal(getSoOrderCompletionCutoff("2026-03-01"), "2026-02-28 00:00:00");
});
