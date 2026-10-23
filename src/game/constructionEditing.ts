import { inConstructionArea } from "./constructionInteraction";
import { geoDistance } from "d3-geo";
import type { Question } from "./questionContracts";
import type { Construction } from "./constructionTypes";
import {
  constructionRule,
  snapToBoundary,
  brushSize,
  segmentDistance,
} from "./construction";
import type { GeoPoint } from "./geodesic";

/** One geographic edit path for globe gestures and accessible coordinate entry. */
export function editConstruction(
  q: Question,
  current: Construction | undefined,
  point: GeoPoint,
  begin: boolean,
  handle?: number,
  erase = false,
  radiusKm?: number,
): Construction | undefined {
  if (!inConstructionArea(q, point)) return current;
  const rule = constructionRule(q);
  if (!rule) return current;
  if (rule.type === "labeled-region-pin-set") return current;
  const p = {
    lat: Math.max(-90, Math.min(90, point.lat)),
    lng: ((point.lng + 540) % 360) - 180,
  };
  if (rule.type === "point-coverage-max" || rule.type === "island-coverage-max")
    return { version: 1, kind: "circle", center: p };
  if (rule.type === "raster-overlap") {
    const c =
      current?.kind === "brush"
        ? current
        : { version: 1 as const, kind: "brush" as const, strokes: [] };
    if (c.strokes.reduce((n, s) => n + s.points.length, 0) >= 4096)
      return current;
    const strokes = [...c.strokes];
    if (begin || !strokes.length) {
      if (strokes.length >= 128) return current;
      strokes.push({ points: [p], radiusKm: brushSize(rule, radiusKm), erase });
    } else {
      const stroke = strokes.at(-1)!;
      if (
        geoDistance(
          [stroke.points.at(-1)!.lng, stroke.points.at(-1)!.lat],
          [p.lng, p.lat],
        ) *
          6371.0088 <
        stroke.radiusKm / 8
      )
        return current;
      strokes[strokes.length - 1] = {
        ...stroke,
        points: [...stroke.points, p],
      };
    }
    return { version: 1, kind: "brush", strokes };
  }
  if (rule.type === "population-balance") {
    const points = current?.kind === "cut" ? [...current.points] : [];
    const snapped = snapToBoundary(p, rule.boundary);
    if (handle !== undefined) points[handle] = snapped;
    else if (points.length < 2) {
      if (begin) points.push(snapped);
      else points[points.length - 1] = snapped;
    } else {
      const distances = points.map((a) =>
        geoDistance([a.lng, a.lat], [p.lng, p.lat]),
      );
      points[distances[0] < distances[1] ? 0 : 1] = snapped;
    }
    return { version: 1, kind: "cut", points };
  }
  if (rule.type === "population-coverage-area-budget") {
    const points = current?.kind === "polygon" ? [...current.points] : [];
    if (handle !== undefined) points[handle] = p;
    else if (begin) {
      if (points.length >= rule.maxVertices) return current;
      points.push(p);
    } else if (points.length) points[points.length - 1] = p;
    return { version: 1, kind: "polygon", points };
  }
  const points =
    current?.kind === "trace"
      ? [...current.points]
      : [rule.reference[0], rule.reference.at(-1)!];
  if (handle !== undefined) {
    if (handle > 0 && handle < points.length - 1) points[handle] = p;
  } else if (points.length < 400) {
    const previous = points.at(-2)!;
    if (
      begin ||
      geoDistance([previous.lng, previous.lat], [p.lng, p.lat]) * 6371.0088 > 8
    )
      points.splice(points.length - 1, 0, p);
  }
  return { version: 1, kind: "trace", points };
}
export function undoConstruction(
  c: Construction | undefined,
): Construction | undefined {
  if (!c || c.kind === "circle") return undefined;
  if (c.kind === "brush") return { ...c, strokes: c.strokes.slice(0, -1) };
  if (c.kind === "pins")
    return {
      ...c,
      pins: Object.fromEntries(Object.entries(c.pins).slice(0, -1)),
    };
  if (c.kind === "trace")
    return c.points.length > 2
      ? { ...c, points: [...c.points.slice(0, -2), c.points.at(-1)!] }
      : undefined;
  return { ...c, points: c.points.slice(0, -1) };
}

/** Keep river bends while removing redundant freehand samples; endpoints stay fixed. */
export function simplifyTrace(
  c: Construction | undefined,
  toleranceKm = 2,
): Construction | undefined {
  if (c?.kind !== "trace" || c.points.length < 4) return c;
  const keep = new Set([0, c.points.length - 1]),
    stack = [[0, c.points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let distance = toleranceKm,
      index = -1;
    for (let i = a + 1; i < b; i++) {
      const d = segmentDistance(c.points[i], c.points[a], c.points[b]);
      if (d > distance) {
        distance = d;
        index = i;
      }
    }
    if (index >= 0) {
      keep.add(index);
      stack.push([a, index], [index, b]);
    }
  }
  return {
    ...c,
    points: [...keep].sort((a, b) => a - b).map((i) => c.points[i]),
  };
}
