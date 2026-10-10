import { geoContains, geoDistance, geoInterpolate } from "d3-geo";
import type { RegionFeature } from "../geography/types";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";

export type BorderGraph = Map<string, Set<string>>;
export type Coordinate = [longitude: number, latitude: number];
type Vector = [number, number, number];
export interface CountryInterval {
  id?: string;
  from: number;
  to: number;
}
const rad = Math.PI / 180;
const parts = (r: RegionFeature) =>
  r.geometry.type === "Polygon"
    ? [r.geometry.coordinates]
    : r.geometry.coordinates;

// A shared segment is a border; touching at a point is not. The shipped world
// is simplified as one topology, so neighboring coordinates remain identical.
export function buildBorderGraph(regions: RegionFeature[]): BorderGraph {
  const graph: BorderGraph = new Map(regions.map((r) => [r.id, new Set()]));
  const owners = new Map<string, string[]>();
  for (const region of regions)
    for (const part of parts(region))
      for (const ring of part) {
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1].join(","),
            b = ring[i].join(",");
          if (a === b) continue;
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const ids = owners.get(key) ?? [];
          ids.push(region.id);
          owners.set(key, ids);
        }
      }
  for (const ids of owners.values())
    for (const a of ids) for (const b of ids) if (a !== b) graph.get(a)!.add(b);
  return graph;
}

export function shortestLandPath(
  graph: BorderGraph,
  from: string,
  to: string,
): string[] | undefined {
  if (!graph.has(from) || !graph.has(to)) return;
  const queue = [[from]],
    visited = new Set([from]);
  for (let head = 0; head < queue.length; head++) {
    const path = queue[head],
      last = path.at(-1)!;
    if (last === to) return path;
    for (const next of [...graph.get(last)!].sort())
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
  }
}
export function isMinimumLandPath(
  graph: BorderGraph,
  path: string[],
  from: string,
  to: string,
) {
  const minimum = shortestLandPath(graph, from, to);
  return (
    !!minimum &&
    path.length === minimum.length &&
    path[0] === from &&
    path.at(-1) === to &&
    path.slice(1).every((id, i) => graph.get(path[i])?.has(id))
  );
}

const vector = ([lng, lat]: Coordinate): Vector => [
  Math.cos(lat * rad) * Math.cos(lng * rad),
  Math.cos(lat * rad) * Math.sin(lng * rad),
  Math.sin(lat * rad),
];
const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (a: Vector, b: Vector) =>
  Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));
const onArc = (a: Vector, b: Vector, p: Vector) =>
  Math.abs(angle(a, p) + angle(p, b) - angle(a, b)) < 1e-8;

// Exact spherical arc/edge intersections define intervals. Midpoint containment
// excludes tangential point touches and keeps short country visits intact.
export function greatCircleCountries(
  regions: RegionFeature[],
  from: Coordinate,
  to: Coordinate,
): CountryInterval[] {
  const distance = geoDistance(from, to);
  if (distance < 1e-8 || Math.PI - distance < 1e-8)
    throw Error("The route needs distinct, non-antipodal endpoints.");
  const a = vector(from),
    b = vector(to),
    normal = cross(a, b);
  const cuts = [0, 1];
  for (const region of regions)
    for (const part of parts(region))
      for (const ring of part)
        for (let i = 1; i < ring.length; i++) {
          const c = vector(ring[i - 1] as Coordinate),
            d = vector(ring[i] as Coordinate);
          const axis = cross(normal, cross(c, d)),
            length = Math.hypot(...axis);
          if (length < 1e-12) continue;
          const p = axis.map((n) => n / length) as Vector;
          for (const candidate of [p, p.map((n) => -n) as Vector])
            if (onArc(a, b, candidate) && onArc(c, d, candidate))
              cuts.push(
                Math.max(0, Math.min(1, angle(a, candidate) / distance)),
              );
        }
  const sorted = cuts
    .sort((a, b) => a - b)
    .filter((t, i, all) => i === 0 || t - all[i - 1] > 1e-9);
  const interpolate = geoInterpolate(from, to);
  const normalized = regions.map((r) => ({
    id: r.id,
    geometry: sphericalGeometry(r.geometry),
  }));
  const result: CountryInterval[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const start = sorted[i - 1],
      end = sorted[i];
    if (end - start < 1e-9) continue;
    const midpoint = interpolate((start + end) / 2);
    const id = normalized.find((r) => geoContains(r.geometry, midpoint))?.id;
    const previous = result.at(-1);
    if (previous && previous.id === id) previous.to = end;
    else result.push({ id, from: start, to: end });
  }
  return result;
}
