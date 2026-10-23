import type { Question } from "./questionContracts";
import type { Construction } from "./constructionTypes";
import {
  constructionRule,
  constructionReady,
  evaluateConstruction,
  gridPoint,
} from "./construction";
const response = (construction: Construction) => ({
  selectedIds: [],
  text: "",
  ordered: [],
  construction,
});
/** Deterministic real submissions for structural audits, never human calibration. */
export function constructionAuditSample(
  q: Question,
  correct: boolean,
): Construction | undefined {
  const r = constructionRule(q);
  if (!r) return;
  let c: Construction | undefined;
  if (correct && q.constructionExample) c = q.constructionExample;
  else if (r.type === "labeled-region-pin-set")
    c = {
      version: 1,
      kind: "pins",
      pins: Object.fromEntries(
        r.slots.map((s) => [s.id, correct ? s.example : { lat: 0, lng: -140 }]),
      ),
    };
  else if (r.type === "line-following")
    c = {
      version: 1,
      kind: "trace",
      points: correct ? r.reference : [...r.reference].reverse(),
    };
  else if (r.type === "point-coverage-max" || r.type === "island-coverage-max")
    c = {
      version: 1,
      kind: "circle",
      center: {
        lat: -(r.type === "island-coverage-max"
          ? r.candidates[0].focus.lat
          : r.candidates[0].lat),
        lng:
          (((r.type === "island-coverage-max"
            ? r.candidates[0].focus.lng
            : r.candidates[0].lng) +
            540) %
            360) -
          180,
      },
    };
  else if (r.type === "population-coverage-area-budget")
    c = {
      version: 1,
      kind: "polygon",
      points: [
        { lat: r.grid.south, lng: r.grid.west },
        { lat: r.grid.south, lng: r.grid.east },
        { lat: r.grid.north, lng: r.grid.east },
        { lat: r.grid.north, lng: r.grid.west },
      ],
    };
  else if (r.type === "population-balance") {
    // Search boundary-to-boundary cuts; validate the submitted geometry and actual grade.
    for (let a = 0; a < 12; a++)
      for (let b = a + 1; b < 12; b++) {
        const candidate: Construction = {
          version: 1,
          kind: "cut",
          points: [
            r.boundary[Math.floor((a * (r.boundary.length - 1)) / 12)],
            r.boundary[Math.floor((b * (r.boundary.length - 1)) / 12)],
          ],
        };
        if (
          constructionReady(q, response(candidate)) &&
          evaluateConstruction(q, response(candidate))?.tier === null
        )
          return candidate;
      }
  } else if (r.type === "raster-overlap") {
    if (!correct) {
      const cell = r.grid.cells.find(([, value]) => value === 0);
      if (cell)
        c = {
          version: 1,
          kind: "brush",
          strokes: [
            {
              points: [gridPoint(r.grid, cell[0])],
              radiusKm: r.brushRadiusKm,
              erase: false,
            },
          ],
        };
    } else {
      const g = r.grid,
        positive = new Set(g.cells.filter(([, v]) => v > 0).map(([i]) => i));
      const strokes: Extract<Construction, { kind: "brush" }>["strokes"] = [];
      const rowStep = Math.max(
        1,
        Math.floor(
          (r.brushRadiusKm / 111 / ((g.north - g.south) / g.rows)) * 1.5,
        ),
      );
      for (let row = Math.min(2, g.rows - 1); row < g.rows; row += rowStep) {
        let points = [] as { lat: number; lng: number }[];
        for (let col = 1; col < g.columns; col += 3) {
          const i = row * g.columns + col;
          if (positive.has(i)) points.push(gridPoint(g, i));
          else if (points.length) {
            strokes.push({ points, radiusKm: r.brushRadiusKm, erase: false });
            points = [];
          }
        }
        if (points.length)
          strokes.push({ points, radiusKm: r.brushRadiusKm, erase: false });
      }
      c = { version: 1, kind: "brush", strokes };
    }
  }
  return c &&
    constructionReady(q, response(c)) &&
    (evaluateConstruction(q, response(c))?.tier !== null) === correct
    ? c
    : undefined;
}
