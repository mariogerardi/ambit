import { interiorAnchor } from "../geography/interiorAnchor";
import { borderRunCrossings, borderRunPath, routeFocus } from "./borderRunPath";
import type { RoutePair } from "./borderRunTopology";
export { borderRunPairs, landTopology } from "./borderRunTopology";
export type { RoutePair } from "./borderRunTopology";
import landmarks from "./landmarks.v1.json";
import roster from "../game/data/un-members.v1.json";
import { CAPITALS, capitalSource } from "../game/quizData";
import { MAJOR_CITIES } from "../geography/places";
import { US_STATES } from "../geography/usStates";
import { defineQuestion } from "../game/questionBuilder";
import { mapSource } from "../game/countryFacts";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { PlaceFeature, RegionFeature } from "../geography/types";
import type { NeighborPair } from "./sharedNeighbors";
import type { MinigameSettings, PinpointCategory } from "./minigameSettings";
import { defaultCategories } from "./minigameSettings";

export const extraGameBase = (kind: "border-run" | "pinpoint"): Journey => ({
  id: `minigame-${kind}`,
  title: kind === "border-run" ? "Border Run" : "Pinpoint",
  description: "",
  rounds: [],
});
export interface PinpointPair extends NeighborPair {
  category: PinpointCategory;
  place?: PlaceFeature;
  region?: RegionFeature;
  name: string;
  sourceUrl?: string;
  photo?: {
    src: string;
    author: string;
    url: string;
    license: string;
    licenseUrl: string;
  };
}

export function borderRunJourney(
  pair: RoutePair,
  context: QuestionContext,
  showBorders = false,
): Journey {
  const endpoints = [pair.components[0], pair.components.at(-1)!].map((c) =>
    interiorAnchor(c.region),
  );
  const focus = routeFocus(endpoints.map((p) => [p.lng, p.lat]));
  const flags: PlaceFeature[] = endpoints.map((point, i) => ({
    ...point,
    id: `border-run:flag:${i}`,
    name: i ? "Finish" : "Start",
    kind: "other",
    sourceId: "natural-earth",
    markerRole: i ? "finish" : "start",
    markerSize: 44,
    surfaceAligned: true,
    labelHidden: true,
    visualState: i ? "answer" : "hinted",
    priority: 1000,
  }));
  const path = borderRunPath(pair);
  const names = pair.route.map((id) => context.names.get(id)!);
  return {
    ...extraGameBase("border-run"),
    rounds: [
      defineQuestion({
        id: `border-run:${pair.id}`,
        title: "The shortest land route",
        label: "Border crossings",
        topic: "land borders",
        prompt: `What is the minimum number of border crossings from ${names[0]} to ${names.at(-1)}?`,
        instruction:
          "Count the fewest land-border crossings between the flags.",
        mode: "number",
        inputLabel: "Border crossings",
        count: 1,
        selection: { type: "none" },
        commitment: "submit",
        failure: "feedback",
        rule: { type: "manual-number", value: Number(pair.answer) },
        correctFeedback: "Well done.",
        source: mapSource,
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        explanation: `The shortest possible route was ${names.join(" → ")}.`,
        scenes: {
          play: {
            contextIds: pair.countries,
            places: flags,
            focus,
            map: {
              borders: showBorders,
              hoverFeedback: false,
              muteOthers: true,
            },
          },
          reveal: {
            answerIds: pair.route,
            borders: true,
            focus: routeFocus(path),
            places: [
              ...flags,
              ...borderRunCrossings(pair).map<PlaceFeature>(
                ([lng, lat], index) => ({
                  id: `border-run:crossing:${index + 1}`,
                  name: `Border crossing ${index + 1}`,
                  sourceId: "natural-earth",
                  kind: "other",
                  lng,
                  lat,
                  markerBadge: String(index + 1),
                  markerSize: 36,
                  labelHidden: true,
                  surfaceAligned: true,
                  visualState: "correct",
                }),
              ),
            ],
          },
        },
      }),
    ],
  };
}

export function pinpointPairs(
  regions: RegionFeature[],
  settings: MinigameSettings,
): PinpointPair[] {
  const categories = settings.categories ?? defaultCategories;
  const pairs: PinpointPair[] = [];
  const point = (
    place: PlaceFeature,
    category: PinpointCategory,
  ): PinpointPair => ({
    id: `pinpoint-v2:${category}:${place.id}`,
    answer: place.id,
    countries: [place.parentId ?? "", place.parentId ?? ""],
    name: place.name,
    place,
    category,
  });
  if (categories.includes("cities")) {
    const cities = [
      ...CAPITALS,
      ...MAJOR_CITIES.filter((p) => (p.population ?? 0) >= 1_000_000),
    ];
    pairs.push(...cities.map((p) => point(p, "cities")));
  }
  if (categories.includes("landmarks"))
    pairs.push(
      ...landmarks.landmarks.map((record) => ({
        ...point(
          {
            id: `wikidata:${record.id}`,
            name: record.name,
            lat: record.lat,
            lng: record.lng,
            parentId: record.countryId,
            kind: "landmark",
            sourceId: `wikidata:${record.id}@${record.revision}`,
          },
          "landmarks",
        ),
        sourceUrl: record.sourceUrl,
        photo: record.photo,
      })),
    );
  const area = (
    region: RegionFeature,
    category: PinpointCategory,
  ): PinpointPair => ({
    id: `pinpoint-v2:${category}:${region.id}`,
    answer: region.id,
    countries: [region.id, region.id],
    name: region.name,
    category,
    region,
  });
  if (categories.includes("countries")) {
    const members = new Set(roster.members.map((c) => c.id));
    pairs.push(
      ...regions
        .filter((r) => members.has(r.id))
        .map((r) => area(r, "countries")),
    );
  }
  if (categories.includes("regions"))
    pairs.push(...US_STATES.map((r) => area(r, "regions")));
  return pairs.sort((a, b) => a.id.localeCompare(b.id));
}
/** Randomize categories, then countries, then places. Large city catalogs never
 * make one country more likely, and a run avoids repeating countries when possible. */
