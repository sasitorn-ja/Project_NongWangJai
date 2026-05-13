import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { Dealer } from "@/features/dealers/types";
import { normalizeSearch } from "../lib/search";

export function DealerPicker({
  dealers,
  includeAll = false,
  selectedDealerId,
  setSelectedDealerId,
  title
}: {
  dealers: Dealer[];
  includeAll?: boolean;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number | null) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedDealer = selectedDealerId == null ? null : dealers.find((dealer) => dealer.dealer_id === selectedDealerId) ?? dealers[0] ?? null;
  const filteredDealers = useMemo(() => {
    const searchValue = normalizeSearch(query);
    if (!searchValue) return dealers;

    return dealers.filter((dealer) => {
      const haystack = normalizeSearch(`${dealer.dealer_id} ${dealer.dealer_code} ${dealer.dealer_name}`);
      return haystack.includes(searchValue);
    });
  }, [dealers, query]);

  const closePicker = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        closePicker();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePicker();
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, open]);

  useEffect(() => {
    if (!open) return;

    const timerId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [open]);

  return (
    <Card className="dashboard-card">
      <CardContent className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <div>
          <CardTitle className="text-[15px] lg:text-base">{title}</CardTitle>
          <p className="mt-0.5 text-[10px] font-medium leading-4 text-slate-500">
            {includeAll ? "เลือกทุก dealer หรือเจาะราย dealer เพื่อเปรียบเทียบข้อมูล" : "เลือก dealer หนึ่งรายเพื่อเรียก endpoint รายละเอียดของ dealer นั้น"}
          </p>
        </div>
        <div className="relative" ref={wrapperRef}>
          <button
            type="button"
            className="flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-2xl border border-[#d5e0e3] bg-white px-3 py-1.5 text-left text-sm text-slate-800 shadow-sm outline-none transition-colors hover:border-[#bfd0d4] focus:border-[#16706f] focus:ring-2 focus:ring-[#16706f]/15"
            onClick={() => {
              if (open) {
                closePicker();
                return;
              }

              setOpen(true);
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="min-w-0">
              {selectedDealer ? (
                <span className="block">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-sky-100">
                      ID {selectedDealer.dealer_id}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                      {selectedDealer.dealer_code}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-slate-900">
                    {selectedDealer.dealer_name}
                  </span>
                </span>
              ) : (
                <span className="block">
                  <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100">
                    ALL
                  </span>
                  <span className="mt-0.5 block text-[12px] font-semibold text-slate-900">
                    {includeAll ? "ทุก Dealer" : "เลือก Dealer"}
                  </span>
                </span>
              )}
            </span>
            <ChevronDown
              size={18}
              className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180 text-[#16706f]")}
            />
          </button>

          {open ? (
            <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#d5e0e3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
              <div className="border-b border-slate-100 p-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-[#d5e0e3] bg-white px-3">
                  <Search size={16} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาด้วย ID, code หรือชื่อ dealer"
                    className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-[22rem] overflow-y-auto p-2">
                {includeAll ? (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedDealerId == null}
                    className={cn(
                      "mb-1 grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      selectedDealerId == null ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => {
                      setSelectedDealerId(null);
                      setOpen(false);
                    }}
                  >
                    <span className="flex h-5 items-center justify-center">
                      {selectedDealerId == null ? <Check size={16} className="text-[#16706f]" /> : null}
                    </span>
                    <span className="min-w-0">
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-100">
                        ALL DEALERS
                      </span>
                      <span className={cn(
                        "mt-1 block text-sm font-semibold leading-5",
                        selectedDealerId == null ? "text-[#145c5b]" : "text-slate-800"
                      )}>
                        ดูภาพรวมทุก dealer พร้อมกัน
                      </span>
                    </span>
                  </button>
                ) : null}

                {filteredDealers.length ? filteredDealers.map((dealer) => {
                  const isSelected = dealer.dealer_id === selectedDealer?.dealer_id;

                  return (
                    <button
                      key={dealer.dealer_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        setSelectedDealerId(dealer.dealer_id);
                        setOpen(false);
                      }}
                    >
                      <span className="flex h-5 items-center justify-center">
                        {isSelected ? <Check size={16} className="text-[#16706f]" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                            isSelected ? "bg-white/80 text-sky-700 ring-sky-100" : "bg-sky-50 text-sky-700 ring-sky-100"
                          )}>
                            ID {dealer.dealer_id}
                          </span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                            isSelected ? "bg-white/80 text-emerald-700 ring-emerald-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          )}>
                            {dealer.dealer_code}
                          </span>
                        </span>
                        <span className={cn(
                          "mt-1 block line-clamp-2 text-sm font-semibold leading-5",
                          isSelected ? "text-[#145c5b]" : "text-slate-800"
                        )}>
                          {dealer.dealer_name}
                        </span>
                      </span>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                    ไม่พบ dealer ที่ตรงกับ &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
