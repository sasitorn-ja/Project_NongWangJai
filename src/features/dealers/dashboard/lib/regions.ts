import type { Dealer } from "@/features/dealers/types";

export const FIXED_DIVISIONS = [
  "CPAC East",
  "CPAC Metro",
  "CPAC North",
  "CPAC Northeast",
  "RMC - South Chain",
  "CPAC West"
] as const;

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
