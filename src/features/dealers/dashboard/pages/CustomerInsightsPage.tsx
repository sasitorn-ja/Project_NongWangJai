import { useMemo, useState } from "react";
import { Database, PackageCheck, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { dateText, parseDateValue } from "../lib/dates";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
import { DealerPicker } from "../filters/DealerPicker";
import { ShadcnTabs } from "../ui/ShadcnTabs";
import { DataTable } from "../table/DataTable";
import { DualBarChart } from "../charts/DualBarChart";

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
  const customerIdentity = useMemo(
    () => (row: OrderItem) => ({
      code: row.customer?.code?.trim() || row.customer?.id?.toString() || "-",
      name: row.customer?.name?.trim() || "ไม่ระบุลูกค้า"
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
      const { code: customerCode, name: customerName } = customerIdentity(row);
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
  }, [customerIdentity, dealerOrders]);

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
      const { name: customerName } = customerIdentity(row);
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
  }, [customerIdentity, dealerOrders]);

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
        title="เลือก Dealer เพื่อดูลูกค้าและไซต์ของ dealer นั้น"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Users size={18} />} label="Customers" value={formatNumber(totalCustomers)} detail={currentDealer?.dealer_name ?? "จำนวนลูกค้าในข้อมูล orders ที่กรองอยู่"} />
        <MetricCard icon={<Database size={18} />} label="Sites" value={formatNumber(totalSites)} detail="นับจาก site code/site id ที่ไม่ซ้ำ" tone="rose" />
        <MetricCard icon={<TrendingUp size={18} />} label="Ordered Qty" value={compactNumber(totalOrdered)} detail="ยอดสั่งรวมจาก orders ที่กรองอยู่" tone="amber" />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered Qty" value={compactNumber(totalDelivered)} detail="ยอดส่งจริงรวมจาก orders ที่กรองอยู่" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-lg">Top Customers by Delivered Volume</CardTitle>
                <p className="text-xs font-medium text-slate-500">สรุปลูกค้าที่รับคอนกรีตสูงสุดของ dealer ที่เลือก พร้อมเทียบ ordered กับ delivered</p>
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
            <CardTitle className="text-lg">Customer Snapshot</CardTitle>
            <p className="text-xs font-medium text-slate-500">ดูลูกค้ากลุ่มบนสุดพร้อมจำนวนไซต์และจำนวน order ที่เกี่ยวข้อง</p>
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
            label: "Customer Summary",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardHeader className="border-b border-[#d9e3e6]">
                  <CardTitle className="text-lg">Customer Summary Table</CardTitle>
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
