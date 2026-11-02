import { readFileSync } from "node:fs";
import { Color, PerspectiveCamera } from "three";
import { afterEach, expect, it, vi } from "vitest";
import { RegionFades, RegionScene } from "../src/globe/regionFades";
import { BorderFades } from "../src/globe/borderFades";
import { geographicPointVisible } from "../src/globe/visibility";
import {
  placeLabelPriority,
  placeLabelStyle,
  placeMarkerSize,
} from "../src/globe/placeLabels";
import { circleStyle, MapOverlays } from "../src/globe/overlays";
import { MECHANIC_RECIPES } from "../src/game/recipes";
import {
  createQuestionContext,
  selectableIds,
} from "../src/game/questionPreparation";
import { questionPlaces } from "../src/game/presentation";
import { constructionScene } from "../src/game/constructionScene";
import { journeyWorld } from "../src/app/journeyWorld";
import { startRound, gameReducer } from "../src/game/state";
import { reviewedBearing } from "../src/game/compassBearing";
import type { PlaceFeature, RegionFeature } from "../src/geography/types";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { SMALL_WONDERS_JOURNEY } from "../src/game/smallWondersJourney";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const recipe = (mode: string) => MECHANIC_RECIPES.find((q) => q.mode === mode)!;
const definition = (q: ReturnType<typeof recipe>) => ({
  id: q.id,
  title: q.title,
  description: "Shared presentation test",
  rounds: [q],
});
afterEach(() => vi.restoreAllMocks());

it("fades after visibility within a question, but clears prior answer colors on rewind", () => {
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const scene = new RegionScene(),
    fills = new RegionFades();
  try {
    const play = scene.scope("question-1", "playing");
    const material = fills.transition("a", "#888888", 160, play);
    const reveal = scene.scope("question-1", "feedback");
    expect(reveal).toBe(play);
    fills.transition("a", "#78dfaa", 160, reveal, true);
    clock.mockReturnValue(10000);
    fills.view(() => false);
    expect(material.color).toEqual(new Color("#888888"));
    expect(fills.needsRefresh()).toBe(false);
    fills.view(() => true);
    clock.mockReturnValue(10080);
    fills.view(() => true);
    expect(material.color).toEqual(
      new Color("#888888").lerp(new Color("#78dfaa"), 0.5),
    );
    const rewind = scene.scope("question-1", "playing");
    expect(rewind).not.toBe(reveal);
    fills.transition("a", "#888888", 160, rewind);
    expect(material.color).toEqual(new Color("#888888"));
    expect(fills.needsRefresh()).toBe(false);
  } finally {
    fills.dispose();
  }
});

it("waits for border visibility but finishes immediately for reduced motion", () => {
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const borders = new BorderFades(),
    line = { visible: false, material: { opacity: 0 } };
  borders.update(line, 0, false, "q");
  borders.update(line, 1, false, "q", true);
  clock.mockReturnValue(5000);
  borders.view(() => false);
  expect(line.material.opacity).toBe(0);
  expect(borders.needsRefresh()).toBe(false);
  borders.view(() => true);
  clock.mockReturnValue(5080);
  borders.view(() => true);
  expect(line.material.opacity).toBeCloseTo(0.5);
  borders.update(line, 1, true, "q", true);
  expect(line.material.opacity).toBe(1);
  expect(borders.needsRefresh()).toBe(false);
  borders.dispose();
});

it("requires a reveal anchor to clear the horizon, viewport and UI", () => {
  const camera = new PerspectiveCamera(50, 1, 1, 1000);
  camera.position.set(0, 0, 300);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  expect(
    geographicPointVisible({ lat: 0, lng: 0 }, camera, 800, 800, 100),
  ).toBe(true);
  expect(
    geographicPointVisible({ lat: 0, lng: 180 }, camera, 800, 800, 100),
  ).toBe(false);
  expect(
    geographicPointVisible({ lat: 0, lng: 0 }, camera, 800, 800, 100, [
      { left: 350, right: 450, top: 350, bottom: 450 },
    ]),
  ).toBe(false);
  expect(geographicPointVisible({ lat: 0, lng: 0 }, camera, 0, 800, 100)).toBe(
    false,
  );
});

it("ranks labels by role and keeps overview discoveries quieter than active responses", () => {
  const point: PlaceFeature = {
    id: "city",
    name: "City",
    kind: "city",
    sourceId: "test",
    lat: 0,
    lng: 0,
  };
  const reference = {
    ...point,
    displayRole: "reference" as const,
    priority: 1e9,
  };
  const answer = { ...point, visualState: "answer" as const };
  const measure = {
    ...point,
    labelTypography: "numeric" as const,
    visualState: "correct" as const,
  };
  expect(placeLabelPriority(answer)).toBeGreaterThan(
    placeLabelPriority(reference),
  );
  expect(placeLabelPriority(reference)).toBeGreaterThan(
    placeLabelPriority(measure),
  );
  expect(placeLabelStyle(answer).textHeight).toBeGreaterThan(
    placeLabelStyle(reference).textHeight,
  );
  expect(placeLabelStyle(reference).textHeight).toBeGreaterThan(
    placeLabelStyle(measure).textHeight,
  );
  expect(
    placeMarkerSize({ ...point, kind: "pin", visualState: "visited" }),
  ).toBeLessThan(
    placeMarkerSize({ ...point, kind: "pin", visualState: "correct" }),
  );
});

