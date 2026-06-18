import { formatNumber } from "@/lib/number";
import type { DealerGroup } from "@/features/dealers/types";

const DELIVERED_COLOR = "#14b8a6";
const BOOKED_COLOR = "#3b82f6";
const GROUP_LIMIT = 6;

function EmptyChart() {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40">
      ไม่มีข้อมูลกลุ่มสำหรับแสดง
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

  const topGroups = [...groups]
    .sort((a, b) => Math.max(b.delivered_volume, b.booked_volume) - Math.max(a.delivered_volume, a.booked_volume))
    .slice(0, GROUP_LIMIT);
  const max = Math.max(...topGroups.flatMap((g) => [g.delivered_volume, g.booked_volume]), 1);

  return (
    <div className="space-y-4">
      {/* Legend + totals */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#eef0f4] bg-[#fbfcfd] px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="flex items-center gap-4 text-[12px] font-semibold">
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: DELIVERED_COLOR }} />
            ส่งมอบจริง {formatNumber(totalDelivered)} {unit}
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: BOOKED_COLOR }} />
            ยอดจอง {formatNumber(totalBooked)} {unit}
          </span>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          แสดง {formatNumber(topGroups.length)} จาก {formatNumber(totalGroups)} กลุ่ม
        </span>
      </div>

      {/* Group rows: delivered vs booked bars */}
      <div className="space-y-3.5">
        {topGroups.map((group, index) => {
          const groupUnit = "คิว";
          return (
            <div key={group.group_id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {index + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200" title={group.group_name}>
                    {group.group_name}
                  </span>
                </div>
              </div>

              <div className="mt-1.5 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max((group.delivered_volume / max) * 100, group.delivered_volume > 0 ? 3 : 0)}%`, backgroundColor: DELIVERED_COLOR }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                    {formatNumber(group.delivered_volume)} <span className="text-[10px] text-slate-400">{groupUnit}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.max((group.booked_volume / max) * 100, group.booked_volume > 0 ? 3 : 0)}%`, backgroundColor: BOOKED_COLOR }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                    {formatNumber(group.booked_volume)} <span className="text-[10px] text-slate-400">{groupUnit}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
