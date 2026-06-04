import { Fragment, useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { Dealer } from "@/features/dealers/types";
import { DropdownSelect } from "../filters/DropdownSelect";
import { parseDateValue } from "../lib/dates";
import { getRegionColor } from "../lib/regions";

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
function dateFromMonthKey(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return new Date(year, month - 1, 1);
}
function dateFromDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}

function fmt(d: Date, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("th-TH", opts).format(d);
}

// ── bucket builder ────────────────────────────────────────────────────────────
function buildBuckets(
  dealers: Dealer[],
  range: ChartRange,
  focusRange?: { from?: string; to?: string }
): TimeBucket[] {
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

  const starts: Date[] = [];
  if (range === "year") {
    for (let c = startOfYear(earliest); c <= startOfYear(latest); c = new Date(c.getFullYear() + 1, 0, 1)) starts.push(c);
  } else if (range === "month") {
    const rawFrom = focusRange?.from ? dateFromMonthKey(focusRange.from) : null;
    const rawTo = focusRange?.to ? dateFromMonthKey(focusRange.to) : null;
    const from = startOfYear(rawFrom ?? rawTo ?? latest);
    const to = startOfYear(rawTo ?? rawFrom ?? latest);
    const start = from <= to ? from : to;
    const end = from <= to ? endOfYear(to) : endOfYear(from);
    for (let c = start; c <= end; c = addMonths(c, 1)) starts.push(c);
  } else {
    const rawFrom = focusRange?.from ? dateFromDateKey(focusRange.from) : null;
    const rawTo = focusRange?.to ? dateFromDateKey(focusRange.to) : null;
    const defaultStart = startOfMonth(latest);
    const defaultEnd = endOfMonth(latest);
    const from = startOfDay(rawFrom ?? defaultStart);
    const to = startOfDay(rawTo ?? defaultEnd);
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    for (let c = start; c <= end; c = addDays(c, 1)) starts.push(c);
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
    <div className="flex h-[220px] flex-col items-center justify-center gap-2">
      <div className="text-sm font-semibold text-slate-600">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>
      <div className="text-xs font-medium text-slate-400">ยังไม่มีวันที่ใช้งานล่าสุดสำหรับ dealer ที่เลือก</div>
    </div>
  );
}

