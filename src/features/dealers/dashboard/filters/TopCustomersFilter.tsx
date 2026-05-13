import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { normalizeSearch } from "../lib/search";

export function TopCustomersFilter({
  className,
  label,
  onChange,
  options,
  searchPlaceholder = "ค้นหา",
  searchable = false,
  value
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  searchPlaceholder?: string;
  searchable?: boolean;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const filteredOptions = useMemo(() => {
    if (!searchable) return options;

    const searchValue = normalizeSearch(query);
    if (!searchValue) return options;

    return options.filter((option) => normalizeSearch(`${option.label} ${option.value}`).includes(searchValue));
  }, [options, query, searchable]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useEffect(() => {
    if (!searchable || !open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, open, searchable]);

  useEffect(() => {
    if (!searchable || !open) return;

    const timerId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [open, searchable]);

  if (searchable) {
    return (
      <div className={cn("block space-y-1.5", className)} ref={wrapperRef}>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="relative">
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-[#d5e0e3] bg-white px-3 text-left text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors hover:border-[#bfd0d4] focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            onClick={() => {
              if (open) {
                closeDropdown();
                return;
              }

              setOpen(true);
            }}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="truncate">{selectedOption?.label ?? "เลือกข้อมูล"}</span>
            <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
          </button>

          {open ? (
            <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-[#d5e0e3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
              <div className="border-b border-slate-100 p-2.5">
                <div className="flex items-center gap-2 rounded-lg border border-[#d5e0e3] bg-white px-3">
                  <Search size={15} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-[20rem] overflow-y-auto p-2">
                {filteredOptions.length ? filteredOptions.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <button
                      key={`${label}-${option.value}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        isSelected ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        onChange(option.value);
                        closeDropdown();
                      }}
                    >
                      <span className="flex h-5 items-center justify-center">
                        {isSelected ? <Check size={16} className="text-[#16706f]" /> : null}
                      </span>
                      <span className="truncate font-medium">{option.label}</span>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                    ไม่พบข้อมูลที่ตรงกับ &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <label className={cn("block space-y-1.5", className)}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <select
        className="h-10 w-full rounded-lg border border-[#d5e0e3] bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
