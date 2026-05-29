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
  "CPAC Metro": "#3b82f6",
  "CPAC Northeast": "#14b8a6",
  "CPAC West": "#8b5cf6",
  "CPAC North": "#06b6d4",
  "RMC - South Chain": "#f59e0b",
  "CPAC East": "#10b981"
};

const FALLBACK_COLORS = ["#3b82f6", "#14b8a6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#e11d48", "#7c3aed"];

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
    const from = startOfMonth(rawFrom ?? earliest);
    const to = startOfMonth(rawTo ?? latest);
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
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
    <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d9e3e6] bg-[#fbfcfc]">
      <div className="text-sm font-semibold text-slate-600">ไม่มีข้อมูลสำหรับแสดงกราฟ</div>
      <div className="text-xs font-medium text-slate-400">ยังไม่มีวันที่ใช้งานล่าสุดสำหรับ dealer ที่เลือก</div>
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: string; tone?: "default" | "accent" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5",
        tone === "accent"
          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/40"
          : "border-[#e5e7eb] bg-white dark:border-slate-700 dark:bg-slate-900"
      )}
    >
      <span className={cn("text-[11px] font-semibold", tone === "accent" ? "text-emerald-600" : "text-slate-400")}>{label}</span>
      <span className={cn("text-sm font-bold", tone === "accent" ? "text-emerald-700" : "text-slate-900 dark:text-slate-100")}>
        {value}
      </span>
    </div>
  );
}

// Sparkline – plain SVG, no deps
function Sparkline({ values, color, height = 28 }: { values: number[]; color: string; height?: number }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = 0;
  const w = 100;
  const h = height;
  const stepX = values.length > 1 ? w / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${i * stepX},${y}`;
  });
  const lastX = (values.length - 1) * stepX;
  const lastY = h - ((values[values.length - 1] - min) / (max - min || 1)) * (h - 4) - 2;
  const areaPath = `M0,${h} L${pts.join(" L")} L${lastX},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace("#", "")})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={pts.join(" ")}
        vectorEffect="non-scaling-stroke"
      />
      {/* Final dot */}
      <circle cx={lastX} cy={lastY} r="1.6" fill={color} />
    </svg>
  );
}

