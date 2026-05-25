import cpacLogo from "@/assets/cpac-logo.png";

import type { PageKey } from "../config/pageMeta";
import { DASHBOARD_NAV_ITEMS } from "../config/navigation";
import { SideNavItem } from "../ui/SideNavItem";

export function Sidebar({
  collapsed,
  mobileNavOpen,
  onSelectPage,
  page
}: {
  collapsed: boolean;
  mobileNavOpen: boolean;
  onSelectPage: (page: PageKey) => void;
  page: PageKey;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#d9e3e6]/70 bg-transparent shadow-sm dark:border-slate-700">
          <img src={cpacLogo} alt="CPAC" className="h-full w-full object-contain" />
        </div>
        {(!collapsed || mobileNavOpen) && (
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-slate-950 dark:text-slate-100">Nong WangJai</div>
            <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Dealer Intelligence</div>
          </div>
        )}
      </div>

      <nav className="space-y-1 px-2.5">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <SideNavItem
              key={item.key}
              collapsed={collapsed && !mobileNavOpen}
              icon={<Icon size={16} />}
              label={item.label}
              selected={page === item.key}
              onClick={() => onSelectPage(item.key)}
            />
          );
        })}
      </nav>
    </div>
  );
}
