import { MAP_SURFACE_ALTITUDE } from "./surface";
import type { RegionFeature } from "../geography/types";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { geoDistance, geoInterpolate } from "d3-geo";
const renderGeometryCache = new WeakMap<
  RegionFeature["geometry"],
  RegionFeature["geometry"]
>();
function renderGeometry(source: RegionFeature["geometry"]) {
  const cached = renderGeometryCache.get(source);
  if (cached) return cached;
  const normalized = sphericalGeometry(source);
  const ring = (coordinates: number[][]) => {
    const result: number[][] = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
      const from = coordinates[i] as [number, number],
        to = coordinates[i + 1] as [number, number];
      const steps = Math.max(
        1,
        Math.ceil(geoDistance(from, to) / ((0.5 * Math.PI) / 180)),
      );
      const interpolate = geoInterpolate(from, to);
      result.push(from);
      for (let step = 1; step < steps; step++)
        result.push(interpolate(step / steps));
    }
    result.push(coordinates.at(-1)!);
    return result;
  };
  // Extra boundary vertices prevent the cap triangulator from skipping large
  // concave border sections. Interior curvature stays coarse to contain GPU cost.
  const result: RegionFeature["geometry"] = {
    ...normalized,
    coordinates: normalized.coordinates.map((part) => part.map(ring)),
  };
  renderGeometryCache.set(source, result);
  return result;
}
const outlineSources = new WeakMap<RegionFeature, RegionFeature["geometry"]>();
export const outlineSourceGeometry = (region: RegionFeature) =>
  outlineSources.get(region) ?? region.geometry;
export function prepareGlobeRegions(regions: RegionFeature[]): RegionFeature[] {
  // three-globe stamps its own bookkeeping IDs onto data objects; isolate those
  // renderer mutations from the canonical catalog as well as source geometry.
  return regions
    .filter((r) => r.displayGeometry !== null && !r.displayCovered)
    .map((region) => {
      const source = region.displayGeometry ?? region.geometry;
      const rendered = { ...region, geometry: renderGeometry(source) };
      outlineSources.set(rendered, source);
      return rendered;
    });
}
// Keep the library's per-object mesh bindings alive across data/color updates.
// Each mounted renderer owns its cache: two globes must never share bindings.
export function createGlobeRegionPreparer() {
  const objects = new WeakMap<RegionFeature, RegionFeature>();
  const variants = new Map<
    string,
    WeakMap<RegionFeature["geometry"], RegionFeature>
  >();
  const arrays = new WeakMap<RegionFeature[], RegionFeature[]>();
  return (regions: RegionFeature[]) => {
    const cached = arrays.get(regions);
    if (cached) return cached;
    const result = regions
      .filter((r) => r.displayGeometry !== null && !r.displayCovered)
      .map((region) => {
        let rendered = objects.get(region);
        if (!rendered) {
          // Stage wrappers can change while the footprint is identical. Keep
          // Kapsule's mesh binding instead of synchronously triangulating again.
          const identity = JSON.stringify([
            region.id,
            region.name,
            region.level,
            region.parentId,
            region.sourceId,
            region.focus,
          ]);
          let footprints = variants.get(identity);
          if (!footprints) variants.set(identity, (footprints = new WeakMap()));
          const footprint = region.displayGeometry ?? region.geometry;
          rendered = footprints.get(footprint);
          if (!rendered) {
            rendered = prepareGlobeRegions([region])[0];
            footprints.set(footprint, rendered);
          }
          objects.set(region, rendered);
        }
        return rendered;
      });
    arrays.set(regions, result);
    return result;
  };
}
export function boundaryAltitude(obj: object) {
  const region = obj as RegionFeature;
  return region.sourceId.startsWith("studio:")
    ? 0.0022
    : region.level === "ADM0"
      ? MAP_SURFACE_ALTITUDE
      : MAP_SURFACE_ALTITUDE + Number(region.level.slice(3)) * 0.00015;
}
export function boundaryResolution(obj: object) {
  const region = obj as RegionFeature;
  // Fine regional caps clear the highest point of their parent surface, even
  // between vertices. This small, bounded lift prevents parent/child z-fighting.
  return region.level === "ADM0" ? 3 : 0.6;
}
