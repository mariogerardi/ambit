import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
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
  expect(journey.rounds[0].feedbackFocus!.altitude).toBe(1);
});
