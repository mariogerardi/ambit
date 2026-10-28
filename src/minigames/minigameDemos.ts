import { geoArea, geoDistance } from "d3-geo";
import type { Focus, RegionFeature } from "../geography/types";
import type { Journey, QuestionContext } from "../game/questionContracts";
import { createQuestionContext } from "../game/questionPreparation";
import { questionRegions } from "../game/presentation";
import { gameReducer, initialGame } from "../game/state";
import type { GameState } from "../game/state";
import { interiorAnchor } from "../geography/interiorAnchor";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { routeFocus } from "./borderRunPath";
import { minigameBase } from "./minigameContext";
import { minigameWorld } from "./minigameWorld";
import { regionalPinpointBands, pinpointSearchFrame } from "./pinpointSearch";
import { revealSequenceStep } from "./useRevealSequence";
import { neighborJourney, sharedNeighborPairs } from "./sharedNeighbors";
import type { BorderMinigame, NeighborPair } from "./sharedNeighbors";
import { missingBorderJourney, missingBorderPairs } from "./missingBorders";
import {
  borderRunJourney,
  borderRunPairs,
  landTopology,
  pinpointJourney,
  pinpointPairs,
} from "./extraGames";
import type { PinpointPair, RoutePair } from "./extraGames";
import { defaultMinigameSettings } from "./minigameSettings";

export type DemoPhase = "question" | "action" | "reveal" | "travel";
export interface MinigameExample {
  id: string;
  kind: BorderMinigame;
  pair: NeighborPair;
  journey: Journey;
  context: QuestionContext;
  focus: Focus;
  revealFocus?: Focus;
  searchIds?: string[];
  title: string;
  action: GameState;
  reveal: GameState;
  steps: number;
}
export type DemoLibrary = Record<BorderMinigame, MinigameExample[]>;
const cache = new WeakMap<RegionFeature[], DemoLibrary>();
const id = (code: string) => `wurl:${code}`;

/** Reviewed demo-only landmark. It does not change the live Pinpoint deck.
 * Wikidata Q21083961, revision 2557231206; coordinates reviewed 2026-10-27.
 * https://www.wikidata.org/w/index.php?title=Q21083961&oldid=2557231206
 */
const shibuya: PinpointPair = {
  id: "pinpoint-v2:landmarks:wikidata:Q21083961",
  answer: "wikidata:Q21083961",
  countries: [id("JPN"), id("JPN")],
  category: "landmarks",
  name: "Shibuya Crossing",
  sourceUrl:
    "https://www.wikidata.org/w/index.php?title=Q21083961&oldid=2557231206",
  place: {
    id: "wikidata:Q21083961",
    name: "Shibuya Crossing",
    kind: "landmark",
    lat: 35.659502777778,
    lng: 139.70054444444,
    parentId: id("JPN"),
    sourceId: "wikidata:Q21083961@2557231206",
  },
};

