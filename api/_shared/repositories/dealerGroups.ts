import { queryDb } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type DbDealerGroup = {
  group_id: number;
  group_name: string;
  group_type: string | null;
  delivered_volume: number;
  booked_volume: number;
  unit: string;
  price_check_count: number;
  booking_count: number;
  status: string | null;
  api_created_at: string | null;
  api_updated_at: string | null;
};

export async function findGroupsByDealerId(dealerId: number): Promise<DbDealerGroup[]> {
  const rows = await queryDb<
    (DbDealerGroup & RowDataPacket)[]
  >(`
    SELECT
      g.group_id,
      g.group_name,
      g.group_type,
      g.delivered_volume,
      g.booked_volume,
      g.unit,
      g.price_check_count,
      g.booking_count,
      g.status,
      g.api_created_at,
      g.api_updated_at
    FROM dealer_groups g
    INNER JOIN dealer_group_members m ON m.group_id = g.group_id
    WHERE m.dealer_id = ?
    ORDER BY g.group_id
  `, [dealerId]);

  return rows;
}
