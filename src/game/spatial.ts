import { geoContains, geoDistance } from "d3-geo";
import type { RegionFeature } from "../geography/types";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
export const EARTH_KM = 6371.0088;
export interface GeographicCircle {
  center: { lat: number; lng: number };
  radiusKm: number;
}
export function inCircle(
  point: { lat: number; lng: number },
  circle: GeographicCircle,
) {
  return (
    geoDistance(
      [point.lng, point.lat],
      [circle.center.lng, circle.center.lat],
    ) *
      EARTH_KM <=
    circle.radiusKm + 1e-6
  );
}
type V = [number, number, number];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (v: V): V => v.map((x) => x / Math.hypot(...v)) as V;
const vector = ([lng, lat]: number[]): V => {
  const p = (lat * Math.PI) / 180,
    t = (lng * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(t), Math.cos(p) * Math.sin(t), Math.sin(p)];
};
const angle = (a: V, b: V) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));
// Whole geometry, including exclaves/islands and edge extrema, not just a focus
// point or vertices. The interior antipode catches large spherical complements.
export function countryWithinCircle(
  region: RegionFeature,
  circle: GeographicCircle,
) {
  const limit = circle.radiusKm / EARTH_KM,
    c = vector([circle.center.lng, circle.center.lat]);
  if (limit >= Math.PI) return true;
  const antipode: [number, number] = [
    ((circle.center.lng + 360) % 360) - 180,
    -circle.center.lat,
  ];
  if (geoContains(sphericalGeometry(region.geometry), antipode)) return false;
  const parts =
    region.geometry.type === "Polygon"
      ? [region.geometry.coordinates]
      : region.geometry.coordinates;
  for (const part of parts)
    for (const ring of part)
      for (let i = 1; i < ring.length; i++) {
        const a = vector(ring[i - 1]),
          b = vector(ring[i]);
        if (angle(c, a) > limit + 1e-10 || angle(c, b) > limit + 1e-10)
          return false;
        const n = cross(a, b);
        if (Math.hypot(...n) < 1e-12) continue;
        const normal = unit(n),
          projection = c.map((v, j) => v - dot(c, normal) * normal[j]) as V;
        if (Math.hypot(...projection) < 1e-12) continue;
        const far = unit(projection).map((v) => -v) as V;
        if (
          Math.abs(angle(a, far) + angle(far, b) - angle(a, b)) < 1e-8 &&
          angle(c, far) > limit + 1e-10
        )
          return false;
      }
  return true;
}
export function longitudeDelta(lng: number, reference: number) {
  return ((lng - reference + 540) % 360) - 180;
}
