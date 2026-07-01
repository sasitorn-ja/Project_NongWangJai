import { type ReactNode, useEffect, useRef, useState } from "react";

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
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    const headerElement = headerRef.current;
    if (!headerElement) return;

    const updateHeight = () => {
      setHeaderHeight(window.innerWidth < 1280 ? headerElement.getBoundingClientRect().height : 0);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(headerElement);
    window.addEventListener("resize", updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  const selectPage = (nextPage: PageKey) => {
    setPage(nextPage);
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen app-shell">
      {mobileNavOpen ? (
        <button
          aria-label="Close menu"
          className="fixed inset-x-0 bottom-0 z-20 bg-slate-950/60 backdrop-blur-[1px] xl:hidden"
          onClick={() => setMobileNavOpen(false)}
          style={{ top: headerHeight || 0 }}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "brand-sider fixed bottom-0 left-0 z-30 w-[78vw] max-w-[320px] shadow-xl transition-transform duration-200 xl:top-0 xl:z-20 xl:w-[200px] xl:max-w-none xl:shadow-none xl:transition-all",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0",
          collapsed ? "xl:w-[60px]" : "xl:w-[200px]"
        )}
        style={{ top: headerHeight || 0 }}
      >
        <Sidebar
          collapsed={collapsed}
          mobileNavOpen={mobileNavOpen}
          onCloseMobileNav={() => setMobileNavOpen(false)}
          onSelectPage={selectPage}
          page={page}
        />
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "xl:pl-[60px]" : "xl:pl-[200px]")}>
        <Header
          collapsed={collapsed}
          dateFrom={dateFrom}
          datePreset={datePreset}
          dateTo={dateTo}
          onLogout={onLogout}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          page={page}
          ref={headerRef}
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
