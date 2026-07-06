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
      customer_usage_id,
      dealer_id,
      dealer_code,
      dealer_name,
      customer_id,
      customer_code,
      customer_name,
      price_concrete_count,
      booking_create_count,
      api_updated_at
    FROM customer_usage
    WHERE dealer_id = ?
    ORDER BY customer_id
  `, [dealerId]);

  return rows;
}
