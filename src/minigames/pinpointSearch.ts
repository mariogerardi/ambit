import { CAPITALS } from "../game/quizData";
import { MAJOR_CITIES } from "../geography/places";
import {
  geoArea,
  geoBounds,
  geoContains,
  geoDistance,
  geoCentroid,
} from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { interiorAnchor } from "../geography/interiorAnchor";
import { US_STATES } from "../geography/usStates";
import type { Focus, PlaceFeature, RegionFeature } from "../geography/types";

export function pinpointSearchArea(
  place: PlaceFeature,
  regions: RegionFeature[],
) {
  const country = regions.find((r) => r.id === place.parentId);
  if (country?.id === "wurl:USA") {
    const state = US_STATES.find((r) =>
      geoContains(sphericalGeometry(r.geometry), [place.lng, place.lat]),
    );
    if (state) return state;
  }
  return country;
}
const scales = new WeakMap<
  RegionFeature | PinpointSearchContext,
  { scaleKm: number; bullseyeKm: number }
>();
/** Distance scoring tightens with the supplied area; even the largest areas are tighter than world play. */
export function pinpointSearchScale(
  area: RegionFeature | PinpointSearchContext,
) {
  const cached = scales.get(area);
  if (cached) return cached;
  if ("regions" in area) {
    const result = distanceScale(area.radiusKm);
    scales.set(area, result);
    return result;
  }
  const anchor = interiorAnchor(area);
  const parts =
    area.geometry.type === "Polygon"
      ? [area.geometry.coordinates]
      : area.geometry.coordinates;
  const main = parts
    .map((coordinates) => ({
      coordinates,
      area: geoArea(sphericalGeometry({ type: "Polygon", coordinates })),
    }))
    .reduce((best, part) => (part.area > best.area ? part : best)).coordinates;
  const radiusKm = Math.max(
    ...[main]
      .flatMap((p) => p[0])
      .map(
        ([lng, lat]) =>
          geoDistance([anchor.lng, anchor.lat], [lng, lat]) * 6371.0088,
      ),
  );
  const result = distanceScale(radiusKm);
  scales.set(area, result);
  return result;
}
function distanceScale(radiusKm: number) {
  return {
    scaleKm: Math.max(20, Math.min(500, radiusKm * 0.25)),
    bullseyeKm: Math.max(0.1, Math.min(1, radiusKm * 0.005)),
  };
}
export function regionalPinpointPoints(
  distanceKm: number,
  area: RegionFeature | PinpointSearchContext,
) {
  const { scaleKm, bullseyeKm } = pinpointSearchScale(area);
  return Math.max(
    1,
    Math.round(
      1000 * Math.exp(-Math.max(0, distanceKm - bullseyeKm) / scaleKm),
    ),
  );
}
export function regionalPinpointBands(
  area: RegionFeature | PinpointSearchContext,
) {
  const { scaleKm, bullseyeKm } = pinpointSearchScale(area);
  return Array.from({ length: 10 }, (_, i) => ({
    points: 1000 - i * 100,
    radiusKm: bullseyeKm - scaleKm * Math.log((1000 - i * 100) / 1000),
  }));
}

const seenCities = new Set<string>();
const referenceCities = [...CAPITALS, ...MAJOR_CITIES].filter((p) => {
  const key = `${p.parentId}:${Math.round(p.lat * 10)}:${Math.round(p.lng * 10)}`;
  if (seenCities.has(key)) return false;
  seenCities.add(key);
  return true;
});
export interface PinpointSearchContext {
  name: string;
  regions: RegionFeature[];
  focus: Focus;
  /** Radius of the whole highlighted regional footprint, also used for scoring. */
  radiusKm: number;
  optionCount: number;
}

/** Fit country/state footprints, including nearby islands, rather than the cities used to choose them. */
export function pinpointSearchFrame(
  regions: RegionFeature[],
): Pick<PinpointSearchContext, "focus" | "radiusKm"> {
  const points = regions.flatMap((region) => {
    const anchor = interiorAnchor(region);
    const geometry = region.displayGeometry ?? region.geometry;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
    return polygons
      .filter(
        (coordinates) =>
          // Remote overseas possessions must not turn a European search into a world view.
          geoContains(sphericalGeometry({ type: "Polygon", coordinates }), [
            anchor.lng,
            anchor.lat,
          ]) ||
          geoDistance(
            [anchor.lng, anchor.lat],
            geoCentroid(sphericalGeometry({ type: "Polygon", coordinates })),
          ) <
            Math.PI / 6,
      )
      .flatMap((polygon) => polygon[0]);
  });
  const [[west, south], [east, north]] = geoBounds({
    type: "MultiPoint",
    coordinates: points,
  });
  const center: [number, number] = [
    ((west + ((east - west + 360) % 360) / 2 + 540) % 360) - 180,
    (south + north) / 2,
  ];
  const radius = points.reduce(
    (max, point) =>
      Math.max(max, geoDistance(center, point as [number, number])),
    0,
  );
  // Keep every edge inside a padded 20° view (the globe's half-FOV is 25°).
  const altitude = Math.max(
    0.3,
    Math.cos(radius) + Math.sin(radius) / Math.tan(Math.PI / 9) - 1,
    1 / Math.cos(radius) - 1,
  );
  return {
    focus: { lng: center[0], lat: center[1], altitude },
    radiusKm: radius * 6371.0088,
  };
}
const contexts = new WeakMap<
  RegionFeature[],
  WeakMap<RegionFeature, PinpointSearchContext>
>();
/** Reference cities define a useful search area; their names/positions are never supplied as answers. */
export function pinpointSearchContext(
  area: RegionFeature,
  regions: RegionFeature[],
): PinpointSearchContext {
  let cache = contexts.get(regions);
  if (!cache) {
    cache = new WeakMap();
    contexts.set(regions, cache);
  }
  const cached = cache.get(area);
  if (cached) return cached;
  const countryIds = new Set(regions.map((r) => r.id));
  const available = referenceCities.filter((p) =>
    countryIds.has(p.parentId ?? ""),
  );
  const own = available.filter((p) =>
    area.level === "ADM0"
      ? p.parentId === area.id
      : p.parentId === area.parentId &&
        geoContains(sphericalGeometry(area.geometry), [p.lng, p.lat]),
  );
  if (own.length >= 6) {
    const result = {
      name: area.name,
      regions: [area],
      ...pinpointSearchFrame([area]),
      optionCount: own.length,
    };
    cache.set(area, result);
    return result;
  }
  const anchor = interiorAnchor(area);
  const selected = [...own];
  const seen = new Set(selected.map((p) => p.id));
  const nearby: { place: PlaceFeature; distance: number }[] = [];
  for (const p of available) {
    if (seen.has(p.id)) continue;
    const distance = geoDistance([anchor.lng, anchor.lat], [p.lng, p.lat]);
    if (nearby.length < 7 || distance < nearby.at(-1)!.distance) {
      nearby.push({ place: p, distance });
      nearby.sort((a, b) => a.distance - b.distance);
      if (nearby.length > 7) nearby.pop();
    }
  }
  selected.push(...nearby.slice(0, 7 - selected.length).map((p) => p.place));
  const members = new Map([[area.id, area]]);
  for (const p of selected) {
    const region = pinpointSearchArea(p, regions);
    if (region) members.set(region.id, region);
  }
  const result = {
    name: [...members.values()]
      .map((r) => r.name)
      .sort((a, b) => a.localeCompare(b))
      .join(" · "),
    regions: [...members.values()],
    ...pinpointSearchFrame([...members.values()]),
    optionCount: selected.length,
  };
  cache.set(area, result);
  return result;
}
