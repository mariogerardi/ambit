import type { RegionFeature } from "../geography/types";
import { useBorderMinigame } from "./useBorderMinigame";

export const useSharedNeighbors = (
  regions: RegionFeature[],
  subject?: string,
) => useBorderMinigame(regions, subject, "shared-neighbors");
