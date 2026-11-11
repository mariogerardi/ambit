import type { Focus } from "../geography/types";
export const DEFAULT_WORLD_VIEW = { lat: 10, lng: 24 };
/** Keep the live orientation when returning to a viewport-fitted world overview. */
export function worldView(view: Focus | undefined, altitude: number): Focus {
  return { ...(view ?? DEFAULT_WORLD_VIEW), altitude };
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
  highlightedCountry?: Focus,
): Focus | undefined {
  // Identifying a highlighted country requires that clue to be in view.
  if (highlightedCountry)
    return {
      ...highlightedCountry,
      altitude: normalWorldView(view, altitude) ? view!.altitude : altitude,
    };
  return normalWorldView(view, altitude)
    ? undefined
    : worldView(view, altitude);
}
