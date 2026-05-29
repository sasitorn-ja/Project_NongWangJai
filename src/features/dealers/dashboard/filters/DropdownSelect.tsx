import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/cn";
import { normalizeSearch } from "../lib/search";

type DropdownSelectProps<T extends string> = {
  buttonClassName?: string;
  className?: string;
  label?: string;
  leading?: ReactNode;
  menuClassName?: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  value: T;
};

export function DropdownSelect<T extends string>({
  buttonClassName,
  className,
  label,
  leading,
  menuClassName,
  onChange,
  options,
  placeholder = "เลือกข้อมูล",
  searchPlaceholder = "ค้นหา",
  searchable = false,
  value
}: DropdownSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);
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
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) closeDropdown();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDropdown();
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDropdown, open]);

  useEffect(() => {
    if (!searchable || !open) return;

    const timerId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [open, searchable]);

  return (
    <div className={cn("block space-y-1.5", className)} ref={wrapperRef}>
      {label ? <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div> : null}
      <div className="relative">
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-[#d5e0e3] bg-white px-3 text-left text-sm font-medium text-slate-800 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
            buttonClassName
          )}
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
          <span className="flex min-w-0 items-center gap-2">
            {leading}
            <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          </span>
          <ChevronDown size={16} className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
        </button>

        {open ? (
          <div className={cn("absolute left-0 right-0 z-30 mt-2 min-w-full overflow-hidden rounded-xl border border-[#d5e0e3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]", menuClassName)}>
            {searchable ? (
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
            ) : null}

            <div className="max-h-[20rem] overflow-y-auto p-2">
              {filteredOptions.length ? filteredOptions.map((option) => {
                const isSelected = option.value === value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                      isSelected ? "bg-slate-100 text-slate-950 ring-1 ring-slate-200" : "text-slate-700 hover:bg-slate-50"
                    )}
                    onClick={() => {
                      onChange(option.value);
                      closeDropdown();
                    }}
                  >
                    <span className="flex h-5 items-center justify-center">
                      {isSelected ? <Check size={16} className="text-slate-950" /> : null}
                    </span>
                    <span className="whitespace-normal break-words font-medium leading-5">{option.label}</span>
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
