import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

import type { AuthSession } from "@/features/auth/types";

import type { PageKey } from "./config/pageMeta";
import { PAGE_PATHS, getPageKeyFromPath } from "./config/routes";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDealerDashboardData } from "./hooks/useDealerDashboardData";
import { DashboardLayout } from "./layout/DashboardLayout";
import { ApiErrorBanner } from "./table/columns";
import type { DealerMode } from "./config/dealerMode";

const ORDER_DATA_PAGES: PageKey[] = ["details", "topCustomers", "topProducts", "customerInsights", "orders"];
const DEALER_MODE_STORAGE_KEY = "nong-wangjai.dealer-mode";

export type DashboardOutletContext = {
  data: ReturnType<typeof useDealerDashboardData>;
  filters: ReturnType<typeof useDashboardFilters>;
  onSelectDealer: (dealerId: number) => void;
};

function DealerDashboardApp({ onLogout, user }: { onLogout: () => void; user: AuthSession }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [switchingTo, setSwitchingTo] = useState<DealerMode | null>(null);
  const modeFromUrl = searchParams.get("dealerMode");
  const storedDealerMode: DealerMode =
    typeof window !== "undefined" && window.localStorage.getItem(DEALER_MODE_STORAGE_KEY) === "osr" ? "osr" : "dealer";
  const dealerMode: DealerMode = modeFromUrl === "osr" ? "osr" : modeFromUrl === "dealer" ? "dealer" : storedDealerMode;
  const filters = useDashboardFilters();
  const data = useDealerDashboardData({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    orderSearch: filters.orderSearch,
    region: filters.region,
    search: filters.search,
    status: filters.status,
    dealerMode
  });

  useEffect(() => {
    window.localStorage.setItem(DEALER_MODE_STORAGE_KEY, dealerMode);
  }, [dealerMode]);

  useEffect(() => {
    if (switchingTo !== dealerMode) return undefined;

    const timer = window.setTimeout(() => setSwitchingTo(null), 450);
    return () => window.clearTimeout(timer);
  }, [dealerMode, switchingTo]);

  const context = useMemo<DashboardOutletContext>(
    () => ({
      data,
      filters,
      onSelectDealer: (dealerId: number) => {
        data.setSelectedDealerId(dealerId);
        navigate(PAGE_PATHS.details);
      }
    }),
    [data, filters, navigate]
  );

  const pageKey = getPageKeyFromPath(location.pathname);

  return (
    <DashboardLayout
      dateFrom={filters.dateFrom}
      datePreset={filters.datePreset}
      dateTo={filters.dateTo}
      dealerMode={dealerMode}
      onLogout={onLogout}
      onSetDealerMode={(mode) => {
        if (mode === dealerMode) return;
        setSwitchingTo(mode);
        window.localStorage.setItem(DEALER_MODE_STORAGE_KEY, mode);
        const nextParams = new URLSearchParams(searchParams);
        if (mode === "dealer") nextParams.delete("dealerMode");
        else nextParams.set("dealerMode", mode);
        setSearchParams(nextParams);
      }}
      setDateFrom={filters.setDateFrom}
      setDatePreset={filters.setDatePreset}
      setDateTo={filters.setDateTo}
      user={user}
    >
      {switchingTo ? (
        <div
          aria-live="polite"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/15 px-4 backdrop-blur-[2px] dark:bg-slate-950/45"
          role="status"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-xl dark:bg-slate-900 dark:text-slate-100">
            <LoaderCircle className="animate-spin text-sky-600" size={22} />
            กำลังเปลี่ยนเป็นโหมด {switchingTo === "osr" ? "OSR" : "Dealer"}
          </div>
        </div>
      ) : null}

      {pageKey && ORDER_DATA_PAGES.includes(pageKey) && data.ordersState === "error" && (
        <section className="grid grid-cols-1">
          <ApiErrorBanner message={data.ordersMessage ?? "โหลดข้อมูล orders ไม่สำเร็จ"} />
        </section>
      )}

      <Outlet context={context} />
    </DashboardLayout>
  );
}

export function useDashboardOutletContext() {
  return useOutletContext<DashboardOutletContext>();
}

export default DealerDashboardApp;
