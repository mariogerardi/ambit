import { geoAzimuthalEquidistant, geoDistance, geoInterpolate } from "d3-geo";
import { ShapeUtils, Vector2 } from "three";
import { interiorAnchor } from "../geography/interiorAnchor";
import type { Focus } from "../geography/types";
import type {
  Coordinate,
  LandComponent,
  LandPortal,
  RoutePair,
} from "./borderRunTopology";
type Point = [number, number];
const area = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const mid = (a: Point, b: Point): Point => [
  (a[0] + b[0]) / 2,
  (a[1] + b[1]) / 2,
];
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lerp = (a: Point, b: Point, t: number): Point => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const edgeKey = (a: Point, b: Point) =>
  a.join(",") < b.join(",") ? `${a}|${b}` : `${b}|${a}`;
const meshes = new WeakMap<LandComponent, ReturnType<typeof prepareMesh>>();
function prepareMesh(component: LandComponent) {
  const anchor = interiorAnchor(component.region);
  const projection = geoAzimuthalEquidistant()
    .rotate([-anchor.lng, -anchor.lat])
    .translate([0, 0])
    .scale(1);
  const source = component.region.geometry.coordinates as number[][][];
  const rings = source.map((ring) =>
    ring.slice(0, -1).map((p) => projection(p as Coordinate)! as Point),
  );
  const vectors = rings.map((ring) => ring.map((p) => new Vector2(...p)));
  const triangles = ShapeUtils.triangulateShape(vectors[0], vectors.slice(1));
  const transitions = new Map<string, Point>();
  const points = rings.flat(),
    edges = new Map<string, number[]>(),
    neighbors = triangles.map(() => [] as number[]);
  triangles.forEach((triangle, index) =>
    triangle.forEach((v, i) => {
      const key = edgeKey(points[v], points[triangle[(i + 1) % 3]]);
      const owners = edges.get(key) ?? [];
      owners.push(index);
      edges.set(key, owners);
    }),
  );
  for (const [key, owners] of edges)
    if (owners.length === 2) {
      neighbors[owners[0]].push(owners[1]);
      neighbors[owners[1]].push(owners[0]);
      const [a, b] = key
        .split("|")
        .map((p) => p.split(",").map(Number) as Point);
      transitions.set(`${owners[0]}|${owners[1]}`, mid(a, b));
      transitions.set(`${owners[1]}|${owners[0]}`, mid(a, b));
    }
  const centers = triangles.map(
    (t) =>
      [
        t.reduce((n, v) => n + points[v][0], 0) / 3,
        t.reduce((n, v) => n + points[v][1], 0) / 3,
      ] as Point,
  );
  const contains = (p: Point) => {
    const inside = (ring: Point[]) => {
      let yes = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const a = ring[i],
          b = ring[j];
        if (
          a[1] > p[1] !== b[1] > p[1] &&
          p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
        )
          yes = !yes;
      }
      return yes;
    };
    return inside(rings[0]) && !rings.slice(1).some(inside);
  };
  // Split at every boundary crossing, including vertex touches. Every open
  // interval must stay inside this component; holes and coastlines both count.
  const visible = (a: Point, b: Point) => {
    const cuts = [0, 1];
    for (const ring of rings)
      for (let i = 0; i < ring.length; i++) {
        const c = ring[i],
          d = ring[(i + 1) % ring.length],
          r: [number, number] = [b[0] - a[0], b[1] - a[1]],
          s: [number, number] = [d[0] - c[0], d[1] - c[1]];
        const den = r[0] * s[1] - r[1] * s[0];
        if (Math.abs(den) < 1e-13) continue;
        const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den,
          u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
        if (t > 1e-8 && t < 1 - 1e-8 && u >= -1e-8 && u <= 1 + 1e-8)
          cuts.push(t);
      }
    cuts.sort((x, y) => x - y);
    return cuts
      .slice(1)
      .every(
        (t, i) => t - cuts[i] < 1e-8 || contains(lerp(a, b, (t + cuts[i]) / 2)),
      );
  };
  const locate = (p: Point) => {
    const found = triangles.findIndex((t) => {
      const x = area(points[t[0]], points[t[1]], p),
        y = area(points[t[1]], points[t[2]], p),
        z = area(points[t[2]], points[t[0]], p);
      return Math.min(x, y, z) >= -1e-10 || Math.max(x, y, z) <= 1e-10;
    });
    return found >= 0
      ? found
      : centers.reduce(
          (best, center, i) =>
            distance(center, p) < distance(centers[best], p) ? i : best,
          0,
        );
  };
  const portal = (p: LandPortal) => {
    const a = projection(p.a)! as Point,
      b = projection(p.b)! as Point;
    const triangle = edges.get(edgeKey(a, b))?.[0];
    return { point: mid(a, b), triangle: triangle ?? locate(mid(a, b)) };
  };
  return {
    projection,
    centers,
    neighbors,
    contains,
    visible,
    locate,
    portal,
    anchor,
    transitions,
  };
}
function mesh(component: LandComponent) {
  let result = meshes.get(component);
  if (!result) {
    result = prepareMesh(component);
    meshes.set(component, result);
  }
  return result;
}
function insidePath(
  component: LandComponent,
  from: LandPortal,
  to: LandPortal,
): Coordinate[] {
  const m = mesh(component),
    start = m.portal(from),
    end = m.portal(to);
  const queue = new Set([start.triangle]),
    cost = new Map([[start.triangle, 0]]),
    parent = new Map<number, number>();
  while (queue.size) {
    const current = [...queue].reduce((a, b) =>
      cost.get(a)! + distance(m.centers[a], end.point) <
      cost.get(b)! + distance(m.centers[b], end.point)
        ? a
        : b,
    );
    queue.delete(current);
    if (current === end.triangle) break;
    for (const next of m.neighbors[current]) {
      const candidate =
        cost.get(current)! + distance(m.centers[current], m.centers[next]);
      if (candidate < (cost.get(next) ?? Infinity)) {
        cost.set(next, candidate);
        parent.set(next, current);
        queue.add(next);
      }
    }
  }
  if (!cost.has(end.triangle))
    throw Error(
      `No continuous display corridor through ${component.countryId}`,
    );
  const indices = [end.triangle];
  while (indices[0] !== start.triangle)
    indices.unshift(parent.get(indices[0])!);
  const raw = [
    start.point,
    m.centers[indices[0]],
    ...indices
      .slice(1)
      .flatMap((index, i) => [
        m.transitions.get(`${indices[i]}|${index}`)!,
        m.centers[index],
      ]),
    end.point,
  ];
  const simple: Point[] = [raw[0]];
  let at = 0;
  while (at < raw.length - 1) {
    let next = raw.length - 1;
    while (next > at + 1 && !m.visible(raw[at], raw[next])) next--;
    simple.push(raw[next]);
    at = next;
  }
  // Round bends only when the whole replacement stays in land. Coastline and
  // enclave corners that cannot be rounded retain their exact safe corridor.
  const rounded: Point[] = [simple[0]];
  for (let i = 1; i < simple.length - 1; i++) {
    const a = lerp(simple[i], simple[i - 1], 0.12),
      b = lerp(simple[i], simple[i + 1], 0.12);
    const curve = Array.from({ length: 7 }, (_, j) => {
      const t = j / 6;
      return lerp(lerp(a, simple[i], t), lerp(simple[i], b, t), t);
    });
    if (
      m.visible(rounded.at(-1)!, a) &&
      curve.slice(1).every((p, j) => m.visible(curve[j], p)) &&
      m.visible(b, simple[i + 1])
    )
      rounded.push(...curve);
    else rounded.push(simple[i]);
  }
  rounded.push(simple.at(-1)!);
  const result: Coordinate[] = [];
  for (let i = 1; i < rounded.length; i++) {
    const a = rounded[i - 1],
      b = rounded[i],
      steps = Math.max(1, Math.ceil(distance(a, b) / 0.003));
    for (let j = 0; j < steps; j++)
      result.push(m.projection.invert!(lerp(a, b, j / steps)) as Coordinate);
  }
  result.push(to.point);
  result[0] = from.point;
  return result;
}
const crossings = new WeakMap<RoutePair, LandPortal[]>();
function crossingPortals(pair: RoutePair): LandPortal[] {
  const cached = crossings.get(pair);
  if (cached) return cached;
  const choices = pair.components.slice(1).map((component, i) => {
    const portals = pair.components[i].neighbors.get(component.key)!;
    return portals
      .filter(
        (_, index) => index % Math.max(1, Math.ceil(portals.length / 32)) === 0,
      )
      .slice(0, 32);
  });
  let costs = choices[0].map(() => 0);
  const previous: number[][] = [[]];
  for (let i = 1; i < choices.length; i++) {
    const next = choices[i].map((p) => {
      let best = Infinity,
        which = 0;
      choices[i - 1].forEach((q, j) => {
        const value = costs[j] + geoDistance(q.point, p.point);
        if (value < best) {
          best = value;
          which = j;
        }
      });
      return { best, which };
    });
    costs = next.map((v) => v.best);
    previous.push(next.map((v) => v.which));
  }
  let index = costs.reduce((best, c, i) => (c < costs[best] ? i : best), 0);
  const portals: LandPortal[] = [];
  for (let i = choices.length - 1; i >= 0; i--) {
    portals.unshift(choices[i][index]);
    index = previous[i][index];
  }
  crossings.set(pair, portals);
  return portals;
}
/** Shared-boundary points in the same order as the shortest country route. */
export function borderRunCrossings(pair: RoutePair): Coordinate[] {
  return crossingPortals(pair).map((portal) => portal.point);
}
const paths = new WeakMap<RoutePair, Coordinate[]>();
export function borderRunPath(pair: RoutePair): Coordinate[] {
  const cached = paths.get(pair);
  if (cached) return cached;
  const portals = crossingPortals(pair);
  const endpoint = (
    component: LandComponent,
    portal: LandPortal,
  ): Coordinate => {
    const m = mesh(component),
      p = m.portal(portal),
      inside = lerp(p.point, m.centers[p.triangle], 0.45);
    return m.projection.invert!(inside) as Coordinate;
  };
  const result: Coordinate[] = [
    endpoint(pair.components[0], portals[0]),
    portals[0].point,
  ];
  for (let i = 1; i < pair.components.length - 1; i++)
    result.push(
      ...insidePath(pair.components[i], portals[i - 1], portals[i]).slice(1),
    );
  result.push(endpoint(pair.components.at(-1)!, portals.at(-1)!));
  paths.set(pair, result);
  return result;
}
/** Fit points rather than country centroids, with no fixed world-sized minimum. */
export function routeFocus(points: Coordinate[]): Focus {
  const a = points[0];
  let b = points.at(-1)!;
  for (const p of points) if (geoDistance(a, p) > geoDistance(a, b)) b = p;
  const center = geoInterpolate(a, b)(0.5);
  const radius = Math.max(...points.map((p) => geoDistance(center, p)));
  return {
    lat: center[1],
    lng: center[0],
    altitude: Math.max(0.32, Math.min(3, 0.25 + radius * 2.05)),
  };
}
