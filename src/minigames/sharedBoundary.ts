import type { RegionFeature } from "../geography/types";

type Point = [number, number];
const edges = new WeakMap<RegionFeature, Map<string, [Point, Point]>>();
function boundaryEdges(region: RegionFeature) {
  const cached = edges.get(region);
  if (cached) return cached;
  const geometry = region.displayGeometry ?? region.geometry;
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const result = new Map<string, [Point, Point]>();
  for (const polygon of polygons)
    for (const ring of polygon)
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1] as Point,
          b = ring[i] as Point;
        const ka = a.join(","),
          kb = b.join(",");
        if (ka !== kb)
          result.set(ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`, [a, b]);
      }
  edges.set(region, result);
  return result;
}

/** Trace shared display edges in order; never connect separate border components. */
export function sharedBoundary(a: RegionFeature, b: RegionFeature): Point[][] {
  const other = boundaryEdges(b);
  const shared = [...boundaryEdges(a)]
    .filter(([key]) => other.has(key))
    .map(([, edge]) => edge);
  const links = new Map<string, number[]>();
  shared.forEach((edge, i) =>
    edge.forEach((p) => {
      const key = p.join(",");
      links.set(key, [...(links.get(key) ?? []), i]);
    }),
  );
  const remaining = new Set(shared.map((_, i) => i));
  const paths: Point[][] = [];
  while (remaining.size) {
    const first =
      [...remaining].find((i) =>
        shared[i].some((p) => links.get(p.join(","))!.length === 1),
      ) ?? remaining.values().next().value!;
    const edge = shared[first];
    const start =
      edge.find((p) => links.get(p.join(","))!.length === 1) ?? edge[0];
    const path = [start];
    let point = start;
    while (true) {
      const next = links.get(point.join(","))!.find((i) => remaining.has(i));
      if (next === undefined) break;
      remaining.delete(next);
      const [a, b] = shared[next];
      point = a.join(",") === point.join(",") ? b : a;
      path.push(point);
    }
    paths.push(path);
  }
  return paths;
}
