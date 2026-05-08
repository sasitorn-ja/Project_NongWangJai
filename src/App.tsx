import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Database,
  LayoutDashboard,
  Layers3,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Moon,
  ChevronDown,
  Sun,
  TrendingUp,
  User,
  Users
} from "lucide-react";
import cpacLogo from "@/img/cpac-logo.jpg";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from "@/components/ui/pagination";
import {
  fetchCustomerUsage,
  fetchDealerGroups,
  fetchOrders,
  fetchDealerSites,
  fetchDealerUsage,
  fetchDealers
} from "@/services/dealers";
import type { ApiState, CustomerUsage, Dealer, DealerGroup, DealerSite, DealerUsage, OrderItem } from "@/types/dealer";
import { cn, compactNumber, formatNumber } from "@/lib/utils";

type PageKey = "dashboard" | "groups" | "details" | "orders";
type DatePreset = "all" | "7d" | "30d" | "90d" | "custom";
type DataColumn<T> = {
  align?: "left" | "right" | "center";
  dataIndex?: keyof T;
  key: string;
  render?: (value: never, record: T) => ReactNode;
  title: ReactNode;
  width?: number;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function getDealerStatusKey(statusValue: Dealer["status"] | unknown): "active" | "idle" | "new" {
  if (typeof statusValue === "boolean") return statusValue ? "active" : "idle";

  const value = String(statusValue ?? "").toLowerCase();
  if (value === "active") return "active";
  if (value === "new") return "new";
  return "idle";
}

function isDealerActive(statusValue: Dealer["status"]) {
  return getDealerStatusKey(statusValue) === "active";
}

function statusText(value: unknown) {
  const key = getDealerStatusKey(value);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function orderStatusText(value?: string | null) {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dateText(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function parseDateValue(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDateRange(preset: DatePreset) {
  if (preset === "all") return { from: "", to: "" };

  const today = new Date();
  const end = formatDateInputValue(today);
  const start = new Date(today);
  const offsetDays = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  start.setDate(today.getDate() - offsetDays);

  return { from: formatDateInputValue(start), to: end };
}

function isWithinDateRange(value: string | null | undefined, from: string, to: string) {
  if (!from && !to) return true;

  const date = parseDateValue(value);
  if (!date) return false;

  if (from) {
    const start = new Date(`${from}T00:00:00`);
    if (date < start) return false;
  }

  if (to) {
    const end = new Date(`${to}T23:59:59`);
    if (date > end) return false;
  }

  return true;
}

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis-right", totalPages];
  if (currentPage >= totalPages - 2) return [1, "ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages];
}

function groupByRegion(rows: Dealer[]) {
  const grouped = rows.reduce<Record<string, { region: string; dealers: number; groups: number; volume: number }>>(
    (acc, dealer) => {
      const current = acc[dealer.region] ?? { region: dealer.region, dealers: 0, groups: 0, volume: 0 };
      current.dealers += 1;
      current.groups += dealer.group_count;
      current.volume += dealer.volume;
      acc[dealer.region] = current;
      return acc;
    },
    {}
  );

  return Object.values(grouped).sort((a, b) => b.volume - a.volume);
}

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [page, setPage] = useState<PageKey>("dashboard");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [apiState, setApiState] = useState<ApiState>("loading");
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
    const result = await fetchDealers();
    setDealers(result.rows);
    setApiState(result.state);
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
      <aside className={cn("brand-sider fixed bottom-0 left-0 top-0 z-20 transition-all", collapsed ? "w-[64px]" : "w-[228px]")}>
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-3 px-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d9e3e6] bg-white p-1.5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <img src={cpacLogo} alt="CPAC" className="h-full w-full object-contain" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-950 dark:text-slate-100">Nong WangJai</div>
                <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Dealer Intelligence</div>
              </div>
            )}
          </div>

          <nav className="space-y-1 px-2.5">
            <SideNavItem
              collapsed={collapsed}
              icon={<LayoutDashboard size={16} />}
              label="Dashboard"
              selected={page === "dashboard"}
              onClick={() => setPage("dashboard")}
            />
            <SideNavItem
              collapsed={collapsed}
              icon={<Users size={16} />}
              label="Dealer Groups"
              selected={page === "groups"}
              onClick={() => setPage("groups")}
            />
            <SideNavItem
              collapsed={collapsed}
              icon={<Database size={16} />}
              label="Dealer Details"
              selected={page === "details"}
              onClick={() => setPage("details")}
            />
            <SideNavItem
              collapsed={collapsed}
              icon={<PackageCheck size={16} />}
              label="Orders"
              selected={page === "orders"}
              onClick={() => setPage("orders")}
            />
          </nav>

        </div>
      </aside>

      <div className={cn("min-h-screen transition-all", collapsed ? "pl-[64px]" : "pl-[228px]")}>
        <header className="app-header sticky top-0 z-10 border-b border-[#d7e0e3] bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                  className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d5e0e3] bg-white text-slate-700 shadow-sm hover:bg-[#f2f6f7] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setCollapsed((value) => !value)}
                title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
                type="button"
              >
                {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold text-slate-950 dark:text-slate-100 lg:text-xl">
                  {page === "dashboard"
                    ? "Dashboard"
                    : page === "groups"
                      ? "Dealer Groups"
                      : page === "details"
                        ? "Dealer Details"
                        : "Orders"}
                </h1>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {page === "dashboard"
                    ? "ภาพรวมทุก Dealer"
                    : page === "groups"
                      ? "เจาะ Dealer ทีละรายเพื่อดูรายการกลุ่ม"
                      : page === "details"
                        ? "Usage, customers และ sites ของแต่ละ Dealer"
                        : "รายการ order จากเส้น API จริง"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DateRangeToolbar
                dateFrom={dateFrom}
                datePreset={datePreset}
                dateTo={dateTo}
                setDateFrom={setDateFrom}
                setDatePreset={handleDatePresetChange}
                setDateTo={setDateTo}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Toggle theme"
                className="bg-white shadow-sm"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
            </div>
          </div>
        </header>

        <main className="space-y-3 p-3 lg:p-4">
          {page === "dashboard" && (
            <DashboardPage
              activeRate={activeRate}
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

type DashboardPageProps = {
  activeRate: number;
  apiState: ApiState;
  filteredDealers: Dealer[];
  region: string;
  regionRows: ReturnType<typeof groupByRegion>;
  regions: string[];
  search: string;
  setPage: (page: PageKey) => void;
  setRegion: (value: string) => void;
  setSearch: (value: string) => void;
  setSelectedDealerId: (id: number) => void;
  setStatus: (value: string) => void;
  status: string;
  topDealer?: Dealer;
  totalGroups: number;
  totalVolume: number;
};

function SideNavItem({
  collapsed,
  icon,
  label,
  onClick,
  selected
}: {
  collapsed: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={cn(
        "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
        selected && "bg-slate-100 text-slate-950"
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className={cn("shrink-0", selected ? "text-slate-950" : "text-slate-500")}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function DashboardPage(props: DashboardPageProps) {
  const pageSize = 10;
  const [tablePage, setTablePage] = useState(1);
  const totalPages = Math.max(Math.ceil(props.filteredDealers.length / pageSize), 1);
  const pagedDealers = props.filteredDealers.slice((tablePage - 1) * pageSize, tablePage * pageSize);

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setTablePage(1);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [props.filteredDealers.length, props.region, props.search, props.status]);

  const columns: DataColumn<Dealer>[] = [
    dealerColumn((dealer) => {
      props.setSelectedDealerId(dealer.dealer_id);
      props.setPage("groups");
    }),
    { title: "ภูมิภาค", dataIndex: "region", key: "region", width: 160, render: regionPill },
    { title: "จังหวัด", dataIndex: "province", key: "province", width: 140 },
    {
      title: "Volume",
      dataIndex: "volume",
      key: "volume",
      align: "right",
      width: 160,
      render: (_, record) => (
        <VolumeCell value={record.volume} unit={record.unit} max={Math.max(props.topDealer?.volume ?? 1, 1)} />
      )
    },
    {
      title: "กลุ่ม",
      dataIndex: "group_count",
      key: "group_count",
      align: "right",
      width: 110,
      render: formatNumber
    },
    {
      title: "ใช้งานล่าสุด",
      dataIndex: "last_active_at",
      key: "last_active_at",
      width: 190,
      render: dateText
    },
    statusColumn<Dealer>()
  ];

  return (
    <>
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={<PackageCheck size={18} />} label="Total Volume" value={`${compactNumber(props.totalVolume)} m3`} detail={`${formatNumber(props.totalVolume)} m3 across selected dealers`} />
        <MetricCard icon={<Users size={18} />} label="Active Dealers" value={`${props.activeRate}%`} detail="Active dealer status from API" tone="green" />
        <MetricCard icon={<Layers3 size={18} />} label="Total Groups" value={formatNumber(props.totalGroups)} detail="จำนวนกลุ่มรวมของ dealer ที่กำลังแสดง" tone="rose" />
      </section>
      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Volume by Region</CardTitle>
            <p className="text-xs font-medium text-slate-500">เทียบปริมาณคอนกรีตส่งจริงรวมรายภูมิภาค พร้อมดูรายละเอียดเมื่อชี้แต่ละแท่ง</p>
          </CardHeader>
          <CardContent>
            <RegionVolumeExplorer regionRows={props.regionRows} />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3">
        <Card className="dashboard-card overflow-hidden">
          <CardHeader className="border-b border-[#d9e3e6] bg-white">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(400px,620px)] xl:items-center">
              <div>
                <CardTitle className="text-lg">ภาพรวม Dealer ทั้งหมด</CardTitle>
                <p className="mt-1 max-w-xl text-xs font-medium leading-5 text-slate-500">
                  ดูปริมาณคอนกรีตส่งจริงรวม จำนวนกลุ่ม วันที่ใช้งานล่าสุด และสถานะ dealer
                </p>
              </div>
              <FilterBar
                region={props.region}
                regions={props.regions}
                search={props.search}
                setRegion={props.setRegion}
                setSearch={props.setSearch}
                setStatus={props.setStatus}
                status={props.status}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable columns={columns} data={pagedDealers} loading={props.apiState === "loading"} rowKey="dealer_id" minWidth={1180} />
            <ShadcnPagination
              currentPage={tablePage}
              pageSize={pageSize}
              totalItems={props.filteredDealers.length}
              totalPages={totalPages}
              onPageChange={setTablePage}
            />
          </CardContent>
        </Card>
      </section>
    </>
  );
}

type GroupsPageProps = {
  dealers: Dealer[];
  groups: DealerGroup[];
  groupsState: ApiState;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number) => void;
  usageRows: DealerUsage[];
};

function GroupsPage({ dealers, groups, groupsState, selectedDealer, selectedDealerId, setSelectedDealerId, usageRows }: GroupsPageProps) {
  const totalDelivered = groups.reduce((sum, group) => sum + group.delivered_volume, 0);
  const totalBooked = groups.reduce((sum, group) => sum + group.booked_volume, 0);
  const totalPriceChecks = groups.reduce((sum, group) => sum + group.price_check_count, 0);
  const totalBookings = groups.reduce((sum, group) => sum + group.booking_count, 0);
  const topGroups = useMemo(
    () =>
      [...groups]
        .sort(
          (a, b) =>
            Math.max(b.delivered_volume, b.booked_volume) - Math.max(a.delivered_volume, a.booked_volume)
        )
        .slice(0, 8),
    [groups]
  );

  const columns: DataColumn<DealerGroup>[] = [
    {
      title: "Group",
      dataIndex: "group_name",
      key: "group_name",
      width: 320,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.group_name}</div>
          <div className="text-xs font-medium text-slate-500">ID: {record.group_id} | Type: {record.group_type ?? "-"}</div>
        </div>
      )
    },
    { title: "ส่งจริง", dataIndex: "delivered_volume", key: "delivered_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "จอง", dataIndex: "booked_volume", key: "booked_volume", align: "right", width: 150, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "เช็คราคา", dataIndex: "price_check_count", key: "price_check_count", align: "right", width: 130, render: formatNumber },
    { title: "จองคิว", dataIndex: "booking_count", key: "booking_count", align: "right", width: 130, render: formatNumber },
    { title: "วันที่สร้าง", dataIndex: "created_at", key: "created_at", width: 190, render: dateText },
    statusColumn<DealerGroup>()
  ];

  return (
    <>
      <DealerPicker dealers={dealers} selectedDealerId={selectedDealerId} setSelectedDealerId={setSelectedDealerId} title="เลือก Dealer เพื่อดูรายการกลุ่ม" />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Layers3 size={18} />} label="Groups" value={formatNumber(groups.length)} detail={selectedDealer?.dealer_name ?? "Select dealer"} />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered" value={`${compactNumber(totalDelivered)} m3`} detail="ปริมาณคอนกรีตส่งจริงของกลุ่ม" tone="green" />
        <MetricCard icon={<TrendingUp size={18} />} label="Booked" value={`${compactNumber(totalBooked)} m3`} detail="ปริมาณคอนกรีตที่มีการจอง" tone="amber" />
        <MetricCard icon={<Search size={18} />} label="Price / Booking" value={`${formatNumber(totalPriceChecks)} / ${formatNumber(totalBookings)}`} detail="จำนวนเช็คราคาและจองคิว" tone="rose" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Delivered vs Booked by Group</CardTitle>
            <p className="text-xs font-medium text-slate-500">
              แสดงเฉพาะ {formatNumber(topGroups.length)} กลุ่มที่มี volume สูงสุดจากทั้งหมด {formatNumber(groups.length)} กลุ่ม เพื่อดูว่ากลุ่มไหนจองนำหรือส่งจริงนำ
            </p>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={topGroups.map((group) => ({
                label: group.group_name,
                primary: group.delivered_volume,
                secondary: group.booked_volume
              }))}
              primaryLabel="Delivered"
              secondaryLabel="Booked"
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Activity Funnel</CardTitle>
            <p className="text-xs font-medium text-slate-500">ภาพรวมการใช้งานจากเช็คราคาไปสู่การจอง</p>
          </CardHeader>
          <CardContent>
            <FunnelBars
              rows={[
                { label: "Dealer price checks", value: usageRows.find((row) => row.dealer_id === selectedDealerId)?.price_concrete_count ?? totalPriceChecks },
                { label: "Group price checks", value: totalPriceChecks },
                { label: "Group bookings", value: totalBookings }
              ]}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="dashboard-card overflow-hidden">
        <CardHeader className="border-b border-[#d9e3e6]">
          <CardTitle className="text-lg">รายการกลุ่มของ Dealer</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable columns={columns} data={groups} loading={groupsState === "loading"} rowKey="group_id" minWidth={1180} pageSize={10} />
        </CardContent>
      </Card>
    </>
  );
}

type DetailsPageProps = {
  customers: CustomerUsage[];
  customersState: ApiState;
  dealers: Dealer[];
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number) => void;
  sites: DealerSite[];
  sitesState: ApiState;
  usageRows: DealerUsage[];
};

function DetailsPage(props: DetailsPageProps) {
  const selectedUsage = props.usageRows.find((row) => row.dealer_id === props.selectedDealerId);

  const customerColumns: DataColumn<CustomerUsage>[] = [
    { title: "Customer", dataIndex: "customer_name", key: "customer_name", width: 280, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.customer_name}</div><div className="text-xs font-medium text-slate-500">{record.customer_code}</div></div> },
    { title: "เช็คราคา", dataIndex: "price_concrete_count", key: "price_concrete_count", align: "right", width: 140, render: formatNumber },
    { title: "สร้างจองคิว", dataIndex: "booking_create_count", key: "booking_create_count", align: "right", width: 150, render: formatNumber },
    { title: "อัปเดตล่าสุด", dataIndex: "updated_at", key: "updated_at", width: 190, render: dateText }
  ];

  const siteColumns: DataColumn<DealerSite>[] = [
    { title: "Site", dataIndex: "site_name", key: "site_name", width: 300, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.site_name}</div><div className="text-xs font-medium text-slate-500">{record.site_code}</div></div> },
    { title: "Customer", dataIndex: "customer", key: "customer", width: 240, render: (_, record) => record.customer?.name ?? "-" },
    { title: "Ordered", dataIndex: "total_ordered", key: "total_ordered", align: "right", width: 130, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "Delivered", dataIndex: "total_delivered", key: "total_delivered", align: "right", width: 130, render: (value, record) => `${formatNumber(value)} ${record.unit}` },
    { title: "เทล่าสุด", dataIndex: "last_pour_datetime", key: "last_pour_datetime", width: 190, render: dateText },
    statusColumn<DealerSite>()
  ];

  return (
    <>
      <DealerPicker dealers={props.dealers} selectedDealerId={props.selectedDealerId} setSelectedDealerId={props.setSelectedDealerId} title="เลือก Dealer เพื่อดูรายละเอียด" />
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard icon={<Search size={18} />} label="Price Checks" value={formatNumber(selectedUsage?.price_concrete_count ?? 0)} detail="จำนวนครั้งที่ dealer เช็คราคา" />
        <MetricCard icon={<Clock3 size={18} />} label="Bookings" value={formatNumber(selectedUsage?.booking_create_count ?? 0)} detail="จำนวนครั้งที่สร้างจองคิว" tone="amber" />
        <MetricCard icon={<User size={18} />} label="Customers" value={formatNumber(selectedUsage?.customer_create_count ?? props.customers.length)} detail="จำนวนลูกค้าของ dealer" tone="green" />
      </section>

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Customer Activity</CardTitle>
            <p className="text-xs font-medium text-slate-500">ลูกค้าที่มีการเช็คราคาและสร้างจองคิวสูงสุด</p>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={props.customers.slice(0, 8).map((customer) => ({
                label: customer.customer_name,
                primary: customer.price_concrete_count,
                secondary: customer.booking_create_count
              }))}
              primaryLabel="Price checks"
              secondaryLabel="Bookings"
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Site Delivery Progress</CardTitle>
            <p className="text-xs font-medium text-slate-500">สัดส่วนส่งแล้วเทียบกับยอดสั่งของ site</p>
          </CardHeader>
          <CardContent>
            <ProgressList
              rows={props.sites.slice(0, 8).map((site) => ({
                label: site.site_name,
                value: site.total_delivered,
                total: site.total_ordered,
                unit: site.unit
              }))}
            />
          </CardContent>
        </Card>
      </section>

      <Card className="dashboard-card">
        <CardHeader className="border-b border-[#d9e3e6]">
          <CardTitle className="text-lg">Dealer Usage Summary</CardTitle>
          <p className="text-xs font-medium text-slate-500">{props.selectedDealer?.dealer_name ?? "-"} | Updated: {dateText(selectedUsage?.updated_at)}</p>
        </CardHeader>
      </Card>

      <ShadcnTabs
        items={[
          {
            key: "customers",
            label: "Customers",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardContent className="p-0">
                  <DataTable columns={customerColumns} data={props.customers} loading={props.customersState === "loading"} rowKey="customer_id" minWidth={760} pageSize={10} />
                </CardContent>
              </Card>
            )
          },
          {
            key: "sites",
            label: "Sites",
            content: (
              <Card className="dashboard-card overflow-hidden">
                <CardContent className="p-0">
                  <DataTable columns={siteColumns} data={props.sites} loading={props.sitesState === "loading"} rowKey="site_id" minWidth={1120} pageSize={10} />
                </CardContent>
              </Card>
            )
          }
        ]}
      />
    </>
  );
}

function OrdersPage({
  dealers,
  orders,
  ordersState,
  orderSearch,
  selectedDealer,
  selectedDealerId,
  setOrderSearch,
  setSelectedDealerId
}: {
  dealers: Dealer[];
  orders: OrderItem[];
  ordersState: ApiState;
  orderSearch: string;
  selectedDealer?: Dealer;
  selectedDealerId: number | null;
  setOrderSearch: (value: string) => void;
  setSelectedDealerId: (id: number) => void;
}) {
  const dealerOrders = useMemo(
    () => orders.filter((row) => selectedDealerId == null || row.dealer_id === selectedDealerId),
    [orders, selectedDealerId]
  );
  const totalOrdered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.ordered ?? 0), 0);
  const totalDelivered = dealerOrders.reduce((sum, row) => sum + (row.quantity?.delivered ?? 0), 0);
  const uniqueSites = new Set(dealerOrders.map((row) => row.site?.site_code).filter(Boolean)).size;
  const inProgressOrders = dealerOrders.filter((row) => row.status?.order === "in_progress").length;

  const columns: DataColumn<OrderItem>[] = [
    {
      title: "Order",
      key: "order",
      width: 300,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.order?.product_name ?? "-"}</div>
          <div className="text-xs font-medium text-slate-500">
            {record.order?.order_no ?? "-"} | {record.order?.product_sku ?? "-"}
          </div>
        </div>
      )
    },
    {
      title: "Dealer",
      key: "dealer",
      width: 240,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.dealer_name}</div>
          <div className="text-xs font-medium text-slate-500">{record.dealer_code}</div>
        </div>
      )
    },
    {
      title: "Customer / Site",
      key: "customer-site",
      width: 280,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-950">{record.customer?.name ?? "-"}</div>
          <div className="text-xs font-medium text-slate-500">
            {(record.site?.site_name ?? "-")} | {(record.site?.site_code ?? "-")}
          </div>
        </div>
      )
    },
    {
      title: "Ordered",
      key: "ordered",
      align: "right",
      width: 130,
      render: (_, record) => `${formatNumber(record.quantity?.ordered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Delivered",
      key: "delivered",
      align: "right",
      width: 130,
      render: (_, record) => `${formatNumber(record.quantity?.delivered ?? 0)} ${record.quantity?.unit ?? "-"}`
    },
    {
      title: "Pour Time",
      dataIndex: "pour_datetime",
      key: "pour_datetime",
      width: 190,
      render: dateText
    },
    {
      title: "สถานะ",
      key: "status",
      width: 140,
      render: (_, record) => (
        <span className="inline-flex rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
          {orderStatusText(record.status?.order)}
        </span>
      )
    }
  ];

  return (
    <>
      <DealerPicker
        dealers={dealers}
        selectedDealerId={selectedDealerId}
        setSelectedDealerId={setSelectedDealerId}
        title="เลือก Dealer เพื่อดู Orders"
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<PackageCheck size={18} />} label="Orders" value={formatNumber(dealerOrders.length)} detail={selectedDealer?.dealer_name ?? "จำนวน order ของ dealer ที่เลือก"} />
        <MetricCard icon={<TrendingUp size={18} />} label="Ordered Qty" value={compactNumber(totalOrdered)} detail="ยอดสั่งรวมจาก order ทั้งหมด" tone="amber" />
        <MetricCard icon={<PackageCheck size={18} />} label="Delivered Qty" value={compactNumber(totalDelivered)} detail="ยอดส่งจริงรวมจาก order ทั้งหมด" tone="green" />
        <MetricCard icon={<Users size={18} />} label="Unique Sites" value={formatNumber(uniqueSites)} detail={`นับจาก site code ที่ไม่ซ้ำใน ${formatNumber(dealerOrders.length)} orders ของ dealer นี้`} tone="rose" />
      </section>

      <Card className="dashboard-card overflow-hidden">
        <CardHeader className="border-b border-[#d9e3e6] bg-white">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div>
              <CardTitle className="text-lg">Orders ของ Dealer</CardTitle>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {selectedDealer
                  ? `แสดงรายการ order ของ ${selectedDealer.dealer_name} จากเส้น API จริง`
                  : "แสดงรายการ order ของ dealer ที่เลือกจากเส้น API จริง"}
              </p>
            </div>
            <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
              <Search size={15} className="shrink-0 text-slate-500" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
                placeholder="ค้นหา dealer / customer / site / order no / product"
                value={orderSearch}
                onChange={(event) => setOrderSearch(event.target.value)}
              />
            </label>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={dealerOrders}
            loading={ordersState === "loading"}
            rowKey={(record) =>
              [
                record.order?.order_no,
                record.dealer_id,
                record.site?.site_code,
                record.created_at ?? record.updated_at ?? record.pour_datetime
              ]
                .filter(Boolean)
                .join("-")
            }
            minWidth={1410}
            pageSize={10}
          />
        </CardContent>
      </Card>
    </>
  );
}

function DateRangeToolbar({
  dateFrom,
  datePreset,
  dateTo,
  setDateFrom,
  setDatePreset,
  setDateTo
}: {
  dateFrom: string;
  datePreset: DatePreset;
  dateTo: string;
  setDateFrom: (value: string) => void;
  setDatePreset: (value: DatePreset) => void;
  setDateTo: (value: string) => void;
}) {
  return (
    <div className="hidden items-center gap-2 lg:flex">
      <div className="flex h-10 items-center gap-2 rounded-xl border border-[#d5e0e3] bg-white px-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <CalendarDays size={15} className="text-slate-500" />
        <select
          className="bg-transparent text-sm font-medium text-slate-700 outline-none dark:text-slate-200"
          value={datePreset}
          onChange={(event) => setDatePreset(event.target.value as DatePreset)}
        >
          <option value="all">ทุกช่วงเวลา</option>
          <option value="7d">7 วันล่าสุด</option>
          <option value="30d">30 วันล่าสุด</option>
          <option value="90d">90 วันล่าสุด</option>
          <option value="custom">กำหนดเอง</option>
        </select>
      </div>
      <input
        className="h-10 w-[150px] rounded-xl border border-[#d5e0e3] bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        type="date"
        value={dateFrom}
        onChange={(event) => {
          setDatePreset("custom");
          setDateFrom(event.target.value);
        }}
      />
      <span className="text-sm text-slate-400">-</span>
      <input
        className="h-10 w-[150px] rounded-xl border border-[#d5e0e3] bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
        type="date"
        value={dateTo}
        onChange={(event) => {
          setDatePreset("custom");
          setDateTo(event.target.value);
        }}
      />
    </div>
  );
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  minWidth = 900,
  pageSize,
  rowKey
}: {
  columns: Array<DataColumn<T>>;
  data: T[];
  loading?: boolean;
  minWidth?: number;
  pageSize?: number;
  rowKey: keyof T | ((record: T) => string | number);
}) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(Math.ceil(data.length / (pageSize ?? (data.length || 1))), 1);
  const rows = pageSize ? data.slice((page - 1) * pageSize, page * pageSize) : data;
  const fillerRowCount = !loading && pageSize && rows.length > 0 ? Math.max(pageSize - rows.length, 0) : 0;

  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setPage(1);
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [data.length, pageSize]);

  const getKey = (record: T) => {
    if (typeof rowKey === "function") return rowKey(record);
    return String(record[rowKey]);
  };

  const alignClass = (align?: DataColumn<T>["align"]) =>
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-[#d9e3e6] bg-[#f6f8f9] dark:border-slate-800 dark:bg-slate-900">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400",
                    alignClass(column.align)
                  )}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={columns.length}>
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-10 text-center text-sm font-semibold text-slate-500" colSpan={columns.length}>
                  ไม่มีข้อมูล
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((record) => (
                <tr
                  key={getKey(record)}
                  className="border-b border-[#edf1f2] transition-colors hover:bg-[#f3faf8] dark:border-slate-800 dark:hover:bg-slate-900/70"
                >
                  {columns.map((column) => {
                    const rawValue = column.dataIndex ? record[column.dataIndex] : undefined;
                    return (
                      <td
                        key={column.key}
                        className={cn("px-3 py-2.5 align-middle text-slate-800 dark:text-slate-200", alignClass(column.align))}
                      >
                        {column.render ? column.render(rawValue as never, record) : String(rawValue ?? "-")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            {Array.from({ length: fillerRowCount }).map((_, index) => (
              <tr
                key={`filler-${index}`}
                aria-hidden="true"
                className="border-b border-[#edf1f2] dark:border-slate-800"
              >
                {columns.map((column) => (
                  <td key={`${column.key}-filler-${index}`} className="px-3 py-2.5">
                    <div className="h-[45px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageSize && data.length > pageSize && (
        <ShadcnPagination
          currentPage={page}
          pageSize={pageSize}
          totalItems={data.length}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  );
}

function ShadcnTabs({
  items
}: {
  items: Array<{
    key: string;
    label: string;
    content: ReactNode;
  }>;
}) {
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? "");
  const activeItem = items.find((item) => item.key === activeKey) ?? items[0];

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border border-[#d9e3e6] bg-white p-1 shadow-sm">
        {items.map((item) => (
          <button
            key={item.key}
            className={cn(
              "rounded px-3 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100",
              activeKey === item.key && "bg-slate-100 text-slate-950"
            )}
            onClick={() => setActiveKey(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {activeItem?.content}
    </div>
  );
}

function ShadcnPagination({
  currentPage,
  onPageChange,
  pageSize,
  totalItems,
  totalPages
}: {
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}) {
  const start = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const end = Math.min(currentPage * pageSize, totalItems);
  const pages = buildPaginationItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-2 border-t border-[#d9e3e6] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        แสดง {formatNumber(start)}-{formatNumber(end)} จาก {formatNumber(totalItems)} รายการ
      </div>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={currentPage === 1}
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            />
          </PaginationItem>
          {pages.map((page, index) => (
            <PaginationItem key={`${page}-${index}`}>
              {typeof page === "number" ? (
                <PaginationLink isActive={currentPage === page} onClick={() => onPageChange(page)}>
                  {page}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              disabled={currentPage === totalPages}
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

function DealerPicker({
  dealers,
  selectedDealerId,
  setSelectedDealerId,
  title
}: {
  dealers: Dealer[];
  selectedDealerId: number | null;
  setSelectedDealerId: (id: number) => void;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedDealer = dealers.find((dealer) => dealer.dealer_id === selectedDealerId) ?? dealers[0] ?? null;
  const filteredDealers = useMemo(() => {
    const searchValue = normalizeSearch(query);
    if (!searchValue) return dealers;

    return dealers.filter((dealer) => {
      const haystack = normalizeSearch(`${dealer.dealer_id} ${dealer.dealer_code} ${dealer.dealer_name}`);
      return haystack.includes(searchValue);
    });
  }, [dealers, query]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const timerId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [open]);

  return (
    <Card className="dashboard-card">
      <CardContent className="grid gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
        <div>
          <CardTitle className="text-[15px] lg:text-base">{title}</CardTitle>
          <p className="mt-0.5 text-[10px] font-medium leading-4 text-slate-500">เลือก dealer หนึ่งรายเพื่อเรียก endpoint รายละเอียดของ dealer นั้น</p>
        </div>
        <div className="relative" ref={wrapperRef}>
          <button
            type="button"
            className="flex min-h-[3rem] w-full items-center justify-between gap-3 rounded-2xl border border-[#d5e0e3] bg-white px-3 py-1.5 text-left text-sm text-slate-800 shadow-sm outline-none transition-colors hover:border-[#bfd0d4] focus:border-[#16706f] focus:ring-2 focus:ring-[#16706f]/15"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-haspopup="listbox"
          >
            <span className="min-w-0">
              {selectedDealer ? (
                <span className="block">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 ring-1 ring-sky-100">
                      ID {selectedDealer.dealer_id}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-100">
                      {selectedDealer.dealer_code}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-slate-900">
                    {selectedDealer.dealer_name}
                  </span>
                </span>
              ) : (
                <span className="text-sm font-semibold text-slate-500">เลือก Dealer</span>
              )}
            </span>
            <ChevronDown
              size={18}
              className={cn("shrink-0 text-slate-400 transition-transform", open && "rotate-180 text-[#16706f]")}
            />
          </button>

          {open ? (
            <div className="absolute right-0 z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#d5e0e3] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
              <div className="border-b border-slate-100 p-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-[#d5e0e3] bg-white px-3">
                  <Search size={16} className="shrink-0 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ค้นหาด้วย ID, code หรือชื่อ dealer"
                    className="h-10 w-full border-0 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="max-h-[22rem] overflow-y-auto p-2">
                {filteredDealers.length ? filteredDealers.map((dealer) => {
                  const isSelected = dealer.dealer_id === selectedDealer?.dealer_id;

                  return (
                    <button
                      key={dealer.dealer_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={cn(
                        "grid w-full grid-cols-[18px_minmax(0,1fr)] items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                        isSelected ? "bg-[#e8f3f2] text-[#145c5b] ring-1 ring-[#b8e1dc]" : "text-slate-700 hover:bg-slate-50"
                      )}
                      onClick={() => {
                        setSelectedDealerId(dealer.dealer_id);
                        setOpen(false);
                      }}
                    >
                      <span className="flex h-5 items-center justify-center">
                        {isSelected ? <Check size={16} className="text-[#16706f]" /> : null}
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                            isSelected ? "bg-white/80 text-sky-700 ring-sky-100" : "bg-sky-50 text-sky-700 ring-sky-100"
                          )}>
                            ID {dealer.dealer_id}
                          </span>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-bold ring-1",
                            isSelected ? "bg-white/80 text-emerald-700 ring-emerald-100" : "bg-emerald-50 text-emerald-700 ring-emerald-100"
                          )}>
                            {dealer.dealer_code}
                          </span>
                        </span>
                        <span className={cn(
                          "mt-1 block line-clamp-2 text-sm font-semibold leading-5",
                          isSelected ? "text-[#145c5b]" : "text-slate-800"
                        )}>
                          {dealer.dealer_name}
                        </span>
                      </span>
                    </button>
                  );
                }) : (
                  <div className="px-3 py-6 text-center text-sm font-medium text-slate-500">
                    ไม่พบ dealer ที่ตรงกับ &quot;{query}&quot;
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function FilterBar({
  region,
  regions,
  search,
  setRegion,
  setSearch,
  setStatus,
  status
}: {
  region: string;
  regions: string[];
  search: string;
  setRegion: (value: string) => void;
  setSearch: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_180px_150px]">
      <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        <Search size={15} className="shrink-0 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          placeholder="ค้นหา dealer / จังหวัด"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <select
        className="h-9 rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={region}
        onChange={(event) => setRegion(event.target.value)}
      >
        <option value="all">ทุกภูมิภาค</option>
        {regions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        className="h-9 rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="all">ทุกสถานะ</option>
        <option value="active">Active</option>
        <option value="idle">Idle</option>
        <option value="new">New</option>
      </select>
    </div>
  );
}

function dealerColumn<T extends Dealer>(onOpen?: (dealer: T) => void): DataColumn<T> {
  return {
    title: "Dealer",
    dataIndex: "dealer_name",
    key: "dealer_name",
    width: 300,
    render: (_, record) => (
      <button className="flex min-w-0 items-center gap-3 text-left" onClick={() => onOpen?.(record)} type="button">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
          {record.dealer_name.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="truncate font-semibold text-slate-950">{record.dealer_name}</div>
          <div className="text-xs font-medium text-slate-500">{record.dealer_code}</div>
        </div>
      </button>
    )
  };
}

function statusColumn<T extends { status?: unknown }>(): DataColumn<T> {
  return {
    title: "สถานะ",
    dataIndex: "status",
    key: "status",
    width: 120,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-md px-2.5 py-0.5 text-xs font-semibold",
          getDealerStatusKey(value) === "active" && "bg-emerald-100 text-emerald-700",
          getDealerStatusKey(value) === "idle" && "bg-amber-100 text-amber-700",
          getDealerStatusKey(value) === "new" && "bg-sky-100 text-sky-700"
        )}
      >
        {statusText(value)}
      </span>
    )
  };
}

function regionPill(value: string) {
  return <span className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{value}</span>;
}

function VolumeCell({ max, unit, value }: { max: number; unit: string; value: number }) {
  return (
    <div>
      <div className="font-semibold text-slate-950">
        {formatNumber(value)} {unit}
      </div>
      <TinyProgress percent={Math.round((value / max) * 100)} />
    </div>
  );
}

function VerticalBarChart({
  data,
  onHover,
  unit
}: {
  data: Array<{ active?: boolean; label: string; value: number }>;
  onHover?: (label: string) => void;
  unit?: string;
}) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const palette = ["#0f766e", "#2563eb", "#f59e0b", "#14b8a6", "#6366f1", "#f97316", "#22c55e"];

  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-[190px]">
      <div className="flex h-[158px] items-end gap-2.5 border-b border-[#d9e3e6] px-1">
        {data.map((item) => (
          <button
            key={item.label}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
            onClick={() => onHover?.(item.label)}
            onMouseEnter={() => onHover?.(item.label)}
            type="button"
          >
            <div className="text-xs font-semibold text-slate-700">{compactNumber(item.value)}{unit ? ` ${unit}` : ""}</div>
            <div className={cn("flex h-[116px] w-full items-end rounded-xl bg-slate-100 transition-all", item.active && "ring-2 ring-slate-300")}>
              <div
                className="w-full rounded-xl transition-all"
                style={{
                  height: `${Math.max((item.value / max) * 100, 4)}%`,
                  backgroundColor: palette[data.indexOf(item) % palette.length]
                }}
              />
            </div>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}>
        {data.map((item) => (
          <div key={item.label} className="truncate text-center text-xs font-semibold text-slate-500">
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionVolumeExplorer({ regionRows }: { regionRows: ReturnType<typeof groupByRegion> }) {
  const [activeRegion, setActiveRegion] = useState(regionRows[0]?.region ?? "");
  const activeItem = regionRows.find((item) => item.region === activeRegion) ?? regionRows[0];

  useEffect(() => {
    if (!regionRows.length) return;
    if (!regionRows.some((item) => item.region === activeRegion)) {
      const resetId = window.setTimeout(() => {
        setActiveRegion(regionRows[0].region);
      }, 0);
      return () => window.clearTimeout(resetId);
    }
    return undefined;
  }, [activeRegion, regionRows]);

  if (!regionRows.length) return <EmptyChart />;

  return (
    <div className="space-y-5">
      <VerticalBarChart
        data={regionRows.map((row) => ({
          label: row.region,
          value: row.volume,
          active: row.region === activeItem?.region
        }))}
        unit="m3"
        onHover={setActiveRegion}
      />

      {activeItem && (
        <div className="grid gap-3 rounded-[18px] border border-[#e5e7eb] bg-[#fbfcfd] p-4 dark:border-slate-800 dark:bg-slate-950/70 lg:grid-cols-[minmax(0,1fr)_140px_140px_140px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Region</p>
            <h4 className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{activeItem.region}</h4>
            <p className="mt-1 text-sm text-slate-500">ชี้ที่แท่งกราฟเพื่อดูจำนวน dealer, groups และ volume ของแต่ละภูมิภาค</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Volume</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{compactNumber(activeItem.volume)} m3</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Dealers</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatNumber(activeItem.dealers)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold text-slate-500">Groups</p>
            <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-slate-100">{formatNumber(activeItem.groups)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function DualBarChart({
  data,
  primaryLabel,
  secondaryLabel
}: {
  data: Array<{ label: string; primary: number; secondary: number }>;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  const max = Math.max(...data.flatMap((item) => [item.primary, item.secondary]), 1);

  if (!data.length) return <EmptyChart />;
  const primaryColor = "#0f766e";
  const secondaryColor = "#2563eb";

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: primaryColor }} />{primaryLabel}</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: secondaryColor }} />{secondaryLabel}</span>
      </div>
      {data.map((item) => (
        <div key={item.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 font-semibold text-slate-950">{formatNumber(item.primary)} / {formatNumber(item.secondary)}</span>
          </div>
          <div className="grid gap-1">
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((item.primary / max) * 100, 2)}%`, backgroundColor: primaryColor }} />
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full" style={{ width: `${Math.max((item.secondary / max) * 100, 2)}%`, backgroundColor: secondaryColor }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FunnelBars({ rows }: { rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">{row.label}</span>
            <span className="font-semibold text-slate-950">{formatNumber(row.value)}</span>
          </div>
          <div className="h-8 rounded-md bg-slate-100 p-1">
            <div
              className="flex h-full items-center rounded-md px-3 text-xs font-semibold text-white"
              style={{
                width: `${Math.max((row.value / max) * (100 - index * 8), 10)}%`,
                backgroundColor: index === 0 ? "#0f766e" : index === 1 ? "#2563eb" : "#f59e0b"
              }}
            >
              {Math.round((row.value / max) * 100)}%
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgressList({ rows }: { rows: Array<{ label: string; total: number; unit: string; value: number }> }) {
  if (!rows.length) return <EmptyChart />;

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const percent = row.total ? Math.min(Math.round((row.value / row.total) * 100), 100) : 0;
        return (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold text-slate-700">{row.label}</span>
              <span className="shrink-0 font-semibold text-slate-950">{percent}%</span>
            </div>
            <TinyProgress percent={percent} />
            <div className="text-xs font-medium text-slate-500">
              {formatNumber(row.value)} / {formatNumber(row.total)} {row.unit}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TinyProgress({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#edf2f4]">
      <div className="h-full rounded-full bg-[#0f766e] dark:bg-[#5eead4]" style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} />
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed border-[#d9e3e6] bg-[#fbfcfc] text-sm font-semibold text-slate-500">
      ไม่มีข้อมูลสำหรับแสดงกราฟ
    </div>
  );
}

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "teal" | "green" | "amber" | "rose";
};

function MetricCard({ icon, label, value, detail, tone = "teal" }: MetricCardProps) {
  const tones = {
    teal: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
    },
    green: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    },
    amber: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
    },
    rose: {
      card: "border border-[#e5e7eb] bg-white dark:border-slate-800 dark:bg-slate-950",
      icon: "border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300"
    }
  };
  const toneClass = tones[tone];

  return (
    <Card className={cn("metric-card", toneClass.card)}>
      <CardContent className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">{label}</p>
            <p className="mt-1.5 truncate text-[24px] font-semibold leading-none tracking-normal text-slate-950">{value}</p>
          </div>
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm", toneClass.icon)}>{icon}</div>
        </div>
        <p className="mt-3 truncate text-xs font-medium text-slate-500">{detail}</p>
      </CardContent>
    </Card>
  );
}

export default App;
