import { geoArea, geoDistance } from "d3-geo";
import roster from "../game/data/un-members.v1.json";
import { CAPITALS } from "../game/quizData";
import { buildBorderGraph } from "../game/reasoning";
import type { BorderGraph } from "../game/reasoning";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../geography/types";
import { isRecord } from "../app/storage";
import type { BorderMinigame, NeighborPair } from "./sharedNeighbors";
import type { MissingBorderPair } from "./missingBorders";

export const MINIGAME_REGIONS = {
  all: "All continents",
  AF: "Africa",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  SA: "South America",
  OC: "Oceania",
} as const;
export const PINPOINT_CATEGORIES = {
  cities: "Major cities",
  landmarks: "Landmarks",
  countries: "Countries",
  regions: "US states",
} as const;
export type PinpointCategory = keyof typeof PINPOINT_CATEGORIES;
export const defaultCategories: PinpointCategory[] = ["cities", "landmarks"];

export interface MinigameSettings {
  includeTerritories: boolean;
  excludeAdjacentClues: boolean;
  excludedCountries: string[];
  region: keyof typeof MINIGAME_REGIONS;
  framing: "regional" | "wide";
  excludeSmallCountries?: boolean;
  categories?: PinpointCategory[];
  showBorders?: boolean;
}
export const defaultMinigameSettings: MinigameSettings = {
  includeTerritories: true,
  excludeAdjacentClues: false,
  excludedCountries: [],
  region: "all",
  framing: "wide",
  excludeSmallCountries: true,
  categories: defaultCategories,
  showBorders: false,
};
const countries = new Set(roster.members.map((country) => country.id));
export function validMinigameSettings(
  value: unknown,
): value is MinigameSettings {
  return (
    isRecord(value) &&
    (value.showBorders === undefined ||
      typeof value.showBorders === "boolean") &&
    (value.excludeSmallCountries === undefined ||
      typeof value.excludeSmallCountries === "boolean") &&
    (value.categories === undefined ||
      (Array.isArray(value.categories) &&
        value.categories.every(
          (c) => typeof c === "string" && Object.hasOwn(PINPOINT_CATEGORIES, c),
        ) &&
        new Set(value.categories).size === value.categories.length)) &&
    typeof value.includeTerritories === "boolean" &&
    typeof value.excludeAdjacentClues === "boolean" &&
    Array.isArray(value.excludedCountries) &&
    value.excludedCountries.every(
      (id) => typeof id === "string" && countries.has(id),
    ) &&
    new Set(value.excludedCountries).size === value.excludedCountries.length &&
    typeof value.region === "string" &&
    Object.hasOwn(MINIGAME_REGIONS, value.region) &&
    (value.framing === "regional" || value.framing === "wide")
  );
}
export function sameMinigameSettings(
  a: MinigameSettings,
  b: MinigameSettings,
  kind?: BorderMinigame,
) {
  if (kind === "border-run")
    return (
      (a.showBorders ?? false) === (b.showBorders ?? false) &&
      [...a.excludedCountries].sort().join("|") ===
        [...b.excludedCountries].sort().join("|")
    );
  if (kind === "pinpoint")
    return (
      [...(a.categories ?? defaultCategories)].sort().join("|") ===
      [...(b.categories ?? defaultCategories)].sort().join("|")
    );
  return (
    (kind === "missing-borders" ||
      (a.includeTerritories === b.includeTerritories &&
        a.excludeAdjacentClues === b.excludeAdjacentClues)) &&
    (kind === "shared-neighbors" ||
      (a.region === b.region &&
        a.framing === b.framing &&
        (a.excludeSmallCountries ?? true) ===
          (b.excludeSmallCountries ?? true))) &&
    [...a.excludedCountries].sort().join("|") ===
      [...b.excludedCountries].sort().join("|")
  );
}

/** Compare only the options that affect this game's rules, including legacy defaults. */
export const usesDefaultMinigameRules = (
  settings: MinigameSettings,
  kind: BorderMinigame,
) => sameMinigameSettings(settings, defaultMinigameSettings, kind);

/** Keep regular archipelagic borders; otherwise use the largest land component.
 * This removes exclave/overseas-only relationships without changing grading geometry. */
const mainlandGraphs = new WeakMap<RegionFeature[], BorderGraph>();
export function mainlandBorderGraph(regions: RegionFeature[]): BorderGraph {
  const cached = mainlandGraphs.get(regions);
  if (cached) return cached;
  const graph = buildBorderGraph(
    regions.map((region) => {
      if (
        region.geometry.type === "Polygon" ||
        ["wurl:IDN", "wurl:MYS"].includes(region.id)
      )
        return region;
      const polygons = region.geometry.coordinates;
      let main = polygons[0],
        largest = -Infinity;
      for (const polygon of polygons) {
        const area = geoArea(
          sphericalGeometry({ type: "Polygon", coordinates: polygon }),
        );
        if (area > largest) {
          main = polygon;
          largest = area;
        }
      }
      return {
        ...region,
        geometry: { type: "Polygon" as const, coordinates: main },
      };
    }),
  );
  mainlandGraphs.set(regions, graph);
  return graph;
}

const borderRegions = new WeakMap<MissingBorderPair, string>();
function hasBorderPoints(pair: NeighborPair): pair is MissingBorderPair {
  return (
    "borderPoints" in pair &&
    Array.isArray(pair.borderPoints) &&
    pair.borderPoints.length > 0
  );
}
export function missingBorderContinent(pair: MissingBorderPair): string {
  const cached = borderRegions.get(pair);
  if (cached) return cached;
  // Locate the physical boundary, so French Guiana stays in South America.
  const point = pair.borderPoints[Math.floor(pair.borderPoints.length / 2)];
  let closest = CAPITALS[0],
    distance = Infinity;
  for (const capital of CAPITALS) {
    const next = geoDistance(point, [capital.lng, capital.lat]);
    if (next < distance) {
      closest = capital;
      distance = next;
    }
  }
  borderRegions.set(pair, closest.continent);
  return closest.continent;
}

export function filterMinigamePairs<T extends NeighborPair>(
  pairs: T[],
  settings: MinigameSettings,
  graph: BorderGraph,
  kind: BorderMinigame,
  smallCountries: ReadonlySet<string> = new Set(),
): T[] {
  const excluded = new Set(settings.excludedCountries);
  return pairs.filter((pair) => {
    if (pair.countries.some((id) => excluded.has(id))) return false;
    if (kind === "shared-neighbors")
      return (
        !excluded.has(pair.answer) &&
        (!settings.excludeAdjacentClues ||
          !graph.get(pair.countries[0])?.has(pair.countries[1]))
      );
    if (kind === "border-run") return true;
    if (
      (settings.excludeSmallCountries ?? true) &&
      pair.countries.some((id) => smallCountries.has(id))
    )
      return false;
    return (
      settings.region === "all" ||
      (hasBorderPoints(pair) &&
        missingBorderContinent(pair) === settings.region)
    );
  });
}

/** A size rule, not a political classification. Canonical area includes all components. */
export function smallCountryIds(regions: RegionFeature[]): Set<string> {
  return new Set(
    regions
      .filter(
        (r) => geoArea(sphericalGeometry(r.geometry)) * 6371.0088 ** 2 < 2500,
      )
      .map((r) => r.id),
  );
}