// Donut – inline SVG with segments + hover state
function Donut({
  segments,
  size = 180,
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

    // single-segment full circle fallback
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

function RegionCard({
  active,
  color,
  current,
  dealerCount,
  delta,
  isLeader,
  name,
  rank,
  share,
  trend,
  unit
}: {
  active: boolean;
  color: string;
  current: number;
  dealerCount: number;
  delta: number | null;
  isLeader: boolean;
  name: string;
  rank: number;
  share: number;
  trend: number[];
  unit: string;
}) {
  if (!active) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#d9e3e6] bg-[#fbfcfd] p-3 opacity-60 dark:border-slate-800 dark:bg-slate-950/40">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold text-slate-400" title={name}>{name}</p>
            <p className="mt-1 text-xl font-bold text-slate-400">
              0 <span className="text-xs font-semibold">{unit}</span>
            </p>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-medium text-slate-400">ไม่มียอดในช่วงนี้</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-white p-3 transition-shadow hover:shadow-md dark:bg-slate-950",
        isLeader ? "border-transparent ring-1" : "border-[#e5e7eb] dark:border-slate-800"
      )}
      style={isLeader ? { boxShadow: `inset 0 0 0 1.5px ${color}55`, background: `linear-gradient(135deg, ${color}10 0%, #ffffff 60%)` } : undefined}
    >
      {/* Subtle bg orb */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10"
        style={{ backgroundColor: color }}
      />
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <p className="truncate text-[11px] font-semibold text-slate-500" title={name}>{name}</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {compactNumber(current)}
            <span className="ml-1 text-xs font-semibold text-slate-400">{unit}</span>
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
            isLeader ? "text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
          )}
          style={isLeader ? { backgroundColor: color } : undefined}
        >
          #{rank}
        </span>
      </div>

      <div className="relative mt-2 flex items-center justify-between text-[10px] font-semibold">
        {delta !== null && delta !== 0 ? (
          <span className={delta > 0 ? "text-emerald-600" : "text-rose-600"}>
            {delta > 0 ? "↑" : "↓"} {compactNumber(Math.abs(delta))} {unit}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
        <span className="text-slate-400">
          {Math.round(share)}% · {dealerCount} dealer{dealerCount === 1 ? "" : "s"}
        </span>
      </div>

      {trend.length > 1 && (
        <div className="relative mt-2 h-7">
          <Sparkline values={trend} color={color} height={28} />
        </div>
      )}
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────
export type ChartFocusRange = { from?: string; to?: string };

export function TimeVolumeBarChart({
  dealers,
  focusRange,
  range,
  unit = "m3"
}: {
  dealers: Dealer[];
  focusRange?: ChartFocusRange;
  range: ChartRange;
  unit?: string;
}) {
  const [activeKey, setActiveKey] = useState("");
  const [dealerRegionFilter, setDealerRegionFilter] = useState<string>("");
  const [hoveredDonutIdx, setHoveredDonutIdx] = useState<number | null>(null);
  const [showAllDealers, setShowAllDealers] = useState(false);

  // Region filter state: null = all regions selected (default)
  const [selectedRegions, setSelectedRegions] = useState<string[] | null>(null);

  // Full region list (for filter chips) — derived from unfiltered dealers
  const allRegions = useMemo(
    () => [...new Set(dealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [dealers]
  );

  // Effective selected regions (null = all)
  const effectiveSelectedRegions = selectedRegions ?? allRegions;
  const selectedRegionSet = useMemo(() => new Set(effectiveSelectedRegions), [effectiveSelectedRegions]);

  // Dealers filtered by selected regions
  const visibleDealers = useMemo(() => {
    if (selectedRegionSet.size === allRegions.length) return dealers;
    if (selectedRegionSet.size === 0) return [];
    return dealers.filter((d) => selectedRegionSet.has(d.region));
  }, [dealers, selectedRegionSet, allRegions]);

  // All-time volume per region (for chip labels)
  const regionTotalVolumes = useMemo(() => {
    const map = new Map<string, number>();
    dealers.forEach((d) => {
      if (!d.region) return;
      map.set(d.region, (map.get(d.region) ?? 0) + d.volume);
    });
    return map;
  }, [dealers]);

  const totalAllVolume = useMemo(() => dealers.reduce((s, d) => s + d.volume, 0), [dealers]);
  const totalSelectedVolume = useMemo(() => visibleDealers.reduce((s, d) => s + d.volume, 0), [visibleDealers]);
  const selectedPercent = totalAllVolume > 0 ? (totalSelectedVolume / totalAllVolume) * 100 : 0;

  const toggleRegion = (region: string) => {
    setSelectedRegions((prev) => {
      const current = prev ?? allRegions;
      if (current.includes(region)) return current.filter((r) => r !== region);
      return [...current, region];
    });
  };
  const selectAllRegions = () => setSelectedRegions(null);
  const clearAllRegions = () => setSelectedRegions([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const buckets = useMemo(() => buildBuckets(visibleDealers, range, focusRange), [visibleDealers, focusRange?.from, focusRange?.to, range]);

  const defaultBucket = range === "all"
    ? buckets.find((b) => b.value > 0) ?? buckets[0]
    : [...buckets].reverse().find((b) => b.value > 0) ?? buckets[buckets.length - 1];

  const activeBucket = buckets.find((b) => b.key === activeKey) ?? defaultBucket;
  const activeIndex = activeBucket ? buckets.findIndex((b) => b.key === activeBucket.key) : -1;
  const prevBucket = activeIndex > 0 ? buckets[activeIndex - 1] : undefined;

  // Active regions for chart-internal use (cards/colors) — only selected ones
  const regions = useMemo(
    () => [...new Set(visibleDealers.map((d) => d.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th")),
    [visibleDealers]
  );

  // Per-region trend across all buckets
  const regionTrends = useMemo(() => {
    const map = new Map<string, number[]>();
    regions.forEach((region) => {
      map.set(
        region,
        buckets.map((b) => b.regions.find((r) => r.name === region)?.value ?? 0)
      );
    });
    return map;
  }, [buckets, regions]);

  // Active comparison set (per current view)
  const comparisonRegions: RegionSlice[] = range === "all"
    ? buckets.filter((b) => b.value > 0).map((b) => ({
        color: b.regions[0]?.color ?? getRegionColor(b.label, buckets.map((x) => x.label)),
        name: b.label,
        value: b.value
      }))
    : activeBucket?.regions ?? [];

  const comparisonTotal = comparisonRegions.reduce((s, r) => s + r.value, 0);
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

  const RegionFilter = (
    <div className="rounded-2xl border border-[#e2e8f0] bg-gradient-to-b from-slate-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">เลือกภูมิภาคที่จะดู</span>
          <span className="text-[11px] font-semibold text-slate-400">·</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            {selectedRegionSet.size} / {allRegions.length} พื้นที่
          </span>
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={selectAllRegions}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            เลือกทั้งหมด
          </button>
          <button
            type="button"
            onClick={clearAllRegions}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ล้างการเลือก
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allRegions.map((region) => {
          const active = selectedRegionSet.has(region);
          const color = getRegionColor(region, allRegions);
          const vol = regionTotalVolumes.get(region) ?? 0;
          return (
            <button
              key={region}
              type="button"
              onClick={() => toggleRegion(region)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all",
                active
                  ? "text-white shadow-sm"
                  : "border border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
              )}
              style={active ? { backgroundColor: color } : undefined}
            >
              {active ? (
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="3,8.5 7,12.5 13,4.5" />
                </svg>
              ) : (
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              )}
              <span>{region}</span>
              <span className={active ? "opacity-80" : "text-slate-400"}>· {compactNumber(vol)}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-slate-200/60 pt-2.5 text-[11px] dark:border-slate-700/60">
        <span>
          <span className="font-semibold uppercase tracking-wider text-slate-400">รวมที่เลือก: </span>
          <strong className="font-bold text-slate-900 dark:text-slate-100">{compactNumber(totalSelectedVolume)} {unit}</strong>
        </span>
        <span>
          <span className="font-semibold uppercase tracking-wider text-slate-400">Dealers: </span>
          <strong className="font-bold text-slate-900 dark:text-slate-100">{formatNumber(visibleDealers.length)}</strong>
        </span>
        <span>
          <span className="font-semibold uppercase tracking-wider text-slate-400">% จากยอดทั้งหมด: </span>
          <strong className="font-bold text-slate-900 dark:text-slate-100">{Math.round(selectedPercent)}%</strong>
        </span>
        {selectedRegionSet.size === 0 && (
          <span className="ml-auto text-amber-600 font-semibold">⚠ ยังไม่ได้เลือกภูมิภาค — กดปุ่ม "เลือกทั้งหมด" เพื่อดูข้อมูล</span>
        )}
      </div>
    </div>
  );

  if (!buckets.length) {
    return (
      <div className="space-y-4">
        {RegionFilter}
        <EmptyState />
      </div>
    );
  }

  const regionRanks = new Map(
    regions
      .map((region) => ({
        name: region,
        value: activeBucket?.regions.find((r) => r.name === region)?.value ?? 0
      }))
      .filter((region) => region.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((region, index) => [region.name, index + 1])
  );

  // Region cards: keep legend order stable so hover/period changes do not move cards.
  const regionCards = regions
    .map((region) => {
      const current = activeBucket?.regions.find((r) => r.name === region)?.value ?? 0;
      const previous = prevBucket?.regions.find((r) => r.name === region)?.value ?? 0;
      const dealerCount = activeBucket?.dealerList.filter((d) => d.region === region).length ?? 0;
      const share = comparisonTotal > 0 ? (current / comparisonTotal) * 100 : 0;
      return {
        active: current > 0,
        color: getRegionColor(region, regions),
        current,
        dealerCount,
        delta: prevBucket ? current - previous : null,
        name: region,
        rank: regionRanks.get(region) ?? 0,
        share,
        trend: regionTrends.get(region) ?? []
      };
    });

  const leaderName = regionCards.find((c) => c.rank === 1)?.name;

  // Donut segments (active regions in current bucket)
  const donutSegments = comparisonRegions.map((r) => ({ color: r.color, label: r.name, value: r.value }));

  // Filtered dealers for leaderboard
  const filteredDealers = dealerRegionFilter
    ? (activeBucket?.dealerList.filter((d) => d.region === dealerRegionFilter) ?? [])
    : (activeBucket?.dealerList ?? []);
  const dealerLeaderboardMax = filteredDealers[0]?.volume ?? 1;

  const dealerFilterRegions = regionCards.filter((c) => c.active).map((c) => c.name);

  return (
    <div className="space-y-4">
      {/* Region filter (chip pills) */}
      {RegionFilter}

      {/* Bar chart (period navigator) */}
      <div className="overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-[#fbfcfd] p-4 dark:border-slate-800 dark:bg-slate-950/60">
        <div className="grid min-w-[640px] grid-cols-[48px_minmax(0,1fr)] gap-2">
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
                    <div
                      className={cn(
                        "absolute inset-x-0 bottom-0 rounded-xl transition-colors",
                        isActive ? "bg-slate-100/80 dark:bg-slate-800/60" : "bg-transparent group-hover:bg-slate-50 dark:group-hover:bg-slate-900/40"
                      )}
                      style={{ top: "-4px" }}
                    />
                    <div className="relative mb-1 text-center text-[10px] font-bold leading-none text-slate-600 dark:text-slate-300">
                      {bucket.value > 0 ? compactNumber(bucket.value) : ""}
                    </div>
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

          <div />
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

      {/* ─── V3 Detail Panel ──────────────────────────────────────────────── */}
      {activeBucket && (
        <>
          {/* Period header strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {range === "all" ? "ภูมิภาค" : "ช่วงที่เลือก"}
              </span>
              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-slate-100">{activeBucket.periodLabel}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatChip label="Delivered Volume" value={`${compactNumber(activeBucket.value)} ${unit}`} />
              <StatChip label="Dealers" value={formatNumber(activeBucket.dealers)} />
              <StatChip label="Groups" value={formatNumber(activeBucket.groups)} />
            </div>
          </div>

          {/* Region cards grid (one card per region) */}
          {regions.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6">
              {regionCards.map((card) => (
                <RegionCard
                  key={card.name}
                  active={card.active}
                  color={card.color}
                  current={card.current}
                  dealerCount={card.dealerCount}
                  delta={card.delta}
                  isLeader={card.name === leaderName}
                  name={card.name}
                  rank={card.rank}
                  share={card.share}
                  trend={card.trend}
                  unit={unit}
                />
              ))}
            </div>
          )}

          {/* Donut + Leaderboard split */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            {/* Donut */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  สัดส่วน · {activeBucket.periodLabel}
                </p>
                <span className="text-[10px] font-semibold text-slate-400">
                  {comparisonRegions.length} {range === "all" ? "ภูมิภาค" : "พื้นที่"}
                </span>
              </div>

              {donutSegments.length > 0 ? (
                <>
                  <div className="relative mx-auto" style={{ maxWidth: 200 }}>
                    <Donut
                      segments={donutSegments}
                      size={180}
                      hoveredIdx={hoveredDonutIdx}
                      onHover={setHoveredDonutIdx}
                    />
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                      {hoveredDonutIdx !== null && donutSegments[hoveredDonutIdx] ? (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: donutSegments[hoveredDonutIdx].color }} />
                            <span className="max-w-[120px] truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {donutSegments[hoveredDonutIdx].label}
                            </span>
                          </div>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {compactNumber(donutSegments[hoveredDonutIdx].value)}
                          </span>
                          <span className="text-[11px] font-bold" style={{ color: donutSegments[hoveredDonutIdx].color }}>
                            {Math.round((donutSegments[hoveredDonutIdx].value / comparisonTotal) * 100)}%
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {compactNumber(comparisonTotal)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">{unit}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {donutSegments.map((seg) => {
                      const pct = comparisonTotal > 0 ? (seg.value / comparisonTotal) * 100 : 0;
                      return (
                        <div key={seg.label} className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-600 dark:text-slate-300" title={seg.label}>
                            {seg.label}
                          </span>
                          <span className="shrink-0 font-bold text-slate-800 dark:text-slate-200">{Math.round(pct)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-xs font-medium text-slate-400">ไม่มีข้อมูลในช่วงนี้</p>
              )}
            </div>

            {/* Leaderboard */}
            <div className="rounded-2xl border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f2f4] px-4 py-3 dark:border-slate-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Dealer Leaderboard
                  <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 dark:bg-slate-800">
                    {filteredDealers.length}
                  </span>
                </p>
                {dealerFilterRegions.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setDealerRegionFilter("")}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                        dealerRegionFilter === ""
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}
                    >
                      ทั้งหมด
                    </button>
                    {dealerFilterRegions.map((region) => {
                      const c = getRegionColor(region, regions);
                      const isActive = dealerRegionFilter === region;
                      return (
                        <button
                          key={region}
                          type="button"
                          onClick={() => { setDealerRegionFilter(region); setShowAllDealers(false); }}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors",
                            isActive ? "text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                          style={isActive ? { backgroundColor: c } : undefined}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isActive ? "#fff" : c }} />
                          {region}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-2">
                {filteredDealers.length > 0 ? (
                  <div
                    className={cn(
                      "space-y-0.5",
                      showAllDealers && filteredDealers.length > 6 && "max-h-[340px] overflow-y-auto pr-1"
                    )}
                  >
                    {(showAllDealers ? filteredDealers : filteredDealers.slice(0, 6)).map((dealer, i) => {
                      const color = getRegionColor(dealer.region, regions);
                      const share = activeBucket.value > 0 ? (dealer.volume / activeBucket.value) * 100 : 0;
                      const barShare = dealerLeaderboardMax > 0 ? (dealer.volume / dealerLeaderboardMax) * 100 : 0;
                      return (
                        <div
                          key={dealer.dealerId}
                          className="grid grid-cols-[32px_minmax(0,1fr)_72px] items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50"
                        >
                          <span
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold",
                              i === 0
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                : i === 1
                                  ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                  : i === 2
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
                                    : "bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                            )}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200" title={dealer.name}>
                                {dealer.name}
                              </span>
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                              <span
                                className="rounded-full px-1.5 py-0.5"
                                style={{ backgroundColor: `${color}15`, color }}
                              >
                                {dealer.region}
                              </span>
                              <span>{Math.round(share)}% ของยอด</span>
                            </div>
                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ backgroundColor: color, width: `${Math.max(barShare, 2)}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {compactNumber(dealer.volume)}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400">{unit}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-xs font-medium text-slate-400">ไม่มี dealer ในช่วงนี้</p>
                )}
                {filteredDealers.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllDealers((v) => !v)}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#d9e3e6] py-2 text-[11px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/40"
                  >
                    {showAllDealers ? (
                      <>
                        <span>ย่อกลับ (แสดง 6 อันดับแรก)</span>
                        <span className="text-xs">▴</span>
                      </>
                    ) : (
                      <>
                        <span>ดูทั้งหมด · +{filteredDealers.length - 6} dealers อื่นๆ</span>
                        <span className="text-xs">▾</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
