import type { ReactNode } from "react";

import type { Dealer } from "@/features/dealers/types";

export type PageKey =
  | "dashboard"
  | "network"
  | "groups"
  | "details"
  | "topCustomers"
  | "topProducts"
  | "customerInsights"
  | "orders";

export type DatePreset = "all" | "7d" | "30d" | "90d" | "custom";

export const FIXED_DIVISIONS = [
  "CPAC East",
  "CPAC Metro",
  "CPAC North",
  "CPAC Northeast",
  "RMC - South Chain",
  "CPAC West"
] as const;

export type DataColumn<T> = {
  align?: "left" | "right" | "center";
  dataIndex?: keyof T;
  key: string;
  render?: (value: never, record: T) => ReactNode;
  title: ReactNode;
  width?: number;
};

export function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function getDealerStatusKey(
  statusValue: Dealer["status"] | unknown
): "active" | "idle" | "new" {
  if (typeof statusValue === "boolean") return statusValue ? "active" : "idle";

  const value = String(statusValue ?? "").toLowerCase();
  if (value === "active") return "active";
  if (value === "new") return "new";
  return "idle";
}

export function isDealerActive(statusValue: Dealer["status"]) {
  return getDealerStatusKey(statusValue) === "active";
}

export function statusText(value: unknown) {
  const key = getDealerStatusKey(value);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function orderStatusText(value?: string | null) {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function dateText(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function parseDateValue(value?: string | null) {
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

export function getPresetDateRange(preset: DatePreset) {
  if (preset === "all") return { from: "", to: "" };

  const today = new Date();
  const end = formatDateInputValue(today);
  const start = new Date(today);
  const offsetDays = preset === "7d" ? 6 : preset === "30d" ? 29 : 89;
  start.setDate(today.getDate() - offsetDays);

  return { from: formatDateInputValue(start), to: end };
}

export function isWithinDateRange(
  value: string | null | undefined,
  from: string,
  to: string
) {
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

export function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) return [1, 2, 3, 4, "ellipsis-right", totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis-left", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis-left", currentPage - 1, currentPage, currentPage + 1, "ellipsis-right", totalPages];
}

export function groupByRegion(rows: Dealer[]) {
  const grouped = rows.reduce<
    Record<string, { region: string; dealers: number; groups: number; volume: number }>
  >((acc, dealer) => {
    const current = acc[dealer.region] ?? {
      region: dealer.region,
      dealers: 0,
      groups: 0,
      volume: 0
    };
    current.dealers += 1;
    current.groups += dealer.group_count;
    current.volume += dealer.volume;
    acc[dealer.region] = current;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => b.volume - a.volume);
}

export function getRegionLabel(region: string) {
  if (region === "CPAC Metro") return "METRO";
  if (region === "CPAC East") return "EAST";
  if (region === "CPAC West") return "WEST";
  if (region === "CPAC North") return "NORTH";
  if (region === "CPAC Northeast") return "NORTHEAST";
  if (region === "RMC - South Chain") return "SOUTH";
  return region.toUpperCase();
}

export function getRegionAccent(region: string) {
  if (region === "CPAC Metro") return "sky";
  if (region === "CPAC East") return "emerald";
  if (region === "CPAC West") return "amber";
  if (region === "CPAC North") return "violet";
  if (region === "CPAC Northeast") return "orange";
  if (region === "RMC - South Chain") return "teal";
  return "slate";
}

export function getPageTitle(page: PageKey) {
  if (page === "dashboard") return "Dashboard";
  if (page === "network") return "Dealer Network";
  if (page === "groups") return "Dealer Groups";
  if (page === "details") return "Dealer Details";
  if (page === "topCustomers") return "Top N Dealers";
  if (page === "topProducts") return "Top N Products";
  if (page === "customerInsights") return "Dealer Insights";
  return "Orders";
}

export function getPageSubtitle(page: PageKey) {
  if (page === "dashboard") return "ภาพรวมทุก Dealer";
  if (page === "network") return "แผนผัง dealer network แยกตามภูมิภาคและ dealer สำคัญ";
  if (page === "groups") return "เจาะ Dealer ทีละรายเพื่อดูรายการกลุ่ม";
  if (page === "details") return "Usage, customers และ sites ของแต่ละ Dealer";
  if (page === "topCustomers") {
    return "สรุป Top dealer รายเดือนจากข้อมูล orders โดยไม่ใช้ site_from";
  }
  if (page === "topProducts") {
    return "สรุปสินค้าขายดีรายเดือนจากข้อมูล orders พร้อมรหัสสินค้าและชื่อสินค้า";
  }
  if (page === "customerInsights") {
    return "Top dealer และ site summary จากข้อมูล orders ที่มีอยู่จริง";
  }
  return "รายการ order จากเส้น API จริง";
}

export function getMonthKey(dateValue?: string | null) {
  const date = parseDateValue(dateValue);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthLabel(monthKey: string) {
  if (!monthKey) return "-";
  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;

  return new Intl.DateTimeFormat("en-US", {
    month: "short"
  }).format(new Date(year, month - 1, 1));
}
