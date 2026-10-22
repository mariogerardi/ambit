import { geoArea, geoContains, geoDistance, geoInterpolate } from "d3-geo";
import { validGeoPoint, type GeoPoint } from "./geodesic";
import { EARTH_KM } from "./spatial";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type {
  Construction,
  ConstructionGrid,
  ConstructionResult,
  ConstructionRule,
  GridShape,
} from "./constructionTypes";
import type { Question, Response } from "./questionContracts";

const rad = Math.PI / 180;
const ll = (p: GeoPoint): [number, number] => [p.lng, p.lat];
export const constructionRule = (
  q: Pick<Question, "rule">,
): ConstructionRule | undefined =>
  [
    "raster-overlap",
    "point-coverage-max",
    "island-coverage-max",
    "line-following",
    "population-coverage-area-budget",
    "population-balance",
  ].includes(q.rule.type)
    ? (q.rule as ConstructionRule)
    : undefined;
export const constructionKind = (
  rule: ConstructionRule,
): Construction["kind"] =>
  ({
    "raster-overlap": "brush",
    "point-coverage-max": "circle",
    "island-coverage-max": "circle",
    "line-following": "trace",
    "population-coverage-area-budget": "polygon",
    "population-balance": "cut",
  })[rule.type] as Construction["kind"];
