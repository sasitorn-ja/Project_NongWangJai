import "dotenv/config";
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

function getEnv(name: string): string {
  const value = cleanEnv(process.env[name]);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

function getUpstreamConfig() {
  return {
    password: getEnv("CPAC_API_PASSWORD"),
    target: cleanEnv(process.env.CPAC_API_TARGET) || "https://cpac-api.merudy.com",
    user: getEnv("CPAC_API_USER")
  };
}

function encodeBasicAuth(user: string, password: string) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

async function fetchUpstream(path: string, options: { method?: string; body?: unknown } = {}) {
  const { target, user, password } = getUpstreamConfig();
  const url = new URL(path, target);

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      accept: "application/json",
      authorization: encodeBasicAuth(user, password),
      "content-type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    throw new Error(`Upstream ${path} failed with status ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as unknown;
}

async function createPool() {
  const config = getDbConfig();
  return mysql.createPool({
    ...config,
    connectionLimit: 5,
    dateStrings: true,
    timezone: "+00:00"
  });
}

function normalizeDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const str = String(value);
  if (str === "0000-00-00" || str === "0000-00-00 00:00:00") return null;

  // Convert ISO 8601 (2026-07-02T13:37:08.000Z) to MySQL DATETIME format
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  return str;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  return String(value);
}

