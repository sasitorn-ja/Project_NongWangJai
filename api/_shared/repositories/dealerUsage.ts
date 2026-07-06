import { queryDb } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type DbDealerUsage = {
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  region_id: number | null;
  region: string | null;
  province_id: number | null;
  province: string | null;
  price_concrete_count: number;
  booking_create_count: number;
  customer_create_count: number;
  api_updated_at: string | null;
};

export async function findAllDealerUsage(): Promise<DbDealerUsage[]> {
  const rows = await queryDb<
    (DbDealerUsage & RowDataPacket)[]
  >(`
    SELECT
      dealer_id,
      dealer_code,
      dealer_name,
      region_id,
      region,
      province_id,
      province,
      price_concrete_count,
      booking_create_count,
      customer_create_count,
      api_updated_at
    FROM dealer_usage
    ORDER BY dealer_id
  `);

  return rows;
}
