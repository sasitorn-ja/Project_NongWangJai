import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Database,
  LayoutDashboard,
  Layers3,
  Moon,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  TrendingUp,
  Users
} from "lucide-react";

import cpacLogo from "@/img/cpac-logo.jpg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchCustomerUsage,
  fetchDealerGroups,
  fetchDealerSites,
  fetchDealerUsage,
  fetchDealers,
  fetchOrders
} from "@/features/dealers/api/dealers";
import type {
  ApiState,
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";

import {
  CustomerInsightsPage,
  DashboardPage,
  DateRangeToolbar,
  DetailsPage,
  GroupsPage,
  NetworkPage,
  OrdersPage,
  SideNavItem,
  TopCustomersPage,
  TopProductsPage
} from "./components";
import {
  type DatePreset,
  type PageKey,
  getDealerStatusKey,
  getPageSubtitle,
  getPageTitle,
  getPresetDateRange,
  groupByRegion,
  isDealerActive,
  isWithinDateRange,
  normalizeSearch
} from "./utils";

function DealerDashboardApp() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [page, setPage] = useState<PageKey>("dashboard");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [apiState, setApiState] = useState<ApiState>("loading");
  const [apiMessage, setApiMessage] = useState<string | undefined>();
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [groupsState, setGroupsState] = useState<ApiState>("loading");
  const [usageRows, setUsageRows] = useState<DealerUsage[]>([]);
  const [customers, setCustomers] = useState<CustomerUsage[]>([]);
  const [customersState, setCustomersState] = useState<ApiState>("loading");
  const [sites, setSites] = useState<DealerSite[]>([]);
  const [sitesState, setSitesState] = useState<ApiState>("loading");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersState, setOrdersState] = useState<ApiState>("loading");

  const loadDealers = useCallback(async () => {
    setApiState("loading");
    setApiMessage(undefined);
    const result = await fetchDealers();
    setDealers(result.rows);
    setApiState(result.state);
    setApiMessage(result.message);
    setSelectedDealerId((current) => current ?? result.rows[0]?.dealer_id ?? null);
  }, []);

  const loadUsage = useCallback(async () => {
    const result = await fetchDealerUsage();
    setUsageRows(result.rows);
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersState("loading");
    const result = await fetchOrders();
    setOrders(result.rows);
    setOrdersState(result.state);
  }, []);

  const loadDealerChildren = useCallback(async (dealerId: number) => {
    setGroupsState("loading");
    setCustomersState("loading");
    setSitesState("loading");
    const [groupResult, customerResult, siteResult] = await Promise.all([
      fetchDealerGroups(dealerId),
      fetchCustomerUsage(dealerId),
      fetchDealerSites(dealerId)
    ]);
    setGroups(groupResult.rows);
    setGroupsState(groupResult.state);
    setCustomers(customerResult.rows);
    setCustomersState(customerResult.state);
    setSites(siteResult.rows);
    setSitesState(siteResult.state);
  }, []);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadDealers();
      void loadUsage();
      void loadOrders();
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [loadDealers, loadOrders, loadUsage]);

  useEffect(() => {
    if (!selectedDealerId) return undefined;

    const requestId = window.setTimeout(() => {
      void loadDealerChildren(selectedDealerId);
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [loadDealerChildren, selectedDealerId]);

  const selectedDealer = useMemo(
    () => dealers.find((dealer) => dealer.dealer_id === selectedDealerId) ?? dealers[0],
    [dealers, selectedDealerId]
  );

  const regions = useMemo(() => Array.from(new Set(dealers.map((dealer) => dealer.region))).sort(), [dealers]);

  const filteredDealers = useMemo(() => {
    const q = normalizeSearch(search);
    return dealers.filter((dealer) => {
      const matchRegion = region === "all" || dealer.region === region;
      const matchStatus =
        status === "all" ||
        (status === "active" && getDealerStatusKey(dealer.status) === "active") ||
        (status === "idle" && getDealerStatusKey(dealer.status) === "idle") ||
        (status === "new" && getDealerStatusKey(dealer.status) === "new");
      const haystack = `${dealer.dealer_code} ${dealer.dealer_name} ${dealer.province} ${dealer.region}`.toLowerCase();
      const matchDate = isWithinDateRange(dealer.last_active_at ?? dealer.updated_at ?? dealer.created_at, dateFrom, dateTo);
      return matchRegion && matchStatus && matchDate && (!q || haystack.includes(q));
    });
  }, [dateFrom, dateTo, dealers, region, search, status]);

  const totalVolume = filteredDealers.reduce((sum, dealer) => sum + dealer.volume, 0);
  const totalGroups = filteredDealers.reduce((sum, dealer) => sum + dealer.group_count, 0);
  const activeDealers = filteredDealers.filter((dealer) => isDealerActive(dealer.status)).length;
  const topDealer = [...filteredDealers].sort((a, b) => b.volume - a.volume)[0];
  const regionRows = groupByRegion(filteredDealers);
  const activeRate = filteredDealers.length ? Math.round((activeDealers / filteredDealers.length) * 100) : 0;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset === "custom") return;
    const range = getPresetDateRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const filteredGroups = useMemo(
    () => groups.filter((group) => isWithinDateRange(group.created_at ?? group.updated_at, dateFrom, dateTo)),
    [dateFrom, dateTo, groups]
  );

  const filteredUsageRows = useMemo(
    () => usageRows.filter((row) => isWithinDateRange(row.updated_at, dateFrom, dateTo)),
    [dateFrom, dateTo, usageRows]
  );

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => isWithinDateRange(customer.updated_at, dateFrom, dateTo)),
    [customers, dateFrom, dateTo]
  );

  const filteredSites = useMemo(
    () => sites.filter((site) => isWithinDateRange(site.last_pour_datetime ?? site.updated_at ?? site.created_at, dateFrom, dateTo)),
    [dateFrom, dateTo, sites]
  );

  const filteredOrders = useMemo(() => {
    const q = normalizeSearch(orderSearch);
    return orders.filter((order) => {
      const matchDate = isWithinDateRange(order.pour_datetime ?? order.updated_at ?? order.created_at, dateFrom, dateTo);
      if (!matchDate) return false;
      if (!q) return true;

      const haystack = normalizeSearch(
        [
          order.dealer_code,
          order.dealer_name,
          order.customer?.code,
          order.customer?.name,
          order.site?.site_code,
          order.site?.site_name,
          order.order?.order_no,
          order.order?.product_sku,
          order.order?.product_name,
          order.status?.order
        ]
          .filter(Boolean)
          .join(" ")
      );

      return haystack.includes(q);
    });
  }, [dateFrom, dateTo, orderSearch, orders]);

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
          "brand-sider fixed bottom-0 left-0 top-0 z-30 w-[228px] transition-transform duration-200 md:z-20 md:transition-all",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[64px]" : "md:w-[228px]"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 px-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d9e3e6] bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <img src={cpacLogo} alt="CPAC" className="h-full w-full object-contain" />
            </div>
            {(!collapsed || mobileNavOpen) && (
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-950 dark:text-slate-100">Nong WangJai</div>
                <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Dealer Intelligence</div>
              </div>
            )}
          </div>

          <nav className="space-y-1 px-2.5">
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<LayoutDashboard size={16} />}
              label="Dashboard"
              selected={page === "dashboard"}
              onClick={() => {
                setPage("dashboard");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<Layers3 size={16} />}
              label="Dealer Network"
              selected={page === "network"}
              onClick={() => {
                setPage("network");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<Users size={16} />}
              label="Dealer Groups"
              selected={page === "groups"}
              onClick={() => {
                setPage("groups");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<Database size={16} />}
              label="Dealer Details"
              selected={page === "details"}
              onClick={() => {
                setPage("details");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<TrendingUp size={16} />}
              label="Top N Dealers"
              selected={page === "topCustomers"}
              onClick={() => {
                setPage("topCustomers");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<PackageCheck size={16} />}
              label="Top N Products"
              selected={page === "topProducts"}
              onClick={() => {
                setPage("topProducts");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<TrendingUp size={16} />}
              label="Dealer Insights"
              selected={page === "customerInsights"}
              onClick={() => {
                setPage("customerInsights");
                setMobileNavOpen(false);
              }}
            />
            <SideNavItem
              collapsed={collapsed && !mobileNavOpen}
              icon={<PackageCheck size={16} />}
              label="Orders"
              selected={page === "orders"}
              onClick={() => {
                setPage("orders");
                setMobileNavOpen(false);
              }}
            />
          </nav>

        </div>
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "md:pl-[64px]" : "md:pl-[228px]")}>
        <header className="app-header sticky top-0 z-10 border-b border-[#d7e0e3] bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:px-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:items-center">
              <div className="flex items-center gap-2 md:hidden">
                <button
                  aria-label="Open menu"
                  className="flex h-10 w-10 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm hover:bg-[#f2f6f7] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setMobileNavOpen(true)}
                  type="button"
                >
                  <PanelLeftOpen size={18} />
                </button>
              </div>
              <button
                className="hidden h-9 w-9 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm hover:bg-[#f2f6f7] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 md:flex"
                onClick={() => setCollapsed((value) => !value)}
                title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
                type="button"
              >
                {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-slate-100 lg:text-xl">{getPageTitle(page)}</h1>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{getPageSubtitle(page)}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-end">
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <span className="inline-flex h-10 items-center rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black uppercase tracking-[0.2em] text-red-600 shadow-sm">
                  Test
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Toggle theme"
                  className="shrink-0 bg-white shadow-sm"
                  onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </Button>
              </div>
              <DateRangeToolbar
                dateFrom={dateFrom}
                datePreset={datePreset}
                dateTo={dateTo}
                setDateFrom={setDateFrom}
                setDatePreset={handleDatePresetChange}
                setDateTo={setDateTo}
              />
            </div>
          </div>
        </header>

        <main className="space-y-3 p-3 lg:p-4">
          {page === "dashboard" && (
            <DashboardPage
              activeRate={activeRate}
              apiMessage={apiMessage}
              apiState={apiState}
              filteredDealers={filteredDealers}
              region={region}
              regionRows={regionRows}
              regions={regions}
              search={search}
              setPage={setPage}
              setRegion={setRegion}
              setSearch={setSearch}
              setSelectedDealerId={setSelectedDealerId}
              setStatus={setStatus}
              status={status}
              topDealer={topDealer}
              totalGroups={totalGroups}
              totalVolume={totalVolume}
            />
          )}

          {page === "network" && (
            <NetworkPage dealers={filteredDealers} apiState={apiState} />
          )}

          {page === "groups" && (
            <GroupsPage
              dealers={dealers}
              groups={filteredGroups}
              groupsState={groupsState}
              selectedDealer={selectedDealer}
              selectedDealerId={selectedDealerId}
              setSelectedDealerId={setSelectedDealerId}
              usageRows={filteredUsageRows}
            />
          )}

          {page === "details" && (
            <DetailsPage
              customers={filteredCustomers}
              customersState={customersState}
              dealers={dealers}
              selectedDealer={selectedDealer}
              selectedDealerId={selectedDealerId}
              setSelectedDealerId={setSelectedDealerId}
              sites={filteredSites}
              sitesState={sitesState}
              usageRows={filteredUsageRows}
            />
          )}

          {page === "topCustomers" && (
            <TopCustomersPage dealers={dealers} orders={filteredOrders} ordersState={ordersState} />
          )}

          {page === "topProducts" && (
            <TopProductsPage dealers={dealers} orders={filteredOrders} ordersState={ordersState} />
          )}

          {page === "customerInsights" && (
            <CustomerInsightsPage
              dealers={dealers}
              orders={filteredOrders}
              ordersState={ordersState}
              selectedDealer={selectedDealer}
              selectedDealerId={selectedDealerId}
              setSelectedDealerId={setSelectedDealerId}
            />
          )}

          {page === "orders" && (
            <OrdersPage
              dealers={dealers}
              orders={filteredOrders}
              ordersState={ordersState}
              orderSearch={orderSearch}
              selectedDealer={selectedDealer}
              selectedDealerId={selectedDealerId}
              setOrderSearch={setOrderSearch}
              setSelectedDealerId={setSelectedDealerId}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default DealerDashboardApp;
