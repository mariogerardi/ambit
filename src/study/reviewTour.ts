import type { Focus } from "../geography/types";

export const REVIEW_TOUR_ALTITUDE = 1.05;

/** A continuous westward sweep; nearby review locations gently guide latitude. */
export function reviewTourFrame(
  stops: Focus[],
  origin: Focus,
  elapsed: number,
): Focus {
  const lng = origin.lng - elapsed * 0.006;
  let latitude = 20 * 0.15,
    weight = 0.15;
  for (const stop of stops) {
    const distance = ((((stop.lng - lng + 540) % 360) + 360) % 360) - 180;
    const influence = Math.exp(-Math.pow(distance / 45, 2));
    latitude += Math.max(-55, Math.min(60, stop.lat)) * influence;
    weight += influence;
  }
  const t = Math.min(1, Math.max(0, elapsed / 1800));
  const blend = t * t * (3 - 2 * t);
  return {
    lng,
    lat: origin.lat + (latitude / weight - origin.lat) * blend,
    altitude:
      (origin.altitude ?? REVIEW_TOUR_ALTITUDE) +
      (REVIEW_TOUR_ALTITUDE - (origin.altitude ?? REVIEW_TOUR_ALTITUDE)) *
        blend,
  };
}
