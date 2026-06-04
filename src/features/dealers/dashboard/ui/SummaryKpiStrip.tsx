import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type KpiAccent = "violet" | "emerald" | "sky" | "amber";

type SummaryKpiStripItem = {
  accent?: KpiAccent;
  detail: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

type SummaryKpiStripProps = {
  items: SummaryKpiStripItem[];
};

const ACCENT_CLASS: Record<KpiAccent, string> = {
  violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
  emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  sky: "bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
  amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"
};

export function SummaryKpiStrip({ items }: SummaryKpiStripProps) {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="metric-card flex min-h-[70px] items-center gap-3 rounded-lg border border-[#dfe7ef] bg-white px-3.5 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-slate-500">{item.label}</p>
            <p className="mt-1 truncate text-[18px] font-bold leading-none text-slate-900 dark:text-slate-100">
              {item.value}
            </p>
            <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500">{item.detail}</p>
          </div>
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              ACCENT_CLASS[item.accent ?? "sky"]
            )}
          >
            {item.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
