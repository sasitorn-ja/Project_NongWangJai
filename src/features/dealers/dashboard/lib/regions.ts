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
  "CPAC Metro": "#3b82f6",
  "CPAC Northeast": "#14b8a6",
  "CPAC West": "#8b5cf6",
  "CPAC North": "#06b6d4",
  "RMC - South Chain": "#f59e0b",
  "CPAC East": "#10b981"
};

const FALLBACK_COLORS = ["#3b82f6", "#14b8a6", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#e11d48", "#7c3aed"];

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
  if (region === "CPAC East") return "emerald";
  if (region === "CPAC West") return "violet";
  if (region === "CPAC North") return "cyan";
  if (region === "CPAC Northeast") return "teal";
  if (region === "RMC - South Chain") return "amber";
  return "slate";
}
