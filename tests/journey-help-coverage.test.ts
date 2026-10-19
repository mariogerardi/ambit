import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { JOURNEYS } from "../src/game/journeys";
import { createQuestionContext } from "../src/game/questionPreparation";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { pinDistance, pinInside } from "../src/game/answerTargets";
import { regionBorderVisible } from "../src/globe/outlines";
import { playRegionStyle } from "../src/globe/themes";
import { playColors } from "../src/theme/playColors";
import type { RegionFeature } from "../src/geography/types";
import { auditJourney } from "../src/game/journeyAudit";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
function setup(id: string) {
  const journey = JOURNEYS.find((j) => j.rounds.some((q) => q.id === id))!;
  const roundIndex = journey.rounds.findIndex((q) => q.id === id);
  const q = journey.rounds[roundIndex];
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const playing: GameState = { ...initialGame, phase: "playing", roundIndex };
  const scene = (game = playing) =>
    journeyWorld(regions, journey, game, context);
  const assisted: GameState = { ...playing, help: { [id]: "assisted" } };
  return { q, journey, context, playing, assisted, scene };
}

describe("catalog help and reference geography", () => {
  for (const journey of JOURNEYS) {
    it(`${journey.id}: provides help and useful pin uncertainty`, () => {
      const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
      for (const [roundIndex, q] of journey.rounds.entries()) {
        expect(q.guidance?.hint.trim(), q.id).toBeTruthy();
        expect(q.guidance?.assist?.text.trim(), q.id).toBeTruthy();
        const game: GameState = {
          ...initialGame,
          phase: "playing",
          roundIndex,
          help: { [q.id]: "assisted" },
        };
        const view = journeyWorld(regions, journey, game, context);
        for (const r of view.regions.filter(
          (r) => view.states[r.id] === "hinted",
        ))
          expect(
            regionBorderVisible(r, view),
            `${q.id}: reference ${r.id}`,
          ).toBe(true);
        if (q.mode !== "pin") continue;
        for (const p of q.guidance?.assist?.places ?? []) {
          if (p.markerHidden) continue; // Area labels are not places the player can copy.
          const response = { ...game, pin: { lat: p.lat, lng: p.lng } };
          if (q.rule.type === "pin-inside")
            expect(pinInside(q, context, response), `${q.id}: ${p.name}`).toBe(
              false,
            );
          if (q.rule.type === "pin-distance")
            expect(
              pinDistance(q, response),
              `${q.id}: ${p.name}`,
            ).toBeGreaterThan(q.rule.radiusKm);
        }
      }
    });
  }
  it("retains Zambia and Zimbabwe as blue, outlined references through both help stages", () => {
    const { q, scene, playing, assisted } = setup("shared-names-victoria");
    for (const game of [
      playing,
      { ...playing, help: { [q.id]: "hinted" as const } },
      assisted,
    ]) {
      const view = scene(game);
      for (const id of ["wurl:ZMB", "wurl:ZWE"]) {
        expect(view.states[id]).toBe("hinted");
        expect(
          regionBorderVisible(view.regions.find((r) => r.id === id)!, view),
        ).toBe(true);
        expect(playRegionStyle(id, view.states[id]).stroke).toBe(
          playColors()["context-outline"],
        );
        expect(view.selectableRegionIds ?? []).not.toContain(id);
      }
    }
  });
  it("shows only given reference outlines before assistance, then enables state boundaries without a route", () => {
    const { scene, assisted } = setup("california-missouri-crossings-v2");
    const play = scene(),
      help = scene(assisted);
    for (const id of ["wurl:USA-CA", "wurl:USA-MO"])
      expect(
        regionBorderVisible(play.regions.find((r) => r.id === id)!, play),
      ).toBe(true);
    const az = play.regions.find((r) => r.id === "wurl:USA-AZ")!;
    expect(regionBorderVisible(az, play)).toBe(false);
    expect(regionBorderVisible(az, help)).toBe(true);
    expect(help.routes).toEqual([]);
  });
  it("cleans up help-only markers and preserves latitude lines after submission", () => {
    const { q, scene, playing, assisted, journey, context } = setup(
      "latitude-africa-amman-v1",
    );
    expect(
      scene(assisted).places.some((p) => p.id.startsWith("help-label:")),
    ).toBe(true);
    expect(
      scene(playing).places.some((p) => p.id.startsWith("help-label:")),
    ).toBe(false);
    const feedback = gameReducer(
      { ...assisted, text: "Rabat" },
      { type: "submit" },
      journey,
      context,
    );
    expect(feedback.answers.at(-1)?.correct).toBe(true);
    expect(
      scene(feedback).places.some((p) => p.id.startsWith("help-label:")),
    ).toBe(false);
    expect(scene(feedback).overlays).toContainEqual(q.overlays![0]);
  });
  it("does not recolor an unchanged open answer field when help only adds a reference", () => {
    const { journey, context, playing, q } = setup(
      "exceptions-double-landlocked",
    );
    const copy = {
      ...journey,
      rounds: journey.rounds.map((r) =>
        r.id === q.id
          ? {
              ...r,
              guidance: {
                hint: "Look inland.",
                assist: { text: "Inspect the surrounding region." },
              },
            }
          : r,
      ),
    };
    const view = journeyWorld(
      regions,
      copy,
      { ...playing, help: { [q.id]: "assisted" } },
      context,
    );
    expect(view.states["wurl:USA"]).toBe("surface");
  });
});

it("pinpoints pending identity leaks when a linked anonymous choice loses its disclosure rule", () => {
  const { q, journey, context, playing, scene } = setup(
    "canada-bilingual-province-v1",
  );
  const before = scene();
  const pending = scene(
    gameReducer(
      playing,
      { type: "select", id: "province:nb" },
      journey,
      context,
    ),
  );
  expect(pending.states).toEqual(before.states);
  expect(pending.places).toEqual(before.places);
  const unprotected = {
    ...q,
    scenes: undefined,
    map: { ...q.map!, candidateRole: undefined, selectionFeedback: undefined },
  };
  expect(
    auditJourney({ ...journey, rounds: [unprotected] }, regions).errors,
  ).toContainEqual(
    expect.stringContaining(
      `Pending response reveals anonymous geography: ${q.id}`,
    ),
  );
});
