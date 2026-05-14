import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type SummaryKpiStripItem = {
  detail: string;
  icon: ReactNode;
  label: string;
  value: ReactNode;
};

type SummaryKpiStripProps = {
  items: SummaryKpiStripItem[];
};

export function SummaryKpiStrip({ items }: SummaryKpiStripProps) {
  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white shadow-panel dark:border-slate-800 dark:bg-slate-950">
      <div
        className={cn(
          "grid grid-cols-2 divide-y divide-[#eef0f4] dark:divide-slate-800",
          items.length === 3 ? "sm:grid-cols-3 sm:divide-y-0 sm:divide-x" : "sm:grid-cols-4 sm:divide-y-0 sm:divide-x"
        )}
      >
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
              <p className="mt-0.5 truncate text-[22px] font-bold leading-none text-slate-900 dark:text-slate-100">
                {item.value}
              </p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
