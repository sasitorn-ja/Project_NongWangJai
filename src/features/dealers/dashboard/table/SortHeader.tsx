import { ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function SortHeader({
  active,
  direction,
  label,
  onClick
}: {
  active: boolean;
  direction: "asc" | "desc" | null;
  label: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap font-semibold transition-colors hover:text-slate-700",
        active && "text-slate-900"
      )}
      onClick={onClick}
      type="button"
    >
      <span className="whitespace-nowrap">{label}</span>
      <ArrowUpDown
        size={13}
        className={cn(
          "transition-colors",
          active ? "text-slate-700" : "text-slate-400",
          direction === "asc" && "rotate-180"
        )}
      />
    </button>
  );
}
