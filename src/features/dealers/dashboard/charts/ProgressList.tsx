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
    <div className="space-y-4">
      {rows.map((row, index) => {
        const percent = row.total ? Math.min(Math.round((row.value / row.total) * 100), 100) : 0;
        return (
          <div key={`${row.label}-${index}`}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-700">{row.label}</span>
              <span className="shrink-0 font-semibold text-slate-950">{percent}%</span>
            </div>
            <TinyProgress percent={percent} />
            <div className="text-xs font-medium text-slate-500">
              {formatNumber(row.value)} / {formatNumber(row.total)} {row.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}