// ---------------------------------------------------------------------------
// Dealers
// ---------------------------------------------------------------------------
async function syncDealers(pool: mysql.Pool) {
  console.log("Syncing dealers...");
  const payload = await fetchUpstream("/api/ai-wangjai/dealers");
  const rows = Array.isArray(payload) ? payload : (payload as { items?: unknown[] }).items ?? [];

  const connection = await pool.getConnection();
  try {
    const sql = `
      INSERT INTO dealers (
        dealer_id, dealer_code, dealer_name, status, region_id, region,
        province_id, province, group_count, volume, unit, last_active_at,
        last_active_days, api_created_at, api_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dealer_code = VALUES(dealer_code),
        dealer_name = VALUES(dealer_name),
        status = VALUES(status),
        region_id = VALUES(region_id),
        region = VALUES(region),
        province_id = VALUES(province_id),
        province = VALUES(province),
        group_count = VALUES(group_count),
        volume = VALUES(volume),
        unit = VALUES(unit),
        last_active_at = VALUES(last_active_at),
        last_active_days = VALUES(last_active_days),
        api_created_at = VALUES(api_created_at),
        api_updated_at = VALUES(api_updated_at)
    `;

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      await connection.execute(sql, [
        toNumber(r.dealer_id),
        String(r.dealer_code ?? ""),
        String(r.dealer_name ?? ""),
        toStringOrNull(r.status),
        toNumber(r.region_id),
        toStringOrNull(r.region),
        toNumber(r.province_id),
        toStringOrNull(r.province),
        toNumber(r.group_count),
        toNumber(r.volume),
        String(r.unit ?? "คิว"),
        normalizeDate(r.last_active_at),
        r.last_active_days == null ? null : toNumber(r.last_active_days),
        normalizeDate(r.created_at),
        normalizeDate(r.updated_at)
      ]);
    }

    console.log(`  Inserted ${rows.length} dealers`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Dealer usage
// ---------------------------------------------------------------------------
async function syncDealerUsage(pool: mysql.Pool) {
  console.log("Syncing dealer usage...");
  const payload = await fetchUpstream("/api/ai-wangjai/dealers/usage");
  const rows = Array.isArray(payload) ? payload : (payload as { items?: unknown[] }).items ?? [];

  const connection = await pool.getConnection();
  try {
    const sql = `
      INSERT INTO dealer_usage (
        dealer_id, dealer_code, dealer_name, region_id, region,
        province_id, province, price_concrete_count, booking_create_count,
        customer_create_count, api_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dealer_code = VALUES(dealer_code),
        dealer_name = VALUES(dealer_name),
        region_id = VALUES(region_id),
        region = VALUES(region),
        province_id = VALUES(province_id),
        province = VALUES(province),
        price_concrete_count = VALUES(price_concrete_count),
        booking_create_count = VALUES(booking_create_count),
        customer_create_count = VALUES(customer_create_count),
        api_updated_at = VALUES(api_updated_at)
    `;

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      await connection.execute(sql, [
        toNumber(r.dealer_id),
        String(r.dealer_code ?? ""),
        String(r.dealer_name ?? ""),
        toNumber(r.region_id),
        toStringOrNull(r.region),
        toNumber(r.province_id),
        toStringOrNull(r.province),
        toNumber(r.price_concrete_count),
        toNumber(r.booking_create_count),
        toNumber(r.customer_create_count),
        normalizeDate(r.updated_at)
      ]);
    }

    console.log(`  Inserted ${rows.length} dealer usage rows`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Dealer groups
// ---------------------------------------------------------------------------
async function syncDealerGroups(pool: mysql.Pool) {
  console.log("Syncing dealer groups...");
  const [dealerRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT dealer_id FROM dealers ORDER BY dealer_id"
  );

  const connection = await pool.getConnection();
  try {
    const groupSql = `
      INSERT INTO dealer_groups (
        group_id, group_name, group_type, delivered_volume, booked_volume,
        unit, price_check_count, booking_count, status, api_created_at, api_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        group_name = VALUES(group_name),
        group_type = VALUES(group_type),
        delivered_volume = VALUES(delivered_volume),
        booked_volume = VALUES(booked_volume),
        unit = VALUES(unit),
        price_check_count = VALUES(price_check_count),
        booking_count = VALUES(booking_count),
        status = VALUES(status),
        api_created_at = VALUES(api_created_at),
        api_updated_at = VALUES(api_updated_at)
    `;

    const memberSql = `
      INSERT IGNORE INTO dealer_group_members (dealer_id, group_id) VALUES (?, ?)
    `;

    let totalGroups = 0;
    let totalMembers = 0;

    for (const dealerRow of dealerRows) {
      const dealerId = Number(dealerRow.dealer_id);
      const payload = await fetchUpstream(`/api/ai-wangjai/dealers/${dealerId}/groups`);
      const rows = (payload as { groups?: unknown[] }).groups ?? (payload as { items?: unknown[] }).items ?? [];

      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const groupId = toNumber(r.group_id);

        await connection.execute(groupSql, [
          groupId,
          String(r.group_name ?? ""),
          toStringOrNull(r.group_type),
          toNumber(r.delivered_volume),
          toNumber(r.booked_volume),
          String(r.unit ?? "คิว"),
          toNumber(r.price_check_count),
          toNumber(r.booking_count),
          toStringOrNull(r.status),
          normalizeDate(r.created_at),
          normalizeDate(r.updated_at)
        ]);

        await connection.execute(memberSql, [dealerId, groupId]);
        totalGroups++;
        totalMembers++;
      }
    }

    console.log(`  Inserted ${totalGroups} groups, ${totalMembers} memberships`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Dealer sites
// ---------------------------------------------------------------------------
async function syncDealerSites(pool: mysql.Pool) {
  console.log("Syncing dealer sites...");
  const [dealerRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT dealer_id FROM dealers ORDER BY dealer_id"
  );

  const connection = await pool.getConnection();
  try {
    const sql = `
      INSERT INTO dealer_sites (
        site_id, dealer_id, dealer_code, dealer_name, site_code, site_name,
        province_id, province_bluenet_id, province_name, region_id, region,
        customer_id, customer_code, customer_name, total_ordered, total_delivered,
        unit, last_pour_datetime, status, api_created_at, api_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dealer_id = VALUES(dealer_id),
        dealer_code = VALUES(dealer_code),
        dealer_name = VALUES(dealer_name),
        site_code = VALUES(site_code),
        site_name = VALUES(site_name),
        province_id = VALUES(province_id),
        province_bluenet_id = VALUES(province_bluenet_id),
        province_name = VALUES(province_name),
        region_id = VALUES(region_id),
        region = VALUES(region),
        customer_id = VALUES(customer_id),
        customer_code = VALUES(customer_code),
        customer_name = VALUES(customer_name),
        total_ordered = VALUES(total_ordered),
        total_delivered = VALUES(total_delivered),
        unit = VALUES(unit),
        last_pour_datetime = VALUES(last_pour_datetime),
        status = VALUES(status),
        api_created_at = VALUES(api_created_at),
        api_updated_at = VALUES(api_updated_at)
    `;

    let total = 0;

    for (const dealerRow of dealerRows) {
      const dealerId = Number(dealerRow.dealer_id);
      const payload = await fetchUpstream(`/api/ai-wangjai/dealers/${dealerId}/sites`);
      const rows = Array.isArray(payload) ? payload : (payload as { items?: unknown[] }).items ?? [];

      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const customer = (r.customer ?? {}) as Record<string, unknown>;

        await connection.execute(sql, [
          toNumber(r.site_id ?? r.id),
          toNumber(r.dealer_id),
          toStringOrNull(r.dealer_code),
          toStringOrNull(r.dealer_name),
          String(r.site_code ?? ""),
          String(r.site_name ?? ""),
          toNumber(r.province_id),
          toStringOrNull(r.province_bluenet_id),
          toStringOrNull(r.province_name),
          toNumber(r.region_id),
          toStringOrNull(r.region),
          toNumber(customer.id),
          toStringOrNull(customer.code),
          toStringOrNull(customer.name),
          toNumber(r.total_ordered),
          toNumber(r.total_delivered),
          String(r.unit ?? "คิว"),
          normalizeDate(r.last_pour_datetime),
          toStringOrNull(r.status),
          normalizeDate(r.created_at),
          normalizeDate(r.updated_at)
        ]);
        total++;
      }
    }

    console.log(`  Inserted ${total} sites`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Customer usage
// ---------------------------------------------------------------------------
async function syncCustomerUsage(pool: mysql.Pool) {
  console.log("Syncing customer usage...");
  const [dealerRows] = await pool.query<mysql.RowDataPacket[]>(
    "SELECT dealer_id FROM dealers ORDER BY dealer_id"
  );

  const connection = await pool.getConnection();
  try {
    const sql = `
      INSERT INTO customer_usage (
        dealer_id, dealer_code, dealer_name, customer_id, customer_code,
        customer_name, price_concrete_count, booking_create_count, api_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dealer_code = VALUES(dealer_code),
        dealer_name = VALUES(dealer_name),
        customer_code = VALUES(customer_code),
        customer_name = VALUES(customer_name),
        price_concrete_count = VALUES(price_concrete_count),
        booking_create_count = VALUES(booking_create_count),
        api_updated_at = VALUES(api_updated_at)
    `;

    let total = 0;

    for (const dealerRow of dealerRows) {
      const dealerId = Number(dealerRow.dealer_id);
      const payload = await fetchUpstream(`/api/ai-wangjai/dealers/${dealerId}/customers/usage`);
      const rows = Array.isArray(payload) ? payload : (payload as { items?: unknown[] }).items ?? [];

      for (const row of rows) {
        const r = row as Record<string, unknown>;
        await connection.execute(sql, [
          dealerId,
          toStringOrNull(r.dealer_code),
          toStringOrNull(r.dealer_name),
          toNumber(r.customer_id),
          String(r.customer_code ?? ""),
          String(r.customer_name ?? ""),
          toNumber(r.price_concrete_count),
          toNumber(r.booking_create_count),
          normalizeDate(r.updated_at)
        ]);
        total++;
      }
    }

    console.log(`  Inserted ${total} customer usage rows`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// SO orders
// ---------------------------------------------------------------------------
async function syncSoOrders(pool: mysql.Pool) {
  console.log("Syncing SO orders...");

  const startDate = process.env.SYNC_START_DATE ?? "2025-06-01";
  const endDate = process.env.SYNC_END_DATE ?? "2026-07-03";

  const payload = await fetchUpstream("/api/ai-wangjai/so-orders", {
    method: "POST",
    body: { start_date: startDate, end_date: endDate, limit: 1000, page: 1 }
  });

  const rows = (payload as { items?: unknown[] }).items ?? [];

  const connection = await pool.getConnection();
  try {
    const sql = `
      INSERT INTO so_orders (
        so_id, project_id, qo_id, truck_queue_id, sale_order_id, temp_sale_order_id,
        sale_order_num, dispatch_code, ship_to_comp_code, ship_to_code, ship_to_name,
        ship_to_lat, ship_to_lng, sold_to_code, sold_to_name, sold_to_mobile,
        sold_to_telephone, sold_to_sale_type, sub_sold_to_code, sub_sold_to_name,
        sub_sold_to_mobile, sub_sold_to_telephone, initial_order_quantity,
        current_order_quantity, approve_order_quantity, current_status, book_by_name,
        book_by_phone_number, document_date, delivery_date_time, truck_type, truck_service,
        unload_id, unload_method, unload_time_duration_per_truck, memo, internal_note,
        transport_rate_quantity, transport_rate_time, request_qc_sampling_concrete,
        request_qc_service_on_site, qc_person_number, franchisee_code, material_code,
        material_description, comp_group, sale_order_type, structure_id, structure_name,
        groupline_id, create_form_wangjai, create_form, api_created_at, api_modified_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON DUPLICATE KEY UPDATE
        project_id = VALUES(project_id),
        qo_id = VALUES(qo_id),
        truck_queue_id = VALUES(truck_queue_id),
        sale_order_id = VALUES(sale_order_id),
        temp_sale_order_id = VALUES(temp_sale_order_id),
        sale_order_num = VALUES(sale_order_num),
        dispatch_code = VALUES(dispatch_code),
        ship_to_comp_code = VALUES(ship_to_comp_code),
        ship_to_code = VALUES(ship_to_code),
        ship_to_name = VALUES(ship_to_name),
        ship_to_lat = VALUES(ship_to_lat),
        ship_to_lng = VALUES(ship_to_lng),
        sold_to_code = VALUES(sold_to_code),
        sold_to_name = VALUES(sold_to_name),
        sold_to_mobile = VALUES(sold_to_mobile),
        sold_to_telephone = VALUES(sold_to_telephone),
        sold_to_sale_type = VALUES(sold_to_sale_type),
        sub_sold_to_code = VALUES(sub_sold_to_code),
        sub_sold_to_name = VALUES(sub_sold_to_name),
        sub_sold_to_mobile = VALUES(sub_sold_to_mobile),
        sub_sold_to_telephone = VALUES(sub_sold_to_telephone),
        initial_order_quantity = VALUES(initial_order_quantity),
        current_order_quantity = VALUES(current_order_quantity),
        approve_order_quantity = VALUES(approve_order_quantity),
        current_status = VALUES(current_status),
        book_by_name = VALUES(book_by_name),
        book_by_phone_number = VALUES(book_by_phone_number),
        document_date = VALUES(document_date),
        delivery_date_time = VALUES(delivery_date_time),
        truck_type = VALUES(truck_type),
        truck_service = VALUES(truck_service),
        unload_id = VALUES(unload_id),
        unload_method = VALUES(unload_method),
        unload_time_duration_per_truck = VALUES(unload_time_duration_per_truck),
        memo = VALUES(memo),
        internal_note = VALUES(internal_note),
        transport_rate_quantity = VALUES(transport_rate_quantity),
        transport_rate_time = VALUES(transport_rate_time),
        request_qc_sampling_concrete = VALUES(request_qc_sampling_concrete),
        request_qc_service_on_site = VALUES(request_qc_service_on_site),
        qc_person_number = VALUES(qc_person_number),
        franchisee_code = VALUES(franchisee_code),
        material_code = VALUES(material_code),
        material_description = VALUES(material_description),
        comp_group = VALUES(comp_group),
        sale_order_type = VALUES(sale_order_type),
        structure_id = VALUES(structure_id),
        structure_name = VALUES(structure_name),
        groupline_id = VALUES(groupline_id),
        create_form_wangjai = VALUES(create_form_wangjai),
        create_form = VALUES(create_form),
        api_created_at = VALUES(api_created_at),
        api_modified_at = VALUES(api_modified_at)
    `;

    for (const row of rows) {
      const r = row as Record<string, unknown>;
      await connection.execute(sql, [
        toNumber(r.so_id),
        toNumber(r.project_id),
        toNumber(r.qo_id),
        toNumber(r.truck_queue_id),
        toStringOrNull(r.SaleOrderID),
        toStringOrNull(r.TempSaleOrderID),
        toNumber(r.SaleOrderNum),
        toStringOrNull(r.DispatchCode),
        toStringOrNull(r.ShipToCompCode),
        String(r.ShipToCode ?? ""),
        toStringOrNull(r.ShipToName),
        toNumber(r.ShipToLat),
        toNumber(r.ShipToLng),
        toStringOrNull(r.SoldToCode),
        toStringOrNull(r.SoldToName),
        toStringOrNull(r.SoldToMobile),
        toStringOrNull(r.SoldToTelephone),
        toStringOrNull(r.SoldToSaleType),
        toStringOrNull(r.SubSoldToCode),
        toStringOrNull(r.SubSoldToName),
        toStringOrNull(r.SubSoldToMobile),
        toStringOrNull(r.SubSoldToTelephone),
        toNumber(r.InitialOrderQuantity),
        toNumber(r.CurrentOrderQuantity),
        toNumber(r.ApproveOrderQuantity),
        toStringOrNull(r.CurrentStatus),
        toStringOrNull(r.BookByName),
        toStringOrNull(r.BookByPhoneNumber),
        normalizeDate(r.DocumentDate),
        normalizeDate(r.DeliveryDateTime),
        toStringOrNull(r.TruckType),
        toStringOrNull(r.TruckService),
        toStringOrNull(r.UnloadID),
        toStringOrNull(r.UnloadMethod),
        toStringOrNull(r.UnloadTimeDurationPerTruck),
        toStringOrNull(r.Memo),
        toStringOrNull(r.InternalNote),
        toNumber(r.TransportRateQuantity),
        toNumber(r.TransportRateTime),
        toStringOrNull(r.RequestQcSamplingConcrete),
        toStringOrNull(r.RequestQcServiceOnSite),
        toStringOrNull(r.QcPersonNumber),
        toStringOrNull(r.FranchiseeCode),
        toStringOrNull(r.MaterialCode),
        toStringOrNull(r.MaterialDescription),
        toStringOrNull(r.CompGroup),
        toStringOrNull(r.SaleOrderType),
        toStringOrNull(r.StructureID),
        toStringOrNull(r.StructureName),
        toNumber(r.groupline_id),
        r.create_form_wangjai === 1 ? 1 : 0,
        toStringOrNull(r.create_form),
        normalizeDate(r.created_at),
        normalizeDate(r.modify_at)
      ]);
    }

    console.log(`  Inserted ${rows.length} SO orders`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Regions / Provinces reference
// ---------------------------------------------------------------------------
async function syncRegionsAndProvinces(pool: mysql.Pool) {
  console.log("Syncing regions and provinces...");
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT DISTINCT region_id, region, province_id, province_bluenet_id, province_name
      FROM dealer_sites
      WHERE region_id IS NOT NULL AND province_id IS NOT NULL
    `);

    const regionMap = new Map<number, string>();
    const provinceMap = new Map<string, { id: number; bluenetId: string | null; name: string; regionId: number }>();

    for (const row of rows) {
      const regionId = Number(row.region_id);
      const regionName = String(row.region ?? "");
      const provinceId = Number(row.province_id);
      const provinceName = String(row.province_name ?? "");
      const bluenetId = row.province_bluenet_id ? String(row.province_bluenet_id) : null;

      if (!regionMap.has(regionId)) {
        regionMap.set(regionId, regionName);
      }

      const key = `${provinceId}`;
      if (!provinceMap.has(key)) {
        provinceMap.set(key, {
          id: provinceId,
          bluenetId,
          name: provinceName,
          regionId
        });
      }
    }

    for (const [regionId, regionName] of regionMap) {
      await connection.execute(
        "INSERT INTO regions (region_id, region_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE region_name = VALUES(region_name)",
        [regionId, regionName]
      );
    }

    for (const province of provinceMap.values()) {
      await connection.execute(
        "INSERT INTO provinces (province_id, province_bluenet_id, province_name, region_id) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE province_bluenet_id = VALUES(province_bluenet_id), province_name = VALUES(province_name), region_id = VALUES(region_id)",
        [province.id, province.bluenetId, province.name, province.regionId]
      );
    }

    console.log(`  Inserted ${regionMap.size} regions, ${provinceMap.size} provinces`);
  } finally {
    connection.release();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const pool = await createPool();

  try {
    await syncDealers(pool);
    await syncDealerUsage(pool);
    await syncDealerGroups(pool);
    await syncDealerSites(pool);
    await syncCustomerUsage(pool);
    await syncSoOrders(pool);
    await syncRegionsAndProvinces(pool);

    console.log("\nSync completed successfully");
  } catch (error) {
    console.error("Sync failed", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
