import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/number";
import type { DealerGroup } from "@/features/dealers/types";

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0
  }).format(Number.isFinite(value) ? value : 0)}%`;
}

function EmptyChart() {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
      ไม่มีข้อมูลสำหรับแสดงกราฟ
    </div>
  );
}

function InsightMiniCard({
  detail,
  label,
  tone,
  value
}: {
  detail: string;
  label: string;
  tone: "amber" | "blue" | "green" | "slate";
  value: string;
}) {
  const tones = {
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    blue: "border-blue-100 bg-blue-50/70 text-blue-700",
    green: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700"
  } as const;

  return (
    <div className={cn("rounded-[20px] border p-3", tones[tone])}>
      <div className="text-[11px] font-semibold uppercase tracking-wide">{label}</div>
      <div className="mt-2 text-2xl font-semibold leading-none text-slate-950">{value}</div>
      <div className="mt-2 text-[11px] font-medium text-slate-500">{detail}</div>
    </div>
  );
}

export function GroupVolumeInsights({
  groups,
  totalBooked,
  totalDelivered,
  totalGroups,
  unit
}: {
  groups: DealerGroup[];
  totalBooked: number;
  totalDelivered: number;
  totalGroups: number;
  unit: string;
}) {
  if (!groups.length) return <EmptyChart />;

  const deliveredLeader = [...groups].sort((a, b) => b.delivered_volume - a.delivered_volume)[0];
  const bookedLeader = [...groups].sort((a, b) => b.booked_volume - a.booked_volume)[0];
  const deliveredLeadCount = groups.filter((group) => group.delivered_volume > group.booked_volume).length;
  const bookedLeadCount = groups.filter((group) => group.booked_volume > group.delivered_volume).length;
  const balancedCount = groups.filter((group) => group.booked_volume === group.delivered_volume).length;
  const topDeliveredShare = totalDelivered
    ? (groups.slice(0, 3).reduce((sum, group) => sum + group.delivered_volume, 0) / totalDelivered) * 100
    : 0;
  const totalPairVolume = totalDelivered + totalBooked;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InsightMiniCard
          label="Delivered Volume lead groups"
          value={formatNumber(deliveredLeadCount)}
          detail={`จาก ${formatNumber(totalGroups)} กลุ่ม`}
          tone="green"
        />
        <InsightMiniCard
          label="Booked Volume lead groups"
          value={formatNumber(bookedLeadCount)}
          detail={`จาก ${formatNumber(totalGroups)} กลุ่ม`}
          tone="blue"
        />
        <InsightMiniCard
          label="Balanced groups"
          value={formatNumber(balancedCount)}
          detail="ส่งจริงเท่ากับจอง"
          tone="slate"
        />
        <InsightMiniCard
          label="Top 3 delivered share"
          value={formatPercent(topDeliveredShare)}
          detail={`ของ Delivered Volume รวม ${formatNumber(totalDelivered)} ${unit}`}
          tone="amber"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(260px,0.9fr)]">
        <div className="rounded-[22px] border border-[#e5e7eb] bg-[#fbfcfd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Top delivered groups</div>
              <div className="mt-1 text-xs font-medium text-slate-500">สรุปกลุ่มที่มี Delivered Volume สูงสุด โดยไม่ทำซ้ำรายละเอียดตารางด้านล่าง</div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {formatNumber(groups.length)} shown
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {groups.slice(0, 3).map((group, index) => {
              const combined = group.delivered_volume + group.booked_volume;
              const deliveredRatio = combined ? (group.delivered_volume / combined) * 100 : 0;
              const bookedRatio = combined ? (group.booked_volume / combined) * 100 : 0;

              return (
                <div
                  key={group.group_id}
                  className="rounded-[18px] border border-[#e5e7eb] bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950/70"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                          {index + 1}
                        </span>
                        <div className="truncate text-sm font-semibold text-slate-900">{group.group_name}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] font-medium text-slate-500">
                      {formatNumber(group.delivered_volume)} / {formatNumber(group.booked_volume)} {group.unit || unit}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
                      <span>Delivered Volume</span>
                      <span>{formatPercent(deliveredRatio)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[#0f766e]"
                        style={{ width: `${Math.max(deliveredRatio, group.delivered_volume > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-[11px] font-medium text-slate-500">
                      <span>Booked Volume</span>
                      <span>{formatPercent(bookedRatio)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-[#2563eb]"
                        style={{ width: `${Math.max(bookedRatio, group.booked_volume > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Delivered Volume leader</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{deliveredLeader?.group_name ?? "-"}</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-slate-950">
              {formatNumber(deliveredLeader?.delivered_volume ?? 0)} {deliveredLeader?.unit || unit}
            </div>
          </div>

          <div className="rounded-[22px] border border-blue-100 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Booked Volume leader</div>
            <div className="mt-2 text-base font-semibold text-slate-950">{bookedLeader?.group_name ?? "-"}</div>
            <div className="mt-1 text-2xl font-semibold leading-none text-slate-950">
              {formatNumber(bookedLeader?.booked_volume ?? 0)} {bookedLeader?.unit || unit}
            </div>
          </div>

          <div className="rounded-[22px] border border-[#e5e7eb] bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="text-sm font-semibold text-slate-900">Overall pair mix</div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="flex h-full">
                <div
                  className="h-full bg-[#0f766e]"
                  style={{
                    width: `${totalPairVolume ? (totalDelivered / totalPairVolume) * 100 : 0}%`
                  }}
                />
                <div
                  className="h-full bg-[#2563eb]"
                  style={{
                    width: `${totalPairVolume ? (totalBooked / totalPairVolume) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-medium text-slate-500">Delivered Volume</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {formatNumber(totalDelivered)} {unit}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Booked Volume</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {formatNumber(totalBooked)} {unit}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
