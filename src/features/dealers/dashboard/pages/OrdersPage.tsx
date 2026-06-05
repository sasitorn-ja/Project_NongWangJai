import { useMemo, useState } from "react";
import { ChevronDown, PackageCheck, Search, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { dateText, parseDateValue } from "../lib/dates";
import { getOrderStatusKey, orderStatusText } from "../lib/status";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
import { DealerPicker } from "../filters/DealerPicker";
import { ShadcnPagination } from "../table/DataTable";
import { WangjaiAdvisor } from "../ui/WangjaiAdvisor";

const MOBILE_PAGE_SIZE = 8;
const DESKTOP_PAGE_SIZE = 15;

type CustomerGroup = {
  customerCode: string;
  customerKey: string;
  customerName: string;
  latestPour: string | null;
  openOrderCount: number;
  orderCount: number;
  orders: OrderItem[];
  totalDelivered: number;
  totalOrdered: number;
  uniqueSiteCount: number;
};

function getOrderDateValue(order: OrderItem) {
  return parseDateValue(order.pour_datetime ?? order.updated_at ?? order.created_at);
}

function getOrderDateText(order: OrderItem) {
  return order.pour_datetime ?? order.updated_at ?? order.created_at ?? null;
}

function StatusBadge({ status }: { status?: string | null }) {
  const statusKey = getOrderStatusKey(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1",
        statusKey === "cancelled" && "bg-rose-50 text-rose-700 ring-rose-200",
        statusKey === "confirmed" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
        statusKey === "pending" && "bg-amber-50 text-amber-700 ring-amber-200",
        statusKey === "other" && "bg-slate-100 text-slate-700 ring-slate-200"
      )}
    >
      {orderStatusText(status)}
    </span>
  );
}

function buildCustomerGroups(orders: OrderItem[]): CustomerGroup[] {
  const map = new Map<string, CustomerGroup>();
  orders.forEach((order) => {
    const customerCode = order.customer?.code?.trim() || order.customer?.id?.toString() || "-";
    const customerName = order.customer?.name?.trim() || "ไม่ระบุลูกค้า";
    const key = `${customerCode}::${customerName}`;
    let group = map.get(key);
    if (!group) {
      group = {
        customerCode,
        customerKey: key,
        customerName,
        latestPour: null,
        openOrderCount: 0,
        orderCount: 0,
        orders: [],
        totalDelivered: 0,
        totalOrdered: 0,
        uniqueSiteCount: 0
      };
      map.set(key, group);
    }
    group.orders.push(order);
    group.orderCount += 1;
    group.totalOrdered += order.quantity?.ordered ?? 0;
    group.totalDelivered += order.quantity?.delivered ?? 0;
    const statusKey = getOrderStatusKey(order.status?.order);
    if (statusKey === "confirmed" || statusKey === "pending") group.openOrderCount += 1;

    const candidate = getOrderDateValue(order);
    const current = parseDateValue(group.latestPour);
    if (candidate && (!current || candidate > current)) {
      group.latestPour = getOrderDateText(order);
    }
  });

  // Compute unique sites per group + keep the newest order first inside each expanded group.
  const groups = [...map.values()];
  groups.forEach((group) => {
    const sites = new Set<string>();
    group.orders.forEach((order) => {
      if (order.site?.site_code) sites.add(order.site.site_code);
    });
    group.uniqueSiteCount = sites.size;
    group.orders.sort((a, b) => {
      const da = getOrderDateValue(a);
      const db = getOrderDateValue(b);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    });
  });

  return groups.sort((a, b) => {
    const latestDiff = (parseDateValue(b.latestPour)?.getTime() ?? 0) - (parseDateValue(a.latestPour)?.getTime() ?? 0);
    if (latestDiff !== 0) return latestDiff;
    if (b.totalOrdered !== a.totalOrdered) return b.totalOrdered - a.totalOrdered;
    if (b.orderCount !== a.orderCount) return b.orderCount - a.orderCount;
    return a.customerName.localeCompare(b.customerName, "th");
  });
}