export function validConstruction(value: unknown): value is Construction {
  const c = value as Construction;
  if (!c || c.version !== 1) return false;
  if (c.kind === "circle") return validGeoPoint(c.center);
  if (c.kind === "brush")
    return (
      Array.isArray(c.strokes) &&
      c.strokes.length <= 128 &&
      c.strokes.reduce((n, s) => n + (s?.points?.length ?? 5000), 0) <= 4096 &&
      c.strokes.every(
        (s) =>
          !!s &&
          typeof s.erase === "boolean" &&
          Number.isFinite(s.radiusKm) &&
          s.radiusKm >= 1 &&
          s.radiusKm <= 500 &&
          Array.isArray(s.points) &&
          s.points.length > 0 &&
          s.points.every(validGeoPoint),
      )
    );
  return (
    ["trace", "polygon", "cut"].includes(c.kind) &&
    Array.isArray(c.points) &&
    c.points.length <= 4096 &&
    c.points.every(validGeoPoint)
  );
}
export function validConstructionResult(
  value: unknown,
): value is ConstructionResult {
  const r = value as ConstructionResult;
  return (
    !!r &&
    r.version === 1 &&
    ["brush", "circle", "trace", "polygon", "cut"].includes(r.kind) &&
    typeof r.sourceRevision === "string" &&
    r.sourceRevision.length > 0 &&
    (r.tier === null ||
      (Number.isInteger(r.tier) && r.tier >= 0 && r.tier < 3)) &&
    typeof r.feedback === "string" &&
    Array.isArray(r.metrics) &&
    r.metrics.length ===
      { brush: 3, circle: 1, trace: 2, polygon: 2, cut: 4 }[r.kind] &&
    r.metrics.every(
      (m) =>
        !!m &&
        typeof m.label === "string" &&
        typeof m.unit === "string" &&
        Number.isFinite(m.value) &&
        m.value >= 0 &&
        (m.unit !== "%" || m.value <= 100 + 1e-6),
    ) &&
    (r.containedIds === undefined ||
      (Array.isArray(r.containedIds) &&
        r.containedIds.every((id) => typeof id === "string")))
  );
}
export function gridPoint(grid: GridShape, index: number): GeoPoint {
  const y = (Math.floor(index / grid.columns) + 0.5) / grid.rows;
  const longitude =
    grid.west +
    (((index % grid.columns) + 0.5) / grid.columns) * (grid.east - grid.west);
  return {
    lng:
      longitude > 180
        ? longitude - 360
        : longitude < -180
          ? longitude + 360
          : longitude,
    lat: grid.equalArea
      ? Math.asin(
          Math.sin(grid.south * rad) +
            y * (Math.sin(grid.north * rad) - Math.sin(grid.south * rad)),
        ) / rad
      : grid.south + y * (grid.north - grid.south),
  };
}
export function gridBounds(
  grid: GridShape,
  index: number,
): [number, number, number, number] {
  const col = index % grid.columns,
    row = Math.floor(index / grid.columns);
  const latitude = (y: number) =>
    grid.equalArea
      ? Math.asin(
          Math.sin(grid.south * rad) +
            (y / grid.rows) *
              (Math.sin(grid.north * rad) - Math.sin(grid.south * rad)),
        ) / rad
      : grid.south + (y / grid.rows) * (grid.north - grid.south);
  return [
    grid.west + (col / grid.columns) * (grid.east - grid.west),
    latitude(row),
    grid.west + ((col + 1) / grid.columns) * (grid.east - grid.west),
    latitude(row + 1),
  ];
}
function gridIndex(grid: GridShape, p: GeoPoint) {
  const y = grid.equalArea
    ? (Math.sin(p.lat * rad) - Math.sin(grid.south * rad)) /
      (Math.sin(grid.north * rad) - Math.sin(grid.south * rad))
    : (p.lat - grid.south) / (grid.north - grid.south);
  return [
    Math.floor(((p.lng - grid.west) / (grid.east - grid.west)) * grid.columns),
    Math.floor(y * grid.rows),
  ];
}
/** Ordered paint/erase disk samples in geographic coordinates, never screen pixels. */
export function paintedCells(
  grid: ConstructionGrid,
  c: Extract<Construction, { kind: "brush" }>,
) {
  const allowed = new Set(grid.cells.map((cell) => cell[0])),
    painted = new Set<number>();
  for (const stroke of c.strokes) {
    const samples = resample(
      stroke.points,
      Math.max(5, stroke.radiusKm / 3),
      2048,
    );
    for (const p of samples) {
      const delta = stroke.radiusKm / EARTH_KM / rad;
      const dx =
        Math.abs(p.lat) + delta >= 90
          ? 180
          : Math.asin(
              Math.min(1, Math.sin(delta * rad) / Math.cos(p.lat * rad)),
            ) / rad;
      const longitude =
        p.lng + 360 * Math.round(((grid.west + grid.east) / 2 - p.lng) / 360);
      const [x0, y0] = gridIndex(grid, {
        lng: longitude - dx,
        lat: Math.max(-90, p.lat - delta),
      });
      const [x1, y1] = gridIndex(grid, {
        lng: longitude + dx,
        lat: Math.min(90, p.lat + delta),
      });
      for (let y = Math.max(0, y0); y <= Math.min(grid.rows - 1, y1); y++)
        for (let x = x0; x <= x1; x++) {
          const wrapped =
            grid.east - grid.west >= 360 - 1e-8
              ? ((x % grid.columns) + grid.columns) % grid.columns
              : x;
          if (wrapped < 0 || wrapped >= grid.columns) continue;
          const i = y * grid.columns + wrapped;
          if (
            allowed.has(i) &&
            geoDistance(ll(p), ll(gridPoint(grid, i))) * EARTH_KM <=
              stroke.radiusKm + 1e-7
          )
            stroke.erase ? painted.delete(i) : painted.add(i);
        }
    }
  }
  return painted;
}
export function resample(
  points: GeoPoint[],
  spacingKm = 8,
  limit = 800,
): GeoPoint[] {
  if (points.length < 2) return [...points];
  const lengths = points
    .slice(1)
    .map((p, i) => geoDistance(ll(points[i]), ll(p)) * EARTH_KM);
  const total = lengths.reduce((a, b) => a + b, 0),
    step = Math.max(spacingKm, total / (limit - 1));
  const out = [points[0]];
  let next = step,
    offset = 0;
  lengths.forEach((length, i) => {
    const interpolate = geoInterpolate(ll(points[i]), ll(points[i + 1]));
    while (next < offset + length) {
      const [lng, lat] = interpolate((next - offset) / length);
      out.push({ lng, lat });
      next += step;
    }
    offset += length;
  });
  out.push(points.at(-1)!);
  return out;
}
type V = [number, number, number];
const dot = (a: V, b: V) => a.reduce((s, n, i) => s + n * b[i], 0);
const cross = (a: V, b: V): V => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const vector = (p: GeoPoint): V => [
  Math.cos(p.lat * rad) * Math.cos(p.lng * rad),
  Math.cos(p.lat * rad) * Math.sin(p.lng * rad),
  Math.sin(p.lat * rad),
];
const angle = (a: V, b: V) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b));
export function segmentDistance(p: GeoPoint, a: GeoPoint, b: GeoPoint) {
  const v = vector(p),
    u = vector(a),
    w = vector(b),
    n = cross(u, w),
    norm = Math.hypot(...n);
  if (norm < 1e-12) return Math.min(angle(v, u), angle(v, w)) * EARTH_KM;
  const normal = n.map((x) => x / norm) as V,
    projection = v.map((x, i) => x - dot(v, normal) * normal[i]) as V,
    pl = Math.hypot(...projection);
  if (pl > 1e-12) {
    const q = projection.map((x) => x / pl) as V;
    if (Math.abs(angle(u, q) + angle(q, w) - angle(u, w)) < 1e-7)
      return angle(v, q) * EARTH_KM;
  }
  return Math.min(angle(v, u), angle(v, w)) * EARTH_KM;
}
const lineLength = (p: GeoPoint[]) =>
  p
    .slice(1)
    .reduce((s, q, i) => s + geoDistance(ll(p[i]), ll(q)) * EARTH_KM, 0);
