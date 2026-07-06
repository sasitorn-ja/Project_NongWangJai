import process from "node:process";
import mysql from "mysql2/promise";

function cleanEnv(value?: string) {
  if (!value) return "";
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).replace(/\\\$/g, "$");
  }

  return trimmed.replace(/\\\$/g, "$");
}

function getDbConfig() {
  return {
    database: cleanEnv(process.env.DB_NAME) || "nong_wang_jai",
    host: cleanEnv(process.env.DB_HOST) || "localhost",
    password: cleanEnv(process.env.DB_PASSWORD) || "",
    port: Number(cleanEnv(process.env.DB_PORT)) || 3306,
    user: cleanEnv(process.env.DB_USER) || ""
  };
}

let pool: mysql.Pool | null = null;

export function getDbPool(): mysql.Pool {
  if (!pool) {
    const config = getDbConfig();

    if (!config.user || !config.password) {
      throw new Error("Missing DB credentials: DB_USER and DB_PASSWORD are required");
    }

    pool = mysql.createPool({
      ...config,
      connectionLimit: 10,
      dateStrings: true,
      enableKeepAlive: true,
      timezone: "+00:00"
    });
  }

  return pool;
}

export type DbValue = string | number | bigint | boolean | Date | Buffer | Uint8Array | null;

export async function queryDb<T>(
  sql: string,
  values?: DbValue[]
): Promise<T> {
  const connection = await getDbPool().getConnection();

  try {
    const [rows] = await connection.execute(sql, values);
    return rows as T;
  } finally {
    connection.release();
  }
}

export async function closeDbPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
