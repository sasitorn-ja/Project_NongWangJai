import { formatNumber } from "@/lib/number";

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0
  }).format(Number.isFinite(value) ? value : 0)}%`;
}

export function CompactFunnelSummary({
  rows
}: {
  rows: Array<{ label: string; shortLabel: string; value: number }>;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  const colors = ["#0f766e", "#2563eb", "#f59e0b"];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((row, index) => {
        const previous = index > 0 ? rows[index - 1].value : null;
        const conversion = previous != null ? (previous ? (row.value / previous) * 100 : 0) : null;

        return (
          <div
            key={row.label}
            className="rounded-[20px] border border-[#e5e7eb] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] p-3 dark:border-slate-800 dark:bg-slate-950/70"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {row.shortLabel}
              </div>
              {conversion != null && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {formatPercent(conversion)}
                </span>
              )}
              {conversion == null && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  Base
                </span>
              )}
            </div>
            <div className="mt-2 text-2xl font-semibold leading-none text-slate-950">
              {formatNumber(row.value)}
            </div>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max((row.value / max) * 100, 8)}%`,
                  backgroundColor: colors[index]
                }}
              />
            </div>
            <div className="mt-2 text-[11px] font-medium text-slate-500">{row.label}</div>
          </div>
        );
      })}
    </div>
  );
}
