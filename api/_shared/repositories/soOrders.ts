import { queryDb } from "../db.js";
import type { RowDataPacket } from "mysql2/promise";

export type DbSoOrder = {
  so_id: number;
  project_id: number | null;
  qo_id: number | null;
  truck_queue_id: number | null;
  sale_order_id: string | null;
  temp_sale_order_id: string | null;
  sale_order_num: number | null;
  dispatch_code: string | null;
  ship_to_comp_code: string | null;
  ship_to_code: string;
  ship_to_name: string | null;
  ship_to_lat: number | null;
  ship_to_lng: number | null;
  sold_to_code: string | null;
  sold_to_name: string | null;
  sold_to_mobile: string | null;
  sold_to_telephone: string | null;
  sold_to_sale_type: string | null;
  sub_sold_to_code: string | null;
  sub_sold_to_name: string | null;
  sub_sold_to_mobile: string | null;
  sub_sold_to_telephone: string | null;
  initial_order_quantity: number | null;
  current_order_quantity: number;
  approve_order_quantity: number | null;
  current_status: string | null;
  book_by_name: string | null;
  book_by_phone_number: string | null;
  document_date: string | null;
  delivery_date_time: string | null;
  truck_type: string | null;
  truck_service: string | null;
  unload_id: string | null;
  unload_method: string | null;
  unload_time_duration_per_truck: string | null;
  memo: string | null;
  internal_note: string | null;
  transport_rate_quantity: number | null;
  transport_rate_time: number | null;
  request_qc_sampling_concrete: string | null;
  request_qc_service_on_site: string | null;
  qc_person_number: string | null;
  franchisee_code: string | null;
  material_code: string | null;
  material_description: string | null;
  comp_group: string | null;
  sale_order_type: string | null;
  structure_id: string | null;
  structure_name: string | null;
  groupline_id: number | null;
  create_form_wangjai: number;
  create_form: string | null;
  api_created_at: string | null;
  api_modified_at: string | null;
};

type SoOrdersFilter = {
  startDate: string;
  endDate: string;
  limit: number;
  page: number;
};

export async function findSoOrders(filter: SoOrdersFilter): Promise<{
  items: DbSoOrder[];
  total: number;
}> {
  const { startDate, endDate, limit, page } = filter;
  const offset = (page - 1) * limit;

  let countSql = `
    SELECT COUNT(*) AS total
    FROM so_orders
    WHERE is_test = 0
  `;

  let selectSql = `
    SELECT
      so_id,
      project_id,
      qo_id,
      truck_queue_id,
      sale_order_id,
      temp_sale_order_id,
      sale_order_num,
      dispatch_code,
      ship_to_comp_code,
      ship_to_code,
      ship_to_name,
      ship_to_lat,
      ship_to_lng,
      sold_to_code,
      sold_to_name,
      sold_to_mobile,
      sold_to_telephone,
      sold_to_sale_type,
      sub_sold_to_code,
      sub_sold_to_name,
      sub_sold_to_mobile,
      sub_sold_to_telephone,
      initial_order_quantity,
      current_order_quantity,
      approve_order_quantity,
      current_status,
      book_by_name,
      book_by_phone_number,
      document_date,
      delivery_date_time,
      truck_type,
      truck_service,
      unload_id,
      unload_method,
      unload_time_duration_per_truck,
      memo,
      internal_note,
      transport_rate_quantity,
      transport_rate_time,
      request_qc_sampling_concrete,
      request_qc_service_on_site,
      qc_person_number,
      franchisee_code,
      material_code,
      material_description,
      comp_group,
      sale_order_type,
      structure_id,
      structure_name,
      groupline_id,
      create_form_wangjai,
      create_form,
      api_created_at,
      api_modified_at
    FROM so_orders
    WHERE is_test = 0
  `;

  const params: string[] = [];
  if (startDate) {
    countSql += ` AND document_date >= ?`;
    selectSql += ` AND document_date >= ?`;
    params.push(startDate);
  }
  if (endDate) {
    countSql += ` AND document_date <= ?`;
    selectSql += ` AND document_date <= ?`;
    params.push(endDate);
  }

  selectSql += `
    ORDER BY document_date DESC, so_id DESC
    LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}
  `;

  const [countRows] = await queryDb<
    ({ total: number } & RowDataPacket)[]
  >(countSql, params);

  const total = Number(countRows?.total ?? 0);

  const rows = await queryDb<
    (DbSoOrder & RowDataPacket)[]
  >(selectSql, params);

  return { items: rows, total };
}
