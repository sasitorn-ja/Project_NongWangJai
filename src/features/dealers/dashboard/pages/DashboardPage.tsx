import { useState } from "react";
import { Layers3, MapPin, PackageCheck, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer } from "@/features/dealers/types";
import type { PageKey } from "../config/pageMeta";
import { dateText } from "../lib/dates";
import { groupByRegion } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { ToggleGroup } from "../ui/ToggleGroup";
import { FilterBar } from "../filters/FilterBar";
import { DataTable } from "../table/DataTable";
import { TimeVolumeBarChart, type ChartRange } from "../charts/TimeVolumeBarChart";
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
    accent: string;
    detail: string;
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
  }[] = [
    {
      accent: "bg-slate-100 text-slate-700",
      detail: `${formatNumber(totalVolume)} ${unit} ทั้งหมด`,
      icon: <PackageCheck size={14} />,
      label: "Total Volume",
      value: (
        <>
          {compactNumber(totalVolume)}{" "}
          <span className="text-xs font-semibold text-slate-400">{unit}</span>
        </>
      )
    },
    {
      accent: "bg-slate-100 text-slate-700",
      detail: `${activeDealersCount} / ${totalDealersCount} ราย active`,
      icon: <Users size={14} />,
      label: "Active Dealers",
      value: (
        <>
          {activeRate}
          <span className="text-xs font-semibold text-slate-400">%</span>
        </>
      )
    },
    {
      accent: "bg-slate-100 text-slate-700",
      detail: "จำนวนกลุ่มรวม",
      icon: <Layers3 size={14} />,
      label: "Total Groups",
      value: formatNumber(totalGroups)
    },
    {
      accent: "bg-slate-100 text-slate-700",
      detail: topRegion ? `${Math.round(topRegionShare)}% ของยอด` : "ยังไม่มีข้อมูล",
      icon: <MapPin size={14} />,
      label: "Top Region",
      value: (
        <span className="text-base font-bold leading-tight">
          {topRegion ?? "—"}
        </span>
      )
    }
  ];

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-panel dark:border-slate-800 dark:bg-slate-950">
      <div className="grid grid-cols-2 divide-y divide-[#eef0f4] sm:grid-cols-4 sm:divide-y-0 sm:divide-x dark:divide-slate-800">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", item.accent)}>
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
              <p className="mt-0.5 truncate text-[22px] font-bold leading-none text-slate-900 dark:text-slate-100">
                {item.value}
              </p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPage(props: DashboardPageProps) {
  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const volumeUnit =
    props.filteredDealers.find((dealer) => dealer.unit)?.unit ?? props.topDealer?.unit ?? "m3";

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
      title: "Volume",
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

      {/* Compact KPI strip */}
      <section className="grid grid-cols-1">
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
      </section>

      {/* Hero chart card */}
      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <CardTitle className="text-base">ปริมาณการขายแยกตามพื้นที่ของ Dealer</CardTitle>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                    เริ่มจากทั้งหมดก่อน แล้วค่อยเปลี่ยนเป็นปี/เดือน/วันเมื่ออยากดูช่วงเวลา · สีในแท่งแยกตามภูมิภาค
                  </p>
                </div>
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
          </CardHeader>
          <CardContent>
            <TimeVolumeBarChart dealers={props.filteredDealers} range={chartRange} unit={volumeUnit} />
          </CardContent>
        </Card>
      </section>

      {/* Dealer table */}
      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6] bg-white">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(400px,620px)] xl:items-center">
              <div>
                <CardTitle className="text-base">ภาพรวม Dealer ทั้งหมด</CardTitle>
                <p className="mt-0.5 max-w-xl text-[11px] font-medium leading-5 text-slate-500">
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
