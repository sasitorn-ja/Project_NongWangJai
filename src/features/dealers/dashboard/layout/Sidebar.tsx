import { useLocation } from "react-router-dom";
import { X } from "lucide-react";
import type { AuthSession } from "@/features/auth/types";

import type { PageKey } from "../config/pageMeta";
import { getPageKeyFromPath } from "../config/routes";
import type { DealerMode } from "../config/dealerMode";
import { getDashboardNavItems } from "../config/navigation";
import { SideNavItem } from "../ui/SideNavItem";
import { WangjaiLogo } from "../ui/WangjaiLogo";
import cpacSidebarLogo from "../../../../assets/C-pac.jpg";

export function Sidebar({
  collapsed,
  dealerMode,
  mobileNavOpen,
  onCloseMobileNav,
  onLogout,
  onSelectPage,
  onSetDealerMode,
  user
}: {
  collapsed: boolean;
  dealerMode: DealerMode;
  mobileNavOpen: boolean;
  onCloseMobileNav: () => void;
  onLogout: () => void;
  onSelectPage: (page: PageKey) => void;
  onSetDealerMode: (mode: DealerMode) => void;
  user: AuthSession;
}) {
  const location = useLocation();
  const currentPage = getPageKeyFromPath(location.pathname);
  const compact = collapsed && !mobileNavOpen;
  const navItems = getDashboardNavItems(dealerMode);

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

      <div className="px-3 pb-2">
        <div role="group" aria-label="เลือกกลุ่มข้อมูล Dealer">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button
              aria-pressed={dealerMode === "dealer"}
              className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${dealerMode === "dealer" ? "bg-white text-sky-700 shadow-sm dark:bg-slate-950 dark:text-sky-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
              onClick={() => onSetDealerMode("dealer")}
              title="Dealer ปกติ"
              type="button"
            >
              {compact ? "D" : "Dealer"}
            </button>
            <button
              aria-pressed={dealerMode === "osr"}
              className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${dealerMode === "osr" ? "bg-white text-sky-700 shadow-sm dark:bg-slate-950 dark:text-sky-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
              onClick={() => onSetDealerMode("osr")}
              title="Dealer OSR"
              type="button"
            >
              OSR
            </button>
          </div>
        </div>
      </div>

      <nav className="space-y-1.5 px-2 py-2.5">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <SideNavItem
              key={item.key}
              collapsed={collapsed && !mobileNavOpen}
              icon={<Icon size={15} />}
              label={item.label}
              selected={currentPage === item.key}
              onClick={() => onSelectPage(item.key)}
            />
          );
        })}
      </nav>

      {mobileNavOpen ? (
        <div className="px-3 pb-4 xl:hidden">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
            <div className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{user.user}</div>
            <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
            <button
              className="mt-3 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={onLogout}
              type="button"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      ) : null}

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