/** Build real questions and evaluate real example responses, without run/save code. */
export function minigameExamples(
  regions: RegionFeature[],
  kind?: BorderMinigame,
): DemoLibrary {
  const existing = cache.get(regions);
  if (
    existing &&
    (kind
      ? existing[kind].length
      : Object.values(existing).every((examples) => examples.length))
  )
    return existing;
  const base = minigameBase(regions);
  const library: DemoLibrary = {
    "shared-neighbors": existing?.["shared-neighbors"] ?? [],
    "missing-borders": existing?.["missing-borders"] ?? [],
    "border-run": existing?.["border-run"] ?? [],
    pinpoint: existing?.pinpoint ?? [],
  };
  const needed = (game: BorderMinigame) =>
    (!kind || kind === game) && !library[game].length;
  const add = (
    kind: BorderMinigame,
    pair: NeighborPair,
    journey: Journey,
    searchIds?: string[],
  ) => {
    const question = journey.rounds[0];
    const context = createQuestionContext(regions, [], journey, base);
    let action: GameState = { ...initialGame, phase: "playing" };
    const dispatch = (value: Parameters<typeof gameReducer>[1]) => {
      action = gameReducer(action, value, journey, context);
    };
    let focus =
      kind === "shared-neighbors"
        ? question.focus
        : (question.feedbackFocus ?? question.focus);
    if (kind === "pinpoint") {
      const point = (pair as PinpointPair).place!;
      dispatch({ type: "drop-pin", lat: point.lat, lng: point.lng });
      focus = pinpointSearchFrame([
        context.targets.get(point.parentId!)!,
      ]).focus;
    } else if (kind === "shared-neighbors") {
      const region = context.targets.get(pair.answer)!;
      dispatch({
        type: "drop-pin",
        ...interiorAnchor({ ...region, displayGeometry: undefined }),
      });
    } else if (kind === "border-run") {
      dispatch({ type: "text", value: pair.answer });
    }
    if (kind === "missing-borders") {
      const featured = pair.countries.map((key) => context.targets.get(key)!);
      const points = featured.flatMap((region) => {
        const parts =
          region.geometry.type === "Polygon"
            ? [region.geometry.coordinates]
            : region.geometry.coordinates;
        // Offshore islands should not pull a mainland demonstration out to world scale.
        const main = parts
          .map((rings) => ({
            rings,
            area: geoArea(
              sphericalGeometry({ type: "Polygon", coordinates: rings }),
            ),
          }))
          .reduce((best, part) => (part.area > best.area ? part : best)).rings;
        return main[0].map(([lng, lat]): [number, number] => [lng, lat]);
      });
      focus = routeFocus(points);
    }
    if (kind !== "pinpoint")
      focus = { ...focus, altitude: (focus.altitude ?? 0.7) * 0.9 };
    const pending = action;
    if (kind === "missing-borders")
      dispatch({ type: "select", id: pair.answer });
    else dispatch({ type: "submit" });
    if (action.phase !== "feedback" || !action.answers[0]?.correct)
      throw Error(`Invalid minigame demonstration: ${question.id}`);
    library[kind].push({
      id: question.id,
      kind,
      pair,
      journey,
      context,
      focus,
      searchIds,
      title:
        kind === "pinpoint"
          ? (pair as PinpointPair).name
          : pair.countries.map((key) => base.names.get(key)).join(" → "),
      action: pending,
      reveal: action,
      steps:
        kind === "border-run" ? (pair as RoutePair).route.length * 2 - 2 : 1,
    });
  };
  const choose = <T extends NeighborPair>(pairs: T[], codes: string[]) => {
    const found = pairs.find((pair) =>
      codes.every((code) => pair.countries.includes(id(code))),
    );
    if (!found) throw Error(`Missing demo geography: ${codes.join("/")}`);
    return found;
  };
  if (needed("shared-neighbors")) {
    library["shared-neighbors"] = [];
    const shared = sharedNeighborPairs(base.graph);
    for (const codes of [
      ["LAO", "MYS"],
      ["HRV", "MKD"],
      ["SEN", "LBR"],
      ["CHL", "COL"],
    ]) {
      const pair = choose(shared, codes);
      add("shared-neighbors", pair, neighborJourney(pair, base));
    }
  }
  if (needed("missing-borders")) {
    library["missing-borders"] = [];
    const missing = missingBorderPairs(regions);
    for (const codes of [
      ["THA", "KHM", "LAO", "VNM", "MMR", "MYS", "SGP", "BGD"],
      ["MWI", "MOZ", "TZA", "ZMB", "ZWE", "ZAF", "SWZ", "LSO"],
      ["ESP", "PRT", "FRA", "AND", "MAR", "DZA", "TUN", "ITA"],
      ["CRI", "PAN", "NIC", "HND", "SLV", "GTM", "BLZ", "COL"],
    ]) {
      const pair = choose(missing, codes.slice(0, 2));
      const journey = missingBorderJourney(pair, base, regions, 42, true);
      const searchIds = codes.map(id);
      journey.rounds[0].selection = {
        type: "ids",
        ids: [
          ...searchIds.filter((key) => !pair.countries.includes(key)),
          pair.answer,
        ],
      };
      add("missing-borders", pair, journey, searchIds);
      const example = library["missing-borders"].at(-1)!;
      const reveal = example.focus;
      const anchors = searchIds.map((key) =>
        interiorAnchor(base.targets.get(key)!),
      );
      const search = {
        lat: anchors.reduce((sum, p) => sum + p.lat, 0) / anchors.length,
        lng: Math.max(
          reveal.lng + 3,
          anchors.reduce((sum, p) => sum + p.lng, 0) / anchors.length,
        ),
        altitude: 0.8,
      };
      const radius = Math.max(
        ...anchors.map((p) =>
          geoDistance([search.lng, search.lat], [p.lng, p.lat]),
        ),
      );
      search.altitude = Math.max(reveal.altitude! + 0.2, 0.25 + radius * 2.05);
      example.revealFocus = reveal;
      example.focus = search;
    }
  }
  if (needed("border-run")) {
    library["border-run"] = [];
    const routes = borderRunPairs(landTopology(regions));
    for (const codes of [
      ["MYS", "BGD"],
      ["YEM", "TUR"],
      ["ETH", "MLI"],
      ["VEN", "HND"],
    ]) {
      const raw = choose(routes, codes);
      const pair =
        raw.route[0] === id(codes[0])
          ? raw
          : {
              ...raw,
              route: [...raw.route].reverse(),
              components: [...raw.components].reverse(),
              countries: [...raw.countries].reverse() as [string, string],
            };
      add("border-run", pair, borderRunJourney(pair, base));
    }
  }
  if (needed("pinpoint")) {
    library.pinpoint = [];
    const points = pinpointPairs(regions, defaultMinigameSettings);
    for (const name of [
      "Shibuya Crossing",
      "Taj Mahal",
      "Addis Ababa",
      "Eiffel Tower",
      "Mexico City",
    ]) {
      const pair =
        name === "Shibuya Crossing"
          ? shibuya
          : points.find((point) => point.name === name);
      if (!pair) throw Error(`Missing Pinpoint demonstration: ${name}`);
      const journey = pinpointJourney(pair);
      if (pair === shibuya) journey.rounds[0].source.reviewedOn = "2026-10-27";
      add("pinpoint", pair, journey);
    }
  }
  cache.set(regions, library);
  return library;
}

