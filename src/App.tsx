import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Clock3,
  Database,
  LayoutDashboard,
  Layers3,
  MapPinned,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Sun,
  Moon,
  TrendingUp,
  User,
  Users
} from "lucide-react";
import cpacLogo from "@/img/cpac-logo.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchCustomerUsage,
  fetchDealerGroups,
  fetchDealerSites,
  fetchDealerUsage,
  fetchDealers
} from "@/services/dealers";
import type { ApiState, CustomerUsage, Dealer, DealerGroup, DealerSite, DealerUsage } from "@/types/dealer";
import { cn, compactNumber, formatNumber } from "@/lib/utils";

type PageKey = "dashboard" | "groups" | "details";
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

function getApiStatusLabel(state: ApiState) {
  if (state === "live") return "Live Data";
  if (state === "loading") return "Syncing";
  return "Data error";
}

function isDealerActive(statusValue: Dealer["status"]) {
  if (typeof statusValue === "boolean") return statusValue;
  return String(statusValue ?? "").toLowerCase() === "active";
}

function statusText(value: unknown) {
  const text = String(value ?? "unknown");
  return text.charAt(0).toUpperCase() + text.slice(1);
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

function groupByStatus(rows: Dealer[]) {
  const grouped = rows.reduce<Record<string, number>>((acc, dealer) => {
    const key = statusText(dealer.status);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [page, setPage] = useState<PageKey>("dashboard");
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [apiState, setApiState] = useState<ApiState>("loading");
  const [region, setRegion] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [groups, setGroups] = useState<DealerGroup[]>([]);
  const [groupsState, setGroupsState] = useState<ApiState>("loading");
  const [usageRows, setUsageRows] = useState<DealerUsage[]>([]);
  const [usageState, setUsageState] = useState<ApiState>("loading");
  const [customers, setCustomers] = useState<CustomerUsage[]>([]);
  const [customersState, setCustomersState] = useState<ApiState>("loading");
  const [sites, setSites] = useState<DealerSite[]>([]);
  const [sitesState, setSitesState] = useState<ApiState>("loading");

  const loadDealers = useCallback(async () => {
    setApiState("loading");
    const result = await fetchDealers();
    setDealers(result.rows);
    setApiState(result.state);
    setSelectedDealerId((current) => current ?? result.rows[0]?.dealer_id ?? null);
  }, []);

  const loadUsage = useCallback(async () => {
    setUsageState("loading");
    const result = await fetchDealerUsage();
    setUsageRows(result.rows);
    setUsageState(result.state);
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
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [loadDealers, loadUsage]);

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
        (status === "active" && isDealerActive(dealer.status)) ||
        (status === "idle" && String(dealer.status).toLowerCase() === "idle") ||
        (status === "new" && String(dealer.status).toLowerCase() === "new");
      const haystack = `${dealer.dealer_code} ${dealer.dealer_name} ${dealer.province} ${dealer.region}`.toLowerCase();
      return matchRegion && matchStatus && (!q || haystack.includes(q));
    });
  }, [dealers, region, search, status]);

  const totalVolume = filteredDealers.reduce((sum, dealer) => sum + dealer.volume, 0);
  const totalGroups = filteredDealers.reduce((sum, dealer) => sum + dealer.group_count, 0);
  const activeDealers = filteredDealers.filter((dealer) => isDealerActive(dealer.status)).length;
  const topDealer = [...filteredDealers].sort((a, b) => b.volume - a.volume)[0];
  const regionRows = groupByRegion(filteredDealers);
  const maxRegionVolume = Math.max(...regionRows.map((row) => row.volume), 1);
  const activeRate = filteredDealers.length ? Math.round((activeDealers / filteredDealers.length) * 100) : 0;
  const statusRows = useMemo(() => groupByStatus(filteredDealers), [filteredDealers]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const refreshCurrent = () => {
    void loadDealers();
    void loadUsage();
    if (selectedDealerId) void loadDealerChildren(selectedDealerId);
  };

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
          </nav>

          <div className="mt-auto p-2.5">
            <div className={cn("rounded-lg border border-[#d9e3e6] bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950", collapsed && "px-2")}>
              <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <Database size={15} className="text-[#16706f]" />
                {!collapsed && <span>Data status</span>}
              </div>
              {!collapsed && (
                <div className="mt-3 flex items-center justify-between">
                  <Badge variant="neutral">{getApiStatusLabel(apiState)}</Badge>
                  <span className="text-xs text-slate-500">{dealers.length} rows</span>
                </div>
              )}
            </div>
          </div>
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
                      : "Dealer Details"}
                </h1>
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {page === "dashboard"
                    ? "ภาพรวมทุก Dealer"
                    : page === "groups"
                      ? "เจาะ Dealer ทีละรายเพื่อดูรายการกลุ่ม"
                      : "Usage, customers และ sites ของแต่ละ Dealer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="neutral" className="hidden h-8 items-center px-3 sm:inline-flex">
                {getApiStatusLabel(apiState)}
              </Badge>
              <Button variant="outline" size="icon" aria-label="Notifications" className="bg-white shadow-sm">
                <Bell size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                aria-label="Toggle theme"
                className="bg-white shadow-sm"
                onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </Button>
              <Button variant="outline" className="shadow-sm" onClick={refreshCurrent}>
                <RefreshCw size={16} />
                Refresh
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
              maxRegionVolume={maxRegionVolume}
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
              statusRows={statusRows}
            />
          )}

          {page === "groups" && (
            <GroupsPage
              dealers={dealers}
              groups={groups}
              groupsState={groupsState}
              selectedDealer={selectedDealer}
              selectedDealerId={selectedDealerId}
              setSelectedDealerId={setSelectedDealerId}
              usageRows={usageRows}
            />
          )}

          {page === "details" && (
            <DetailsPage
              customers={customers}
              customersState={customersState}
              dealers={dealers}
              selectedDealer={selectedDealer}
              selectedDealerId={selectedDealerId}
              setSelectedDealerId={setSelectedDealerId}
              sites={sites}
              sitesState={sitesState}
              usageRows={usageRows}
              usageState={usageState}
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
  maxRegionVolume: number;
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
  statusRows: Array<{ label: string; value: number }>;
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
        "flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
        selected && "bg-slate-100 text-slate-950"
      )}
      onClick={onClick}
      title={collapsed ? label : undefined}
      type="button"
    >
      <span className={cn("shrink-0", selected ? "text-[#16706f]" : "text-slate-500")}>{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}

