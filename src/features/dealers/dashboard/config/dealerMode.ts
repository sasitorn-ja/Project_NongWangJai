export type DealerMode = "dealer" | "osr";

export function isOsrMode(mode: DealerMode) {
  return mode === "osr";
}
