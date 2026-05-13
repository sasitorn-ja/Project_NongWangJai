import { Search } from "lucide-react";

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
          placeholder="ค้นหา dealer / จังหวัด"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <select
        className="h-9 w-full rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={region}
        onChange={(event) => setRegion(event.target.value)}
      >
        <option value="all">ทุกภูมิภาค</option>
        {regions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        className="h-9 w-full rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:col-span-2 xl:col-span-1"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="all">ทุกสถานะ</option>
        <option value="active">Active</option>
        <option value="idle">Idle</option>
        <option value="new">New</option>
      </select>
    </div>
  );
}
