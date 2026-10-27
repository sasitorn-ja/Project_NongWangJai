import assert from "node:assert/strict";
import test from "node:test";
import { buildOrderGroups } from "../src/features/dealers/dashboard/lib/order-groups";
import type { Dealer, OrderItem } from "../src/features/dealers/types";

function order(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    dealer_id: 5311,
    dealer_code: "3005514",
    dealer_name: "บ.เตียฮงฮะ สิริพานิช จก.",
    customer: { code: "9067624", name: "โกลบอลฯ" },
    site: { site_code: "SITE-A" },
    quantity: { ordered: 10, delivered: 8 },
    booking_channel: "wangjai",
    pour_datetime: "2026-10-25 10:00:00",
    created_at: null,
    updated_at: null,
    ...overrides
  };
}

const orders = [
  order(),
  order({
    customer: { code: "3005514", name: "บ.เตียฮงฮะ สิริพานิช จก." },
    site: { site_code: "SITE-B" },
    quantity: { ordered: 20, delivered: 12 },
    booking_channel: "other",
    pour_datetime: "2026-10-26 10:00:00"
  }),
  order({ dealer_id: 5322, dealer_code: "3013165", dealer_name: "Dealer B" })
];

test("combines the screenshot's two customers into one dealer with conserved totals", () => {
  const groups = buildOrderGroups(orders, "dealer");
  assert.equal(groups.length, 2);
  const dealer = groups.find((group) => group.key === "id:5311")!;
  assert.equal(dealer.name, "บ.เตียฮงฮะ สิริพานิช จก.");
  assert.equal(dealer.orderCount, 2);
  assert.equal(dealer.uniqueCustomerCount, 2);
  assert.equal(dealer.uniqueSiteCount, 2);
  assert.equal(dealer.totalOrdered, 30);
  assert.equal(dealer.totalDelivered, 20);
  assert.equal(dealer.wangjaiBooked, 10);
  assert.equal(dealer.otherBooked, 20);
  assert.equal(dealer.latestPour, "2026-10-26 10:00:00");
  assert.deepEqual(dealer.orders, [orders[1], orders[0]]);
  assert.equal(groups.reduce((sum, group) => sum + group.orderCount, 0), orders.length);
});

test("keeps customers separate and scopes a shared customer to its dealer", () => {
  const groups = buildOrderGroups(orders, "customer");
  assert.equal(groups.length, 3);
  assert.equal(groups.filter((group) => group.code === "9067624").length, 2);
  assert.equal(groups.reduce((sum, group) => sum + group.totalOrdered, 0), 40);
});

test("uses stable IDs and master names despite changes in order names or codes", () => {
  const groups = buildOrderGroups([
    order(), order({ dealer_name: "Alternate name", dealer_code: "old-code" })
  ], "dealer", [{ dealer_id: 5311, dealer_code: "3005514", dealer_name: "Master name" } as Dealer]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].name, "Master name");
  assert.equal(groups[0].code, "3005514");
  assert.equal(buildOrderGroups([order(), order({ dealer_id: 5322 })], "dealer").length, 2);
});

test("customer codes stay grouped when display names vary; shared sites count once", () => {
  const groups = buildOrderGroups([
    order(), order({ customer: { code: "9067624", name: "Alternate customer name" } })
  ], "customer");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].uniqueSiteCount, 1);
  assert.equal(groups[0].uniqueCustomerCount, 1);
});

test("handles empty inputs and falls back to dealer codes without merging unknown dealers", () => {
  assert.deepEqual(buildOrderGroups([], "dealer"), []);
  assert.equal(buildOrderGroups([order({ dealer_id: 0 }), order({ dealer_id: 0 })], "dealer").length, 1);
  assert.equal(buildOrderGroups([
    order({ dealer_id: 0, dealer_code: "", order: { order_no: "1" } }),
    order({ dealer_id: 0, dealer_code: "", order: { order_no: "2" } })
  ], "dealer").length, 2);
});
