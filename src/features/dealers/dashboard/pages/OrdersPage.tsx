import { useMemo, useState } from "react";
import { ClipboardList, ChevronDown, PackageCheck, Search, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { OrderItem } from "@/features/dealers/types";
import { useDashboardOutletContext } from "../DealerDashboardApp";
import { dateText, parseDateValue } from "../lib/dates";
import { getOrderStatusKey, orderStatusText } from "../lib/status";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
import { ShadcnPagination } from "../table/DataTable";
import type { DataColumn } from "../table/types";
import { buildOrderGroups, type OrderGroup } from "../lib/order-groups";

const MOBILE_PAGE_SIZE = 8;
const DESKTOP_PAGE_SIZE = 15;
type OrderListView = "dealer" | "customer";
type QuantityFilter = "all" | "zero" | "positive" | "under10" | "10to50" | "50to100" | "100plus";
type OrderStatusFilter = "all" | "__empty__" | string;

const QUANTITY_FILTER_OPTIONS: Array<{ label: string; value: QuantityFilter }> = [
  { label: "ทั้งหมด", value: "all" },
  { label: "0 คิว", value: "zero" },
  { label: "> 0 คิว", value: "positive" },
  { label: "1–10 คิว", value: "under10" },
  { label: "11–50 คิว", value: "10to50" },
  { label: "51–100 คิว", value: "50to100" },
  { label: "101+ คิว", value: "100plus" }
];

function matchesQuantityFilter(value: number, filter: QuantityFilter) {
  switch (filter) {
    case "zero":
      return value === 0;
    case "positive":
      return value > 0;
    case "under10":
      return value > 0 && value <= 10;
    case "10to50":
      return value > 10 && value <= 50;
    case "50to100":
      return value > 50 && value <= 100;
    case "100plus":
      return value > 100;
    default:
      return true;
  }
}

function matchesOrderStatusFilter(value: string | null | undefined, filter: OrderStatusFilter) {
  const normalized = String(value ?? "").trim();
  if (filter === "all") return true;
  if (filter === "__empty__") return !normalized;
  return normalized === filter;
}

function QuantityFilterSelect({
  label,
  value,
  onChange
}: {
  label: string;
  value: QuantityFilter;
  onChange: (value: QuantityFilter) => void;
}) {
  return (
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 transition-colors focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
      <span className="shrink-0 text-[11px] font-bold text-slate-500">{label}</span>
      <select
        aria-label={label}
        className="min-w-0 flex-1 cursor-pointer bg-transparent text-xs font-semibold text-slate-700 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value as QuantityFilter)}
      >
        {QUANTITY_FILTER_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function OrderStatusFilterSelect({
  value,
  options,
  onChange
}: {
  value: OrderStatusFilter;
  options: string[];
  onChange: (value: OrderStatusFilter) => void;
}) {
  return (
    <label className="flex h-10 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 transition-colors focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100">
      <span className="shrink-0 text-[11px] font-bold text-slate-500">สถานะการเท</span>
      <select
        aria-label="สถานะการเท"
        className="min-w-0 flex-1 cursor-pointer bg-transparent text-xs font-semibold text-slate-700 outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value as OrderStatusFilter)}
      >
        <option value="all">ทั้งหมด</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
        <option value="__empty__">ไม่มีสถานะ</option>
      </select>
    </label>
  );
}

type CustomerSiteRow = {
  key: string;
  customerCode: string;
  customerName: string;
  dealerCode: string;
  dealerName: string;
  siteCode: string;
  siteName: string;
  orderCount: number;
  totalDelivered: number;
  totalOrdered: number;
  latestPour: string | null;
};

function getPourDateText(order: OrderItem) {
  if (getOrderStatusKey(order.status?.order) === "cancelled") return null;
  return order.pour_datetime ?? null;
}

function getOrderUpdateDateText(order: OrderItem) {
  return order.updated_at ?? null;
}

function getOrderCreatedDateText(order: OrderItem) {
  return order.created_at ?? null;
}

function CompactDateTime({ value }: { value?: string | null }) {
  const text = dateText(value);
  const parts = text.split(" ");
  if (parts.length < 3) return <span>{text}</span>;

  return (
    <span className="block leading-4">
      <span className="block whitespace-nowrap">{parts.slice(0, 3).join(" ")}</span>
      <span className="block whitespace-nowrap">{parts.slice(3).join(" ")}</span>
    </span>
  );
}

function CompactLabeledDateTime({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="whitespace-nowrap text-[11px] leading-4">
      <span className="mr-1 text-slate-500">{label}</span>
      <span>{dateText(value)}</span>
    </div>
  );
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

function OrderListTabs({ value, onChange }: { value: OrderListView; onChange: (value: OrderListView) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1">
      {(["dealer", "customer"] as const).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={cn(
            "min-h-10 rounded-lg px-3 py-1.5 text-left text-xs font-bold transition-all sm:px-3",
            value === mode
              ? "bg-white text-sky-700 shadow-[0_2px_8px_rgba(15,23,42,0.08)] ring-1 ring-slate-200"
              : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
          )}
        >
          <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400">มุมมอง {mode === "dealer" ? "01" : "02"}</span>
          <span className="block truncate">{mode === "dealer" ? "แยกตาม Dealer" : "แยกตามรายลูกค้า"}</span>
        </button>
      ))}
    </div>
  );
}

function CustomerSiteTable({ rows }: { rows: CustomerSiteRow[] }) {
  return (
    <div className="overflow-auto [&_th]:px-4 [&_th]:py-4 [&_td]:px-4 [&_td]:py-4">
      <table className="dealer-analysis-table w-full min-w-[980px] border-collapse text-sm leading-5">
        <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
          <tr>
            {['ชื่อลูกค้า', 'ไซต์', 'จำนวนออเดอร์', 'สั่ง (คิว)', 'ส่งจริง (คิว)', 'Dealer', 'ข้อมูลล่าสุด'].map((label) => (
              <th key={label} className="whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-4 py-4 font-bold last:border-r-0">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-slate-100 align-top hover:bg-sky-50/40">
              <td className="border-r border-slate-100 px-4 py-4"><div className="font-semibold">{row.customerName}</div><div className="text-xs text-slate-500">รหัสลูกค้า {row.customerCode}</div></td>
              <td className="border-r border-slate-100 px-4 py-4"><div className="font-semibold">รหัส Site: {row.siteCode}</div><div className="max-w-[300px] truncate text-xs text-slate-500">{row.siteName}</div></td>
              <td className="border-r border-slate-100 px-4 py-4 text-right font-semibold">{formatNumber(row.orderCount)}</td>
              <td className="border-r border-slate-100 px-4 py-4 text-right font-semibold">{formatNumber(row.totalOrdered)}</td>
              <td className="border-r border-slate-100 px-4 py-4 text-right font-semibold">{formatNumber(row.totalDelivered)}</td>
              <td className="border-r border-slate-100 px-4 py-4"><div className="font-semibold">{row.dealerName}</div><div className="text-xs text-slate-500">{row.dealerCode}</div></td>
              <td className="px-4 py-4 text-xs"><CompactDateTime value={row.latestPour} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerSiteCard({ row }: { row: CustomerSiteRow }) {
  return (
    <div className="border-b border-[#edf1f2] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-slate-950">{row.customerName}</div>
          <div className="text-[11px] font-medium text-slate-500">รหัสลูกค้า {row.customerCode}</div>
        </div>
        <div className="shrink-0 text-right text-[11px] font-semibold text-slate-500">{formatNumber(row.orderCount)} ออเดอร์</div>
      </div>
      <div className="mt-2 rounded-md bg-sky-50 px-2 py-1.5 text-xs">
        <div className="font-bold text-sky-700">รหัส Site: {row.siteCode}</div>
        <div className="truncate text-slate-600">{row.siteName}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div><div className="text-slate-400">Dealer</div><div className="truncate font-semibold text-slate-700">{row.dealerName}</div></div>
        <div><div className="text-slate-400">ข้อมูลล่าสุด</div><div className="font-medium text-slate-700"><CompactDateTime value={row.latestPour} /></div></div>
        <div><div className="text-slate-400">สั่ง (คิว)</div><div className="font-bold text-slate-800">{formatNumber(row.totalOrdered)}</div></div>
        <div><div className="text-slate-400">ส่งจริง (คิว)</div><div className="font-bold text-slate-800">{formatNumber(row.totalDelivered)}</div></div>
      </div>
    </div>
  );
}

function buildCustomerSiteRows(orders: OrderItem[]): CustomerSiteRow[] {
  const map = new Map<string, CustomerSiteRow>();

  orders.forEach((order) => {
    const customerCode = order.customer?.code?.trim() || order.customer?.id?.toString() || "-";
    const customerName = order.customer?.name?.trim() || "ไม่ระบุลูกค้า";
    const dealerCode = order.dealer_code?.trim() || String(order.dealer_id);
    const dealerName = order.dealer_name?.trim() || "ไม่ระบุ Dealer";
    const siteCode = order.site?.site_code?.trim() || "-";
    const siteName = order.site?.site_name?.trim() || "ไม่ระบุ Site";
    const key = `${order.dealer_id}::${customerCode}::${siteCode}::${siteName}`;
    const current = map.get(key) ?? {
      key,
      customerCode,
      customerName,
      dealerCode,
      dealerName,
      siteCode,
      siteName,
      orderCount: 0,
      totalDelivered: 0,
      totalOrdered: 0,
      latestPour: null
    };

    current.orderCount += 1;
    current.totalOrdered += order.quantity?.ordered ?? 0;
    current.totalDelivered += order.quantity?.delivered ?? 0;
    const candidate = parseDateValue(getPourDateText(order));
    const latest = parseDateValue(current.latestPour);
    if (candidate && (!latest || candidate > latest)) current.latestPour = getPourDateText(order);
    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => {
    const customerDiff = a.customerName.localeCompare(b.customerName, "th");
    if (customerDiff !== 0) return customerDiff;
    const siteDiff = a.siteName.localeCompare(b.siteName, "th");
    if (siteDiff !== 0) return siteDiff;
    return (parseDateValue(b.latestPour)?.getTime() ?? 0) - (parseDateValue(a.latestPour)?.getTime() ?? 0);
  });
}


function SiteLocation({ order }: { order: OrderItem }) {
  const rawLat = order.site?.latitude;
  const rawLng = order.site?.longitude;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!rawLat?.trim() || !rawLng?.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) ||
      Math.abs(lat) > 90 || Math.abs(lng) > 180) return <span className="text-slate-400">ไม่มีพิกัด</span>;
  return (
    <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
      className="inline-block text-sky-700 underline underline-offset-4">
      เปิดแผนที่
      <span className="mt-1 block text-xs text-slate-500">{lat}, {lng}</span>
    </a>
  );
}

function OrderDetailsTable({ orders }: { orders: OrderItem[] }) {
  const columns: DataColumn<OrderItem>[] = [
    { key: "orderNo", title: "Order No.", width: 110, render: (_, row) => <strong>{row.order?.order_no || "-"}</strong> },
    { key: "customer", title: "ลูกค้า / รหัส", width: 220, render: (_, row) => <><div className="font-semibold">{row.customer?.name || "ไม่ระบุลูกค้า"}</div><div className="mt-1 text-xs text-slate-500">{row.customer?.code || row.customer?.id || "-"}</div></> },
    { key: "product", title: "Product รหัส / ชื่อ", width: 200, render: (_, row) => <><div className="font-semibold">{row.order?.product_sku || "-"}</div><div className="mt-1 text-slate-500">{row.order?.product_name || "-"}</div></> },
    { key: "site", title: "Site ชื่อ / code", width: 220, render: (_, row) => <><div>{row.site?.site_name || "-"}</div><div className="mt-1 text-xs text-slate-500">{row.site?.site_code || "-"}</div></> },
    { key: "ordered", title: "ยอดจอง (คิว)", width: 100, align: "right", render: (_, row) => formatNumber(row.quantity?.ordered ?? 0) },
    { key: "booked", title: "เวลาจอง", width: 140, render: (_, row) => <CompactDateTime value={row.booked_at} /> },
    { key: "delivered", title: "ยอดเท (คิว)", width: 100, align: "right", render: (_, row) => formatNumber(row.quantity?.delivered ?? 0) },
    { key: "memo", title: "หมายเหตุ", width: 190, render: (_, row) => <span className="whitespace-pre-wrap break-words">{row.memo || "-"}</span> },
    { key: "timestamps", title: "สร้าง / อัปเดต", width: 155, render: (_, row) => <div className="space-y-1"><CompactLabeledDateTime label="สร้าง" value={getOrderCreatedDateText(row)} /><CompactLabeledDateTime label="อัปเดต" value={getOrderUpdateDateText(row)} /></div> },
    { key: "status", title: "สถานะการเท", width: 105, render: (_, row) => <StatusBadge status={row.status?.order} /> },
    { key: "location", title: "Location Site", width: 165, render: (_, row) => <SiteLocation order={row} /> },
    { key: "pour", title: "เวลาเท", width: 145, render: (_, row) => <CompactDateTime value={getPourDateText(row)} /> }
  ];
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rows = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white">
      <p className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">รายละเอียดออเดอร์ · เลื่อนตารางแนวนอนเพื่อดูทุกคอลัมน์</p>
      <div className="hidden overflow-x-auto xl:block" tabIndex={0} role="region" aria-label="รายละเอียดออเดอร์ เลื่อนดูทุกคอลัมน์">
        <table className="dealer-analysis-table w-full table-fixed border-collapse text-sm leading-6" style={{ minWidth: columns.reduce((sum, column) => sum + (column.width ?? 0), 0) }}>
          <colgroup>{columns.map((column) => <col key={column.key} style={{ width: column.width }} />)}</colgroup>
          <thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={cn("whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2.5 py-2.5 font-bold text-slate-600", column.align === "right" ? "text-right" : "text-left")}>{column.title}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={`${row.order?.order_no}-${index}`} className="border-b border-slate-100 last:border-0 hover:bg-sky-50/40">{columns.map((column) => <td key={column.key} className={cn("break-words px-2.5 py-2.5 align-top", column.align === "right" && "text-right tabular-nums")}>{column.render?.(undefined as never, row)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="divide-y divide-slate-200 xl:hidden">
        {rows.map((row, index) => <dl key={`${row.order?.order_no}-${index}`} className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">{columns.map((column) => <div key={column.key} className="min-w-0"><dt className="mb-1 text-xs text-slate-500">{column.title}</dt><dd className="break-words text-sm leading-6 text-slate-800">{column.render?.(undefined as never, row)}</dd></div>)}</dl>)}
      </div>
      <ShadcnPagination currentPage={currentPage} pageSize={pageSize} totalItems={orders.length} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}

function DealerAccordionRow({ expanded, group, onToggle }: { expanded: boolean; group: OrderGroup; onToggle: () => void }) {
  return (
    <>
      <tr className={cn("hover:bg-slate-50", expanded && "bg-sky-50/60")}>
        <td className="px-4 py-4 align-middle">
          <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-3 text-left">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", expanded ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500")}>
              <ChevronDown size={16} className={expanded ? "" : "-rotate-90"} />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-950">{group.name}</span>
              <span className="mt-1 block text-xs text-slate-500">{group.codeLabel} {group.code} · {formatNumber(group.uniqueCustomerCount)} ลูกค้า · {formatNumber(group.uniqueSiteCount)} ไซต์</span>
            </span>
          </button>
        </td>
        <td className="px-4 py-4 text-right align-middle font-semibold">{formatNumber(group.orderCount)}</td>
        <td className="px-4 py-4 text-right align-middle font-semibold"><span className="text-sky-700">{compactNumber(group.wangjaiBooked)}</span></td>
        <td className="px-4 py-4 text-right align-middle font-semibold">{compactNumber(group.otherBooked)}</td>
        <td className="px-4 py-4 text-right align-middle font-semibold">{compactNumber(group.totalDelivered)}</td>
        <td className="px-4 py-4 align-middle"><CompactDateTime value={group.latestPour} /></td>
      </tr>
      {expanded && (
        <tr><td colSpan={6} className="bg-slate-50/40 p-4">
          <div className="min-w-0 overflow-hidden"><OrderDetailsTable orders={group.orders} /></div>
        </td></tr>
      )}
    </>
  );
}

function MobileDealerCard({
  expanded,
  group,
  onToggle
}: {
  expanded: boolean;
  group: OrderGroup;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[#edf1f2] last:border-b-0">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors", expanded ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-500")}>
          <ChevronDown size={14} className={cn("transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-950" title={group.name}>{group.name}</div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-500">
            {group.codeLabel} {group.code} · {formatNumber(group.uniqueCustomerCount)} ลูกค้า · {formatNumber(group.uniqueSiteCount)} ไซต์
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-xs">
            <div>
              <div className="text-[10px] font-semibold text-slate-400">จำนวนออเดอร์ (ครั้ง)</div>
              <div className="font-bold text-slate-800">{formatNumber(group.orderCount)}</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">จองผ่านน้องวางใจ</div>
              <div className="font-bold text-sky-700">{compactNumber(group.wangjaiBooked)} <span className="text-[9px] text-slate-400">{group.unit}</span></div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">จองผ่านช่องทางอื่น</div>
              <div className="font-bold text-slate-800">{compactNumber(group.otherBooked)} <span className="text-[9px] text-slate-400">{group.unit}</span></div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">สั่งใน Orders ({group.unit})</div>
              <div className="font-bold text-slate-800">{compactNumber(group.totalOrdered)} <span className="text-[9px] text-slate-400">{group.unit}</span></div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-slate-400">ส่งจริงใน Orders ({group.unit})</div>
              <div className={cn("font-bold", group.totalDelivered > 0 ? "text-slate-800" : "text-slate-400")}>
                {compactNumber(group.totalDelivered)} <span className="text-[9px] text-slate-400">{group.unit}</span>
              </div>
            </div>
          </div>
        </div>
      </button>
      {expanded && (
        <div className="bg-slate-50/40 p-3">
          <OrderDetailsTable orders={group.orders} />
        </div>
      )}
    </div>
  );
}

export function OrdersPage() {
  const { data, filters } = useDashboardOutletContext();
  const {
    filteredOrders: orders,
    ordersState,
    dealers
  } = data;
  const { orderSearch, setOrderSearch } = filters;
  const [orderedFilter, setOrderedFilter] = useState<QuantityFilter>("positive");
  const [deliveredFilter, setDeliveredFilter] = useState<QuantityFilter>("positive");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [viewMode, setViewMode] = useState<OrderListView>("dealer");
  const [dealerMobilePage, setDealerMobilePage] = useState(1);
  const [dealerDesktopPage, setDealerDesktopPage] = useState(1);
  const [customerMobilePage, setCustomerMobilePage] = useState(1);
  const [customerDesktopPage, setCustomerDesktopPage] = useState(1);
  const [expandedDealers, setExpandedDealers] = useState<Set<string>>(new Set());

  const dealerOrders = useMemo(
    () =>
      orders.filter((order) =>
        matchesQuantityFilter(order.quantity?.ordered ?? 0, orderedFilter) &&
        matchesQuantityFilter(order.quantity?.delivered ?? 0, deliveredFilter) &&
        matchesOrderStatusFilter(order.status?.order, statusFilter)
      ),
    [deliveredFilter, orderedFilter, orders, statusFilter]
  );

  const statusOptions = useMemo(
    () => [...new Set(orders.map((order) => String(order.status?.order ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [orders]
  );

  const dealerGroups = useMemo(() => buildOrderGroups(dealerOrders, "dealer", dealers), [dealerOrders, dealers]);
  const customerSiteRows = useMemo(() => buildCustomerSiteRows(dealerOrders), [dealerOrders]);

  const totalOrdered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0);
  const deliveredOrders = dealerOrders.filter((row) => (row.quantity?.delivered ?? 0) > 0);
  const totalDelivered = deliveredOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0);
  const orderUnit = "คิว";
  const orderListTitle = viewMode === "dealer" ? "Order List แยกตาม Dealer" : "Order List แยกตามรายลูกค้า";

  const handleOrderSearchChange = (value: string) => {
    setOrderSearch(value);
    resetPagination();
  };

  const handleQuantityFilterChange = (setter: (value: QuantityFilter) => void, value: QuantityFilter) => {
    setter(value);
    resetPagination();
  };

  const handleStatusFilterChange = (value: OrderStatusFilter) => {
    setStatusFilter(value);
    resetPagination();
  };

  function resetPagination() {
    setDealerMobilePage(1);
    setDealerDesktopPage(1);
    setCustomerMobilePage(1);
    setCustomerDesktopPage(1);
  }

  const toggleDealer = (key: string) => {
    setExpandedDealers((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const expandAll = () => setExpandedDealers(new Set(dealerGroups.map((g) => g.key)));
  const collapseAll = () => setExpandedDealers(new Set());

  const dealerDesktopTotalPages = Math.max(Math.ceil(dealerGroups.length / DESKTOP_PAGE_SIZE), 1);
  const dealerMobileTotalPages = Math.max(Math.ceil(dealerGroups.length / MOBILE_PAGE_SIZE), 1);
  const customerDesktopTotalPages = Math.max(Math.ceil(customerSiteRows.length / DESKTOP_PAGE_SIZE), 1);
  const customerMobileTotalPages = Math.max(Math.ceil(customerSiteRows.length / MOBILE_PAGE_SIZE), 1);
  const currentDealerDesktopPage = Math.min(dealerDesktopPage, dealerDesktopTotalPages);
  const currentDealerMobilePage = Math.min(dealerMobilePage, dealerMobileTotalPages);
  const currentCustomerDesktopPage = Math.min(customerDesktopPage, customerDesktopTotalPages);
  const currentCustomerMobilePage = Math.min(customerMobilePage, customerMobileTotalPages);

  const dealerDesktopRows = dealerGroups.slice((currentDealerDesktopPage - 1) * DESKTOP_PAGE_SIZE, currentDealerDesktopPage * DESKTOP_PAGE_SIZE);
  const dealerMobileRows = dealerGroups.slice((currentDealerMobilePage - 1) * MOBILE_PAGE_SIZE, currentDealerMobilePage * MOBILE_PAGE_SIZE);
  const customerDesktopRows = customerSiteRows.slice((currentCustomerDesktopPage - 1) * DESKTOP_PAGE_SIZE, currentCustomerDesktopPage * DESKTOP_PAGE_SIZE);
  const customerMobileRows = customerSiteRows.slice((currentCustomerMobilePage - 1) * MOBILE_PAGE_SIZE, currentCustomerMobilePage * MOBILE_PAGE_SIZE);
  const activeListTotal = viewMode === "dealer" ? dealerGroups.length : customerSiteRows.length;
  const activeListLabel = viewMode === "dealer" ? "Dealer" : "รายการลูกค้า / ไซต์";

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-4 py-5 shadow-sm sm:px-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
              <ClipboardList size={24} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-600">ORDER OPERATIONS</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-[28px]">Order List</h1>
              <p className="mt-1 max-w-2xl text-xs font-medium leading-5 text-slate-500 sm:text-sm">
                ตรวจสอบรายการสั่งซื้อ ค้นหาลูกค้า ไซต์ หรือสินค้า และเปิดดูรายละเอียดงานเทได้ในที่เดียว
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-3">
            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ออเดอร์ทั้งหมด</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900">{formatNumber(dealerOrders.length)}</div>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-2.5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ส่งจริงแล้ว</div>
              <div className="mt-1 text-xl font-extrabold text-emerald-600">{formatNumber(deliveredOrders.length)}</div>
            </div>
          </div>
        </div>
      </section>

      <SummaryKpiStrip
        items={[
          {
            accent: "violet",
            detail: "Dealer ทั้งหมดที่กรองอยู่",
            icon: <Users size={15} />,
            label: "จำนวน Dealer",
            value: formatNumber(dealerGroups.length)
          },
          {
            accent: "sky",
            detail: "จำนวนออเดอร์รวมจากทุกลูกค้า",
            icon: <PackageCheck size={15} />,
            label: "จำนวนออเดอร์",
            value: formatNumber(dealerOrders.length)
          },
          {
            accent: "amber",
            detail: "รวม quantity.ordered จากรายการ Order",
            icon: <TrendingUp size={15} />,
            label: "ปริมาณที่สั่ง",
            value: <>{compactNumber(totalOrdered)} <span className="text-xs font-semibold text-slate-400">{orderUnit}</span></>
          },
          {
            accent: "emerald",
            detail: `จาก ${formatNumber(deliveredOrders.length)} order ที่มีการส่งจริง`,
            icon: <PackageCheck size={15} />,
            label: "ปริมาณส่งจริง",
            value: <>{compactNumber(totalDelivered)} <span className="text-xs font-semibold text-slate-400">{orderUnit}</span></>
          }
        ]}
      />

      <Card className="dashboard-card overflow-hidden rounded-2xl border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
              <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-600">รายการที่แสดง</p>
              <CardTitle className="mt-0.5 text-lg font-extrabold text-slate-950">{orderListTitle}</CardTitle>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">ข้อมูลจาก Order API · เลือกมุมมองเพื่อดูรายละเอียด</p>
              </div>
              <div className="shrink-0 text-right">
              <div className="text-xl font-extrabold text-slate-900">{formatNumber(activeListTotal)}</div>
              <div className="text-[11px] font-semibold text-slate-400">{activeListLabel}ในมุมมองนี้</div>
              </div>
            </div>

          <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_minmax(200px,280px)_150px_150px_160px] lg:items-center 2xl:flex 2xl:shrink-0 2xl:items-center">
            <div className="2xl:w-[300px]">
              <OrderListTabs value={viewMode} onChange={(value) => {
                setViewMode(value);
                resetPagination();
                setExpandedDealers(new Set());
              }} />
            </div>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 transition-colors focus-within:border-sky-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-sky-100 2xl:w-[280px]">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา Dealer, customer, site หรือ product"
                value={orderSearch}
                onChange={(event) => handleOrderSearchChange(event.target.value)}
              />
            </label>
            <QuantityFilterSelect
              label="ยอดจอง"
              value={orderedFilter}
              onChange={(value) => handleQuantityFilterChange(setOrderedFilter, value)}
            />
            <QuantityFilterSelect
              label="ยอดเท"
              value={deliveredFilter}
              onChange={(value) => handleQuantityFilterChange(setDeliveredFilter, value)}
            />
            <div className="2xl:w-[160px]"><OrderStatusFilterSelect value={statusFilter} options={statusOptions} onChange={handleStatusFilterChange} /></div>
          </div>
          </div>
        </CardHeader>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3 text-xs sm:px-6">
          <span className="font-semibold text-slate-500">
            แสดง <strong className="text-slate-900">{formatNumber(activeListTotal)}</strong> {activeListLabel} · <strong className="text-slate-900">{formatNumber(dealerOrders.length)}</strong> ออเดอร์
            {viewMode === "dealer" && expandedDealers.size > 0 && <span className="ml-2 text-sky-700">· เปิด {expandedDealers.size} ราย</span>}
          </span>
          {viewMode === "dealer" && (
            <div className="flex gap-2">
              <button type="button" onClick={expandAll} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-700">กางทั้งหมด</button>
              <button type="button" onClick={collapseAll} disabled={expandedDealers.size === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 shadow-sm transition-colors hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-40">ย่อทั้งหมด</button>
            </div>
          )}
        </div>

        <CardContent className="p-0">
          <div className="xl:hidden">
            {ordersState === "loading" && <div className="px-4 py-12 text-center text-sm font-semibold text-slate-500">กำลังโหลดข้อมูล...</div>}
            {ordersState !== "loading" && activeListTotal === 0 && <div className="px-4 py-12 text-center text-sm font-semibold text-slate-500">ไม่มีข้อมูล</div>}
            {ordersState !== "loading" && viewMode === "dealer" && dealerMobileRows.map((group) => <MobileDealerCard key={group.key} expanded={expandedDealers.has(group.key)} group={group} onToggle={() => toggleDealer(group.key)} />)}
            {ordersState !== "loading" && viewMode === "customer" && customerMobileRows.map((row) => <CustomerSiteCard key={row.key} row={row} />)}
          </div>
          <div className="hidden xl:block">
            {ordersState === "loading" && <div className="px-5 py-14 text-center text-sm font-semibold text-slate-500">กำลังโหลดข้อมูล...</div>}
            {ordersState !== "loading" && activeListTotal === 0 && <div className="px-5 py-14 text-center text-sm font-semibold text-slate-500">ไม่มีข้อมูล</div>}
            {viewMode === "dealer" && (
              <div className="overflow-x-auto">
                <table className="dealer-analysis-table w-full min-w-[1100px] table-fixed text-sm leading-5" aria-label="Order List แยกตาม Dealer">
                  <colgroup><col style={{ width: "36%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} /><col style={{ width: "13%" }} /><col style={{ width: "12%" }} /><col style={{ width: "14%" }} /></colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2} className="px-4 py-4 text-center font-bold">Dealer</th>
                      <th rowSpan={2} className="px-4 py-4 text-center font-bold">จำนวนออเดอร์</th>
                      <th colSpan={2} className="px-4 py-3 text-center font-bold">จำนวนที่จอง ({orderUnit})</th>
                      <th rowSpan={2} className="px-4 py-4 text-center font-bold">ส่งจริง ({orderUnit})</th>
                      <th rowSpan={2} className="px-4 py-4 text-center font-bold">ข้อมูลล่าสุด</th>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 text-center font-bold">จองผ่านน้องวางใจ</th>
                      <th className="px-4 py-3 text-center font-bold">จองผ่านช่องทางอื่น</th>
                    </tr>
                  </thead>
                  <tbody>{ordersState !== "loading" && dealerDesktopRows.map((group) => <DealerAccordionRow key={group.key} expanded={expandedDealers.has(group.key)} group={group} onToggle={() => toggleDealer(group.key)} />)}</tbody>
                </table>
              </div>
            )}
            {ordersState !== "loading" && viewMode === "customer" && customerDesktopRows.length > 0 && <CustomerSiteTable rows={customerDesktopRows} />}
          </div>
        </CardContent>

        {activeListTotal > 0 && (
          <>
            <div className="xl:hidden">
              <ShadcnPagination
                currentPage={viewMode === "dealer" ? currentDealerMobilePage : currentCustomerMobilePage}
                pageSize={MOBILE_PAGE_SIZE}
                totalItems={activeListTotal}
                totalPages={viewMode === "dealer" ? dealerMobileTotalPages : customerMobileTotalPages}
                onPageChange={viewMode === "dealer" ? setDealerMobilePage : setCustomerMobilePage}
              />
            </div>
            <div className="hidden xl:block">
              <ShadcnPagination
                currentPage={viewMode === "dealer" ? currentDealerDesktopPage : currentCustomerDesktopPage}
                pageSize={DESKTOP_PAGE_SIZE}
                totalItems={activeListTotal}
                totalPages={viewMode === "dealer" ? dealerDesktopTotalPages : customerDesktopTotalPages}
                onPageChange={viewMode === "dealer" ? setDealerDesktopPage : setCustomerDesktopPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
