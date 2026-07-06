import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchCustomerUsage,
  fetchDealerGroups,
  fetchDealerSites,
  fetchDealerUsage,
  fetchDealers,
  fetchOrders
} from "@/features/dealers/services/endpoints";
import type {
  ApiState,
  CustomerUsage,
  Dealer,
  DealerGroup,
  DealerSite,
  DealerUsage,
  OrderItem
} from "@/features/dealers/types";
import { isWithinDateRange } from "../lib/dates";
import { groupByRegion } from "../lib/regions";
import { normalizeSearch } from "../lib/search";
import { getDealerStatusKey, isDealerActive } from "../lib/status";

export function useDealerDashboardData({
  dateFrom,
  dateTo,
  orderSearch,
  region,
  search,
  status
}: {
  dateFrom: string;
  dateTo: string;
  orderSearch: string;
  region: string;
  search: string;
  status: string;
}) {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [apiState, setApiState] = useState<ApiState>("loading");
  const [apiMessage, setApiMessage] = useState<string | undefined>();
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
  const [ordersMessage, setOrdersMessage] = useState<string | undefined>();

  const loadDealers = useCallback(async () => {
    setApiState("loading");
    setApiMessage(undefined);
    const result = await fetchDealers();
    setDealers(result.rows);
    setApiState(result.state);
    setApiMessage(result.message);
  }, []);

  const loadUsage = useCallback(async () => {
    const result = await fetchDealerUsage();
    setUsageRows(result.rows);
  }, []);

  const loadOrders = useCallback(
    async (dealersToMap: Dealer[], startDate: string, endDate: string) => {
      setOrdersState("loading");
      setOrdersMessage(undefined);
      const result = await fetchOrders({ startDate, endDate, dealers: dealersToMap });
      setOrders(result.rows);
      setOrdersState(result.state);
      setOrdersMessage(result.message);
    },
    []
  );

  const loadDealerChildren = useCallback(async (dealer: Dealer) => {
    setGroupsState("loading");
    setCustomersState("loading");
    setSitesState("loading");
    const [groupResult, customerResult, siteResult] = await Promise.all([
      fetchDealerGroups(dealer.dealer_id),
      fetchCustomerUsage(dealer.dealer_id),
      fetchDealerSites(dealer.dealer_id)
    ]);
    setGroups(groupResult.rows);
    setGroupsState(groupResult.state);
    setCustomers(customerResult.rows);
    setCustomersState(customerResult.state);
    setSites(siteResult.rows);
    setSitesState(siteResult.state);
  }, []);

  const loadAllGroups = useCallback(async (allDealers: Dealer[]) => {
    setGroupsState("loading");
    const results = await Promise.all(allDealers.map((dealer) => fetchDealerGroups(dealer.dealer_id)));
    const rows = results.flatMap((result) => result.rows);
    const anyLive = results.some((result) => result.state === "live");
    setGroups(rows);
    setGroupsState(results.length === 0 ? "live" : anyLive ? "live" : "error");
  }, []);

  useEffect(() => {
    const requestId = window.setTimeout(() => {
      void loadDealers();
      void loadUsage();
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [loadDealers, loadUsage]);

  useEffect(() => {
    if (dealers.length === 0) return undefined;

    const requestId = window.setTimeout(() => {
      void loadOrders(dealers, dateFrom, dateTo);
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [dealers, dateFrom, dateTo, loadOrders]);

  useEffect(() => {
    if (!selectedDealerId) {
      const requestId = window.setTimeout(() => {
        setCustomers([]);
        setSites([]);
        setCustomersState("live");
        setSitesState("live");
        if (dealers.length === 0) {
          setGroups([]);
          setGroupsState("live");
        } else {
          void loadAllGroups(dealers);
        }
      }, 0);
      return () => window.clearTimeout(requestId);
    }
    const dealer = dealers.find((item) => item.dealer_id === selectedDealerId);
    if (!dealer) return undefined;

    const requestId = window.setTimeout(() => {
      void loadDealerChildren(dealer);
    }, 0);

    return () => window.clearTimeout(requestId);
  }, [dealers, loadAllGroups, loadDealerChildren, selectedDealerId]);

  const selectedDealer = useMemo(
    () => (selectedDealerId == null ? undefined : dealers.find((dealer) => dealer.dealer_id === selectedDealerId)),
    [dealers, selectedDealerId]
  );

  const allowedDealerIds = useMemo(
    () => new Set(dealers.map((dealer) => dealer.dealer_id)),
    [dealers]
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
      const matchDate = isWithinDateRange(dealer.last_active_at, dateFrom, dateTo);
      return matchRegion && matchStatus && matchDate && (!q || haystack.includes(q));
    });
  }, [dateFrom, dateTo, dealers, region, search, status]);

  const totalVolume = filteredDealers.reduce((sum, dealer) => sum + dealer.volume, 0);
  const totalGroups = filteredDealers.reduce((sum, dealer) => sum + dealer.group_count, 0);
  const activeDealers = filteredDealers.filter((dealer) => isDealerActive(dealer.status)).length;
  const topDealer = [...filteredDealers].sort((a, b) => b.volume - a.volume)[0];
  const regionRows = groupByRegion(filteredDealers);
  const activeRate = filteredDealers.length ? Math.round((activeDealers / filteredDealers.length) * 100) : 0;

  const filteredGroups = useMemo(
    () => groups.filter((group) => isWithinDateRange(group.created_at, dateFrom, dateTo)),
    [dateFrom, dateTo, groups]
  );

  const filteredUsageRows = useMemo(
    () =>
      usageRows.filter(
        (row) => allowedDealerIds.has(row.dealer_id) && isWithinDateRange(row.updated_at, dateFrom, dateTo)
      ),
    [allowedDealerIds, dateFrom, dateTo, usageRows]
  );

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => isWithinDateRange(customer.updated_at, dateFrom, dateTo)),
    [customers, dateFrom, dateTo]
  );

  const filteredSites = useMemo(
    () => sites.filter((site) => isWithinDateRange(site.last_pour_datetime, dateFrom, dateTo)),
    [dateFrom, dateTo, sites]
  );

  const ordersInDateRange = useMemo(
    () =>
      orders.filter(
        (order) => allowedDealerIds.has(order.dealer_id) && isWithinDateRange(order.pour_datetime, dateFrom, dateTo)
      ),
    [allowedDealerIds, dateFrom, dateTo, orders]
  );

  const filteredOrders = useMemo(() => {
    const q = normalizeSearch(orderSearch);
    return ordersInDateRange.filter((order) => {
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
  }, [orderSearch, ordersInDateRange]);

  const fullLoopVolume = useMemo(
    () => ordersInDateRange.filter((order) => order.full_loop).reduce((sum, order) => sum + (order.quantity?.delivered ?? 0), 0),
    [ordersInDateRange]
  );

  const notFullLoopVolume = useMemo(
    () => ordersInDateRange.filter((order) => !order.full_loop).reduce((sum, order) => sum + (order.quantity?.delivered ?? 0), 0),
    [ordersInDateRange]
  );

  return {
    activeRate,
    apiMessage,
    apiState,
    dealers,
    filteredCustomers,
    filteredDealers,
    filteredGroups,
    filteredOrders,
    filteredSites,
    filteredUsageRows,
    fullLoopVolume,
    groupsState,
    notFullLoopVolume,
    ordersInDateRange,
    ordersState,
    ordersMessage,
    regionRows,
    regions,
    selectedDealer,
    selectedDealerId,
    setSelectedDealerId,
    sitesState,
    customersState,
    topDealer,
    totalGroups,
    totalVolume
  };
}
