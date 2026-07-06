import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const pool = mysql.createPool({
    connectionLimit: 2,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER
  });

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query<mysql.RowDataPacket[]>(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `, ["dealers"]);

    const constraintNames = new Set(rows.map((r) => String(r.CONSTRAINT_NAME)));

    if (constraintNames.has("fk_dealers_region")) {
      await conn.query("ALTER TABLE dealers DROP FOREIGN KEY fk_dealers_region");
    }
    if (constraintNames.has("fk_dealers_province")) {
      await conn.query("ALTER TABLE dealers DROP FOREIGN KEY fk_dealers_province");
    }

    const [siteRows] = await conn.query<mysql.RowDataPacket[]>(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    `, ["dealer_sites"]);

    const siteConstraintNames = new Set(siteRows.map((r) => String(r.CONSTRAINT_NAME)));

    if (siteConstraintNames.has("fk_sites_region")) {
      await conn.query("ALTER TABLE dealer_sites DROP FOREIGN KEY fk_sites_region");
    }
    if (siteConstraintNames.has("fk_sites_province")) {
      await conn.query("ALTER TABLE dealer_sites DROP FOREIGN KEY fk_sites_province");
    }

    console.log("Migration applied");
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
