import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it, vi } from "vitest";
import { geoDistance } from "d3-geo";
import type { RegionFeature } from "../src/geography/types";
import {
  pinpointPairs,
  pinpointDeck,
  pinpointJourney,
  pinpointPoints,
  PINPOINT_BANDS,
  PINPOINT_ZERO_RADIUS,
} from "../src/minigames/extraGames";
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  neighborGame,
  startNeighborRun,
  neighborReducer,
} from "../src/minigames/sharedNeighbors";
import { journeyWorld } from "../src/app/journeyWorld";
import { pointAlongBearing } from "../src/game/geodesic";
import landmarks from "../src/minigames/landmarks.v1.json";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const pool = pinpointPairs(world, defaultMinigameSettings);
it("leaves expensive search-region framing out of initial pool construction", async () => {
  const search = await import("../src/minigames/pinpointSearch");
  const frame = vi.spyOn(search, "pinpointSearchContext");
  try {
    const pairs = pinpointPairs(world, defaultMinigameSettings);
    expect(frame).not.toHaveBeenCalled();
    const p = pairs.find((p) => p.searchArea)!;
    const context = p.searchContext;
    expect(frame).toHaveBeenCalledOnce();
    expect(context).toBeDefined();
    expect(p.searchContext).toBe(context);
  } finally {
    frame.mockRestore();
  }
});
it("randomizes category counts and diversifies countries rather than weighting by city counts", () => {
  const counts = new Set<number>();
  for (let seed = 1; seed <= 100; seed++) {
    const deck = pinpointDeck(pool, seed, 0);
    counts.add(deck.filter((p) => p.category === "landmarks").length);
    expect(new Set(deck.map((p) => p.place!.parentId)).size).toBe(10);
    expect(new Set(deck.map((p) => p.id)).size).toBe(10);
  }
  expect(counts.size).toBeGreaterThan(4);
  const cities = pinpointPairs(world, {
    ...defaultMinigameSettings,
    categories: ["cities"],
  });
  for (const seed of [4, 18, 5000])
    expect(
      new Set(pinpointDeck(cities, seed, 0).map((p) => p.place!.parentId)).size,
    ).toBe(10);
});
it("freezes a broad landmark catalog and retains verifiable per-image attribution", () => {
  expect(landmarks.landmarks).toHaveLength(60);
  expect(new Set(landmarks.landmarks.map((p) => p.countryId)).size).toBe(60);
  for (const landmark of landmarks.landmarks) {
    expect(landmark.sourceUrl).toContain(`wikidata.org/wiki/${landmark.id}`);
    expect(Number.isFinite(landmark.lat) && Number.isFinite(landmark.lng)).toBe(
      true,
    );
    if (landmark.photo) {
      const data = readFileSync(`public${landmark.photo.src}`);
      expect(createHash("sha256").update(data).digest("hex")).toBe(
        landmark.photo.sha256,
      );
      expect(landmark.photo.author.length).toBeGreaterThan(0);
      expect(landmark.photo.licenseUrl).toMatch(/^https?:/);
    }
  }
  for (const id of ["Q243", "Q42798"])
    expect(landmarks.landmarks.find((p) => p.id === id)!.photo!.license).toBe(
      "CC BY-SA 3.0",
    );
});
it("has ten 100-point bands with radii that match the score formula", () => {
  expect(PINPOINT_BANDS.map((b) => b.points)).toEqual([
    1000, 900, 800, 700, 600, 500, 400, 300, 200, 100,
  ]);
  for (const band of PINPOINT_BANDS)
    expect(pinpointPoints(band.radiusKm)).toBe(band.points);
  expect(pinpointPoints(PINPOINT_ZERO_RADIUS - 1)).toBe(1);
  expect(pinpointPoints(PINPOINT_ZERO_RADIUS + 1)).toBe(0);
});
it("keeps a partial-credit pin free of the red cross, reserving it for zero points", () => {
  const pair = pool.find((p) => p.category === "landmarks")!,
    journey = pinpointJourney(pair),
    context = createQuestionContext(world, [], journey);
  const run = { ...startNeighborRun(pool), kind: "pinpoint" as const };
  for (const [km, correct] of [
    [3000, true],
    [15000, false],
  ] as const) {
    const pin = pointAlongBearing(pair.place!, 45, km / 6371.0088);
    const graded = neighborReducer(
      { ...run, pin },
      { type: "submit" },
      journey,
      context,
      10,
    );
    expect(graded.result).toBe(correct);
    const view = journeyWorld(
      world,
      journey,
      neighborGame(graded, journey),
      context,
    );
    expect(view.places.find((p) => p.sourceId === "player")!.visualState).toBe(
      correct ? "correct" : "incorrect",
    );
  }
  expect(journey.rounds[0].focus.altitude).toBeLessThan(1.3);
  expect(journey.rounds[0].feedbackFocus!.altitude).toBeLessThanOrEqual(
    journey.rounds[0].focus.altitude!,
  );
});

