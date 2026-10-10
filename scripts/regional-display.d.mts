import type { RegionFeature } from "../src/geography/types";
export function reconcileRegionalDisplay(
  parent: RegionFeature,
  children: RegionFeature[],
): Promise<RegionFeature[]>;
