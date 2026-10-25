import { sharedBoundary } from "./sharedBoundary";
import { geoBounds, geoDistance, geoInterpolate } from "d3-geo";
import roster from "../game/data/un-members.v1.json";
import { defineQuestion } from "../game/questionBuilder";
import { mapSource } from "../game/countryFacts";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { Focus, RegionFeature } from "../geography/types";
import type { NeighborPair } from "./sharedNeighbors";
import { CAPITALS } from "../game/quizData";
import { missingBorderContinent } from "./minigameSettings";

export interface MissingBorderPair extends NeighborPair {
  borderPoints: [number, number][];
}
const rad = Math.PI / 180;
const location = (focus: Focus): [number, number] => [focus.lng, focus.lat];
const continentViews: Record<string, Focus> = {
  AF: { lat: 3, lng: 20, altitude: 1.3 },
  AS: { lat: 35, lng: 90, altitude: 1.5 },
  EU: { lat: 50, lng: 20, altitude: 1.05 },
  NA: { lat: 35, lng: -100, altitude: 1.4 },
  SA: { lat: -15, lng: -60, altitude: 1.25 },
  OC: { lat: -22, lng: 150, altitude: 1.25 },
};
const countryContinents = new Map(
  CAPITALS.map((capital) => [capital.countryId, capital.continent]),
);
const territoryContinents = new WeakMap<RegionFeature, string>();
export function missingBorderCandidateContinent(
  region: RegionFeature,
): string | undefined {
  if (region.id === "wurl:ATA") return undefined;
  if (region.id === "wurl:GRL") return "NA";
  const known =
    countryContinents.get(region.id) ?? territoryContinents.get(region);
  if (known) return known;
  let closest = CAPITALS[0],
    distance = Infinity;
  for (const capital of CAPITALS) {
    const next = geoDistance(location(region.focus), [
      capital.lng,
      capital.lat,
    ]);
    if (next < distance) {
      closest = capital;
      distance = next;
    }
  }
  territoryContinents.set(region, closest.continent);
  return closest.continent;
}

export const missingBorderSearchRadius = (wide: boolean) => (wide ? 70 : 42);
export function inMissingBorderSearch(
  point: Focus,
  focus: Focus,
  wide: boolean,
): boolean {
  return (
    geoDistance(location(point), location(focus)) <=
    missingBorderSearchRadius(wide) * rad
  );
}

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

/** Seeded search circle; camera framing separately fits its selectable land. */
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

function frameSearchArea(regions: RegionFeature[], searchCenter: Focus): Focus {
  const points = regions.flatMap((region) => {
    const geometry = region.displayGeometry ?? region.geometry;
    const polygons =
      geometry.type === "Polygon"
        ? [geometry.coordinates]
        : geometry.coordinates;
    // Fit the playable parts, without pulling overseas outposts into the view.
    return polygons
      .flatMap((polygon) => polygon[0])
      .filter(([lng, lat]) =>
        inMissingBorderSearch({ lng, lat }, searchCenter, false),
      );
  });
  if (!points.length) return searchCenter;
  const [[west, south], [east, north]] = geoBounds({
    type: "MultiPoint",
    coordinates: points,
  });
  const center: [number, number] = [
    ((west + ((east - west + 360) % 360) / 2 + 540) % 360) - 180,
    (south + north) / 2,
  ];
  const radius = points.reduce(
    (max, point) =>
      Math.max(max, geoDistance(center, point as [number, number])),
    0,
  );
  return {
    lng: center[0],
    lat: center[1],
    altitude: Math.max(0.65, 0.25 + radius * 2.05),
  };
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
  wide = true,
): Journey {
  const names = pair.countries.map((id) => context.names.get(id)!);
  const anchor = missingBorderAnchor(pair, regions);
  const continent = missingBorderContinent(pair);
  // Frame the search area consistently, independently of the hidden boundary.
  const searchCenter = wide
    ? { ...continentViews[continent] }
    : regionalFocus(pair, regions, seed, anchor);
  const members = pair.countries.map((id) => regions.find((r) => r.id === id)!);
  const boundary = sharedBoundary(members[0], members[1]);
  const candidates = regions.filter(
    (region) =>
      !pair.countries.includes(region.id) &&
      missingBorderCandidateContinent(region) === continent &&
      (wide || inMissingBorderSearch(region.focus, searchCenter, false)),
  );
  const focus = wide
    ? searchCenter
    : frameSearchArea([...candidates, ...members], searchCenter);
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
          "One border is missing. Select the shape hiding two countries.",
        mode: "merged-region-single",
        count: 1,
        commitment: "immediate",
        failure: "feedback",
        selection: {
          type: "ids",
          ids: [...candidates.map((r) => r.id), pair.answer],
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
            focus,
            map: {
              borders: true,
              hoverFeedback: false,
              muteOthers: true,
              candidates: "highlighted",
            },
          },
          reveal: {
            focus: { ...anchor, altitude: 0.65 },
            borders: true,
            overlays: boundary.map((coordinates, index) => ({
              id: `missing-border:reveal:${pair.id}:${index}`,
              type: "path",
              coordinates,
              surfaceAligned: true,
              foreground: true,
              visualState: "corridor",
              reveal: { durationMs: 1100, delayMs: 450 },
            })),
          },
        },
      }),
    ],
  };
}
