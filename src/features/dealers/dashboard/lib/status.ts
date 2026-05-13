import type { Dealer } from "@/features/dealers/types";

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
