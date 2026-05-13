import { Menu, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DateRangeToolbar } from "../filters/DateRangeToolbar";
import type { DatePreset } from "../lib/dates";
import { type PageKey, getPageSubtitle, getPageTitle } from "../config/pageMeta";

export function Header({
  collapsed,
  dateFrom,
  datePreset,
  dateTo,
  onOpenMobileNav,
  onToggleCollapsed,
  onToggleTheme,
  page,
  setDateFrom,
  setDatePreset,
  setDateTo,
  theme
}: {
  collapsed: boolean;
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  onOpenMobileNav: () => void;
  onToggleCollapsed: () => void;
  onToggleTheme: () => void;
  page: PageKey;
  setDateFrom: (value: string) => void;
  setDatePreset: (value: DatePreset) => void;
  setDateTo: (value: string) => void;
  theme: "light" | "dark";
}) {
  return (
    <header className="app-header sticky top-0 z-10 border-b border-[#d7e0e3] bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="flex items-center gap-2 md:hidden">
            <button
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm hover:bg-[#f2f6f7] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              onClick={onOpenMobileNav}
              type="button"
            >
              <Menu size={18} />
            </button>
          </div>
          <button
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm hover:bg-[#f2f6f7] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 md:flex"
            onClick={onToggleCollapsed}
            title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
            type="button"
          >
            <Menu size={17} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-slate-100 lg:text-xl">{getPageTitle(page)}</h1>
            <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{getPageSubtitle(page)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-end">
          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <span className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black uppercase tracking-[0.2em] text-red-600 shadow-sm">
              Test
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              className="shrink-0 bg-white shadow-sm"
              onClick={onToggleTheme}
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </div>
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
