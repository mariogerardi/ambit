import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import {
  DEMO_HOLD_MS,
  DEMO_PINPOINT_RADIUS_KM,
  DEMO_QUESTION_MS,
  DEMO_REVEAL_MS,
  demoWorld,
  minigameExamples,
  tourDuration,
  tourFrame,
} from "../src/minigames/minigameDemos";
import { defaultMinigameSettings } from "../src/minigames/minigameSettings";
import { pinpointPairs } from "../src/minigames/extraGames";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const library = minigameExamples(regions);
it("prepares only the requested game's previews and preserves already prepared examples", () => {
  const world = [...regions];
  const shared = minigameExamples(world, "shared-neighbors");
  expect(shared["shared-neighbors"].length).toBeGreaterThan(0);
  expect(shared["missing-borders"]).toEqual([]);
  expect(shared["border-run"]).toEqual([]);
  expect(shared.pinpoint).toEqual([]);
  const pinpoint = minigameExamples(world, "pinpoint");
  expect(pinpoint["shared-neighbors"]).toBe(shared["shared-neighbors"]);
  expect(pinpoint.pinpoint.length).toBeGreaterThan(0);
  expect(pinpoint["missing-borders"]).toEqual([]);
  expect(
    Object.values(minigameExamples(world)).every(
      (examples) => examples.length > 0,
    ),
  ).toBe(true);
});

it("frames Pinpoint previews around the highlighted country instead of the hidden target", () => {
  for (const example of library.pinpoint) {
    const p = (
      example.pair as import("../src/minigames/extraGames").PinpointPair
    ).place!;
    expect(example.focus).not.toMatchObject({ lat: p.lat, lng: p.lng });
    expect(example.focus.altitude).toBeGreaterThan(0.25);
    const country = example.context.targets.get(p.parentId!)!;
    expect(
      demoWorld(regions, example, "question", 0, false, 0).states[country.id],
    ).toBe("hinted");
    expect(example.focus.altitude).toBeLessThan(1.65);
  }
});
it("uses evaluated, geographically distinct examples and keeps the demo landmark out of live decks", () => {
  for (const examples of Object.values(library)) {
    expect(examples.length).toBeGreaterThanOrEqual(3);
    expect(examples.length).toBeLessThanOrEqual(5);
    expect(new Set(examples.map((example) => example.id)).size).toBe(
      examples.length,
    );
    for (const example of examples) {
      expect(example.reveal.phase).toBe("feedback");
      expect(example.reveal.answers[0].correct).toBe(true);
      expect(example.reveal.answers[0].roundId).toBe(example.id);
    }
  }
  expect(
    library["missing-borders"].some((example) =>
      ["wurl:MWI", "wurl:MOZ"].every((id) =>
        example.pair.countries.includes(id),
      ),
    ),
  ).toBe(true);
  expect(library.pinpoint.map((example) => example.title)).toEqual([
    "Shibuya Crossing",
    "Taj Mahal",
    "Addis Ababa",
    "Eiffel Tower",
    "Mexico City",
  ]);
  expect(library["border-run"].map((example) => example.pair.answer)).toEqual([
    "3",
    "3",
    "4",
    "5",
  ]);
  expect(
    pinpointPairs(regions, defaultMinigameSettings).some(
      (pair) => pair.name === "Shibuya Crossing",
    ),
  ).toBe(false);
});

it("keeps moving west through every example and rejoins each full rotation without a jump", () => {
  for (const source of Object.values(library)) {
    const examples = [...source].sort((a, b) => b.focus.lng - a.focus.lng);
    const duration = tourDuration(examples);
    const stages = new Set<string>();
    let previous = tourFrame(examples, 0);
    for (let time = 100; time <= duration * 2; time += 100) {
      const frame = tourFrame(examples, time);
      expect(frame.focus.lng).toBeLessThan(previous.focus.lng);
      expect(previous.focus.lng - frame.focus.lng).toBeLessThan(5);
      expect(Math.abs(frame.focus.lat - previous.focus.lat)).toBeLessThan(4);
      stages.add(`${frame.index}:${frame.phase}`);
      previous = frame;
    }
    expect(tourFrame(examples, duration).focus.lng).toBeCloseTo(
      tourFrame(examples, 0).focus.lng - 360,
      8,
    );
    for (let i = 0; i < examples.length; i++)
      for (const phase of source[0].kind === "missing-borders"
        ? ["question", "reveal", "travel"]
        : ["question", "action", "reveal", "travel"])
        expect(stages.has(`${i}:${phase}`)).toBe(true);
  }
});

