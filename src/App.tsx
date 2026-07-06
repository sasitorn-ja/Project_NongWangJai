import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthGate } from "@/features/auth/AuthGate";
import { getLogoutHref } from "@/features/auth/paths";
import { getBasePath } from "@/lib/base-path";
import DealerDashboardApp from "@/features/dealers/dashboard";
import { PAGE_PATHS } from "@/features/dealers/dashboard/config/routes";
import { CustomerInsightsPage } from "@/features/dealers/dashboard/pages/CustomerInsightsPage";
import { DashboardPage } from "@/features/dealers/dashboard/pages/DashboardPage";
import { DetailsPage } from "@/features/dealers/dashboard/pages/DetailsPage";
import { GroupsPage } from "@/features/dealers/dashboard/pages/GroupsPage";
import { NetworkPage } from "@/features/dealers/dashboard/pages/NetworkPage";
import { OrdersPage } from "@/features/dealers/dashboard/pages/OrdersPage";
import { TopCustomersPage } from "@/features/dealers/dashboard/pages/TopCustomersPage";
import { TopProductsPage } from "@/features/dealers/dashboard/pages/TopProductsPage";

function App() {
  return (
    <BrowserRouter basename={getBasePath() || undefined}>
      <AuthGate>
        {(session) => (
          <Routes>
            <Route
              path="/"
              element={
                <DealerDashboardApp
                  onLogout={() => {
                    window.location.assign(getLogoutHref());
                  }}
                  user={session}
                />
              }
            >
              <Route index element={<Navigate to={PAGE_PATHS.dashboard} replace />} />
              <Route path={PAGE_PATHS.dashboard} element={<DashboardPage />} />
              <Route path={PAGE_PATHS.network} element={<NetworkPage />} />
              <Route path={PAGE_PATHS.groups} element={<GroupsPage />} />
              <Route path={PAGE_PATHS.details} element={<DetailsPage />} />
              <Route path={PAGE_PATHS.topCustomers} element={<TopCustomersPage />} />
              <Route path={PAGE_PATHS.topProducts} element={<TopProductsPage />} />
              <Route path={PAGE_PATHS.customerInsights} element={<CustomerInsightsPage />} />
              <Route path={PAGE_PATHS.orders} element={<OrdersPage />} />
              <Route path="*" element={<Navigate to={PAGE_PATHS.dashboard} replace />} />
            </Route>
          </Routes>
        )}
      </AuthGate>
    </BrowserRouter>
  );
}

export default App;
