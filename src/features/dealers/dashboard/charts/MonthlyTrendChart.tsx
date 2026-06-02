import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { OrderItem } from "@/features/dealers/types";
import { parseDateValue } from "../lib/dates";

type MonthData = {
  date: Date;
  delivered: number;
  key: string;
  label: string;
  longLabel: string;
  ordered: number;
  orderCount: number;
};

type TrendRange = 6 | 12 | 0;

const RANGE_OPTIONS: { label: string; value: TrendRange }[] = [
  { label: "6 เดือน", value: 6 },
  { label: "12 เดือน", value: 12 },
  { label: "ทั้งหมด", value: 0 }
];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyTrendChart({
  loading = false,
  orders,
  unit = "m3"
}: {
  loading?: boolean;
  orders: OrderItem[];
  unit?: string;
}) {
  const [range, setRange] = useState<TrendRange>(12);
  const [showDelivered, setShowDelivered] = useState(true);
  const [showOrdered, setShowOrdered] = useState(true);

  const allMonths = useMemo<MonthData[]>(() => {
    const map = new Map<string, MonthData>();
    orders.forEach((order) => {
      const date = parseDateValue(order.pour_datetime ?? order.created_at ?? order.updated_at);
      if (!date) return;
      const key = monthKey(date);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const cur = map.get(key) ?? {
        date: monthStart,
        delivered: 0,
        key,
        label: new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit" }).format(monthStart),
        longLabel: new Intl.DateTimeFormat("th-TH", { month: "long", year: "numeric" }).format(monthStart),
        ordered: 0,
        orderCount: 0
      };
      cur.delivered += order.quantity?.delivered ?? 0;
      cur.ordered += order.quantity?.ordered ?? 0;
      cur.orderCount += 1;
      map.set(key, cur);
    });
    return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [orders]);

  // Apply the selected range window
  const months = useMemo<MonthData[]>(
    () => (range === 0 ? allMonths : allMonths.slice(-range)),
    [allMonths, range]
  );

  const DELIVERED_COLOR = "#14b8a6";
  const ORDERED_COLOR = "#93c5fd";

  const RangeToggle = (
    <div className="inline-flex gap-0.5 rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
      {RANGE_OPTIONS.map((opt) => {
        const active = range === opt.value;
        const disabled = opt.value !== 0 && allMonths.length <= opt.value && range !== opt.value && allMonths.length < opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => setRange(opt.value)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
                : "text-slate-500 hover:text-slate-700 disabled:opacity-40 dark:text-slate-400"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
        กำลังโหลดข้อมูลแนวโน้ม...
      </div>
    );
  }

  if (!months.length) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc]">
        <div className="text-sm font-semibold text-slate-600">ยังไม่มีข้อมูลสำหรับแสดงแนวโน้ม</div>
        <div className="text-xs font-medium text-slate-400">ไม่มี orders ในช่วงเวลาที่เลือก</div>
      </div>
    );
  }

  // SVG layout — grouped bar chart (clearer than a line for sparse dealer data)
  const W = 1000;
  const H = 280;
  const padL = 48;
  const padR = 24;
  const padT = 28;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const baseline = padT + innerH;
  const max = Math.max(
    ...months.map((m) => Math.max(showDelivered ? m.delivered : 0, showOrdered ? m.ordered : 0)),
    1
  );

  const n = months.length;
  const slot = innerW / n;
  const pairCount = (showDelivered ? 1 : 0) + (showOrdered ? 1 : 0) || 1;
  const barW = Math.min((slot * 0.62) / pairCount, 40);
  const barGap = pairCount > 1 ? Math.min(barW * 0.22, 8) : 0;
  const groupW = barW * pairCount + barGap * (pairCount - 1);
  const showValueLabels = n <= 6;

  const barH = (value: number) => Math.max((value / max) * innerH, value > 0 ? 2 : 0);

  const last = months[months.length - 1];
  const prev = months.length > 1 ? months[months.length - 2] : null;
  const momPercent = prev && prev.delivered > 0 ? ((last.delivered - prev.delivered) / prev.delivered) * 100 : null;

  // Fill-rate (delivered / ordered) across the visible window
  const totalDelivered = months.reduce((s, m) => s + m.delivered, 0);
  const totalOrdered = months.reduce((s, m) => s + m.ordered, 0);
  const fillRate = totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;
  const backlog = Math.max(totalOrdered - totalDelivered, 0);

  // Y-axis ticks (5 ticks)
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => max * (1 - i / tickCount));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setShowDelivered((v) => !v)}
            className={cn("inline-flex items-center gap-1.5 transition-opacity", !showDelivered && "opacity-40")}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: DELIVERED_COLOR }} />
            <span className={cn("text-slate-600 dark:text-slate-300", !showDelivered && "line-through")}>
              ส่งจริง
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowOrdered((v) => !v)}
            className={cn("inline-flex items-center gap-1.5 transition-opacity", !showOrdered && "opacity-40")}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: ORDERED_COLOR }} />
            <span className={cn("text-slate-600 dark:text-slate-300", !showOrdered && "line-through")}>
              ยอดสั่ง
            </span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {momPercent !== null && (
            <span
              className={
                "rounded-full px-2.5 py-1 text-[11px] font-bold " +
                (momPercent >= 0
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300")
              }
            >
              {momPercent >= 0 ? "↑" : "↓"} {Math.abs(Math.round(momPercent))}% MoM
            </span>
          )}
          {RangeToggle}
        </div>
      </div>

      <div className="rounded-2xl border border-[#e5e7eb] bg-[#fbfcfd] p-3 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 540, height: H }}>
            {/* Gridlines */}
            {ticks.map((tickValue, i) => {
              const y = padT + (i / tickCount) * innerH;
              return (
                <g key={i}>
                  <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
                  <text x={padL - 6} y={y + 4} fontSize="11" textAnchor="end" fill="#94a3b8">
                    {compactNumber(tickValue)}
                  </text>
                </g>
              );
            })}

            {/* Grouped bars per month */}
            {months.map((m, i) => {
              const groupStart = padL + slot * i + (slot - groupW) / 2;
              let cursor = groupStart;
              const bars: { color: string; value: number; label: string }[] = [];
              if (showDelivered) bars.push({ color: DELIVERED_COLOR, value: m.delivered, label: "ส่งจริง" });
              if (showOrdered) bars.push({ color: ORDERED_COLOR, value: m.ordered, label: "ยอดสั่ง" });
              return (
                <g key={m.key}>
                  {bars.map((bar, bi) => {
                    const h = barH(bar.value);
                    const x = cursor;
                    cursor += barW + barGap;
                    return (
                      <g key={bi}>
                        <rect x={x} y={baseline - h} width={barW} height={h} rx={Math.min(barW / 3, 5)} fill={bar.color}>
                          <title>{`${m.longLabel}\n${bar.label} ${formatNumber(bar.value)} ${unit}\n${formatNumber(m.orderCount)} orders`}</title>
                        </rect>
                        {showValueLabels && bar.value > 0 ? (
                          <text x={x + barW / 2} y={baseline - h - 5} fontSize="10" fontWeight="700" textAnchor="middle" fill="#475569">
                            {compactNumber(bar.value)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Baseline */}
            <line x1={padL} y1={baseline} x2={W - padR} y2={baseline} stroke="#cbd5e1" strokeWidth="1" />

            {/* X-axis labels */}
            {months.map((m, i) => {
              const x = padL + slot * i + slot / 2;
              return (
                <text key={m.key} x={x} y={H - 10} fontSize="11" textAnchor="middle" fill="#64748b" fontWeight="600">
                  {m.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">เดือนล่าสุด</div>
          <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
            {compactNumber(last.delivered)} <span className="text-[10px] text-slate-400">{unit}</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500">{last.longLabel}</div>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">เดือนพีค</div>
          {(() => {
            const peak = [...months].sort((a, b) => b.delivered - a.delivered)[0];
            return (
              <>
                <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
                  {compactNumber(peak.delivered)} <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500">{peak.longLabel}</div>
              </>
            );
          })()}
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">เฉลี่ย/เดือน</div>
          <div className="mt-0.5 text-base font-bold text-slate-900 dark:text-slate-100">
            {compactNumber(totalDelivered / months.length)}{" "}
            <span className="text-[10px] text-slate-400">{unit}</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500">{months.length} เดือน</div>
        </div>
        <div className="rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Fill rate (ส่ง/สั่ง)</div>
          <div className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">
            {Math.round(fillRate)}<span className="text-[10px] text-slate-400">%</span>
          </div>
          <div className="text-[10px] font-medium text-slate-500">ค้างส่ง {compactNumber(backlog)} {unit}</div>
        </div>
      </div>
    </div>
  );
}
