import { type ReactNode, useEffect, useState } from "react";

import type { AuthSession } from "@/features/auth/types";
import { cn } from "@/lib/cn";
import type { PageKey } from "../config/pageMeta";
import type { DatePreset } from "../lib/dates";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({
  children,
  dateFrom,
  datePreset,
  dateTo,
  onLogout,
  page,
  setDateFrom,
  setDatePreset,
  setDateTo,
  setPage,
  user
}: {
  children: ReactNode;
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  onLogout: () => void;
  page: PageKey;
  setDateFrom: (value: string) => void;
  setDatePreset: (value: DatePreset) => void;
  setDateTo: (value: string) => void;
  setPage: (page: PageKey) => void;
  user: AuthSession;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const selectPage = (nextPage: PageKey) => {
    setPage(nextPage);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen app-shell">
      {mobileNavOpen ? (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-20 bg-slate-950/45 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "brand-sider fixed bottom-0 left-0 top-0 z-30 w-[200px] transition-transform duration-200 md:z-20 md:transition-all",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[60px]" : "md:w-[200px]"
        )}
      >
        <Sidebar
          collapsed={collapsed}
          mobileNavOpen={mobileNavOpen}
          onSelectPage={selectPage}
          page={page}
        />
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "md:pl-[60px]" : "md:pl-[200px]")}>
        <Header
          collapsed={collapsed}
          dateFrom={dateFrom}
          datePreset={datePreset}
          dateTo={dateTo}
          onLogout={onLogout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          page={page}
          setDateFrom={setDateFrom}
          setDatePreset={setDatePreset}
          setDateTo={setDateTo}
          user={user}
        />

        <main className="space-y-2.5 px-3 py-3 lg:px-4 lg:py-3">{children}</main>
      </div>
    </div>
  );
}
