import { useMemo } from "react";
import { Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";

import type { AuthSession } from "@/features/auth/types";

import type { PageKey } from "./config/pageMeta";
import { PAGE_PATHS, getPageKeyFromPath } from "./config/routes";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDealerDashboardData } from "./hooks/useDealerDashboardData";
import { DashboardLayout } from "./layout/DashboardLayout";
import { ApiErrorBanner } from "./table/columns";

const ORDER_DATA_PAGES: PageKey[] = ["details", "topCustomers", "topProducts", "customerInsights", "orders"];

export type DashboardOutletContext = {
  data: ReturnType<typeof useDealerDashboardData>;
  filters: ReturnType<typeof useDashboardFilters>;
  onSelectDealer: (dealerId: number) => void;
};

function DealerDashboardApp({ onLogout, user }: { onLogout: () => void; user: AuthSession }) {
  const navigate = useNavigate();
  const location = useLocation();
  const filters = useDashboardFilters();
  const data = useDealerDashboardData({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    orderSearch: filters.orderSearch,
    region: filters.region,
    search: filters.search,
    status: filters.status
  });

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
      onLogout={onLogout}
      setDateFrom={filters.setDateFrom}
      setDatePreset={filters.setDatePreset}
      setDateTo={filters.setDateTo}
      user={user}
    >
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
