import type {
  ApiState,
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";

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

type ApiListResult<T> = {
  rows: T[];
  state: ApiState;
  message?: string;
};

function toReadableMessage(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return undefined;
}

async function extractErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: unknown; message?: unknown; details?: unknown };
      const message =
        toReadableMessage(payload.error) ??
        toReadableMessage(payload.message) ??
        toReadableMessage(payload.details) ??
        toReadableMessage(payload);

      if (message) return message;
    } else {
      const text = (await response.text()).trim();
      if (text) return text;
    }
  } catch {
    // Ignore body parsing issues and fall back to status-based messaging.
  }

  return `API responded ${response.status}`;
}

async function requestJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  return (await response.json()) as T;
}

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

function normalizeOrder(row: OrderItem): OrderItem {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    customer: row.customer
      ? {
          ...row.customer,
          id: row.customer.id == null ? undefined : toNumber(row.customer.id)
        }
      : null,
    site: row.site
      ? {
          ...row.site
        }
      : null,
    order: row.order
      ? {
          ...row.order
        }
      : null,
    quantity: row.quantity
      ? {
          ...row.quantity,
          ordered: toNumber(row.quantity.ordered),
          delivered: toNumber(row.quantity.delivered),
          unit: row.quantity.unit || "คิว"
        }
      : { ordered: 0, delivered: 0, unit: "คิว" },
    status: row.status
      ? {
          ...row.status
        }
      : null
  };
}

function normalizeDealers(payload: DealerApiResponse): Dealer[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload.items ?? payload.data ?? payload.result ?? payload.dealers ?? payload.rows ?? [];

  return rows.map(normalizeDealer);
}

export async function fetchDealers(): Promise<ApiListResult<Dealer>> {
  try {
    const payload = await requestJson<DealerApiResponse>("/api/dealers");
    const rows = normalizeDealers(payload);

    return { rows, state: "live" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealers";
    console.error("Failed to load dealers:", error);
    return { rows: [], state: "error", message };
  }
}

function normalizeList<T>(payload: ListResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.data ?? payload.result ?? payload.rows ?? [];
}

export async function fetchDealerGroups(dealerId: number): Promise<ApiListResult<DealerGroup>> {
  try {
    const payload = await requestJson<DealerGroupsResponse>(`/api/dealers/${dealerId}/groups`);
    return { rows: (payload.groups ?? payload.items ?? []).map(normalizeGroup), state: "live", message: payload.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealer groups";
    console.error(`Failed to load dealer groups for dealer ${dealerId}:`, error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchDealerUsage(): Promise<ApiListResult<DealerUsage>> {
  try {
    const payload = await requestJson<ListResponse<DealerUsage>>("/api/dealers/usage");
    return { rows: normalizeList(payload).map(normalizeUsage), state: "live" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealer usage";
    console.error("Failed to load dealer usage:", error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchCustomerUsage(
  dealerId: number
): Promise<ApiListResult<CustomerUsage>> {
  try {
    const payload = await requestJson<ListResponse<CustomerUsage>>(`/api/dealers/${dealerId}/customers/usage`);
    return { rows: normalizeList(payload).map(normalizeCustomer), state: "live", message: "message" in payload ? payload.message : undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load customer usage";
    console.error(`Failed to load customer usage for dealer ${dealerId}:`, error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchDealerSites(dealerId: number): Promise<ApiListResult<DealerSite>> {
  try {
    const payload = await requestJson<ListResponse<DealerSite>>(`/api/dealers/${dealerId}/sites`);
    return { rows: normalizeList(payload).map(normalizeSite), state: "live", message: "message" in payload ? payload.message : undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load dealer sites";
    console.error(`Failed to load dealer sites for dealer ${dealerId}:`, error);
    return { rows: [], state: "error", message };
  }
}

export async function fetchOrders(): Promise<ApiListResult<OrderItem>> {
  try {
    const payload = await requestJson<ListResponse<OrderItem>>("/api/order");
    return { rows: normalizeList(payload).map(normalizeOrder), state: "live", message: "message" in payload ? payload.message : undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load orders";
    console.error("Failed to load orders:", error);
    return { rows: [], state: "error", message };
  }
}
