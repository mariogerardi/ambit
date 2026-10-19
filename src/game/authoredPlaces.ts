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
    displayRole: "reference",
  };
}

/** Names of areas are label anchors, not invented point locations. */
export function areaLabel(place: PlaceFeature): PlaceFeature {
  return {
    ...place,
    markerHidden: true,
    labelFlexible: true,
    displayRole: "reference",
  };
}

/** A revealed illustration supplies context without claiming a submitted location. */
export function explanationPlace(place: PlaceFeature): PlaceFeature {
  return {
    ...place,
    displayRole: "explanation",
    visualState: "hinted",
    answerTarget: false,
  };
}

/** Journey point styling is independent of capital status and background city density. */
export function presentJourneyPlace(place: PlaceFeature): PlaceFeature {
  if (place.markerRole || place.kind === "pin") return place;
  const city = place.kind === "capital" || place.kind === "city";
  const explanation =
    place.displayRole === "explanation" && place.visualState !== "visited";
  return {
    ...place,
    displayRole:
      place.displayRole ??
      (!place.visualState || place.visualState === "hinted"
        ? "reference"
        : undefined),
    ...(city ? { kind: "city" as const } : {}),
    markerSize: city ? 24 : (place.markerSize ?? 24),
    visualState: explanation ? "hinted" : (place.visualState ?? "hinted"),
    ...(explanation ? { markerBadge: undefined, answerTarget: false } : {}),
  };
}
