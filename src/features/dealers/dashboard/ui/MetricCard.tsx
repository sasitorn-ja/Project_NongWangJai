import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type MetricCardProps = {
  compact?: boolean;
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "teal" | "green" | "amber" | "rose";
};

export function MetricCard({ compact = false, icon, label, value, detail, tone = "teal" }: MetricCardProps) {
  const neutralIcon = "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
  const tones = {
    teal: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: neutralIcon
    },
    green: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: neutralIcon
    },
    amber: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: neutralIcon
    },
    rose: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: neutralIcon
    }
  };
  const toneClass = tones[tone];

  return (
    <Card className={cn("metric-card", toneClass.card)}>
      <CardContent className={cn(compact ? "p-2.5" : "p-3.5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("font-semibold text-slate-500", compact ? "text-[11px]" : "text-xs")}>{label}</p>
            <p className={cn("truncate font-semibold leading-none tracking-normal text-slate-950", compact ? "mt-1 text-[20px]" : "mt-1.5 text-[24px]")}>{value}</p>
          </div>
          <div className={cn("flex shrink-0 items-center justify-center rounded-lg shadow-sm", compact ? "h-8 w-8" : "h-9 w-9", toneClass.icon)}>{icon}</div>
        </div>
        <p className={cn("truncate font-medium text-slate-500", compact ? "mt-2 text-[11px]" : "mt-3 text-xs")}>{detail}</p>
      </CardContent>
    </Card>
  );
}