function CustomerAccordionRow({
  expanded,
  group,
  onToggle
}: {
  expanded: boolean;
  group: CustomerGroup;
  onToggle: () => void;
}) {
  return (
    <div className={cn("border-b border-[#edf1f2] last:border-b-0", expanded && "bg-[#f4f8fb]/40")}>
      {/* Summary row */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={cn(
          "grid w-full grid-cols-[36px_minmax(0,2.4fr)_80px_110px_110px_140px] items-center gap-3 px-5 py-3.5 text-left transition-colors",
          expanded ? "bg-sky-50/60 hover:bg-sky-50" : "hover:bg-slate-50"
        )}
      >
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg transition-colors", expanded ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500")}>
          <ChevronDown size={16} className={cn("transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-950" title={group.customerName}>
            {group.customerName}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <span>รหัสลูกค้า {group.customerCode}</span>
            <span className="text-slate-300">·</span>
            <span>{formatNumber(group.uniqueSiteCount)} ไซต์</span>
            {group.openOrderCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span
                  className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                  title="นับเฉพาะ order ที่สถานะรอยืนยันหรือยืนยันแล้ว"
                >
                  {group.openOrderCount} รอ/ยืนยัน
                </span>
              </>
            )}
          </div>
        </div>
        <div className="text-right font-bold text-slate-900">{formatNumber(group.orderCount)}</div>
        <div className="text-right font-bold text-slate-900">
          {compactNumber(group.totalOrdered)} <span className="text-[10px] font-semibold text-slate-400">m³</span>
        </div>
        <div className={cn("text-right font-bold", group.totalDelivered > 0 ? "text-slate-900" : "text-slate-400")}>
          {compactNumber(group.totalDelivered)} <span className="text-[10px] font-semibold text-slate-400">m³</span>
        </div>
        <div className="truncate text-xs font-medium text-slate-600">{dateText(group.latestPour)}</div>
      </button>

      {/* Expanded order list */}
      {expanded && (
        <div className="border-t border-slate-100 bg-white px-5 py-3">
          <div className="max-h-[420px] overflow-auto rounded-lg border border-[#d9e3e6]">
            <table className="w-full min-w-[1120px] border-collapse text-[15px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9]">
                  <th className="w-[38%] border-r border-[#e5e9ec] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-500">
                    Order / Product
                  </th>
                  <th className="w-[28%] border-r border-[#e5e9ec] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-500">
                    Site
                  </th>
                  <th className="w-[9%] border-r border-[#e5e9ec] px-3 py-2.5 text-right text-[13px] font-semibold text-slate-500">
                    ปริมาณที่สั่ง
                  </th>
                  <th className="w-[9%] border-r border-[#e5e9ec] px-3 py-2.5 text-right text-[13px] font-semibold text-slate-500">
                    ปริมาณส่งจริง
                  </th>
                  <th className="w-[10%] border-r border-[#e5e9ec] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-500">
                    Pour Time ↓
                  </th>
                  <th className="w-[6%] px-3 py-2.5 text-left text-[13px] font-semibold text-slate-500">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody>
                {group.orders.map((order) => {
                  const rowKey = [
                    order.order?.order_no,
                    order.site?.site_code,
                    order.created_at ?? order.updated_at ?? order.pour_datetime
                  ]
                    .filter(Boolean)
                    .join("-");
                  return (
                    <tr
                      key={rowKey}
                      className="border-b border-[#edf1f2] transition-colors last:border-b-0 hover:bg-[#f3faf8]"
                    >
                      <td className="border-r border-[#edf1f2] px-3 py-2.5 align-middle">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-950" title={order.order?.product_sku ?? "-"}>
                            {order.order?.product_sku ?? "-"}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                            {order.order?.product_name ?? "-"}
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-[#edf1f2] px-3 py-2.5 align-middle">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-semibold text-slate-600" title={order.site?.site_code ?? "-"}>
                            {order.site?.site_code ?? "-"}
                          </div>
                          <div className="mt-0.5 truncate text-sm font-medium text-slate-800" title={order.site?.site_name ?? "-"}>
                            {order.site?.site_name ?? "-"}
                          </div>
                        </div>
                      </td>
                      <td className="border-r border-[#edf1f2] px-3 py-2.5 text-right align-middle font-semibold text-slate-800">
                        {formatNumber(order.quantity?.ordered ?? 0)}
                        <span className="ml-1 text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span>
                      </td>
                      <td
                        className={cn(
                          "border-r border-[#edf1f2] px-3 py-2.5 text-right align-middle font-semibold",
                          (order.quantity?.delivered ?? 0) > 0 ? "text-slate-800" : "text-slate-400"
                        )}
                      >
                        {formatNumber(order.quantity?.delivered ?? 0)}
                        <span className="ml-1 text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span>
                      </td>
                      <td className="border-r border-[#edf1f2] px-3 py-2.5 align-middle text-xs font-medium text-slate-600">
                        {dateText(getOrderDateText(order))}
                      </td>
                      <td className="px-3 py-2.5 align-middle">
                        <StatusBadge status={order.status?.order} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileCustomerCard({
  expanded,
  group,
  onToggle
}: {
  expanded: boolean;
  group: CustomerGroup;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[#edf1f2] last:border-b-0">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors", expanded ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500")}>
          <ChevronDown size={14} className={cn("transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-950" title={group.customerName}>{group.customerName}</div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            รหัสลูกค้า {group.customerCode} · {formatNumber(group.uniqueSiteCount)} ไซต์
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[10px] font-semibold text-slate-400">จำนวนออเดอร์</div>
              <div className="font-bold text-slate-800">{formatNumber(group.orderCount)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">ปริมาณที่สั่ง</div>
              <div className="font-bold text-slate-800">{compactNumber(group.totalOrdered)} <span className="text-[9px] text-slate-400">m³</span></div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">ปริมาณส่งจริง</div>
              <div className={cn("font-bold", group.totalDelivered > 0 ? "text-slate-800" : "text-slate-400")}>
                {compactNumber(group.totalDelivered)} <span className="text-[9px] text-slate-400">m³</span>
              </div>
            </div>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="bg-slate-50/40 px-4 pb-3 pt-1">
          {group.orders.map((order) => {
            const rowKey = [
              order.order?.order_no,
              order.site?.site_code,
              order.created_at ?? order.updated_at ?? order.pour_datetime
            ]
              .filter(Boolean)
              .join("-");
            return (
              <div key={rowKey} className="my-2 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-950">{order.order?.product_sku ?? "-"}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">{order.order?.product_name ?? "-"}</div>
                  </div>
                  <StatusBadge status={order.status?.order} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-slate-400">Site</div>
                    <div className="truncate font-semibold text-slate-700">{order.site?.site_code ?? "-"}</div>
                    <div className="truncate font-medium text-slate-500">{order.site?.site_name ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">เทเวลา</div>
                    <div className="font-medium text-slate-700">{dateText(getOrderDateText(order))}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">ปริมาณที่สั่ง</div>
                    <div className="font-bold text-slate-800">{formatNumber(order.quantity?.ordered ?? 0)} <span className="text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span></div>
                  </div>
                  <div>
                    <div className="text-slate-400">ปริมาณส่งจริง</div>
                    <div className="font-bold text-slate-800">{formatNumber(order.quantity?.delivered ?? 0)} <span className="text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function OrdersPage({
  dealers,
  orders,
  ordersState,
  orderSearch,
  selectedDealer,
  selectedDealerId,
  setOrderSearch,
  setSelectedDealerId
}: {
  dealers: Dealer[];
  orders: OrderItem[];
  ordersState: ApiState;
  orderSearch: string;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setOrderSearch: (value: string) => void;
  setSelectedDealerId: (id: number | null) => void;
}) {
  const [mobilePage, setMobilePage] = useState(1);
  const [desktopPage, setDesktopPage] = useState(1);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const dealerOrders = useMemo(
    () => orders.filter((row) => selectedDealerId == null || row.dealer_id === selectedDealerId),
    [orders, selectedDealerId]
  );

  const customerGroups = useMemo(() => buildCustomerGroups(dealerOrders), [dealerOrders]);

  const totalOrdered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0);
  const totalDelivered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0);

  const toggleCustomer = (key: string) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const expandAll = () => setExpandedCustomers(new Set(customerGroups.map((g) => g.customerKey)));
  const collapseAll = () => setExpandedCustomers(new Set());

  // Desktop pagination
  const desktopRows = customerGroups.slice((desktopPage - 1) * DESKTOP_PAGE_SIZE, desktopPage * DESKTOP_PAGE_SIZE);

  // Mobile pagination
  const mobileRows = customerGroups.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);

  return (
    <>
      <DealerPicker
        dealers={dealers}
        includeAll
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        title="เลือก Dealer หรือดูรายการ Order ทั้งหมด"
      />

      <WangjaiAdvisor
        accent="slate"
        compact
        message="ผมอยู่เป็นตัวช่วยตรวจรายการ order: ค้นหาลูกค้า ไซต์ หรือสินค้า แล้วกางแถวเพื่อดูรายละเอียดงานเท"
        stats={[
          { label: "Scope", value: selectedDealer?.dealer_name ?? "ทุก Dealer" },
          { label: "ออเดอร์", value: formatNumber(dealerOrders.length) },
          { label: "ส่งจริง", value: `${compactNumber(totalDelivered)} m³` }
        ]}
        title="เช็กรายการ Order แบบเร็ว"
      />

      <section className="grid grid-cols-1">
        <SummaryKpiStrip
          items={[
            {
              detail: selectedDealer?.dealer_name ?? "ลูกค้าทั้งหมดที่กรองอยู่",
              icon: <Users size={14} />,
              label: "จำนวนลูกค้า",
              value: formatNumber(customerGroups.length)
            },
            {
              detail: "จำนวนออเดอร์รวมจากทุกลูกค้า",
              icon: <PackageCheck size={14} />,
              label: "จำนวนออเดอร์",
              value: formatNumber(dealerOrders.length)
            },
            {
              detail: "ปริมาณที่สั่งรวมจาก order ทั้งหมด",
              icon: <TrendingUp size={14} />,
              label: "ปริมาณที่สั่ง",
              value: (
                <>
                  {compactNumber(totalOrdered)}{" "}
                  <span className="text-xs font-semibold text-slate-400">m³</span>
                </>
              )
            },
            {
              detail: "ปริมาณส่งจริงรวมจาก order ทั้งหมด",
              icon: <PackageCheck size={14} />,
              label: "ปริมาณส่งจริง",
              value: (
                <>
                  {compactNumber(totalDelivered)}{" "}
                  <span className="text-xs font-semibold text-slate-400">m³</span>
                </>
              )
            }
          ]}
        />
      </section>

      {/* ─── Mobile customer accordion (hidden on md+) ─── */}
      <Card className="dashboard-card overflow-hidden md:hidden">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="space-y-2">
            <div>
              <CardTitle className="text-base">Order List ของ Dealer</CardTitle>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                รวมตามลูกค้า · เรียงตามเวลาเทล่าสุดจากใหม่ไปเก่า · แตะเพื่อกางดูออเดอร์ของลูกค้านั้น
              </p>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา customer / site / product"
                value={orderSearch}
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setMobilePage(1);
                }}
              />
            </label>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500">{formatNumber(customerGroups.length)} ลูกค้า · {formatNumber(dealerOrders.length)} ออเดอร์</span>
              <div className="flex gap-1.5">
                <button type="button" onClick={expandAll} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600">กางทั้งหมด</button>
                <button type="button" onClick={collapseAll} className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-600">ย่อทั้งหมด</button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {ordersState === "loading" && (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">กำลังโหลดข้อมูล...</div>
          )}
          {ordersState !== "loading" && customerGroups.length === 0 && (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">ไม่มีข้อมูล</div>
          )}
          {ordersState !== "loading" && mobileRows.map((group) => (
            <MobileCustomerCard
              key={group.customerKey}
              expanded={expandedCustomers.has(group.customerKey)}
              group={group}
              onToggle={() => toggleCustomer(group.customerKey)}
            />
          ))}
        </CardContent>

        {customerGroups.length > 0 && (
          <ShadcnPagination
            currentPage={mobilePage}
            pageSize={MOBILE_PAGE_SIZE}
            totalItems={customerGroups.length}
            totalPages={Math.max(Math.ceil(customerGroups.length / MOBILE_PAGE_SIZE), 1)}
            onPageChange={setMobilePage}
          />
        )}
      </Card>

      {/* ─── Desktop customer accordion (hidden below md) ─── */}
      <Card className="dashboard-card hidden overflow-hidden md:block">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] xl:items-center">
            <div>
              <CardTitle className="text-lg">Order List ของ Dealer</CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500">
                รวมตามลูกค้า · เรียงตามเวลาเทล่าสุดจากใหม่ไปเก่า · คลิกแถวเพื่อกางดูออเดอร์ของลูกค้านั้น
              </p>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา customer / site / product"
                value={orderSearch}
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setDesktopPage(1);
                }}
              />
            </label>
          </div>
        </CardHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/40 px-5 py-2.5 text-[11px]">
          <span className="font-semibold text-slate-500">
            <strong className="text-slate-900">{formatNumber(customerGroups.length)}</strong> ลูกค้า · <strong className="text-slate-900">{formatNumber(dealerOrders.length)}</strong> ออเดอร์
            {expandedCustomers.size > 0 && (
              <span className="ml-2 text-sky-700">· เปิด {expandedCustomers.size} ราย</span>
            )}
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              กางทั้งหมด
            </button>
            <button
              type="button"
              onClick={collapseAll}
              disabled={expandedCustomers.size === 0}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
            >
              ย่อทั้งหมด
            </button>
          </div>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[36px_minmax(0,2.4fr)_80px_110px_110px_140px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          <span></span>
          <span>ลูกค้า</span>
          <span className="text-right">จำนวนออเดอร์</span>
          <span className="text-right">จำนวนที่สั่ง</span>
          <span className="text-right">จำนวนที่ส่งจริง</span>
          <span>เทล่าสุด ↓</span>
        </div>

        <CardContent className="p-0">
          {ordersState === "loading" && (
            <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">กำลังโหลดข้อมูล...</div>
          )}
          {ordersState !== "loading" && customerGroups.length === 0 && (
            <div className="px-5 py-12 text-center text-sm font-semibold text-slate-500">ไม่มีข้อมูล</div>
          )}
          {ordersState !== "loading" &&
            desktopRows.map((group) => (
              <CustomerAccordionRow
                key={group.customerKey}
                expanded={expandedCustomers.has(group.customerKey)}
                group={group}
                onToggle={() => toggleCustomer(group.customerKey)}
              />
            ))}
        </CardContent>

        {customerGroups.length > 0 && (
          <ShadcnPagination
            currentPage={desktopPage}
            pageSize={DESKTOP_PAGE_SIZE}
            totalItems={customerGroups.length}
            totalPages={Math.max(Math.ceil(customerGroups.length / DESKTOP_PAGE_SIZE), 1)}
            onPageChange={setDesktopPage}
          />
        )}
      </Card>
    </>
  );
}
