import { CalendarDays } from "lucide-react";

import type { DatePreset } from "../lib/dates";
import { DropdownSelect } from "./DropdownSelect";

const DATE_PRESET_OPTIONS: Array<{ label: string; value: DatePreset }> = [
  { label: "ทุกช่วงเวลา", value: "all" },
  { label: "7 วันล่าสุด", value: "7d" },
  { label: "30 วันล่าสุด", value: "30d" },
  { label: "90 วันล่าสุด", value: "90d" },
  { label: "กำหนดเอง", value: "custom" }
];

export function DateRangeToolbar({
  dateFrom,
  datePreset,
  dateTo,
  setDateFrom,
  setDatePreset,
  setDateTo
}: {
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDatePreset: (value: DatePreset) => void;
  setDateTo: (value: string) => void;
}) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2 xl:flex xl:w-auto xl:flex-nowrap xl:items-center xl:justify-end">
      <DropdownSelect
        buttonClassName="h-11 rounded-2xl px-3.5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        className="sm:col-span-2 xl:min-w-[210px]"
        leading={(
          <>
            <CalendarDays size={15} className="shrink-0 text-slate-500" />
            <span className="shrink-0 text-xs font-semibold text-slate-500">กรองวันที่</span>
          </>
        )}
        options={DATE_PRESET_OPTIONS}
        value={datePreset}
        onChange={setDatePreset}
      />
      <input
        aria-label="วันที่เริ่มต้นสำหรับกรองข้อมูลทั้งหน้า"
        className="h-11 w-full rounded-2xl border border-[#d5e0e3] bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:w-auto sm:min-w-[150px]"
        title="วันที่เริ่มต้นสำหรับกรองข้อมูลทั้งหน้า"
        type="date"
        value={dateFrom}
        onChange={(event) => {
          setDatePreset("custom");
          setDateFrom(event.target.value);
        }}
      />
      <span className="hidden text-sm text-slate-400 xl:inline">-</span>
      <input
        aria-label="วันที่สิ้นสุดสำหรับกรองข้อมูลทั้งหน้า"
        className="h-11 w-full rounded-2xl border border-[#d5e0e3] bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:w-auto sm:min-w-[150px]"
        title="วันที่สิ้นสุดสำหรับกรองข้อมูลทั้งหน้า"
        type="date"
        value={dateTo}
        onChange={(event) => {
          setDatePreset("custom");
          setDateTo(event.target.value);
        }}
      />
    </div>
  );
}