export function pinpointDeck(
  pairs: PinpointPair[],
  seed: number,
  cycle: number,
): PinpointPair[] {
  if (!pairs.length) return [];
  let state = (seed + Math.imul(cycle, 0x9e3779b9)) >>> 0 || 0x6d2b79f5;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const categories = [...new Set(pairs.map((p) => p.category))].sort();
  const used = new Set<string>(),
    countries = new Set<string>(),
    result: PinpointPair[] = [];
  const country = (p: PinpointPair) =>
    p.place?.parentId ?? p.region?.parentId ?? p.countries[0];
  const pick = <T>(pool: T[]) => pool[Math.floor(random() * pool.length)];
  for (let round = 0; round < 10; round++) {
    const category = pick(categories);
    let options = pairs.filter(
      (p) => p.category === category && !used.has(p.id),
    );
    if (!options.length) {
      for (const p of pairs.filter((p) => p.category === category))
        used.delete(p.id);
      options = pairs.filter((p) => p.category === category);
    }
    const fresh = options.filter((p) => !countries.has(country(p)));
    if (fresh.length) options = fresh;
    const selectedCountry = pick([...new Set(options.map(country))].sort());
    const selected = pick(
      options.filter((p) => country(p) === selectedCountry),
    );
    result.push(selected);
    used.add(selected.id);
    countries.add(selectedCountry);
  }
  return result;
}
export function pinpointJourney(
  pair: PinpointPair,
  entryFocus?: { lat: number; lng: number; altitude?: number },
): Journey {
  const countryName = roster.members.find(
    (c) => c.id === pair.place?.parentId,
  )?.name;
  return {
    ...extraGameBase("pinpoint"),
    rounds: [
      defineQuestion({
        id: `pinpoint:${pair.id}`,
        title: pair.name,
        label: pair.name,
        topic: "world locations",
        prompt: `Where is ${pair.name}?`,
        instruction: pair.region
          ? "Place your pin anywhere inside the named area."
          : "Place your pin as close as possible.",
        mode: "pin",
        count: 1,
        selection: { type: "none" },
        commitment: "submit",
        failure: "feedback",
        rule: pair.region
          ? { type: "pin-inside", ids: [pair.region.id] }
          : {
              type: "pin-distance",
              targetId: pair.place!.id,
              radiusKm: PINPOINT_ZERO_RADIUS,
              tiers: [
                ...PINPOINT_BANDS.map((b) => ({
                  radiusKm: b.radiusKm,
                  feedback:
                    b.points >= 900
                      ? "Very close."
                      : b.points >= 500
                        ? "Nicely placed."
                        : "On the map.",
                })),
                { radiusKm: PINPOINT_ZERO_RADIUS, feedback: "On the map." },
              ],
            },
        source: pair.region
          ? mapSource
          : pair.category === "landmarks"
            ? {
                name: "Wikidata · reviewed landmark coordinates",
                url: pair.sourceUrl ?? "https://www.wikidata.org/",
                reviewedOn: landmarks.reviewedOn,
              }
            : capitalSource,
        importedRegions: pair.category === "regions" ? US_STATES : undefined,
        places: pair.place
          ? [{ ...pair.place, visualState: undefined }]
          : undefined,
        explanation: pair.region
          ? `The mapped boundary of ${pair.name} defines the accepted area.`
          : `${pair.name} · ${countryName ?? "Mapped location"}.`,
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        scenes: {
          play: {
            focus: entryFocus ?? { lat: 15, lng: 0, altitude: 1.15 },
            map: {
              background: "open-search",
              borders: true,
              hoverFeedback: false,
              muteOthers: false,
              revealOnAnswer: true,
            },
          },
          reveal: {
            focus: {
              ...(pair.region?.focus ?? pair.place!),
              altitude: pair.region ? 0.8 : 1.0,
            },
          },
        },
      }),
    ],
  };
}
export function pinpointPoints(distanceKm: number): number {
  return Math.round(1000 * Math.exp(-Math.max(0, distanceKm - 1) / 1500));
}

export const PINPOINT_ZERO_RADIUS = 1 - 1500 * Math.log(0.0005) - 0.001;
export const PINPOINT_BANDS = Array.from({ length: 10 }, (_, i) => ({
  points: 1000 - i * 100,
  radiusKm: 1 - 1500 * Math.log((1000 - i * 100) / 1000),
}));
