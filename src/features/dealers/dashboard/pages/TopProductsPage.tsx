import { useMemo, useState } from "react";
import { ClipboardList, Cuboid, Star, TrendingUp, Truck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import productImage from "@/assets/top-products-cpac-truck-transparent.png";
import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, OrderItem } from "@/features/dealers/types";
import { getMonthKey, getMonthLabel, parseDateValue } from "../lib/dates";
import { FIXED_DIVISIONS } from "../lib/regions";
import type { DataColumn } from "../table/types";
import { SummaryKpiStrip } from "../ui/SummaryKpiStrip";
import { DataTable } from "../table/DataTable";
import { TopCustomersFilter } from "../filters/TopCustomersFilter";
import { WangjaiLogo } from "../ui/WangjaiLogo";

function ProductInsightBanner() {
  return (
    <section className="relative overflow-hidden rounded-lg border border-sky-100 bg-gradient-to-r from-white via-sky-50/90 to-sky-100 px-4 py-3 shadow-[0_10px_28px_-18px_rgba(14,116,214,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,0.24)_46%,rgba(186,230,253,0.52)_100%)]" />
      <div className="pointer-events-none absolute -left-10 -top-14 h-36 w-36 rounded-full bg-white/80 blur-2xl" />
      <div className="pointer-events-none absolute right-[7%] top-2 h-24 w-56 rounded-full bg-sky-300/20 blur-2xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] bg-[radial-gradient(circle_at_72%_52%,rgba(14,165,233,0.2),transparent_56%)] md:block" />

      <div className="relative z-10 grid grid-cols-[58px_minmax(0,1fr)] items-center gap-3 md:grid-cols-[72px_minmax(0,1fr)_minmax(260px,390px)] md:gap-4">
        <div className="relative flex h-[74px] items-center justify-center">
          <div className="absolute bottom-1 h-10 w-12 rounded-full bg-sky-300/20 blur-lg" />
          <WangjaiLogo variant="full" className="relative h-[76px] object-contain drop-shadow-[0_12px_18px_rgba(14,116,214,0.22)]" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-sky-600 px-3 py-1 text-[12px] font-bold text-white shadow-sm shadow-sky-300/40">
              น้องวางใจ
            </span>
            <h2 className="min-w-0 text-[15px] font-extrabold leading-6 text-sky-700 md:text-[16px]">
              ดูสินค้าขายดีจาก Delivered Volume และจำนวน order
            </h2>
          </div>
          <p className="mt-1.5 max-w-[54rem] text-[13px] font-medium leading-5 text-slate-600">
            คุณสามารถเลือกช่วงเวลา ประเภทสินค้า และจำนวน Top N เพื่อวิเคราะห์แนวโน้มการขาย
          </p>
          <div className="mt-2 hidden items-center gap-2 text-[11px] font-semibold text-slate-400 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Delivered Volume
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Order Count
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Top N Ranking
          </div>
        </div>

        <div className="pointer-events-none relative hidden h-[96px] items-center justify-end md:flex">
          <div className="absolute bottom-2 right-8 h-5 w-56 rounded-full bg-slate-900/10 blur-md" />
          <div className="absolute right-1 top-3 h-16 w-52 rounded-full bg-white/55 blur-xl" />
          <img
            alt="CPAC concrete truck"
            className="relative h-[96px] w-full max-w-[390px] object-contain object-right drop-shadow-[0_14px_20px_rgba(15,23,42,0.18)]"
            src={productImage}
          />
        </div>
      </div>
    </section>
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
  const [topN, setTopN] = useState(10);

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

    return Array.from(rows.values())
      .sort((a, b) => b.delivered - a.delivered)
      .map((row, index) => ({ ...row, rank: index + 1 }));
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
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
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
      title: "#",
      key: "rank",
      dataIndex: "rank",
      align: "center",
      width: 32,
      render: (value) => <span className="font-semibold text-slate-500">{formatNumber(Number(value))}</span>
    },
    {
      title: "รหัสสินค้า",
      key: "productCode",
      dataIndex: "productCode",
      width: 94,
      render: (value) => <span className="font-semibold text-blue-600">{String(value)}</span>
    },
    {
      title: "ชื่อสินค้า",
      key: "productName",
      dataIndex: "productName",
      width: 190,
      render: (_, record) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold leading-5 text-slate-900">{record.productName}</div>
          <div className="truncate text-[11px] font-medium text-slate-500">{record.productCode}</div>
        </div>
      )
    },
    {
      title: "Order Count",
      key: "orderCount",
      dataIndex: "orderCount",
      align: "right",
      width: 62,
      render: formatNumber
    },
    {
      title: "Ordered Volume",
      key: "ordered",
      dataIndex: "ordered",
      align: "right",
      width: 74,
      render: formatNumber
    },
    {
      title: "Delivered Volume",
      key: "delivered",
      dataIndex: "delivered",
      align: "right",
      width: 74,
      render: formatNumber
    },
    {
      title: "ขายล่าสุด",
      key: "latestPour",
      dataIndex: "latestPour",
      width: 94,
      render: (value) => {
        if (!value) return "-";
        const date = new Date(String(value));
        if (Number.isNaN(date.getTime())) return String(value);
        return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(date);
      }
    }
  ];

  const monthlyColumns: DataColumn<(typeof monthlyRows)[number]>[] = [
    { title: "Month", key: "month", dataIndex: "monthLabel", sortAccessor: (record) => record.monthKey, width: 78 },
    { title: "Delivered", key: "delivered", dataIndex: "delivered", align: "right", width: 78, render: formatNumber },
    {
      title: "TopN Product",
      key: "topProducts",
      sortable: false,
      render: (_, record) => (
        <div className="space-y-0.5">
          {record.topProducts.slice(0, 2).map((product, productIndex) => (
            <div key={`${record.monthKey}-${product.productCode}-${productIndex}`} className="truncate text-[12px] font-semibold text-slate-800">
              {product.productCode}
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
              label="Product"
              value={productFilter}
              onChange={setProductFilter}
              options={[{ label: "ทั้งหมด", value: "all" }, ...productOptions]}
              searchable
              searchPlaceholder="ค้นหารหัสหรือชื่อสินค้า"
            />
            <div className="block space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">TopN</div>
              <div className="inline-flex w-fit flex-nowrap items-center gap-1 rounded-lg border border-[#d9e3e6] bg-[#f8fafb] p-1 shadow-inner shadow-slate-100/70">
                {[1, 3, 5, 10].map((value) => (
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

      <ProductInsightBanner />

      <section className="grid grid-cols-1">
        <SummaryKpiStrip
          items={[
            {
              accent: "violet",
              detail: "จำนวนสินค้าที่อยู่ในผลลัพธ์ปัจจุบัน",
              icon: <Cuboid size={18} />,
              label: "Products",
              value: formatNumber(totalProducts)
            },
            {
              accent: "emerald",
              detail: "จำนวนรายการ order ที่ใช้คำนวณสินค้าขายดี",
              icon: <ClipboardList size={18} />,
              label: "Order Count",
              value: formatNumber(totalOrders)
            },
            {
              accent: "sky",
              detail: "ปริมาณส่งจริงรวมของสินค้าที่ถูกกรอง",
              icon: <Truck size={18} />,
              label: "Delivered Volume",
              value: (
                <>
                  {compactNumber(totalVolume)}{" "}
                  <span className="text-xs font-semibold text-slate-400">m3</span>
                </>
              )
            },
            {
              accent: "violet",
              detail: bestseller?.productName ?? "ยังไม่มีข้อมูลสินค้า",
              icon: <Star size={18} />,
              label: "Best Seller",
              value: <span className="text-base font-bold leading-tight">{bestseller?.productCode ?? "-"}</span>
            }
          ]}
        />
      </section>

      <section className="grid grid-cols-1 gap-2.5 xl:grid-cols-[270px_minmax(0,1fr)]">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Top N Products</CardTitle>
                <p className="mt-1 text-xs font-medium text-slate-500">สรุปยอดขาย Top N รายเดือน</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <TrendingUp size={18} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={monthlyColumns} data={monthlyRows} loading={ordersState === "loading"} rowKey="monthKey" minWidth={0} pageSize={6} />
          </CardContent>
        </Card>

        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Product Ranking</CardTitle>
            <p className="text-xs font-medium text-slate-500">สรุปสินค้าตาม Order Count และ Delivered Volume</p>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={productColumns} data={productRows} loading={ordersState === "loading"} rowKey="key" minWidth={0} pageSize={10} />
          </CardContent>
        </Card>
      </section>
    </>
  );
}
