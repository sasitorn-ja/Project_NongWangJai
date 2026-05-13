import { useMemo } from "react";
import { Layers3, PackageCheck, Search, TrendingUp } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNumber, formatNumber } from "@/lib/number";
import type { ApiState, Dealer, DealerGroup, DealerUsage } from "@/features/dealers/types";
import { dateText } from "../lib/dates";
import type { DataColumn } from "../table/types";
import { MetricCard } from "../ui/MetricCard";
import { DealerPicker } from "../filters/DealerPicker";
import { DataTable } from "../table/DataTable";
import { GroupVolumeInsights } from "../charts/GroupVolumeInsights";
import { CompactFunnelSummary } from "../charts/CompactFunnelSummary";
import { statusColumn } from "../table/columns";

type GroupsPageProps = {
  dealers: Dealer[];
  groups: DealerGroup[];
  groupsState: ApiState;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
  usageRows: DealerUsage[];
};

export function GroupsPage({ dealers, groups, groupsState, selectedDealer, selectedDealerId, setSelectedDealerId, usageRows }: GroupsPageProps) {
  const volumeUnit = groups.find((group) => group.unit)?.unit ?? selectedDealer?.unit ?? "m3";
  const totalDelivered = groups.reduce((sum, group) => sum + group.delivered_volume, 0);
  const totalBooked = groups.reduce((sum, group) => sum + group.booked_volume, 0);
  const totalPriceChecks = groups.reduce((sum, group) => sum + group.price_check_count, 0);
  const totalBookings = groups.reduce((sum, group) => sum + group.booking_count, 0);
  const selectedUsage = usageRows.find((row) => row.dealer_id === selectedDealerId);
  const topGroups = useMemo(
    () =>
      [...groups]
        .sort(
          (a, b) =>
            Math.max(b.delivered_volume, b.booked_volume) - Math.max(a.delivered_volume, a.booked_volume)
        )
        .slice(0, 10),
    [groups]
  );

  const columns: DataColumn<DealerGroup>[] = [
    {
      title: "Group",
      dataIndex: "group_name",
      key: "group_name",
      width: 320,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.group_name}</div>
          <div className="text-xs font-medium text-slate-500">ID: {record.group_id} | Type: {record.group_type ?? "-"}</div>
        </div>
      )
    },
    { title: "ส่งจริง", dataIndex: "delivered_volume", key: "delivered_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "จอง", dataIndex: "booked_volume", key: "booked_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "เช็คราคา", dataIndex: "price_check_count", key: "price_check_count", align: "right", width: 130, render: formatNumber },
    { title: "จองคิว", dataIndex: "booking_count", key: "booking_count", align: "right", width: 130, render: formatNumber },
    { title: "วันที่สร้าง", dataIndex: "created_at", key: "created_at", width: 190, render: dateText },
    statusColumn<DealerGroup>()
  ];

  return (
    <>
      <DealerPicker dealers={dealers} selectedDealerId={selectedDealerId} setSelectedDealerId={setSelectedDealerId} title="เลือก Dealer เพื่อดูรายการกลุ่ม" />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Layers3 size={18} />} label="Groups" value={formatNumber(groups.length)} detail={selectedDealer?.dealer_name ?? "Select dealer"} />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered" value={`${compactNumber(totalDelivered)} ${volumeUnit}`} detail="ปริมาณคอนกรีตส่งจริงของกลุ่ม" tone="green" />
        <MetricCard icon={<TrendingUp size={18} />} label="Booked" value={`${compactNumber(totalBooked)} ${volumeUnit}`} detail="ปริมาณคอนกรีตที่มีการจอง" tone="amber" />
        <MetricCard icon={<Search size={18} />} label="Price / Booking" value={`${formatNumber(totalPriceChecks)} / ${formatNumber(totalBookings)}`} detail="จำนวนเช็คราคาและจองคิว" tone="rose" />
      </section>

      <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Delivered vs Booked by Group</CardTitle>
            <p className="text-xs font-medium text-slate-500">
              แสดงเฉพาะ {formatNumber(topGroups.length)} กลุ่มที่มี volume สูงสุดจากทั้งหมด {formatNumber(groups.length)} กลุ่ม เพื่อดูว่ากลุ่มไหนจองนำหรือส่งจริงนำ
            </p>
          </CardHeader>
          <CardContent>
            <GroupVolumeInsights
              groups={topGroups}
              totalBooked={totalBooked}
              totalDelivered={totalDelivered}
              totalGroups={groups.length}
              unit={volumeUnit}
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Activity Funnel</CardTitle>
            <p className="text-xs font-medium text-slate-500">ภาพรวมการใช้งานจากเช็คราคาไปสู่การจอง</p>
          </CardHeader>
          <CardContent>
            <CompactFunnelSummary
              rows={[
                {
                  label: "Dealer price checks",
                  shortLabel: "Dealer checks",
                  value: selectedUsage?.price_concrete_count ?? totalPriceChecks
                },
                {
                  label: "Group price checks",
                  shortLabel: "Group checks",
                  value: totalPriceChecks
                },
                {
                  label: "Group bookings",
                  shortLabel: "Bookings",
                  value: totalBookings
                }
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="dashboard-card overflow-hidden">
        <CardHeader className="border-b border-[#d9e3e6]">
          <CardTitle className="text-lg">รายการกลุ่มของ Dealer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={groups} loading={groupsState === "loading"} rowKey="group_id" minWidth={1180} pageSize={10} />
        </CardContent>
      </Card>
    </>
  );
}