const missingMaps = new WeakMap<
  RegionFeature[],
  Map<string, RegionFeature[]>
>();
function missingDemoMap(regions: RegionFeature[], revealed?: string) {
  let variants = missingMaps.get(regions);
  if (!variants) {
    variants = new Map();
    missingMaps.set(regions, variants);
  }
  const key = revealed ?? "hidden";
  const cached = variants.get(key);
  if (cached) return cached;
  const hidden = minigameExamples(regions, "missing-borders")[
    "missing-borders"
  ].filter((e) => e.id !== revealed);
  const hiddenIds = new Set(hidden.flatMap((e) => e.pair.countries));
  const result = [
    ...regions.filter((r) => !hiddenIds.has(r.id)),
    ...hidden.map(
      (e) =>
        questionRegions(regions, e.journey.rounds[0], "playing").find(
          (r) => r.id === e.pair.answer,
        )!,
    ),
  ];
  variants.set(key, result);
  return result;
}
/** Keep the preview target compact, scaled to its highlighted country. */
export const DEMO_PINPOINT_RADIUS_KM = 650;

export function demoWorld(
  regions: RegionFeature[],
  example: MinigameExample,
  phase: DemoPhase,
  step: number,
  reduced: boolean,
  cycle: number,
  rings = 3,
  departed = false,
) {
  const game =
    phase === "reveal"
      ? example.reveal
      : phase === "action"
        ? example.action
        : { ...initialGame, phase: "playing" as const };
  const view = minigameWorld({
    regions,
    journey: example.journey,
    context: example.context,
    game,
    kind: example.kind,
    pair: example.pair,
    revealStep: step,
    reduced,
    revealKey: `demo:${example.id}:${cycle}`,
  });
  view.selectDisabled = true;
  view.regionInteraction = false;
  if (phase === "question" || phase === "action") {
    for (const id of Object.keys(view.states)) {
      if (example.kind === "border-run" && view.states[id] === "disabled")
        view.states[id] = "surface";
      if (example.kind === "pinpoint" && view.states[id] === "surface")
        view.states[id] = "disabled";
    }
  }
  if (example.kind === "missing-borders")
    view.places = view.places.map((place) => {
      if (!place.id.startsWith("territory-label:")) return place;
      const region = example.context.targets.get(
        place.id.slice("territory-label:".length),
      )!;
      return {
        ...place,
        ...interiorAnchor(region),
        labelFlexible: true,
        priority: 1000,
      };
    });
  if (example.kind === "pinpoint") {
    const country = (example.pair as PinpointPair).place?.parentId;
    if (country && phase !== "travel") view.states[country] = "hinted";
    view.places = view.places.filter((p) => !p.id.startsWith("pinpoint:band:"));
    if (phase === "reveal") {
      const target = (example.pair as PinpointPair).place!;
      const country = example.context.targets.get(target.parentId!);
      const radiusKm = country
        ? Math.min(
            DEMO_PINPOINT_RADIUS_KM,
            regionalPinpointBands(country).at(-1)!.radiusKm,
          )
        : DEMO_PINPOINT_RADIUS_KM;
      view.overlays = [
        ...(view.overlays ?? []).filter((o) => o.type !== "circle"),
        ...Array.from({ length: reduced ? 3 : rings }, (_, index) => ({
          id: `demo:pinpoint-tier:${index}`,
          type: "circle" as const,
          center: target,
          radiusKm: (radiusKm * (index + 1)) / 3,
          shade: false,
          accuracyBand: { index, count: 3 },
          fadeInMs: reduced ? undefined : 240,
        })),
      ];
    }
  }
  if (!reduced)
    view.places = view.places.map((place) =>
      place.kind === "pin" && place.markerRole !== "target"
        ? { ...place, dropInMs: 340 }
        : place,
    );
  if (phase === "travel") {
    view.regions = regions;
    view.states = {};
    view.places = [];
    view.overlays = [];
    view.clueLocators = [];
    view.showBorders = true;
    view.borderRegionIds = undefined;
    view.regionNames = "none";
  }
  if (example.kind === "missing-borders") {
    // Preview travel blends between normal and question colors. Live play keeps
    // its per-question reset to prevent answer-color carryover on Next map.
    view.regionTransitionKey = "preview:missing-borders";
    if (phase === "reveal")
      view.regionReveal = {
        key: `demo:${example.id}:${cycle}`,
        ids: example.pair.countries,
        clueIds: [],
        durationMs: 160,
      };
    view.regions = missingDemoMap(
      regions,
      phase === "reveal" || (phase === "travel" && departed)
        ? example.id
        : undefined,
    );
    if (phase !== "travel")
      for (const region of view.regions) view.states[region.id] ??= "disabled";
  }
  return view;
}

