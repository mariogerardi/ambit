import {
  currentConstruction,
  clippedConstructionPaths,
} from "./constructionInteraction";
import { geoContains } from "d3-geo";
import type { Question, Response } from "./questionContracts";
import type {
  Construction,
  ConstructionGrid,
  GridShape,
} from "./constructionTypes";
import type { MapOverlay, PlaceFeature } from "../geography/types";
import {
  constructionRule,
  paintedCells,
  gridPoint,
  cutSide,
  reviewedConstruction,
  resample,
  segmentDistance,
} from "./construction";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";

const brushDisplays = new WeakMap<object, ConstructionGrid>();
function brushDisplayGrid(q: Question, fallback: ConstructionGrid) {
  const area = q.constructionArea;
  if (!area?.mask) return fallback;
  const cached = brushDisplays.get(area);
  if (cached) return cached;
  const [west, south, east, north] = area.mask.bounds,
    columns = Math.ceil((east - west) / 0.2),
    rows = Math.ceil((north - south) / 0.2);
  const grid = {
    ...fallback,
    west,
    south,
    east,
    north,
    columns,
    rows,
    equalArea: false,
    cells: Array.from(
      { length: columns * rows },
      (_, i) => [i, 0, 1] as [number, number, number],
    ),
  };
  brushDisplays.set(area, grid);
  return grid;
}
const coords = (points: { lat: number; lng: number }[]) =>
  points.map((p) => [p.lng, p.lat]);
