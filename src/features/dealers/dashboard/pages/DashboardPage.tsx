import { useState } from "react";
import { Layers3, PackageCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer } from "@/features/dealers/types";
import type { PageKey } from "../config/pageMeta";
import { dateText } from "../lib/dates";
import { groupByRegion } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
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

export function DashboardPage(props: DashboardPageProps) {
  const [chartRange, setChartRange] = useState<ChartRange>("all");
  const volumeUnit = props.filteredDealers.find((dealer) => dealer.unit)?.unit ?? props.topDealer?.unit ?? "m3";

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
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          icon={<PackageCheck size={18} />}
          label="Total Volume"
          value={`${compactNumber(props.totalVolume)} ${volumeUnit}`}
          detail={`${formatNumber(props.totalVolume)} ${volumeUnit} across selected dealers`}
        />
        <MetricCard icon={<Users size={18} />} label="Active Dealers" value={`${props.activeRate}%`} detail="Active dealer status from API" tone="green" />
        <MetricCard icon={<Layers3 size={18} />} label="Total Groups" value={formatNumber(props.totalGroups)} detail="จำนวนกลุ่มรวมของ dealer ที่กำลังแสดง" tone="rose" />
      </section>
      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">ปริมาณการขายแยกตามพื้นที่ของ Dealer</CardTitle>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  เริ่มจากทั้งหมดก่อน แล้วค่อยเปลี่ยนเป็นปี/เดือน/วันเมื่ออยากดูช่วงเวลา สีในแท่งแยกตามภูมิภาค
                </p>
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

      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6] bg-white">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(400px,620px)] xl:items-center">
              <div>
                <CardTitle className="text-lg">ภาพรวม Dealer ทั้งหมด</CardTitle>
                <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-slate-500">
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
            <DataTable columns={columns} data={props.filteredDealers} loading={props.apiState === "loading"} rowKey="dealer_id" minWidth={1180} pageSize={10} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}
