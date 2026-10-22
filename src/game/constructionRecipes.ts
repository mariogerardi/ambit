import { definePresentation, defineQuestion } from "./questionBuilder";
import type { Question } from "./questionContracts";
import type { RegionFeature } from "../geography/types";
import type { ConstructionIsland } from "./constructionTypes";
import type { ConstructionGrid } from "./constructionTypes";

// Small synthetic fixtures demonstrate contracts, not claims about real geography.
const grid: ConstructionGrid = {
  id: "recipe:synthetic",
  label: "Synthetic four-by-four teaching grid",
  sourceUrl: "https://en.wikipedia.org/wiki/Equal-area_projection",
  revision: "synthetic-v1",
  west: -2,
  south: -2,
  east: 2,
  north: 2,
  columns: 4,
  rows: 4,
  equalArea: true,
  cells: Array.from({ length: 16 }, (_, i) => [i, i >= 12 ? 100 : 0, 1]),
};
const base = definePresentation({
  label: "Recipe",
  topic: "construction example",
  instruction: "",
  failure: "feedback",
  focus: { lat: 0, lng: 0, altitude: 0.3 },
  source: {
    name: "Synthetic authoring fixture",
    url: grid.sourceUrl,
    reviewedOn: "2026-10-20",
  },
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: { borders: false, hoverFeedback: false, muteOthers: true },
});
const guidance = {
  hint: "This is a synthetic control fixture.",
  assist: {
    text: "The source grid is a four-by-four square, with population in its northern row.",
  },
};
const boundary = [
  { lat: -2, lng: -2 },
  { lat: -2, lng: 2 },
  { lat: 2, lng: 2 },
  { lat: 2, lng: -2 },
  { lat: -2, lng: -2 },
];
const islands: (RegionFeature & ConstructionIsland)[] = [-1, 0, 1].map(
  (lng, i) => {
    const boundary = [
      { lat: -0.1, lng: lng - 0.1 },
      { lat: 0.1, lng: lng - 0.1 },
      { lat: 0.1, lng: lng + 0.1 },
      { lat: -0.1, lng: lng + 0.1 },
    ];
    const ring = [...boundary, boundary[0]].map((p) => [p.lng, p.lat]);
    return {
      id: `recipe-island:${i}`,
      name: `Island ${i + 1}`,
      level: "ADM0",
      sourceId: "synthetic",
      focus: { lat: 0, lng },
      boundary,
      geometry: { type: "Polygon", coordinates: [ring] },
    };
  },
);
export const CONSTRUCTION_RECIPES: Question[] = [
  defineQuestion({
    ...base,
    guidance,
    id: "recipe:geo-brush",
    title: "Brush example",
    prompt: "Paint the northern row of this synthetic grid.",
    explanation:
      "Ordered geographic paint and erase strokes are compared with an explicit target raster.",
    mode: "geo-brush",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: {
      type: "raster-overlap",
      grid: {
        ...grid,
        cells: grid.cells.map(([i, , area]) => [i, i >= 12 ? 1 : 0, area]),
      },
      brushRadiusKm: 70,
      tiers: [
        { f1: 0.9, precision: 0.9, feedback: "Full overlap." },
        { f1: 0.7, precision: 0.7, feedback: "Close overlap." },
        { f1: 0.4, precision: 0.5, feedback: "Some overlap." },
      ],
    },
    constructionExample: {
      version: 1,
      kind: "brush",
      strokes: [
        {
          points: [
            { lat: 1.5, lng: -1.5 },
            { lat: 1.5, lng: 1.5 },
          ],
          radiusKm: 70,
          erase: false,
        },
      ],
    },
  }),
  defineQuestion({
    ...base,
    guidance,
    id: "recipe:geo-circle",
    title: "Circle example",
    prompt: "Fit the three synthetic markers into a 200 km circle.",
    explanation:
      "Count only the authored candidates, using geodesic distance and an independently supplied maximum.",
    mode: "geo-circle",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: {
      type: "point-coverage-max",
      radiusKm: 200,
      maximum: 3,
      candidates: [-1, 0, 1].map((lng, i) => ({
        id: `recipe-point:${i}`,
        name: `Example ${i + 1}`,
        kind: "city",
        sourceId: "synthetic",
        lat: 0,
        lng,
      })),
      tiers: [
        { count: 3, feedback: "Three enclosed." },
        { count: 2, feedback: "Two enclosed." },
        { count: 1, feedback: "One enclosed." },
      ],
    },
    constructionExample: {
      version: 1,
      kind: "circle",
      center: { lat: 0, lng: 0 },
    },
  }),
  defineQuestion({
    ...base,
    guidance,
    id: "recipe:geo-trace",
    title: "Trace example",
    prompt: "Follow the bent synthetic reference corridor.",
    explanation:
      "The grader compares both reference coverage and off-corridor stroke length; the source line is withheld until reveal.",
    mode: "geo-trace",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: {
      type: "line-following",
      reference: [
        { lat: -1, lng: -1 },
        { lat: 1, lng: 0 },
        { lat: -1, lng: 1 },
      ],
      sourceRevision: "synthetic-v1",
      tiers: [
        {
          coverage: 0.9,
          referenceKm: 10,
          strokeKm: 10,
          feedback: "Followed it.",
        },
        {
          coverage: 0.8,
          referenceKm: 20,
          strokeKm: 20,
          feedback: "Close trace.",
        },
        { coverage: 0.7, referenceKm: 30, strokeKm: 30, feedback: "A trace." },
      ],
    },
    constructionExample: {
      version: 1,
      kind: "trace",
      points: [
        { lat: -1, lng: -1 },
        { lat: 1, lng: 0 },
        { lat: -1, lng: 1 },
      ],
    },
  }),
  defineQuestion({
    ...base,
    guidance,
    id: "recipe:geo-polygon",
    title: "Polygon example",
    prompt: "Enclose the synthetic population in at most 30% of its grid land.",
    explanation:
      "Population and area are summed only inside the frozen source footprint, independently of the display polygon.",
    mode: "geo-polygon",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: {
      type: "population-coverage-area-budget",
      grid,
      minVertices: 4,
      maxVertices: 8,
      tiers: [
        { population: 75, area: 30, feedback: "Compact coverage." },
        { population: 65, area: 40, feedback: "Close coverage." },
        { population: 55, area: 50, feedback: "Some coverage." },
      ],
    },
    constructionExample: {
      version: 1,
      kind: "polygon",
      points: [
        { lat: 1, lng: -2.5 },
        { lat: 1, lng: 2.5 },
        { lat: 2.5, lng: 2.5 },
        { lat: 2.5, lng: -2.5 },
      ],
    },
  }),
  defineQuestion({
    ...base,
    guidance,
    id: "recipe:geo-cut",
    title: "Cut example",
    prompt:
      "Bisect the synthetic population with one boundary-to-boundary line.",
    explanation:
      "Either orientation is acceptable when the two half-planes contain balanced population totals.",
    mode: "geo-cut",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: {
      type: "population-balance",
      grid,
      boundary,
      tiers: [
        { error: 5, feedback: "Balanced." },
        { error: 10, feedback: "Close balance." },
        { error: 18, feedback: "Two halves." },
      ],
    },
    constructionExample: {
      version: 1,
      kind: "cut",
      points: [
        { lat: -2.001218097652768, lng: 0 },
        { lat: 2.001218097652768, lng: 0 },
      ],
    },
  }),
  defineQuestion({
    ...base,
    guidance,
    id: "recipe:geo-circle-islands",
    title: "Whole-island circle",
    prompt: "Enclose all three islands, including every shore.",
    explanation:
      "Canonical island boundaries determine full enclosure; labels and display shapes do not grade it.",
    mode: "geo-circle",
    count: 1,
    selection: { type: "none" },
    commitment: "submit",
    rule: {
      type: "island-coverage-max",
      radiusKm: 200,
      maximum: 3,
      sourceRevision: "synthetic-islands-v1",
      candidates: islands,
      tiers: [
        { count: 3, feedback: "All shores within." },
        { count: 2, feedback: "Two together." },
        { count: 1, feedback: "One within reach." },
      ],
    },
    importedRegions: islands,
    scenes: {
      play: { contextIds: islands.map((i) => i.id) },
      reveal: { contextIds: islands.map((i) => i.id) },
    },
    constructionExample: {
      version: 1,
      kind: "circle",
      center: { lat: 0, lng: 0 },
    },
  }),
];
