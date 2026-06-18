import { useMemo, useState, type ReactNode } from "react";
import { Activity, BarChart3, Boxes, CalendarCheck, ChevronDown, Clock3, ListChecks, MapPin, ShoppingCart, Store, Trophy, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNumber, formatNumber } from "@/lib/number";
import { cn } from "@/lib/cn";
import type { ApiState, CustomerUsage, Dealer, DealerGroup, DealerSite, DealerUsage, OrderItem } from "@/features/dealers/types";
import { dateText, parseDateValue } from "../lib/dates";
import { getRegionColor } from "../lib/regions";
import { getDealerStatusKey, getOrderStatusKey } from "../lib/status";
import { DealerPicker } from "../filters/DealerPicker";
import type { DataColumn } from "../table/types";
import { ShadcnTabs } from "../ui/ShadcnTabs";
import { DataTable } from "../table/DataTable";
import { DualBarChart } from "../charts/DualBarChart";
import { ProgressList } from "../charts/ProgressList";
import { statusColumn } from "../table/columns";
import { WangjaiAdvisor } from "../ui/WangjaiAdvisor";

type AreaRow = {
  count: number;
  delivered: number;
  detail: string;
  key: string;
  label: string;
  ordered: number;
  unit: string;
  children?: AreaRow[];
};

const AREA_CHART_LIMIT = 8;
const OTHER_AREAS_KEY = "__other_areas";

function getOrderUpdateDateText(order: OrderItem) {
  return order.updated_at ?? null;
}

