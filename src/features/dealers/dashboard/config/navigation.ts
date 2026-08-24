import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Layers3,
  PackageCheck,
  TrendingUp,
  type LucideIcon
} from "lucide-react";

import type { PageKey } from "./pageMeta";
import type { DealerMode } from "./dealerMode";

export type DashboardNavItem = {
  icon: LucideIcon;
  key: PageKey;
  label: string;
};

const DEALER_NAV_ITEMS: DashboardNavItem[] = [
  { icon: LayoutDashboard, key: "dashboard", label: "Dashboard" },
  { icon: Layers3, key: "network", label: "Dealer Network" },
  { icon: BarChart3, key: "details", label: "Dealer Analysis" },
  { icon: TrendingUp, key: "topCustomers", label: "Top N Dealers" },
  { icon: PackageCheck, key: "topProducts", label: "Top N Products" },
  { icon: ClipboardList, key: "orders", label: "Orders" }
];

export function getDashboardNavItems(mode: DealerMode): DashboardNavItem[] {
  if (mode === "dealer") return DEALER_NAV_ITEMS;
  return DEALER_NAV_ITEMS.map((item) => ({ ...item, label: item.label.replaceAll("Dealer", "OSR") }));
}
