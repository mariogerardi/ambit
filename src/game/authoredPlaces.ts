import type { PlaceFeature } from "../geography/types";

/** Equal reference styling prevents a known capital's shape/size from disclosing its role. */
export function cityReference(place: PlaceFeature): PlaceFeature {
  return {
    ...place,
    kind: "city",
    priority: 90,
    markerSize: 24,
    visualState: "hinted",
    labelFlexible: true,
  };
}
