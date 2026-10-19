import { geoArea, geoAzimuthalEquidistant, geoCentroid } from "d3-geo";
import polylabel from "polylabel";
import type { RegionFeature, Focus } from "./types";
import { sphericalGeometry } from "./sphericalGeometry.mjs";

export interface InteriorAnchor extends Focus {
  clearance: number;
}
const anchors = new WeakMap<RegionFeature["geometry"], InteriorAnchor>();

/** A display-only anchor in the widest interior of the main landmass, never a camera or grading point. */
export function interiorAnchor(region: RegionFeature): InteriorAnchor {
  const geometry = region.displayGeometry ?? region.geometry;
  const cached = anchors.get(geometry);
  if (cached) return cached;
  const parts =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  // Overseas possessions and small islands must not pull a mainland badge offshore.
  const main = parts
    .map((rings) => ({
      rings,
      area: geoArea(sphericalGeometry({ type: "Polygon", coordinates: rings })),
    }))
    .reduce((best, part) => (part.area > best.area ? part : best)).rings;
  const polygon = sphericalGeometry({ type: "Polygon", coordinates: main });
  const center = geoCentroid(polygon);
  // A local metric projection handles dateline-crossing and high-latitude land.
  const projection = geoAzimuthalEquidistant()
    .rotate([-center[0], -center[1]])
    .translate([0, 0])
    .scale(1);
  const projected = main.map((ring) =>
    ring.map((point) => projection(point as [number, number])!),
  );
  const point = polylabel(projected, 0.00001);
  const [lng, lat] = projection.invert!(point)!;
  const anchor = { lat, lng, clearance: point.distance };
  anchors.set(geometry, anchor);
  return anchor;
}
