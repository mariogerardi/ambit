import { geoCentroid, geoContains, geoDistance, geoInterpolate } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { Question, Response } from "./questionContracts";
import type { Construction } from "./constructionTypes";
import type { GeoPoint } from "./geodesic";
import { constructionRule, resample } from "./construction";
import { EARTH_KM } from "./spatial";

/** An authored starting shape is a draft, never a submitted or graded answer. */
export const currentConstruction = (
  q: Question,
  r: Pick<Response, "construction">,
) => r.construction ?? q.constructionInitial;
const areaQueries = new WeakMap<object, (p: GeoPoint) => boolean>();
function areaQuery(q: Question) {
  const geometry = q.constructionArea!.geometry,
    cached = areaQueries.get(geometry);
  if (cached) return cached;
  const normalized = sphericalGeometry(geometry),
    [lng0, lat0] = geoCentroid(normalized),
    rad = Math.PI / 180,
    phi = lat0 * rad;
  // Gnomonic projection makes the footprint's great-circle edges straight.
  // Cache projection once: repeated pointer/path checks avoid trigonometry per edge.
  const project = (p: GeoPoint): [number, number] | undefined => {
    const a = p.lat * rad,
      b = (p.lng - lng0) * rad,
      d =
        Math.sin(phi) * Math.sin(a) + Math.cos(phi) * Math.cos(a) * Math.cos(b);
    return d <= 1e-6
      ? undefined
      : [
          (Math.cos(a) * Math.sin(b)) / d,
          (Math.cos(phi) * Math.sin(a) -
            Math.sin(phi) * Math.cos(a) * Math.cos(b)) /
            d,
        ];
  };
  const polygons = normalized.coordinates.map((poly) =>
    poly.map((ring) => ring.map(([lng, lat]) => project({ lng, lat }))),
  );
  const flat = polygons.flat(2),
    allFit = flat.every((p) => p !== undefined);
  const inside = (
    p: [number, number],
    ring: ([number, number] | undefined)[],
  ) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j]!,
        b = ring[i]!,
        cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      if (
        Math.abs(cross) < 1e-12 &&
        p[0] >= Math.min(a[0], b[0]) - 1e-12 &&
        p[0] <= Math.max(a[0], b[0]) + 1e-12 &&
        p[1] >= Math.min(a[1], b[1]) - 1e-12 &&
        p[1] <= Math.max(a[1], b[1]) + 1e-12
      )
        return true;
      if (
        a[1] > p[1] !== b[1] > p[1] &&
        p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
      )
        hit = !hit;
    }
    return hit;
  };
  const query = (p: GeoPoint) => {
    if (!allFit) return geoContains(normalized, [p.lng, p.lat]);
    const projected = project(p);
    return (
      !!projected &&
      polygons.some(
        (poly) =>
          inside(projected, poly[0]) &&
          !poly.slice(1).some((hole) => inside(projected, hole)),
      )
    );
  };
  areaQueries.set(geometry, query);
  return query;
}
export function inConstructionArea(q: Question, p: GeoPoint) {
  return !q.constructionArea || areaQuery(q)(p);
}
export const automaticConstructionNavigation = (q: Question) =>
  !!q.constructionArea || q.rule.type === "point-coverage-max";
/** Gesture ownership is decided at pointer-down and retained until release. */
export function startsConstruction(
  q: Question,
  c: Construction | undefined,
  p: GeoPoint,
) {
  const r = constructionRule(q);
  if (r?.type === "point-coverage-max")
    return (
      c?.kind === "circle" &&
      geoDistance([p.lng, p.lat], [c.center.lng, c.center.lat]) * EARTH_KM <=
        r.radiusKm
    );
  return !!r && inConstructionArea(q, p);
}
/** Rotate the center with the grabbed surface point so dragging never jumps. */
export function dragConstructionCircle(
  c: Extract<Construction, { kind: "circle" }>,
  grab: GeoPoint,
  to: GeoPoint,
): Construction {
  const rad = Math.PI / 180,
    vec = (p: GeoPoint) => [
      Math.cos(p.lat * rad) * Math.cos(p.lng * rad),
      Math.cos(p.lat * rad) * Math.sin(p.lng * rad),
      Math.sin(p.lat * rad),
    ];
  const a = vec(grab),
    b = vec(to),
    v = vec(c.center),
    cross = (u: number[], w: number[]) => [
      u[1] * w[2] - u[2] * w[1],
      u[2] * w[0] - u[0] * w[2],
      u[0] * w[1] - u[1] * w[0],
    ],
    dot = (u: number[], w: number[]) => u.reduce((s, x, i) => s + x * w[i], 0),
    axis = cross(a, b),
    sin = Math.hypot(...axis),
    cos = dot(a, b);
  if (sin < 1e-10) return c;
  const n = axis.map((x) => x / sin),
    nv = cross(n, v),
    out = v.map((x, i) => x * cos + nv[i] * sin + n[i] * dot(n, v) * (1 - cos));
  return {
    ...c,
    center: {
      lat: Math.asin(Math.max(-1, Math.min(1, out[2]))) / rad,
      lng: Math.atan2(out[1], out[0]) / rad,
    },
  };
}
/** Clip displayed outlines to the editable footprint, keeping canonical input intact. */
export function clippedConstructionPaths(
  q: Question,
  points: GeoPoint[],
): GeoPoint[][] {
  if (!q.constructionArea) return [points];
  const samples = resample(points, 2, 4000),
    runs: GeoPoint[][] = [];
  let run: GeoPoint[] = [];
  const boundary = (a: GeoPoint, b: GeoPoint, insideA: boolean) => {
    const interpolate = geoInterpolate([a.lng, a.lat], [b.lng, b.lat]);
    let low = 0,
      high = 1;
    for (let n = 0; n < 16; n++) {
      const mid = (low + high) / 2,
        [lng, lat] = interpolate(mid);
      if (inConstructionArea(q, { lng, lat }) === insideA) low = mid;
      else high = mid;
    }
    const [lng, lat] = interpolate((low + high) / 2);
    return { lng, lat };
  };
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i],
      inside = inConstructionArea(q, p),
      previous = samples[i - 1],
      was = previous && inConstructionArea(q, previous);
    if (inside) {
      if (previous && !was) run.push(boundary(previous, p, false));
      run.push(p);
    } else if (previous && was) {
      run.push(boundary(previous, p, true));
      if (run.length > 1) runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

export function constructionCursor(
  q: Question,
  c: Construction | undefined,
  p: GeoPoint | undefined,
  tool: "draw" | "erase" | "move",
  active = false,
  panning = false,
) {
  if (panning) return "grabbing";
  if (!active && (!p || !startsConstruction(q, c, p))) return "grab";
  if (q.mode === "geo-brush") return tool === "erase" ? "erase" : "paint";
  return q.mode === "geo-circle" ? "grabbing" : "crosshair";
}