function DashboardInsightPanel({
  activeRate,
  dealersCount,
  onOpenTopDealer,
  topDealer,
  totalGroups,
  totalVolume
}: {
  activeRate: number;
  dealersCount: number;
  onOpenTopDealer: () => void;
  topDealer?: Dealer;
  totalGroups: number;
  totalVolume: number;
}) {
  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
      <Card className="soft-hero overflow-hidden border-0">
        <CardContent className="relative min-h-[176px] p-5">
          <div className="relative z-[1] max-w-[560px]">
            <Badge variant="neutral" className="mb-3 bg-white/70">Dealer Performance</Badge>
            <h2 className="max-w-xl text-2xl font-semibold leading-tight text-slate-950 dark:text-slate-100">
              ตรวจภาพรวม dealer, volume และการใช้งานล่าสุดได้ในที่เดียว
            </h2>
            <p className="mt-3 max-w-lg text-sm font-medium text-slate-600 dark:text-slate-300">
              ข้อมูลทั้งหมดดึงจากระบบจริง พร้อม drill down ไปยังกลุ่ม ลูกค้า และ site ของ dealer รายที่สนใจ
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full bg-[#1f7a45] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#17633a]"
                onClick={onOpenTopDealer}
                type="button"
              >
                ดู Top dealer
              </button>
              <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                {formatNumber(dealersCount)} dealers
              </span>
            </div>
          </div>
          <div className="absolute right-5 top-5 hidden h-32 w-32 rounded-full bg-white/70 shadow-inner xl:block">
            <div className="absolute inset-5 rounded-full border-[10px] border-[#f6c46b]" />
            <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#1f7a45] text-white">
              <TrendingUp size={22} />
            </div>
          </div>
          <div className="absolute bottom-4 right-44 hidden h-16 w-16 rotate-12 rounded-2xl bg-[#f8d9e6] xl:block" />
          <div className="absolute bottom-10 right-16 hidden h-12 w-12 -rotate-12 rounded-2xl bg-[#d8f1de] xl:block" />
        </CardContent>
      </Card>

      <Card className="spotlight-card border-0">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dealer Focus</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-100">
                {topDealer?.dealer_code ?? "-"}
              </h3>
              <p className="mt-1 truncate text-sm font-semibold text-slate-600 dark:text-slate-300">
                {topDealer?.dealer_name ?? "ยังไม่มีข้อมูล"}
              </p>
            </div>
            <div className="rounded-full bg-white/80 p-3 text-[#16706f] shadow-sm dark:bg-slate-950/70">
              <PackageCheck size={20} />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Volume" value={`${compactNumber(totalVolume)} m3`} />
            <MiniStat label="Groups" value={formatNumber(totalGroups)} />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span>Active rate</span>
              <span>{activeRate}%</span>
            </div>
            <TinyProgress percent={activeRate} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 shadow-sm dark:bg-slate-950/70">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-slate-950 dark:text-slate-100">{value}</p>
    </div>
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
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<PackageCheck size={18} />} label="Total Volume" value={`${compactNumber(props.totalVolume)} m3`} detail={`${formatNumber(props.totalVolume)} m3 across selected dealers`} />
        <MetricCard icon={<Users size={18} />} label="Active Dealers" value={`${props.activeRate}%`} detail="Active dealer status from API" tone="green" />
        <MetricCard icon={<MapPinned size={18} />} label="Region Coverage" value={formatNumber(props.regionRows.length)} detail={`${props.regions.length} regions available`} tone="amber" />
        <MetricCard icon={<Layers3 size={18} />} label="Total Groups" value={formatNumber(props.totalGroups)} detail={props.topDealer ? `Top dealer: ${props.topDealer.dealer_code}` : "No dealer selected"} tone="rose" />
      </section>

      <DashboardInsightPanel
        activeRate={props.activeRate}
        dealersCount={props.filteredDealers.length}
        onOpenTopDealer={() => {
          if (!props.topDealer) return;
          props.setSelectedDealerId(props.topDealer.dealer_id);
          props.setPage("groups");
        }}
        topDealer={props.topDealer}
        totalGroups={props.totalGroups}
        totalVolume={props.totalVolume}
      />

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,.7fr)]">
        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Volume by Region</CardTitle>
            <p className="text-xs font-medium text-slate-500">เทียบปริมาณคอนกรีตส่งจริงรวมรายภูมิภาค</p>
          </CardHeader>
          <CardContent>
            <VerticalBarChart
              data={props.regionRows.map((row) => ({ label: row.region, value: row.volume }))}
              unit="m3"
            />
          </CardContent>
        </Card>

        <Card className="dashboard-card">
          <CardHeader className="border-b border-[#d9e3e6]">
            <CardTitle className="text-lg">Dealer Status Mix</CardTitle>
            <p className="text-xs font-medium text-slate-500">สัดส่วนสถานะ dealer จาก API จริง</p>
          </CardHeader>
          <CardContent>
            <DonutChart data={props.statusRows} />
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1fr)_360px]">
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

        <RegionPanel maxRegionVolume={props.maxRegionVolume} regionRows={props.regionRows} />
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
            <p className="text-xs font-medium text-slate-500">วิเคราะห์ว่ากลุ่มไหนมีจองมากกว่าส่งจริง</p>
          </CardHeader>
          <CardContent>
            <DualBarChart
              data={groups.slice(0, 8).map((group) => ({
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
  usageState: ApiState;
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
            label: "Customer Usage",
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
          },
          {
            key: "usage",
            label: "All Dealer Usage",
            content: <UsageTable rows={props.usageRows} state={props.usageState} />
          }
        ]}
      />
    </>
  );
}