it("supplies country/state search areas for new point rounds and scales scoring without changing legacy questions", async () => {
  const { regionalPinpointBands, regionalPinpointPoints } = await import(
    "../src/minigames/pinpointSearch"
  );
  const points = pool.filter((p) => p.place);
  expect(points.every((p) => p.searchArea)).toBe(true);
  const us = points.find(
    (p) => p.place!.parentId === "wurl:USA" && p.searchArea?.level === "ADM1",
  )!;
  expect(us.searchArea?.level).toBe("ADM1");
  const pair = points.find((p) => p.name === "Eiffel Tower")!;
  const old = pinpointJourney(pair).rounds[0];
  const fresh = pinpointJourney(pair, undefined, true).rounds[0];
  expect(old.contextIds ?? []).not.toContain(pair.searchArea!.id);
  expect(fresh.contextIds).toContain(pair.searchArea!.id);
  expect(fresh.prompt).toContain(pair.searchArea!.name);
  const context = createQuestionContext(
    world,
    [],
    pinpointJourney(pair, undefined, true),
  );
  const view = journeyWorld(
    world,
    pinpointJourney(pair, undefined, true),
    {
      ...neighborGame(
        startNeighborRun([pair]),
        pinpointJourney(pair, undefined, true),
      ),
      phase: "playing",
    },
    context,
  );
  expect(view.states[pair.searchArea!.id]).toBe("hinted");
  for (const band of regionalPinpointBands(pair.searchArea!))
    expect(regionalPinpointPoints(band.radiusKm, pair.searchArea!)).toBe(
      band.points,
    );
  expect(regionalPinpointPoints(0, pair.searchArea!)).toBe(1000);
  expect(regionalPinpointPoints(20000, pair.searchArea!)).toBe(1);
  expect(regionalPinpointPoints(200, pair.searchArea!)).toBeLessThan(
    pinpointPoints(200),
  );
});

it("keeps large-country searches and broadens small ones to six-to-eight plausible reference locations", () => {
  for (const code of ["FRA", "COD"]) {
    const p = pool.find((p) => p.place?.parentId === `wurl:${code}`)!;
    expect(p.searchContext!.regions.map((r) => r.id)).toEqual([
      p.searchArea!.id,
    ]);
    expect(p.searchContext!.optionCount).toBeGreaterThanOrEqual(6);
  }
  for (const code of ["PRT", "LIE", "BRB", "TLS"]) {
    const p = pool.find((p) => p.place?.parentId === `wurl:${code}`)!;
    expect(p.searchContext!.regions.length).toBeGreaterThan(1);
    expect(p.searchContext!.optionCount).toBeGreaterThanOrEqual(6);
    expect(p.searchContext!.optionCount).toBeLessThanOrEqual(8);
    const q = pinpointJourney(p, undefined, true).rounds[0];
    expect(q.feedbackFocus).toMatchObject({
      lat: p.place!.lat,
      lng: p.place!.lng,
    });
    expect(q.feedbackFocus!.altitude).toBeLessThanOrEqual(q.focus.altitude!);
    expect(q.prompt).toContain("highlighted region");
    expect(q.contextIds).toEqual(p.searchContext!.regions.map((r) => r.id));
    expect(q.rule.type).toBe("pin-distance");
  }
});

