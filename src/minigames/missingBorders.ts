import { geoDistance, geoInterpolate } from "d3-geo";
import roster from "../game/data/un-members.v1.json";
import { defineQuestion } from "../game/questionBuilder";
import { mapSource } from "../game/countryFacts";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { Focus, RegionFeature } from "../geography/types";
import type { NeighborPair } from "./sharedNeighbors";

export interface MissingBorderPair extends NeighborPair {
  borderPoints: [number, number][];
}
const rad = Math.PI / 180;
const location = (focus: Focus): [number, number] => [focus.lng, focus.lat];

/** Use actual shared segments, including borders in overseas components. */
export function missingBorderPairs(
  regions: RegionFeature[],
): MissingBorderPair[] {
  const members = new Set(roster.members.map((r) => r.id));
  const edges = new Map<
    string,
    { ids: string[]; midpoint: [number, number] }
  >();
  for (const region of regions.filter((r) => members.has(r.id))) {
    const polygons =
      region.geometry.type === "Polygon"
        ? [region.geometry.coordinates]
        : region.geometry.coordinates;
    for (const polygon of polygons)
      for (const ring of polygon)
        for (let i = 1; i < ring.length; i++) {
          const a = ring[i - 1].join(","),
            b = ring[i].join(",");
          if (a === b) continue;
          const key = a < b ? `${a}|${b}` : `${b}|${a}`;
          const edge = edges.get(key) ?? {
            ids: [],
            midpoint: geoInterpolate(
              ring[i - 1] as [number, number],
              ring[i] as [number, number],
            )(0.5),
          };
          if (!edge.ids.includes(region.id)) edge.ids.push(region.id);
          edges.set(key, edge);
        }
  }
  const borders = new Map<
    string,
    { countries: [string, string]; points: [number, number][] }
  >();
  for (const edge of edges.values()) {
    if (edge.ids.length !== 2) continue;
    const countries = edge.ids.sort() as [string, string];
    const id = countries.join("|");
    const entry = borders.get(id) ?? { countries, points: [] };
    entry.points.push(edge.midpoint);
    borders.set(id, entry);
  }
  return [...borders]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, border]) => {
      return {
        id,
        countries: border.countries,
        answer: `composite:missing-borders:${id}`,
        borderPoints: border.points.sort(([a, b], [c, d]) => a - c || b - d),
      };
    });
}

/** Resolve regional context for the current map, rather than the entire deck. */
export function missingBorderAnchor(
  pair: MissingBorderPair,
  regions: RegionFeature[],
): Focus {
  // Prefer a boundary component with regional context over an isolated outpost.
  const points = pair.borderPoints;
  let best = points[0],
    bestCount = -1;
  for (
    let i = 0;
    i < points.length;
    i += Math.max(1, Math.floor(points.length / 16))
  ) {
    const point = points[i];
    const count = regions.filter(
      (r) =>
        !pair.countries.includes(r.id) &&
        geoDistance(point, location(r.focus)) < 40 * rad,
    ).length;
    if (count > bestCount) {
      best = point;
      bestCount = count;
    }
  }
  return { lng: best[0], lat: best[1] };
}

/** Seeded regional views: the erased boundary stays 12–24° away from the center. */
export function missingBorderFocus(
  pair: MissingBorderPair,
  regions: RegionFeature[],
  seed: number,
): Focus {
  return regionalFocus(pair, regions, seed, missingBorderAnchor(pair, regions));
}

function regionalFocus(
  pair: MissingBorderPair,
  regions: RegionFeature[],
  seed: number,
  anchor: Focus,
): Focus {
  let state = seed >>> 0;
  for (const char of pair.id)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const lat = anchor.lat * rad,
    lng = anchor.lng * rad;
  let best: Focus = anchor,
    bestCount = -1;
  for (let i = 0; i < 32; i++) {
    const bearing = random() * Math.PI * 2,
      distance = (12 + random() * 12) * rad;
    const y = Math.asin(
      Math.sin(lat) * Math.cos(distance) +
        Math.cos(lat) * Math.sin(distance) * Math.cos(bearing),
    );
    const x =
      lng +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance) * Math.cos(lat),
        Math.cos(distance) - Math.sin(lat) * Math.sin(y),
      );
    const focus = {
      lat: y / rad,
      lng: ((x / rad + 540) % 360) - 180,
      altitude: 1.25,
    };
    const count = regions.filter(
      (r) =>
        !pair.countries.includes(r.id) &&
        geoDistance(location(focus), location(r.focus)) < 42 * rad,
    ).length;
    if (count >= 6) return focus;
    if (count > bestCount) {
      best = focus;
      bestCount = count;
    }
  }
  return best;
}

export const missingBordersBase: Journey = {
  id: "minigame-missing-borders",
  title: "Missing Borders",
  description: "Find the territory hiding two countries.",
  rounds: [],
};

export function missingBorderJourney(
  pair: MissingBorderPair,
  context: QuestionContext,
  regions: RegionFeature[],
  seed: number,
): Journey {
  const names = pair.countries.map((id) => context.names.get(id)!);
  const anchor = missingBorderAnchor(pair, regions);
  return {
    ...missingBordersBase,
    rounds: [
      defineQuestion({
        source: mapSource,
        id: `missing-borders:${pair.id}`,
        title: "Missing border",
        label: "Missing border",
        topic: "shared land borders",
        resolvedLabel: names.join(" + "),
        prompt: "Which territory is hiding two countries?",
        instruction:
          "One land border has disappeared. Tap the merged territory.",
        mode: "merged-region-single",
        count: 1,
        commitment: "immediate",
        failure: "feedback",
        selection: {
          type: "ids",
          ids: [
            ...regions
              .filter((r) => !pair.countries.includes(r.id))
              .map((r) => r.id),
            pair.answer,
          ],
        },
        rule: {
          type: "merged-region",
          targetId: pair.answer,
          memberIds: [...pair.countries],
          hiddenAdjacencies: [[...pair.countries]],
        },
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        explanation: `The missing border separates ${names[0]} and ${names[1]}.`,
        scenes: {
          play: {
            focus: regionalFocus(pair, regions, seed, anchor),
            map: {
              borders: true,
              hoverFeedback: false,
              muteOthers: true,
              candidates: "highlighted",
            },
          },
          reveal: { focus: { ...anchor, altitude: 0.55 }, borders: true },
        },
      }),
    ],
  };
}
