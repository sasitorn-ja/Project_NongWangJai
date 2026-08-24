import { queryDb } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type DbDealer = {
  dealer_id: number;
  dealer_code: string;
  dealer_name: string;
  osr_dealer: number;
  osr_dealer_code: string | null;
  status: string | null;
  region_id: number | null;
  region: string | null;
  province_id: number | null;
  province: string | null;
  group_count: number;
  volume: number;
  unit: string;
  last_active_at: string | null;
  last_active_days: number | null;
  api_created_at: string | null;
  api_updated_at: string | null;
};

const DEALER_CREATED_AT_CUTOFF = "2026-03-15";

export async function findAllDealers(): Promise<DbDealer[]> {
  const rows = await queryDb<
    (DbDealer & RowDataPacket)[]
  >(`
    SELECT
      dealer_id,
      dealer_code,
      dealer_name,
      osr_dealer,
      osr_dealer_code,
      status,
      region_id,
      region,
      province_id,
      province,
      group_count,
      volume,
      unit,
      last_active_at,
      last_active_days,
      api_created_at,
      api_updated_at
    FROM dealers
    WHERE api_created_at IS NULL OR api_created_at >= ?
    ORDER BY dealer_id
  `, [DEALER_CREATED_AT_CUTOFF]);

  return rows;
}

export async function findDealerById(dealerId: number): Promise<DbDealer | null> {
  const rows = await queryDb<
    (DbDealer & RowDataPacket)[]
  >(`
    SELECT
      dealer_id,
      dealer_code,
      dealer_name,
      osr_dealer,
      osr_dealer_code,
      status,
      region_id,
      region,
      province_id,
      province,
      group_count,
      volume,
      unit,
      last_active_at,
      last_active_days,
      api_created_at,
      api_updated_at
    FROM dealers
    WHERE dealer_id = ?
    LIMIT 1
  `, [dealerId]);

  return rows[0] ?? null;
}
