import { CalendarDays } from "lucide-react";

import type { DatePreset } from "../lib/dates";

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
      <div className="flex h-11 items-center gap-2 rounded-2xl border border-[#d5e0e3] bg-white px-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:col-span-2 xl:min-w-[210px]">
        <CalendarDays size={15} className="text-slate-500" />
        <span className="shrink-0 text-xs font-semibold text-slate-500">กรองวันที่</span>
        <select
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200"
          value={datePreset}
          onChange={(event) => setDatePreset(event.target.value as DatePreset)}
        >
          <option value="all">ทุกช่วงเวลา</option>
          <option value="7d">7 วันล่าสุด</option>
          <option value="30d">30 วันล่าสุด</option>
          <option value="90d">90 วันล่าสุด</option>
          <option value="custom">กำหนดเอง</option>
        </select>
      </div>
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
