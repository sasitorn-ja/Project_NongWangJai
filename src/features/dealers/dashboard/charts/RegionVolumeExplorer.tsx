import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";
import { compactNumber, formatNumber } from "@/lib/number";
import type { groupByRegion } from "../lib/regions";

function EmptyChart({
  detail = "ยังไม่มีข้อมูลที่ตรงกับเงื่อนไขที่เลือก",
  title = "ไม่มีข้อมูลสำหรับแสดงกราฟ"
}: {
  detail?: string;
  title?: string;
}) {
  return (
    <div className="flex h-[150px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] px-4 text-center">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="max-w-xl text-xs font-medium leading-5 text-slate-500">{detail}</div>
    </div>
  );
}

function VerticalBarChart({
  data,
  onHover,
  unit
}: {
  data: Array<{ active?: boolean; label: string; value: number }>;
  onHover?: (label: string) => void;
  unit?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const palette = ["#0f766e", "#2563eb", "#f59e0b", "#14b8a6", "#6366f1", "#f97316", "#22c55e"];

  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-[190px]">
      <div className="flex h-[158px] items-end gap-2.5 border-b border-[#d9e3e6] px-1">
        {data.map((item) => (
          <button
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            onClick={() => onHover?.(item.label)}
            onMouseEnter={() => onHover?.(item.label)}
            type="button"
          >
            <div className="text-xs font-semibold text-slate-700">{compactNumber(item.value)}{unit ? ` ${unit}` : ""}</div>
            <div className={cn("flex h-[116px] w-full items-end rounded-xl bg-slate-100 transition-all", item.active && "ring-2 ring-slate-300")}>
              <div
                className="w-full rounded-xl transition-all"
                style={{
                  height: `${Math.max((item.value / max) * 100, 4)}%`,
                  backgroundColor: palette[data.indexOf(item) % palette.length]
                }}
              />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}>
        {data.map((item) => (
          <div key={item.label} className="truncate text-center text-xs font-semibold text-slate-500">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RegionVolumeExplorer({ regionRows }: { regionRows: ReturnType<typeof groupByRegion> }) {
  const [activeRegion, setActiveRegion] = useState(regionRows[0]?.region ?? "");
  const activeItem = regionRows.find((item) => item.region === activeRegion) ?? regionRows[0];

  useEffect(() => {
    if (!regionRows.length) return;
    if (!regionRows.some((item) => item.region === activeRegion)) {
      const resetId = window.setTimeout(() => {
        setActiveRegion(regionRows[0].region);
      }, 0);
      return () => window.clearTimeout(resetId);
    }
    return undefined;
  }, [activeRegion, regionRows]);

  if (!regionRows.length) {
    return (
      <EmptyChart
        title="ไม่มี dealer ในช่วงเวลานี้"
        detail="กราฟนี้นับเฉพาะ dealer ที่มีวันที่ใช้งานล่าสุดตรงกับช่วงที่เลือก ถ้าต้องการดูภาพรวมทั้งหมดให้เลือก 'ทั้งหมด'"
      />
    );
  }

  return (
    <div className="space-y-5">
      <VerticalBarChart
        data={regionRows.map((row) => ({
          label: row.region,
          value: row.volume,
          active: row.region === activeItem?.region
        }))}
        unit="m3"
        onHover={setActiveRegion}
      />

      {activeItem && (
        <div className="grid gap-3 rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfd] p-4 dark:border-slate-800 dark:bg-slate-950/70 lg:grid-cols-[minmax(0,1fr)_140px_140px_140px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Region</p>
            <h4 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{activeItem.region}</h4>
            <p className="mt-1 text-sm text-slate-500">ชี้ที่แท่งกราฟเพื่อดูจำนวน dealer, groups และ volume ของแต่ละภูมิภาค</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Volume</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{compactNumber(activeItem.volume)} m3</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Dealers</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatNumber(activeItem.dealers)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Groups</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatNumber(activeItem.groups)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