it("keeps the active labeled pin visible at its actual location and emphasizes its slot", () => {
  const q = recipe("geo-multipin");
  if (
    q.rule.type !== "labeled-region-pin-set" ||
    q.constructionExample?.kind !== "pins"
  )
    throw Error("Expected labeled pins recipe");
  const slot = q.rule.slots[0];
  const scene = constructionScene(
    q,
    {
      ...startRound(q),
      construction: q.constructionExample,
      activePinSlot: slot.id,
    },
    false,
  );
  const active = scene.places.find((p) => p.name === slot.label)!;
  const placed = scene.places.find((p) => p.name !== slot.label)!;
  expect(active.editing).toBe(true);
  expect({ lat: active.lat, lng: active.lng }).toEqual(
    q.constructionExample.pins[slot.id],
  );
  expect(placeMarkerSize(active)).toBeGreaterThan(placeMarkerSize(placed));
  expect(scene.places).toHaveLength(q.rule.slots.length);
});

it("marks assisted unordered city picks without exposing anonymous names", () => {
  const base = recipe("city-multiple"),
    context = createQuestionContext(regions, [], definition(base));
  const ids = selectableIds(base, context).slice(0, base.count);
  const q = {
    ...base,
    guidance: {
      hint: "Hint",
      assist: { text: "Assistance", fixedSelections: [ids[0]] },
    },
  };
  const game = {
    ...startRound(q),
    selectedIds: ids,
    help: { [q.id]: "assisted" as const },
  };
  const places = questionPlaces(q, context, "playing", "", false, game);
  expect(places.find((p) => p.id === ids[0])?.assisted).toBe(true);
  for (const id of ids) {
    const p = places.find((p) => p.id === id)!;
    expect(p.markerBadge).toBe("✓");
    if (!q.disclosure.namedChoices && !q.disclosure.committedNames)
      expect(p.name).toBe("");
  }
});

it("annotates compass error from saved evidence, only after submission", () => {
  const q = recipe("compass-bearing"),
    journey = definition(q),
    context = createQuestionContext(regions, [], journey);
  const play = startRound(q);
  expect(
    journeyWorld(regions, journey, play, context).places.some((p) =>
      p.id.startsWith("bearing-error-label:"),
    ),
  ).toBe(false);
  const graded = gameReducer(
      { ...play, text: "90" },
      { type: "submit" },
      journey,
      context,
    ),
    snapshot = reviewedBearing(q, graded)!;
  const view = journeyWorld(regions, journey, graded, context);
  expect(
    view.places.find((p) => p.id.startsWith("bearing-error-label:")),
  ).toMatchObject({
    name: `${Number(snapshot.error.toFixed(1))}° off`,
    markerHidden: true,
    markerRole: "annotation",
  });
  expect(
    view.overlays?.find((o) => o.id.startsWith("bearing-guess:")),
  ).toMatchObject({ type: "path", purpose: "comparison", dashed: true });
  expect(graded.answers[0].bearing).toEqual(snapshot);
});

it("styles circles by purpose, preserving geography and a distinct example pattern", () => {
  const base = {
    id: "circle",
    type: "circle" as const,
    center: { lat: 0, lng: 0 },
    radiusKm: 50,
    purpose: "construction" as const,
  };
  expect(circleStyle(base)).toEqual(circleStyle({ ...base, radiusKm: 5000 }));
  const overlays = new MapOverlays();
  try {
    const line = overlays.get({ ...base, example: true }, 100)
      .children[0] as LineSegments2;
    expect(line.material.dashed).toBe(true);
    expect(line.geometry.getAttribute("instanceStart").count).toBeGreaterThan(
      0,
    );
    expect(base.radiusKm).toBe(50);
  } finally {
    overlays.dispose();
  }
});

it("frames both compass endpoints and the submitted direction instead of only the destination", () => {
  const journey = SMALL_WONDERS_JOURNEY;
  const roundIndex = journey.rounds.findIndex(
    (q) => q.id === "small-wonders-fox-bearing-v1",
  );
  const q = journey.rounds[roundIndex];
  const context = createQuestionContext(regions, [], journey);
  const game = gameReducer(
    { ...startRound(q, roundIndex), text: "149" },
    { type: "submit" },
    journey,
    context,
  );
  const evidence = reviewedBearing(q, game)!;
  const focus = journeyWorld(regions, journey, game, context).focus!;
  const camera = new PerspectiveCamera(50, 1, 1, 1000);
  const lat = (focus.lat * Math.PI) / 180,
    lng = (focus.lng * Math.PI) / 180;
  const distance = 100 * (1 + (focus.altitude ?? 0.8));
  camera.position.set(
    Math.cos(lat) * Math.sin(lng) * distance,
    Math.sin(lat) * distance,
    Math.cos(lat) * Math.cos(lng) * distance,
  );
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  expect(geographicPointVisible(evidence.origin, camera, 800, 800, 100)).toBe(
    true,
  );
  expect(
    geographicPointVisible(evidence.destination, camera, 800, 800, 100),
  ).toBe(true);
  expect(focus).not.toEqual(q.feedbackFocus);
});