function UsageTable({ rows, state }: { rows: DealerUsage[]; state: ApiState }) {
  const columns: DataColumn<DealerUsage>[] = [
    { title: "Dealer", dataIndex: "dealer_name", key: "dealer_name", width: 280, render: (_, record) => <div><div className="font-semibold text-slate-950">{record.dealer_name}</div><div className="text-xs font-medium text-slate-500">{record.dealer_code}</div></div> },
    { title: "ภูมิภาค", dataIndex: "region", key: "region", width: 160, render: regionPill },
    { title: "จังหวัด", dataIndex: "province", key: "province", width: 140 },
    { title: "เช็คราคา", dataIndex: "price_concrete_count", key: "price_concrete_count", align: "right", width: 140, render: formatNumber },
    { title: "จองคิว", dataIndex: "booking_create_count", key: "booking_create_count", align: "right", width: 130, render: formatNumber },
    { title: "สร้างลูกค้า", dataIndex: "customer_create_count", key: "customer_create_count", align: "right", width: 140, render: formatNumber },
    { title: "อัปเดตล่าสุด", dataIndex: "updated_at", key: "updated_at", width: 190, render: dateText }
  ];

  return (
    <Card className="dashboard-card overflow-hidden">
      <CardContent className="p-0">
        <DataTable columns={columns} data={rows} loading={state === "loading"} rowKey="dealer_id" minWidth={1180} pageSize={10} />
      </CardContent>
    </Card>
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
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-2 border-t border-[#d9e3e6] bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        แสดง {formatNumber(start)}-{formatNumber(end)} จาก {formatNumber(totalItems)} รายการ
      </div>
      <div className="flex items-center gap-1">
        <button
          className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white px-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          type="button"
        >
          ‹
        </button>
        {pages.map((page) => (
          <button
            key={page}
            className={cn(
              "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-semibold transition-colors",
              currentPage === page
                ? "border-[#16706f] bg-[#e8f6f3] text-[#16706f] dark:border-[#5eead4] dark:bg-[#123a3a] dark:text-[#99f6e4]"
                : "border-[#d5e0e3] bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            )}
            onClick={() => onPageChange(page)}
            type="button"
          >
            {page}
          </button>
        ))}
        <button
          className="flex h-8 min-w-8 items-center justify-center rounded-md border border-[#d5e0e3] bg-white px-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          type="button"
        >
          ›
        </button>
      </div>
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
  return (
    <Card className="dashboard-card">
      <CardContent className="grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="mt-1 text-xs font-medium text-slate-500">เลือก dealer หนึ่งรายเพื่อเรียก endpoint รายละเอียดของ dealer นั้น</p>
        </div>
        <select
          className="h-9 rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-colors focus:border-[#16706f] focus:ring-2 focus:ring-[#16706f]/15"
          value={selectedDealerId ?? ""}
          onChange={(event) => setSelectedDealerId(Number(event.target.value))}
        >
          {dealers.map((dealer) => (
            <option key={dealer.dealer_id} value={dealer.dealer_id}>
              {dealer.dealer_code} - {dealer.dealer_name}
            </option>
          ))}
        </select>
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
      <label className="flex h-9 items-center gap-2 rounded-md border border-[#d5e0e3] bg-white px-3 shadow-sm focus-within:border-[#16706f] focus-within:ring-2 focus-within:ring-[#16706f]/15">
        <Search size={15} className="shrink-0 text-slate-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          placeholder="ค้นหา dealer / จังหวัด"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <select
        className="h-9 rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-[#16706f] focus:ring-2 focus:ring-[#16706f]/15"
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
        className="h-9 rounded-md border border-[#d5e0e3] bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none focus:border-[#16706f] focus:ring-2 focus:ring-[#16706f]/15"
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

function RegionPanel({ maxRegionVolume, regionRows }: { maxRegionVolume: number; regionRows: ReturnType<typeof groupByRegion> }) {
  return (
    <Card className="dashboard-card">
      <CardHeader>
        <CardTitle className="text-lg">Region Volume</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {regionRows.map((item) => (
          <div key={item.region} className="rounded-lg border border-[#e1e8ea] bg-[#fbfcfc] p-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-slate-800">{item.region}</span>
              <span className="shrink-0 font-semibold text-slate-950">{compactNumber(item.volume)} m3</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-[#16706f]" style={{ width: `${Math.max((item.volume / maxRegionVolume) * 100, 6)}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs font-medium text-slate-500">
              <span>{formatNumber(item.dealers)} dealers</span>
              <span>{formatNumber(item.groups)} groups</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#eaf5f3] text-sm font-semibold text-[#0e6f6d]">
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
          String(value).toLowerCase() === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        )}
      >
        {statusText(value)}
      </span>
    )
  };
}

function regionPill(value: string) {
  return <span className="rounded-md bg-[#e8f6f3] px-2.5 py-1 text-xs font-semibold text-[#0e6f6d]">{value}</span>;
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

function VerticalBarChart({ data, unit }: { data: Array<{ label: string; value: number }>; unit?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  const palette = ["#16706f", "#2563eb", "#f0b84d", "#c54461", "#7c3aed", "#0ea5e9", "#16a34a"];

  if (!data.length) return <EmptyChart />;

  return (
    <div className="h-[190px]">
      <div className="flex h-[158px] items-end gap-2.5 border-b border-[#d9e3e6] px-1">
        {data.map((item) => (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="text-xs font-semibold text-slate-700">{compactNumber(item.value)}{unit ? ` ${unit}` : ""}</div>
            <div className="flex h-[116px] w-full items-end rounded-md bg-slate-100">
              <div
                className="w-full rounded-md"
                style={{
                  height: `${Math.max((item.value / max) * 100, 4)}%`,
                  backgroundColor: palette[data.indexOf(item) % palette.length]
                }}
              />
            </div>
          </div>
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

function DonutChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const palette = ["#16706f", "#f0b84d", "#c54461", "#64748b"];
  const segments = data.reduce<Array<{ item: { label: string; value: number }; percent: number; offset: number }>>(
    (acc, item) => {
      const percent = (item.value / total) * 100;
      const previousOffset = acc.length ? acc[acc.length - 1].offset - acc[acc.length - 1].percent : 25;
      acc.push({ item, percent, offset: previousOffset });
      return acc;
    },
    []
  );

  if (!total) return <EmptyChart />;

  return (
    <div className="grid gap-4 sm:grid-cols-[138px_minmax(0,1fr)] sm:items-center">
      <svg className="h-[138px] w-[138px]" viewBox="0 0 42 42" role="img" aria-label="Dealer status chart">
        <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#edf2f4" strokeWidth="7" />
        {segments.map(({ item, offset, percent }, index) => {
          const strokeDasharray = `${percent} ${100 - percent}`;
          return (
            <circle
              key={item.label}
              cx="21"
              cy="21"
              r="15.915"
              fill="transparent"
              stroke={palette[index % palette.length]}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={offset}
              strokeWidth="7"
            />
          );
        })}
        <text x="21" y="20" textAnchor="middle" className="fill-slate-950 text-[7px] font-semibold">
          {total}
        </text>
        <text x="21" y="26" textAnchor="middle" className="fill-slate-500 text-[3.5px] font-semibold">
          dealers
        </text>
      </svg>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="truncate text-sm font-semibold text-slate-700">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-slate-950">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
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

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#16706f]" />{primaryLabel}</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#f0b84d]" />{secondaryLabel}</span>
      </div>
      {data.map((item) => (
        <div key={item.label} className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-semibold text-slate-700">{item.label}</span>
            <span className="shrink-0 font-semibold text-slate-950">{formatNumber(item.primary)} / {formatNumber(item.secondary)}</span>
          </div>
          <div className="grid gap-1">
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#16706f]" style={{ width: `${Math.max((item.primary / max) * 100, 2)}%` }} />
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-[#f0b84d]" style={{ width: `${Math.max((item.secondary / max) * 100, 2)}%` }} />
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
                backgroundColor: index === 0 ? "#16706f" : index === 1 ? "#3d8f8d" : "#f0b84d"
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
      <div className="h-full rounded-full bg-[#16706f]" style={{ width: `${Math.max(Math.min(percent, 100), 0)}%` }} />
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
      card: "bg-[#dcf4e8]",
      icon: "bg-white/75 text-[#16706f]"
    },
    green: {
      card: "bg-[#def8e6]",
      icon: "bg-white/75 text-emerald-700"
    },
    amber: {
      card: "bg-[#fff2c9]",
      icon: "bg-white/75 text-amber-700"
    },
    rose: {
      card: "bg-[#ffe3eb]",
      icon: "bg-white/75 text-rose-700"
    }
  };
  const toneClass = tones[tone];

  return (
    <Card className={cn("metric-card border-0", toneClass.card)}>
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
