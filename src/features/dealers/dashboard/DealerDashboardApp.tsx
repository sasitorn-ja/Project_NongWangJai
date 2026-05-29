import { useState } from "react";

import type { PageKey } from "./config/pageMeta";
import { useDashboardFilters } from "./hooks/useDashboardFilters";
import { useDealerDashboardData } from "./hooks/useDealerDashboardData";
import { DashboardLayout } from "./layout/DashboardLayout";
import { CustomerInsightsPage } from "./pages/CustomerInsightsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DetailsPage } from "./pages/DetailsPage";
import { GroupsPage } from "./pages/GroupsPage";
import { NetworkPage } from "./pages/NetworkPage";
import { OrdersPage } from "./pages/OrdersPage";
import { TopCustomersPage } from "./pages/TopCustomersPage";
import { TopProductsPage } from "./pages/TopProductsPage";
import { ApiErrorBanner } from "./table/columns";

const ORDER_DATA_PAGES: PageKey[] = ["details", "topCustomers", "topProducts", "customerInsights", "orders"];

function DealerDashboardApp() {
  const [page, setPage] = useState<PageKey>("dashboard");
  const filters = useDashboardFilters();
  const data = useDealerDashboardData({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    orderSearch: filters.orderSearch,
    region: filters.region,
    search: filters.search,
    status: filters.status
  });

  return (
    <DashboardLayout
      dateFrom={filters.dateFrom}
      datePreset={filters.datePreset}
      dateTo={filters.dateTo}
      page={page}
      setDateFrom={filters.setDateFrom}
      setDatePreset={filters.setDatePreset}
      setDateTo={filters.setDateTo}
      setPage={setPage}
    >
      {ORDER_DATA_PAGES.includes(page) && data.ordersState === "error" && (
        <section className="grid grid-cols-1">
          <ApiErrorBanner message={data.ordersMessage ?? "โหลดข้อมูล orders ไม่สำเร็จ"} />
        </section>
      )}

      {page === "dashboard" && (
        <DashboardPage
          activeRate={data.activeRate}
          apiMessage={data.apiMessage}
          apiState={data.apiState}
          filteredDealers={data.filteredDealers}
          region={filters.region}
          regionRows={data.regionRows}
          regions={data.regions}
          search={filters.search}
          setPage={setPage}
          setRegion={filters.setRegion}
          setSearch={filters.setSearch}
          setSelectedDealerId={data.setSelectedDealerId}
          setStatus={filters.setStatus}
          status={filters.status}
          topDealer={data.topDealer}
          totalGroups={data.totalGroups}
          totalVolume={data.totalVolume}
        />
      )}

      {page === "network" && (
        <NetworkPage
          apiState={data.apiState}
          dealers={data.filteredDealers}
          onSelectDealer={(dealerId) => {
            data.setSelectedDealerId(dealerId);
            setPage("details");
          }}
        />
      )}

      {page === "groups" && (
        <GroupsPage
          dealers={data.dealers}
          groups={data.filteredGroups}
          groupsState={data.groupsState}
          selectedDealer={data.selectedDealer}
          selectedDealerId={data.selectedDealerId}
          setSelectedDealerId={data.setSelectedDealerId}
          usageRows={data.filteredUsageRows}
        />
      )}

      {page === "details" && (
        <DetailsPage
          customers={data.filteredCustomers}
          customersState={data.customersState}
          dealers={data.dealers}
          filteredDealers={data.filteredDealers}
          groups={data.filteredGroups}
          groupsState={data.groupsState}
          orders={data.filteredOrders}
          ordersState={data.ordersState}
          selectedDealer={data.selectedDealer}
          selectedDealerId={data.selectedDealerId}
          setSelectedDealerId={data.setSelectedDealerId}
          sites={data.filteredSites}
          sitesState={data.sitesState}
          usageRows={data.filteredUsageRows}
        />
      )}

      {page === "topCustomers" && (
        <TopCustomersPage dealers={data.dealers} orders={data.filteredOrders} ordersState={data.ordersState} />
      )}

      {page === "topProducts" && (
        <TopProductsPage dealers={data.dealers} orders={data.filteredOrders} ordersState={data.ordersState} />
      )}

      {page === "customerInsights" && (
        <CustomerInsightsPage
          dealers={data.dealers}
          orders={data.filteredOrders}
          ordersState={data.ordersState}
          selectedDealer={data.selectedDealer}
          selectedDealerId={data.selectedDealerId}
          setSelectedDealerId={data.setSelectedDealerId}
        />
      )}

      {page === "orders" && (
        <OrdersPage
          dealers={data.dealers}
          orders={data.filteredOrders}
          ordersState={data.ordersState}
          orderSearch={filters.orderSearch}
          selectedDealer={data.selectedDealer}
          selectedDealerId={data.selectedDealerId}
          setOrderSearch={filters.setOrderSearch}
          setSelectedDealerId={data.setSelectedDealerId}
        />
      )}
    </DashboardLayout>
  );
}

export default DealerDashboardApp;