const polygon = (points: GeoPoint[]) =>
  sphericalGeometry({
    type: "Polygon" as const,
    coordinates: [[...points.map(ll), ll(points[0])]],
  });
export function simplePolygon(points: GeoPoint[]) {
  if (points.length < 3) return false;
  // Gnomonic projection preserves great-circle edges as lines; reject a shape spanning a hemisphere.
  const avg = points
      .map(vector)
      .reduce((a, b) => a.map((n, i) => n + b[i]) as V, [0, 0, 0] as V),
    len = Math.hypot(...avg);
  if (len < 1e-8) return false;
  const center = avg.map((x) => x / len) as V,
    axis = cross(center, Math.abs(center[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]),
    al = Math.hypot(...axis),
    east = axis.map((x) => x / al) as V,
    north = cross(center, east);
  const coords = points.map((p) => {
    const v = vector(p),
      d = dot(v, center);
    return d <= 1e-5 ? undefined : [dot(v, east) / d, dot(v, north) / d];
  });
  if (coords.some((p) => !p)) return false;
  const orient = (a: number[], b: number[], c: number[]) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 0; i < points.length; i++) {
    if (geoDistance(ll(points[i]), ll(points[(i + 1) % points.length])) < 1e-7)
      return false;
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const a = coords[i]!,
        b = coords[(i + 1) % points.length]!,
        c = coords[j]!,
        d = coords[(j + 1) % points.length]!;
      const overlap = [0, 1].every(
        (k) =>
          Math.max(Math.min(a[k], b[k]), Math.min(c[k], d[k])) <=
          Math.min(Math.max(a[k], b[k]), Math.max(c[k], d[k])) + 1e-12,
      );
      if (
        overlap &&
        orient(a, b, c) * orient(a, b, d) <= 0 &&
        orient(c, d, a) * orient(c, d, b) <= 0
      )
        return false;
    }
  }
  return geoArea(polygon(points)) > 1e-10;
}
export function cutSide(points: GeoPoint[], p: GeoPoint) {
  return dot(cross(vector(points[0]), vector(points[1])), vector(p)) >= 0;
}
export function snapToBoundary(p: GeoPoint, boundary: GeoPoint[]) {
  const v = vector(p);
  let best = boundary[0],
    distance = Infinity;
  for (let i = 1; i < boundary.length; i++) {
    const u = vector(boundary[i - 1]),
      w = vector(boundary[i]),
      n = cross(u, w),
      norm = Math.hypot(...n);
    const candidates = [u, w];
    if (norm > 1e-12) {
      const normal = n.map((x) => x / norm) as V,
        projected = v.map((x, k) => x - dot(v, normal) * normal[k]) as V,
        len = Math.hypot(...projected);
      if (len > 1e-12) {
        const q = projected.map((x) => x / len) as V;
        if (Math.abs(angle(u, q) + angle(q, w) - angle(u, w)) < 1e-7)
          candidates.push(q);
      }
    }
    for (const candidate of candidates) {
      const d = angle(v, candidate);
      if (d < distance) {
        distance = d;
        best = {
          lat: Math.asin(Math.max(-1, Math.min(1, candidate[2]))) / rad,
          lng: Math.atan2(candidate[1], candidate[0]) / rad,
        };
      }
    }
  }
  return { ...best };
}
export function brushSizeRange(
  rule: Extract<ConstructionRule, { type: "raster-overlap" }>,
) {
  return {
    min: Math.max(10, Math.round(rule.brushRadiusKm / 40) * 10),
    max: Math.min(500, rule.brushRadiusKm * 2),
    step: 10,
  };
}
export function brushSize(
  rule: Extract<ConstructionRule, { type: "raster-overlap" }>,
  value?: number,
) {
  const range = brushSizeRange(rule);
  return Number.isFinite(value)
    ? Math.max(range.min, Math.min(range.max, value!))
    : rule.brushRadiusKm;
}
export function constructionReady(q: Question, response: Response) {
  const rule = constructionRule(q),
    c = response.construction ?? q.constructionInitial;
  if (!rule || !validConstruction(c) || c.kind !== constructionKind(rule))
    return false;
  if (c.kind === "brush")
    return (
      rule.type === "raster-overlap" &&
      c.strokes.every((s) => s.radiusKm <= brushSizeRange(rule).max) &&
      c.strokes.some((s) => !s.erase)
    );
  if (c.kind === "circle") return true;
  if (c.kind === "trace") return c.points.length >= 2;
  if (c.kind === "polygon")
    return (
      rule.type === "population-coverage-area-budget" &&
      c.points.length >= rule.minVertices &&
      c.points.length <= rule.maxVertices &&
      simplePolygon(c.points)
    );
  if (c.kind === "cut" && rule.type === "population-balance")
    return (
      c.points.length === 2 &&
      geoDistance(ll(c.points[0]), ll(c.points[1])) > 1e-5 &&
      geoDistance(ll(c.points[0]), ll(c.points[1])) < Math.PI - 1e-5 &&
      c.points.every(
        (p) =>
          Math.min(
            ...rule.boundary
              .slice(1)
              .map((b, i) => segmentDistance(p, rule.boundary[i], b)),
          ) < 0.1,
      ) &&
      [true, false].every((side) =>
        rule.grid.cells.some(
          ([i, , area]) =>
            area > 0 && cutSide(c.points, gridPoint(rule.grid, i)) === side,
        ),
      )
    );
  return false;
}
export function evaluateConstruction(
  q: Question,
  response: Response,
): ConstructionResult | undefined {
  const rule = constructionRule(q),
    c = response.construction ?? q.constructionInitial;
  if (!rule || !c || !constructionReady(q, response)) return;
  let tier = -1,
    metrics: ConstructionResult["metrics"] = [],
    containedIds: string[] | undefined;
  if (rule.type === "raster-overlap" && c.kind === "brush") {
    const cells = paintedCells(rule.grid, c);
    let tp = 0,
      painted = 0,
      total = 0;
    for (const [i, value, area] of rule.grid.cells) {
      total += value * area;
      if (cells.has(i)) {
        painted += area;
        tp += value * area;
      }
    }
    const precision = painted ? tp / painted : 0,
      recall = total ? tp / total : 0,
      f1 =
        precision + recall
          ? (2 * precision * recall) / (precision + recall)
          : 0;
    tier = rule.tiers.findIndex(
      (t) => f1 + 1e-9 >= t.f1 && precision + 1e-9 >= t.precision,
    );
    metrics = [
      { label: "Dune coverage", value: recall * 100, unit: "%" },
      { label: "Paint on dunes", value: precision * 100, unit: "%" },
      { label: "Overlap score", value: f1 * 100, unit: "%" },
    ];
  } else if (rule.type === "island-coverage-max" && c.kind === "circle") {
    containedIds = rule.candidates
      .filter((island) =>
        island.boundary.every(
          (p) =>
            geoDistance(ll(c.center), ll(p)) * EARTH_KM <= rule.radiusKm + 1e-6,
        ),
      )
      .map((island) => island.id);
    tier = rule.tiers.findIndex((t) => containedIds!.length >= t.count);
    metrics = [
      {
        label: "Whole islands enclosed",
        value: containedIds.length,
        unit: `of ${rule.candidates.length}`,
      },
    ];
  } else if (rule.type === "point-coverage-max" && c.kind === "circle") {
    containedIds = rule.candidates
      .filter(
        (p) =>
          geoDistance(ll(c.center), ll(p)) * EARTH_KM <= rule.radiusKm + 1e-6,
      )
      .map((p) => p.id);
    tier = rule.tiers.findIndex((t) => containedIds!.length >= t.count);
    const pointLabel = rule.pointLabel ?? "capitals";
    metrics = [
      {
        label: `${pointLabel[0].toUpperCase()}${pointLabel.slice(1)} enclosed`,
        value: containedIds.length,
        unit: `of ${rule.candidates.length}`,
      },
    ];
  } else if (rule.type === "line-following" && c.kind === "trace") {
    const user = resample(c.points),
      ref = resample(rule.reference),
      nearest = (p: GeoPoint, line: GeoPoint[]) =>
        Math.min(
          ...line.slice(1).map((b, i) => segmentDistance(p, line[i], b)),
        );
    const fromRef = ref.map((p) => nearest(p, user)),
      fromUser = user.map((p) => nearest(p, ref));
    const endpoints =
      geoDistance(ll(c.points[0]), ll(rule.reference[0])) * EARTH_KM < 20 &&
      geoDistance(ll(c.points.at(-1)!), ll(rule.reference.at(-1)!)) * EARTH_KM <
        20;
    const lengthRatio = lineLength(user) / lineLength(ref);
    tier =
      endpoints && lengthRatio >= 0.9 && lengthRatio <= 1.6
        ? rule.tiers.findIndex(
            (t) =>
              fromRef.filter((d) => d <= t.referenceKm).length / ref.length >=
                t.coverage &&
              fromUser.filter((d) => d <= t.strokeKm).length / user.length >=
                t.coverage,
          )
        : -1;
    metrics = [
      {
        label: "River followed",
        value:
          (fromRef.filter((d) => d <= rule.tiers[0].referenceKm).length /
            ref.length) *
          100,
        unit: "%",
      },
      {
        label: "Mean deviation",
        value: fromUser.reduce((a, b) => a + b, 0) / fromUser.length,
        unit: "km",
      },
    ];
  } else if (
    rule.type === "population-coverage-area-budget" &&
    c.kind === "polygon"
  ) {
    const shape = polygon(c.points);
    let pop = 0,
      area = 0,
      totalPop = 0,
      totalArea = 0;
    for (const [i, count, land] of rule.grid.cells) {
      totalPop += count;
      totalArea += land;
      if (geoContains(shape, ll(gridPoint(rule.grid, i)))) {
        pop += count;
        area += land;
      }
    }
    const population = (pop / totalPop) * 100,
      land = (area / totalArea) * 100;
    tier = rule.tiers.findIndex(
      (t) => population + 1e-7 >= t.population && land <= t.area + 1e-7,
    );
    metrics = [
      { label: "Modeled residents enclosed", value: population, unit: "%" },
      { label: "Country land enclosed", value: land, unit: "%" },
    ];
  } else if (rule.type === "population-balance" && c.kind === "cut") {
    let pop = 0,
      area = 0,
      totalPop = 0,
      totalArea = 0;
    for (const [i, count, land] of rule.grid.cells) {
      totalPop += count;
      totalArea += land;
      if (cutSide(c.points, gridPoint(rule.grid, i))) {
        pop += count;
        area += land;
      }
    }
    const share = (pop / totalPop) * 100,
      land = (area / totalArea) * 100;
    tier = rule.tiers.findIndex((t) => Math.abs(share - 50) <= t.error + 1e-7);
    metrics = [
      { label: "Side A · modeled residents", value: share, unit: "%" },
      { label: "Side B · modeled residents", value: 100 - share, unit: "%" },
      { label: "Side A · land", value: land, unit: "%" },
      { label: "Side B · land", value: 100 - land, unit: "%" },
    ];
  }
  return {
    version: 1,
    kind: c.kind,
    sourceRevision:
      "grid" in rule
        ? rule.grid.revision
        : rule.type === "line-following" || rule.type === "island-coverage-max"
          ? rule.sourceRevision
          : `points-v1:${rule.candidates.map((p) => `${p.id}:${p.lat}:${p.lng}`).join("|")}`,
    tier: tier < 0 ? null : tier,
    feedback: tier < 0 ? "A different pattern." : rule.tiers[tier].feedback,
    metrics,
    ...(containedIds ? { containedIds } : {}),
  };
}
export function reviewedConstruction(
  q: Question,
  response: Response & {
    answers?: { roundId: string; constructionResult?: ConstructionResult }[];
    constructionResult?: ConstructionResult;
  },
) {
  return (
    response.answers?.find((a) => a.roundId === q.id)?.constructionResult ??
    response.constructionResult
  );
}
export function validateConstructionQuestion(
  q: Question,
  fail: (message: string) => never,
) {
  const r = constructionRule(q);
  if (!r) return;
  if (
    q.constructionInitial &&
    (!validConstruction(q.constructionInitial) ||
      q.constructionInitial.kind !== constructionKind(r))
  )
    fail("invalid initial construction");
  if (
    q.mode !== `geo-${constructionKind(r)}` ||
    q.count !== 1 ||
    q.commitment !== "submit" ||
    q.selection.type !== "none"
  )
    fail("construction mode and rule disagree");
  if (r.tiers.length !== 3 || r.tiers.some((t) => !t.feedback.trim()))
    fail("construction needs three quality bands");
  if ("grid" in r) {
    const g = r.grid;
    if (
      !g.id ||
      !g.revision ||
      !g.sourceUrl ||
      !g.cells.length ||
      !Number.isInteger(g.columns) ||
      !Number.isInteger(g.rows) ||
      g.columns < 1 ||
      g.rows < 1 ||
      ![g.west, g.south, g.east, g.north].every(Number.isFinite) ||
      g.west >= g.east ||
      g.east - g.west > 360 ||
      g.south >= g.north ||
      g.south < -90 ||
      g.north > 90 ||
      new Set(g.cells.map((c) => c[0])).size !== g.cells.length ||
      g.cells.some(
        ([i, value, area]) =>
          !Number.isInteger(i) ||
          i < 0 ||
          i >= g.columns * g.rows ||
          !Number.isFinite(value) ||
          value < 0 ||
          !Number.isFinite(area) ||
          area <= 0,
      )
    )
      fail("invalid frozen construction grid");
  }
  if (r.type === "raster-overlap" && r.grid.cells.some(([, v]) => v > 1))
    fail("dune fractions must be between zero and one");
  if ("grid" in r && r.grid.cells.reduce((n, [, v]) => n + v, 0) <= 0)
    fail("construction grid has no target mass");
  if (
    r.type === "raster-overlap" &&
    (!Number.isFinite(r.brushRadiusKm) ||
      r.brushRadiusKm < 1 ||
      r.brushRadiusKm > 500 ||
      r.tiers.some(
        (t, i) =>
          !Number.isFinite(t.f1) ||
          !Number.isFinite(t.precision) ||
          t.f1 <= 0 ||
          t.f1 > 1 ||
          t.precision <= 0 ||
          t.precision > 1 ||
          (i > 0 && t.f1 >= r.tiers[i - 1].f1),
      ))
  )
    fail("invalid brush thresholds");
  if (
    (r.type === "point-coverage-max" || r.type === "island-coverage-max") &&
    (!Number.isFinite(r.radiusKm) ||
      r.radiusKm <= 0 ||
      r.radiusKm > Math.PI * EARTH_KM ||
      r.candidates.length < 2 ||
      new Set(r.candidates.map((p) => p.id)).size !== r.candidates.length ||
      (r.type === "point-coverage-max"
        ? r.candidates.some((p) => !validGeoPoint(p))
        : !r.sourceRevision ||
          r.radiusKm >= (Math.PI * EARTH_KM) / 2 ||
          r.candidates.some(
            (island) =>
              !validGeoPoint(island.focus) ||
              island.boundary.length < 3 ||
              island.boundary.some((p) => !validGeoPoint(p)),
          )) ||
      !Number.isInteger(r.maximum) ||
      r.maximum < 1 ||
      r.maximum > r.candidates.length ||
      (r.type === "point-coverage-max" &&
        r.pointLabel !== undefined &&
        (typeof r.pointLabel !== "string" || !r.pointLabel.trim())) ||
      r.tiers[0].count !== r.maximum ||
      r.tiers.some(
        (t, i) =>
          !Number.isInteger(t.count) ||
          t.count < 1 ||
          (i > 0 && t.count >= r.tiers[i - 1].count),
      ))
  )
    fail("invalid circle coverage benchmark");
  if (
    r.type === "line-following" &&
    (r.reference.length < 2 ||
      !r.reference.every(validGeoPoint) ||
      !r.sourceRevision ||
      r.tiers.some(
        (t) =>
          ![t.coverage, t.referenceKm, t.strokeKm].every(Number.isFinite) ||
          t.coverage <= 0 ||
          t.coverage > 1 ||
          t.referenceKm <= 0 ||
          t.strokeKm <= 0,
      ))
  )
    fail("invalid reviewed trace");
  if (
    r.type === "population-coverage-area-budget" &&
    (!Number.isInteger(r.minVertices) ||
      !Number.isInteger(r.maxVertices) ||
      r.minVertices < 3 ||
      r.maxVertices < r.minVertices ||
      r.maxVertices > 20 ||
      r.tiers.some(
        (t) =>
          ![t.population, t.area].every(Number.isFinite) ||
          t.population <= 0 ||
          t.population > 100 ||
          t.area <= 0 ||
          t.area > 100,
      ))
  )
    fail("invalid population polygon");
  if (
    r.type === "population-balance" &&
    (r.boundary.length < 4 ||
      !r.boundary.every(validGeoPoint) ||
      r.tiers.some(
        (t, i) =>
          !Number.isFinite(t.error) ||
          t.error <= 0 ||
          t.error >= 50 ||
          (i > 0 && t.error <= r.tiers[i - 1].error),
      ))
  )
    fail("invalid population cut");
}
