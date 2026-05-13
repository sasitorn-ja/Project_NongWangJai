import { useMemo } from "react";
import { PackageCheck, Search, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { dateText } from "../lib/dates";
import { orderStatusText } from "../lib/status";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
import { DealerPicker } from "../filters/DealerPicker";
import { DataTable } from "../table/DataTable";

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
