import { useMemo } from "react";
import { PackageCheck, Search, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { dateText } from "../lib/dates";
import { getOrderStatusKey, orderStatusText } from "../lib/status";
import type { DataColumn } from "../table/types";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
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
      sortAccessor: (record) => `${record.order?.product_name ?? ""} ${record.order?.order_no ?? ""} ${record.order?.product_sku ?? ""}`,
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
      sortAccessor: (record) => record.dealer_name,
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
      sortAccessor: (record) => `${record.customer?.name ?? ""} ${record.site?.site_name ?? ""}`,
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
      title: "Ordered Volume",
      key: "ordered",
      align: "right",
      sortAccessor: (record) => record.quantity?.ordered ?? 0,
      width: 130,
      render: (_, record) => `${formatNumber(record.quantity?.ordered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Delivered Volume",
      key: "delivered",
      align: "right",
      sortAccessor: (record) => record.quantity?.delivered ?? 0,
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
      sortAccessor: (record) => record.status?.order ?? "",
      width: 140,
      render: (_, record) => {
        const statusKey = getOrderStatusKey(record.status?.order);
        return (
          <span
            className={cn(
              "inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold ring-1",
              statusKey === "cancelled" && "bg-rose-50 text-rose-700 ring-rose-200",
              statusKey === "confirmed" && "bg-emerald-50 text-emerald-700 ring-emerald-200",
              statusKey === "pending" && "bg-amber-50 text-amber-700 ring-amber-200",
              statusKey === "other" && "bg-slate-100 text-slate-700 ring-slate-200"
            )}
          >
            {orderStatusText(record.status?.order)}
          </span>
        );
      }
    }
  ];

  return (
    <>
      <DealerPicker
        dealers={dealers}
        includeAll
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        title="เลือก Dealer หรือดูรายการ Order ทั้งหมด"
      />

      <section className="grid grid-cols-1">
        <SummaryKpiStrip
          items={[
            {
              detail: selectedDealer?.dealer_name ?? "จำนวนรายการ order ที่กรองอยู่",
              icon: <PackageCheck size={14} />,
              label: "Order Count",
              value: formatNumber(dealerOrders.length)
            },
            {
              detail: "ปริมาณที่สั่งรวมจาก order ทั้งหมด",
              icon: <TrendingUp size={14} />,
              label: "Ordered Volume",
              value: (
                <>
                  {compactNumber(totalOrdered)}{" "}
                  <span className="text-xs font-semibold text-slate-400">m3</span>
                </>
              )
            },
            {
              detail: "ปริมาณส่งจริงรวมจาก order ทั้งหมด",
              icon: <PackageCheck size={14} />,
              label: "Delivered Volume",
              value: (
                <>
                  {compactNumber(totalDelivered)}{" "}
                  <span className="text-xs font-semibold text-slate-400">m3</span>
                </>
              )
            },
            {
              detail: `นับจาก site code ที่ไม่ซ้ำใน ${formatNumber(dealerOrders.length)} orders`,
              icon: <Users size={14} />,
              label: "Unique Sites",
              value: formatNumber(uniqueSites)
            }
          ]}
        />
      </section>

      <Card className="dashboard-card overflow-hidden">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div>
              <CardTitle className="text-lg">Order List ของ Dealer</CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedDealer
                  ? `แสดงรายการ order ของ ${selectedDealer.dealer_name}`
                  : "แสดงรายการ order ของ dealer ที่เลือก"}
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
