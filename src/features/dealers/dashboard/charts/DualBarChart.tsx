import { formatNumber } from "@/lib/number";

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
    <div className="space-y-3">
      <div className="flex gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />{primaryLabel}</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />{secondaryLabel}</span>
      </div>
      {data.map((item, index) => (
        <div key={`${item.label}-${index}`} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 font-semibold text-slate-950">{formatNumber(item.primary)} / {formatNumber(item.secondary)}</span>
          </div>
          <div className="grid gap-1">
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((item.primary / max) * 100, 2)}%`, backgroundColor: primaryColor }} />
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((item.secondary / max) * 100, 2)}%`, backgroundColor: secondaryColor }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