function CompactDateTime({ value }: { value?: string | null }) {
  const text = dateText(value);
  const parts = text.split(" ");
  if (parts.length < 3) return <span>{text}</span>;

  return (
    <span className="block text-[11px] leading-4">
      <span className="block whitespace-nowrap">{parts.slice(0, 3).join(" ")}</span>
      <span className="block whitespace-nowrap">{parts.slice(3).join(" ")}</span>
    </span>
  );
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0
  }).format(Number.isFinite(value) ? value : 0)}%`;
}

type DetailsPageProps = {
  customers: CustomerUsage[];
  customersState: ApiState;
  dealers: Dealer[];
  filteredDealers: Dealer[];
  groups: DealerGroup[];
  groupsState: ApiState;
  orders: OrderItem[];
  ordersState: ApiState;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
  sites: DealerSite[];
  sitesState: ApiState;
  usageRows: DealerUsage[];
};

const STATUS_META: Record<"active" | "idle" | "new", { label: string; dot: string; pill: string }> = {
  active: { label: "ใช้งานอยู่", dot: "#10b981", pill: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-900/40" },
  idle: { label: "ไม่ได้ใช้งาน", dot: "#94a3b8", pill: "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700" },
  new: { label: "ใหม่", dot: "#3b82f6", pill: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:ring-sky-900/40" }
};

/** All-dealers overview: simple stat strip kept above the charts. */
function AllDealersStatStrip({
  customerCount,
  delivered,
  groups,
  priceChecks,
  unit
}: {
  customerCount: number;
  delivered: number;
  groups: number;
  priceChecks: number;
  unit: string;
}) {
  const stats = [
    { label: "ส่งจริงรวม", value: compactNumber(delivered), suffix: unit },
    { label: "จำนวนกลุ่ม", value: formatNumber(groups) },
    { label: "เช็คราคา", value: formatNumber(priceChecks) },
    { label: "ลูกค้า", value: formatNumber(customerCount) }
  ];

  return (
    <section className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-2 divide-y divide-[#eef0f4] rounded-xl border border-[#eef0f4] dark:divide-slate-800 dark:border-slate-800 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
        {stats.map((item) => (
          <div key={item.label} className="px-4 py-3">
            <div className="text-[11px] font-semibold text-slate-500">{item.label}</div>
            <div className="mt-1 text-2xl font-bold leading-none text-slate-950 dark:text-slate-100">
              {item.value} {item.suffix && <span className="text-xs font-semibold text-slate-400">{item.suffix}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Single-dealer identity card — large, clear, friendly for non-technical users. */
function DealerProfileHero({
  dealer,
  fulfillmentRate,
  orderCount,
  delivered,
  ordered,
  unit
}: {
  dealer: Dealer;
  fulfillmentRate: number;
  orderCount: number;
  delivered: number;
  ordered: number;
  unit: string;
}) {
  const statusKey = getDealerStatusKey(dealer.status);
  const status = STATUS_META[statusKey];
  const pct = Math.max(0, Math.min(100, Math.round(fulfillmentRate)));
  const size = 78;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  return (
    <section className="overflow-hidden rounded-lg border border-sky-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="grid gap-3 px-4 py-3 xl:grid-cols-[minmax(0,1fr)_132px_1px_160px_160px] xl:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300">
            <Store size={28} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[18px] font-bold leading-tight text-slate-950 dark:text-slate-50" title={dealer.dealer_name}>
              {dealer.dealer_name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-400">
              <span>
                รหัส Dealer <strong className="ml-2 font-semibold text-sky-600">{dealer.dealer_code || dealer.dealer_id}</strong>
              </span>
              <span>
                ภูมิภาค <strong className="ml-2 font-semibold text-sky-600">{dealer.region || "-"}</strong>
              </span>
              <span>
                จังหวัด <strong className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{dealer.province || "-"}</strong>
              </span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-medium text-slate-600 dark:text-slate-400">
              <span>
                สถานะ
                <span className={cn("ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[12px] font-semibold ring-1", status.pill)}>
                  <i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.dot }} />
                  {status.label}
                </span>
              </span>
              <span>ใช้งานล่าสุด <strong className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{dateText(dealer.last_active_at)}</strong></span>
            </div>
          </div>
        </div>

        <div className="justify-self-start xl:justify-self-center">
          <div className="mb-1 text-center text-[11px] font-semibold text-slate-600">อัตราส่งสำเร็จ</div>
          <div className="relative mx-auto" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#10b981"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] font-bold leading-none text-slate-950 dark:text-slate-50">{pct}%</span>
          </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-600">
            <CalendarCheck size={12} />
            ส่งสำเร็จ
          </div>
        </div>

        <div className="hidden h-16 w-px bg-slate-200 xl:block" />

        <div>
          <div className="text-[12px] font-medium text-slate-500">Ordered Volume</div>
          <div className="mt-1.5 text-[24px] font-bold leading-none text-slate-950">
            {compactNumber(ordered)} <span className="text-[13px] font-semibold text-slate-500">{unit}</span>
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-slate-500">จำนวน {formatNumber(orderCount)} orders</div>
        </div>

        <div>
          <div className="text-[12px] font-medium text-slate-500">Delivered Volume</div>
          <div className="mt-1.5 text-[24px] font-bold leading-none text-slate-950">
            {compactNumber(delivered)} <span className="text-[13px] font-semibold text-slate-500">{unit}</span>
          </div>
          <div className="mt-1.5 text-[11px] font-medium text-slate-500">จาก {formatNumber(orderCount)} orders</div>
        </div>
      </div>
    </section>
  );
}

const KPI_TONES: Record<string, string> = {
  teal: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  blue: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
};

function KpiGrid({
  items
}: {
  items: { icon: ReactNode; label: string; value: string; hint: string; tone: keyof typeof KPI_TONES }[];
}) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-[#e5e7eb] bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
        >
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", KPI_TONES[item.tone])}>{item.icon}</div>
          <p className="mt-2.5 text-[11px] font-semibold text-slate-500">{item.label}</p>
          <p className="mt-0.5 truncate text-[22px] font-extrabold leading-none text-slate-950 dark:text-slate-100">{item.value}</p>
          <p className="mt-1.5 truncate text-[11px] font-medium text-slate-400">{item.hint}</p>
        </div>
      ))}
    </section>
  );
}

const ORDER_STATUS_META: Record<"confirmed" | "pending" | "cancelled" | "other", { label: string; color: string; text: string }> = {
  confirmed: { label: "ยืนยันแล้ว", color: "#10b981", text: "text-emerald-700 dark:text-emerald-300" },
  pending: { label: "รอดำเนินการ", color: "#f59e0b", text: "text-amber-700 dark:text-amber-300" },
  cancelled: { label: "ยกเลิก", color: "#f43f5e", text: "text-rose-700 dark:text-rose-300" },
  other: { label: "อื่นๆ", color: "#94a3b8", text: "text-slate-600 dark:text-slate-300" }
};

/** Order status breakdown for the selected dealer. */
function OrderStatusCard({ orders }: { orders: OrderItem[] }) {
  const buckets = useMemo(() => {
    const counts: Record<"confirmed" | "pending" | "cancelled" | "other", number> = {
      confirmed: 0,
      pending: 0,
      cancelled: 0,
      other: 0
    };
    orders.forEach((row) => {
      counts[getOrderStatusKey(row.status?.order)] += 1;
    });
    return counts;
  }, [orders]);

  const total = orders.length;
  const order: ("confirmed" | "pending" | "cancelled" | "other")[] = ["confirmed", "pending", "cancelled", "other"];

  if (!total) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc] dark:border-slate-800 dark:bg-slate-900/40">
        <div className="text-sm font-semibold text-slate-600">ยังไม่มีคำสั่งซื้อ</div>
        <div className="text-xs font-medium text-slate-400">จะแสดงเมื่อ dealer นี้มี orders</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-extrabold leading-none text-slate-950 dark:text-slate-100">{formatNumber(total)}</span>
          <span className="text-xs font-semibold text-slate-400">คำสั่งซื้อทั้งหมด</span>
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          {order.map((key) =>
            buckets[key] > 0 ? (
              <div
                key={key}
                style={{ width: `${(buckets[key] / total) * 100}%`, backgroundColor: ORDER_STATUS_META[key].color }}
                title={`${ORDER_STATUS_META[key].label}: ${buckets[key]}`}
              />
            ) : null
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {order.map((key) => {
          const count = buckets[key];
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={key} className="rounded-xl border border-[#eef0f4] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-1.5">
                <i className="h-2 w-2 rounded-full" style={{ backgroundColor: ORDER_STATUS_META[key].color }} />
                <span className="text-[11px] font-semibold text-slate-500">{ORDER_STATUS_META[key].label}</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className={cn("text-xl font-bold leading-none", ORDER_STATUS_META[key].text)}>{formatNumber(count)}</span>
                <span className="text-[11px] font-semibold text-slate-400">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Recent orders timeline for the selected dealer. */
function RecentActivityCard({ orders, unit }: { orders: OrderItem[]; unit: string }) {
  const recent = useMemo(() => {
    return [...orders]
      .map((row) => ({
        row,
        date: parseDateValue(row.pour_datetime) ?? parseDateValue(getOrderUpdateDateText(row)),
        dateTextValue: row.pour_datetime ?? getOrderUpdateDateText(row),
        dateKind: row.pour_datetime ? "เวลาเท" : "อัปเดตรายการ"
      }))
      .filter((item) => item.date)
      .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime())
      .slice(0, 6);
  }, [orders]);

  if (!recent.length) {
    return (
      <div className="flex h-[160px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc] dark:border-slate-800 dark:bg-slate-900/40">
        <div className="text-sm font-semibold text-slate-600">ยังไม่มีกิจกรรม</div>
        <div className="text-xs font-medium text-slate-400">กิจกรรมล่าสุดจะแสดงที่นี่</div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {recent.map(({ row, dateTextValue, dateKind }, i) => {
        const statusKey = getOrderStatusKey(row.status?.order);
        const meta = ORDER_STATUS_META[statusKey];
        const customer = row.customer?.name?.trim() || "ไม่ระบุลูกค้า";
        const site = row.site?.site_name?.trim() || "ไม่ระบุไซต์";
        const delivered = row.quantity?.delivered ?? 0;
        return (
          <div
            key={`${row.order?.order_no ?? "o"}-${i}`}
            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}1f` }}>
              <i className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200" title={customer}>{customer}</span>
                <span className="shrink-0 text-[11px] font-semibold text-slate-400">
                  {dateKind}: {dateText(dateTextValue)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-slate-400">
                <span className="truncate" title={site}>{site}</span>
                <span className={cn("shrink-0 font-bold", meta.text)}>
                  {compactNumber(delivered)} {unit}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SalesAreaChart({ loading, rows, unit }: { loading: boolean; rows: AreaRow[]; unit: string }) {
  const [othersExpanded, setOthersExpanded] = useState(false);
  const sortedRows = [...rows].sort((a, b) => Math.max(b.delivered, b.ordered) - Math.max(a.delivered, a.ordered));
  const topRows = sortedRows.slice(0, AREA_CHART_LIMIT);
  const remainingRows = sortedRows.slice(AREA_CHART_LIMIT);
  const compactRows: AreaRow[] = remainingRows.length
    ? [
        ...topRows,
        {
          count: remainingRows.reduce((sum, row) => sum + row.count, 0),
          delivered: remainingRows.reduce((sum, row) => sum + row.delivered, 0),
          detail: `${formatNumber(remainingRows.length)} พื้นที่`,
          key: OTHER_AREAS_KEY,
          label: "พื้นที่อื่นๆ",
          ordered: remainingRows.reduce((sum, row) => sum + row.ordered, 0),
          unit,
          children: remainingRows
        }
      ]
    : topRows;
  const max = Math.max(...compactRows.flatMap((row) => [row.delivered, row.ordered]), 1);
  const hasOrdered = rows.some((row) => row.ordered > 0);
  const totalDelivered = rows.reduce((sum, row) => sum + row.delivered, 0);
  const totalOrdered = rows.reduce((sum, row) => sum + row.ordered, 0);
  const segmentTotal = compactRows.reduce((sum, row) => sum + row.delivered, 0) || 1;
  const rowColor = (row: AreaRow) => (row.key === OTHER_AREAS_KEY ? "#94a3b8" : getRegionColor(row.label));
  const fulfillmentRate = totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;

  if (loading) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
        กำลังโหลดข้อมูลพื้นที่ขาย
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
        ไม่มีข้อมูลสำหรับแสดงกราฟพื้นที่ขาย
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-center">
        <div className="rounded-lg border border-[#e5e7eb] bg-[#fbfcfd] px-3 py-2.5">
          <div className="text-xs font-semibold text-slate-500">ส่งจริง / สั่งทั้งหมด</div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-400">อ้างอิงจากรายการ Order</div>
          <div className="mt-1 text-lg font-bold text-slate-950">
            {compactNumber(totalDelivered)} / {compactNumber(totalOrdered)} {unit}
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium text-slate-500">
            {formatNumber(rows.length)} พื้นที่ทั้งหมด
            {totalOrdered > 0 ? <span className="rounded bg-emerald-50 px-1.5 font-bold text-emerald-700">ส่งได้ {formatPercent(fulfillmentRate)}</span> : null}
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex h-8 overflow-hidden rounded-lg bg-slate-100">
            {compactRows.map((row) => {
              const value = row.delivered;
              return (
                <div
                  key={row.key}
                  className="min-w-[3px] border-r border-white/70 last:border-r-0"
                  style={{
                    backgroundColor: rowColor(row),
                    width: `${Math.max((value / segmentTotal) * 100, value > 0 ? 3 : 0)}%`
                  }}
                  title={`${row.label}: ส่งจริง ${formatNumber(row.delivered)} / สั่งทั้งหมด ${formatNumber(row.ordered)}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {compactRows.slice(0, 6).map((row) => (
              <span key={row.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <i className="h-2 w-2 rounded-sm" style={{ backgroundColor: rowColor(row) }} />
                {row.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {compactRows.map((row, index) => {
          const isOthers = row.key === OTHER_AREAS_KEY;
          const canExpand = isOthers && !!row.children?.length;
          const expanded = canExpand && othersExpanded;
          const rowFulfillmentRate = row.ordered > 0 ? (row.delivered / row.ordered) * 100 : 0;
          return (
            <div
              key={row.key}
              className={`rounded-lg border bg-white p-3 ${
                canExpand ? "border-[#cfd6dc] ring-1 ring-[#0f766e]/10" : "border-[#e5e7eb]"
              } ${expanded ? "md:col-span-2" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                      style={{ backgroundColor: rowColor(row) }}
                    >
                      {index + 1}
                    </span>
                    <div className="truncate text-sm font-semibold text-slate-800" title={row.label}>
                      {row.label}
                    </div>
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">{row.detail}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <div className="text-right text-sm font-bold text-slate-950">
                    {compactNumber(row.delivered)} {unit}
                  </div>
                  {canExpand ? (
                    <button
                      type="button"
                      onClick={() => setOthersExpanded((value) => !value)}
                      aria-expanded={expanded}
                      className="flex items-center gap-1 rounded-md border border-[#e5e7eb] bg-[#fbfcfd] px-2 py-0.5 text-[11px] font-semibold text-slate-600 transition hover:border-[#0f766e]/40 hover:text-slate-900"
                    >
                      {expanded ? "ย่อรายการ" : "ดูจังหวัด"}
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>ส่งจริง</span>
                  <span>{formatNumber(row.delivered)} {unit}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full"
                    style={{
                      backgroundColor: rowColor(row),
                      width: `${Math.max((row.delivered / max) * 100, row.delivered > 0 ? 2 : 0)}%`
                    }}
                  />
                </div>
                {hasOrdered ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>สั่งทั้งหมด</span>
                      <span>{formatNumber(row.ordered)} {unit}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-100">
                      <div
                        className="h-2.5 rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.max((row.ordered / max) * 100, row.ordered > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </>
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                <span>{row.detail}</span>
                {row.ordered > 0 ? <span className="font-bold text-emerald-700">ส่งได้ {formatPercent(rowFulfillmentRate)}</span> : null}
              </div>

              {expanded && row.children ? (
                <div className="mt-3 rounded-md border border-dashed border-[#d9e3e6] bg-[#f8fafb] p-2">
                  <div className="grid grid-cols-[1fr_60px_70px_70px] gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>จังหวัด</span>
                    <span className="text-right">Sites</span>
                    <span className="text-right">ส่งจริง</span>
                    <span className="text-right">สั่งทั้งหมด</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {row.children.map((child) => (
                      <div
                        key={child.key}
                        className="grid grid-cols-[1fr_60px_70px_70px] items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-white"
                      >
                        <span className="truncate font-medium text-slate-700" title={child.label}>
                          {child.label}
                        </span>
                        <span className="text-right text-slate-500">{formatNumber(child.count)}</span>
                        <span className="text-right font-semibold text-slate-800">
                          {formatNumber(child.delivered)}
                        </span>
                        <span className="text-right font-semibold text-slate-800">
                          {formatNumber(child.ordered)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const DONUT_PALETTE = ["#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#06b6d4", "#94a3b8"];

function SitesDonut({
  rows,
  unit
}: {
  rows: { siteName: string; siteCode: string; delivered: number; ordered: number }[];
  unit: string;
}) {
  const sorted = [...rows].sort((a, b) => b.delivered - a.delivered);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5);
  const restValue = rest.reduce((s, r) => s + r.delivered, 0);

  type Segment = { color: string; label: string; sublabel?: string; value: number };
  const segments: Segment[] = top
    .filter((s) => s.delivered > 0)
    .map((s, i) => ({
      color: DONUT_PALETTE[i % DONUT_PALETTE.length],
      label: s.siteName,
      sublabel: s.siteCode,
      value: s.delivered
    }));
  if (restValue > 0) {
    segments.push({
      color: DONUT_PALETTE[5],
      label: `Site อื่นๆ (${rest.length})`,
      value: restValue
    });
  }

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  if (!segments.length || total === 0) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc]">
        <div className="text-sm font-semibold text-slate-600">ยังไม่มียอดส่งจริง</div>
        <div className="text-xs font-medium text-slate-400">กราฟจะแสดงเมื่อมี orders ที่ส่งแล้ว</div>
      </div>
    );
  }

  // Compute donut paths
  const size = 180;
  const r = size / 2;
  const innerR = r * 0.65;
  const cx = r;
  const cy = r;

  // Compute cumulative start/end values for each segment (immutably)
  const segmentRanges = segments.reduce<{ start: number; end: number }[]>((arr, seg) => {
    const prevEnd = arr.length ? arr[arr.length - 1].end : 0;
    arr.push({ start: prevEnd, end: prevEnd + seg.value });
    return arr;
  }, []);

  const paths = segments.map((seg, idx) => {
    const { start: startVal, end: endVal } = segmentRanges[idx];
    const start = (startVal / total) * Math.PI * 2 - Math.PI / 2;
    const end = (endVal / total) * Math.PI * 2 - Math.PI / 2;
    if (segments.length === 1 || seg.value === total) {
      return (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={(r + innerR) / 2}
          fill="none"
          stroke={seg.color}
          strokeWidth={r - innerR}
        />
      );
    }
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    const large = end - start > Math.PI ? 1 : 0;
    const d = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4}`,
      "Z"
    ].join(" ");
    return (
      <path key={idx} d={d} fill={seg.color}>
        <title>{`${seg.label}: ${compactNumber(seg.value)} ${unit} (${Math.round((seg.value / total) * 100)}%)`}</title>
      </path>
    );
  });

  return (
    <div>
      <div className="relative mx-auto" style={{ maxWidth: 200 }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>{paths}</svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">รวม</span>
          <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{compactNumber(total)}</span>
          <span className="text-[10px] font-semibold text-slate-400">{unit}</span>
        </div>
      </div>
      <div className="mt-3 grid gap-1.5">
        {segments.map((seg) => {
          const pct = (seg.value / total) * 100;
          return (
            <div key={seg.label} className="flex items-center gap-2 text-[11px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-slate-700 dark:text-slate-200" title={seg.label}>{seg.label}</div>
                {seg.sublabel && <div className="text-[10px] text-slate-400">{seg.sublabel}</div>}
              </div>
              <span className="shrink-0 font-bold text-slate-800 dark:text-slate-200">
                {compactNumber(seg.value)} <span className="text-[10px] text-slate-400">{unit}</span>
              </span>
              <span className="w-10 shrink-0 text-right text-[10px] font-bold text-slate-500">{Math.round(pct)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopCustomersList({
  rows,
  showDealer = false,
  unit
}: {
  rows: { key: string; customerName: string; customerCode: string; dealerName: string; delivered: number; ordered: number; orderCount: number; siteCount: number }[];
  showDealer?: boolean;
  unit: string;
}) {
  const sorted = [...rows].sort((a, b) => b.delivered - a.delivered).slice(0, 5);
  const max = Math.max(...sorted.map((r) => r.delivered), 1);
  const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);

  if (!sorted.length) {
    return (
      <div className="flex h-[200px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc]">
        <div className="text-sm font-semibold text-slate-600">ยังไม่มีข้อมูลลูกค้า</div>
        <div className="text-xs font-medium text-slate-400">ลูกค้าจะแสดงเมื่อมี orders เข้ามา</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((customer, i) => {
        const share = totalDelivered > 0 ? (customer.delivered / totalDelivered) * 100 : 0;
        const barWidth = (customer.delivered / max) * 100;
        const colors = DONUT_PALETTE;
        const color = colors[i % colors.length];
        return (
          <div key={customer.key} className="grid grid-cols-[28px_minmax(0,1fr)_92px] items-center gap-3">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                i === 0
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  : i === 1
                    ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    : i === 2
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                      : "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200" title={customer.customerName}>
                  {customer.customerName}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-slate-400">{Math.round(share)}%</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                <span>รหัสลูกค้า {customer.customerCode}</span>
                <span>·</span>
                <span>{formatNumber(customer.orderCount)} orders</span>
                <span>·</span>
                <span>{formatNumber(customer.siteCount)} ไซต์</span>
              </div>
              {showDealer ? (
                <div className="mt-0.5 truncate text-[10px] font-bold text-sky-700" title={customer.dealerName}>
                  Dealer: {customer.dealerName}
                </div>
              ) : null}
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ backgroundColor: color, width: `${Math.max(barWidth, 2)}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {compactNumber(customer.delivered)}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">{unit}</p>
            </div>
          </div>
        );
      })}
      {rows.length > 5 && (
        <p className="pt-2 text-center text-[11px] font-semibold text-slate-400 border-t border-slate-100 dark:border-slate-800">
          + อีก {formatNumber(rows.length - 5)} ลูกค้า — ดูทั้งหมดที่ Tab "Customers" ด้านล่าง
        </p>
      )}
    </div>
  );
}

export function DetailsPage(props: DetailsPageProps) {
  const selectedUsage = props.usageRows.find((row) => row.dealer_id === props.selectedDealerId);
  const usageSummary = useMemo(() => {
    if (props.selectedDealerId != null) {
      return {
        bookingCreateCount: selectedUsage?.booking_create_count ?? 0,
        customerCreateCount: selectedUsage?.customer_create_count ?? props.customers.length,
        priceConcreteCount: selectedUsage?.price_concrete_count ?? 0,
        updatedAt: selectedUsage?.updated_at ?? null
      };
    }

    return props.usageRows.reduce(
      (acc, row) => ({
        bookingCreateCount: acc.bookingCreateCount + row.booking_create_count,
        customerCreateCount: acc.customerCreateCount + row.customer_create_count,
        priceConcreteCount: acc.priceConcreteCount + row.price_concrete_count,
        updatedAt: row.updated_at ?? acc.updatedAt
      }),
      { bookingCreateCount: 0, customerCreateCount: 0, priceConcreteCount: 0, updatedAt: null as string | null }
    );
  }, [props.customers.length, props.selectedDealerId, props.usageRows, selectedUsage]);

  const siteProvinceRows = useMemo<AreaRow[]>(() => {
    const provinceMap = new Map<string, AreaRow>();

    props.sites.forEach((site) => {
      const label = site.province_name?.trim() || "ไม่ระบุจังหวัด";
      const key = site.province_bluenet_id || site.province_id?.toString() || label;
      const current = provinceMap.get(key) ?? {
        count: 0,
        delivered: 0,
        detail: "",
        key,
        label,
        ordered: 0,
        unit: site.unit || props.selectedDealer?.unit || "m3"
      };

      current.delivered += site.total_delivered;
      current.ordered += site.total_ordered;
      current.count += 1;
      current.detail = `${formatNumber(current.count)} ไซต์`;
      provinceMap.set(key, current);
    });

    return [...provinceMap.values()].sort((a, b) => b.delivered - a.delivered || b.ordered - a.ordered || a.label.localeCompare(b.label, "th"));
  }, [props.selectedDealer?.unit, props.sites]);

  const dealerAreaRows = useMemo<AreaRow[]>(() => {
    const areaMap = new Map<string, AreaRow & { provinces: Set<string> }>();
    const dealerById = new Map(props.filteredDealers.map((dealer) => [dealer.dealer_id, dealer]));

    props.orders.forEach((order) => {
      const dealer = dealerById.get(order.dealer_id);
      if (!dealer) return;
      const label = dealer.region || "ไม่ระบุภูมิภาค";
      const current = areaMap.get(label) ?? {
        count: 0,
        delivered: 0,
        detail: "",
        key: label,
        label,
        ordered: 0,
        provinces: new Set<string>(),
        unit: "m3"
      };

      current.delivered += order.quantity?.delivered ?? 0;
      current.ordered += order.quantity?.ordered ?? 0;
      if (dealer.province) current.provinces.add(dealer.province);
      areaMap.set(label, current);
    });

    areaMap.forEach((row) => {
      row.count = props.filteredDealers.filter((dealer) => dealer.region === row.label).length;
      row.detail = `${formatNumber(row.count)} Dealer | ${formatNumber(row.provinces.size)} จังหวัด`;
    });

    return [...areaMap.values()]
      .map((row) => ({
        count: row.count,
        delivered: row.delivered,
        detail: row.detail,
        key: row.key,
        label: row.label,
        ordered: row.ordered,
        unit: row.unit
      }))
      .sort((a, b) => b.delivered - a.delivered || a.label.localeCompare(b.label, "th"));
  }, [props.filteredDealers, props.orders]);

  const dealerOrders = useMemo(
    () => props.orders.filter((row) => props.selectedDealerId == null || row.dealer_id === props.selectedDealerId),
    [props.orders, props.selectedDealerId]
  );

  const orderCustomerRows = useMemo(() => {
    const rows = dealerOrders.reduce<
      Map<
        string,
        {
          customerCode: string;
          customerName: string;
          dealerName: string;
          delivered: number;
          key: string;
          latestPour: string | null;
          ordered: number;
          orderCount: number;
          siteCount: number;
          uniqueSites: Set<string>;
        }
      >
    >((acc, row) => {
      const customerCode = row.customer?.code?.trim() || row.customer?.id?.toString() || "-";
      const customerName = row.customer?.name?.trim() || "ไม่ระบุลูกค้า";
      const dealerName = row.dealer_name?.trim() || "ไม่ระบุ Dealer";
      const dealerKey = row.dealer_code?.trim() || row.dealer_id.toString();
      const key = props.selectedDealerId == null ? `${dealerKey}::${customerCode}::${customerName}` : `${customerCode}::${customerName}`;
      const current =
        acc.get(key) ?? {
          customerCode,
          customerName,
          dealerName,
          delivered: 0,
          key,
          latestPour: null,
          ordered: 0,
          orderCount: 0,
          siteCount: 0,
          uniqueSites: new Set<string>()
        };

      current.orderCount += 1;
      current.ordered += row.quantity?.ordered ?? 0;
      current.delivered += row.quantity?.delivered ?? 0;
      if (row.site?.site_code) current.uniqueSites.add(row.site.site_code);

      const pourDate = parseDateValue(row.pour_datetime);
      const currentPourDate = parseDateValue(current.latestPour);
      if (pourDate && (!currentPourDate || pourDate > currentPourDate)) {
        current.latestPour = row.pour_datetime ?? null;
      }

      current.siteCount = current.uniqueSites.size;
      acc.set(key, current);
      return acc;
    }, new Map());

    return [...rows.values()].sort((a, b) => b.delivered - a.delivered);
  }, [dealerOrders, props.selectedDealerId]);

  const orderSiteRows = useMemo(() => {
    const rows = dealerOrders.reduce<
      Map<
        string,
        {
          customerName: string;
          dealerName: string;
          delivered: number;
          key: string;
          latestPour: string | null;
          ordered: number;
          siteCode: string;
          siteName: string;
          source: string;
        }
      >
    >((acc, row) => {
      const siteCode = row.site?.site_code?.trim() || row.site?.site_id?.toString() || "-";
      const siteName = row.site?.site_name?.trim() || "ไม่ระบุไซต์";
      const dealerName = row.dealer_name?.trim() || "ไม่ระบุ Dealer";
      const dealerKey = row.dealer_code?.trim() || row.dealer_id.toString();
      const key = `${dealerKey}::${siteCode}::${siteName}`;
      const current =
        acc.get(key) ?? {
          customerName: row.customer?.name?.trim() || "ไม่ระบุลูกค้า",
          dealerName,
          delivered: 0,
          key,
          latestPour: null,
          ordered: 0,
          siteCode,
          siteName,
          source: "Order API"
        };

      current.ordered += row.quantity?.ordered ?? 0;
      current.delivered += row.quantity?.delivered ?? 0;

      const pourDate = parseDateValue(row.pour_datetime);
      const currentPourDate = parseDateValue(current.latestPour);
      if (pourDate && (!currentPourDate || pourDate > currentPourDate)) {
        current.latestPour = row.pour_datetime ?? null;
      }

      acc.set(key, current);
      return acc;
    }, new Map());

    return [...rows.values()].sort((a, b) => b.delivered - a.delivered);
  }, [dealerOrders]);

  const isAllDealers = props.selectedDealerId == null;
  const dealerSiteRows = useMemo(
    () => {
      const rows = new Map(
        orderSiteRows.map((site) => [`${site.siteCode}::${site.siteName}`, site])
      );

      props.sites.forEach((site) => {
        const siteCode = site.site_code || site.site_id.toString();
        const siteName = site.site_name?.trim() || "ไม่ระบุไซต์";
        rows.set(`${siteCode}::${siteName}`, {
          customerName: site.customer?.name?.trim() || "ไม่ระบุลูกค้า",
          dealerName: props.selectedDealer?.dealer_name || "ไม่ระบุ Dealer",
          delivered: site.total_delivered,
          key: `${site.site_id}::${site.site_code}`,
          latestPour: site.last_pour_datetime,
          ordered: site.total_ordered,
          siteCode,
          siteName,
          source: "Sites API"
        });
      });

      return [...rows.values()].sort((a, b) => b.delivered - a.delivered || b.ordered - a.ordered);
    },
    [orderSiteRows, props.selectedDealer?.dealer_name, props.sites]
  );
  const siteRows = isAllDealers ? orderSiteRows : dealerSiteRows;
  const areaRows = isAllDealers ? dealerAreaRows : siteProvinceRows;
  const orderUnit = "m3";
  const areaUnit = "m3";
  const totalAreaDelivered = areaRows.reduce((sum, row) => sum + row.delivered, 0);
  const totalGroups = isAllDealers ? props.filteredDealers.reduce((sum, dealer) => sum + dealer.group_count, 0) : props.groups.length;
  const topDealerVolume = useMemo(() => {
    const totals = new Map<number, number>();
    props.orders.forEach((order) => totals.set(order.dealer_id, (totals.get(order.dealer_id) ?? 0) + (order.quantity?.delivered ?? 0)));
    return props.filteredDealers
      .map((dealer) => ({ dealer, delivered: totals.get(dealer.dealer_id) ?? 0 }))
      .sort((a, b) => b.delivered - a.delivered)
      .slice(0, 8);
  }, [props.filteredDealers, props.orders]);
  const maxDealerVolume = Math.max(...topDealerVolume.map((row) => row.delivered), 1);

  // Single-dealer order totals (used for the profile hero + KPI grid)
  const dealerOrderedTotal = useMemo(() => dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0), [dealerOrders]);
  const dealerDeliveredTotal = useMemo(() => dealerOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0), [dealerOrders]);
  const dealerFulfillmentRate = dealerOrderedTotal > 0 ? (dealerDeliveredTotal / dealerOrderedTotal) * 100 : 0;

  const customerColumns: DataColumn<(typeof orderCustomerRows)[number]>[] = [
    { title: "ลูกค้า", key: "customer", sortAccessor: (record) => record.customerName, width: 260, render: (_, record) => <div className="min-w-0"><div className="line-clamp-2 text-[13px] font-semibold leading-4 text-slate-950" title={record.customerName}>{record.customerName}</div><div className="truncate text-[11px] font-medium text-slate-500">{record.customerCode}</div>{isAllDealers ? <div className="truncate text-[11px] font-bold text-sky-700" title={record.dealerName}>Dealer: {record.dealerName}</div> : null}</div> },
    { title: "จำนวน Site", key: "siteCount", dataIndex: "siteCount", align: "right", width: 100, render: formatNumber },
    { title: "ออเดอร์ /ครั้ง", key: "orderCount", dataIndex: "orderCount", align: "right", width: 108, render: formatNumber },
    { title: `จำนวนที่สั่ง /${orderUnit}`, key: "ordered", dataIndex: "ordered", align: "right", width: 132, render: formatNumber },
    { title: `จำนวนส่งจริง /${orderUnit}`, key: "delivered", dataIndex: "delivered", align: "right", width: 140, render: formatNumber },
    { title: "เวลาเทล่าสุด", key: "latestPour", dataIndex: "latestPour", width: 118, render: (value) => <CompactDateTime value={String(value ?? "")} /> }
  ];

  const siteColumns: DataColumn<(typeof siteRows)[number]>[] = [
    { title: "ไซต์", key: "site", sortAccessor: (record) => record.siteName, width: 260, render: (_, record) => <div className="min-w-0"><div className="truncate text-[13px] font-semibold text-slate-950">รหัส Site: {record.siteCode}</div><div className="line-clamp-2 text-[11px] font-medium leading-4 text-slate-500" title={record.siteName}>{record.siteName}</div><div className="truncate text-[11px] font-bold text-sky-700" title={record.dealerName}>Dealer: {record.dealerName}</div></div> },
    { title: "ลูกค้า", key: "customerName", dataIndex: "customerName", width: 160, render: (value) => <span className="line-clamp-2 text-[13px] leading-5" title={String(value ?? "-")}>{String(value ?? "-")}</span> },
    { title: `จำนวนที่สั่ง /${areaUnit}`, key: "ordered", dataIndex: "ordered", align: "right", width: 132, render: formatNumber },
    { title: `จำนวนส่งจริง /${areaUnit}`, key: "delivered", dataIndex: "delivered", align: "right", width: 140, render: formatNumber },
    { title: "เวลาเทล่าสุด", key: "latestPour", dataIndex: "latestPour", width: 118, render: (value) => <CompactDateTime value={String(value ?? "")} /> },
    { title: "แหล่งข้อมูล", key: "source", dataIndex: "source", width: 105, render: (value) => <span className="whitespace-nowrap text-[11px] font-semibold text-sky-700">{String(value)}</span> }
  ];

  const groupColumns: DataColumn<DealerGroup>[] = [
    { title: "Group", dataIndex: "group_name", key: "group_name", width: 320, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.group_name}</div><div className="text-xs font-medium text-slate-500">ID: {record.group_id} | Type: {record.group_type ?? "-"}</div></div> },
    { title: "เช็คราคา /ครั้ง", dataIndex: "price_check_count", key: "price_check_count", align: "right", width: 140, render: formatNumber },
    { title: "จำนวนที่จอง /m3", dataIndex: "booked_volume", key: "booked_volume", align: "right", width: 180, render: formatNumber },
    { title: "จำนวนที่ส่งจริง /m3", dataIndex: "delivered_volume", key: "delivered_volume", align: "right", width: 190, render: formatNumber },
    { title: "จำนวนการเปิด Site /ครั้ง", dataIndex: "booking_count", key: "booking_count", align: "right", width: 190, render: formatNumber },
    { title: "วันที่สร้างกลุ่ม", dataIndex: "created_at", key: "created_at", width: 190, render: dateText },
    statusColumn<DealerGroup>()
  ];

  return (
    <>
      <DealerPicker
        dealers={props.dealers}
        includeAll
        selectedDealerId={props.selectedDealerId}
        setSelectedDealerId={props.setSelectedDealerId}
        title="เลือก Dealer หรือดูภาพรวมทุก Dealer"
      />

      {isAllDealers ? (
        <>
          <WangjaiAdvisor
            accent="sky"
            compact
            message="เริ่มจากภาพรวมทุก Dealer ก่อน แล้วเลือก Dealer เพื่อเจาะลึกพื้นที่ขาย กลุ่ม ลูกค้า และไซต์ โดยยอดสั่งและส่งจริงในมุมนี้อ้างอิงจากรายการ Order"
            stats={[
              { label: "Scope", value: "ทุก Dealer" },
              { label: "ส่งจริง", value: `${compactNumber(totalAreaDelivered)} ${areaUnit}` },
              { label: "Groups", value: formatNumber(totalGroups) }
            ]}
            title="เลือกมุมวิเคราะห์จากภาพรวม"
          />

          <AllDealersStatStrip
            customerCount={orderCustomerRows.length || usageSummary.customerCreateCount}
            delivered={totalAreaDelivered}
            groups={totalGroups}
            priceChecks={usageSummary.priceConcreteCount}
            unit={areaUnit}
          />

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin size={18} />
                  สั่ง/ส่งจริงจาก Orders แยกตามพื้นที่
                </CardTitle>
                <p className="text-xs font-medium text-slate-500">รวมยอดสั่งและส่งจริงจากรายการ Order ตามภูมิภาคของ Dealer</p>
              </CardHeader>
              <CardContent>
                <SalesAreaChart loading={false} rows={areaRows} unit={areaUnit} />
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="text-lg">Dealer ส่งจริงสูงสุดจาก Orders</CardTitle>
                <p className="text-xs font-medium text-slate-500">เรียงตามยอดส่งจริงจากรายการ Order ในตัวกรองปัจจุบัน</p>
              </CardHeader>
              <CardContent>
                <ProgressList
                  rows={topDealerVolume.map(({ dealer, delivered }) => ({
                    label: dealer.dealer_name,
                    total: maxDealerVolume,
                    unit: orderUnit,
                    value: delivered
                  }))}
                />
              </CardContent>
            </Card>
          </section>

          <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 size={18} />
                  ลูกค้าที่มียอดสูงสุด
                </CardTitle>
                <p className="text-xs font-medium text-slate-500">เทียบยอดส่งจริงกับยอดสั่งทั้งหมดของลูกค้าแต่ละราย</p>
              </CardHeader>
              <CardContent>
                <DualBarChart
                  data={orderCustomerRows.slice(0, 5).map((customer) => ({
                    label: customer.customerName,
                    sublabel: isAllDealers ? `Dealer: ${customer.dealerName}` : undefined,
                    primary: customer.delivered,
                    secondary: customer.ordered
                  }))}
                  primaryLabel="ส่งจริง"
                  secondaryLabel="สั่งทั้งหมด"
                />
                {orderCustomerRows.length > 5 ? (
                  <p className="mt-3 border-t border-slate-100 pt-2 text-center text-[11px] font-semibold text-slate-400 dark:border-slate-800">
                    + อีก {formatNumber(orderCustomerRows.length - 5)} ราย — ดูทั้งหมดที่แท็บ Customers ด้านล่าง
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="text-lg">ไซต์ที่ส่งจริงสูงสุดจาก Orders</CardTitle>
                <p className="text-xs font-medium text-slate-500">เรียงตามยอดส่งจริงจากแหล่งข้อมูลของแต่ละไซต์</p>
              </CardHeader>
              <CardContent>
                <ProgressList
                  rows={siteRows.slice(0, 5).map((site) => ({
                    label: site.siteName,
                    sublabel: `รหัส Site: ${site.siteCode} · Dealer: ${site.dealerName}`,
                    total: Math.max(site.ordered, site.delivered),
                    unit: areaUnit,
                    value: site.delivered
                  }))}
                />
                {siteRows.length > 5 ? (
                  <p className="mt-3 border-t border-slate-100 pt-2 text-center text-[11px] font-semibold text-slate-400 dark:border-slate-800">
                    + อีก {formatNumber(siteRows.length - 5)} ไซต์ — ดูทั้งหมดที่แท็บ Sites ด้านล่าง
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <>
          {props.selectedDealer ? (
            <DealerProfileHero
              dealer={props.selectedDealer}
              delivered={dealerDeliveredTotal}
              orderCount={dealerOrders.length}
              ordered={dealerOrderedTotal}
              fulfillmentRate={dealerFulfillmentRate}
              unit={orderUnit}
            />
          ) : null}

          <KpiGrid
            items={[
              { icon: <ShoppingCart size={18} />, label: "คำสั่งซื้อ", value: formatNumber(dealerOrders.length), hint: "จำนวน orders ทั้งหมด", tone: "blue" },
              { icon: <Users size={18} />, label: "ลูกค้า", value: formatNumber(orderCustomerRows.length), hint: "จำนวนลูกค้าที่สั่ง", tone: "violet" },
              { icon: <MapPin size={18} />, label: "ไซต์", value: formatNumber(siteRows.length), hint: "ไซต์จากข้อมูล Dealer", tone: "rose" },
              { icon: <Boxes size={18} />, label: "กลุ่ม", value: formatNumber(props.groups.length), hint: "กลุ่มของ dealer นี้", tone: "slate" },
              { icon: <Clock3 size={18} />, label: "จองคิว", value: formatNumber(usageSummary.bookingCreateCount), hint: "จำนวนครั้งที่สร้างจองคิว", tone: "amber" },
              { icon: <BarChart3 size={18} />, label: "เช็คราคา", value: formatNumber(usageSummary.priceConcreteCount), hint: "จำนวนครั้งที่เช็คราคา", tone: "teal" }
            ]}
          />

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks size={16} />
                  สถานะคำสั่งซื้อ
                </CardTitle>
                <p className="text-[11px] font-medium text-slate-500">สัดส่วนคำสั่งซื้อของ dealer นี้แยกตามสถานะ</p>
              </CardHeader>
              <CardContent>
                <OrderStatusCard orders={dealerOrders} />
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity size={16} />
                  กิจกรรมล่าสุด
                </CardTitle>
                <p className="text-[11px] font-medium text-slate-500">เรียงจากเวลาเทก่อน ถ้าไม่มีจะแสดงวันที่อัปเดตรายการ</p>
              </CardHeader>
              <CardContent>
                <RecentActivityCard orders={dealerOrders} unit={orderUnit} />
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin size={16} />
                  สัดส่วนไซต์
                </CardTitle>
                <p className="text-[11px] font-medium text-slate-500">ยอดส่งจริงแยกตามไซต์หลัก</p>
              </CardHeader>
              <CardContent>
                <SitesDonut rows={siteRows} unit={areaUnit} />
              </CardContent>
            </Card>

            <Card className="dashboard-card">
              <CardHeader className="border-b border-[#d9e3e6]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <Trophy size={14} />
                    </div>
                    <div>
                      <CardTitle className="text-base">ลูกค้าหลัก 5 อันดับ</CardTitle>
                      <p className="text-[11px] font-medium text-slate-500">เรียงตามยอดส่งจริง · ดูทั้งหมดที่ tab Customers ด้านล่าง</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {formatNumber(orderCustomerRows.length)} ราย
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <TopCustomersList rows={orderCustomerRows} showDealer={isAllDealers} unit={orderUnit} />
              </CardContent>
            </Card>
          </section>

        </>
      )}

      <ShadcnTabs
        items={[
          {
            key: "customers",
            label: "Customers",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardContent className="p-0">
                  <DataTable columns={customerColumns} data={orderCustomerRows} loading={props.ordersState === "loading"} rowKey="key" minWidth={860} pageSize={10} />
                </CardContent>
              </Card>
            )
          },
          {
            key: "sites",
            label: "Sites",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardContent className="p-0">
                  <DataTable columns={siteColumns} data={siteRows} loading={isAllDealers ? props.ordersState === "loading" : props.sitesState === "loading"} rowKey="key" minWidth={963} pageSize={10} />
                </CardContent>
              </Card>
            )
          },
          ...(!isAllDealers
            ? [
                {
                  key: "groups",
                  label: "Groups",
                  content: (
                    <Card className="dashboard-card overflow-hidden">
                      <CardContent className="p-0">
                        <DataTable columns={groupColumns} data={props.groups} loading={props.groupsState === "loading"} rowKey="group_id" minWidth={1180} pageSize={10} />
                      </CardContent>
                    </Card>
                  )
                }
              ]
            : [])
        ]}
      />
    </>
  );
}
