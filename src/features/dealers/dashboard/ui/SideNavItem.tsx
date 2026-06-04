import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export function SideNavItem({
  collapsed,
  icon,
  label,
  onClick,
  selected
}: {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={cn(
        "relative flex h-11 w-full items-center gap-3 rounded-md px-3 text-[14px] font-semibold text-slate-600 outline-none transition-colors hover:bg-sky-50 hover:text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-200",
        selected && "bg-sky-50 text-sky-700"
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className={cn("shrink-0", selected ? "text-sky-600" : "text-slate-500")}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
      {selected ? <span className="absolute right-0 top-1/2 h-9 w-1 -translate-y-1/2 rounded-l-full bg-sky-600" /> : null}
    </button>
  );
}
