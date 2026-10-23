import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geoArea, geoContains } from "d3-geo";
import type { RegionFeature } from "../src/geography/types";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { MISSING_BORDERS_TWO_JOURNEY as journey } from "../src/game/missingBordersTwoJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import { regionAnswerId } from "../src/game/presentation";
import { initialGame, gameReducer } from "../src/game/state";
import type { GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { JOURNEY_INDEX, loadJourney } from "../src/game/journeyRegistry";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, [], journey);
const playing = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const cases = [
  ["01-india-nepal", ["IND", "NPL"]],
  ["02-indonesia-papua-new-guinea", ["IDN", "PNG"]],
  ["03-costa-rica-panama", ["CRI", "PAN"]],
  ["04-moldova-romania", ["MDA", "ROU"]],
  ["05-rwanda-burundi", ["RWA", "BDI"]],
] as const;

describe("Missing Borders II", () => {
  it.each(cases)(
    "dissolves and reveals the requested pair: %s",
    (slug, codes) => {
      const question = journey.rounds.find(
        (q) => q.id === `missing-borders-two-${slug}`,
      )!;
      const index = journey.rounds.indexOf(question);
      if (
        question.rule.type !== "merged-region" ||
        question.selection.type !== "ids"
      )
        throw Error("Expected a merged-territory question");
      const rule = question.rule;
      const members = codes.map(
        (code) => world.find((r) => r.id === `wurl:${code}`)!,
      );
      expect(rule.memberIds).toEqual(members.map((r) => r.id));
      const scene = journeyWorld(world, journey, playing(index), context);
      const merged = scene.regions.find((r) => r.id === rule.targetId)!;
      expect(scene.regions.some((r) => rule.memberIds.includes(r.id))).toBe(
        false,
      );
      expect(geoArea(sphericalGeometry(merged.geometry))).toBeCloseTo(
        members.reduce(
          (sum, r) => sum + geoArea(sphericalGeometry(r.geometry)),
          0,
        ),
        10,
      );
      expect(scene.regionNames).toBe("none");
      expect(scene.places).toEqual([]);
      for (const member of members)
        expect(regionAnswerId(question, member)).toBe(rule.targetId);
      for (const selected of question.selection.ids) {
        const answered = gameReducer(
          playing(index),
          { type: "select", id: selected },
          journey,
          context,
        );
        expect(answered.phase).toBe("feedback");
        expect(answered.answers.at(-1)?.correct).toBe(
          selected === rule.targetId,
        );
        const reveal = journeyWorld(world, journey, answered, context);
        expect(reveal.regions).toBe(world);
        expect(reveal.places.map((p) => p.name)).toEqual(
          members.map((r) => r.name),
        );
        for (const id of rule.memberIds)
          expect(reveal.states[id]).toBe(
            selected === rule.targetId ? "correct" : "answer",
          );
      }
      const hinted = gameReducer(
        playing(index),
        { type: "request-hint" },
        journey,
        context,
      );
      const assisted = gameReducer(
        hinted,
        { type: "request-assist" },
        journey,
        context,
      );
      const helped = journeyWorld(world, journey, assisted, context);
      expect(helped.regions).toBe(scene.regions);
      expect(helped.places).toEqual([]);
      expect(
        Object.values(helped.states).filter((state) => state === "selectable"),
      ).toHaveLength(4);
      expect(helped.states[rule.targetId]).toBe("selectable");
    },
  );

  it("retains both sides of New Guinea and Indonesia's western archipelago in the same target", () => {
    const question = journey.rounds.find(
      (q) => q.id === "missing-borders-two-02-indonesia-papua-new-guinea",
    )!;
    if (question.rule.type !== "merged-region")
      throw Error("Expected a composite");
    const targetId = question.rule.targetId;
    const scene = journeyWorld(
      world,
      journey,
      playing(journey.rounds.indexOf(question)),
      context,
    );
    const merged = scene.regions.find((r) => r.id === targetId)!;
    for (const [lng, lat] of [
      [138, -4],
      [145, -6],
      [101, 0],
      [110, -7.5],
    ])
      expect(
        geoContains(sphericalGeometry(merged.geometry), [lng, lat]),
        `${lng}, ${lat}`,
      ).toBe(true);
  });

  it("restores all ten countries at completion and loads as a separate edition", async () => {
    const completed = journeyWorld(
      world,
      journey,
      { ...playing(4), phase: "finished" },
      context,
    );
    const expected = cases.flatMap(([, codes]) =>
      codes.map((code) => `wurl:${code}`),
    );
    expect(completed.regions).toBe(world);
    expect(completed.showBorders).toBe(true);
    expect(
      Object.entries(completed.states)
        .filter(([, state]) => state === "visited")
        .map(([id]) => id)
        .sort(),
    ).toEqual([...expected].sort());
    expect(completed.places).toHaveLength(expected.length);
    expect(journey.completion?.views).toHaveLength(cases.length);
    expect(JOURNEYS.find((entry) => entry.id === journey.id)).toBe(journey);
    expect(JOURNEY_INDEX.find((entry) => entry.id === journey.id)?.path).toBe(
      "/journey/missing-borders-two",
    );
    expect(journeyPath(journey.id)).toBe("/journey/missing-borders-two");
    expect(await loadJourney(journey.id)).toBe(journey);
    expect(
      JOURNEYS.find((entry) => entry.id === "missing-borders-v1")?.title,
    ).toBe("Missing Borders");
  });
});
