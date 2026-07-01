import { ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function SortHeader({
  active,
  className,
  direction,
  label,
  onClick
}: {
  active: boolean;
  className?: string;
  direction: "asc" | "desc" | null;
  label: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-semibold transition-colors hover:text-slate-700",
        active && "text-slate-900",
        className
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <ArrowUpDown
        size={13}
        className={cn(
          "shrink-0 transition-colors",
          active ? "text-slate-700" : "text-slate-400",
          direction === "asc" && "rotate-180"
        )}
      />
    </button>
  );
}
