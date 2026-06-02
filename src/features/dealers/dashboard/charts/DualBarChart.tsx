import { formatNumber } from "@/lib/number";

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0)}%`;
}

function EmptyChart() {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
      ไม่มีข้อมูลสำหรับแสดงกราฟ
    </div>
  );
}

export function DualBarChart({
  data,
  primaryLabel,
  secondaryLabel
}: {
  data: Array<{ label: string; primary: number; secondary: number }>;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const max = Math.max(...data.flatMap((item) => [item.primary, item.secondary]), 1);

  if (!data.length) return <EmptyChart />;
  const primaryColor = "#0f766e";
  const secondaryColor = "#2563eb";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />
          {primaryLabel}
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />
          {secondaryLabel}
        </span>
      </div>
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5">
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold text-slate-800" title={item.label}>{item.label}</span>
            <span className="shrink-0 rounded-md bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              ส่งได้ {formatPercent(item.secondary ? (item.primary / item.secondary) * 100 : 0)}
            </span>
          </div>
          <div className="grid gap-1.5">
            <div className="grid grid-cols-[56px_minmax(0,1fr)_72px] items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span>{primaryLabel}</span>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div className="h-2.5 rounded-full" style={{ width: `${Math.max((item.primary / max) * 100, item.primary > 0 ? 2 : 0)}%`, backgroundColor: primaryColor }} />
              </div>
              <span className="text-right text-slate-800">{formatNumber(item.primary)}</span>
            </div>
            <div className="grid grid-cols-[56px_minmax(0,1fr)_72px] items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span>{secondaryLabel}</span>
              <div className="h-2.5 rounded-full bg-slate-100">
                <div className="h-2.5 rounded-full" style={{ width: `${Math.max((item.secondary / max) * 100, item.secondary > 0 ? 2 : 0)}%`, backgroundColor: secondaryColor }} />
              </div>
              <span className="text-right text-slate-800">{formatNumber(item.secondary)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
