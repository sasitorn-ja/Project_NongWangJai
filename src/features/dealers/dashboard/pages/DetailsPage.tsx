import { useMemo, useState } from "react";
import { BarChart3, ChevronDown, Clock3, Layers3, MapPin, PackageCheck, Search, User, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, CustomerUsage, Dealer, DealerGroup, DealerSite, DealerUsage, OrderItem } from "@/features/dealers/types";
import { dateText, parseDateValue } from "../lib/dates";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
import { DealerPicker } from "../filters/DealerPicker";
import { ShadcnTabs } from "../ui/ShadcnTabs";
import { DataTable } from "../table/DataTable";
import { DualBarChart } from "../charts/DualBarChart";
import { GroupVolumeInsights } from "../charts/GroupVolumeInsights";
import { ProgressList } from "../charts/ProgressList";
import { statusColumn } from "../table/columns";

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
  const segmentTotal = compactRows.reduce((sum, row) => sum + Math.max(row.delivered, row.ordered), 0) || 1;
  const palette = ["#0f766e", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed", "#14b8a6", "#f97316", "#64748b", "#94a3b8"];

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
      <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-center">
        <div className="rounded-lg border border-[#e5e7eb] bg-[#fbfcfd] px-3 py-2">
          <div className="text-xs font-semibold text-slate-500">Delivered / Ordered</div>
          <div className="mt-1 text-lg font-bold text-slate-950">
            {compactNumber(totalDelivered)} / {compactNumber(totalOrdered)} {unit}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            {formatNumber(rows.length)} พื้นที่ทั้งหมด
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex h-8 overflow-hidden rounded-lg bg-slate-100">
            {compactRows.map((row, index) => {
              const value = Math.max(row.delivered, row.ordered);
              return (
                <div
                  key={row.key}
                  className="min-w-[3px] border-r border-white/70 last:border-r-0"
                  style={{
                    backgroundColor: palette[index % palette.length],
                    width: `${Math.max((value / segmentTotal) * 100, value > 0 ? 3 : 0)}%`
                  }}
                  title={`${row.label}: ${formatNumber(row.delivered)} delivered / ${formatNumber(row.ordered)} ordered`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {compactRows.slice(0, 6).map((row, index) => (
              <span key={row.key} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <i className="h-2 w-2 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} />
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
                      style={{ backgroundColor: palette[index % palette.length] }}
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
                  <div className="text-sm font-bold text-slate-950">
                    {compactNumber(Math.max(row.delivered, row.ordered))} {unit}
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
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-[#0f766e]"
                    style={{ width: `${Math.max((row.delivered / max) * 100, row.delivered > 0 ? 2 : 0)}%` }}
                  />
                </div>
                {hasOrdered ? (
                  <div className="h-2.5 rounded-full bg-slate-100">
                    <div
                      className="h-2.5 rounded-full bg-[#2563eb]"
                      style={{ width: `${Math.max((row.ordered / max) * 100, row.ordered > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-xs font-medium text-slate-500">
                <span>Delivered {formatNumber(row.delivered)} {unit}</span>
                {hasOrdered ? <span>Ordered {formatNumber(row.ordered)} {unit}</span> : null}
              </div>

              {expanded && row.children ? (
                <div className="mt-3 rounded-md border border-dashed border-[#d9e3e6] bg-[#f8fafb] p-2">
                  <div className="grid grid-cols-[1fr_60px_70px_70px] gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    <span>จังหวัด</span>
                    <span className="text-right">Sites</span>
                    <span className="text-right">Delivered</span>
                    <span className="text-right">Ordered</span>
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
      const key = site.province_bluned_id || site.province_id?.toString() || label;
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
      current.detail = `${formatNumber(current.count)} sites`;
      provinceMap.set(key, current);
    });

    return [...provinceMap.values()].sort((a, b) => b.delivered - a.delivered || b.ordered - a.ordered || a.label.localeCompare(b.label, "th"));
  }, [props.selectedDealer?.unit, props.sites]);

  const dealerAreaRows = useMemo<AreaRow[]>(() => {
    const areaMap = new Map<string, AreaRow & { provinces: Set<string> }>();

    props.filteredDealers.forEach((dealer) => {
      const label = dealer.region || "ไม่ระบุภูมิภาค";
      const current = areaMap.get(label) ?? {
        count: 0,
        delivered: 0,
        detail: "",
        key: label,
        label,
        ordered: 0,
        provinces: new Set<string>(),
        unit: dealer.unit || "m3"
      };

      current.count += 1;
      current.delivered += dealer.volume;
      if (dealer.province) current.provinces.add(dealer.province);
      current.detail = `${formatNumber(current.count)} dealers | ${formatNumber(current.provinces.size)} provinces`;
      areaMap.set(label, current);
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
  }, [props.filteredDealers]);

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
      const key = `${customerCode}::${customerName}`;
      const current =
        acc.get(key) ?? {
          customerCode,
          customerName,
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

      const candidateDate = parseDateValue(row.pour_datetime ?? row.updated_at ?? row.created_at);
      const currentDate = parseDateValue(current.latestPour);
      if (candidateDate && (!currentDate || candidateDate > currentDate)) {
        current.latestPour = row.pour_datetime ?? row.updated_at ?? row.created_at ?? null;
      }

      current.siteCount = current.uniqueSites.size;
      acc.set(key, current);
      return acc;
    }, new Map());

    return [...rows.values()].sort((a, b) => b.delivered - a.delivered);
  }, [dealerOrders]);

  const orderSiteRows = useMemo(() => {
    const rows = dealerOrders.reduce<
      Map<
        string,
        {
          customerName: string;
          delivered: number;
          key: string;
          latestPour: string | null;
          ordered: number;
          siteCode: string;
          siteName: string;
        }
      >
    >((acc, row) => {
      const siteCode = row.site?.site_code?.trim() || row.site?.site_id?.toString() || "-";
      const siteName = row.site?.site_name?.trim() || "ไม่ระบุไซต์";
      const key = `${siteCode}::${siteName}`;
      const current =
        acc.get(key) ?? {
          customerName: row.customer?.name?.trim() || "ไม่ระบุลูกค้า",
          delivered: 0,
          key,
          latestPour: null,
          ordered: 0,
          siteCode,
          siteName
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

    return [...rows.values()].sort((a, b) => b.delivered - a.delivered);
  }, [dealerOrders]);

  const isAllDealers = props.selectedDealerId == null;
  const areaRows = isAllDealers ? dealerAreaRows : siteProvinceRows;
  const areaUnit = props.selectedDealer?.unit ?? areaRows.find((row) => row.unit)?.unit ?? props.filteredDealers.find((dealer) => dealer.unit)?.unit ?? "m3";
  const totalAreaDelivered = areaRows.reduce((sum, row) => sum + row.delivered, 0);
  const totalGroups = isAllDealers ? props.filteredDealers.reduce((sum, dealer) => sum + dealer.group_count, 0) : props.groups.length;
  const totalDelivered = props.groups.reduce((sum, group) => sum + group.delivered_volume, 0);
  const totalBooked = props.groups.reduce((sum, group) => sum + group.booked_volume, 0);
  const topGroups = useMemo(
    () =>
      [...props.groups]
        .sort((a, b) => Math.max(b.delivered_volume, b.booked_volume) - Math.max(a.delivered_volume, a.booked_volume))
        .slice(0, 10),
    [props.groups]
  );
  const topDealerVolume = useMemo(() => [...props.filteredDealers].sort((a, b) => b.volume - a.volume).slice(0, 8), [props.filteredDealers]);
  const maxDealerVolume = Math.max(...topDealerVolume.map((dealer) => dealer.volume), 1);

  const customerColumns: DataColumn<(typeof orderCustomerRows)[number]>[] = [
    { title: "Customer", key: "customer", sortAccessor: (record) => record.customerName, width: 300, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.customerName}</div><div className="text-xs font-medium text-slate-500">{record.customerCode}</div></div> },
    { title: "Sites", key: "siteCount", dataIndex: "siteCount", align: "right", width: 110, render: formatNumber },
    { title: "Orders", key: "orderCount", dataIndex: "orderCount", align: "right", width: 110, render: formatNumber },
    { title: "Ordered", key: "ordered", dataIndex: "ordered", align: "right", width: 140, render: formatNumber },
    { title: "Delivered", key: "delivered", dataIndex: "delivered", align: "right", width: 140, render: formatNumber },
    { title: "Pour ล่าสุด", key: "latestPour", dataIndex: "latestPour", width: 190, render: dateText }
  ];

  const siteColumns: DataColumn<(typeof orderSiteRows)[number]>[] = [
    { title: "Site", key: "site", sortAccessor: (record) => record.siteName, width: 300, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.siteName}</div><div className="text-xs font-medium text-slate-500">{record.siteCode}</div></div> },
    { title: "Customer", key: "customerName", dataIndex: "customerName", width: 240 },
    { title: "Ordered", key: "ordered", dataIndex: "ordered", align: "right", width: 140, render: formatNumber },
    { title: "Delivered", key: "delivered", dataIndex: "delivered", align: "right", width: 140, render: formatNumber },
    { title: "Pour ล่าสุด", key: "latestPour", dataIndex: "latestPour", width: 190, render: dateText }
  ];

  const groupColumns: DataColumn<DealerGroup>[] = [
    { title: "Group", dataIndex: "group_name", key: "group_name", width: 320, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.group_name}</div><div className="text-xs font-medium text-slate-500">ID: {record.group_id} | Type: {record.group_type ?? "-"}</div></div> },
    { title: "ส่งจริง", dataIndex: "delivered_volume", key: "delivered_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "จอง", dataIndex: "booked_volume", key: "booked_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "เช็คราคา", dataIndex: "price_check_count", key: "price_check_count", align: "right", width: 130, render: formatNumber },
    { title: "จองคิว", dataIndex: "booking_count", key: "booking_count", align: "right", width: 130, render: formatNumber },
    { title: "วันที่สร้าง", dataIndex: "created_at", key: "created_at", width: 190, render: dateText },
    statusColumn<DealerGroup>()
  ];

  return (
    <>
      <DealerPicker
        dealers={props.dealers}
        includeAll
        selectedDealerId={props.selectedDealerId}
        setSelectedDealerId={props.setSelectedDealerId}
        title="เลือก Dealer เพื่อวิเคราะห์"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<PackageCheck size={18} />} label="Volume" value={`${compactNumber(totalAreaDelivered)} ${areaUnit}`} detail={isAllDealers ? "รวมทุก dealer ที่กรองอยู่" : props.selectedDealer?.dealer_name ?? "-"} />
        <MetricCard icon={<Layers3 size={18} />} label="Groups" value={formatNumber(totalGroups)} detail={isAllDealers ? "จำนวนกลุ่มรวมจาก dealer list" : "จำนวนกลุ่มของ dealer ที่เลือก"} tone="rose" />
        <MetricCard icon={<Search size={18} />} label="Price Checks" value={formatNumber(usageSummary.priceConcreteCount)} detail="จำนวนครั้งที่เช็คราคา" />
        <MetricCard icon={<Users size={18} />} label="Customers" value={formatNumber(orderCustomerRows.length || usageSummary.customerCreateCount)} detail="ลูกค้าที่พบใน orders ที่กรองอยู่" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin size={18} />
              ปริมาณการขายแยกตามพื้นที่
            </CardTitle>
            <p className="text-xs font-medium text-slate-500">
              {isAllDealers ? "ค่าเริ่มต้นคือทุก Dealer และรวมตามภูมิภาค" : "เมื่อเลือก Dealer แล้ว กราฟจะแยกตามจังหวัดของไซต์ที่ขาย"}
            </p>
          </CardHeader>
          <CardContent>
            <SalesAreaChart loading={!isAllDealers && props.sitesState === "loading"} rows={areaRows} unit={areaUnit} />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">{isAllDealers ? "Top Dealer Volume" : "Usage Summary"}</CardTitle>
            <p className="text-xs font-medium text-slate-500">
              {isAllDealers ? "Dealer ที่มี volume สูงสุดใน filter ปัจจุบัน" : `${props.selectedDealer?.dealer_name ?? "-"} | Updated: ${dateText(usageSummary.updatedAt)}`}
            </p>
          </CardHeader>
          <CardContent>
            {isAllDealers ? (
              <ProgressList
                rows={topDealerVolume.map((dealer) => ({
                  label: dealer.dealer_name,
                  total: maxDealerVolume,
                  unit: dealer.unit || areaUnit,
                  value: dealer.volume
                }))}
              />
            ) : (
              <div className="grid gap-3">
                <MetricCard icon={<Clock3 size={18} />} label="Bookings" value={formatNumber(usageSummary.bookingCreateCount)} detail="จำนวนครั้งที่สร้างจองคิว" tone="amber" />
                <MetricCard icon={<User size={18} />} label="Sites" value={formatNumber(props.sites.length)} detail="ไซต์ของ dealer ที่เลือก" tone="green" />
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 size={18} />
              {isAllDealers ? "Customer Insight" : "Group Volume"}
            </CardTitle>
            <p className="text-xs font-medium text-slate-500">
              {isAllDealers ? "Top customers จาก orders ทั้งหมดที่กรองอยู่" : "Delivered เทียบกับ Booked ของกลุ่มใน dealer ที่เลือก"}
            </p>
          </CardHeader>
          <CardContent>
            {isAllDealers ? (
              <DualBarChart
                data={orderCustomerRows.slice(0, 8).map((customer) => ({
                  label: customer.customerName,
                  primary: customer.delivered,
                  secondary: customer.ordered
                }))}
                primaryLabel="Delivered"
                secondaryLabel="Ordered"
              />
            ) : (
              <GroupVolumeInsights groups={topGroups} totalBooked={totalBooked} totalDelivered={totalDelivered} totalGroups={props.groups.length} unit={areaUnit} />
            )}
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Site Delivery Progress</CardTitle>
            <p className="text-xs font-medium text-slate-500">ไซต์ที่มี delivered สูงสุดจาก orders ที่กรองอยู่</p>
          </CardHeader>
          <CardContent>
            <ProgressList
              rows={orderSiteRows.slice(0, 8).map((site) => ({
                label: site.siteName,
                total: Math.max(site.ordered, site.delivered),
                unit: areaUnit,
                value: site.delivered
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <ShadcnTabs
        items={[
          {
            key: "customers",
            label: "Customers",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardContent className="p-0">
                  <DataTable columns={customerColumns} data={orderCustomerRows} loading={props.ordersState === "loading"} rowKey="key" minWidth={1040} pageSize={10} />
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
                  <DataTable columns={siteColumns} data={orderSiteRows} loading={props.ordersState === "loading"} rowKey="key" minWidth={1080} pageSize={10} />
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
