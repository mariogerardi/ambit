import type { Focus } from "../geography/types";
export const DEFAULT_VIEWS: ReadonlyArray<Focus> = [
  { lat: 10, lng: 24 },
  { lat: 35, lng: 92 },
  { lat: 15, lng: 140 },
  { lat: 30, lng: -100 },
  { lat: -20, lng: -60 },
  { lat: 48, lng: 15 },
];
export function createDefaultViewCycle(
  start = Math.floor(Math.random() * DEFAULT_VIEWS.length),
) {
  let index = start;
  return (altitude: number): Focus => ({
    ...DEFAULT_VIEWS[
      ((index++ % DEFAULT_VIEWS.length) + DEFAULT_VIEWS.length) %
        DEFAULT_VIEWS.length
    ],
    altitude,
  });
}
export function normalWorldView(
  view: Focus | undefined,
  altitude: number,
): boolean {
  return (
    !!view?.altitude &&
    view.altitude >= altitude * 0.85 &&
    view.altitude <= altitude * 1.25
  );
}
export function studyCameraTarget(
  view: Focus | undefined,
  altitude: number,
  nextDefault: (altitude: number) => Focus,
  highlightedCountry?: Focus,
): Focus | undefined {
  // Identifying a highlighted country requires that clue to be in view.
  if (highlightedCountry)
    return {
      ...highlightedCountry,
      altitude: normalWorldView(view, altitude) ? view!.altitude : altitude,
    };
  return normalWorldView(view, altitude) ? undefined : nextDefault(altitude);
}
