import { useMemo, useState } from "react";
import { Layers3, MapPin, PackageCheck, TrendingDown, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer } from "@/features/dealers/types";
import type { PageKey } from "../config/pageMeta";
import { parseDateValue } from "../lib/dates";
import { groupByRegion } from "../lib/regions";
import { getDealerStatusKey } from "../lib/status";
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
  activeDealersCount,
  totalDealersCount,
  topRegion,
  topRegionShare,
  totalGroups,
  totalVolume,
  unit
}: {
  activeRate: number;
  activeDealersCount: number;
  totalDealersCount: number;
  topRegion: string | null;
  topRegionShare: number;
  totalGroups: number;
  totalVolume: number;
  unit: string;
}) {
	  const items: {
	    bgIcon: string;
    textColor: string;
    valueColor: string;
    delta: number | null;
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }[] = [
    {
      bgIcon: "bg-sky-50 dark:bg-sky-950/30",
      textColor: "text-sky-600 dark:text-sky-400",
      valueColor: "text-sky-600 dark:text-sky-300",
      delta: 12.4,
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
      delta: 8.6,
      icon: <Users size={22} />,
      label: "Active Dealers",
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
      delta: 5.2,
      icon: <Layers3 size={22} />,
      label: "Total Groups",
      value: formatNumber(totalGroups)
    },
    {
      bgIcon: "bg-amber-50 dark:bg-amber-950/30",
      textColor: "text-amber-500 dark:text-amber-400",
      valueColor: "text-amber-500 dark:text-amber-300",
      delta: null,
      icon: <MapPin size={22} />,
      label: "Top Region",
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
        <div key={item.label} className="metric-card flex min-h-[88px] items-start justify-between gap-2 rounded-xl border border-[#e6edf4] bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-slate-500">{item.label}</p>
            <p className={cn("mt-1.5 truncate text-[24px] font-extrabold leading-none", item.valueColor)}>
              {item.value}
            </p>
            <p className="mt-2 flex items-center gap-1 truncate text-[10px] font-medium text-slate-400">
              เปรียบเทียบช่วงก่อนหน้า
              {item.delta !== null && (
                <span className={cn("inline-flex items-center gap-0.5 font-bold", item.delta >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {item.delta >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                  {Math.abs(item.delta)}%
                </span>
              )}
            </p>
          </div>
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", item.bgIcon, item.textColor)}>
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

// ── Derived demo metrics (placeholders) ──────────────────────────────────────
// NOTE: the dealer API only returns delivered `volume`. Booked volume, delivery
// rate and trend below are derived deterministically from dealer_id so the table
// matches the mockup layout. Wire these to real data when available.
function deliveryRate(dealer: Dealer) {
  // stable 0.84–0.97 per dealer
  return 0.84 + ((dealer.dealer_id * 37) % 14) / 100;
}
function bookedVolume(dealer: Dealer) {
  return Math.round(dealer.volume / deliveryRate(dealer));
}
function trendValue(dealer: Dealer) {
  const isIdle = getDealerStatusKey(dealer.status) === "idle";
  const mag = ((dealer.dealer_id * 53) % 20) + 1;
  return isIdle ? -((dealer.dealer_id * 17) % 6) - 1 : mag;
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

function TrendCell({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center justify-end gap-0.5 text-[13px] font-bold", up ? "text-emerald-500" : "text-rose-500")}>
      {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {Math.abs(value)}%
    </span>
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
    props.filteredDealers.find((dealer) => dealer.unit)?.unit ?? props.topDealer?.unit ?? "m3";

  // Region list + per-region volumes for the toolbar filter
  const allRegions = useMemo(
    () => [...new Set(props.filteredDealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [props.filteredDealers]
  );
  const regionTotalVolumes = useMemo(() => {
    const map = new Map<string, number>();
    props.filteredDealers.forEach((d) => {
      if (!d.region) return;
      map.set(d.region, (map.get(d.region) ?? 0) + d.volume);
    });
    return map;
  }, [props.filteredDealers]);
  const selectedRegionCount = (selectedRegions ?? allRegions).length;
  const selectedRegionVolume = (selectedRegions ?? allRegions).reduce(
    (sum, region) => sum + (regionTotalVolumes.get(region) ?? 0),
    0
  );
  const selectedRegionPercent = props.totalVolume > 0 ? (selectedRegionVolume / props.totalVolume) * 100 : 0;
  const regionSummaryText = `เลือกภูมิภาค · ${selectedRegionCount}/${allRegions.length} · ${compactNumber(selectedRegionVolume)} ${volumeUnit} (${Math.round(selectedRegionPercent)}%)`;

  const chartDates = useMemo(
    () =>
      props.filteredDealers
        .map((dealer) => parseDateValue(dealer.last_active_at))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime()),
    [props.filteredDealers]
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

  // Top region from regionRows (sorted by volume desc in groupByRegion)
  const topRegionRow = props.regionRows[0];
  const topRegionShare =
    topRegionRow && props.totalVolume > 0 ? (topRegionRow.volume / props.totalVolume) * 100 : 0;

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
      title: "ยอดขาย (Booked)",
      dataIndex: "volume",
      key: "booked",
      align: "right",
      width: 140,
      render: (_, record) => (
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          {formatNumber(bookedVolume(record))} <span className="text-[11px] font-medium text-slate-400">{record.unit}</span>
        </span>
      )
    },
    {
      title: "ยอดส่งจริง (Delivered)",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      width: 150,
      render: (_, record) => (
        <span className="font-bold text-slate-950 dark:text-slate-100">
          {formatNumber(record.volume)} <span className="text-[11px] font-medium text-slate-400">{record.unit}</span>
        </span>
      )
    },
    {
      title: "อัตราส่งมอบ",
      dataIndex: "volume",
      key: "delivery_rate",
      width: 170,
      render: (_, record) => <DeliveryRateCell rate={deliveryRate(record)} />
    },
    statusColumn<Dealer>(),
    {
      title: "แนวโน้ม",
      dataIndex: "volume",
      key: "trend",
      align: "right",
      width: 110,
      render: (_, record) => <TrendCell value={trendValue(record)} />
    }
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
        topRegion={topRegionRow?.region ?? null}
        topRegionShare={topRegionShare}
        totalDealersCount={props.filteredDealers.length}
        totalGroups={props.totalGroups}
        totalVolume={props.totalVolume}
        unit={volumeUnit}
      />

      <WangjaiAdvisor
        accent="sky"
        message={`ภาพรวมยอดส่งจริงเติบโตต่อเนื่อง โดย ${topRegionRow?.region ?? "CPAC Metro"} มียอดสูงสุด และนำติดตามดีลเลอร์กลุ่ม Active และกลุ่มที่มียอดเติบโตในภูมิภาค Northeast อย่างใกล้ชิดครับ`}
        title="น้องวางใจช่วยสรุปภาพรวม Dealer"
      />

      {/* Hero charts (rendered as Bento Grid inside TimeVolumeBarChart) */}
      <section className="grid grid-cols-1">
        <TimeVolumeBarChart
          dealers={props.filteredDealers}
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
                  ดูปริมาณคอนกรีตส่งจริงรวม จำนวนกลุ่ม วันที่ใช้งานล่าสุด และสถานะ dealer
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