export function constructionScene(
  q: Question,
  response: Response & {
    answers?: {
      roundId: string;
      constructionResult?: Response["constructionResult"];
    }[];
  },
  reveal: boolean,
  completion = false,
  showExample = false,
): { overlays: MapOverlay[]; places: PlaceFeature[] } {
  const rule = constructionRule(q),
    c = currentConstruction(q, response);
  if (!rule) return { overlays: [], places: [] };
  const result = reviewedConstruction(q, response),
    state = completion
      ? "visited"
      : reveal
        ? result?.tier === null
          ? "incorrect"
          : "correct"
        : "selected";
  const overlays: MapOverlay[] = [],
    places: PlaceFeature[] = [];
  const cells = (
    suffix: string,
    grid: GridShape,
    indices: number[],
    visualState: Extract<MapOverlay, { type: "cells" }>["visualState"],
    opacity = q.mode === "geo-brush" ? 0.72 : 0.38,
  ) => {
    if (indices.length)
      overlays.push({
        id: `construction:${q.id}:${suffix}`,
        type: "cells",
        grid,
        indices,
        mask: q.constructionArea?.mask,
        prominent: q.mode === "geo-brush",
        visualState,
        opacity,
      });
  };
  if (c?.kind === "brush" && rule.type === "raster-overlap") {
    const displayGrid = brushDisplayGrid(q, rule.grid),
      displayPaint = paintedCells(displayGrid, c);
    if (reveal) {
      const paint = paintedCells(rule.grid, c);
      cells(
        "submitted-paint",
        displayGrid,
        [...displayPaint],
        completion ? "visited" : "selected",
        0.35,
      );
      const positive = new Set(
        rule.grid.cells.filter(([, v]) => v > 0).map(([i]) => i),
      );
      cells(
        "dunes",
        rule.grid,
        [...positive].filter((i) => !paint.has(i)),
        "answer",
        0.6,
      );
      cells(
        "paint-on-dunes",
        rule.grid,
        [...paint].filter((i) => positive.has(i)),
        completion ? "visited" : "correct",
      );
      cells(
        "overspray",
        rule.grid,
        [...paint].filter((i) => !positive.has(i)),
        "incorrect",
      );
    } else cells("paint", displayGrid, [...displayPaint], "selected");
  }
  if (
    c?.kind === "circle" &&
    (rule.type === "point-coverage-max" || rule.type === "island-coverage-max")
  )
    overlays.push({
      id: `construction:${q.id}:circle`,
      type: "circle",
      center: c.center,
      radiusKm: rule.radiusKm,
      shade: true,
      active: true,
      visualState: state,
    });
  if (c && "points" in c && c.points.length > 1) {
    overlays.push({
      id: `construction:${q.id}:outline`,
      type: "path",
      foreground: true,
      coordinates: coords(
        c.kind === "polygon" && c.points.length >= 3
          ? [...c.points, c.points[0]]
          : c.points,
      ),
      visualState: state,
      opacity: 1,
    });
    if (reveal && rule.type === "line-following" && c.kind === "trace") {
      const points = resample(c.points);
      let run: typeof points = [];
      const flush = () => {
        if (run.length > 1)
          overlays.push({
            id: `construction:${q.id}:deviation:${overlays.length}`,
            type: "path",
            foreground: true,
            coordinates: coords(run),
            visualState: "incorrect",
            opacity: 1,
          });
        run = [];
      };
      for (let i = 1; i < points.length; i++) {
        const p = points[i],
          far =
            Math.min(
              ...rule.reference
                .slice(1)
                .map((b, j) => segmentDistance(p, rule.reference[j], b)),
            ) > rule.tiers[0].strokeKm;
        if (far) {
          if (!run.length) run.push(points[i - 1]);
          run.push(p);
        } else flush();
      }
      flush();
    }
    if (
      reveal &&
      rule.type === "population-coverage-area-budget" &&
      c.kind === "polygon" &&
      c.points.length >= 3
    ) {
      const shape = sphericalGeometry({
        type: "Polygon",
        coordinates: [[...coords(c.points), coords([c.points[0]])[0]]],
      });
      cells(
        "enclosed",
        rule.grid,
        rule.grid.cells
          .filter(([i]) => {
            const p = gridPoint(rule.grid, i);
            return geoContains(shape, [p.lng, p.lat]);
          })
          .map(([i]) => i),
        state,
        0.26,
      );
    }
    if (reveal && rule.type === "population-balance" && c.kind === "cut") {
      for (const side of [true, false])
        cells(
          `side-${side ? "a" : "b"}`,
          rule.grid,
          rule.grid.cells
            .filter(
              ([i]) => cutSide(c.points, gridPoint(rule.grid, i)) === side,
            )
            .map(([i]) => i),
          side ? "correct" : "answer",
          0.22,
        );
    }
  }
  if (reveal && rule.type === "line-following")
    overlays.unshift({
      id: `construction:${q.id}:river`,
      type: "path",
      foreground: true,
      coordinates: coords(rule.reference),
      visualState: "answer",
      opacity: 0.85,
    });
  if (rule.type === "point-coverage-max") {
    for (const p of rule.candidates)
      places.push({
        ...p,
        kind: "city",
        displayRole:
          reveal && result?.containedIds?.includes(p.id)
            ? undefined
            : "reference",
        visualState:
          reveal && result?.containedIds?.includes(p.id)
            ? completion
              ? "visited"
              : "correct"
            : "hinted",
        answerTarget: false,
        markerSize: p.markerSize ?? 24,
        labelFlexible: true,
      });
  }
  if (rule.type === "island-coverage-max") {
    for (const island of rule.candidates.filter((i) => !i.labelHidden))
      places.push({
        id: `${island.id}:label`,
        name: island.name,
        ...island.focus,
        kind: "other",
        sourceId: "island-shore",
        priority: island.priority,
        surfaceAligned: true,
        labelScale: 0.8,
        markerHidden: true,
        labelFlexible: false,
        displayRole: "reference",
        visualState: "hinted",
        answerTarget: false,
      });
  }
  if (!reveal && c && rule.type !== "island-coverage-max") {
    constructionHandleEntries(c).forEach(({ point: p, index: i }) =>
      places.push({
        ...p,
        id: `construction-handle:${q.id}:${i}`,
        name: "",
        kind: "pin",
        sourceId: "player",
        visualState: "selected",
        markerSize: 18,
        labelHidden: true,
        answerTarget: false,
        ...(c.kind !== "circle" && c.kind !== "trace"
          ? { markerBadge: String(i + 1) }
          : {}),
      }),
    );
  }
  const example = showExample && reveal ? q.constructionExample : undefined;
  if (
    example?.kind === "circle" &&
    (rule.type === "point-coverage-max" || rule.type === "island-coverage-max")
  )
    overlays.push({
      id: `construction:${q.id}:example`,
      type: "circle",
      center: example.center,
      radiusKm: rule.radiusKm,
      visualState: "answer",
    });
  if (
    example?.kind === "polygon" &&
    q.constructionExampleFootprint &&
    rule.type === "population-coverage-area-budget"
  ) {
    const g = q.constructionExampleFootprint,
      polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
    polys.forEach((p, i) =>
      overlays.push({
        id: `construction:${q.id}:example${i ? `:part:${i}` : ""}`,
        type: "path",
        foreground: true,
        coordinates: p[0],
        visualState: "answer",
        opacity: 1,
      }),
    );
    const shape = sphericalGeometry({
      type: "Polygon",
      coordinates: [
        [...coords(example.points), coords([example.points[0]])[0]],
      ],
    });
    cells(
      "example-fill",
      rule.grid,
      rule.grid.cells
        .filter(([i]) => {
          const p = gridPoint(rule.grid, i);
          return geoContains(shape, [p.lng, p.lat]);
        })
        .map(([i]) => i),
      "answer",
      0.3,
    );
  } else if (example && "points" in example && example.points.length > 1)
    overlays.push({
      id: `construction:${q.id}:example`,
      type: "path",
      foreground: true,
      coordinates: coords(
        example.kind === "polygon"
          ? [...example.points, example.points[0]]
          : example.points,
      ),
      visualState: "answer",
      dashed: true,
      label: "Our solution",
    });
  const clipped = overlays.flatMap((o) => {
    if (
      o.type !== "path" ||
      !q.constructionArea ||
      (q.constructionExampleFootprint && o.id.includes(":example"))
    )
      return [o];
    return clippedConstructionPaths(
      q,
      o.coordinates.map(([lng, lat]) => ({ lng, lat })),
    ).map((points, i) => ({
      ...o,
      id: i ? `${o.id}:part:${i}` : o.id,
      coordinates: coords(points),
    }));
  });
  return { overlays: clipped, places };
}
export function constructionHandleEntries(c: Construction | undefined) {
  if (!c || c.kind === "brush") return [];
  if (c.kind === "circle") return [{ point: c.center, index: 0 }];
  const indices =
    c.kind === "trace"
      ? Array.from(
          { length: Math.min(12, Math.max(0, c.points.length - 2)) },
          (_, i) =>
            1 +
            Math.round(
              (i * (c.points.length - 3)) /
                Math.max(1, Math.min(12, c.points.length - 2) - 1),
            ),
        )
      : c.points.map((_, i) => i);
  return [...new Set(indices)].map((index) => ({
    point: c.points[index],
    index,
  }));
}
