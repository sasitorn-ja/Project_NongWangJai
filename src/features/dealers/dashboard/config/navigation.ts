import {
  BarChart3,
  ClipboardList,
  Database,
  LayoutDashboard,
  Layers3,
  PackageCheck,
  TrendingUp,
  Users,
  type LucideIcon
} from "lucide-react";

import type { PageKey } from "./pageMeta";

export type DashboardNavItem = {
  icon: LucideIcon;
  key: PageKey;
  label: string;
};

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { icon: LayoutDashboard, key: "dashboard", label: "Dashboard" },
  { icon: Layers3, key: "network", label: "Dealer Network" },
  { icon: Users, key: "groups", label: "Dealer Groups" },
  { icon: Database, key: "details", label: "Dealer Details" },
  { icon: BarChart3, key: "customerInsights", label: "Dealer Insights" },
  { icon: TrendingUp, key: "topCustomers", label: "Top N Dealers" },
  { icon: PackageCheck, key: "topProducts", label: "Top N Products" },
  { icon: ClipboardList, key: "orders", label: "Orders" }
];
