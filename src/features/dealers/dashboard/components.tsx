import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Layers3,
  PackageCheck,
  Search,
  TrendingUp,
  User,
  Users
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import { cn, compactNumber, formatNumber } from "@/lib/utils";
import type {
  ApiState,
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";

import {
  type DataColumn,
  type DatePreset,
  type PageKey,
  FIXED_DIVISIONS,
  buildPaginationItems,
  dateText,
  getDealerStatusKey,
  getMonthKey,
  getMonthLabel,
  getRegionAccent,
  getRegionLabel,
  groupByRegion,
  normalizeSearch,
  parseDateValue,
  orderStatusText,
  statusText
} from "./utils";

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
  setSelectedDealerId: (id: number) => void;
  setStatus: (value: string) => void;
  status: string;
  topDealer?: Dealer;
  totalGroups: number;
  totalVolume: number;
};

export function SideNavItem({
  collapsed,
  icon,
  label,
  onClick,
  selected
}: {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
        selected && "bg-slate-100 text-slate-950"
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className={cn("shrink-0", selected ? "text-slate-950" : "text-slate-500")}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

export function DashboardPage(props: DashboardPageProps) {
  const pageSize = 10;
  const [tablePage, setTablePage] = useState(1);
  const totalPages = Math.max(Math.ceil(props.filteredDealers.length / pageSize), 1);
  const pagedDealers = props.filteredDealers.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setTablePage(1);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [props.filteredDealers.length, props.region, props.search, props.status]);

  const columns: DataColumn<Dealer>[] = [
    dealerColumn((dealer) => {
      props.setSelectedDealerId(dealer.dealer_id);
      props.setPage("groups");
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
        <MetricCard icon={<PackageCheck size={18} />} label="Total Volume" value={`${compactNumber(props.totalVolume)} m3`} detail={`${formatNumber(props.totalVolume)} m3 across selected dealers`} />
        <MetricCard icon={<Users size={18} />} label="Active Dealers" value={`${props.activeRate}%`} detail="Active dealer status from API" tone="green" />
        <MetricCard icon={<Layers3 size={18} />} label="Total Groups" value={formatNumber(props.totalGroups)} detail="จำนวนกลุ่มรวมของ dealer ที่กำลังแสดง" tone="rose" />
      </section>
      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Volume by Region</CardTitle>
            <p className="text-xs font-medium text-slate-500">เทียบปริมาณคอนกรีตส่งจริงรวมรายภูมิภาค พร้อมดูรายละเอียดเมื่อชี้แต่ละแท่ง</p>
          </CardHeader>
          <CardContent>
            <RegionVolumeExplorer regionRows={props.regionRows} />
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
            <DataTable columns={columns} data={pagedDealers} loading={props.apiState === "loading"} rowKey="dealer_id" minWidth={1180} />
            <ShadcnPagination
              currentPage={tablePage}
              pageSize={pageSize}
              totalItems={props.filteredDealers.length}
              totalPages={totalPages}
              onPageChange={setTablePage}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export function NetworkPage({ dealers, apiState }: { dealers: Dealer[]; apiState: ApiState }) {
  const uniqueDealers = useMemo(() => {
    const byIdentity = new Map<string, Dealer>();

    dealers.forEach((dealer) => {
      const identity =
        dealer.dealer_code?.trim() ||
        `${dealer.dealer_name?.trim() || "unknown"}::${dealer.region?.trim() || "-"}::${dealer.province?.trim() || "-"}`;
      const current = byIdentity.get(identity);
      if (!current) {
        byIdentity.set(identity, dealer);
        return;
      }

      byIdentity.set(identity, {
        ...current,
        ...dealer,
        dealer_id: current.dealer_id || dealer.dealer_id,
        dealer_code: current.dealer_code || dealer.dealer_code,
        dealer_name: current.dealer_name || dealer.dealer_name,
        region_id: current.region_id || dealer.region_id,
        region: current.region || dealer.region,
        province_id: current.province_id || dealer.province_id,
        province: current.province || dealer.province,
        group_count: current.group_count + dealer.group_count,
        volume: current.volume + dealer.volume,
        unit: current.unit || dealer.unit,
        last_active_days: current.last_active_days ?? dealer.last_active_days,
        last_active_at: current.last_active_at ?? dealer.last_active_at,
        created_at: current.created_at ?? dealer.created_at,
        updated_at: current.updated_at ?? dealer.updated_at,
        status: current.status ?? dealer.status
      });
    });

    return Array.from(byIdentity.values());
  }, [dealers]);

  const regionColumns = useMemo(() => {
    const grouped = uniqueDealers.reduce<
      Map<
        string,
        {
          region: string;
          dealers: Dealer[];
          dealerCount: number;
          totalGroups: number;
          totalVolume: number;
        }
      >
    >((acc, dealer) => {
      const current =
        acc.get(dealer.region) ?? {
          region: dealer.region,
          dealers: [],
          dealerCount: 0,
          totalGroups: 0,
          totalVolume: 0
        };

      current.dealers.push(dealer);
      current.dealerCount += 1;
      current.totalGroups += dealer.group_count;
      current.totalVolume += dealer.volume;
      acc.set(dealer.region, current);
      return acc;
    }, new Map());

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        dealers: [...item.dealers].sort((a, b) => b.volume - a.volume)
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume);
  }, [uniqueDealers]);

  const totalDealers = uniqueDealers.length;
  const totalGroups = uniqueDealers.reduce((sum, dealer) => sum + dealer.group_count, 0);
  return (
    <section className="space-y-4">
      <Card className="overflow-hidden border-0 bg-transparent shadow-none">
        <CardContent className="px-0 pt-0">
          <div className="mx-auto max-w-[340px] rounded-[28px] bg-gradient-to-br from-sky-500 via-cyan-500 to-sky-600 px-7 py-8 text-center text-white shadow-[0_26px_60px_rgba(14,116,214,0.28)]">
            <div className="text-xl font-semibold">CPAC - AI วางใจ</div>
            <div className="mt-2 text-sm font-medium text-sky-50/95">Dealer Network ทั่วประเทศ</div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
              <span className="rounded-full bg-white/20 px-3 py-1.5">{formatNumber(totalDealers)} Dealers</span>
              <span className="rounded-full bg-white/20 px-3 py-1.5">{formatNumber(totalGroups)} กลุ่ม</span>
              <span className="rounded-full bg-white/20 px-3 py-1.5">{compactNumber(uniqueDealers.reduce((sum, dealer) => sum + dealer.volume, 0))} m3</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[1180px] px-1">
          <div className="mx-auto h-8 w-px bg-[#b7d7f5]" />
          <div className="h-px w-full bg-[#b7d7f5]" />
          <div className="grid gap-4 pt-6" style={{ gridTemplateColumns: `repeat(${Math.max(regionColumns.length, 1)}, minmax(0, 1fr))` }}>
            {regionColumns.map((region) => (
              <RegionNetworkColumn key={region.region} region={region} />
            ))}
          </div>
        </div>
      </div>

      {apiState === "loading" ? (
        <div className="rounded-2xl border border-dashed border-[#d9e3e6] bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">
          กำลังโหลดข้อมูล dealer network...
        </div>
      ) : null}
      {apiState !== "loading" && !regionColumns.length ? (
        <div className="rounded-2xl border border-dashed border-[#d9e3e6] bg-white px-4 py-10 text-center text-sm font-semibold text-slate-500">
          ไม่มีข้อมูล dealer สำหรับสร้างแผนผัง
        </div>
      ) : null}
    </section>
  );
}

function RegionNetworkColumn({
  region
}: {
  region: {
    region: string;
    dealers: Dealer[];
    dealerCount: number;
    totalGroups: number;
    totalVolume: number;
  };
}) {
  const accent = getRegionAccent(region.region);
  const accentClasses = {
    sky: "border-sky-200 text-sky-700 bg-sky-50",
    emerald: "border-emerald-200 text-emerald-700 bg-emerald-50",
    amber: "border-amber-200 text-amber-700 bg-amber-50",
    violet: "border-violet-200 text-violet-700 bg-violet-50",
    orange: "border-orange-200 text-orange-700 bg-orange-50",
    teal: "border-teal-200 text-teal-700 bg-teal-50",
    slate: "border-slate-200 text-slate-700 bg-slate-50"
  } as const;
  const dotClasses = {
    sky: "bg-sky-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    orange: "bg-orange-500",
    teal: "bg-teal-500",
    slate: "bg-slate-500"
  } as const;
  const [expanded, setExpanded] = useState(false);
  const visibleDealers = expanded ? region.dealers : region.dealers.slice(0, 6);
  const hiddenCount = Math.max(region.dealers.length - 6, 0);

  return (
    <div className="relative">
      <div className="mx-auto mb-4 h-6 w-px bg-[#b7d7f5]" />
      <div className="rounded-[22px] border border-[#a8d5ff] bg-white px-4 py-4 shadow-sm">
        <div className={cn("text-[10px] font-black tracking-[0.22em]", accentClasses[accent].split(" ")[1])}>{getRegionLabel(region.region)}</div>
        <div className="mt-2 text-xl font-semibold text-slate-900">{region.region}</div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500">
          <span>{formatNumber(region.dealerCount)} dealers</span>
          <span>{formatNumber(region.totalGroups)} groups</span>
          <span>{compactNumber(region.totalVolume)} m3</span>
        </div>
      </div>

      <div className="mx-auto mt-4 h-6 w-px bg-[#d9e7f7]" />
      <div className="space-y-3">
        {visibleDealers.map((dealer) => (
          <DealerNetworkCard key={dealer.dealer_id} dealer={dealer} accent={accent} dotClass={dotClasses[accent]} />
        ))}
        {hiddenCount > 0 ? (
          <button
            type="button"
            className="w-full rounded-2xl border border-dashed border-[#cfe0ef] bg-white/80 px-4 py-3 text-center text-xs font-semibold text-slate-500 transition-colors hover:border-[#9ec5ea] hover:bg-sky-50 hover:text-sky-700"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "ย่อรายการ" : `และอีก ${formatNumber(hiddenCount)} dealers`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DealerNetworkCard({
  dealer,
  accent,
  dotClass
}: {
  dealer: Dealer;
  accent: "sky" | "emerald" | "amber" | "violet" | "orange" | "teal" | "slate";
  dotClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[#d9e3e6] bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black uppercase", accent === "sky" && "bg-sky-50 text-sky-700", accent === "emerald" && "bg-emerald-50 text-emerald-700", accent === "amber" && "bg-amber-50 text-amber-700", accent === "violet" && "bg-violet-50 text-violet-700", accent === "orange" && "bg-orange-50 text-orange-700", accent === "teal" && "bg-teal-50 text-teal-700", accent === "slate" && "bg-slate-50 text-slate-700")}>
              {dealer.dealer_name.slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{dealer.dealer_name}</div>
              <div className="text-[11px] font-medium text-slate-500">{dealer.dealer_code}</div>
            </div>
          </div>
        </div>
        <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", dotClass)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
        <div>
          <div className="font-medium text-slate-400">Groups</div>
          <div className="mt-0.5 font-semibold text-slate-800">{formatNumber(dealer.group_count)}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Volume</div>
          <div className="mt-0.5 font-semibold text-slate-800">{compactNumber(dealer.volume)}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Province</div>
          <div className="mt-0.5 truncate font-semibold text-slate-800">{dealer.province || "-"}</div>
        </div>
        <div>
          <div className="font-medium text-slate-400">Unit</div>
          <div className="mt-0.5 font-semibold text-slate-800">{dealer.unit || "m3"}</div>
        </div>
      </div>

    </div>
  );
}

function ApiErrorBanner({ message }: { message?: string }) {
  const missingCredentials = message?.includes("Missing CPAC API credentials");

  return (
    <Card className="border-amber-200 bg-amber-50/90 shadow-sm">
      <CardContent className="space-y-1 p-4">
        <div className="text-sm font-semibold text-amber-900">โหลดข้อมูลจาก API ไม่สำเร็จ</div>
        <p className="text-sm text-amber-800">{message ?? "เกิดข้อผิดพลาดระหว่างโหลดข้อมูลจาก backend"}</p>
        {missingCredentials && (
          <p className="text-xs font-medium text-amber-700">
            ตรวจสอบ Environment Variables บน Vercel ให้มี `CPAC_API_USER` และ `CPAC_API_PASSWORD`
            รวมถึง `CPAC_API_TARGET` ถ้าต้องการเปลี่ยนปลายทาง API
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type GroupsPageProps = {
  dealers: Dealer[];
  groups: DealerGroup[];
  groupsState: ApiState;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
  usageRows: DealerUsage[];
};

export function GroupsPage({ dealers, groups, groupsState, selectedDealer, selectedDealerId, setSelectedDealerId, usageRows }: GroupsPageProps) {
  const totalDelivered = groups.reduce((sum, group) => sum + group.delivered_volume, 0);
  const totalBooked = groups.reduce((sum, group) => sum + group.booked_volume, 0);
  const totalPriceChecks = groups.reduce((sum, group) => sum + group.price_check_count, 0);
  const totalBookings = groups.reduce((sum, group) => sum + group.booking_count, 0);
  const topGroups = useMemo(
    () =>
      [...groups]
        .sort(
          (a, b) =>
            Math.max(b.delivered_volume, b.booked_volume) - Math.max(a.delivered_volume, a.booked_volume)
        )
        .slice(0, 8),
    [groups]
  );

  const columns: DataColumn<DealerGroup>[] = [
    {
      title: "Group",
      dataIndex: "group_name",
      key: "group_name",
      width: 320,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.group_name}</div>
          <div className="text-xs font-medium text-slate-500">ID: {record.group_id} | Type: {record.group_type ?? "-"}</div>
        </div>
      )
    },
    { title: "ส่งจริง", dataIndex: "delivered_volume", key: "delivered_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "จอง", dataIndex: "booked_volume", key: "booked_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "เช็คราคา", dataIndex: "price_check_count", key: "price_check_count", align: "right", width: 130, render: formatNumber },
    { title: "จองคิว", dataIndex: "booking_count", key: "booking_count", align: "right", width: 130, render: formatNumber },
    { title: "วันที่สร้าง", dataIndex: "created_at", key: "created_at", width: 190, render: dateText },
    statusColumn<DealerGroup>()
  ];

  return (
    <>
      <DealerPicker dealers={dealers} selectedDealerId={selectedDealerId} setSelectedDealerId={setSelectedDealerId} title="เลือก Dealer เพื่อดูรายการกลุ่ม" />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Layers3 size={18} />} label="Groups" value={formatNumber(groups.length)} detail={selectedDealer?.dealer_name ?? "Select dealer"} />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered" value={`${compactNumber(totalDelivered)} m3`} detail="ปริมาณคอนกรีตส่งจริงของกลุ่ม" tone="green" />
        <MetricCard icon={<TrendingUp size={18} />} label="Booked" value={`${compactNumber(totalBooked)} m3`} detail="ปริมาณคอนกรีตที่มีการจอง" tone="amber" />
        <MetricCard icon={<Search size={18} />} label="Price / Booking" value={`${formatNumber(totalPriceChecks)} / ${formatNumber(totalBookings)}`} detail="จำนวนเช็คราคาและจองคิว" tone="rose" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Delivered vs Booked by Group</CardTitle>
            <p className="text-xs font-medium text-slate-500">
              แสดงเฉพาะ {formatNumber(topGroups.length)} กลุ่มที่มี volume สูงสุดจากทั้งหมด {formatNumber(groups.length)} กลุ่ม เพื่อดูว่ากลุ่มไหนจองนำหรือส่งจริงนำ
            </p>
          </CardHeader>
          <CardContent>
            <GroupDeliveredBookedComparison
              data={topGroups.map((group) => ({
                label: group.group_name,
                primary: group.delivered_volume,
                secondary: group.booked_volume,
                unit: group.unit
              }))}
              primaryLabel="Delivered"
              secondaryLabel="Booked"
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Activity Funnel</CardTitle>
            <p className="text-xs font-medium text-slate-500">ภาพรวมการใช้งานจากเช็คราคาไปสู่การจอง</p>
          </CardHeader>
          <CardContent>
            <FunnelBars
              rows={[
                { label: "Dealer price checks", value: usageRows.find((row) => row.dealer_id === selectedDealerId)?.price_concrete_count ?? totalPriceChecks },
                { label: "Group price checks", value: totalPriceChecks },
                { label: "Group bookings", value: totalBookings }
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="dashboard-card overflow-hidden">
        <CardHeader className="border-b border-[#d9e3e6]">
          <CardTitle className="text-lg">รายการกลุ่มของ Dealer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={groups} loading={groupsState === "loading"} rowKey="group_id" minWidth={1180} pageSize={10} />
        </CardContent>
      </Card>
    </>
  );
}

type DetailsPageProps = {
  customers: CustomerUsage[];
  customersState: ApiState;
  dealers: Dealer[];
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
  sites: DealerSite[];
  sitesState: ApiState;
  usageRows: DealerUsage[];
};

export function DetailsPage(props: DetailsPageProps) {
  const selectedUsage = props.usageRows.find((row) => row.dealer_id === props.selectedDealerId);

  const customerColumns: DataColumn<CustomerUsage>[] = [
    { title: "Customer", dataIndex: "customer_name", key: "customer_name", width: 280, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.customer_name}</div><div className="text-xs font-medium text-slate-500">{record.customer_code}</div></div> },
    { title: "เช็คราคา", dataIndex: "price_concrete_count", key: "price_concrete_count", align: "right", width: 140, render: formatNumber },
    { title: "สร้างจองคิว", dataIndex: "booking_create_count", key: "booking_create_count", align: "right", width: 150, render: formatNumber },
    { title: "อัปเดตล่าสุด", dataIndex: "updated_at", key: "updated_at", width: 190, render: dateText }
  ];

  const siteColumns: DataColumn<DealerSite>[] = [
    { title: "Site", dataIndex: "site_name", key: "site_name", width: 300, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.site_name}</div><div className="text-xs font-medium text-slate-500">{record.site_code}</div></div> },
    { title: "Customer", dataIndex: "customer", key: "customer", width: 240, render: (_, record) => record.customer?.name ?? "-" },
    { title: "Ordered", dataIndex: "total_ordered", key: "total_ordered", align: "right", width: 130, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "Delivered", dataIndex: "total_delivered", key: "total_delivered", align: "right", width: 130, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "เทล่าสุด", dataIndex: "last_pour_datetime", key: "last_pour_datetime", width: 190, render: dateText },
    statusColumn<DealerSite>()
  ];

  return (
    <>
      <DealerPicker dealers={props.dealers} selectedDealerId={props.selectedDealerId} setSelectedDealerId={props.setSelectedDealerId} title="เลือก Dealer เพื่อดูรายละเอียด" />
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard icon={<Search size={18} />} label="Price Checks" value={formatNumber(selectedUsage?.price_concrete_count ?? 0)} detail="จำนวนครั้งที่ dealer เช็คราคา" />
        <MetricCard icon={<Clock3 size={18} />} label="Bookings" value={formatNumber(selectedUsage?.booking_create_count ?? 0)} detail="จำนวนครั้งที่สร้างจองคิว" tone="amber" />
        <MetricCard icon={<User size={18} />} label="Customers" value={formatNumber(selectedUsage?.customer_create_count ?? props.customers.length)} detail="จำนวนลูกค้าของ dealer" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Customer Activity</CardTitle>
            <p className="text-xs font-medium text-slate-500">ลูกค้าที่มีการเช็คราคาและสร้างจองคิวสูงสุด</p>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={props.customers.slice(0, 8).map((customer) => ({
                label: customer.customer_name,
                primary: customer.price_concrete_count,
                secondary: customer.booking_create_count
              }))}
              primaryLabel="Price checks"
              secondaryLabel="Bookings"
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Site Delivery Progress</CardTitle>
            <p className="text-xs font-medium text-slate-500">สัดส่วนส่งแล้วเทียบกับยอดสั่งของ site</p>
          </CardHeader>
          <CardContent>
            <ProgressList
              rows={props.sites.slice(0, 8).map((site) => ({
                label: site.site_name,
                value: site.total_delivered,
                total: site.total_ordered,
                unit: site.unit
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="dashboard-card">
        <CardHeader className="border-b border-[#d9e3e6]">
          <CardTitle className="text-lg">Dealer Usage Summary</CardTitle>
          <p className="text-xs font-medium text-slate-500">{props.selectedDealer?.dealer_name ?? "-"} | Updated: {dateText(selectedUsage?.updated_at)}</p>
        </CardHeader>
      </Card>

      <ShadcnTabs
        items={[
          {
            key: "customers",
            label: "Customers",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardContent className="p-0">
                  <DataTable columns={customerColumns} data={props.customers} loading={props.customersState === "loading"} rowKey="customer_id" minWidth={760} pageSize={10} />
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
                  <DataTable columns={siteColumns} data={props.sites} loading={props.sitesState === "loading"} rowKey="site_id" minWidth={1120} pageSize={10} />
                </CardContent>
              </Card>
            )
          }
        ]}
      />
    </>
  );
}

export function TopCustomersPage({
  dealers,
  orders,
  ordersState
}: {
  dealers: Dealer[];
  orders: OrderItem[];
  ordersState: ApiState;
}) {
  const [division, setDivision] = useState("all");
  const [province, setProvince] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [topN, setTopN] = useState(5);

  const dealerMap = useMemo(() => new Map(dealers.map((dealer) => [dealer.dealer_id, dealer])), [dealers]);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => {
        const dealer = dealerMap.get(order.dealer_id);
        const region = dealer?.region ?? "-";
        const provinceName = dealer?.province ?? "-";
        const monthKey = getMonthKey(order.pour_datetime ?? order.updated_at ?? order.created_at);
        const customerName = dealer?.dealer_name?.trim() || order.dealer_name?.trim() || "ไม่ระบุ dealer";
        const customerCode = dealer?.dealer_code?.trim() || order.dealer_code?.trim() || "-";
        const siteKey = order.site?.site_code?.trim() || order.site?.site_id?.toString() || "";
        const delivered = order.quantity?.delivered ?? 0;
        const ordered = order.quantity?.ordered ?? 0;

        return {
          ...order,
          customerCode,
          customerName,
          delivered,
          monthKey,
          ordered,
          provinceName,
          region,
          siteKey
        };
      }),
    [dealerMap, orders]
  );

  const divisions = useMemo(() => [...FIXED_DIVISIONS], []);
  const provinces = useMemo(() => Array.from(new Set(enrichedOrders.map((order) => order.provinceName).filter(Boolean))).sort(), [enrichedOrders]);
  const years = useMemo(() => Array.from(new Set(enrichedOrders.map((order) => order.monthKey.slice(0, 4)).filter(Boolean))).sort(), [enrichedOrders]);
  const monthKeys = useMemo(() => Array.from(new Set(enrichedOrders.map((order) => order.monthKey).filter(Boolean))).sort(), [enrichedOrders]);

  const ordersBeforeCustomer = useMemo(
    () =>
      enrichedOrders.filter((order) => {
        const matchDivision = division === "all" || order.region === division;
        const matchProvince = province === "all" || order.provinceName === province;
        const matchYear = year === "all" || order.monthKey.startsWith(`${year}-`);
        const matchMonth = month === "all" || order.monthKey === month;
        return matchDivision && matchProvince && matchYear && matchMonth;
      }),
    [division, enrichedOrders, month, province, year]
  );

  const customerOptions = useMemo(
    () => Array.from(new Set(ordersBeforeCustomer.map((order) => order.customerName))).sort(),
    [ordersBeforeCustomer]
  );

  const filteredOrders = useMemo(
    () => ordersBeforeCustomer.filter((order) => customerFilter === "all" || order.customerName === customerFilter),
    [customerFilter, ordersBeforeCustomer]
  );

  const customerRows = useMemo(() => {
    const rows = filteredOrders.reduce<
      Map<
        string,
        {
          countSite: number;
          customerCode: string;
          customerName: string;
          delivered: number;
          ordered: number;
          sites: Set<string>;
        }
      >
    >((acc, order) => {
      const key = `${order.customerCode}::${order.customerName}`;
      const current =
        acc.get(key) ?? {
          countSite: 0,
          customerCode: order.customerCode,
          customerName: order.customerName,
          delivered: 0,
          ordered: 0,
          sites: new Set<string>()
        };

      current.delivered += order.delivered;
      current.ordered += order.ordered;
      if (order.siteKey) current.sites.add(order.siteKey);
      current.countSite = current.sites.size;
      acc.set(key, current);
      return acc;
    }, new Map());

    return Array.from(rows.values()).sort((a, b) => b.delivered - a.delivered);
  }, [filteredOrders]);

  const monthlyRows = useMemo(() => {
    const grouped = filteredOrders.reduce<
      Map<
        string,
        {
          monthKey: string;
          delivered: number;
          ordered: number;
          customerMap: Map<
            string,
            {
              customerName: string;
              delivered: number;
              sites: Set<string>;
            }
          >;
        }
      >
    >((acc, order) => {
      const current =
        acc.get(order.monthKey) ?? {
          monthKey: order.monthKey,
          delivered: 0,
          ordered: 0,
          customerMap: new Map()
        };

      current.delivered += order.delivered;
      current.ordered += order.ordered;

      const customerKey = `${order.customerCode}::${order.customerName}`;
      const customerCurrent =
        current.customerMap.get(customerKey) ?? {
          customerName: order.customerName,
          delivered: 0,
          sites: new Set<string>()
        };

      customerCurrent.delivered += order.delivered;
      if (order.siteKey) customerCurrent.sites.add(order.siteKey);
      current.customerMap.set(customerKey, customerCurrent);

      acc.set(order.monthKey, current);
      return acc;
    }, new Map());

    return Array.from(grouped.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((row) => ({
        monthKey: row.monthKey,
        monthLabel: getMonthLabel(row.monthKey),
        ordered: row.ordered,
        topCustomers: Array.from(row.customerMap.values())
          .sort((a, b) => b.delivered - a.delivered)
          .slice(0, topN)
      }));
  }, [filteredOrders, topN]);

  const totalVolume = filteredOrders.reduce((sum, order) => sum + order.delivered, 0);
  const totalSites = new Set(filteredOrders.map((order) => order.siteKey).filter(Boolean)).size;
  const totalCustomers = customerRows.length;

  const customerColumns: DataColumn<(typeof customerRows)[number]>[] = [
    {
      title: "Dealer name",
      key: "customerName",
      width: 250,
      render: (_, record) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-slate-900">{record.customerName}</div>
          <div className="truncate text-[11px] font-medium text-slate-500">{record.customerCode}</div>
        </div>
      )
    },
    {
      title: <span className="inline-block pr-3">CountSite</span>,
      key: "countSite",
      dataIndex: "countSite",
      align: "right",
      width: 88,
      render: (value) => <span className="inline-block pr-4">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: <span className="inline-block pr-6">Volume</span>,
      key: "delivered",
      dataIndex: "delivered",
      align: "right",
      width: 128,
      render: (value) => <span className="inline-block min-w-[2.5rem] pr-6">{formatNumber(Number(value ?? 0))}</span>
    }
  ];

  return (
    <>
      <Card className="dashboard-card">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <TopCustomersFilter
              label="Division"
              value={division}
              onChange={setDivision}
              options={[{ label: "ทั้งหมด", value: "all" }, ...divisions.map((item) => ({ label: item, value: item }))]}
            />
            <TopCustomersFilter
              label="Province"
              value={province}
              onChange={setProvince}
              options={[{ label: "ทั้งหมด", value: "all" }, ...provinces.map((item) => ({ label: item, value: item }))]}
              searchable
              searchPlaceholder="ค้นหาจังหวัด"
            />
            <TopCustomersFilter
              label="Month"
              value={month}
              onChange={setMonth}
              options={[{ label: "ทั้งหมด", value: "all" }, ...monthKeys.map((item) => ({ label: getMonthLabel(item), value: item }))]}
            />
            <TopCustomersFilter
              label="Year"
              value={year}
              onChange={setYear}
              options={[{ label: "ทั้งหมด", value: "all" }, ...years.map((item) => ({ label: item, value: item }))]}
            />
            <TopCustomersFilter
              label="Dealer"
              value={customerFilter}
              onChange={setCustomerFilter}
              options={[{ label: "ทั้งหมด", value: "all" }, ...customerOptions.map((item) => ({ label: item, value: item }))]}
              searchable
              searchPlaceholder="ค้นหาชื่อ dealer"
              className="xl:col-span-2"
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">TopN</div>
            <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-2xl border border-[#d9e3e6] bg-[#f8fafb] p-1.5 shadow-inner shadow-slate-100/70">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition-all duration-150",
                    topN === value
                      ? "border-[#0f766e] bg-[#0f766e] text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]"
                      : "border-transparent bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#c8d7db] hover:bg-[#fdfefe]"
                  )}
                  onClick={() => setTopN(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard compact icon={<Users size={16} />} label="Dealers" value={formatNumber(totalCustomers)} detail="จำนวน dealer ที่อยู่ในผลลัพธ์ปัจจุบัน" />
        <MetricCard compact icon={<Database size={16} />} label="Sites" value={formatNumber(totalSites)} detail="นับจาก site ที่ไม่ซ้ำในผลลัพธ์ปัจจุบัน" tone="rose" />
        <MetricCard compact icon={<PackageCheck size={16} />} label="Volume" value={compactNumber(totalVolume)} detail="ยอดส่งจริงรวมจาก orders ที่ถูกกรอง" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)]">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Top N Dealer</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุปรายเดือนจากยอดส่งจริง พร้อมรายชื่อ Top {topN} dealer ของแต่ละเดือน</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[76px]" />
                  <col className="w-[88px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9]">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Month</th>
                    <th className="px-1 py-2.5 text-right text-xs font-semibold text-slate-500">Volume All</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">TopN Dealer</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersState === "loading" && (
                    <tr>
                      <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={3}>
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  )}
                  {ordersState !== "loading" && monthlyRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={3}>
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                  {monthlyRows.map((row, index) => (
                    <tr key={row.monthKey || index} className="border-b border-[#edf1f2] align-top">
                      <td className="px-3 py-3 font-semibold text-slate-950">{row.monthLabel}</td>
                      <td className="px-1 py-3 text-right font-semibold text-slate-800">{formatNumber(row.ordered)}</td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          {row.topCustomers.map((customer, customerIndex) => (
                            <div key={`${row.monthKey}-${customer.customerName}-${customerIndex}`} className="line-clamp-2 text-sm text-slate-800">
                              {customer.customerName} #{formatNumber(customer.sites.size)} site, {formatNumber(customer.delivered)} m3
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Dealer Ranking</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุป dealer ตามจำนวน site และยอดส่งจริง</p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={customerColumns} data={customerRows} loading={ordersState === "loading"} rowKey={(record) => `${record.customerCode}-${record.customerName}`} minWidth={0} pageSize={15} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export function TopProductsPage({
  dealers,
  orders,
  ordersState
}: {
  dealers: Dealer[];
  orders: OrderItem[];
  ordersState: ApiState;
}) {
  const [division, setDivision] = useState("all");
  const [province, setProvince] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [topN, setTopN] = useState(5);

  const dealerMap = useMemo(() => new Map(dealers.map((dealer) => [dealer.dealer_id, dealer])), [dealers]);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => {
        const dealer = dealerMap.get(order.dealer_id);
        const region = dealer?.region ?? "-";
        const provinceName = dealer?.province ?? "-";
        const monthKey = getMonthKey(order.pour_datetime ?? order.updated_at ?? order.created_at);
        const productCode = order.order?.product_sku?.trim() || "-";
        const productName = order.order?.product_name?.trim() || "ไม่ระบุสินค้า";
        const productKey = `${productCode}::${productName}`;
        const delivered = order.quantity?.delivered ?? 0;
        const ordered = order.quantity?.ordered ?? 0;

        return {
          ...order,
          delivered,
          monthKey,
          ordered,
          productCode,
          productKey,
          productName,
          provinceName,
          region
        };
      }),
    [dealerMap, orders]
  );

  const divisions = useMemo(() => [...FIXED_DIVISIONS], []);
  const provinces = useMemo(() => Array.from(new Set(enrichedOrders.map((order) => order.provinceName).filter(Boolean))).sort(), [enrichedOrders]);
  const years = useMemo(() => Array.from(new Set(enrichedOrders.map((order) => order.monthKey.slice(0, 4)).filter(Boolean))).sort(), [enrichedOrders]);
  const monthKeys = useMemo(() => Array.from(new Set(enrichedOrders.map((order) => order.monthKey).filter(Boolean))).sort(), [enrichedOrders]);

  const ordersBeforeProduct = useMemo(
    () =>
      enrichedOrders.filter((order) => {
        const matchDivision = division === "all" || order.region === division;
        const matchProvince = province === "all" || order.provinceName === province;
        const matchYear = year === "all" || order.monthKey.startsWith(`${year}-`);
        const matchMonth = month === "all" || order.monthKey === month;
        return matchDivision && matchProvince && matchYear && matchMonth;
      }),
    [division, enrichedOrders, month, province, year]
  );

  const productOptions = useMemo(
    () =>
      Array.from(new Map(ordersBeforeProduct.map((order) => [order.productKey, `${order.productName} (${order.productCode})`])).entries())
        .map(([value, label]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label, "th")),
    [ordersBeforeProduct]
  );

  const filteredOrders = useMemo(
    () => ordersBeforeProduct.filter((order) => productFilter === "all" || order.productKey === productFilter),
    [ordersBeforeProduct, productFilter]
  );

  const productRows = useMemo(() => {
    const rows = filteredOrders.reduce<
      Map<
        string,
        {
          key: string;
          latestPour: string | null;
          orderCount: number;
          ordered: number;
          productCode: string;
          productName: string;
          delivered: number;
        }
      >
    >((acc, order) => {
      const current =
        acc.get(order.productKey) ?? {
          key: order.productKey,
          latestPour: null,
          orderCount: 0,
          ordered: 0,
          productCode: order.productCode,
          productName: order.productName,
          delivered: 0
        };

      current.orderCount += 1;
      current.ordered += order.ordered;
      current.delivered += order.delivered;

      const candidateDate = parseDateValue(order.pour_datetime ?? order.updated_at ?? order.created_at);
      const currentDate = parseDateValue(current.latestPour);
      if (candidateDate && (!currentDate || candidateDate > currentDate)) {
        current.latestPour = order.pour_datetime ?? order.updated_at ?? order.created_at ?? null;
      }

      acc.set(order.productKey, current);
      return acc;
    }, new Map());

    return Array.from(rows.values()).sort((a, b) => b.delivered - a.delivered);
  }, [filteredOrders]);

  const monthlyRows = useMemo(() => {
    const grouped = filteredOrders.reduce<
      Map<
        string,
        {
          delivered: number;
          monthKey: string;
          ordered: number;
          productMap: Map<
            string,
            {
              productCode: string;
              productName: string;
              delivered: number;
            }
          >;
        }
      >
    >((acc, order) => {
      const current =
        acc.get(order.monthKey) ?? {
          delivered: 0,
          monthKey: order.monthKey,
          ordered: 0,
          productMap: new Map()
        };

      current.delivered += order.delivered;
      current.ordered += order.ordered;

      const productCurrent =
        current.productMap.get(order.productKey) ?? {
          productCode: order.productCode,
          productName: order.productName,
          delivered: 0
        };

      productCurrent.delivered += order.delivered;
      current.productMap.set(order.productKey, productCurrent);
      acc.set(order.monthKey, current);
      return acc;
    }, new Map());

    return Array.from(grouped.values())
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map((row) => ({
        delivered: row.delivered,
        monthKey: row.monthKey,
        monthLabel: getMonthLabel(row.monthKey),
        ordered: row.ordered,
        topProducts: Array.from(row.productMap.values())
          .sort((a, b) => b.delivered - a.delivered)
          .slice(0, topN)
      }));
  }, [filteredOrders, topN]);

  const totalProducts = productRows.length;
  const totalOrders = filteredOrders.length;
  const totalVolume = filteredOrders.reduce((sum, order) => sum + order.delivered, 0);
  const bestseller = productRows[0];

  const productColumns: DataColumn<(typeof productRows)[number]>[] = [
    {
      title: "รหัสสินค้า",
      key: "productCode",
      dataIndex: "productCode",
      width: 180
    },
    {
      title: "ชื่อสินค้า",
      key: "productName",
      width: 320,
      render: (_, record) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-slate-900">{record.productName}</div>
          <div className="truncate text-[11px] font-medium text-slate-500">{record.productCode}</div>
        </div>
      )
    },
    {
      title: "Orders",
      key: "orderCount",
      dataIndex: "orderCount",
      align: "right",
      width: 110,
      render: formatNumber
    },
    {
      title: "Ordered",
      key: "ordered",
      dataIndex: "ordered",
      align: "right",
      width: 130,
      render: formatNumber
    },
    {
      title: "Delivered",
      key: "delivered",
      dataIndex: "delivered",
      align: "right",
      width: 130,
      render: formatNumber
    },
    {
      title: "ขายล่าสุด",
      key: "latestPour",
      dataIndex: "latestPour",
      width: 190,
      render: dateText
    }
  ];

  return (
    <>
      <Card className="dashboard-card">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
            <TopCustomersFilter
              label="Division"
              value={division}
              onChange={setDivision}
              options={[{ label: "ทั้งหมด", value: "all" }, ...divisions.map((item) => ({ label: item, value: item }))]}
            />
            <TopCustomersFilter
              label="Province"
              value={province}
              onChange={setProvince}
              options={[{ label: "ทั้งหมด", value: "all" }, ...provinces.map((item) => ({ label: item, value: item }))]}
              searchable
              searchPlaceholder="ค้นหาจังหวัด"
            />
            <TopCustomersFilter
              label="Month"
              value={month}
              onChange={setMonth}
              options={[{ label: "ทั้งหมด", value: "all" }, ...monthKeys.map((item) => ({ label: getMonthLabel(item), value: item }))]}
            />
            <TopCustomersFilter
              label="Year"
              value={year}
              onChange={setYear}
              options={[{ label: "ทั้งหมด", value: "all" }, ...years.map((item) => ({ label: item, value: item }))]}
            />
            <TopCustomersFilter
              label="Product"
              value={productFilter}
              onChange={setProductFilter}
              options={[{ label: "ทั้งหมด", value: "all" }, ...productOptions]}
              searchable
              searchPlaceholder="ค้นหารหัสหรือชื่อสินค้า"
              className="xl:col-span-2"
            />
          </div>

          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">TopN</div>
            <div className="inline-flex w-fit flex-wrap items-center gap-1 rounded-2xl border border-[#d9e3e6] bg-[#f8fafb] p-1.5 shadow-inner shadow-slate-100/70">
              {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition-all duration-150",
                    topN === value
                      ? "border-[#0f766e] bg-[#0f766e] text-white shadow-[0_10px_24px_rgba(15,118,110,0.22)]"
                      : "border-transparent bg-white text-slate-700 hover:-translate-y-0.5 hover:border-[#c8d7db] hover:bg-[#fdfefe]"
                  )}
                  onClick={() => setTopN(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard compact icon={<PackageCheck size={16} />} label="Products" value={formatNumber(totalProducts)} detail="จำนวนสินค้าที่อยู่ในผลลัพธ์ปัจจุบัน" />
        <MetricCard compact icon={<Database size={16} />} label="Orders" value={formatNumber(totalOrders)} detail="จำนวน orders ที่ใช้คำนวณสินค้าขายดี" tone="rose" />
        <MetricCard compact icon={<TrendingUp size={16} />} label="Delivered Qty" value={compactNumber(totalVolume)} detail="ยอดส่งจริงรวมของสินค้าที่ถูกกรอง" tone="green" />
        <MetricCard compact icon={<Users size={16} />} label="Best Seller" value={bestseller?.productCode ?? "-"} detail={bestseller?.productName ?? "ยังไม่มีข้อมูลสินค้า"} tone="amber" />
      </section>

      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Top N Product</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุปรายเดือนจากยอดส่งจริง พร้อมรายการสินค้าขายดี Top {topN} ของแต่ละเดือน</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[88px]" />
                  <col className="w-[120px]" />
                  <col />
                </colgroup>
                <thead>
                  <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9]">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Month</th>
                    <th className="px-2 py-2.5 text-right text-xs font-semibold text-slate-500">Volume All</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">TopN Product</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersState === "loading" && (
                    <tr>
                      <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={3}>
                        กำลังโหลดข้อมูล...
                      </td>
                    </tr>
                  )}
                  {ordersState !== "loading" && monthlyRows.length === 0 && (
                    <tr>
                      <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={3}>
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                  {monthlyRows.map((row, index) => (
                    <tr key={row.monthKey || index} className="border-b border-[#edf1f2] align-top">
                      <td className="px-3 py-3 font-semibold text-slate-950">{row.monthLabel}</td>
                      <td className="px-2 py-3 text-right font-semibold text-slate-800">{formatNumber(row.delivered)}</td>
                      <td className="px-3 py-3">
                        <div className="space-y-1">
                          {row.topProducts.map((product, productIndex) => (
                            <div key={`${row.monthKey}-${product.productCode}-${productIndex}`} className="line-clamp-2 text-sm text-slate-800">
                              {product.productName} ({product.productCode}), {formatNumber(product.delivered)} m3
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Product Ranking</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุปสินค้าตามจำนวน order และยอดส่งจริง</p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={productColumns} data={productRows} loading={ordersState === "loading"} rowKey="key" minWidth={980} pageSize={10} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

export function CustomerInsightsPage({
  dealers,
  orders,
  ordersState,
  selectedDealer,
  selectedDealerId,
  setSelectedDealerId
}: {
  dealers: Dealer[];
  orders: OrderItem[];
  ordersState: ApiState;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
}) {
  const [topN, setTopN] = useState(10);
  const currentDealer = selectedDealerId == null ? null : selectedDealer;
  const dealerIdentity = useMemo(
    () => (row: OrderItem) => ({
      code: row.dealer_code?.trim() || "-",
      name: row.dealer_name?.trim() || "ไม่ระบุ dealer"
    }),
    []
  );

  const dealerOrders = useMemo(
    () => orders.filter((row) => selectedDealerId == null || row.dealer_id === selectedDealerId),
    [orders, selectedDealerId]
  );

  const customerRows = useMemo(() => {
    const rows = dealerOrders.reduce<
      Map<
        string,
        {
          key: string;
          customerName: string;
          customerCode: string;
          orderCount: number;
          uniqueSites: Set<string>;
          ordered: number;
          delivered: number;
          latestPour: string | null;
        }
      >
    >((acc, row) => {
      const { code: customerCode, name: customerName } = dealerIdentity(row);
      const key = `${customerCode}::${customerName}`;
      const current =
        acc.get(key) ?? {
          key,
          customerName,
          customerCode,
          orderCount: 0,
          uniqueSites: new Set<string>(),
          ordered: 0,
          delivered: 0,
          latestPour: null
        };

      current.orderCount += 1;
      current.ordered += row.quantity?.ordered ?? 0;
      current.delivered += row.quantity?.delivered ?? 0;
      if (row.site?.site_code) current.uniqueSites.add(row.site.site_code);

      const candidateDate = parseDateValue(row.pour_datetime ?? row.updated_at ?? row.created_at);
      const currentDate = parseDateValue(current.latestPour);
      if (candidateDate && (!currentDate || candidateDate > currentDate)) {
        current.latestPour = row.pour_datetime ?? row.updated_at ?? row.created_at ?? null;
      }

      acc.set(key, current);
      return acc;
    }, new Map());

    return Array.from(rows.values())
      .map((row) => ({
        ...row,
        siteCount: row.uniqueSites.size
      }))
      .sort((a, b) => b.delivered - a.delivered);
  }, [dealerIdentity, dealerOrders]);

  const siteRows = useMemo(() => {
    const rows = dealerOrders.reduce<
      Map<
        string,
        {
          key: string;
          siteName: string;
          siteCode: string;
          customerName: string;
          ordered: number;
          delivered: number;
          latestPour: string | null;
        }
      >
    >((acc, row) => {
      const siteCode = row.site?.site_code?.trim() || row.site?.site_id?.toString() || "-";
      const siteName = row.site?.site_name?.trim() || "ไม่ระบุไซต์";
      const { name: customerName } = dealerIdentity(row);
      const key = `${siteCode}::${siteName}`;
      const current =
        acc.get(key) ?? {
          key,
          siteName,
          siteCode,
          customerName,
          ordered: 0,
          delivered: 0,
          latestPour: null
        };

      current.ordered += row.quantity?.ordered ?? 0;
      current.delivered += row.quantity?.delivered ?? 0;

      const candidateDate = parseDateValue(row.pour_datetime ?? row.updated_at ?? row.created_at);
      const currentDate = parseDateValue(current.latestPour);
      if (candidateDate && (!currentDate || candidateDate > currentDate)) {
        current.latestPour = row.pour_datetime ?? row.updated_at ?? row.created_at ?? null;
      }

      acc.set(key, current);
      return acc;
    }, new Map());

    return Array.from(rows.values()).sort((a, b) => b.delivered - a.delivered);
  }, [dealerIdentity, dealerOrders]);

  const totalDelivered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0);
  const totalOrdered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0);
  const totalCustomers = customerRows.length;
  const totalSites = siteRows.length;
  const topCustomers = customerRows.slice(0, topN);

  const customerColumns: DataColumn<(typeof customerRows)[number]>[] = [
    {
      title: "Dealer",
      key: "customer",
      width: 320,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.customerName}</div>
          <div className="text-xs font-medium text-slate-500">{record.customerCode}</div>
        </div>
      )
    },
    { title: "Sites", key: "siteCount", dataIndex: "siteCount", align: "right", width: 110, render: formatNumber },
    { title: "Orders", key: "orderCount", dataIndex: "orderCount", align: "right", width: 110, render: formatNumber },
    { title: "Ordered", key: "ordered", dataIndex: "ordered", align: "right", width: 140, render: formatNumber },
    { title: "Delivered", key: "delivered", dataIndex: "delivered", align: "right", width: 140, render: formatNumber },
    { title: "Pour ล่าสุด", key: "latestPour", dataIndex: "latestPour", width: 190, render: dateText }
  ];

  const siteColumns: DataColumn<(typeof siteRows)[number]>[] = [
    {
      title: "Site",
      key: "site",
      width: 320,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.siteName}</div>
          <div className="text-xs font-medium text-slate-500">{record.siteCode}</div>
        </div>
      )
    },
    { title: "Dealer", key: "customerName", dataIndex: "customerName", width: 240 },
    { title: "Ordered", key: "ordered", dataIndex: "ordered", align: "right", width: 140, render: formatNumber },
    { title: "Delivered", key: "delivered", dataIndex: "delivered", align: "right", width: 140, render: formatNumber },
    { title: "Pour ล่าสุด", key: "latestPour", dataIndex: "latestPour", width: 190, render: dateText }
  ];

  return (
    <>
      <DealerPicker
        dealers={dealers}
        includeAll
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        title="เลือก Dealer เพื่อดู Top Dealer และ Site"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Users size={18} />} label="Dealers" value={formatNumber(totalCustomers)} detail={currentDealer?.dealer_name ?? "จำนวน dealer จากทุก dealer ในข้อมูล orders"} />
        <MetricCard icon={<Database size={18} />} label="Sites" value={formatNumber(totalSites)} detail="นับจาก site code/site id ที่ไม่ซ้ำ" tone="rose" />
        <MetricCard icon={<TrendingUp size={18} />} label="Ordered Qty" value={compactNumber(totalOrdered)} detail="ยอดสั่งรวมจาก orders ที่กรองอยู่" tone="amber" />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered Qty" value={compactNumber(totalDelivered)} detail="ยอดส่งจริงรวมจาก orders ที่กรองอยู่" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Top Dealers by Delivered Volume</CardTitle>
                <p className="text-xs font-medium text-slate-500">สรุปจาก dealer และ site ที่มีอยู่ในข้อมูล orders โดยไม่ใช้ site_from</p>
              </div>
              <div className="inline-flex rounded-md border border-[#d9e3e6] bg-white p-1 shadow-sm">
                {[5, 10, 20].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "rounded px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100",
                      topN === value && "bg-slate-100 text-slate-950"
                    )}
                    onClick={() => setTopN(value)}
                  >
                    Top {value}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={topCustomers.map((customer) => ({
                label: customer.customerName,
                primary: customer.delivered,
                secondary: customer.ordered
              }))}
              primaryLabel="Delivered"
              secondaryLabel="Ordered"
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Dealer Snapshot</CardTitle>
            <p className="text-xs font-medium text-slate-500">ดูรายชื่อ dealer กลุ่มบนสุดพร้อมจำนวนไซต์ที่สัมพันธ์กัน</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {topCustomers.length ? topCustomers.slice(0, 6).map((customer, index) => (
              <div key={customer.key} className="rounded-2xl border border-[#d9e3e6] bg-white/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Rank {index + 1}</div>
                    <div className="mt-1 truncate text-sm font-semibold text-slate-950">{customer.customerName}</div>
                    <div className="text-xs font-medium text-slate-500">{customer.customerCode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-950">{formatNumber(customer.delivered)}</div>
                    <div className="text-xs font-medium text-slate-500">delivered</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs font-medium text-slate-500">
                  <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                    <div className="text-[11px] uppercase tracking-wide">Sites</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(customer.siteCount)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                    <div className="text-[11px] uppercase tracking-wide">Orders</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(customer.orderCount)}</div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                    <div className="text-[11px] uppercase tracking-wide">Ordered</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatNumber(customer.ordered)}</div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-[#d9e3e6] px-4 py-10 text-center text-sm font-semibold text-slate-500">
                ไม่มีข้อมูลลูกค้าจาก orders ในช่วงเวลาที่เลือก
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <ShadcnTabs
        items={[
          {
            key: "customers",
            label: "Dealer Summary",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardHeader className="border-b border-[#d9e3e6]">
                  <CardTitle className="text-lg">Dealer Summary Table</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable columns={customerColumns} data={customerRows} loading={ordersState === "loading"} rowKey="key" minWidth={1040} pageSize={10} />
                </CardContent>
              </Card>
            )
          },
          {
            key: "sites",
            label: "Site Summary",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardHeader className="border-b border-[#d9e3e6]">
                  <CardTitle className="text-lg">Site Summary Table</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <DataTable columns={siteColumns} data={siteRows} loading={ordersState === "loading"} rowKey="key" minWidth={1080} pageSize={10} />
                </CardContent>
              </Card>
            )
          }
        ]}
      />
    </>
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
  const dealerOrders = useMemo(
    () => orders.filter((row) => selectedDealerId == null || row.dealer_id === selectedDealerId),
    [orders, selectedDealerId]
  );
  const totalOrdered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0);
  const totalDelivered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0);
  const uniqueSites = new Set(dealerOrders.map((row) => row.site?.site_code).filter(Boolean)).size;

  const columns: DataColumn<OrderItem>[] = [
    {
      title: "Order",
      key: "order",
      width: 300,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.order?.product_name ?? "-"}</div>
          <div className="text-xs font-medium text-slate-500">
            {record.order?.order_no ?? "-"} | {record.order?.product_sku ?? "-"}
          </div>
        </div>
      )
    },
    {
      title: "Dealer",
      key: "dealer",
      width: 240,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.dealer_name}</div>
          <div className="text-xs font-medium text-slate-500">{record.dealer_code}</div>
        </div>
      )
    },
    {
      title: "Customer / Site",
      key: "customer-site",
      width: 280,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.customer?.name ?? "-"}</div>
          <div className="text-xs font-medium text-slate-500">
            {(record.site?.site_name ?? "-")} | {(record.site?.site_code ?? "-")}
          </div>
        </div>
      )
    },
    {
      title: "Ordered",
      key: "ordered",
      align: "right",
      width: 130,
      render: (_, record) => `${formatNumber(record.quantity?.ordered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Delivered",
      key: "delivered",
      align: "right",
      width: 130,
      render: (_, record) => `${formatNumber(record.quantity?.delivered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Pour Time",
      dataIndex: "pour_datetime",
      key: "pour_datetime",
      width: 190,
      render: dateText
    },
    {
      title: "สถานะ",
      key: "status",
      width: 140,
      render: (_, record) => (
        <span className="inline-flex rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
          {orderStatusText(record.status?.order)}
        </span>
      )
    }
  ];

  return (
    <>
      <DealerPicker
        dealers={dealers}
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        title="เลือก Dealer เพื่อดู Orders"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<PackageCheck size={18} />} label="Orders" value={formatNumber(dealerOrders.length)} detail={selectedDealer?.dealer_name ?? "จำนวน order ของ dealer ที่เลือก"} />
        <MetricCard icon={<TrendingUp size={18} />} label="Ordered Qty" value={compactNumber(totalOrdered)} detail="ยอดสั่งรวมจาก order ทั้งหมด" tone="amber" />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered Qty" value={compactNumber(totalDelivered)} detail="ยอดส่งจริงรวมจาก order ทั้งหมด" tone="green" />
        <MetricCard icon={<Users size={18} />} label="Unique Sites" value={formatNumber(uniqueSites)} detail={`นับจาก site code ที่ไม่ซ้ำใน ${formatNumber(dealerOrders.length)} orders ของ dealer นี้`} tone="rose" />
      </section>

      <Card className="dashboard-card overflow-hidden">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div>
              <CardTitle className="text-lg">Orders ของ Dealer</CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedDealer
                  ? `แสดงรายการ order ของ ${selectedDealer.dealer_name} จากเส้น API จริง`
                  : "แสดงรายการ order ของ dealer ที่เลือกจากเส้น API จริง"}
              </p>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา dealer / customer / site / order no / product"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={dealerOrders}
            loading={ordersState === "loading"}
            rowKey={(record) =>
              [
                record.order?.order_no,
                record.dealer_id,
                record.site?.site_code,
                record.created_at ?? record.updated_at ?? record.pour_datetime
              ]
                .filter(Boolean)
                .join("-")
            }
            minWidth={1410}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </>
  );
}

export function DateRangeToolbar({
  dateFrom,
  datePreset,
  dateTo,
  setDateFrom,
  setDatePreset,
  setDateTo
}: {
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDatePreset: (value: DatePreset) => void;
  setDateTo: (value: string) => void;
}) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-nowrap xl:items-center xl:justify-end">
      <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#d5e0e3] bg-white px-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:col-span-2 xl:min-w-[210px]">
        <CalendarDays size={15} className="text-slate-500" />
        <select
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200"
          value={datePreset}
          onChange={(event) => setDatePreset(event.target.value as DatePreset)}
        >
          <option value="all">ทุกช่วงเวลา</option>
          <option value="7d">7 วันล่าสุด</option>
          <option value="30d">30 วันล่าสุด</option>
          <option value="90d">90 วันล่าสุด</option>
          <option value="custom">กำหนดเอง</option>
        </select>
      </div>
      <input
        className="h-11 w-full rounded-2xl border border-[#d5e0e3] bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:w-auto sm:min-w-[150px]"
        type="date"
        value={dateFrom}
        onChange={(event) => {
          setDatePreset("custom");
          setDateFrom(event.target.value);
        }}
      />
      <span className="hidden text-sm text-slate-400 xl:inline">-</span>
      <input
        className="h-11 w-full rounded-2xl border border-[#d5e0e3] bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:w-auto sm:min-w-[150px]"
        type="date"
        value={dateTo}
        onChange={(event) => {
          setDatePreset("custom");
          setDateTo(event.target.value);
        }}
      />
    </div>
  );
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  minWidth = 900,
  pageSize,
  rowKey
}: {
  columns: Array<DataColumn<T>>;
  data: T[];
  loading?: boolean;
  minWidth?: number;
  pageSize?: number;
  rowKey: keyof T | ((record: T) => string | number);
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(Math.ceil(data.length / (pageSize ?? (data.length || 1))), 1);
  const rows = pageSize ? data.slice((page - 1) * pageSize, page * pageSize) : data;
  const fillerRowCount = !loading && pageSize && rows.length > 0 ? Math.max(pageSize - rows.length, 0) : 0;

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [data.length, pageSize]);

  const getKey = (record: T) => {
    if (typeof rowKey === "function") return rowKey(record);
    return String(record[rowKey]);
  };

  const alignClass = (align?: DataColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9] dark:border-slate-800 dark:bg-slate-900">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400",
                    alignClass(column.align)
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={columns.length}>
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={columns.length}>
                  ไม่มีข้อมูล
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((record) => (
                <tr
                  key={getKey(record)}
                  className="border-b border-[#edf1f2] transition-colors hover:bg-[#f3faf8] dark:border-slate-800 dark:hover:bg-slate-900/70"
                >
                  {columns.map((column) => {
                    const rawValue = column.dataIndex ? record[column.dataIndex] : undefined;
                    return (
                      <td
                        key={column.key}
                        className={cn("px-3 py-2.5 align-middle text-slate-800 dark:text-slate-200", alignClass(column.align))}
                      >
                        {column.render ? column.render(rawValue as never, record) : String(rawValue ?? "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            {Array.from({ length: fillerRowCount }).map((_, index) => (
              <tr
                key={`filler-${index}`}
                aria-hidden="true"
                className="border-b border-[#edf1f2] dark:border-slate-800"
              >
                {columns.map((column) => (
                  <td key={`${column.key}-filler-${index}`} className="px-3 py-2.5">
                    <div className="h-[45px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && data.length > pageSize && (
        <ShadcnPagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={data.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

function ShadcnTabs({
  items
}: {
  items: Array<{
    key: string;
    label: string;
    content: ReactNode;
  }>;
}) {
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? "");
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1 rounded-md border border-[#d9e3e6] bg-white p-1 shadow-sm">
        {items.map((item) => (
          <button
            key={item.key}
            className={cn(
              "flex-1 rounded px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 sm:flex-none",
              activeKey === item.key && "bg-slate-100 text-slate-950"
            )}
            onClick={() => setActiveKey(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem?.content}
    </div>
  );
}

function ShadcnPagination({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
  totalPages
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const start = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pages = buildPaginationItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-2 border-t border-[#d9e3e6] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        แสดง {formatNumber(start)}-{formatNumber(end)} จาก {formatNumber(totalItems)} รายการ
      </div>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            />
          </PaginationItem>
          {pages.map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {typeof page === "number" ? (
                <PaginationLink
                  className={cn(index > 2 && "hidden sm:inline-flex")}
                  isActive={currentPage === page}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </PaginationLink>
              ) : (
                <PaginationEllipsis className="hidden sm:flex" />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function DealerPicker({
  dealers,
  includeAll = false,
  selectedDealerId,
  setSelectedDealerId,
  title
}: {
  dealers: Dealer[];
  includeAll?: boolean;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedDealer = selectedDealerId == null ? null : dealers.find((dealer) => dealer.dealer_id === selectedDealerId) ?? dealers[0] ?? null;
  const filteredDealers = useMemo(() => {
    const searchValue = normalizeSearch(query);
    if (!searchValue) return dealers;

    return dealers.filter((dealer) => {
      const haystack = normalizeSearch(`${dealer.dealer_id} ${dealer.dealer_code} ${dealer.dealer_name}`);
      return haystack.includes(searchValue);
    });
  }, [dealers, query]);

  const closePicker = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePicker();
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, open]);

  useEffect(() => {
    if (!open) return;

    const timerId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [open]);

  return (
    <Card className="dashboard-card">
      <CardContent className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <div>
          <CardTitle className="text-[15px] lg:text-base">{title}</CardTitle>
          <p className="mt-0.5 text-[10px] font-medium leading-4 text-slate-500">
            {includeAll ? "เลือกทุก dealer หรือเจาะราย dealer เพื่อเปรียบเทียบข้อมูล" : "เลือก dealer หนึ่งรายเพื่อเรียก endpoint รายละเอียดของ dealer นั้น"}
          </p>
        </div>
        <div className="relative" ref={wrapperRef}>
          <button
            type="button"
            className="flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-2xl border border-[#d5e0e3] bg-white px-3 py-1.5 text-left text-sm text-slate-800 shadow-sm outline-none transition-colors hover:border-[#bfd0d4] focus:border-[#16706f] focus:ring-2 focus:ring-[#16706f]/15"
            onClick={() => {
              if (open) {
                closePicker();
                return;
              }

              setOpen(true);
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="min-w-0">
              {selectedDealer ? (
                <span className="block">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-sky-100">
                      ID {selectedDealer.dealer_id}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                      {selectedDealer.dealer_code}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-slate-900">
                    {selectedDealer.dealer_name}
                  </span>
                </span>
              ) : (
                <span className="block">
                  <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100">
                    ALL
                  </span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-slate-900">
                    {includeAll ? "ทุก Dealer" : "เลือก Dealer"}
                  </span>
                </span>
              )}
            </span>
            <ChevronDown
              size={18}
              className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180 text-[#16706f]")}
            />
          </button>

          {open ? (
            <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#d5e0e3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
              <div className="border-b border-slate-100 p-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-[#d5e0e3] bg-white px-3">
                  <Search size={16} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาด้วย ID, code หรือชื่อ dealer"
                    className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-[22rem] overflow-y-auto p-2">
                {includeAll ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedDealerId == null}
                    className={cn(
                      "mb-1 grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      selectedDealerId == null ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => {
                      setSelectedDealerId(null);
                      setOpen(false);
                    }}
                  >
                    <span className="flex h-5 items-center justify-center">
                      {selectedDealerId == null ? <Check size={16} className="text-[#16706f]" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
                        ALL DEALERS
                      </span>
                      <span className={cn(
                        "mt-1 block text-sm font-semibold leading-5",
                        selectedDealerId == null ? "text-[#145c5b]" : "text-slate-800"
                      )}>
                        ดูภาพรวมทุก dealer พร้อมกัน
                      </span>
                    </span>
                  </button>
                ) : null}

                {filteredDealers.length ? filteredDealers.map((dealer) => {
                  const isSelected = dealer.dealer_id === selectedDealer?.dealer_id;

                  return (
                    <button
                      key={dealer.dealer_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        setSelectedDealerId(dealer.dealer_id);
                        setOpen(false);
                      }}
                    >
                      <span className="flex h-5 items-center justify-center">
                        {isSelected ? <Check size={16} className="text-[#16706f]" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                            isSelected ? "bg-white/80 text-sky-700 ring-sky-100" : "bg-sky-50 text-sky-700 ring-sky-100"
                          )}>
                            ID {dealer.dealer_id}
                          </span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                            isSelected ? "bg-white/80 text-emerald-700 ring-emerald-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          )}>
                            {dealer.dealer_code}
                          </span>
                        </span>
                        <span className={cn(
                          "mt-1 block line-clamp-2 text-sm font-semibold leading-5",
                          isSelected ? "text-[#145c5b]" : "text-slate-800"
                        )}>
                          {dealer.dealer_name}
                        </span>
                      </span>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                    ไม่พบ dealer ที่ตรงกับ &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterBar({
  region,
  regions,
  search,
  setRegion,
  setSearch,
  setStatus,
  status
}: {
  region: string;
  regions: string[];
  search: string;
  setRegion: (value: string) => void;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_150px]">
      <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        <Search size={15} className="shrink-0 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          placeholder="ค้นหา dealer / จังหวัด"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <select
        className="h-9 w-full rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={region}
        onChange={(event) => setRegion(event.target.value)}
      >
        <option value="all">ทุกภูมิภาค</option>
        {regions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        className="h-9 w-full rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:col-span-2 xl:col-span-1"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="all">ทุกสถานะ</option>
        <option value="active">Active</option>
        <option value="idle">Idle</option>
        <option value="new">New</option>
      </select>
    </div>
  );
}

function TopCustomersFilter({
  className,
  label,
  onChange,
  options,
  searchPlaceholder = "ค้นหา",
  searchable = false,
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  searchPlaceholder?: string;
  searchable?: boolean;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const filteredOptions = useMemo(() => {
    if (!searchable) return options;

    const searchValue = normalizeSearch(query);
    if (!searchValue) return options;

    return options.filter((option) => normalizeSearch(`${option.label} ${option.value}`).includes(searchValue));
  }, [options, query, searchable]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!searchable || !open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, open, searchable]);

  useEffect(() => {
    if (!searchable || !open) return;

    const timerId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [open, searchable]);

  if (searchable) {
    return (
      <div className={cn("block space-y-1.5", className)} ref={wrapperRef}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="relative">
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-[#d5e0e3] bg-white px-3 text-left text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors hover:border-[#bfd0d4] focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            onClick={() => {
              if (open) {
                closeDropdown();
                return;
              }

              setOpen(true);
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="truncate">{selectedOption?.label ?? "เลือกข้อมูล"}</span>
            <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          </button>

          {open ? (
            <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-[#d5e0e3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
              <div className="border-b border-slate-100 p-2.5">
                <div className="flex items-center gap-2 rounded-lg border border-[#d5e0e3] bg-white px-3">
                  <Search size={15} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-[20rem] overflow-y-auto p-2">
                {filteredOptions.length ? filteredOptions.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <button
                      key={`${label}-${option.value}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        isSelected ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        onChange(option.value);
                        closeDropdown();
                      }}
                    >
                      <span className="flex h-5 items-center justify-center">
                        {isSelected ? <Check size={16} className="text-[#16706f]" /> : null}
                      </span>
                      <span className="truncate font-medium">{option.label}</span>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                    ไม่พบข้อมูลที่ตรงกับ &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <label className={cn("block space-y-1.5", className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <select
        className="h-10 w-full rounded-lg border border-[#d5e0e3] bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function dealerColumn<T extends Dealer>(onOpen?: (dealer: T) => void): DataColumn<T> {
  return {
    title: "Dealer",
    dataIndex: "dealer_name",
    key: "dealer_name",
    width: 300,
    render: (_, record) => (
      <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onOpen?.(record)} type="button">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {record.dealer_name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-950">{record.dealer_name}</div>
          <div className="text-xs font-medium text-slate-500">{record.dealer_code}</div>
        </div>
      </button>
    )
  };
}

function statusColumn<T extends { status?: unknown }>(): DataColumn<T> {
  return {
    title: "สถานะ",
    dataIndex: "status",
    key: "status",
    width: 120,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold",
          getDealerStatusKey(value) === "active" && "bg-emerald-100 text-emerald-700",
          getDealerStatusKey(value) === "idle" && "bg-amber-100 text-amber-700",
          getDealerStatusKey(value) === "new" && "bg-sky-100 text-sky-700"
        )}
      >
        {statusText(value)}
      </span>
    )
  };
}

function regionPill(value: string) {
  return <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{value}</span>;
}

function VolumeCell({ max, unit, value }: { max: number; unit: string; value: number }) {
  return (
    <div>
      <div className="font-semibold text-slate-950">
        {formatNumber(value)} {unit}
      </div>
      <TinyProgress percent={Math.round((value / max) * 100)} />
    </div>
  );
}

function VerticalBarChart({
  data,
  onHover,
  unit
}: {
  data: Array<{ active?: boolean; label: string; value: number }>;
  onHover?: (label: string) => void;
  unit?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const palette = ["#0f766e", "#2563eb", "#f59e0b", "#14b8a6", "#6366f1", "#f97316", "#22c55e"];

  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-[190px]">
      <div className="flex h-[158px] items-end gap-2.5 border-b border-[#d9e3e6] px-1">
        {data.map((item) => (
          <button
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            onClick={() => onHover?.(item.label)}
            onMouseEnter={() => onHover?.(item.label)}
            type="button"
          >
            <div className="text-xs font-semibold text-slate-700">{compactNumber(item.value)}{unit ? ` ${unit}` : ""}</div>
            <div className={cn("flex h-[116px] w-full items-end rounded-xl bg-slate-100 transition-all", item.active && "ring-2 ring-slate-300")}>
              <div
                className="w-full rounded-xl transition-all"
                style={{
                  height: `${Math.max((item.value / max) * 100, 4)}%`,
                  backgroundColor: palette[data.indexOf(item) % palette.length]
                }}
              />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}>
        {data.map((item) => (
          <div key={item.label} className="truncate text-center text-xs font-semibold text-slate-500">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionVolumeExplorer({ regionRows }: { regionRows: ReturnType<typeof groupByRegion> }) {
  const [activeRegion, setActiveRegion] = useState(regionRows[0]?.region ?? "");
  const activeItem = regionRows.find((item) => item.region === activeRegion) ?? regionRows[0];

  useEffect(() => {
    if (!regionRows.length) return;
    if (!regionRows.some((item) => item.region === activeRegion)) {
      const resetId = window.setTimeout(() => {
        setActiveRegion(regionRows[0].region);
      }, 0);
      return () => window.clearTimeout(resetId);
    }
    return undefined;
  }, [activeRegion, regionRows]);

  if (!regionRows.length) return <EmptyChart />;

  return (
    <div className="space-y-5">
      <VerticalBarChart
        data={regionRows.map((row) => ({
          label: row.region,
          value: row.volume,
          active: row.region === activeItem?.region
        }))}
        unit="m3"
        onHover={setActiveRegion}
      />

      {activeItem && (
        <div className="grid gap-3 rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfd] p-4 dark:border-slate-800 dark:bg-slate-950/70 lg:grid-cols-[minmax(0,1fr)_140px_140px_140px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Region</p>
            <h4 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{activeItem.region}</h4>
            <p className="mt-1 text-sm text-slate-500">ชี้ที่แท่งกราฟเพื่อดูจำนวน dealer, groups และ volume ของแต่ละภูมิภาค</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Volume</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{compactNumber(activeItem.volume)} m3</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Dealers</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatNumber(activeItem.dealers)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Groups</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatNumber(activeItem.groups)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DualBarChart({
  data,
  primaryLabel,
  secondaryLabel
}: {
  data: Array<{ label: string; primary: number; secondary: number }>;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const max = Math.max(...data.flatMap((item) => [item.primary, item.secondary]), 1);

  if (!data.length) return <EmptyChart />;
  const primaryColor = "#0f766e";
  const secondaryColor = "#2563eb";

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />{primaryLabel}</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />{secondaryLabel}</span>
      </div>
      {data.map((item) => (
        <div key={item.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 font-semibold text-slate-950">{formatNumber(item.primary)} / {formatNumber(item.secondary)}</span>
          </div>
          <div className="grid gap-1">
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((item.primary / max) * 100, 2)}%`, backgroundColor: primaryColor }} />
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((item.secondary / max) * 100, 2)}%`, backgroundColor: secondaryColor }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupDeliveredBookedComparison({
  data,
  primaryLabel,
  secondaryLabel
}: {
  data: Array<{ label: string; primary: number; secondary: number; unit?: string }>;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const max = Math.max(...data.flatMap((item) => [item.primary, item.secondary]), 1);

  if (!data.length) return <EmptyChart />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-semibold text-slate-500">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
            <i className="h-2.5 w-2.5 rounded-full bg-[#0f766e]" />
            {primaryLabel}
          </span>
          <span className="flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700">
            <i className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
            {secondaryLabel}
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          {formatNumber(data.length)} groups
        </span>
      </div>

      <div className="rounded-[22px] border border-[#e5e7eb] bg-[#fbfcfd] p-2 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="max-h-[31rem] space-y-2.5 overflow-y-auto pr-1 delivered-booked-scroll">
        {data.map((item) => {
          const total = item.primary + item.secondary;
          const deliveredPercent = total ? Math.round((item.primary / total) * 100) : 0;
          const bookedPercent = total ? Math.round((item.secondary / total) * 100) : 0;
          const delta = item.primary - item.secondary;
          const leadLabel =
            delta === 0
              ? "Balanced"
              : delta > 0
                ? `${primaryLabel} leads`
                : `${secondaryLabel} leads`;

          return (
            <div
              key={item.label}
              className="rounded-[20px] border border-[#e5e7eb] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
            >
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">{item.label}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600">
                      Total {formatNumber(total)} {item.unit ?? "m3"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5",
                        delta === 0 && "bg-slate-100 text-slate-600",
                        delta > 0 && "bg-emerald-50 text-emerald-700",
                        delta < 0 && "bg-blue-50 text-blue-700"
                      )}
                    >
                      {leadLabel}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 lg:min-w-[230px]">
                  <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      {primaryLabel}
                    </div>
                    <div className="mt-1 text-[1.65rem] leading-none font-semibold text-slate-950">
                      {formatNumber(item.primary)}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-emerald-700/80">
                      {deliveredPercent}% of pair
                    </div>
                  </div>
                  <div className="rounded-[18px] border border-blue-100 bg-blue-50/70 p-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                      {secondaryLabel}
                    </div>
                    <div className="mt-1 text-[1.65rem] leading-none font-semibold text-slate-950">
                      {formatNumber(item.secondary)}
                    </div>
                    <div className="mt-1 text-[11px] font-medium text-blue-700/80">
                      {bookedPercent}% of pair
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2.5">
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
                    <span>{primaryLabel}</span>
                    <span>
                      {formatNumber(item.primary)} {item.unit ?? "m3"}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-[#0f766e]"
                      style={{ width: `${Math.max((item.primary / max) * 100, 4)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
                    <span>{secondaryLabel}</span>
                    <span>
                      {formatNumber(item.secondary)} {item.unit ?? "m3"}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-[#2563eb]"
                      style={{ width: `${Math.max((item.secondary / max) * 100, 4)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}

function FunnelBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">{row.label}</span>
            <span className="font-semibold text-slate-950">{formatNumber(row.value)}</span>
          </div>
          <div className="h-8 rounded-md bg-slate-100 p-1">
            <div
              className="flex h-full items-center rounded-md px-3 text-xs font-semibold text-white"
              style={{
                width: `${Math.max((row.value / max) * (100 - index * 8), 10)}%`,
                backgroundColor: index === 0 ? "#0f766e" : index === 1 ? "#2563eb" : "#f59e0b"
              }}
            >
              {Math.round((row.value / max) * 100)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressList({ rows }: { rows: Array<{ label: string; total: number; unit: string; value: number }> }) {
  if (!rows.length) return <EmptyChart />;

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const percent = row.total ? Math.min(Math.round((row.value / row.total) * 100), 100) : 0;
        return (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-700">{row.label}</span>
              <span className="shrink-0 font-semibold text-slate-950">{percent}%</span>
            </div>
            <TinyProgress percent={percent} />
            <div className="text-xs font-medium text-slate-500">
              {formatNumber(row.value)} / {formatNumber(row.total)} {row.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TinyProgress({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#edf2f4]">
      <div className="h-full rounded-full bg-[#0f766e] dark:bg-[#5eead4]" style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
      ไม่มีข้อมูลสำหรับแสดงกราฟ
    </div>
  );
}

type MetricCardProps = {
  compact?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "teal" | "green" | "amber" | "rose";
};

function MetricCard({ compact = false, icon, label, value, detail, tone = "teal" }: MetricCardProps) {
  const tones = {
    teal: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    },
    green: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    },
    amber: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
    },
    rose: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
    }
  };
  const toneClass = tones[tone];

  return (
    <Card className={cn("metric-card", toneClass.card)}>
      <CardContent className={cn(compact ? "p-2.5" : "p-3.5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("font-semibold text-slate-500", compact ? "text-[11px]" : "text-xs")}>{label}</p>
            <p className={cn("truncate font-semibold leading-none tracking-normal text-slate-950", compact ? "mt-1 text-[20px]" : "mt-1.5 text-[24px]")}>{value}</p>
          </div>
          <div className={cn("flex shrink-0 items-center justify-center rounded-lg shadow-sm", compact ? "h-8 w-8" : "h-9 w-9", toneClass.icon)}>{icon}</div>
        </div>
        <p className={cn("truncate font-medium text-slate-500", compact ? "mt-2 text-[11px]" : "mt-3 text-xs")}>{detail}</p>
      </CardContent>
    </Card>
  );
}
