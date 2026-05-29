import { useMemo, useState } from "react";
import { ChevronDown, Filter, Layers3, MapPin, PackageCheck, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer } from "@/features/dealers/types";
import type { PageKey } from "../config/pageMeta";
import { dateText, parseDateValue } from "../lib/dates";
import { groupByRegion } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { ToggleGroup } from "../ui/ToggleGroup";
import { FilterBar } from "../filters/FilterBar";
import { DataTable } from "../table/DataTable";
import { TimeVolumeBarChart, RegionFilterPanel, type ChartFocusRange, type ChartRange } from "../charts/TimeVolumeBarChart";
import { dealerColumn, statusColumn, regionPill, VolumeCell, ApiErrorBanner } from "../table/columns";

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
    detail: string;
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }[] = [
    {
      bgIcon: "bg-indigo-50 dark:bg-indigo-950/30",
      textColor: "text-indigo-600 dark:text-indigo-400",
      detail: `${formatNumber(totalVolume)} ${unit} ทั้งหมด`,
      icon: <PackageCheck size={20} />,
      label: "Total Delivered Volume",
      value: (
        <>
          {compactNumber(totalVolume)}{" "}
          <span className="text-xs font-semibold text-slate-400">{unit}</span>
        </>
      )
    },
    {
      bgIcon: "bg-teal-50 dark:bg-teal-950/30",
      textColor: "text-teal-600 dark:text-teal-400",
      detail: `${activeDealersCount} / ${totalDealersCount} ราย active`,
      icon: <Users size={20} />,
      label: "Active Dealers",
      value: (
        <>
          {activeRate}
          <span className="text-xs font-semibold text-slate-400">%</span>
        </>
      )
    },
    {
      bgIcon: "bg-purple-50 dark:bg-purple-950/30",
      textColor: "text-purple-600 dark:text-purple-400",
      detail: "จำนวนกลุ่มรวม",
      icon: <Layers3 size={20} />,
      label: "Total Groups",
      value: formatNumber(totalGroups)
    },
    {
      bgIcon: "bg-amber-50 dark:bg-amber-950/30",
      textColor: "text-amber-600 dark:text-amber-400",
      detail: topRegion ? `${Math.round(topRegionShare)}% ของยอด` : "ยังไม่มีข้อมูล",
      icon: <MapPin size={20} />,
      label: "Top Region",
      value: (
        <span className="text-sm font-bold leading-tight">
          {topRegion ?? "—"}
        </span>
      )
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3.5 py-3 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", item.bgIcon, item.textColor)}>
            {item.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-500">{item.label}</p>
            <p className="mt-0.5 truncate text-xl font-bold leading-none text-slate-900 dark:text-slate-100">
              {item.value}
            </p>
            <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{item.detail}</p>
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

export function DashboardPage(props: DashboardPageProps) {
  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const [monthFrom, setMonthFrom] = useState("");
  const [monthTo, setMonthTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[] | null>(null);
  const [regionFilterOpen, setRegionFilterOpen] = useState(false);
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

  const chartDates = useMemo(
    () =>
      props.filteredDealers
        .map((dealer) => parseDateValue(dealer.last_active_at ?? dealer.updated_at))
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
    { title: "ภูมิภาค", dataIndex: "region", key: "region", width: 160, render: regionPill },
    { title: "จังหวัด", dataIndex: "province", key: "province", width: 140 },
    {
      title: "Delivered Volume",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      width: 160,
      render: (_, record) => (
        <VolumeCell value={record.volume} unit={record.unit} max={Math.max(props.topDealer?.volume ?? 1, 1)} />
      )
    },
    {
      title: "กลุ่ม",
      dataIndex: "group_count",
      key: "group_count",
      align: "right",
      width: 110,
      render: formatNumber
    },
    {
      title: "ใช้งานล่าสุด",
      dataIndex: "last_active_at",
      key: "last_active_at",
      width: 190,
      render: dateText
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
        topRegion={topRegionRow?.region ?? null}
        topRegionShare={topRegionShare}
        totalDealersCount={props.filteredDealers.length}
        totalGroups={props.totalGroups}
        totalVolume={props.totalVolume}
        unit={volumeUnit}
      />

      {/* Hero charts (rendered as Bento Grid inside TimeVolumeBarChart) */}
      <section className="grid grid-cols-1">
        <TimeVolumeBarChart
          dealers={props.filteredDealers}
          focusRange={chartFocusRange}
          range={chartRange}
          selectedRegions={selectedRegions}
          unit={volumeUnit}
          headerControls={
            <div className="flex flex-wrap items-center justify-end gap-2">
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
              <button
                type="button"
                onClick={() => setRegionFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                  regionFilterOpen
                    ? "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    : "border-[#d9e3e6] bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                )}
              >
                <Filter size={13} />
                ภูมิภาค
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">
                  {selectedRegionCount}/{allRegions.length}
                </span>
                <ChevronDown size={13} className={cn("transition-transform", regionFilterOpen && "rotate-180")} />
              </button>
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
          }
          regionFilterPanel={
            regionFilterOpen && (
              <div className="pb-3 border-b border-[#eef0f4] dark:border-slate-800 mb-2">
                <RegionFilterPanel
                  allRegions={allRegions}
                  regionTotalVolumes={regionTotalVolumes}
                  selectedRegions={selectedRegions}
                  onChange={setSelectedRegions}
                  totalAllVolume={props.totalVolume}
                  unit={volumeUnit}
                />
              </div>
            )
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
