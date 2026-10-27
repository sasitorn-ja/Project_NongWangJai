import { queryDb } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type DbCustomerUsage = {
  customer_usage_id: number;
  dealer_id: number;
  dealer_code: string | null;
  dealer_name: string | null;
  customer_id: number;
  customer_code: string;
  customer_name: string;
  price_concrete_count: number;
  booking_create_count: number;
  api_updated_at: string | null;
};

export async function findCustomerUsageByDealerId(dealerId: number): Promise<DbCustomerUsage[]> {
  const rows = await queryDb<
    (DbCustomerUsage & RowDataPacket)[]
  >(`
    SELECT
      c.customer_usage_id,
      c.dealer_id,
      COALESCE(NULLIF(TRIM(c.dealer_code), ''), d.dealer_code) AS dealer_code,
      COALESCE(NULLIF(TRIM(c.dealer_name), ''), d.dealer_name) AS dealer_name,
      c.customer_id,
      c.customer_code,
      c.customer_name,
      c.price_concrete_count,
      c.booking_create_count,
      c.api_updated_at
    FROM customer_usage c
    LEFT JOIN dealers d ON d.dealer_id = c.dealer_id
    WHERE c.dealer_id = ?
    ORDER BY c.customer_id
  `, [dealerId]);

  return rows;
}
