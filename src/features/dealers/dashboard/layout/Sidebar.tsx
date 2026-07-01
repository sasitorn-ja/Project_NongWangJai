import { X } from "lucide-react";

import type { PageKey } from "../config/pageMeta";
import { DASHBOARD_NAV_ITEMS } from "../config/navigation";
import { SideNavItem } from "../ui/SideNavItem";
import { WangjaiLogo } from "../ui/WangjaiLogo";
import cpacSidebarLogo from "../../../../assets/C-pac.jpg";

export function Sidebar({
  collapsed,
  mobileNavOpen,
  onCloseMobileNav,
  onSelectPage,
  page
}: {
  collapsed: boolean;
  mobileNavOpen: boolean;
  onCloseMobileNav: () => void;
  onSelectPage: (page: PageKey) => void;
  page: PageKey;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[84px] items-center gap-2.5 px-3">
        <WangjaiLogo showText={!collapsed || mobileNavOpen} />
        {mobileNavOpen ? (
          <button
            aria-label="Close menu"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 xl:hidden"
            onClick={onCloseMobileNav}
            type="button"
          >
            <X size={18} />
          </button>
        ) : null}
      </div>

      <nav className="space-y-1.5 px-2 py-2.5">
        {DASHBOARD_NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <SideNavItem
              key={item.key}
              collapsed={collapsed && !mobileNavOpen}
              icon={<Icon size={15} />}
              label={item.label}
              selected={page === item.key}
              onClick={() => onSelectPage(item.key)}
            />
          );
        })}
      </nav>

      <div className="mt-auto px-3 pb-5">
        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <img
            src={cpacSidebarLogo}
            alt="CPAC"
            className={collapsed && !mobileNavOpen ? "mx-auto h-6 w-10 object-contain" : "h-[50px] w-[78px] object-contain"}
          />
        </div>
      </div>
    </div>
  );
}