// Donut – inline SVG with segments + hover state
function Donut({
  segments,
  size = 150,
  hoveredIdx,
  onHover
}: {
  segments: { color: string; value: number; label: string }[];
  size?: number;
  hoveredIdx: number | null;
  onHover: (idx: number | null) => void;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const radius = size / 2;
  const innerR = radius * 0.72;
  const cx = radius;
  const cy = radius;

  const segmentRanges = segments.reduce<{ start: number; end: number }[]>((arr, seg) => {
    const prev = arr.length ? arr[arr.length - 1].end : 0;
    arr.push({ start: prev, end: prev + seg.value });
    return arr;
  }, []);

  const paths = segments.map((seg, idx) => {
    const { start: startVal, end: endVal } = segmentRanges[idx];
    const start = (startVal / total) * Math.PI * 2 - Math.PI / 2;
    const end = (endVal / total) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    const large = end - start > Math.PI ? 1 : 0;
    const isHovered = hoveredIdx === idx;
    const isDimmed = hoveredIdx !== null && !isHovered;
    const commonProps = {
      style: {
        transition: "opacity .15s, transform .15s",
        opacity: isDimmed ? 0.35 : 1,
        cursor: "pointer",
        transformOrigin: `${cx}px ${cy}px`,
        transform: isHovered ? "scale(1.03)" : "scale(1)"
      } as React.CSSProperties,
      onMouseEnter: () => onHover(idx),
      onMouseLeave: () => onHover(null)
    };

    if (segments.length === 1 || seg.value === total) {
      return (
        <g key={idx} {...commonProps}>
          <circle cx={cx} cy={cy} r={(radius + innerR) / 2} fill="none" stroke={seg.color} strokeWidth={radius - innerR} />
        </g>
      );
    }
    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4}`,
      "Z"
    ].join(" ");
    return (
      <path key={idx} d={d} fill={seg.color} {...commonProps}>
        <title>{`${seg.label}: ${compactNumber(seg.value)} (${Math.round((seg.value / total) * 100)}%)`}</title>
      </path>
    );
  });

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {paths}
    </svg>
  );
}

// ── region filter (rendered by parent in the toolbar) ───────────────────────────
export function RegionFilterPanel({
  allRegions,
  regionTotalVolumes,
  selectedRegions,
  onChange,
  totalAllVolume,
  unit = "m3"
}: {
  allRegions: string[];
  regionTotalVolumes: Map<string, number>;
  selectedRegions: string[] | null;
  onChange: (next: string[] | null) => void;
  totalAllVolume: number;
  unit?: string;
}) {
  const effective = selectedRegions ?? allRegions;
  const selectedSet = new Set(effective);

  const toggle = (region: string) => {
    const current = selectedRegions ?? allRegions;
    if (current.includes(region)) onChange(current.filter((r) => r !== region));
    else onChange([...current, region]);
  };

  return (
    <div className="rounded-xl bg-slate-50/70 px-3 py-2.5 dark:bg-slate-900/40">
      <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onChange(null)} className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-white dark:hover:bg-slate-800">
            ทั้งหมด
          </button>
          <button type="button" onClick={() => onChange([])} className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-slate-500 hover:bg-white dark:hover:bg-slate-800">
            ล้าง
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allRegions.map((region) => {
          const active = selectedSet.has(region);
          const color = getRegionColor(region, allRegions);
          return (
            <button
              key={region}
              type="button"
              onClick={() => toggle(region)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                active ? "text-white" : "bg-white text-slate-500 hover:text-slate-700 dark:bg-slate-900 dark:text-slate-400"
              )}
              style={active ? { backgroundColor: color } : undefined}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? "#fff" : color }} />
              {region}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────
export type ChartFocusRange = { from?: string; to?: string };

export function TimeVolumeBarChart({
  dealers,
  focusRange,
  range,
  selectedRegions = null,
  unit = "m3",
  headerControls,
  regionFilterPanel,
  regionSummary
}: {
  dealers: Dealer[];
  focusRange?: ChartFocusRange;
  range: ChartRange;
  selectedRegions?: string[] | null;
  unit?: string;
  headerControls?: React.ReactNode;
  regionFilterPanel?: React.ReactNode;
  regionSummary?: React.ReactNode;
}) {
  const [activeKey, setActiveKey] = useState("");
  const [dealerRegionFilter, setDealerRegionFilter] = useState<string>("");
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);
  const [dealerPage, setDealerPage] = useState(0);

  const allRegions = useMemo(
    () => [...new Set(dealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [dealers]
  );

  const effectiveSelectedRegions = selectedRegions ?? allRegions;
  const selectedRegionSet = useMemo(() => new Set(effectiveSelectedRegions), [effectiveSelectedRegions]);

  const visibleDealers = useMemo(() => {
    if (selectedRegionSet.size === allRegions.length) return dealers;
    if (selectedRegionSet.size === 0) return [];
    return dealers.filter((d) => selectedRegionSet.has(d.region));
  }, [dealers, selectedRegionSet, allRegions]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buckets = useMemo(() => buildBuckets(visibleDealers, range, focusRange), [visibleDealers, focusRange?.from, focusRange?.to, range]);

  const defaultBucket = range === "all"
    ? buckets.find((b) => b.value > 0) ?? buckets[0]
    : [...buckets].reverse().find((b) => b.value > 0) ?? buckets[buckets.length - 1];

  const activeBucket = buckets.find((b) => b.key === activeKey) ?? defaultBucket;

  const regions = useMemo(
    () => [...new Set(visibleDealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [visibleDealers]
  );

  const comparisonRegions: RegionSlice[] = range === "all"
    ? buckets.filter((b) => b.value > 0).map((b) => ({
        color: b.regions[0]?.color ?? getRegionColor(b.label, buckets.map((x) => x.label)),
        name: b.label,
        value: b.value
      }))
    : activeBucket?.regions ?? [];

  const comparisonTotal = comparisonRegions.reduce((s, r) => s + r.value, 0);
  const rankedRegions = [...comparisonRegions].sort((a, b) => b.value - a.value);
  const rankMax = rankedRegions[0]?.value ?? 1;

  const maxValue = Math.max(...buckets.map((b) => b.value), 1);
  const CHART_H = 150;
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

  if (selectedRegionSet.size === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-1 text-center">
        <div className="text-sm font-semibold text-amber-600">ยังไม่ได้เลือกภูมิภาค</div>
        <div className="text-xs font-medium text-slate-400">กดปุ่ม "ทั้งหมด" ในตัวกรองด้านบนเพื่อดูข้อมูล</div>
      </div>
    );
  }

  if (!buckets.length) return <EmptyState />;

  const donutSegments = rankedRegions.map((r) => ({ color: r.color, label: r.name, value: r.value }));

  const dealerFilterRegions = rankedRegions.map((r) => r.name);
  const filteredDealers = dealerRegionFilter
    ? (activeBucket?.dealerList.filter((d) => d.region === dealerRegionFilter) ?? [])
    : (activeBucket?.dealerList ?? []);
  const dealerLeaderboardMax = filteredDealers[0]?.volume ?? 1;
  const dealerPageSize = 5;
  const dealerPageCount = Math.max(1, Math.ceil(filteredDealers.length / dealerPageSize));
  const currentDealerPage = Math.min(dealerPage, dealerPageCount - 1);
  const dealerPageStart = currentDealerPage * dealerPageSize;
  const pagedDealers = filteredDealers.slice(dealerPageStart, dealerPageStart + dealerPageSize);
  const dealerPageItems = Array.from({ length: dealerPageCount }, (_, index) => index).filter((page) => {
    if (dealerPageCount <= 5) return true;
    return page === 0 || page === dealerPageCount - 1 || Math.abs(page - currentDealerPage) <= 1;
  });

  return (
    <div className="space-y-3">
      {/* ── Period navigator (time ranges) — full width on top ── */}
      {range !== "all" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              แนวโน้มปริมาณการส่งมอบราย{range === "year" ? "ปี" : range === "month" ? "เดือน" : "วัน"}
            </h4>
            <p className="text-[11px] text-slate-400">แสดงแนวโน้มของทุกภูมิภาคเปรียบเทียบกันตามสัดส่วนการส่งมอบ</p>
          </div>
          <div className="grid min-w-[420px] grid-cols-[40px_minmax(0,1fr)] gap-2">
            <div className="relative" style={{ height: CHART_H }}>
              {ticks.map((tick, i) => (
                <div
                  key={i}
                  className="absolute right-1 text-right text-[10px] font-semibold text-slate-400"
                  style={{ top: `${(i / TICK_COUNT) * 100}%`, transform: "translateY(-50%)" }}
                >
                  {compactNumber(tick)}
                </div>
              ))}
            </div>
            <div className="relative" style={{ height: CHART_H }}>
              {ticks.map((_, i) => (
                <div key={i} className="absolute inset-x-0 h-px bg-[#edf2f4] dark:bg-slate-800" style={{ top: `${(i / TICK_COUNT) * 100}%` }} />
              ))}
              <div className="grid h-full items-end gap-1 px-1" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(20px, 1fr))` }}>
	                {buckets.map((bucket) => {
	                  const isActive = bucket.key === activeBucket?.key;
	                  const barH = bucket.value > 0 ? Math.max((bucket.value / maxValue) * 100, 2) : 0;
	                  const displayBarH = bucket.value > 0 ? barH : range === "month" ? 14 : 0;
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
                      <div className="relative mb-1 text-center text-[9px] font-bold leading-none text-slate-500 dark:text-slate-300">
                        {bucket.value > 0 ? compactNumber(bucket.value) : ""}
                      </div>
                      <div
                        className={cn(
                          "relative flex w-full flex-col-reverse overflow-hidden rounded-t-md transition-all",
                          isActive ? "ring-2 ring-slate-700 ring-offset-1 dark:ring-slate-400" : ""
                        )}
	                        style={{ height: `${displayBarH}%` }}
	                      >
                        {bucket.regions.map((region) => (
                          <div
                            key={region.name}
                            className="w-full border-t border-white/20 transition-opacity group-hover:opacity-90"
                            style={{ backgroundColor: region.color, height: `${Math.max((region.value / Math.max(bucket.value, 1)) * 100, 2)}%` }}
                          />
                        ))}
	                        {bucket.value === 0 && (
	                          <div
	                            className={cn(
	                              "w-full rounded-t-md",
	                              range === "month" ? "bg-slate-200/80 dark:bg-slate-700/80" : "bg-slate-200 dark:bg-slate-700"
	                            )}
	                            style={{ height: "100%" }}
	                          />
	                        )}
	                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div />
            <div className="grid gap-1 px-1 pt-1.5" style={{ gridTemplateColumns: `repeat(${buckets.length}, minmax(20px, 1fr))` }}>
              {buckets.map((bucket) => (
	                <div key={bucket.key} className="truncate text-center text-[10px] font-semibold text-slate-400" title={bucket.periodLabel}>
                  {bucket.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar — range + region controls (kept above the cards, like the mockup keeps cards clean) */}
      {(headerControls || regionFilterPanel) && (
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{regionSummary}</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {headerControls}
            </div>
          </div>
          {regionFilterPanel && <div className="mt-2">{regionFilterPanel}</div>}
        </div>
      )}

      {/* Bento Grid Layout — 3 equal columns */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* Card 1 — Ranked regions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-[#eef0f4] pb-3 mb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">ปริมาณการขายแยกตามพื้นที่ของ Dealer</h3>
                <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                  ยอดขายสะสมแยกตามพื้นที่การจัดส่งคอนกรีต
                </p>
              </div>
              <span className="shrink-0 whitespace-nowrap pt-0.5 text-[11px] font-medium text-slate-400">หน่วย : {unit}</span>
            </div>

            <div className="space-y-3 mt-4">
              {rankedRegions.length > 0 ? (
                rankedRegions.map((region, i) => {
                  const pct = comparisonTotal > 0 ? (region.value / comparisonTotal) * 100 : 0;
                  const w = (region.value / rankMax) * 100;
                  return (
                    <div key={region.name}>
	                      <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">
                          <span className="mr-1.5 text-slate-400">{i + 1}</span>
                          {region.name}
                        </span>
                        <span className="shrink-0 font-bold text-slate-800 dark:text-slate-100">
	                          {compactNumber(region.value)} <span className="text-[11px] font-medium text-slate-400">{unit} · {Math.round(pct)}%</span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(w, 2)}%`, backgroundColor: region.color }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-6 text-center text-xs font-medium text-slate-400">ไม่มีข้อมูลในช่วงนี้</p>
              )}
            </div>
          </div>
          
          <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            ใช้แถบด้านบนเพื่อสลับช่วงเวลา แล้วเลือกภูมิภาคเพื่อเจาะดู dealer ในช่วงนั้น
          </div>
        </div>

        {/* Card 2 — Donut */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col">
	          <div className="border-b border-[#eef0f4] pb-2.5 mb-2 dark:border-slate-800">
            <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">สัดส่วนพื้นที่ขาย</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-400">สัดส่วนร้อยละจำแนกตามภูมิภาค</p>
          </div>
          {donutSegments.length > 0 ? (
	            <div className="flex flex-col items-center gap-3 my-auto">
	              <div className="relative shrink-0" style={{ width: 168, height: 168 }}>
	                <Donut segments={donutSegments} size={168} hoveredIdx={hoveredDonutIdx} onHover={setHoveredDonutIdx} />
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  {hoveredDonutIdx !== null && donutSegments[hoveredDonutIdx] ? (
                    <>
	                      <span className="max-w-[90px] truncate text-[10px] font-semibold text-slate-500">{donutSegments[hoveredDonutIdx].label}</span>
	                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{compactNumber(donutSegments[hoveredDonutIdx].value)}</span>
                      <span className="text-[10px] font-bold" style={{ color: donutSegments[hoveredDonutIdx].color }}>
                        {Math.round((donutSegments[hoveredDonutIdx].value / comparisonTotal) * 100)}%
                      </span>
                    </>
                  ) : (
                    <>
	                      <span className="text-[10px] font-semibold text-slate-400">Total</span>
	                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{compactNumber(comparisonTotal)}</span>
	                      <span className="text-[10px] font-semibold text-slate-400">{unit}</span>
                    </>
                  )}
                </div>
              </div>
	              <div className="w-full grid grid-cols-2 gap-x-2 gap-y-1 pt-0">
                {donutSegments.slice(0, 6).map((seg) => {
                  const pct = comparisonTotal > 0 ? (seg.value / comparisonTotal) * 100 : 0;
                  return (
	                    <div key={seg.label} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400" title={seg.label}>{seg.label}</span>
                      <span className="shrink-0 font-bold text-slate-800 dark:text-slate-200">{Math.round(pct)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-xs font-medium text-slate-400 my-auto">ไม่มีข้อมูลในช่วงนี้</p>
          )}
        </div>

        {/* Card 3 — Leaderboard */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#eef0f4] pb-3 mb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-950 dark:text-slate-50">Dealer Leaderboard</h3>
	                <p className="mt-0.5 text-[11px] font-medium text-slate-400">ยอดขายสูงสุดราย Dealer</p>
              </div>
              {dealerFilterRegions.length > 1 && (
                <DropdownSelect
	                  buttonClassName="h-9 rounded-lg px-2.5 text-xs font-semibold shadow-none"
                  className="w-[190px] shrink-0"
                  menuClassName="left-auto right-0 w-[260px]"
                  options={[
                    { label: "ทุกภูมิภาค", value: "" },
                    ...dealerFilterRegions.map((region) => ({ label: region, value: region }))
                  ]}
                  value={dealerRegionFilter}
                  onChange={(value) => {
                    setDealerRegionFilter(value);
                    setDealerPage(0);
                  }}
                />
              )}
            </div>
            
            <div className="space-y-2">
              {filteredDealers.length > 0 ? (
                <div className="space-y-2">
                  {pagedDealers.map((dealer, i) => {
                    const color = getRegionColor(dealer.region, regions);
                    const share = (activeBucket?.value ?? 0) > 0 ? (dealer.volume / (activeBucket?.value ?? 1)) * 100 : 0;
                    const barShare = dealerLeaderboardMax > 0 ? (dealer.volume / dealerLeaderboardMax) * 100 : 0;
                    const rank = dealerPageStart + i + 1;
                    return (
                      <div key={dealer.dealerId} className="flex items-center gap-3 border-b border-[#f8fafc] pb-2 last:border-0 last:pb-0 dark:border-slate-900">
                        <span className={cn(
	                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          rank === 1 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                            : rank === 2 ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                            : rank === 3 ? "bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400"
                            : "bg-slate-50 text-slate-400 dark:bg-slate-900"
                        )}>
                          {rank}
                        </span>
                        <div className="min-w-0 flex-1">
	                          <span className="block truncate text-[13px] font-bold text-slate-800 dark:text-slate-200" title={dealer.name}>{dealer.name}</span>
                          <div className="mt-1 flex items-center gap-1.5">
	                            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ backgroundColor: `${color}15`, color }}>{dealer.region.replace("CPAC ", "")}</span>
                            <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${Math.max(barShare, 2)}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
	                          <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">{compactNumber(dealer.volume)}</p>
	                          <p className="text-[10px] font-semibold text-slate-400">{unit}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-xs font-medium text-slate-400">ไม่มี dealer ในช่วงนี้</p>
              )}
            </div>
          </div>
          {filteredDealers.length > dealerPageSize && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#eef0f4] pt-3 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-400">
                แสดง {dealerPageStart + 1}-{Math.min(dealerPageStart + dealerPageSize, filteredDealers.length)} จาก {filteredDealers.length} ราย
              </p>
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                <button
                  type="button"
                  disabled={currentDealerPage === 0}
                  onClick={() => setDealerPage((page) => Math.max(0, page - 1))}
                  className="rounded-lg border border-[#d9e3e6] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  Previous
                </button>
                {dealerPageItems.map((page, index) => (
                  <Fragment key={page}>
                    {index > 0 && page - dealerPageItems[index - 1] > 1 && (
                      <span className="px-1 text-[11px] font-bold text-slate-400">...</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setDealerPage(page)}
                      className={cn(
                        "min-w-7 rounded-lg px-2 py-1.5 text-center text-[11px] font-bold transition-colors",
                        page === currentDealerPage
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                          : "border border-[#d9e3e6] bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      )}
                    >
                      {page + 1}
                    </button>
                  </Fragment>
                ))}
                <button
                  type="button"
                  disabled={currentDealerPage >= dealerPageCount - 1}
                  onClick={() => setDealerPage((page) => Math.min(dealerPageCount - 1, page + 1))}
                  className="rounded-lg border border-[#d9e3e6] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
