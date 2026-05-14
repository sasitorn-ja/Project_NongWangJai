import { useMemo, useState } from "react";
import { Database, PackageCheck, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { getMonthKey, getMonthLabel, parseDateValue } from "../lib/dates";
import { FIXED_DIVISIONS } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
import { DataTable } from "../table/DataTable";
import { TopCustomersFilter } from "../filters/TopCustomersFilter";

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
      dataIndex: "productName",
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
      render: (value) => {
        if (!value) return "-";
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
      }
    }
  ];

  const monthlyColumns: DataColumn<(typeof monthlyRows)[number]>[] = [
    { title: "Month", key: "month", dataIndex: "monthLabel", sortAccessor: (record) => record.monthKey, width: 120 },
    { title: "Volume All", key: "delivered", dataIndex: "delivered", align: "right", width: 130, render: formatNumber },
    {
      title: "TopN Product",
      key: "topProducts",
      sortable: false,
      render: (_, record) => (
        <div className="space-y-1">
          {record.topProducts.map((product, productIndex) => (
            <div key={`${record.monthKey}-${product.productCode}-${productIndex}`} className="line-clamp-2 text-sm text-slate-800">
              {product.productName} ({product.productCode}), {formatNumber(product.delivered)} m3
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
                      ? "border-slate-950 bg-slate-950 text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)]"
                      : "border-transparent bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
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
        <MetricCard compact icon={<Database size={16} />} label="Order Count" value={formatNumber(totalOrders)} detail="จำนวนรายการ order ที่ใช้คำนวณสินค้าขายดี" tone="rose" />
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
            <DataTable columns={monthlyColumns} data={monthlyRows} loading={ordersState === "loading"} rowKey="monthKey" minWidth={760} />
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
