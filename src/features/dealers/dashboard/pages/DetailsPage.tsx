import { Clock3, Search, User } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/number";
import type { ApiState, CustomerUsage, Dealer, DealerSite, DealerUsage } from "@/features/dealers/types";
import { dateText } from "../lib/dates";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
import { DealerPicker } from "../filters/DealerPicker";
import { ShadcnTabs } from "../ui/ShadcnTabs";
import { DataTable } from "../table/DataTable";
import { DualBarChart } from "../charts/DualBarChart";
import { ProgressList } from "../charts/ProgressList";
import { statusColumn } from "../table/columns";

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