export const DEMO_QUESTION_MS = 4300;
export const DEMO_REVEAL_MS = DEMO_QUESTION_MS + 800;
export const DEMO_HOLD_MS = 13000;
export interface TourFrame {
  departed?: boolean;
  index: number;
  phase: DemoPhase;
  step: number;
  rings: number;
  focus: Focus;
  cycle: number;
}
const gap = (a: MinigameExample, b: MinigameExample) =>
  (a.focus.lng - b.focus.lng + 360) % 360 || 360;
const revealShift = (example: MinigameExample) =>
  example.revealFocus ? example.focus.lng - example.revealFocus.lng : 0;
function arc(examples: MinigameExample[], index: number) {
  const current = examples[index];
  return Math.min(
    Math.min(12, (current.focus.altitude ?? 0.6) * 14),
    gap(examples[(index + examples.length - 1) % examples.length], current) *
      0.7,
    gap(current, examples[(index + 1) % examples.length]) * 0.7,
  );
}
function leg(examples: MinigameExample[], index: number) {
  const next = (index + 1) % examples.length;
  const distance =
    gap(examples[index], examples[next]) -
    (arc(examples, index) + arc(examples, next)) / 2 -
    revealShift(examples[index]);
  return {
    distance,
    duration: Math.min(9000, Math.max(2500, (distance / 12) * 1000)),
  };
}
/** Cubic interpolation with endpoint velocities (units per millisecond). */
export function smoothJoin(
  from: number,
  to: number,
  startSpeed: number,
  endSpeed: number,
  time: number,
  duration: number,
) {
  const t = Math.max(0, Math.min(1, time / duration)),
    t2 = t * t,
    t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * from +
    (t3 - 2 * t2 + t) * duration * startSpeed +
    (-2 * t3 + 3 * t2) * to +
    (t3 - t2) * duration * endSpeed
  );
}
export function tourDuration(examples: MinigameExample[]) {
  return examples.reduce(
    (sum, _, index) => sum + DEMO_HOLD_MS + leg(examples, index).duration,
    0,
  );
}
/** A full westward revolution, with matching position and speed at every join. */
export function tourFrame(
  examples: MinigameExample[],
  elapsed: number,
): TourFrame {
  const duration = tourDuration(examples),
    cycle = Math.floor(elapsed / duration);
  let remaining = elapsed % duration;
  let longitude = examples[0].focus.lng + arc(examples, 0) / 2 - cycle * 360;
  for (let index = 0; index < examples.length; index++) {
    const current = examples[index],
      nextIndex = (index + 1) % examples.length,
      next = examples[nextIndex];
    const span = arc(examples, index),
      nextSpan = arc(examples, nextIndex);
    const lat = Math.max(-35, Math.min(55, current.focus.lat));
    const end = current.revealFocus ?? current.focus;
    const endLat = Math.max(-35, Math.min(55, end.lat));
    if (remaining < DEMO_HOLD_MS) {
      const phase =
        remaining < DEMO_QUESTION_MS
          ? "question"
          : remaining < DEMO_REVEAL_MS
            ? current.kind === "missing-borders"
              ? "question"
              : "action"
            : "reveal";
      const sinceReveal = Math.max(0, remaining - DEMO_REVEAL_MS);
      const zoomTime = Math.min(1, sinceReveal / 2200);
      const zoom = zoomTime * zoomTime * (3 - 2 * zoomTime);
      return {
        index,
        phase,
        cycle,
        step: revealSequenceStep(sinceReveal, current.steps),
        rings: Math.min(3, 1 + Math.floor(sinceReveal / 360)),
        focus: {
          lat: lat + (endLat - lat) * zoom,
          lng:
            longitude -
            (remaining / DEMO_HOLD_MS) * span -
            revealShift(current) * zoom,
          altitude:
            current.focus.altitude! +
            (end.altitude! - current.focus.altitude!) * zoom,
        },
      };
    }
    remaining -= DEMO_HOLD_MS;
    longitude -= span + revealShift(current);
    const { distance, duration: travel } = leg(examples, index);
    if (remaining < travel) {
      const t = remaining / travel,
        ease = t * t * (3 - 2 * t);
      return {
        index,
        phase: "travel",
        departed: true,
        cycle,
        step: 0,
        rings: 0,
        focus: {
          lat:
            endLat +
            (Math.max(-35, Math.min(55, next.focus.lat)) - endLat) * ease,
          lng: smoothJoin(
            longitude,
            longitude - distance,
            -span / DEMO_HOLD_MS,
            -nextSpan / DEMO_HOLD_MS,
            remaining,
            travel,
          ),
          altitude:
            (end.altitude ?? 0.6) +
            ((next.focus.altitude ?? 0.6) - (end.altitude ?? 0.6)) * ease +
            1.1 * Math.sin(Math.PI * t) ** 2,
        },
      };
    }
    remaining -= travel;
    longitude -= distance;
  }
  throw Error("Invalid minigame tour timing");
}
