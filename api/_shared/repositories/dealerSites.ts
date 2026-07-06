import { queryDb } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type DbDealerSite = {
  site_id: number;
  dealer_id: number | null;
  dealer_code: string | null;
  dealer_name: string | null;
  site_code: string;
  site_name: string;
  province_id: number | null;
  province_bluenet_id: string | null;
  province_name: string | null;
  region_id: number | null;
  region: string | null;
  customer_id: number | null;
  customer_code: string | null;
  customer_name: string | null;
  total_ordered: number;
  total_delivered: number;
  unit: string;
  last_pour_datetime: string | null;
  status: string | null;
  api_created_at: string | null;
  api_updated_at: string | null;
};

export async function findSitesByDealerId(dealerId: number): Promise<DbDealerSite[]> {
  const rows = await queryDb<
    (DbDealerSite & RowDataPacket)[]
  >(`
    SELECT
      site_id,
      dealer_id,
      dealer_code,
      dealer_name,
      site_code,
      site_name,
      province_id,
      province_bluenet_id,
      province_name,
      region_id,
      region,
      customer_id,
      customer_code,
      customer_name,
      total_ordered,
      total_delivered,
      unit,
      last_pour_datetime,
      status,
      api_created_at,
      api_updated_at
    FROM dealer_sites
    WHERE dealer_id = ?
    ORDER BY site_id
  `, [dealerId]);

  return rows;
}
