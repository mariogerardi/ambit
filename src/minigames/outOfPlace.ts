import { geoArea, geoBounds, geoContains, geoDistance } from "d3-geo";
import { DISPLAY_CAPITALS, MAJOR_CITIES } from "../geography/places";
import { interiorAnchor } from "../geography/interiorAnchor";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { Focus, PlaceFeature, RegionFeature } from "../geography/types";
import { comparisonFocus } from "../globe/camera";
import { placeLabelPlacement, type LabelBox } from "../globe/placeLabelLayout";
import { defineQuestion } from "../game/questionBuilder";
import { capitalSource } from "../game/quizData";
import { mapSource } from "../game/countryFacts";
import type { Journey, QuestionContext } from "../game/questionContracts";
import { minigameBase } from "./minigameContext";
import { neighborDeck } from "./sharedNeighbors";
import type { NeighborPair } from "./sharedNeighbors";

export interface OutOfPlaceItem extends PlaceFeature {
  type: "city" | "country";
  parentId: string;
  repeatCities: boolean;
}
interface Area {
  name: string;
  lat: number;
  lng: number;
  radius: number;
}
export interface OutOfPlacePair extends NeighborPair {
  area: Area;
  candidates: OutOfPlaceItem[];
  items: OutOfPlaceItem[];
  displayed: OutOfPlaceItem[];
  mistake: "name" | "position";
  focus: Focus;
}
// These are geographic search windows, not preselected city lists or authored puzzles.
const AREAS: Area[] = [
  { name: "North America and the Caribbean", lat: 29, lng: -86, radius: 31 },
  { name: "Western North America", lat: 34, lng: -113, radius: 30 },
  { name: "Northern South America", lat: 0, lng: -63, radius: 28 },
  { name: "Southern South America", lat: -24, lng: -61, radius: 26 },
  { name: "Western Europe", lat: 48, lng: 4, radius: 23 },
  { name: "Northern Europe", lat: 58, lng: 22, radius: 24 },
  { name: "Eastern Europe", lat: 49, lng: 34, radius: 24 },
  { name: "The Mediterranean", lat: 36, lng: 17, radius: 25 },
  { name: "West Africa", lat: 10, lng: -6, radius: 26 },
  { name: "East Africa", lat: -2, lng: 34, radius: 26 },
  { name: "Southern Africa", lat: -21, lng: 28, radius: 25 },
  { name: "Southwest Asia", lat: 30, lng: 48, radius: 25 },
  { name: "Central Asia", lat: 43, lng: 72, radius: 27 },
  { name: "South Asia", lat: 22, lng: 80, radius: 26 },
  { name: "Southeast Asia", lat: 10, lng: 109, radius: 27 },
  { name: "East Asia", lat: 37, lng: 123, radius: 28 },
  { name: "Russia and its neighbors", lat: 56, lng: 87, radius: 35 },
  { name: "Australia and the Pacific", lat: -23, lng: 151, radius: 35 },
];
const radians = Math.PI / 180;
const distance = (a: Focus, b: Focus) =>
  geoDistance([a.lng, a.lat], [b.lng, b.lat]);
const cache = new WeakMap<RegionFeature[], OutOfPlacePair[]>();
function fingerprint(value: string) {
  let hash = 2166136261;
  for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}
