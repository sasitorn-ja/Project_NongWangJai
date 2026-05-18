import { Menu } from "lucide-react";

import { DateRangeToolbar } from "../filters/DateRangeToolbar";
import type { DatePreset } from "../lib/dates";
import { type PageKey, getPageSubtitle, getPageTitle } from "../config/pageMeta";

const DATE_PRESET_OPTIONS: Array<{ label: string; value: DatePreset }> = [
  { label: "ทุกช่วงเวลา", value: "all" },
  { label: "7 วันล่าสุด", value: "7d" },
  { label: "30 วันล่าสุด", value: "30d" },
  { label: "90 วันล่าสุด", value: "90d" },
  { label: "กำหนดเอง", value: "custom" }
];

export function Header({
  collapsed,
  dateFrom,
  datePreset,
  dateTo,
  onOpenMobileNav,
  onToggleCollapsed,
  page,
  setDateFrom,
  setDatePreset,
  setDateTo
}: {
  collapsed: boolean;
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  onOpenMobileNav: () => void;
  onToggleCollapsed: () => void;
  page: PageKey;
  setDateFrom: (value: string) => void;
  setDatePreset: (value: DatePreset) => void;
  setDateTo: (value: string) => void;
}) {
  return (
    <header className="app-header sticky top-0 z-10 border-b border-[#d7e0e3] bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">

      {/* ── Mobile layout (hidden on xl+) ── */}
      <div className="xl:hidden">
        {/* Single row: hamburger | title | TEST | native date select */}
        <div className="flex items-center gap-2 px-3 py-2.5">

          {/* Hamburger */}
          <button
            aria-label="Open menu"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            onClick={onOpenMobileNav}
            type="button"
          >
            <Menu size={18} />
          </button>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-slate-950 dark:text-slate-100 sm:text-base">
              {getPageTitle(page)}
            </h1>
            <p className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
              {getPageSubtitle(page)}
            </p>
          </div>

          {/* TEST badge */}
          <span className="flex-none rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-red-600">
            Test
          </span>

          {/* Native select — no JS event interference, compact on mobile */}
          <select
            aria-label="กรองวันที่"
            className="flex-none h-9 max-w-[120px] cursor-pointer appearance-none rounded-xl border border-[#d5e0e3] bg-white px-2.5 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value as DatePreset)}
          >
            {DATE_PRESET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

        </div>

        {/* Date inputs row — only when "กำหนดเอง" */}
        {datePreset === "custom" && (
          <div className="grid grid-cols-2 gap-2 px-3 pb-2.5">
            <input
              aria-label="วันที่เริ่มต้น"
              className="h-10 w-full rounded-2xl border border-[#d5e0e3] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              type="date"
              value={dateFrom}
              onChange={(e) => { setDatePreset("custom"); setDateFrom(e.target.value); }}
            />
            <input
              aria-label="วันที่สิ้นสุด"
              className="h-10 w-full rounded-2xl border border-[#d5e0e3] bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              type="date"
              value={dateTo}
              onChange={(e) => { setDatePreset("custom"); setDateTo(e.target.value); }}
            />
          </div>
        )}
      </div>

      {/* ── Desktop layout (hidden below xl) ── */}
      <div className="hidden xl:flex xl:items-center xl:justify-between xl:gap-4 xl:px-5 xl:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            onClick={onToggleCollapsed}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            type="button"
          >
            <Menu size={17} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-950 dark:text-slate-100">
              {getPageTitle(page)}
            </h1>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {getPageSubtitle(page)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black uppercase tracking-[0.2em] text-red-600 shadow-sm">
            Test
          </span>
          <DateRangeToolbar
            dateFrom={dateFrom}
            datePreset={datePreset}
            dateTo={dateTo}
            setDateFrom={setDateFrom}
            setDatePreset={setDatePreset}
            setDateTo={setDateTo}
          />
        </div>
      </div>

    </header>
  );
}
