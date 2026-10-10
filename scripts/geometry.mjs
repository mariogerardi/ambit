import { geoCentroid, geoContains } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
export { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
export function center(geometry) {
  return geoCentroid(sphericalGeometry(geometry));
}
export function contains(geometry, point) {
  return geoContains(sphericalGeometry(geometry), point);
}
export function validateGeometry(geometry) {
  if (!["Polygon", "MultiPolygon"].includes(geometry?.type))
    throw Error("Expected polygon geometry");
  const polys =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  if (!polys.length) throw Error("Empty geometry");
  let crossings = 0;
  for (const rings of polys) {
    if (!rings.length) throw Error("Empty polygon");
    for (const ring of rings) {
      if (ring.length < 4) throw Error("Invalid ring");
      if (JSON.stringify(ring[0]) !== JSON.stringify(ring.at(-1)))
        throw Error("Unclosed ring");
      ring.forEach(([lng, lat], i) => {
        if (
          !Number.isFinite(lng) ||
          !Number.isFinite(lat) ||
          Math.abs(lng) > 180.000001 ||
          Math.abs(lat) > 90
        )
          throw Error("Invalid WGS84 coordinate");
        if (i && Math.abs(lng - ring[i - 1][0]) > 180) crossings++;
      });
    }
  }
  return crossings;
}