it("clears markers and merged geography while restoring default borders between examples", () => {
  for (const source of Object.values(library)) {
    const view = demoWorld(
      regions,
      source[0],
      "reveal",
      source[0].steps,
      false,
      0,
    );
    expect(view.regionInteraction).toBe(false);
    expect(view.selectDisabled).toBe(true);
    const travel = demoWorld(regions, source[0], "travel", 0, false, 0);
    if (source[0].kind !== "missing-borders") {
      expect(travel.regions).toBe(regions);
      expect(travel.states).toEqual({});
    }
    expect(travel.places).toEqual([]);
    expect(travel.overlays).toEqual([]);
    expect(travel.clueLocators).toEqual([]);
    expect(travel.showBorders).toBe(true);
    expect(travel.borderRegionIds).toBeUndefined();
  }
  const first = library["missing-borders"][0],
    second = library["missing-borders"][1];
  const next = demoWorld(regions, second, "question", 0, false, 0);
  expect(next.regions?.some((region) => region.id === first.pair.answer)).toBe(
    true,
  );
});

it("joins fast and slow motion continuously, including zoom and the final wrap", () => {
  for (const source of Object.values(library)) {
    const examples = [...source].sort((a, b) => b.focus.lng - a.focus.lng);
    const duration = tourDuration(examples);
    // Detect each phase boundary, then compare camera velocity on either side.
    let last = tourFrame(examples, 0);
    for (let time = 1; time <= duration; time++) {
      const frame = tourFrame(examples, time);
      if (
        (frame.phase === "travel" && last.phase !== "travel") ||
        frame.index !== last.index ||
        frame.cycle !== last.cycle
      ) {
        const before = tourFrame(examples, time - 2).focus;
        const middle = tourFrame(examples, time - 1).focus;
        const after = tourFrame(examples, time + 1).focus;
        expect(
          Math.abs(middle.lng - before.lng - (after.lng - frame.focus.lng)),
        ).toBeLessThan(0.0001);
        expect(
          Math.abs(
            middle.altitude! -
              before.altitude! -
              (after.altitude! - frame.focus.altitude!),
          ),
        ).toBeLessThan(0.0001);
      }
      last = frame;
    }
    const frames = [
      tourFrame(examples, 3000),
      tourFrame(examples, DEMO_HOLD_MS + 2000),
    ];
    expect(frames[0].focus.altitude).toBeLessThan(frames[1].focus.altitude!);
  }
});

it("drops the same pin through feedback and introduces Pinpoint rings from the bullseye outward", () => {
  for (const kind of ["shared-neighbors", "pinpoint"] as const) {
    const example = library[kind][0];
    const action = demoWorld(regions, example, "action", 0, false, 0);
    const reveal = demoWorld(
      regions,
      example,
      "reveal",
      example.steps,
      false,
      0,
    );
    const pin = action.places.find((p) => p.kind === "pin")!;
    expect(pin.dropInMs).toBe(340);
    expect(reveal.places.some((p) => p.id === pin.id)).toBe(true);
  }
  const example = library.pinpoint[0];
  const radii: number[] = [];
  for (let rings = 1; rings <= 3; rings++) {
    const view = demoWorld(regions, example, "reveal", 1, false, 0, rings);
    const circles = view.overlays!.filter((o) => o.type === "circle");
    expect(circles).toHaveLength(rings);
    radii.push(circles.at(-1)!.radiusKm);
    expect(circles.every((o) => "fadeInMs" in o && o.fadeInMs === 240)).toBe(
      true,
    );
  }
  expect(radii[0]).toBeCloseTo(radii[2] / 3);
  expect(radii[1] - radii[0]).toBeCloseTo(radii[0]);
  expect(radii[2] - radii[1]).toBeCloseTo(radii[0]);
  expect(radii[2]).toBeLessThanOrEqual(DEMO_PINPOINT_RADIUS_KM);
  expect(radii[2]).toBeLessThan(700);
  const outerRadii = library.pinpoint.map((e) => {
    const view = demoWorld(regions, e, "reveal", 1, false, 0);
    return view.overlays!.filter((o) => o.type === "circle").at(-1)!.radiusKm;
  });
  expect(new Set(outerRadii).size).toBeGreaterThan(1);
  expect(radii[1]).toBeGreaterThan(radii[0]);
  expect(radii[2]).toBeGreaterThan(radii[1]);
  expect(tourFrame(library["border-run"], DEMO_REVEAL_MS + 160).step).toBe(1);
  expect(tourFrame(library["border-run"], DEMO_REVEAL_MS + 270).step).toBe(2);
});

it.each([
  ["shared-neighbors", "surface"],
  ["missing-borders", "disabled"],
  ["border-run", "surface"],
  ["pinpoint", "disabled"],
] as const)(
  "uses %s's search eligibility for its before/after preview background",
  (kind, before) => {
    for (const example of library[kind]) {
      const occupied = new Set([
        ...example.pair.countries,
        example.pair.answer,
        ...(example.searchIds ?? []),
      ]);
      const background = regions.find((r) => !occupied.has(r.id))!;
      expect(
        demoWorld(regions, example, "question", 0, false, 0).states[
          background.id
        ],
      ).toBe(before);
      expect(
        demoWorld(regions, example, "reveal", example.steps, false, 0).states[
          background.id
        ],
      ).toBe("disabled");
    }
  },
);

