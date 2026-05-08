import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value);
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
