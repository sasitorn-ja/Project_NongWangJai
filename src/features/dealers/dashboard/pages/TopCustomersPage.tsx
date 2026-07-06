import { useMemo, useState } from "react";
import { Database, PackageCheck, Users, X, Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import { useDashboardOutletContext } from "../DealerDashboardApp";
import { dateText, getMonthKey, getMonthLabel } from "../lib/dates";
import { getOrderStatusKey, orderStatusText } from "../lib/status";
import { FIXED_DIVISIONS } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
import { DataTable } from "../table/DataTable";
import { TopCustomersFilter } from "../filters/TopCustomersFilter";
import { WangjaiAdvisor } from "../ui/WangjaiAdvisor";
import { ShadcnPagination } from "../table/DataTable";
import type { OrderItem } from "@/features/dealers/types";

type EnrichedOrderItem = OrderItem & {
  customerCode: string;
  customerName: string;
  delivered: number;
  monthKey: string;
  ordered: number;
  provinceName: string;
  region: string;
  siteKey: string;
};

function getPourDateText(order: EnrichedOrderItem) {
  if (getOrderStatusKey(order.status?.order) === "cancelled") return null;
  return order.pour_datetime ?? null;
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

export function TopCustomersPage() {
  const { data } = useDashboardOutletContext();
  const { dealers, ordersInDateRange: orders, ordersState } = data;
  const [division, setDivision] = useState("all");
  const [province, setProvince] = useState("all");
  const [month, setMonth] = useState("all");
  const [year, setYear] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [topN, setTopN] = useState(5);
  const [selectedDealerRow, setSelectedDealerRow] = useState<{
    countSite: number;
    customerCode: string;
    customerName: string;
    delivered: number;
    ordered: number;
    fullLoopDelivered: number;
    notFullLoopDelivered: number;
    sites: Set<string>;
    orders: EnrichedOrderItem[];
  } | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalPage, setModalPage] = useState(1);

  const dealerMap = useMemo(() => new Map(dealers.map((dealer) => [dealer.dealer_id, dealer])), [dealers]);

  const enrichedOrders = useMemo(
    () =>
      orders.map((order) => {
        const dealer = dealerMap.get(order.dealer_id);
        const region = dealer?.region ?? "-";
        const provinceName = dealer?.province ?? "-";
        const monthKey = getMonthKey(order.pour_datetime);
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
  const volumeUnit = "คิว";

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
          fullLoopDelivered: number;
          notFullLoopDelivered: number;
          sites: Set<string>;
          orders: typeof filteredOrders;
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
          fullLoopDelivered: 0,
          notFullLoopDelivered: 0,
          sites: new Set<string>(),
          orders: []
        };

      current.delivered += order.delivered;
      current.ordered += order.ordered;
      if (order.full_loop) {
        current.fullLoopDelivered += order.delivered;
      } else {
        current.notFullLoopDelivered += order.delivered;
      }
      if (order.siteKey) current.sites.add(order.siteKey);
      current.countSite = current.sites.size;
      current.orders.push(order);
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
          fullLoopVolume: number;
          notFullLoopVolume: number;
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
          fullLoopVolume: 0,
          notFullLoopVolume: 0,
          customerMap: new Map()
        };

      current.delivered += order.delivered;
      current.ordered += order.ordered;
      if (order.full_loop) {
        current.fullLoopVolume += order.delivered;
      } else {
        current.notFullLoopVolume += order.delivered;
      }

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
        delivered: row.delivered,
        monthKey: row.monthKey,
        monthLabel: getMonthLabel(row.monthKey),
        ordered: row.ordered,
        fullLoopVolume: row.fullLoopVolume,
        notFullLoopVolume: row.notFullLoopVolume,
        topCustomers: Array.from(row.customerMap.values())
          .sort((a, b) => b.delivered - a.delivered)
          .slice(0, topN)
      }));
  }, [filteredOrders, topN]);

  const totalVolume = filteredOrders.reduce((sum, order) => sum + order.delivered, 0);
  const fullLoopVolume = filteredOrders.filter((order) => order.full_loop).reduce((sum, order) => sum + order.delivered, 0);
  const notFullLoopVolume = filteredOrders.filter((order) => !order.full_loop).reduce((sum, order) => sum + order.delivered, 0);
  const totalSites = new Set(filteredOrders.map((order) => order.siteKey).filter(Boolean)).size;
  const totalCustomers = customerRows.length;
  const topDealer = customerRows[0];

  const customerColumns: DataColumn<(typeof customerRows)[number]>[] = [
    {
      title: "Dealer name",
      key: "customerName",
      dataIndex: "customerName",
      width: 250,
      render: (_, record) => (
        <button
          type="button"
          onClick={() => {
            setSelectedDealerRow(record);
            setModalSearch("");
            setModalPage(1);
          }}
          className="min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <div className="truncate text-[13px] font-semibold leading-5 text-blue-600 hover:underline">{record.customerName}</div>
          <div className="truncate text-[11px] font-medium text-slate-500">{record.customerCode}</div>
        </button>
      )
    },
    {
      title: <span className="inline-block pr-3">จำนวน Site</span>,
      key: "countSite",
      dataIndex: "countSite",
      align: "right",
      width: 88,
      render: (value) => <span className="inline-block pr-4">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: <span className="inline-block pr-6">Delivered Volume ({volumeUnit})</span>,
      key: "delivered",
      dataIndex: "delivered",
      align: "right",
      width: 128,
      render: (value) => <span className="inline-block min-w-[2.5rem] pr-6">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: <span className="inline-block pr-4 text-emerald-600">Full Loop ({volumeUnit})</span>,
      key: "fullLoopDelivered",
      dataIndex: "fullLoopDelivered",
      align: "right",
      width: 120,
      render: (value) => <span className="inline-block min-w-[2.5rem] pr-4 text-emerald-700 font-semibold">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: <span className="inline-block pr-4 text-rose-600">ไม่ Full Loop ({volumeUnit})</span>,
      key: "notFullLoopDelivered",
      dataIndex: "notFullLoopDelivered",
      align: "right",
      width: 120,
      render: (value) => <span className="inline-block min-w-[2.5rem] pr-4 text-rose-700 font-semibold">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: "การจัดการ",
      key: "actions",
      width: 100,
      align: "center",
      render: (_, record) => (
        <button
          type="button"
          onClick={() => {
            setSelectedDealerRow(record);
            setModalSearch("");
            setModalPage(1);
          }}
          className="rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
        >
          ดู SO Order
        </button>
      )
    }
  ];

  const monthlyColumns: DataColumn<(typeof monthlyRows)[number]>[] = [
    { title: "Month", key: "month", dataIndex: "monthLabel", sortAccessor: (record) => record.monthKey, width: 120 },
    { title: `Delivered Volume (${volumeUnit})`, key: "delivered", dataIndex: "delivered", align: "right", width: 160, render: formatNumber },
    {
      title: `Full Loop (${volumeUnit})`,
      key: "fullLoopVolume",
      dataIndex: "fullLoopVolume",
      align: "right",
      width: 130,
      render: (value) => <span className="font-semibold text-emerald-700">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: `ไม่ Full Loop (${volumeUnit})`,
      key: "notFullLoopVolume",
      dataIndex: "notFullLoopVolume",
      align: "right",
      width: 130,
      render: (value) => <span className="font-semibold text-rose-700">{formatNumber(Number(value ?? 0))}</span>
    },
    {
      title: "TopN Dealer",
      key: "topCustomers",
      sortable: false,
      render: (_, record) => (
        <div className="space-y-1">
          {record.topCustomers.map((customer, customerIndex) => (
            <div key={`${record.monthKey}-${customer.customerName}-${customerIndex}`} className="line-clamp-2 text-sm text-slate-800">
              {customer.customerName} #{formatNumber(customer.sites.size)} site, {formatNumber(customer.delivered)} {volumeUnit}
            </div>
          ))}
        </div>
      )
    }
  ];

  const modalFilteredOrders = useMemo(() => {
    if (!selectedDealerRow) return [];
    return selectedDealerRow.orders.filter((order: EnrichedOrderItem) => {
      const q = modalSearch.toLowerCase().trim();
      if (!q) return true;
      return (
        order.order?.order_no?.toLowerCase().includes(q) ||
        order.order?.product_sku?.toLowerCase().includes(q) ||
        order.order?.product_name?.toLowerCase().includes(q) ||
        order.site?.site_code?.toLowerCase().includes(q) ||
        order.site?.site_name?.toLowerCase().includes(q)
      );
    });
  }, [selectedDealerRow, modalSearch]);

  const MODAL_PAGE_SIZE = 6;
  const modalTotalPages = Math.max(Math.ceil(modalFilteredOrders.length / MODAL_PAGE_SIZE), 1);
  const modalRows = useMemo(() => {
    return modalFilteredOrders.slice((modalPage - 1) * MODAL_PAGE_SIZE, modalPage * MODAL_PAGE_SIZE);
  }, [modalFilteredOrders, modalPage]);

  return (
    <>
      <Card className="dashboard-card">
        <CardContent className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(260px,1.35fr)_auto]">
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
            />
            <div className="block space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">TopN</div>
              <div className="inline-flex w-fit flex-nowrap items-center gap-1 rounded-lg border border-[#d9e3e6] bg-[#f8fafb] p-1 shadow-inner shadow-slate-100/70">
                {[1, 2, 3, 5, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md border text-[13px] font-semibold shadow-sm transition-all duration-150",
                      topN === value
                        ? "border-blue-600 bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.25)]"
                        : "border-transparent bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    )}
                    onClick={() => setTopN(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <WangjaiAdvisor
        accent="amber"
        compact
        message="ผมจัดอันดับ Dealer จาก Delivered Volume ตามตัวกรองที่เลือก ใช้ TopN เพื่อดูผู้เล่นหลักของแต่ละเดือน"
        stats={[
          { label: "Top Dealer", value: topDealer?.customerName ?? "-" },
          { label: "Full Loop", value: `${compactNumber(fullLoopVolume)} ${volumeUnit}` },
          { label: "ไม่ Full Loop", value: `${compactNumber(notFullLoopVolume)} ${volumeUnit}` },
          { label: "TopN", value: formatNumber(topN) }
        ]}
        title="อันดับ Dealer ที่ควรโฟกัส"
      />

      <section className="grid grid-cols-1">
        <SummaryKpiStrip
          items={[
            {
              detail: "จำนวน dealer ที่อยู่ในผลลัพธ์ปัจจุบัน",
              icon: <Users size={14} />,
              label: "Dealers",
              value: formatNumber(totalCustomers)
            },
            {
              detail: "นับจาก site ที่ไม่ซ้ำในผลลัพธ์ปัจจุบัน",
              icon: <Database size={14} />,
              label: "Sites",
              value: formatNumber(totalSites)
            },
            {
              detail: "ปริมาณส่งจริงรวมจาก orders ที่ถูกกรอง",
              icon: <PackageCheck size={14} />,
              label: "Delivered Volume",
              value: (
                <>
                  {compactNumber(totalVolume)}{" "}
                  <span className="text-xs font-semibold text-slate-400">{volumeUnit}</span>
                </>
              )
            },
            {
              detail: "ปริมาณ Full Loop จาก orders ที่ถูกกรอง",
              icon: <PackageCheck size={14} />,
              label: "Full Loop",
              value: (
                <>
                  {compactNumber(fullLoopVolume)}{" "}
                  <span className="text-xs font-semibold text-slate-400">{volumeUnit}</span>
                </>
              )
            },
            {
              detail: "ปริมาณไม่ Full Loop จาก orders ที่ถูกกรอง",
              icon: <PackageCheck size={14} />,
              label: "ไม่ Full Loop",
              value: (
                <>
                  {compactNumber(notFullLoopVolume)}{" "}
                  <span className="text-xs font-semibold text-slate-400">{volumeUnit}</span>
                </>
              )
            },
            {
              detail: topDealer?.customerName ?? "ยังไม่มีข้อมูล dealer",
              icon: <Users size={14} />,
              label: "Top Dealer",
              value: <span className="text-base font-bold leading-tight">{topDealer?.customerCode ?? "-"}</span>
            }
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,.9fr)]">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Top N Dealers</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุปรายเดือนจาก Delivered Volume พร้อมรายชื่อ Top {topN} dealer ของแต่ละเดือน</p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={monthlyColumns} data={monthlyRows} loading={ordersState === "loading"} rowKey="monthKey" minWidth={720} />
          </CardContent>
        </Card>

        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Dealer Ranking</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุป dealer ตามจำนวน site และ Delivered Volume</p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={customerColumns} data={customerRows} loading={ordersState === "loading"} rowKey={(record) => `${record.customerCode}-${record.customerName}`} minWidth={0} pageSize={15} />
          </CardContent>
        </Card>
      </section>

      {selectedDealerRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-all">
          <div className="flex h-full max-h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-850 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  รายการ SO Order ของ {selectedDealerRow.customerName}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  รหัส Dealer: {selectedDealerRow.customerCode} · ทั้งหมด {formatNumber(selectedDealerRow.orders.length)} ออเดอร์ · ปริมาณคิวส่งจริงรวม {formatNumber(selectedDealerRow.delivered)} {volumeUnit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDealerRow(null)}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-800 dark:hover:bg-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Toolbar */}
            <div className="border-b border-slate-100 px-6 py-3 bg-white dark:border-slate-800 dark:bg-slate-950 flex flex-wrap items-center justify-between gap-3">
              <label className="flex h-9 w-full sm:w-80 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200 dark:border-slate-800 dark:bg-slate-900">
                <Search size={15} className="shrink-0 text-slate-500" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400"
                  placeholder="ค้นหา Order No / สินค้า / ไซต์"
                  value={modalSearch}
                  onChange={(e) => {
                    setModalSearch(e.target.value);
                    setModalPage(1);
                  }}
                />
              </label>
              <div className="text-xs font-semibold text-slate-500">
                แสดง {formatNumber(modalFilteredOrders.length)} จาก {formatNumber(selectedDealerRow.orders.length)} รายการ
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50/30 dark:bg-slate-900/10">
              <div className="overflow-x-auto rounded-lg border border-[#d9e3e6] bg-white dark:border-slate-850 dark:bg-slate-950">
                <table className="w-full min-w-[960px] table-fixed border-collapse text-[13px]">
                  <thead>
                    <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9] text-[12px] font-bold text-slate-500 dark:border-slate-850 dark:bg-slate-900">
                      <th className="w-[28%] px-3 py-2 text-left border-r border-[#e5e9ec] dark:border-slate-850">Order No. (สินค้า)</th>
                      <th className="w-[24%] px-3 py-2 text-left border-r border-[#e5e9ec] dark:border-slate-850">ไซต์งาน</th>
                      <th className="w-[12%] px-3 py-2 text-center border-r border-[#e5e9ec] dark:border-slate-850">ลูปออเดอร์</th>
                      <th className="w-[10%] px-3 py-2 text-right border-r border-[#e5e9ec] dark:border-slate-850">สั่ง (คิว)</th>
                      <th className="w-[10%] px-3 py-2 text-right border-r border-[#e5e9ec] dark:border-slate-850">ส่งจริง (คิว)</th>
                      <th className="w-[12%] px-3 py-2 text-left border-r border-[#e5e9ec] dark:border-slate-850">เวลาเท</th>
                      <th className="w-[8%] px-3 py-2 text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-slate-500 font-semibold dark:text-slate-400">
                          ไม่พบข้อมูลออเดอร์
                        </td>
                      </tr>
                    ) : (
                      modalRows.map((order: EnrichedOrderItem, idx: number) => {
                        const rowKey = `${order.order?.order_no || idx}-${idx}`;
                        return (
                          <tr key={rowKey} className="border-b border-[#edf1f2] hover:bg-[#f3faf8] dark:border-slate-850 dark:hover:bg-slate-900/60 transition-colors last:border-b-0">
                            <td className="px-3 py-2 border-r border-[#edf1f2] dark:border-slate-850 align-middle">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-900 dark:text-slate-100" title={order.order?.product_sku}>
                                  {order.order?.product_sku || "-"}
                                </div>
                                <div className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-slate-500 dark:text-slate-400" title={order.order?.product_name}>
                                  {order.order?.product_name || "-"}
                                </div>
                                <div className="mt-1 truncate text-[10px] text-slate-400 dark:text-slate-500">
                                  Order No: {order.order?.order_no || "-"}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-[#edf1f2] dark:border-slate-850 align-middle">
                              <div className="min-w-0">
                                <div className="truncate text-xs font-semibold text-slate-600 dark:text-slate-400">
                                  {order.site?.site_code || "-"}
                                </div>
                                <div className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-slate-800 dark:text-slate-355" title={order.site?.site_name}>
                                  {order.site?.site_name || "-"}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 border-r border-[#edf1f2] dark:border-slate-850 align-middle text-center">
                              <span className={cn(
                                "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1",
                                order.full_loop 
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200" 
                                  : "bg-amber-50 text-amber-700 ring-amber-200"
                              )}>
                                {order.full_loop ? "Full Loop" : "ไม่ Full Loop"}
                              </span>
                            </td>
                            <td className="px-3 py-2 border-r border-[#edf1f2] dark:border-slate-850 text-right font-semibold text-slate-800 dark:text-slate-100 align-middle">
                              {formatNumber(order.ordered ?? 0)}
                              <span className="ml-1 text-[10px] text-slate-400">{order.quantity?.unit ?? "คิว"}</span>
                            </td>
                            <td className={cn("px-3 py-2 border-r border-[#edf1f2] dark:border-slate-850 text-right font-semibold align-middle", (order.delivered ?? 0) > 0 ? "text-slate-800 dark:text-slate-100" : "text-slate-400")}>
                              {formatNumber(order.delivered ?? 0)}
                              <span className="ml-1 text-[10px] text-slate-400">{order.quantity?.unit ?? "คิว"}</span>
                            </td>
                            <td className="px-3 py-2 border-r border-[#edf1f2] dark:border-slate-850 text-xs text-slate-600 dark:text-slate-400 align-middle">
                              <CompactDateTime value={getPourDateText(order)} />
                            </td>
                            <td className="px-3 py-2 text-center align-middle">
                              <StatusBadge status={order.status?.order} />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            {modalTotalPages > 1 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex items-center justify-end dark:border-slate-850 dark:bg-slate-900/50">
                <ShadcnPagination
                  currentPage={modalPage}
                  pageSize={MODAL_PAGE_SIZE}
                  totalItems={modalFilteredOrders.length}
                  totalPages={modalTotalPages}
                  onPageChange={setModalPage}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
