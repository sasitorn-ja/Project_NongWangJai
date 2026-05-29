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

  // SVG layout
  const W = 1000;
  const H = 280;
  const padL = 48;
  const padR = 36;
  const padT = 32;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(
    ...months.map((m) => Math.max(showDelivered ? m.delivered : 0, showOrdered ? m.ordered : 0)),
    1
  );
  const stepX = months.length > 1 ? innerW / (months.length - 1) : innerW;

  const xy = (i: number, value: number) => ({
    x: months.length === 1 ? padL + innerW / 2 : padL + i * stepX,
    y: padT + innerH - (value / max) * innerH
  });

  const deliveredPts = months.map((m, i) => ({ ...xy(i, m.delivered), data: m }));
  const orderedPts = months.map((m, i) => ({ ...xy(i, m.ordered), data: m }));

  const deliveredPath = deliveredPts
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");
  const deliveredAreaPath = `${deliveredPath} L ${deliveredPts[deliveredPts.length - 1].x} ${padT + innerH} L ${deliveredPts[0].x} ${padT + innerH} Z`;
  const orderedPath = orderedPts
    .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
    .join(" ");

  const last = months[months.length - 1];
  const prev = months.length > 1 ? months[months.length - 2] : null;
  const momPercent = prev && prev.delivered > 0 ? ((last.delivered - prev.delivered) / prev.delivered) * 100 : null;
  const lastPt = deliveredPts[deliveredPts.length - 1];

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
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "#14b8a6" }} />
            <span className={cn("text-slate-600 dark:text-slate-300", !showDelivered && "line-through")}>
              Delivered Volume
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowOrdered((v) => !v)}
            className={cn("inline-flex items-center gap-1.5 transition-opacity", !showOrdered && "opacity-40")}
          >
            <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed" style={{ borderColor: "#2563eb" }} />
            <span className={cn("text-slate-600 dark:text-slate-300", !showOrdered && "line-through")}>
              Ordered Volume
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
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
              </linearGradient>
            </defs>

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

            {/* Ordered (dashed line, no fill) */}
            {showOrdered && (
              <path d={orderedPath} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeDasharray="5 4" opacity="0.75" />
            )}

            {/* Delivered (area + line) */}
            {showDelivered && (
              <>
                <path d={deliveredAreaPath} fill="url(#trend-fill)" />
                <path
                  d={deliveredPath}
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Points */}
            {showDelivered &&
              deliveredPts.map((p, i) => {
                const isLast = i === deliveredPts.length - 1;
                return (
                  <g key={p.data.key}>
                    <circle cx={p.x} cy={p.y} r={isLast ? 6 : 4.5} fill="#fff" stroke="#14b8a6" strokeWidth={isLast ? 3 : 2} />
                    <title>{`${p.data.longLabel}\nDelivered ${formatNumber(p.data.delivered)} ${unit}\nOrdered ${formatNumber(p.data.ordered)} ${unit}\n${formatNumber(p.data.orderCount)} orders`}</title>
                  </g>
                );
              })}

            {/* Last-point badge */}
            {showDelivered && lastPt && (
              <g>
                <rect x={lastPt.x - 36} y={lastPt.y - 28} width="72" height="20" rx="10" fill="#14b8a6" />
                <text x={lastPt.x} y={lastPt.y - 14} fontSize="11" fontWeight="700" fill="#fff" textAnchor="middle">
                  {compactNumber(last.delivered)} {unit}
                </text>
              </g>
            )}

            {/* X-axis labels */}
            {months.map((m, i) => {
              const x = months.length === 1 ? padL + innerW / 2 : padL + i * stepX;
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
