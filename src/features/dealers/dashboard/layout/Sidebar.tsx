import type { PageKey } from "../config/pageMeta";
import { DASHBOARD_NAV_ITEMS } from "../config/navigation";
import { SideNavItem } from "../ui/SideNavItem";
import { WangjaiLogo } from "../ui/WangjaiLogo";

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
      <div className="flex h-[94px] items-center gap-3 px-4">
        <WangjaiLogo showText={!collapsed || mobileNavOpen} />
      </div>

      <nav className="space-y-2 px-2.5 py-3">
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

      <div className="mt-auto px-4 pb-6">
        <div className="border-t border-slate-200 pt-6 dark:border-slate-800">
          <div className={collapsed && !mobileNavOpen ? "mx-auto flex h-8 w-12 items-center justify-center bg-sky-500 text-[16px] font-black leading-none text-white" : "flex h-11 w-[76px] items-center justify-center bg-sky-500 text-[28px] font-black leading-none text-white"}>
            CPAC
          </div>
        </div>
      </div>
    </div>
  );
}
