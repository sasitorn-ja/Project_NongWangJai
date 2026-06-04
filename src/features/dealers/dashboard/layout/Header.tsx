import { Menu } from "lucide-react";

import { DateRangeToolbar } from "../filters/DateRangeToolbar";
import { DropdownSelect } from "../filters/DropdownSelect";
import type { DatePreset } from "../lib/dates";
import { type PageKey, getPageTitle } from "../config/pageMeta";

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
    <header className="app-header sticky top-0 z-40 border-b border-[#edf1f5] bg-white dark:border-slate-800 dark:bg-slate-950">

      {/* ── Mobile layout (hidden on xl+) ── */}
      <div className="xl:hidden">
        {/* Single row: hamburger | title | date filter */}
        <div className="flex items-center gap-2 px-3 py-2.5">

          {/* Hamburger */}
          <button
            aria-label="Open menu"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-md bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
          </div>

	          <DropdownSelect
            buttonClassName="h-9 rounded-xl px-2.5 text-xs font-medium shadow-sm"
            className="w-[126px] flex-none"
            options={DATE_PRESET_OPTIONS}
            value={datePreset}
            onChange={setDatePreset}
          />

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
      <div className="hidden xl:flex xl:h-[78px] xl:items-center xl:justify-between xl:gap-4 xl:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-transparent text-slate-700 outline-none hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-300 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onToggleCollapsed}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            type="button"
          >
            <Menu size={17} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-[24px] font-bold leading-tight text-slate-950 dark:text-slate-100">
              {getPageTitle(page)}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
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
      </div>

    </header>
  );
}
