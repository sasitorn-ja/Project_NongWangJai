import { formatNumber } from "@/lib/number";

function TinyProgress({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#edf2f4]">
      <div className="h-full rounded-full bg-[#0f766e] dark:bg-[#5eead4]" style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
      ไม่มีข้อมูลสำหรับแสดงกราฟ
    </div>
  );
}

export function ProgressList({ rows }: { rows: Array<{ label: string; total: number; unit: string; value: number }> }) {
  if (!rows.length) return <EmptyChart />;

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const percent = row.total ? Math.min(Math.round((row.value / row.total) * 100), 100) : 0;
        return (
          <div key={`${row.label}-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
            <div className="mb-2 grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-600">{index + 1}</span>
              <span className="truncate font-semibold text-slate-800" title={row.label}>{row.label}</span>
              <span className="shrink-0 text-right font-bold text-slate-950">
                {formatNumber(row.value)} <span className="text-[10px] font-semibold text-slate-400">{row.unit}</span>
              </span>
            </div>
            <TinyProgress percent={percent} />
            <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
              <span>เทียบกับอันดับสูงสุด</span>
              <span>{percent}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