it("keeps live feedback radii while giving the rings distinct preview colors", async () => {
  const { minigameWorld } = await import("../src/minigames/minigameWorld");
  const { regionalPinpointBands } = await import(
    "../src/minigames/pinpointSearch"
  );
  const { pinBandColor } = await import("../src/theme/playColors");
  const pair = pool.find((p) => p.name === "Eiffel Tower")!;
  const journey = pinpointJourney(pair, undefined, true);
  const context = createQuestionContext(world, [], journey);
  const run = {
    ...startNeighborRun([pair]),
    kind: "pinpoint" as const,
    pin: pair.place!,
    result: true,
  };
  const view = minigameWorld({
    regions: world,
    journey,
    context,
    game: neighborGame(run, journey),
    kind: "pinpoint",
    pair,
    regionalPinpoint: true,
  });
  const circles = view.overlays!.filter((o) => o.type === "circle");
  expect(circles.map((o) => o.radiusKm)).toEqual(
    regionalPinpointBands(pair.searchContext!)
      .filter((b) => [1000, 500, 100].includes(b.points))
      .map((b) => b.radiusKm),
  );
  const colors = circles.map((o) =>
    pinBandColor(o.accuracyBand!.index, o.accuracyBand!.count, "ocean"),
  );
  expect(new Set(colors).size).toBe(3);
});

it("scales small-country rings and points to the broader search footprint", async () => {
  const { regionalPinpointBands, regionalPinpointPoints } = await import(
    "../src/minigames/pinpointSearch"
  );
  const kingston = pool.find((p) => p.name === "Kingston")!;
  const castillo = pool.find(
    (p) => p.name === "Castillo de San Pedro de la Roca",
  )!;
  const bands = regionalPinpointBands(kingston.searchContext!);
  expect(bands.at(-1)!.radiusKm).toBeGreaterThan(
    regionalPinpointBands(castillo.searchContext!).at(-1)!.radiusKm * 0.75,
  );
  expect(regionalPinpointPoints(97, kingston.searchContext!)).toBeGreaterThan(
    500,
  );
  expect(regionalPinpointPoints(97, kingston.searchContext!)).toBeGreaterThan(
    regionalPinpointPoints(97, kingston.searchArea!),
  );
  const q = pinpointJourney(kingston, undefined, true).rounds[0];
  if (q.rule.type !== "pin-distance") throw Error("Expected distance scoring");
  expect(q.rule.tiers![0].radiusKm).toBe(bands[0].radiusKm);
  expect(q.rule.tiers![5].radiusKm).toBe(bands[5].radiusKm);
});

it.each(["DJI", "SGP", "JAM"])(
  "fits all highlighted %s search countries before focusing on the answer on reveal",
  (code) => {
    const p = pool.find((p) => p.place?.parentId === `wurl:${code}`)!;
    const { focus, regions } = p.searchContext!;
    expect(regions.length).toBeGreaterThan(1);
    for (const region of regions) {
      const g = region.displayGeometry ?? region.geometry;
      const polygons = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
      for (const [lng, lat] of polygons.flatMap((polygon) => polygon[0])) {
        const angle = geoDistance([focus.lng, focus.lat], [lng, lat]);
        expect(Math.cos(angle), region.name).toBeGreaterThan(
          1 / (1 + focus.altitude!),
        );
        expect(
          (Math.atan2(Math.sin(angle), 1 + focus.altitude! - Math.cos(angle)) *
            180) /
            Math.PI,
          region.name,
        ).toBeLessThanOrEqual(20.001);
      }
    }
    const q = pinpointJourney(p, undefined, true).rounds[0];
    expect(q.focus).toEqual(focus);
    expect(q.feedbackFocus).toMatchObject({
      lat: p.place!.lat,
      lng: p.place!.lng,
    });
    expect(q.feedbackFocus!.altitude).toBeLessThanOrEqual(focus.altitude!);
  },
);
