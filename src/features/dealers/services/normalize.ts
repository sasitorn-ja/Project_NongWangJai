import type {
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";
import type { DealerApiResponse, SoOrderItem } from "./responses";

const DEALER_CREATED_AT_CUTOFF = "2026-03-15";

export function isDealerCreatedAfterCutoff(dealer: Dealer) {
  if (!dealer.created_at) return false;

  const datePart = dealer.created_at.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  return Boolean(datePart && datePart > DEALER_CREATED_AT_CUTOFF);
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeDealer(row: Dealer & { api_created_at?: string | null; api_updated_at?: string | null }): Dealer {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    osr_dealer: toNumber(row.osr_dealer),
    osr_dealer_code: row.osr_dealer_code ?? null,
    region_id: toNumber(row.region_id),
    province_id: toNumber(row.province_id),
    group_count: toNumber(row.group_count),
    volume: toNumber(row.volume),
    last_active_days: row.last_active_days == null ? null : toNumber(row.last_active_days),
    unit: "คิว",
    created_at: row.created_at ?? row.api_created_at ?? null,
    updated_at: row.updated_at ?? row.api_updated_at ?? null
  };
}

export function normalizeGroup(row: DealerGroup & { api_created_at?: string | null; api_updated_at?: string | null }): DealerGroup {
  return {
    ...row,
    group_id: toNumber(row.group_id),
    delivered_volume: toNumber(row.delivered_volume),
    booked_volume: toNumber(row.booked_volume),
    price_check_count: toNumber(row.price_check_count),
    booking_count: toNumber(row.booking_count),
    unit: "คิว",
    created_at: row.created_at ?? row.api_created_at ?? null,
    updated_at: row.updated_at ?? row.api_updated_at ?? null
  };
}

export function normalizeUsage(row: DealerUsage & { api_updated_at?: string | null }): DealerUsage {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    region_id: toNumber(row.region_id),
    province_id: toNumber(row.province_id),
    price_concrete_count: toNumber(row.price_concrete_count),
    booking_create_count: toNumber(row.booking_create_count),
    customer_create_count: toNumber(row.customer_create_count),
    updated_at: row.updated_at ?? row.api_updated_at ?? null
  };
}

export function normalizeCustomer(row: CustomerUsage & { api_updated_at?: string | null }): CustomerUsage {
  return {
    ...row,
    dealer_id: row.dealer_id == null ? undefined : toNumber(row.dealer_id),
    customer_id: toNumber(row.customer_id),
    price_concrete_count: toNumber(row.price_concrete_count),
    booking_create_count: toNumber(row.booking_create_count),
    updated_at: row.updated_at ?? row.api_updated_at ?? null
  };
}

export function normalizeSite(row: DealerSite & { api_created_at?: string | null; api_updated_at?: string | null }): DealerSite {
  return {
    ...row,
    id: row.id == null ? undefined : toNumber(row.id),
    dealer_id: row.dealer_id == null ? undefined : toNumber(row.dealer_id),
    site_id: toNumber(row.site_id || row.id),
    province_id: row.province_id == null ? undefined : toNumber(row.province_id),
    region_id: row.region_id == null ? undefined : toNumber(row.region_id),
    total_ordered: toNumber(row.total_ordered),
    total_delivered: toNumber(row.total_delivered),
    unit: "คิว",
    created_at: row.created_at ?? row.api_created_at ?? null,
    updated_at: row.updated_at ?? row.api_updated_at ?? null
  };
}

export function normalizeSoOrder(row: SoOrderItem, dealerMap: Map<string, Dealer>): OrderItem {
  const soldToCode = String(row.SoldToCode ?? "");
  const dealer = dealerMap.get(soldToCode);
  const initialQuantity = toNumber(row.InitialOrderQuantity);
  const quantity = toNumber(row.CurrentOrderQuantity);
  const currentStatus = String(row.CurrentStatus ?? "").trim();
  const deliveredQuantity = currentStatus.toUpperCase() === "E" ? quantity : 0;

  return {
    dealer_id: dealer?.dealer_id ?? 0,
    dealer_code: dealer?.dealer_code ?? soldToCode,
    dealer_name: String(row.SoldToName ?? dealer?.dealer_name ?? ""),
    customer: {
      code: String(row.SubSoldToCode ?? row.ShipToCode ?? ""),
      name: String(row.SubSoldToName ?? row.ShipToName ?? "")
    },
    site: {
      site_code: String(row.ShipToCode ?? ""),
      site_name: String(row.ShipToName ?? ""),
      latitude: row.ShipToLat == null ? null : String(row.ShipToLat),
      longitude: row.ShipToLng == null ? null : String(row.ShipToLng)
    },
    order: {
      order_no: String(row.so_id ?? ""),
      product_sku: String(row.MaterialCode ?? ""),
      product_name: String(row.MaterialDescription ?? "")
    },
    pour_datetime: row.DeliveryDateTime ?? row.DocumentDate ?? null,
    booked_at: row.DocumentDate ?? null,
    memo: row.Memo ?? null,
    details: row.InternalNote ?? null,
    quantity: {
      initial_ordered: initialQuantity,
      ordered: quantity,
      delivered: deliveredQuantity,
      unit: "คิว"
    },
    status: {
      order: currentStatus
    },
    created_at: row.created_at ?? null,
    updated_at: row.modify_at ?? null,
    full_loop: row.create_form_wangjai === 1
  };
}

export function normalizeOrder(row: OrderItem): OrderItem {
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
          initial_ordered: toNumber(row.quantity.initial_ordered),
          ordered: toNumber(row.quantity.ordered),
          delivered: toNumber(row.quantity.delivered),
          unit: "คิว"
        }
      : { initial_ordered: 0, ordered: 0, delivered: 0, unit: "คิว" },
    status: row.status
      ? {
          ...row.status
        }
      : null
  };
}

export function normalizeDealers(payload: DealerApiResponse): Dealer[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload.items ?? payload.data ?? payload.result ?? payload.dealers ?? payload.rows ?? [];

  return rows.map(normalizeDealer).filter(isDealerCreatedAfterCutoff);
}
