import type { PageKey } from "../config/pageMeta";
import { DASHBOARD_NAV_ITEMS } from "../config/navigation";
import { SideNavItem } from "../ui/SideNavItem";
import { WangjaiLogo } from "../ui/WangjaiLogo";
import cpacSidebarLogo from "../../../../assets/C-pac.jpg";

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
      <div className="flex h-[84px] items-center gap-2.5 px-3">
        <WangjaiLogo showText={!collapsed || mobileNavOpen} />
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
            className={collapsed && !mobileNavOpen ? "mx-auto h-[31px] w-12 object-contain" : "h-[77px] w-[120px] object-contain"}
          />
        </div>
      </div>
    </div>
  );
}
