import type { Dealer, OrderItem } from "../../types";
import { parseDateValue } from "./dates";
import { getOrderStatusKey } from "./status";

export type OrderGrouping = "dealer" | "customer";

export type OrderGroup = {
  key: string;
  mode: OrderGrouping;
  name: string;
  code: string;
  codeLabel: string;
  dealerCode: string;
  dealerName: string;
  latestPour: string | null;
  openOrderCount: number;
  orderCount: number;
  orders: OrderItem[];
  totalDelivered: number;
  totalOrdered: number;
  wangjaiBooked: number;
  otherBooked: number;
  unit: string;
  uniqueSiteCount: number;
  uniqueCustomerCount: number;
};

export function buildOrderGroups(orders: OrderItem[], mode: OrderGrouping, dealers: Dealer[] = []): OrderGroup[] {
  const dealerById = new Map(dealers.map((dealer) => [dealer.dealer_id, dealer]));
  const groups = new Map<string, OrderGroup>();

  orders.forEach((order, index) => {
    const dealer = dealerById.get(order.dealer_id);
    const dealerCode = dealer?.dealer_code.trim() || order.dealer_code?.trim() || "-";
    const dealerName = dealer?.dealer_name.trim() || order.dealer_name?.trim() || "ไม่ระบุ Dealer";
    const dealerKey = order.dealer_id > 0
      ? `id:${order.dealer_id}`
      : dealerCode !== "-" ? `code:${dealerCode}` : `unknown:${order.order?.order_no ?? index}`;
    const customerCode = order.customer?.code?.trim() || order.customer?.id?.toString() || "-";
    const customerName = order.customer?.name?.trim() || "ไม่ระบุลูกค้า";
    const customerKey = customerCode !== "-" ? `code:${customerCode}` : `name:${customerName}`;
    const key = mode === "dealer" ? dealerKey : JSON.stringify([dealerKey, customerKey]);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        mode,
        name: mode === "dealer" ? dealerName : customerName,
        code: mode === "dealer" ? dealerCode : customerCode,
        codeLabel: mode === "dealer" ? "รหัส Dealer" : "รหัสลูกค้า",
        dealerCode,
        dealerName,
        latestPour: null,
        openOrderCount: 0,
        orderCount: 0,
        orders: [],
        totalDelivered: 0,
        totalOrdered: 0,
        wangjaiBooked: 0,
        otherBooked: 0,
        unit: "คิว",
        uniqueSiteCount: 0,
        uniqueCustomerCount: 0
      };
      groups.set(key, group);
    }
    group.orders.push(order);
    group.orderCount++;
    group.totalOrdered += order.quantity?.ordered ?? 0;
    group.totalDelivered += order.quantity?.delivered ?? 0;
    if (order.booking_channel === "wangjai") group.wangjaiBooked += order.quantity?.ordered ?? 0;
    else group.otherBooked += order.quantity?.ordered ?? 0;
    const status = getOrderStatusKey(order.status?.order);
    if (status === "confirmed" || status === "pending") group.openOrderCount++;
    const pourDate = status === "cancelled" ? null : order.pour_datetime ?? null;
    const candidate = parseDateValue(pourDate);
    const current = parseDateValue(group.latestPour);
    if (candidate && (!current || candidate > current)) group.latestPour = pourDate;
  });

  for (const group of groups.values()) {
    group.uniqueSiteCount = new Set(group.orders.flatMap((order) => {
      const site = order.site?.site_code?.trim() || order.site?.site_id?.toString();
      return site ? [site] : [];
    })).size;
    group.uniqueCustomerCount = new Set(group.orders.map((order) =>
      order.customer?.code?.trim() || order.customer?.id?.toString() || order.customer?.name?.trim() || "ไม่ระบุลูกค้า"
    )).size;
    group.orders.sort((a, b) => {
      const dateA = parseDateValue(a.pour_datetime ?? a.updated_at ?? a.created_at)?.getTime() ?? 0;
      const dateB = parseDateValue(b.pour_datetime ?? b.updated_at ?? b.created_at)?.getTime() ?? 0;
      return dateB - dateA;
    });
  }

  return [...groups.values()].sort((a, b) =>
    (parseDateValue(b.latestPour)?.getTime() ?? 0) - (parseDateValue(a.latestPour)?.getTime() ?? 0)
    || b.totalOrdered - a.totalOrdered
    || b.orderCount - a.orderCount
    || a.name.localeCompare(b.name, "th")
  );
}
