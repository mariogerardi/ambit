import { expect, it, vi } from "vitest";
import {
  startPlaceStudy,
  studyReducer,
  studyComplete,
  validStudy,
  defaultSettings,
  archiveStudy,
} from "../src/study/engine";
import { minigameReviewTargets } from "../src/minigames/minigameReview";
import { startNeighborRun } from "../src/minigames/sharedNeighbors";
import { validNeighborRun } from "../src/minigames/sharedNeighborsSave";
import {
  minigameResult,
  minigameResultText,
  paintMinigameResult,
} from "../src/minigames/minigameSharing";
import type { RegionFeature } from "../src/geography/types";
import { US_STATES } from "../src/geography/usStates";
import { interiorAnchor } from "../src/geography/interiorAnchor";
const land: RegionFeature = {
  id: "land",
  name: "Land",
  level: "ADM0",
  sourceId: "test",
  focus: { lat: 0, lng: 0 },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-2, -2],
        [2, -2],
        [2, 2],
        [-2, 2],
        [-2, -2],
      ],
    ],
  },
};
const country = { id: "land", name: "Land", lat: 0, lng: 0, regionId: "land" };
const place = { id: "city:test", name: "Test city", lat: 10, lng: 20 };
const valid = (session: ReturnType<typeof startPlaceStudy>) =>
  validStudy({ version: 1, settings: defaultSettings, session });

it("persists, grades and completes a one-pass country/place review, clearing the previous pin", () => {
  let s = startPlaceStudy([country, place, country]);
  expect(s.pool).toEqual([country.id, place.id]);
  expect(valid(s)).toBe(true);
  expect(studyReducer(s, { type: "submit" }, [land])).toBe(s);
  s = studyReducer(s, { type: "pin", lat: 0, lng: 0 }, [land]);
  expect(valid(JSON.parse(JSON.stringify(s)))).toBe(true);
  s = studyReducer(s, { type: "submit" }, [land]);
  expect(s.history[0].correct).toBe(true);
  s = studyReducer(s, { type: "next" });
  expect(s.pin).toBeUndefined();
  expect(s.prompt.place).toEqual(place);
  s = studyReducer(s, { type: "pin", lat: -30, lng: -80 });
  s = studyReducer(s, { type: "submit" });
  expect(s.history[1].correct).toBe(false);
  expect(studyComplete(s)).toBe(true);
  s = studyReducer(s, { type: "next" });
  expect(s.phase).toBe("summary");
  expect(
    validStudy(
      archiveStudy({
        version: 1,
        settings: defaultSettings,
        session: { ...s, id: "review-session" },
      }),
    ),
  ).toBe(true);
});
it("rejects corrupted target snapshots and invalid coordinates", () => {
  const s = startPlaceStudy([place]);
  expect(studyReducer(s, { type: "pin", lat: Infinity, lng: 0 })).toBe(s);
  expect(valid({ ...s, pin: { lat: 91, lng: 0 } })).toBe(false);
  expect(
    valid({ ...s, prompt: { ...s.prompt, place: { ...place, lat: 50 } } }),
  ).toBe(false);
  expect(
    validStudy({
      version: 1,
      settings: defaultSettings,
      session: { ...s, id: 42 },
    }),
  ).toBe(false);
});
it("grades state targets against state boundaries rather than their parent country", () => {
  const state = US_STATES[0];
  const point = interiorAnchor(state);
  const session = startPlaceStudy([
    { id: "state-target", name: state.name, ...point, regionId: state.id },
  ]);
  const inside = studyReducer(
    studyReducer(session, { type: "pin", ...point }),
    { type: "submit" },
  );
  expect(inside.history[0].correct).toBe(true);
  const outside = studyReducer(
    studyReducer(session, { type: "pin", lat: 0, lng: 0 }),
    { type: "submit" },
  );
  expect(outside.history[0].correct).toBe(false);
});
it("retains early misses, deduplicates countries and reviews only Pinpoint scores below 500", () => {
  const run = startNeighborRun([
    { id: "pair", countries: ["a", "b"], answer: "land" },
  ]);
  const miss = { ids: ["land"], point: { lat: 0, lng: 0 }, correct: false };
  run.history = Array.from({ length: 64 }, () => ({ ...miss, correct: true }));
  run.review = [miss, miss];
  expect(validNeighborRun(run)).toBe(true);
  expect(minigameReviewTargets("border-run", run, [land])).toHaveLength(1);
  const weak = { ...miss, ids: [], correct: true, points: 499, target: place };
  run.review = [
    weak,
    { ...weak, points: 500, target: { ...place, id: "other" } },
  ];
  expect(minigameReviewTargets("pinpoint", run, [land])).toEqual([place]);
});
it.each([
  "shared-neighbors",
  "missing-borders",
  "border-run",
  "pinpoint",
] as const)(
  "exports an answer-free %s result with its own link and preview illustration",
  (kind) => {
    const run = {
      ...startNeighborRun([
        { id: "x", countries: ["a", "b"], answer: "private" },
      ]),
      answered: 10,
      correct: 7,
      points: 7200,
    };
    const result = minigameResult(kind, run, false),
      text = minigameResultText(result);
    expect(text).toContain(`/minigames/${kind}`);
    expect(text).toContain("Custom rules");
    expect(text).not.toContain("private");
    const ctx = {
      fillRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      arc: vi.fn(),
      setLineDash: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const image = {} as CanvasImageSource;
    paintMinigameResult(ctx, result, "survey", image);
    expect(ctx.fillText).toHaveBeenCalledWith(
      kind === "pinpoint" ? "7,200" : "7",
      80,
      825,
      310,
    );
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 80, 205, 1040, 520);
  },
);
