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
        "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
        selected && "bg-slate-100 text-slate-950"
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className={cn("shrink-0", selected ? "text-slate-950" : "text-slate-500")}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
