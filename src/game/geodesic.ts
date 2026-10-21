import { geoDistance, geoInterpolate } from "d3-geo";

export interface GeoPoint {
  lat: number;
  lng: number;
}
const radians = Math.PI / 180;
export const normalizeBearing = (degrees: number) =>
  ((degrees % 360) + 360) % 360;
export const angularError = (a: number, b: number) =>
  Math.abs(normalizeBearing(a - b + 180) - 180);
export const validGeoPoint = (p: GeoPoint) =>
  Number.isFinite(p?.lat) &&
  Number.isFinite(p?.lng) &&
  Math.abs(p.lat) <= 90 &&
  Math.abs(p.lng) <= 180;

/** A sphere throughout: these are initial azimuths, never constant-heading tracks. */
export function initialBearing(from: GeoPoint, to: GeoPoint) {
  if (!validGeoPoint(from) || !validGeoPoint(to))
    throw Error("Invalid bearing coordinates");
  const distance = geoDistance([from.lng, from.lat], [to.lng, to.lat]);
  if (distance < 1e-8 || Math.PI - distance < 1e-8 || Math.abs(from.lat) === 90)
    throw Error(
      "A bearing requires distinct, non-antipodal points and a nonpolar origin",
    );
  const a = from.lat * radians,
    b = to.lat * radians;
  const delta = (to.lng - from.lng) * radians;
  return normalizeBearing(
    Math.atan2(
      Math.sin(delta) * Math.cos(b),
      Math.cos(a) * Math.sin(b) - Math.sin(a) * Math.cos(b) * Math.cos(delta),
    ) / radians,
  );
}

/** Short, sampled spherical segments remain continuous through the antimeridian. */
export function greatCircleArc(from: GeoPoint, to: GeoPoint): number[][] {
  initialBearing(from, to);
  const interpolate = geoInterpolate([from.lng, from.lat], [to.lng, to.lat]);
  const steps = Math.max(
    2,
    Math.ceil(geoDistance([from.lng, from.lat], [to.lng, to.lat]) / radians),
  );
  return Array.from({ length: steps + 1 }, (_, i) => interpolate(i / steps));
}

export function pointAlongBearing(
  from: GeoPoint,
  bearing: number,
  distance: number,
): GeoPoint {
  const a = from.lat * radians,
    theta = bearing * radians;
  const lat = Math.asin(
    Math.sin(a) * Math.cos(distance) +
      Math.cos(a) * Math.sin(distance) * Math.cos(theta),
  );
  const lng =
    from.lng +
    Math.atan2(
      Math.sin(theta) * Math.sin(distance) * Math.cos(a),
      Math.cos(distance) - Math.sin(a) * Math.sin(lat),
    ) /
      radians;
  return { lat: lat / radians, lng: normalizeBearing(lng + 180) - 180 };
}

/** Intersections reached forward along both initial headings, before either antipode. */
export function forwardBearingIntersections(
  a: GeoPoint,
  headingA: number,
  b: GeoPoint,
  headingB: number,
): GeoPoint[] {
  initialBearing(a, b);
  if (!Number.isFinite(headingA) || !Number.isFinite(headingB))
    throw Error("Invalid intersection bearings");
  type Vec = [number, number, number];
  const dot = (a: Vec, b: Vec) => a.reduce((sum, n, i) => sum + n * b[i], 0);
  const cross = (a: Vec, b: Vec): Vec => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const ray = (p: GeoPoint, heading: number) => {
    const lat = p.lat * radians,
      lng = p.lng * radians,
      theta = heading * radians;
    const point: Vec = [
      Math.cos(lat) * Math.cos(lng),
      Math.cos(lat) * Math.sin(lng),
      Math.sin(lat),
    ];
    const north: Vec = [
      -Math.sin(lat) * Math.cos(lng),
      -Math.sin(lat) * Math.sin(lng),
      Math.cos(lat),
    ];
    const east: Vec = [-Math.sin(lng), Math.cos(lng), 0];
    const direction = north.map(
      (n, i) => n * Math.cos(theta) + east[i] * Math.sin(theta),
    ) as Vec;
    return { point, direction, normal: cross(point, direction) };
  };
  const rays = [ray(a, headingA), ray(b, headingB)];
  const axis = cross(rays[0].normal, rays[1].normal);
  const length = Math.hypot(...axis);
  if (length < 1e-10) return [];
  return [1, -1].flatMap((sign) => {
    const point = axis.map((n) => (sign * n) / length) as Vec;
    const forward = rays.every((ray) => {
      const angle =
        (Math.atan2(dot(ray.direction, point), dot(ray.point, point)) +
          2 * Math.PI) %
        (2 * Math.PI);
      return angle > 1e-8 && angle < Math.PI - 1e-8;
    });
    return forward
      ? [
          {
            lat: Math.asin(point[2]) / radians,
            lng: Math.atan2(point[1], point[0]) / radians,
          },
        ]
      : [];
  });
}
