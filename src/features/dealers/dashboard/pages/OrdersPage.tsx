import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, PackageCheck, Search, TrendingUp, Users } from "lucide-react";

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

const MOBILE_PAGE_SIZE = 10;

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

function customerSiteLines(record: OrderItem) {
  return {
    customerName: record.customer?.name ?? "-",
    siteCode: record.site?.site_code ?? "-",
    siteName: record.site?.site_name ?? "-"
  };
}

function MobileOrderCard({ record }: { record: OrderItem }) {
  const customerSite = customerSiteLines(record);

  return (
    <div className="border-b border-[#edf1f2] px-4 py-3 last:border-b-0">
      {/* Product name + status */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug text-slate-950">
            {record.order?.product_name ?? "-"}
          </div>
          <div className="mt-0.5 text-[11px] font-medium text-slate-400">
            {record.order?.order_no ?? "-"} · {record.order?.product_sku ?? "-"}
          </div>
        </div>
        <StatusBadge status={record.status?.order} />
      </div>

      {/* Detail rows */}
      <div className="mt-2 space-y-1">
        <div className="flex items-baseline gap-1 text-xs">
          <span className="w-16 shrink-0 text-slate-400">Dealer</span>
          <span className="font-medium text-slate-700 truncate">{record.dealer_name ?? "-"}</span>
          <span className="ml-1 shrink-0 text-[10px] text-slate-400">{record.dealer_code}</span>
        </div>
        <div className="flex items-baseline gap-1 text-xs">
          <span className="w-16 shrink-0 text-slate-400">ลูกค้า</span>
          <span className="font-medium text-slate-700 truncate">{customerSite.customerName}</span>
        </div>
        <div className="flex items-baseline gap-1 text-xs">
          <span className="w-16 shrink-0 text-slate-400">Site Code</span>
          <span className="font-medium text-slate-700 truncate">{customerSite.siteCode}</span>
        </div>
        <div className="flex items-baseline gap-1 text-xs">
          <span className="w-16 shrink-0 text-slate-400">Site</span>
          <span className="font-medium text-slate-700 truncate">{customerSite.siteName}</span>
        </div>
        <div className="flex items-baseline gap-1 text-xs">
          <span className="w-16 shrink-0 text-slate-400">เทเวลา</span>
          <span className="font-medium text-slate-700">{dateText(record.pour_datetime)}</span>
        </div>
      </div>

      {/* Volume row */}
      <div className="mt-2 flex gap-4">
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Ordered</div>
          <div className="text-sm font-bold text-slate-800">
            {formatNumber(record.quantity?.ordered ?? 0)}{" "}
            <span className="text-[10px] font-semibold text-slate-400">{record.quantity?.unit ?? "m3"}</span>
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-center">
          <div className="text-[10px] font-semibold text-slate-400">Delivered</div>
          <div className="text-sm font-bold text-slate-800">
            {formatNumber(record.quantity?.delivered ?? 0)}{" "}
            <span className="text-[10px] font-semibold text-slate-400">{record.quantity?.unit ?? "m3"}</span>
          </div>
        </div>
      </div>
    </div>
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
  const [mobilePage, setMobilePage] = useState(1);

  const dealerOrders = useMemo(
    () => orders.filter((row) => selectedDealerId == null || row.dealer_id === selectedDealerId),
    [orders, selectedDealerId]
  );
  const totalOrdered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0);
  const totalDelivered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0);
  const uniqueSites = new Set(dealerOrders.map((row) => row.site?.site_code).filter(Boolean)).size;

  // Reset mobile page when search or filter changes
  const mobileTotalPages = Math.max(Math.ceil(dealerOrders.length / MOBILE_PAGE_SIZE), 1);
  const mobileRows = dealerOrders.slice((mobilePage - 1) * MOBILE_PAGE_SIZE, mobilePage * MOBILE_PAGE_SIZE);
  const mobileStart = dealerOrders.length ? (mobilePage - 1) * MOBILE_PAGE_SIZE + 1 : 0;
  const mobileEnd = Math.min(mobilePage * MOBILE_PAGE_SIZE, dealerOrders.length);

  const columns: DataColumn<OrderItem>[] = [
    {
      title: "Order",
      key: "order",
      sortAccessor: (record) => `${record.order?.product_name ?? ""} ${record.order?.order_no ?? ""} ${record.order?.product_sku ?? ""}`,
      width: 230,
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
      width: 190,
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
      sortAccessor: (record) => `${record.site?.site_name ?? ""} ${record.customer?.name ?? ""}`,
      width: 310,
      render: (_, record) => {
        const customerSite = customerSiteLines(record);

        return (
          <div>
            <div className="font-semibold text-slate-950">{customerSite.customerName}</div>
            <div className="text-xs font-semibold text-slate-600">{customerSite.siteCode}</div>
            <div className="text-xs font-medium text-slate-500">{customerSite.siteName}</div>
          </div>
        );
      }
    },
    {
      title: "Ordered Volume",
      key: "ordered",
      align: "right",
      sortAccessor: (record) => record.quantity?.ordered ?? 0,
      width: 110,
      render: (_, record) => `${formatNumber(record.quantity?.ordered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Delivered Volume",
      key: "delivered",
      align: "right",
      sortAccessor: (record) => record.quantity?.delivered ?? 0,
      width: 110,
      render: (_, record) => `${formatNumber(record.quantity?.delivered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Pour Time",
      dataIndex: "pour_datetime",
      key: "pour_datetime",
      width: 150,
      render: dateText
    },
    {
      title: "สถานะ",
      key: "status",
      sortAccessor: (record) => record.status?.order ?? "",
      width: 100,
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

      {/* ─── Mobile card list (hidden on md+) ─── */}
      <Card className="dashboard-card overflow-hidden md:hidden">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="space-y-2">
            <div>
              <CardTitle className="text-base">Order List ของ Dealer</CardTitle>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
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
                onChange={(event) => {
                  setOrderSearch(event.target.value);
                  setMobilePage(1);
                }}
              />
            </label>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {ordersState === "loading" && (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              กำลังโหลดข้อมูล...
            </div>
          )}
          {ordersState !== "loading" && dealerOrders.length === 0 && (
            <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
              ไม่มีข้อมูล
            </div>
          )}
          {ordersState !== "loading" && mobileRows.map((record) => (
            <MobileOrderCard
              key={[
                record.order?.order_no,
                record.dealer_id,
                record.site?.site_code,
                record.created_at ?? record.updated_at ?? record.pour_datetime
              ].filter(Boolean).join("-")}
              record={record}
            />
          ))}
        </CardContent>

        {/* Mobile pagination */}
        {dealerOrders.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#d9e3e6] bg-white px-4 py-2.5">
            <span className="text-xs font-semibold text-slate-500">
              {formatNumber(mobileStart)}–{formatNumber(mobileEnd)} จาก {formatNumber(dealerOrders.length)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={mobilePage === 1}
                onClick={() => setMobilePage((p) => Math.max(p - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-700">
                {mobilePage} / {mobileTotalPages}
              </span>
              <button
                type="button"
                disabled={mobilePage === mobileTotalPages}
                onClick={() => setMobilePage((p) => Math.min(p + 1, mobileTotalPages))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ─── Desktop table (hidden below md) ─── */}
      <Card className="dashboard-card hidden overflow-hidden md:block">
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
            minWidth={0}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </>
  );
}
