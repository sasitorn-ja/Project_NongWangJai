import { useMemo, useState } from "react";
import { Database, PackageCheck, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { getMonthKey, getMonthLabel } from "../lib/dates";
import { FIXED_DIVISIONS } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
import { DataTable } from "../table/DataTable";
import { TopCustomersFilter } from "../filters/TopCustomersFilter";
import { WangjaiAdvisor } from "../ui/WangjaiAdvisor";

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
        delivered: row.delivered,
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
  const topDealer = customerRows[0];

  const customerColumns: DataColumn<(typeof customerRows)[number]>[] = [
    {
      title: "Dealer name",
      key: "customerName",
      dataIndex: "customerName",
      width: 250,
      render: (_, record) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-slate-900">{record.customerName}</div>
          <div className="truncate text-[11px] font-medium text-slate-500">{record.customerCode}</div>
        </div>
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
    }
  ];

  const monthlyColumns: DataColumn<(typeof monthlyRows)[number]>[] = [
    { title: "Month", key: "month", dataIndex: "monthLabel", sortAccessor: (record) => record.monthKey, width: 120 },
    { title: `Delivered Volume (${volumeUnit})`, key: "delivered", dataIndex: "delivered", align: "right", width: 160, render: formatNumber },
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
          { label: "Delivered", value: `${compactNumber(totalVolume)} ${volumeUnit}` },
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
    </>
  );
}