function randomFor(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function outOfPlaceItems(regions: RegionFeature[]): OutOfPlaceItem[] {
  const base = minigameBase(regions);
  const countries = regions.filter((r) => base.members.has(r.id));
  const large = new Set(
    countries
      .filter(
        (r) =>
          geoArea(sphericalGeometry(r.geometry)) * 6371.0088 ** 2 >= 2_000_000,
      )
      .map((r) => r.id),
  );
  const cities = [
    ...new Map(
      [
        ...MAJOR_CITIES.filter((p) => (p.population ?? 0) >= 1_000_000),
        ...DISPLAY_CAPITALS,
      ]
        .filter((p) => p.parentId && base.members.has(p.parentId))
        .map((p) => [p.id, p]),
    ).values(),
  ];
  return [
    ...cities.map(
      (p): OutOfPlaceItem => ({
        ...p,
        kind: "city",
        type: "city",
        parentId: p.parentId!,
        repeatCities: large.has(p.parentId!),
      }),
    ),
    ...countries.map(
      (r): OutOfPlaceItem => ({
        id: r.id,
        name: base.names.get(r.id) ?? r.name,
        parentId: r.id,
        kind: "other",
        type: "country",
        repeatCities: false,
        sourceId: r.sourceId,
        ...interiorAnchor(r),
      }),
    ),
  ];
}
/** A country and its cities never compete; city repetition is limited to large countries. */
export function outOfPlaceOwnership(items: OutOfPlaceItem[]) {
  const countries = new Set(
    items.filter((i) => i.type === "country").map((i) => i.parentId),
  );
  return (
    countries.size === items.filter((i) => i.type === "country").length &&
    items.every(
      (item, index) =>
        item.type === "country" ||
        (!countries.has(item.parentId) &&
          (item.repeatCities ||
            !items
              .slice(0, index)
              .some((other) => other.parentId === item.parentId))),
    )
  );
}
/** Conservative narrow map projection: preserve 44px between the 30px answer targets. */
export function outOfPlaceProjection(point: Focus, focus: Focus) {
  const lat = point.lat * radians,
    center = focus.lat * radians;
  const longitude = (point.lng - focus.lng) * radians;
  const z =
    Math.sin(center) * Math.sin(lat) +
    Math.cos(center) * Math.cos(lat) * Math.cos(longitude);
  const lift = 1.002; // Matches ordinary PlaceLabels anchors above the globe.
  const depth = 1 + (focus.altitude ?? 1) - z * lift;
  const scale = 200 / (2 * Math.tan(25 * radians));
  return {
    x: 160 + ((Math.cos(lat) * Math.sin(longitude) * lift) / depth) * scale,
    y:
      100 -
      (((Math.cos(center) * Math.sin(lat) -
        Math.sin(center) * Math.cos(lat) * Math.cos(longitude)) *
        lift) /
        depth) *
        scale,
    visible: z > 1 / (1 + (focus.altitude ?? 1)),
  };
}
export function outOfPlaceClear(
  items: (Focus & { name?: string; type?: string })[],
  focus: Focus,
) {
  const projected = items.map((i) => outOfPlaceProjection(i, focus));
  if (
    !projected.every(
      (p, index) =>
        p.visible &&
        p.x >= 22 &&
        p.x <= 298 &&
        p.y >= 22 &&
        p.y <= 178 &&
        projected
          .slice(0, index)
          .every((q) => Math.hypot(p.x - q.x, p.y - q.y) >= 44),
    )
  )
    return false;
  for (const glyphWidth of [12, 14, 16]) {
    const occupied: LabelBox[] = projected.flatMap((p, index) =>
      items[index].type === "country"
        ? []
        : [{ left: p.x - 8, right: p.x + 8, top: p.y - 8, bottom: p.y + 8 }],
    );
    const order = projected
      .map((p, index) => ({ ...p, index }))
      .sort(
        (a, b) =>
          Math.hypot(a.x - 160, a.y - 100) - Math.hypot(b.x - 160, b.y - 100),
      );
    for (const p of order) {
      const name = items[p.index].name;
      if (!name) continue;
      // Generous font-width estimate, using the same placement algorithm as the renderer.
      const height = 26 * 0.8;
      const width = ((name.length * glyphWidth + 20) / 44) * height;
      const placement = placeLabelPlacement(
        p.x,
        p.y,
        width,
        height,
        320,
        200,
        occupied,
        true,
      );
      if (!placement) return false;
      occupied.push(placement.box);
    }
  }
  return true;
}
const shapes = new WeakMap<
  RegionFeature,
  {
    area: number;
    points: Focus[];
    geometry: ReturnType<typeof sphericalGeometry>;
  }
>();
function countryShape(region: RegionFeature) {
  const cached = shapes.get(region);
  if (cached) return cached;
  const polygons =
    region.geometry.type === "Polygon"
      ? [region.geometry.coordinates]
      : region.geometry.coordinates;
  const main = polygons
    .map((coordinates) => ({
      coordinates,
      area: geoArea(sphericalGeometry({ type: "Polygon", coordinates })),
    }))
    .sort((a, b) => b.area - a.area)[0];
  const [[west, south], [east, north]] = geoBounds(
    sphericalGeometry({ type: "Polygon", coordinates: main.coordinates }),
  );
  const middle = west + ((east - west + 360) % 360) / 2;
  const result = {
    area: geoArea(sphericalGeometry(region.geometry)) * 6371.0088 ** 2,
    geometry: sphericalGeometry(region.geometry),
    points: [south, north, (south + north) / 2].flatMap((lat) =>
      [west, east, middle].map((lng) => ({ lat, lng })),
    ),
  };
  shapes.set(region, result);
  return result;
}
export function outOfPlaceGeographyClear(
  items: OutOfPlaceItem[],
  regions: RegionFeature[],
) {
  const countries = items
    .filter((i) => i.type === "country")
    .map(
      (i) => countryShape(regions.find((r) => r.id === i.parentId)!).geometry,
    );
  return items
    .filter((i) => i.type === "city")
    .every((city) =>
      countries.every(
        (geometry) => !geoContains(geometry, [city.lng, city.lat]),
      ),
    );
}
function scene(
  area: Area,
  candidates: OutOfPlaceItem[],
  regions: RegionFeature[],
  seed: number,
): OutOfPlacePair | undefined {
  const random = randomFor(seed);
  const areaKey = fingerprint(
    `${area.name}:${candidates.map((i) => `${i.id}:${i.name}:${i.lat}:${i.lng}`).join("|")}`,
  );
  for (let attempt = 0; attempt < 160; attempt++) {
    const order = shuffled(candidates, random);
    const countries = order
      .filter((i) => {
        if (i.type !== "country") return false;
        const area = countryShape(
          regions.find((r) => r.id === i.parentId)!,
        ).area;
        return area >= 25_000 && area < 2_000_000;
      })
      .slice(0, random() < 0.5 ? 2 : 3);
    const items = [...countries];
    while (items.length < 6) {
      const ranked = order
        .filter(
          (i) =>
            i.type === "city" &&
            !items.some((p) => p.id === i.id || p.name === i.name) &&
            outOfPlaceOwnership([...items, i]),
        )
        .map((city) => ({
          city,
          score:
            Math.min(...items.map((other) => distance(city, other))) *
            (items.some(
              (other) =>
                other.type === "city" && other.parentId === city.parentId,
            )
              ? 0.55
              : 1) *
            (0.8 + random() * 0.4),
        }))
        .sort((a, b) => b.score - a.score);
      if (!ranked.length) break;
      items.push(ranked[0].city);
    }
    if (items.length !== 6 || !outOfPlaceGeographyClear(items, regions))
      continue;
    const outlines = countries.flatMap(
      (c) => countryShape(regions.find((r) => r.id === c.parentId)!).points,
    );
    const focus = comparisonFocus([...items, ...outlines], undefined, 40);
    focus.altitude = Math.max(0.22, focus.altitude ?? 0.8);
    if (!outOfPlaceClear(items, focus)) continue;
    const actual = items[Math.floor(random() * items.length)];
    const alternatives = order.filter(
      (i) =>
        !items.some((p) => p.id === i.id || p.name === i.name) &&
        distance(actual, i) >= 4 * radians &&
        distance(actual, i) <= 24 * radians,
    );
    const preferred = random() < 0.5 ? "name" : "position";
    for (const mistake of [
      preferred,
      preferred === "name" ? "position" : "name",
    ] as const) {
      if (mistake === "position" && actual.type === "country") continue;
      for (const alternative of alternatives) {
        if (
          mistake === "name" &&
          (alternative.type !== actual.type ||
            !outOfPlaceOwnership(
              items.map((i) => (i.id === actual.id ? alternative : i)),
            ))
        )
          continue;
        const displayed = items.map((i) =>
          i.id !== actual.id
            ? i
            : mistake === "name"
              ? { ...i, name: alternative.name }
              : { ...i, lat: alternative.lat, lng: alternative.lng },
        );
        if (
          !outOfPlaceClear(displayed, focus) ||
          !outOfPlaceGeographyClear(displayed, regions)
        )
          continue;
        return {
          id: `out-of-place-v1:${areaKey}:${fingerprint(JSON.stringify(displayed.map((i) => [i.id, i.name, i.lat, i.lng])))}`,
          countries: [countries[0].parentId, countries[1].parentId],
          answer: actual.id,
          area,
          candidates,
          items: shuffled(items, random),
          displayed: shuffled(displayed, random),
          mistake,
          focus,
        };
      }
    }
  }
}
export function outOfPlacePairs(regions: RegionFeature[]) {
  const existing = cache.get(regions);
  if (existing) return existing;
  const items = outOfPlaceItems(regions);
  const pairs = AREAS.flatMap((area, index) => {
    const candidates = items.filter(
      (i) => distance(i, area) <= area.radius * radians,
    );
    const example = scene(area, candidates, regions, 1000 + index);
    return example ? [example] : [];
  });
  cache.set(regions, pairs);
  return pairs;
}
/** Rebuild the six items from the run seed, not a fixed scene catalog. */
export function outOfPlaceDeck(
  pairs: OutOfPlacePair[],
  regions: RegionFeature[],
  seed: number,
  cycle: number,
) {
  return neighborDeck(pairs, seed, cycle).map(
    (pair) =>
      scene(
        pair.area,
        pair.candidates,
        regions,
        (seed +
          Math.imul(cycle + 1, 0x9e3779b9) +
          parseInt(fingerprint(pair.area.name), 16)) >>>
          0,
      ) ?? pair,
  );
}
export function outOfPlaceJourney(
  pair: OutOfPlacePair,
  context: QuestionContext,
): Journey {
  const actual = pair.items.find((i) => i.id === pair.answer)!;
  const shown = pair.displayed.find((i) => i.id === pair.answer)!;
  const country = context.names.get(actual.parentId)!;
  const explanation =
    pair.mistake === "name"
      ? `The ${actual.type === "country" ? "country" : "marker"} labelled ${shown.name} was actually ${actual.name}${actual.type === "city" ? `, ${country}` : ""}. Its name has been corrected.`
      : `${actual.name} was shown about ${(Math.round((distance(actual, shown) * 6371.0088) / 10) * 10).toLocaleString("en-US")} km from its true location in ${country}. The dotted line connects its original position to the corrected marker.`;
  const marker = (i: OutOfPlaceItem): PlaceFeature => ({
    ...i,
    labelFlexible: true,
    labelScale: 0.8,
    markerSize: 30,
    priority: 100,
    markerHidden: i.type === "country",
  });
  return {
    id: "minigame-out-of-place",
    title: "Out of Place",
    description: "Six places. One mistake.",
    rounds: [
      defineQuestion({
        id: pair.id,
        title: "Out of Place",
        label: pair.area.name,
        topic: "map mistakes",
        prompt: "One of these six places is wrong. Tap the mistake.",
        instruction: "Tap the wrong name or location. Your first tap is final.",
        mode: "city-single",
        count: 1,
        selection: { type: "ids", ids: pair.items.map((i) => i.id) },
        rule: { type: "place-ids", ids: [pair.answer] },
        commitment: "immediate",
        failure: "feedback",
        disclosure: {
          hoverNames: false,
          namedChoices: true,
          committedNames: true,
          previousVisits: false,
        },
        source: capitalSource,
        sources: [mapSource],
        explanation,
        map: {
          borders: true,
          hoverFeedback: false,
          muteOthers: false,
          candidates: "neutral",
        },
        scenes: {
          play: {
            focus: pair.focus,
            places: pair.displayed.map(marker),
            contextIds: [],
            overlays: [],
          },
          reveal: {
            focus: pair.focus,
            places: [
              ...pair.items.map((i) => ({
                ...marker(i),
                markerBadge: undefined,
              })),
              ...(pair.mistake === "position"
                ? [
                    {
                      id: `${pair.id}:original-position`,
                      name: "Shown here",
                      kind: "other" as const,
                      lat: shown.lat,
                      lng: shown.lng,
                      sourceId: "out-of-place:deliberate-error",
                      markerRole: "annotation" as const,
                      markerBadge: "×",
                      markerSize: 24,
                      labelFlexible: true,
                      labelScale: 0.7,
                      visualState: "answer" as const,
                      answerTarget: false,
                      priority: 50,
                    },
                  ]
                : []),
            ],
            overlays:
              pair.mistake === "position"
                ? [
                    {
                      id: `${pair.id}:correction`,
                      type: "path",
                      purpose: "comparison",
                      coordinates: [
                        [shown.lng, shown.lat],
                        [actual.lng, actual.lat],
                      ],
                      dashed: "dotted",
                      surfaceAligned: true,
                      visualState: "answer",
                    },
                  ]
                : [],
          },
        },
      }),
    ],
  };
}
