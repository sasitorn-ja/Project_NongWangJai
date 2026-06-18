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
  if (key === "active") return "ใช้งานอยู่";
  if (key === "new") return "ใหม่";
  return "ไม่ได้ใช้งาน";
}

export function getOrderStatusKey(value?: string | null): "cancelled" | "confirmed" | "pending" | "other" {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "other";
  if (normalized.includes("cancel") || normalized.includes("ยกเลิก")) return "cancelled";
  if (normalized.includes("confirm") || normalized.includes("approved") || normalized.includes("ยืนยัน")) return "confirmed";
  if (normalized.includes("pending") || normalized.includes("wait") || normalized.includes("รอ")) return "pending";
  return "other";
}

export function orderStatusText(value?: string | null) {
  if (!value) return "-";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
