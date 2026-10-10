import { geoArea } from "d3-geo";
const cache = new WeakMap();
// D3 and react-globe.gl's conic geometry use clockwise spherical exteriors.
// RFC 7946 source coordinates remain untouched. Cache each renderer copy so
// material/hover updates retain the exact coordinate identity of the meshes.
export function sphericalGeometry(geometry) {
  const existing = cache.get(geometry);
  if (existing) return existing;
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const normalized = {
    type: "MultiPolygon",
    coordinates: polygons.map((rings) => {
      const reverse =
        geoArea({ type: "Polygon", coordinates: rings }) > 2 * Math.PI;
      return rings.map((ring) => (reverse ? [...ring].reverse() : [...ring]));
    }),
  };
  cache.set(geometry, normalized);
  return normalized;
}
