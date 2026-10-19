import { geoDistance, geoInterpolate } from "d3-geo";
import type { RegionFeature } from "../geography/types";
import type { RouteFeature } from "../geography/types";
import { boundaryAltitude } from "./geometry";
import type { VisualState } from "../geography/types";

// The stock polygon stroke shares the cap's coarse tessellation and has only
// 0.0001 radius units of clearance. Long chords can intersect a neighboring cap.
// Draw independent, finely sampled great-circle segments above every cap.
export const outlineResolution = 0.5;
export const outlineClearance = 0.00002;
const radians = Math.PI / 180;
const cache = new WeakMap<RegionFeature["geometry"], Float32Array>();

/** Draw committed highlights after ordinary and hovered borders, still depth-tested. */
export function outlineEmphasis(state?: VisualState, hovered = false) {
  const committed = ["selected", "correct", "answer", "incorrect"].includes(
    state ?? "",
  );
  const candidateHover =
    hovered && ["selectable", "surface"].includes(state ?? "");
  return {
    order: committed
      ? 3
      : candidateHover || state === "hinted" || state === "clue"
        ? 2
        : 1,
    width: committed ? 1.8 : candidateHover ? 1.75 : 1.35,
    // Clear country/state/county caps while keeping blue borders close to land.
    lift: state === "hinted" || state === "clue" ? 0.00035 : 0,
  };
}

/** Explicit question outlines take priority over global and regional border settings. */
export function regionBorderVisible(
  region: Pick<RegionFeature, "id" | "level">,
  settings: {
    showBorders?: boolean;
    showRegionalBorders?: boolean;
    borderRegionIds?: readonly string[];
  },
) {
  if (settings.borderRegionIds)
    return settings.borderRegionIds.includes(region.id);
  return (
    settings.showBorders !== false ||
    (region.level !== "ADM0" && !!settings.showRegionalBorders)
  );
}

export function boundaryOutlinePositions(region: RegionFeature) {
  const cached = cache.get(region.geometry);
  if (cached) return cached;
  const radius = 1 + boundaryAltitude(region) + outlineClearance;
  const positions: number[] = [];
  const point = ([lng, lat]: [number, number]) => {
    const phi = lat * radians,
      theta = lng * radians;
    return [
      radius * Math.cos(phi) * Math.sin(theta),
      radius * Math.sin(phi),
      radius * Math.cos(phi) * Math.cos(theta),
    ];
  };
  const parts =
    region.geometry.type === "Polygon"
      ? [region.geometry.coordinates]
      : region.geometry.coordinates;
  for (const part of parts)
    for (const ring of part) {
      for (let i = 1; i < ring.length; i++) {
        const from = ring[i - 1] as [number, number];
        const to = ring[i] as [number, number];
        const steps = Math.max(
          1,
          Math.ceil(geoDistance(from, to) / (outlineResolution * radians)),
        );
        const interpolate = geoInterpolate(from, to);
        let previous = point(from);
        for (let step = 1; step <= steps; step++) {
          const next = point(step === steps ? to : interpolate(step / steps));
          positions.push(...previous, ...next);
          previous = next;
        }
      }
    }
  const result = new Float32Array(positions);
  cache.set(region.geometry, result);
  return result;
}

export function outlineColor(stroke: string) {
  const rgba = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(stroke);
  return rgba
    ? {
        color: `rgb(${rgba[1]},${rgba[2]},${rgba[3]})`,
        opacity: Number(rgba[4]),
      }
    : { color: stroke, opacity: 1 };
}

const routeCache = new WeakMap<RouteFeature, Float32Array>();
export function surfaceRoutePositions(route: RouteFeature) {
  const cached = routeCache.get(route);
  if (cached) return cached;
  const from: [number, number] = [route.from.lng, route.from.lat],
    to: [number, number] = [route.to.lng, route.to.lat];
  const interpolate = geoInterpolate(from, to);
  const steps = Math.max(
    1,
    Math.ceil(geoDistance(from, to) / (outlineResolution * radians)),
  );
  const radius = 1.003;
  const point = (t: number) => {
    const [lng, lat] = interpolate(t),
      phi = lat * radians,
      theta = lng * radians;
    return [
      radius * Math.cos(phi) * Math.sin(theta),
      radius * Math.sin(phi),
      radius * Math.cos(phi) * Math.cos(theta),
    ];
  };
  const positions: number[] = [];
  for (let i = 1; i <= steps; i++)
    positions.push(...point((i - 1) / steps), ...point(i / steps));
  const result = new Float32Array(positions);
  routeCache.set(route, result);
  return result;
}
