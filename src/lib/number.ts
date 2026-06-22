export function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value);
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}
