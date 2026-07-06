import type { PageKey } from "./pageMeta";

export const PAGE_PATHS: Record<PageKey, string> = {
  dashboard: "/dashboard",
  network: "/dealer-network",
  groups: "/dealer-groups",
  details: "/dealer-analysis",
  topCustomers: "/top-dealers",
  topProducts: "/top-products",
  customerInsights: "/customer-insights",
  orders: "/orders"
};

const PATH_TO_PAGE_KEY = Object.fromEntries(
  Object.entries(PAGE_PATHS).map(([key, path]) => [path, key])
) as Record<string, PageKey>;

export function getPathFromPageKey(key: PageKey): string {
  return PAGE_PATHS[key];
}

export function getPageKeyFromPath(path: string): PageKey | null {
  const normalized = path.replace(/\/+$/, "") || "/";
  return PATH_TO_PAGE_KEY[normalized] ?? null;
}
