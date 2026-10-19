import type { RegionFeature, VisualState } from "../geography/types";

/** Inspection and visual emphasis never imply that an object accepts an answer. */
export function canPickRegion(
  region: Pick<RegionFeature, "id" | "displayBase">,
  settings: {
    regionInteraction?: boolean;
    selectDisabled?: boolean;
    selectableRegionIds?: readonly string[];
    states: Record<string, VisualState>;
  },
) {
  return (
    !region.displayBase &&
    settings.regionInteraction !== false &&
    (settings.selectableRegionIds !== undefined
      ? settings.selectableRegionIds.includes(region.id)
      : settings.selectDisabled || settings.states[region.id] !== "disabled")
  );
}