it("gives each question time before answering and frames the actual examples at regional scale", () => {
  for (const examples of Object.values(library)) {
    expect(tourFrame(examples, 4200).phase).toBe("question");
    expect(tourFrame(examples, DEMO_QUESTION_MS).phase).toBe(
      examples[0].kind === "missing-borders" ? "question" : "action",
    );
    expect(tourFrame(examples, DEMO_REVEAL_MS).phase).toBe("reveal");
    for (const example of examples) {
      const view = tourFrame([example], 8000).focus;
      expect(view.altitude).toBeCloseTo(
        (example.revealFocus ?? example.focus).altitude!,
      );
      expect(example.focus.altitude).toBeLessThan(1.2);
    }
  }
  for (const example of library.pinpoint) {
    const target = (
      example.pair as import("../src/minigames/extraGames").PinpointPair
    ).place!;
    expect(example.action.pin).toMatchObject({
      lat: target.lat,
      lng: target.lng,
    });
    for (const reduced of [false, true]) {
      const view = demoWorld(regions, example, "reveal", 1, reduced, 0);
      expect(view.places.some((p) => p.id.startsWith("pinpoint:band:"))).toBe(
        false,
      );
    }
  }
});

it("keeps the route finish highlighted until the animated route reaches it", () => {
  for (const example of library["border-run"]) {
    const route =
      example.pair as import("../src/minigames/extraGames").RoutePair;
    const finish = route.route.at(-1)!;
    const question = demoWorld(regions, example, "question", 0, false, 0);
    for (let step = 0; step < example.steps; step++) {
      expect(question.states[finish]).toBe("clue");
      const reveal = demoWorld(regions, example, "reveal", step, false, 0);
      expect(reveal.states[finish]).toBe(question.states[finish]);
    }
    expect(
      demoWorld(regions, example, "reveal", example.steps, false, 0).states[
        finish
      ],
    ).toBe("correct");
  }
});

it("searches compact neighborhoods and closes in westward only after revealing, with future seams already hidden", () => {
  const examples = library["missing-borders"];
  for (const example of examples) {
    expect(example.searchIds!.length).toBeGreaterThanOrEqual(6);
    expect(example.searchIds!.length).toBeLessThanOrEqual(10);
    expect(example.focus.altitude).toBeGreaterThan(
      example.revealFocus!.altitude!,
    );
    const before = tourFrame([example], DEMO_REVEAL_MS - 1).focus;
    const after = tourFrame([example], DEMO_REVEAL_MS + 2300).focus;
    expect(before.altitude).toBe(example.focus.altitude);
    expect(after.altitude).toBeCloseTo(example.revealFocus!.altitude!);
    expect(after.lng).toBeLessThan(before.lng);
    const travel = demoWorld(regions, example, "travel", 0, false, 0);
    const question = demoWorld(regions, example, "question", 0, false, 0);
    expect(travel.regions).toBe(question.regions);
    for (const upcoming of examples) {
      expect(travel.regions.some((r) => r.id === upcoming.pair.answer)).toBe(
        true,
      );
      expect(
        travel.regions.some((r) => upcoming.pair.countries.includes(r.id)),
      ).toBe(false);
    }
    const reveal = demoWorld(regions, example, "reveal", 1, false, 0);
    expect(reveal.regions.some((r) => r.id === example.pair.answer)).toBe(
      false,
    );
    expect(
      example.pair.countries.every((id) =>
        reveal.regions.some((r) => r.id === id),
      ),
    ).toBe(true);
  }
});

it("skips Missing Borders selection colors and restores normal colors without resurrecting the selected composite", () => {
  for (const example of library["missing-borders"]) {
    const before = demoWorld(regions, example, "action", 0, false, 0);
    expect(before.states[example.pair.answer]).not.toBe("selected");
    const leaving = demoWorld(regions, example, "travel", 0, false, 0, 0, true);
    const reveal = demoWorld(regions, example, "reveal", 1, false, 0);
    expect(before.regionTransitionKey).toBe(leaving.regionTransitionKey);
    expect(reveal.regionTransitionKey).toBe(before.regionTransitionKey);
    expect(reveal.regionReveal).toMatchObject({
      ids: example.pair.countries,
      clueIds: [],
      durationMs: 160,
    });
    expect(
      demoWorld(regions, example, "reveal", 1, false, 1).regionReveal!.key,
    ).not.toBe(reveal.regionReveal!.key);
    expect(leaving.states).toEqual({});
    expect(
      example.pair.countries.every((id) =>
        leaving.regions.some((r) => r.id === id),
      ),
    ).toBe(true);
    expect(leaving.regions.some((r) => r.id === example.pair.answer)).toBe(
      false,
    );
  }
});
