import { useMemo, useState } from "react";
import { Layers3, MapPin, PackageCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import type { PageKey } from "../config/pageMeta";
import { parseDateValue } from "../lib/dates";
import { groupByRegion } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { ToggleGroup } from "../ui/ToggleGroup";
import { FilterBar } from "../filters/FilterBar";
import { DataTable } from "../table/DataTable";
import { TimeVolumeBarChart, type ChartFocusRange, type ChartRange } from "../charts/TimeVolumeBarChart";
import { getRegionColor } from "../lib/regions";
import { dealerColumn, statusColumn, regionPill, ApiErrorBanner } from "../table/columns";
import { WangjaiAdvisor } from "../ui/WangjaiAdvisor";

type DashboardPageProps = {
  activeRate: number;
  apiMessage?: string;
  apiState: ApiState;
  filteredDealers: Dealer[];
  filteredOrders: OrderItem[];
  region: string;
  regionRows: ReturnType<typeof groupByRegion>;
  regions: string[];
  search: string;
  setPage: (page: PageKey) => void;
  setRegion: (value: string) => void;
  setSearch: (value: string) => void;
  setSelectedDealerId: (id: number | null) => void;
  setStatus: (value: string) => void;
  status: string;
  topDealer?: Dealer;
  totalGroups: number;
  totalVolume: number;
};

// Compact KPI strip — replaces 3 large MetricCards
function KpiStrip({
  activeRate,
  topRegion,
  topRegionColor,
  totalGroups,
  totalVolume,
  unit
}: {
  activeRate: number;
  activeDealersCount: number;
  totalDealersCount: number;
  topRegion: string | null;
  topRegionColor?: string;
  topRegionShare: number;
  totalGroups: number;
  totalVolume: number;
  unit: string;
}) {
	  const items: {
	    bgIcon: string;
    textColor: string;
    valueColor: string;
    cardStyle?: React.CSSProperties;
    icon: React.ReactNode;
    iconStyle?: React.CSSProperties;
    label: string;
    value: React.ReactNode;
    valueStyle?: React.CSSProperties;
  }[] = [
    {
      bgIcon: "bg-sky-50 dark:bg-sky-950/30",
      textColor: "text-sky-600 dark:text-sky-400",
      valueColor: "text-sky-600 dark:text-sky-300",
      icon: <PackageCheck size={22} />,
      label: "Total Delivered Volume",
      value: (
        <>
          {compactNumber(totalVolume)}{" "}
          <span className="text-sm font-semibold text-slate-400">{unit}</span>
        </>
      )
    },
    {
      bgIcon: "bg-emerald-50 dark:bg-emerald-950/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
      valueColor: "text-emerald-600 dark:text-emerald-300",
      icon: <Users size={22} />,
      label: "Active Dealer Rate",
      value: (
        <>
          {activeRate}
          <span className="text-sm font-semibold text-slate-400">%</span>
        </>
      )
    },
    {
      bgIcon: "bg-violet-50 dark:bg-violet-950/30",
      textColor: "text-violet-600 dark:text-violet-400",
      valueColor: "text-violet-600 dark:text-violet-300",
      icon: <Layers3 size={22} />,
      label: "Total Groups",
      value: formatNumber(totalGroups)
    },
    {
      bgIcon: "bg-amber-50 dark:bg-amber-950/30",
      textColor: "text-amber-500 dark:text-amber-400",
      valueColor: "text-amber-500 dark:text-amber-300",
      icon: <MapPin size={22} />,
      label: "Top Region",
      cardStyle: topRegionColor ? { borderColor: `${topRegionColor}66` } : undefined,
      iconStyle: topRegionColor ? { backgroundColor: `${topRegionColor}18`, color: topRegionColor } : undefined,
      valueStyle: topRegionColor ? { color: topRegionColor } : undefined,
      value: (
        <span className="text-[22px] font-extrabold leading-tight">
          {topRegion ?? "—"}
        </span>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} style={item.cardStyle} className="metric-card flex min-h-[88px] items-start justify-between gap-2 rounded-xl border border-[#e6edf4] bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-slate-500">{item.label}</p>
            <p style={item.valueStyle} className={cn("mt-1.5 truncate text-[24px] font-extrabold leading-none", item.valueColor)}>
              {item.value}
            </p>
            <p className="mt-2 truncate text-[10px] font-medium text-slate-400">ข้อมูลจาก API ตามตัวกรองปัจจุบัน</p>
          </div>
          <div style={item.iconStyle} className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", item.bgIcon, item.textColor)}>
            {item.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

function inputDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inputMonthKey(date: Date) {
  return inputDateKey(date).slice(0, 7);
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}

function DeliveryRateCell({ rate }: { rate: number }) {
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#edf2f4] dark:bg-slate-800">
        <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[12px] font-semibold text-slate-600 dark:text-slate-300">{pct}%</span>
    </div>
  );
}

export function DashboardPage(props: DashboardPageProps) {
  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[] | null>(null);
  const volumeUnit =
    props.filteredOrders.find((order) => order.quantity?.unit)?.quantity?.unit ??
    props.filteredDealers.find((dealer) => dealer.unit)?.unit ??
    props.topDealer?.unit ??
    "m3";

  // Region list + per-region volumes for the toolbar filter
  const allRegions = useMemo(
    () => [...new Set(props.filteredDealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [props.filteredDealers]
  );
  const regionTotalVolumes = useMemo(() => {
    const map = new Map<string, number>();
    const dealerById = new Map(props.filteredDealers.map((dealer) => [dealer.dealer_id, dealer]));
    props.filteredOrders.forEach((order) => {
      const region = dealerById.get(order.dealer_id)?.region;
      if (!region) return;
      map.set(region, (map.get(region) ?? 0) + (order.quantity?.delivered ?? 0));
    });
    return map;
  }, [props.filteredDealers, props.filteredOrders]);
  const selectedRegionCount = (selectedRegions ?? allRegions).length;
  const selectedRegionVolume = (selectedRegions ?? allRegions).reduce(
    (sum, region) => sum + (regionTotalVolumes.get(region) ?? 0),
    0
  );
  const deliveredOrderTotal = [...regionTotalVolumes.values()].reduce((sum, volume) => sum + volume, 0);
  const selectedRegionPercent = deliveredOrderTotal > 0 ? (selectedRegionVolume / deliveredOrderTotal) * 100 : 0;
  const regionSummaryText = `เลือกภูมิภาค · ${selectedRegionCount}/${allRegions.length} · ${compactNumber(selectedRegionVolume)} ${volumeUnit} (${Math.round(selectedRegionPercent)}%)`;

  const chartDates = useMemo(
    () =>
      props.filteredOrders
        .map((order) => parseDateValue(order.pour_datetime))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime()),
    [props.filteredOrders]
  );
  const earliestDateKey = chartDates[0] ? inputDateKey(chartDates[0]) : "";
  const latestDateKey = chartDates[chartDates.length - 1] ? inputDateKey(chartDates[chartDates.length - 1]) : "";
  const earliestMonthKey = chartDates[0] ? inputMonthKey(chartDates[0]) : "";
  const latestMonthKey = chartDates[chartDates.length - 1] ? inputMonthKey(chartDates[chartDates.length - 1]) : "";
  const latestDateValue = latestDateKey ? dateFromInput(latestDateKey) : null;
  const defaultDayFrom = latestDateValue ? inputDateKey(new Date(latestDateValue.getFullYear(), latestDateValue.getMonth(), 1)) : "";
  const defaultDayTo = latestDateValue ? inputDateKey(new Date(latestDateValue.getFullYear(), latestDateValue.getMonth() + 1, 0)) : "";
  const chartFocusRange: ChartFocusRange | undefined =
    chartRange === "month"
      ? { from: monthFrom || earliestMonthKey, to: monthTo || latestMonthKey }
      : chartRange === "day"
        ? { from: dateFrom || defaultDayFrom, to: dateTo || defaultDayTo }
        : undefined;

  const topDeliveredRegion = [...regionTotalVolumes.entries()].sort((a, b) => b[1] - a[1])[0];
  const orderTotalsByDealer = useMemo(() => {
    const map = new Map<number, { delivered: number; ordered: number; unit: string }>();
    props.filteredOrders.forEach((order) => {
      const current = map.get(order.dealer_id) ?? { delivered: 0, ordered: 0, unit: order.quantity?.unit || "คิว" };
      current.ordered += order.quantity?.ordered ?? 0;
      current.delivered += order.quantity?.delivered ?? 0;
      map.set(order.dealer_id, current);
    });
    return map;
  }, [props.filteredOrders]);

  // Active dealer counts (active = status truthy)
  const isActive = (s: Dealer["status"]) =>
    typeof s === "boolean" ? s : typeof s === "string" ? s.toLowerCase() === "active" || s === "1" || s.toLowerCase() === "true" : false;
  const activeDealersCount = props.filteredDealers.filter((d) => isActive(d.status)).length;

  const columns: DataColumn<Dealer>[] = [
    dealerColumn((dealer) => {
      props.setSelectedDealerId(dealer.dealer_id);
      props.setPage("details");
    }),
    { title: "พื้นที่", dataIndex: "region", key: "region", width: 150, render: regionPill },
    {
      title: "กลุ่ม",
      dataIndex: "group_count",
      key: "group_count",
      align: "right",
      width: 90,
      render: formatNumber
    },
    {
      title: "Volume จาก Dealer API",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      width: 140,
      render: (_, record) => (
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {formatNumber(record.volume)} <span className="text-[11px] font-medium text-slate-400">{record.unit}</span>
        </span>
      )
    },
    {
      title: "สั่งใน Orders",
      key: "ordered",
      align: "right",
      width: 130,
      render: (_, record) => (
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {formatNumber(orderTotalsByDealer.get(record.dealer_id)?.ordered ?? 0)} <span className="text-[11px] font-medium text-slate-400">{orderTotalsByDealer.get(record.dealer_id)?.unit ?? "คิว"}</span>
        </span>
      )
    },
    {
      title: "ส่งจริงใน Orders",
      key: "delivered",
      align: "right",
      width: 140,
      render: (_, record) => <span className="font-bold text-slate-950">{formatNumber(orderTotalsByDealer.get(record.dealer_id)?.delivered ?? 0)} <span className="text-[11px] font-medium text-slate-400">{orderTotalsByDealer.get(record.dealer_id)?.unit ?? "คิว"}</span></span>
    },
    {
      title: "อัตราส่งจริงใน Orders",
      key: "delivery_rate",
      width: 180,
      render: (_, record) => {
        const totals = orderTotalsByDealer.get(record.dealer_id);
        return <DeliveryRateCell rate={totals?.ordered ? totals.delivered / totals.ordered : 0} />;
      }
    },
    statusColumn<Dealer>()
  ];

  return (
    <>
      {props.apiState === "error" && (
        <section className="grid grid-cols-1">
          <ApiErrorBanner message={props.apiMessage} />
        </section>
      )}

      {/* Bento KPIs */}
      <KpiStrip
        activeDealersCount={activeDealersCount}
        activeRate={props.activeRate}
        topRegion={topDeliveredRegion?.[0] ?? null}
        topRegionColor={topDeliveredRegion?.[0] ? getRegionColor(topDeliveredRegion[0], allRegions) : undefined}
        topRegionShare={deliveredOrderTotal > 0 ? ((topDeliveredRegion?.[1] ?? 0) / deliveredOrderTotal) * 100 : 0}
        totalDealersCount={props.filteredDealers.length}
        totalGroups={props.totalGroups}
        totalVolume={deliveredOrderTotal}
        unit={volumeUnit}
      />

      <WangjaiAdvisor
        accent="sky"
        message={`ภาพรวมยอดส่งจริงจาก Order โดย ${topDeliveredRegion?.[0] ?? "ยังไม่มีภูมิภาค"} มียอดส่งจริงสูงสุด และควรติดตามดีลเลอร์กลุ่ม Active อย่างใกล้ชิดครับ`}
        title="น้องวางใจช่วยสรุปภาพรวม Dealer"
      />

      {/* Hero charts (rendered as Bento Grid inside TimeVolumeBarChart) */}
      <section className="grid grid-cols-1">
        <TimeVolumeBarChart
          dealers={props.filteredDealers}
          orders={props.filteredOrders}
          focusRange={chartFocusRange}
          range={chartRange}
          selectedRegions={selectedRegions}
          unit={volumeUnit}
          regionSummary={regionSummaryText}
          headerControls={
            <div className="flex flex-col items-end gap-1.5">
              {/* Row 1: chips + ToggleGroup — always together, never wraps apart */}
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {/* Region chips */}
                <div className="flex flex-wrap items-center gap-1">
                  {allRegions.map((region) => {
                    const active = (selectedRegions ?? allRegions).includes(region);
                    const color = getRegionColor(region, allRegions);
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => {
                          const current = selectedRegions ?? allRegions;
                          if (current.includes(region)) setSelectedRegions(current.filter((r) => r !== region));
                          else setSelectedRegions([...current, region]);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                          active ? "text-white" : "bg-white text-slate-500 ring-1 ring-[#d9e3e6] hover:text-slate-700 dark:bg-slate-900 dark:text-slate-400"
                        )}
                        style={active ? { backgroundColor: color } : undefined}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />
                        {region}
                      </button>
                    );
                  })}
                  {selectedRegions !== null && (
                    <button
                      type="button"
                      onClick={() => setSelectedRegions(null)}
                      className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      ล้าง
                    </button>
                  )}
                </div>
                <ToggleGroup
                  ariaLabel="ช่วงเวลากราฟ"
                  options={[
                    { value: "all", label: "ทั้งหมด" },
                    { value: "year", label: "ปี" },
                    { value: "month", label: "เดือน" },
                    { value: "day", label: "วัน" }
                  ]}
                  value={chartRange}
                  onChange={setChartRange}
                />
              </div>
              {/* Row 2: date range picker — only when month/day selected */}
              {chartRange === "month" && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-[#d9e3e6] bg-[#fbfcfd] p-1 dark:border-slate-800 dark:bg-slate-950">
                  <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">ช่วงกราฟ</span>
                  <label className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">จาก</span>
                    <input
                      type="month"
                      className="h-8 rounded-[14px] border border-[#d5e0e3] bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      min={earliestMonthKey}
                      max={latestMonthKey}
                      value={monthFrom || earliestMonthKey}
                      onChange={(event) => setMonthFrom(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">ถึง</span>
                    <input
                      type="month"
                      className="h-8 rounded-[14px] border border-[#d5e0e3] bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      min={earliestMonthKey}
                      max={latestMonthKey}
                      value={monthTo || latestMonthKey}
                      onChange={(event) => setMonthTo(event.target.value)}
                    />
                  </label>
                </div>
              )}
              {chartRange === "day" && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-[18px] border border-[#d9e3e6] bg-[#fbfcfd] p-1 dark:border-slate-800 dark:bg-slate-950">
                  <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">ช่วงกราฟ</span>
                  <label className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">จาก</span>
                    <input
                      type="date"
                      className="h-8 rounded-[14px] border border-[#d5e0e3] bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      min={earliestDateKey}
                      max={latestDateKey}
                      value={dateFrom || defaultDayFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-[10px] font-semibold text-slate-400">ถึง</span>
                    <input
                      type="date"
                      className="h-8 rounded-[14px] border border-[#d5e0e3] bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                      min={earliestDateKey}
                      max={latestDateKey}
                      value={dateTo || defaultDayTo}
                      onChange={(event) => setDateTo(event.target.value)}
                    />
                  </label>
                </div>
              )}
            </div>
          }
        />
      </section>

      {/* Dealer table */}
      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6] bg-white">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(400px,620px)] xl:items-center">
              <div>
                <CardTitle className="text-base">ภาพรวม Dealer ทั้งหมด</CardTitle>
                <p className="mt-0.5 max-w-xl text-xs font-medium leading-5 text-slate-500">
                  แยกค่าจาก Dealer API และ Order API ชัดเจน โดยไม่มีตัวเลขประมาณการ
                </p>
              </div>
              <FilterBar
                region={props.region}
                regions={props.regions}
                search={props.search}
                setRegion={props.setRegion}
                setSearch={props.setSearch}
                setStatus={props.setStatus}
                status={props.status}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={props.filteredDealers}
              loading={props.apiState === "loading"}
              rowKey="dealer_id"
              minWidth={1180}
              pageSize={10}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
}
