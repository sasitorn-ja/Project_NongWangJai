import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { Dealer } from "@/features/dealers/types";
import { parseDateValue } from "../lib/dates";

export type ChartRange = "all" | "year" | "month" | "day";

type RegionSlice = { color: string; name: string; value: number };
type DealerSlice = { dealerId: number; name: string; region: string; volume: number };

type TimeBucket = {
  dealerList: DealerSlice[];
  dealers: number;
  end: Date;
  groups: number;
  key: string;
  label: string;
  periodLabel: string;
  regions: RegionSlice[];
  start: Date;
  value: number;
};

const REGION_COLORS: Record<string, string> = {
  "CPAC Metro": "#2563eb",
  "CPAC Northeast": "#14b8a6",
  "CPAC West": "#6366f1",
  "CPAC North": "#f59e0b",
  "RMC - South Chain": "#f97316",
  "CPAC East": "#0f766e"
};

const FALLBACK_COLORS = ["#2563eb", "#14b8a6", "#6366f1", "#f59e0b", "#f97316", "#0f766e", "#e11d48", "#7c3aed"];

function getRegionColor(region: string, allRegions: string[]) {
  return REGION_COLORS[region] ?? FALLBACK_COLORS[allRegions.indexOf(region) % FALLBACK_COLORS.length];
}

// ── date helpers ──────────────────────────────────────────────────────────────
function startOfDay(d: Date) { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23, 59, 59, 999); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }
function startOfYear(d: Date) { return new Date(d.getFullYear(), 0, 1); }
function endOfYear(d: Date) { return endOfDay(new Date(d.getFullYear(), 11, 31)); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }

function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function yearKey(d: Date) { return String(d.getFullYear()); }

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("th-TH", opts).format(d);
}

// ── bucket builder ────────────────────────────────────────────────────────────
function buildBuckets(dealers: Dealer[], range: ChartRange): TimeBucket[] {
  const allRegions = [...new Set(dealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));

  if (range === "all") {
    const map = new Map<string, TimeBucket>();
    dealers.forEach((dealer) => {
      const cur = map.get(dealer.region) ?? {
        dealerList: [], dealers: 0, end: new Date(0), groups: 0,
        key: dealer.region, label: dealer.region, periodLabel: dealer.region,
        regions: [], start: new Date(0), value: 0
      };
      cur.dealers += 1;
      cur.groups += dealer.group_count;
      cur.value += dealer.volume;
      cur.dealerList.push({ dealerId: dealer.dealer_id, name: dealer.dealer_name, region: dealer.region, volume: dealer.volume });
      cur.regions = [{ color: getRegionColor(dealer.region, allRegions), name: dealer.region, value: cur.value }];
      map.set(dealer.region, cur);
    });
    return [...map.values()].sort((a, b) => b.value - a.value);
  }

  const rows = dealers
    .map((dealer) => ({ dealer, date: parseDateValue(dealer.last_active_at ?? dealer.updated_at) }))
    .filter((r): r is { dealer: Dealer; date: Date } => Boolean(r.date));

  if (!rows.length) return [];

  const earliest = rows.reduce((e, r) => (r.date < e ? r.date : e), rows[0].date);
  const latest = rows.reduce((l, r) => (r.date > l ? r.date : l), rows[0].date);

  let starts: Date[] = [];
  if (range === "year") {
    for (let c = startOfYear(earliest); c <= startOfYear(latest); c = new Date(c.getFullYear() + 1, 0, 1)) starts.push(c);
  } else if (range === "month") {
    for (let c = startOfMonth(earliest); c <= startOfMonth(latest); c = addMonths(c, 1)) starts.push(c);
  } else {
    const daysInMonth = endOfMonth(latest).getDate();
    starts = Array.from({ length: daysInMonth }, (_, i) => addDays(startOfMonth(latest), i));
  }

  const buckets: TimeBucket[] = starts.map((start) => {
    const end = range === "year" ? endOfYear(start) : range === "month" ? endOfMonth(start) : endOfDay(start);
    const key = range === "year" ? yearKey(start) : range === "month" ? monthKey(start) : dateKey(start);
    const label = range === "year"
      ? String(start.getFullYear() + 543)
      : range === "month"
        ? fmt(start, { month: "short", year: "2-digit" })
        : fmt(start, { day: "numeric", month: "short" });
    const periodLabel = range === "year"
      ? `ปี ${start.getFullYear() + 543}`
      : range === "month"
        ? fmt(start, { month: "long", year: "numeric" })
        : fmt(start, { day: "numeric", month: "long", year: "numeric" });
    return { dealerList: [], dealers: 0, end, groups: 0, key, label, periodLabel, regions: [], start, value: 0 };
  });

  const bucketMap = new Map(buckets.map((b) => [b.key, b]));
  const regionVol = new Map<string, Map<string, number>>();

  rows.forEach(({ dealer, date }) => {
    const bKey = range === "year" ? yearKey(startOfYear(date)) : range === "month" ? monthKey(startOfMonth(date)) : dateKey(startOfDay(date));
    const bucket = bucketMap.get(bKey);
    if (!bucket) return;
    bucket.dealers += 1;
    bucket.groups += dealer.group_count;
    bucket.value += dealer.volume;
    bucket.dealerList.push({ dealerId: dealer.dealer_id, name: dealer.dealer_name, region: dealer.region, volume: dealer.volume });
    const rv = regionVol.get(bKey) ?? new Map<string, number>();
    rv.set(dealer.region, (rv.get(dealer.region) ?? 0) + dealer.volume);
    regionVol.set(bKey, rv);
  });

  buckets.forEach((bucket) => {
    bucket.dealerList.sort((a, b) => b.volume - a.volume);
    const rv = regionVol.get(bucket.key);
    if (!rv) return;
    bucket.regions = [...rv.entries()]
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ color: getRegionColor(name, allRegions), name, value }))
      .sort((a, b) => b.value - a.value);
  });

  return buckets;
}

