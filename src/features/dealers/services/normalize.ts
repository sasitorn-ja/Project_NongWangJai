import type {
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";
import type { DealerApiResponse } from "./responses";

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeDealer(row: Dealer): Dealer {
  return {
    ...row,
    dealer_id: toNumber(row.dealer_id),
    region_id: toNumber(row.region_id),
    province_id: toNumber(row.province_id),
    group_count: toNumber(row.group_count),
    volume: toNumber(row.volume),
    last_active_days: row.last_active_days == null ? null : toNumber(row.last_active_days),
    unit: "m3"
  };
}

export function normalizeGroup(row: DealerGroup): DealerGroup {
  return {
    ...row,
    group_id: toNumber(row.group_id),
    delivered_volume: toNumber(row.delivered_volume),
    booked_volume: toNumber(row.booked_volume),
    price_check_count: toNumber(row.price_check_count),
    booking_count: toNumber(row.booking_count),
    unit: "m3"
  };
}

export function normalizeUsage(row: DealerUsage): DealerUsage {
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

export function normalizeCustomer(row: CustomerUsage): CustomerUsage {
  return {
    ...row,
    dealer_id: row.dealer_id == null ? undefined : toNumber(row.dealer_id),
    customer_id: toNumber(row.customer_id),
    price_concrete_count: toNumber(row.price_concrete_count),
    booking_create_count: toNumber(row.booking_create_count)
  };
}

export function normalizeSite(row: DealerSite): DealerSite {
  return {
    ...row,
    id: row.id == null ? undefined : toNumber(row.id),
    dealer_id: row.dealer_id == null ? undefined : toNumber(row.dealer_id),
    site_id: toNumber(row.site_id || row.id),
    province_id: row.province_id == null ? undefined : toNumber(row.province_id),
    region_id: row.region_id == null ? undefined : toNumber(row.region_id),
    total_ordered: toNumber(row.total_ordered),
    total_delivered: toNumber(row.total_delivered),
    unit: "m3"
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
          ordered: toNumber(row.quantity.ordered),
          delivered: toNumber(row.quantity.delivered),
          unit: "m3"
        }
      : { ordered: 0, delivered: 0, unit: "m3" },
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

  return rows.map(normalizeDealer);
}
