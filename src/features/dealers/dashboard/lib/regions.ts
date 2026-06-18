import type { Dealer } from "@/features/dealers/types";

export const FIXED_DIVISIONS = [
  "CPAC East",
  "CPAC Metro",
  "CPAC North",
  "CPAC Northeast",
  "RMC - South Chain",
  "CPAC West"
] as const;

export const REGION_COLORS: Record<string, string> = {
  "CPAC East": "#0284c7",
  "CPAC Metro": "#2563eb",
  "CPAC North": "#0891b2",
  "CPAC Northeast": "#0d9488",
  "CPAC West": "#4f46e5",
  "RMC - South Chain": "#0ea5e9"
};

const FALLBACK_COLORS = ["#0284c7", "#2563eb", "#0891b2", "#0d9488", "#4f46e5", "#0ea5e9", "#0369a1", "#1d4ed8"];

export function getRegionColor(region: string, allRegions: readonly string[] = FIXED_DIVISIONS) {
  return REGION_COLORS[region] ?? FALLBACK_COLORS[Math.max(allRegions.indexOf(region), 0) % FALLBACK_COLORS.length];
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
  if (region === "CPAC East") return "cyan";
  if (region === "CPAC West") return "blue";
  if (region === "CPAC North") return "cyan";
  if (region === "CPAC Northeast") return "teal";
  if (region === "RMC - South Chain") return "sky";
  return "slate";
}
