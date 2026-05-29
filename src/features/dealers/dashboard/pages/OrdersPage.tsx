import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, PackageCheck, Search, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { dateText, parseDateValue } from "../lib/dates";
import { getOrderStatusKey, orderStatusText } from "../lib/status";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
import { DealerPicker } from "../filters/DealerPicker";

const MOBILE_PAGE_SIZE = 8;
const DESKTOP_PAGE_SIZE = 15;

type CustomerGroup = {
  activeOrderCount: number;
  customerCode: string;
  customerKey: string;
  customerName: string;
  latestPour: string | null;
  orderCount: number;
  orders: OrderItem[];
  totalDelivered: number;
  totalOrdered: number;
  uniqueSiteCount: number;
};

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
        activeOrderCount: 0,
        customerCode,
        customerKey: key,
        customerName,
        latestPour: null,
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
    if (statusKey === "confirmed" || statusKey === "pending") group.activeOrderCount += 1;

    const candidate = parseDateValue(order.pour_datetime ?? order.updated_at ?? order.created_at);
    const current = parseDateValue(group.latestPour);
    if (candidate && (!current || candidate > current)) {
      group.latestPour = order.pour_datetime ?? order.updated_at ?? order.created_at ?? null;
    }
  });

  // Compute unique sites per group + sort orders inside each group by pour_datetime desc
  const groups = [...map.values()];
  groups.forEach((group) => {
    const sites = new Set<string>();
    group.orders.forEach((order) => {
      if (order.site?.site_code) sites.add(order.site.site_code);
    });
    group.uniqueSiteCount = sites.size;
    group.orders.sort((a, b) => {
      const da = parseDateValue(a.pour_datetime ?? a.updated_at ?? a.created_at);
      const db = parseDateValue(b.pour_datetime ?? b.updated_at ?? b.created_at);
      return (db?.getTime() ?? 0) - (da?.getTime() ?? 0);
    });
  });

  return groups.sort((a, b) => b.totalOrdered - a.totalOrdered);
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
            <span>{group.customerCode}</span>
            <span className="text-slate-300">·</span>
            <span>{formatNumber(group.uniqueSiteCount)} sites</span>
            {group.activeOrderCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {group.activeOrderCount} active
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
        <div className="border-t border-slate-100 bg-white px-5 pb-3 pt-2">
          {/* Sub-header */}
          <div className="grid grid-cols-[1.4fr_1fr_80px_80px_140px_100px] gap-3 border-b border-slate-100 px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Order / Product</span>
            <span>Site</span>
            <span className="text-right">Ordered</span>
            <span className="text-right">Delivered</span>
            <span>Pour Time</span>
            <span>สถานะ</span>
          </div>
          {group.orders.map((order) => {
            const rowKey = [
              order.order?.order_no,
              order.site?.site_code,
              order.created_at ?? order.updated_at ?? order.pour_datetime
            ]
              .filter(Boolean)
              .join("-");
            return (
              <div
                key={rowKey}
                className="grid grid-cols-[1.4fr_1fr_80px_80px_140px_100px] gap-3 border-b border-slate-50 px-3 py-2.5 text-sm last:border-b-0 hover:bg-slate-50/50"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-950" title={order.order?.product_name ?? "-"}>
                    {order.order?.product_name ?? "-"}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                    {order.order?.order_no ?? "-"} | {order.order?.product_sku ?? "-"}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate" title={order.site?.site_name ?? "-"}>{order.site?.site_name ?? "-"}</div>
                  <div className="text-[11px] font-medium text-slate-500">{order.site?.site_code ?? "-"}</div>
                </div>
                <div className="text-right font-semibold text-slate-800">
                  {formatNumber(order.quantity?.ordered ?? 0)}
                  <span className="ml-1 text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span>
                </div>
                <div className={cn("text-right font-semibold", (order.quantity?.delivered ?? 0) > 0 ? "text-slate-800" : "text-slate-400")}>
                  {formatNumber(order.quantity?.delivered ?? 0)}
                  <span className="ml-1 text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span>
                </div>
                <div className="text-xs font-medium text-slate-600">{dateText(order.pour_datetime)}</div>
                <div>
                  <StatusBadge status={order.status?.order} />
                </div>
              </div>
            );
          })}
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
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">{group.customerCode} · {formatNumber(group.uniqueSiteCount)} sites</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-[10px] font-semibold text-slate-400">Orders</div>
              <div className="font-bold text-slate-800">{formatNumber(group.orderCount)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">Ordered</div>
              <div className="font-bold text-slate-800">{compactNumber(group.totalOrdered)} <span className="text-[9px] text-slate-400">m³</span></div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">Delivered</div>
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
                    <div className="truncate text-sm font-semibold text-slate-950">{order.order?.product_name ?? "-"}</div>
                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">{order.order?.order_no ?? "-"}</div>
                  </div>
                  <StatusBadge status={order.status?.order} />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-slate-400">Site</div>
                    <div className="truncate font-medium text-slate-700">{order.site?.site_name ?? "-"}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">เทเวลา</div>
                    <div className="font-medium text-slate-700">{dateText(order.pour_datetime)}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Ordered</div>
                    <div className="font-bold text-slate-800">{formatNumber(order.quantity?.ordered ?? 0)} <span className="text-[10px] text-slate-400">{order.quantity?.unit ?? "-"}</span></div>
                  </div>
                  <div>
                    <div className="text-slate-400">Delivered</div>
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
  const desktopTotalPages = Math.max(Math.ceil(customerGroups.length / DESKTOP_PAGE_SIZE), 1);
  const desktopStart = customerGroups.length ? (desktopPage - 1) * DESKTOP_PAGE_SIZE + 1 : 0;
  const desktopEnd = Math.min(desktopPage * DESKTOP_PAGE_SIZE, customerGroups.length);
  const desktopRows = customerGroups.slice((desktopPage - 1) * DESKTOP_PAGE_SIZE, desktopPage * DESKTOP_PAGE_SIZE);

  // Mobile pagination
  const mobileTotalPages = Math.max(Math.ceil(customerGroups.length / MOBILE_PAGE_SIZE), 1);
  const mobileRows = customerGroups.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);
  const mobileStart = customerGroups.length ? (mobilePage - 1) * MOBILE_PAGE_SIZE + 1 : 0;
  const mobileEnd = Math.min(mobilePage * MOBILE_PAGE_SIZE, customerGroups.length);

  return (
    <>
      <DealerPicker
        dealers={dealers}
        includeAll
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        title="เลือก Dealer หรือดูรายการ Order ทั้งหมด"
      />

      <section className="grid grid-cols-1">
        <SummaryKpiStrip
          items={[
            {
              detail: selectedDealer?.dealer_name ?? "ลูกค้าทั้งหมดที่กรองอยู่",
              icon: <Users size={14} />,
              label: "Customer Count",
              value: formatNumber(customerGroups.length)
            },
            {
              detail: "จำนวน orders รวมจากทุกลูกค้า",
              icon: <PackageCheck size={14} />,
              label: "Order Count",
              value: formatNumber(dealerOrders.length)
            },
            {
              detail: "ปริมาณที่สั่งรวมจาก order ทั้งหมด",
              icon: <TrendingUp size={14} />,
              label: "Ordered Volume",
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
              label: "Delivered Volume",
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
                รวมตามลูกค้า · แตะเพื่อกางดู order ของลูกค้านั้น
              </p>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา customer / site / order / product"
                value={orderSearch}
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setMobilePage(1);
                }}
              />
            </label>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-500">{formatNumber(customerGroups.length)} ลูกค้า · {formatNumber(dealerOrders.length)} orders</span>
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
          <div className="flex items-center justify-between border-t border-[#d9e3e6] bg-white px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-500">
              {formatNumber(mobileStart)}–{formatNumber(mobileEnd)} จาก {formatNumber(customerGroups.length)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={mobilePage === 1}
                onClick={() => setMobilePage((p) => Math.max(p - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">{mobilePage} / {mobileTotalPages}</span>
              <button
                type="button"
                disabled={mobilePage === mobileTotalPages}
                onClick={() => setMobilePage((p) => Math.min(p + 1, mobileTotalPages))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Desktop customer accordion (hidden below md) ─── */}
      <Card className="dashboard-card hidden overflow-hidden md:block">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)] xl:items-center">
            <div>
              <CardTitle className="text-lg">Order List ของ Dealer</CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500">
                รวมตามลูกค้า · คลิกแถวเพื่อกางดู order ของลูกค้านั้น · กางได้หลายคนพร้อมกัน
              </p>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา customer / site / order no / product"
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
            <strong className="text-slate-900">{formatNumber(customerGroups.length)}</strong> ลูกค้า · <strong className="text-slate-900">{formatNumber(dealerOrders.length)}</strong> orders
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
          <span>Customer</span>
          <span className="text-right">Orders</span>
          <span className="text-right">Ordered</span>
          <span className="text-right">Delivered</span>
          <span>Pour ล่าสุด</span>
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
          <div className="flex items-center justify-between border-t border-[#d9e3e6] bg-white px-5 py-2.5">
            <span className="text-xs font-semibold text-slate-500">
              แสดง {formatNumber(desktopStart)}–{formatNumber(desktopEnd)} จาก {formatNumber(customerGroups.length)} ลูกค้า
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={desktopPage === 1}
                onClick={() => setDesktopPage((p) => Math.max(p - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">{desktopPage} / {desktopTotalPages}</span>
              <button
                type="button"
                disabled={desktopPage === desktopTotalPages}
                onClick={() => setDesktopPage((p) => Math.min(p + 1, desktopTotalPages))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
