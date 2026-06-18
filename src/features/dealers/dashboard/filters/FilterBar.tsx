import { Search } from "lucide-react";

import { DropdownSelect } from "./DropdownSelect";

export function FilterBar({
  region,
  regions,
  search,
  setRegion,
  setSearch,
  setStatus,
  status
}: {
  region: string;
  regions: string[];
  search: string;
  setRegion: (value: string) => void;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_150px]">
      <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        <Search size={15} className="shrink-0 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          placeholder="ค้นหา dealer (จังหวัด)"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <DropdownSelect
        buttonClassName="h-9 rounded-md text-sm font-semibold"
        options={[{ label: "ทุกภูมิภาค", value: "all" }, ...regions.map((item) => ({ label: item, value: item }))]}
        value={region}
        onChange={setRegion}
      />
      <DropdownSelect
        buttonClassName="h-9 rounded-md text-sm font-semibold"
        className="sm:col-span-2 xl:col-span-1"
        options={[
          { label: "ทุกสถานะ", value: "all" },
          { label: "ใช้งานอยู่", value: "active" },
          { label: "ไม่ได้ใช้งาน", value: "idle" },
          { label: "ใหม่", value: "new" }
        ]}
        value={status}
        onChange={setStatus}
      />
    </div>
  );
}