// ── sub-components ────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc]">
      <div className="text-sm font-semibold text-slate-600">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>
      <div className="text-xs font-medium text-slate-400">ยังไม่มีวันที่ใช้งานล่าสุดสำหรับ dealer ที่เลือก</div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 dark:border-slate-700 dark:bg-slate-900">
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function RegionRow({
  color,
  gap,
  index,
  max,
  name,
  share,
  unit,
  value
}: {
  color: string;
  gap?: number;
  index: number;
  max: number;
  name: string;
  share: number;
  unit: string;
  value: number;
}) {
  return (
    <div className="group grid grid-cols-[22px_minmax(0,1fr)_90px] items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60">
      <span className="text-[11px] font-bold text-slate-400">{index + 1}</span>
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300" title={name}>{name}</span>
          {gap !== undefined && gap > 0 && index === 0 && (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              +{compactNumber(gap)}
            </span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ backgroundColor: color, width: `${Math.max((value / max) * 100, 2)}%` }}
          />
        </div>
      </div>
      <div className="text-right">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{compactNumber(value)} {unit}</span>
        <span className="ml-1 text-[10px] font-semibold text-slate-400">({Math.round(share)}%)</span>
      </div>
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────
export function TimeVolumeBarChart({ dealers, range, unit = "m3" }: { dealers: Dealer[]; range: ChartRange; unit?: string }) {
  const buckets = useMemo(() => buildBuckets(dealers, range), [dealers, range]);
  const [activeKey, setActiveKey] = useState("");

  const defaultBucket = range === "all"
    ? buckets.find((b) => b.value > 0) ?? buckets[0]
    : [...buckets].reverse().find((b) => b.value > 0) ?? buckets[buckets.length - 1];

  const activeBucket = buckets.find((b) => b.key === activeKey) ?? defaultBucket;

  const regions = useMemo(
    () => [...new Set(dealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [dealers]
  );

  const comparisonRegions: RegionSlice[] = range === "all"
    ? buckets.filter((b) => b.value > 0).map((b) => ({
        color: b.regions[0]?.color ?? getRegionColor(b.label, buckets.map((x) => x.label)),
        name: b.label,
        value: b.value
      }))
    : activeBucket?.regions ?? [];

  const comparisonTotal = comparisonRegions.reduce((s, r) => s + r.value, 0);
  const regionMax = Math.max(...comparisonRegions.map((r) => r.value), 1);
  const maxValue = Math.max(...buckets.map((b) => b.value), 1);
  const CHART_H = 200;
  const TICK_COUNT = 4;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => maxValue * (1 - i / TICK_COUNT));

  useEffect(() => {
    if (!buckets.length) return;
    if (!buckets.some((b) => b.key === activeKey)) {
      const id = window.setTimeout(() => setActiveKey(defaultBucket.key), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [activeKey, buckets, defaultBucket]);

  if (!buckets.length) return <EmptyState />;

  const gap = comparisonRegions.length >= 2 ? comparisonRegions[0].value - comparisonRegions[1].value : undefined;

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {regions.map((region) => (
          <div key={region} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: getRegionColor(region, regions) }} />
            {region}
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-[#fbfcfd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid min-w-[640px] grid-cols-[48px_minmax(0,1fr)] gap-2">
          {/* Y-axis */}
          <div className="relative" style={{ height: CHART_H }}>
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute right-2 text-right text-[10px] font-semibold text-slate-400"
                style={{ top: `${(i / TICK_COUNT) * 100}%`, transform: "translateY(-50%)" }}
              >
                {compactNumber(tick)}
              </div>
            ))}
          </div>

          {/* Bars */}
          <div className="relative" style={{ height: CHART_H }}>
            {ticks.map((_, i) => (
              <div
                key={i}
                className="absolute inset-x-0 h-px bg-[#edf2f4] dark:bg-slate-800"
                style={{ top: `${(i / TICK_COUNT) * 100}%` }}
              />
            ))}
            <div
              className="grid h-full items-end gap-1.5 px-1"
              style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(32px, 1fr))` }}
            >
              {buckets.map((bucket) => {
                const isActive = bucket.key === activeBucket?.key;
                const barH = bucket.value > 0 ? Math.max((bucket.value / maxValue) * 100, 2) : 0;
                return (
                  <button
                    key={bucket.key}
                    aria-pressed={isActive}
                    className="group relative flex h-full flex-col justify-end outline-none"
                    title={`${bucket.periodLabel}: ${formatNumber(bucket.value)} ${unit}`}
                    type="button"
                    onClick={() => setActiveKey(bucket.key)}
                    onMouseEnter={() => setActiveKey(bucket.key)}
                  >
                    {/* Hover bg */}
                    <div className={cn(
                      "absolute inset-x-0 bottom-0 rounded-xl transition-colors",
                      isActive ? "bg-slate-100/80 dark:bg-slate-800/60" : "bg-transparent group-hover:bg-slate-50 dark:group-hover:bg-slate-900/40"
                    )} style={{ top: "-4px" }} />

                    {/* Value label */}
                    <div className="relative mb-1 text-center text-[10px] font-bold leading-none text-slate-600 dark:text-slate-300">
                      {bucket.value > 0 ? compactNumber(bucket.value) : ""}
                    </div>

                    {/* Stacked bar */}
                    <div
                      className={cn(
                        "relative flex w-full flex-col-reverse overflow-hidden rounded-t-lg transition-all",
                        isActive ? "ring-2 ring-slate-700 ring-offset-1 dark:ring-slate-400" : ""
                      )}
                      style={{ height: `${barH}%` }}
                    >
                      {bucket.regions.map((region) => (
                        <div
                          key={region.name}
                          className="w-full border-t border-white/20 transition-opacity group-hover:opacity-90"
                          style={{
                            backgroundColor: region.color,
                            height: `${Math.max((region.value / Math.max(bucket.value, 1)) * 100, 2)}%`
                          }}
                        />
                      ))}
                      {bucket.value === 0 && (
                        <div className="w-full rounded-full bg-slate-200 dark:bg-slate-700" style={{ height: "3px" }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div /> {/* spacer */}
          <div
            className="grid gap-1.5 px-1 pt-2"
            style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(32px, 1fr))` }}
          >
            {buckets.map((bucket) => (
              <div
                key={bucket.key}
                className="truncate text-center text-[10px] font-semibold text-slate-400"
                title={bucket.periodLabel}
              >
                {bucket.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {activeBucket && (
        <div className="rounded-2xl border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950">
          {/* Header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0f2f4] px-4 py-3 dark:border-slate-800">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {range === "all" ? "ภูมิภาค" : "ช่วงที่เลือก"}
              </span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{activeBucket.periodLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatChip label="Volume" value={`${compactNumber(activeBucket.value)} ${unit}`} />
              <StatChip label="Dealers" value={formatNumber(activeBucket.dealers)} />
              <StatChip label="Groups" value={formatNumber(activeBucket.groups)} />
              {gap !== undefined && comparisonRegions.length >= 2 && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 dark:bg-emerald-950/40">
                  <span className="text-[11px] font-semibold text-emerald-600">อันดับ 1 นำห่าง</span>
                  <span className="text-sm font-bold text-emerald-700">+{compactNumber(gap)} {unit}</span>
                </div>
              )}
            </div>
          </div>

          {/* Body: region breakdown + top dealers */}
          <div className="grid divide-y divide-[#f0f2f4] dark:divide-slate-800 lg:grid-cols-[minmax(0,1fr)_280px] lg:divide-x lg:divide-y-0">
            {/* Region breakdown */}
            <div className="p-3">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {range === "all" ? "ภูมิภาคทั้งหมด" : "แยกตามภูมิภาค"}
              </p>
              {comparisonRegions.length > 0 ? (
                <div className="grid gap-0.5 sm:grid-cols-2">
                  {comparisonRegions.map((region, i) => (
                    <RegionRow
                      key={region.name}
                      color={region.color}
                      gap={i === 0 ? gap : undefined}
                      index={i}
                      max={regionMax}
                      name={region.name}
                      share={comparisonTotal > 0 ? (region.value / comparisonTotal) * 100 : 0}
                      unit={unit}
                      value={region.value}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-sm font-medium text-slate-400">ช่วงนี้ยังไม่มี volume จากภูมิภาคใด</p>
              )}
            </div>

            {/* Top dealers */}
            <div className="p-3">
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Top Dealers
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">
                  {activeBucket.dealerList.length}
                </span>
              </p>
              {activeBucket.dealerList.length > 0 ? (
                <div className="space-y-0.5">
                  {activeBucket.dealerList.slice(0, 6).map((dealer, i) => {
                    const color = getRegionColor(dealer.region, regions);
                    const share = activeBucket.value > 0 ? (dealer.volume / activeBucket.value) * 100 : 0;
                    return (
                      <div
                        key={dealer.dealerId}
                        className="grid grid-cols-[18px_minmax(0,1fr)_64px] items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                      >
                        <span className="text-[10px] font-bold text-slate-400">{i + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                            <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300" title={dealer.name}>
                              {dealer.name}
                            </span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ backgroundColor: color, width: `${Math.max(share, 2)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {compactNumber(dealer.volume)} {unit}
                        </div>
                      </div>
                    );
                  })}
                  {activeBucket.dealerList.length > 6 && (
                    <p className="px-2 pt-1 text-[10px] font-semibold text-slate-400">
                      +{activeBucket.dealerList.length - 6} dealers อื่นๆ
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-xs font-medium text-slate-400">ไม่มี dealer ในช่วงนี้</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
