import type { ApiState, CustomerUsage, Dealer, DealerGroup, DealerSite, DealerUsage } from "@/types/dealer";

type DealerApiResponse =
  | Dealer[]
  | {
      data?: Dealer[];
      result?: Dealer[];
      dealers?: Dealer[];
      items?: Dealer[];
      rows?: Dealer[];
    };

type DealerGroupsResponse = {
  status?: boolean;
  dealer?: Pick<Dealer, "dealer_id" | "dealer_code" | "dealer_name">;
  groups?: DealerGroup[];
  items?: DealerGroup[];
  message?: string;
};

type ListResponse<T> = T[] | { items?: T[]; data?: T[]; result?: T[]; rows?: T[]; message?: string };

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function normalizeDealer(row: Dealer): Dealer {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    region_id: toNumber(row.region_id),
    province_id: toNumber(row.province_id),
    group_count: toNumber(row.group_count),
    volume: toNumber(row.volume),
    last_active_days: row.last_active_days == null ? null : toNumber(row.last_active_days),
    unit: row.unit || "m3"
  };
}

function normalizeGroup(row: DealerGroup): DealerGroup {
  return {
    ...row,
    group_id: toNumber(row.group_id),
    delivered_volume: toNumber(row.delivered_volume),
    booked_volume: toNumber(row.booked_volume),
    price_check_count: toNumber(row.price_check_count),
    booking_count: toNumber(row.booking_count),
    unit: row.unit || "m3"
  };
}

function normalizeUsage(row: DealerUsage): DealerUsage {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    region_id: toNumber(row.region_id),
    province_id: toNumber(row.province_id),
    price_concrete_count: toNumber(row.price_concrete_count),
    booking_create_count: toNumber(row.booking_create_count),
    customer_create_count: toNumber(row.customer_create_count)
  };
}

function normalizeCustomer(row: CustomerUsage): CustomerUsage {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    customer_id: toNumber(row.customer_id),
    price_concrete_count: toNumber(row.price_concrete_count),
    booking_create_count: toNumber(row.booking_create_count)
  };
}

function normalizeSite(row: DealerSite): DealerSite {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    site_id: toNumber(row.site_id),
    total_ordered: toNumber(row.total_ordered),
    total_delivered: toNumber(row.total_delivered),
    unit: row.unit || "m3"
  };
}

function normalizeDealers(payload: DealerApiResponse): Dealer[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload.items ?? payload.data ?? payload.result ?? payload.dealers ?? payload.rows ?? [];

  return rows.map(normalizeDealer);
}

export async function fetchDealers(): Promise<{ rows: Dealer[]; state: ApiState }> {
  try {
    const response = await fetch("/api/dealers", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`API responded ${response.status}`);

    const payload = (await response.json()) as DealerApiResponse;
    const rows = normalizeDealers(payload);

    return { rows, state: "live" };
  } catch {
    return { rows: [], state: "error" };
  }
}

function normalizeList<T>(payload: ListResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.data ?? payload.result ?? payload.rows ?? [];
}

export async function fetchDealerGroups(dealerId: number): Promise<{ rows: DealerGroup[]; state: ApiState; message?: string }> {
  try {
    const response = await fetch(`/api/dealers/${dealerId}/groups`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`API responded ${response.status}`);

    const payload = (await response.json()) as DealerGroupsResponse;
    return { rows: (payload.groups ?? payload.items ?? []).map(normalizeGroup), state: "live", message: payload.message };
  } catch {
    return { rows: [], state: "error" };
  }
}

export async function fetchDealerUsage(): Promise<{ rows: DealerUsage[]; state: ApiState }> {
  try {
    const response = await fetch("/api/dealers/usage", {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`API responded ${response.status}`);

    const payload = (await response.json()) as ListResponse<DealerUsage>;
    return { rows: normalizeList(payload).map(normalizeUsage), state: "live" };
  } catch {
    return { rows: [], state: "error" };
  }
}

export async function fetchCustomerUsage(
  dealerId: number
): Promise<{ rows: CustomerUsage[]; state: ApiState; message?: string }> {
  try {
    const response = await fetch(`/api/dealers/${dealerId}/customers/usage`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`API responded ${response.status}`);

    const payload = (await response.json()) as ListResponse<CustomerUsage>;
    return { rows: normalizeList(payload).map(normalizeCustomer), state: "live", message: "message" in payload ? payload.message : undefined };
  } catch {
    return { rows: [], state: "error" };
  }
}

export async function fetchDealerSites(dealerId: number): Promise<{ rows: DealerSite[]; state: ApiState; message?: string }> {
  try {
    const response = await fetch(`/api/dealers/${dealerId}/sites`, {
      headers: { Accept: "application/json" }
    });

    if (!response.ok) throw new Error(`API responded ${response.status}`);

    const payload = (await response.json()) as ListResponse<DealerSite>;
    return { rows: normalizeList(payload).map(normalizeSite), state: "live", message: "message" in payload ? payload.message : undefined };
  } catch {
    return { rows: [], state: "error" };
  }
}
