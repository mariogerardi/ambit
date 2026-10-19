import { readFileSync } from "node:fs";
import { geoContains } from "d3-geo";
import { describe, expect, it } from "vitest";
import { FOURTEENTH_JOURNEY as journey } from "../src/game/fourteenthJourney";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
import {
  createQuestionContext,
  canSelect,
  solutionIds,
} from "../src/game/questions";
import { initialGame, gameReducer } from "../src/game/state";
import type { GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import { regionAnswerId, highlightedPartId } from "../src/game/presentation";
import { playColors } from "../src/theme/playColors";
import { playRegionStyle } from "../src/globe/themes";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { regionBorderVisible } from "../src/globe/outlines";
import {
  dailyJourney,
  setDailyPuzzle,
  emptyDaily,
  validDaily,
} from "../src/app/daily";
import { modeForPath } from "../src/app/modes";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, [], journey);
const owners = ["wurl:IND", "wurl:GNQ", "wurl:NOR", "wurl:ECU", "wurl:FRA"];
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});

describe("Island instincts Journey", () => {
  it("registers five one-pick questions for practice, Admin and daily rotation", () => {
    expect(JOURNEYS).toContain(journey);
    expect(journey.rounds).toHaveLength(5);
    expect(
      QUESTION_CATALOG.filter((q) => journey.rounds.includes(q)),
    ).toHaveLength(5);
    expect(journeyPath(journey.id)).toBe("/journey/island-instincts");
    expect(modeForPath(journeyPath(journey.id))).toBe("practice");
    const progress = setDailyPuzzle(emptyDaily, "2026-10-07", journey.id);
    expect(dailyJourney("2026-10-07", progress)).toBe(journey);
    expect(validDaily(JSON.parse(JSON.stringify(progress)))).toBe(true);
  });
  it.each(journey.rounds.map((q, i) => [q.progressLabel, i] as const))(
    "offers exactly six named, equally highlighted countries for %s",
    (_, i) => {
      const q = journey.rounds[i];
      expect(q.mode).toBe("map-single");
      expect(q.commitment).toBe("immediate");
      expect(q.choices).toHaveLength(6);
      expect(new Set(q.choices!.map((c) => c.id)).size).toBe(6);
      expect(solutionIds(q, context)).toEqual([owners[i]]);
      const view = journeyWorld(world, journey, at(i), context);
      for (const candidate of q.choices!) {
        expect(canSelect(q, context, candidate.id)).toBe(true);
        expect(view.states[candidate.id]).toBe("selectable");
        const region = view.regions.find((r) => r.id === candidate.id)!;
        expect(region.displayBase).not.toBe(true);
        expect(regionBorderVisible(region, view)).toBe(true);
      }
      expect(canSelect(q, context, "wurl:JPN")).toBe(false);
      expect(view.states["wurl:JPN"]).toBe("disabled");
      expect(view.places).toEqual([]);
      const clue = view.regions.find(
        (r) => r.id === highlightedPartId(owners[i]),
      )!;
      expect(view.clueLocators).toEqual([
        {
          id: `${journey.id}:${q.id}:${clue.id}`,
          label: q.progressLabel,
          region: clue,
        },
      ]);
      for (const phase of ["feedback", "finished", "home"] as const)
        expect(
          journeyWorld(world, journey, { ...at(i), phase }, context)
            .clueLocators,
        ).toEqual([]);
      expect(view.states[clue.id]).toBe("clue");
      expect(playRegionStyle(clue.id, "clue").fill).toBe(playColors().clue);
      expect(playRegionStyle(clue.id, "clue").fill).not.toBe(
        playRegionStyle(owners[i], "selectable").fill,
      );
      expect(canSelect(q, context, clue.id)).toBe(false);
      expect(regionAnswerId(q, clue)).toBeUndefined();
      expect(
        regionAnswerId(q, view.regions.find((r) => r.id === owners[i])!),
      ).toBe(owners[i]);
    },
  );
  it("includes the Nicobars and removes every simplified Svalbard component from the candidate country", () => {
    const india = journeyWorld(world, journey, at(0), context);
    const chain = india.regions.find(
      (r) => r.id === highlightedPartId("wurl:IND"),
    )!;
    expect(geoContains(sphericalGeometry(chain.geometry), [93.85, 7])).toBe(
      true,
    );
    expect(geoContains(sphericalGeometry(chain.geometry), [92.8, 12.5])).toBe(
      true,
    );
    const arctic = journeyWorld(world, journey, at(2), context);
    const norway = arctic.regions.find((r) => r.id === "wurl:NOR")!;
    for (const point of journey.rounds[2].highlightParts![0].points!)
      expect(
        geoContains(sphericalGeometry(norway.geometry), [point.lng, point.lat]),
      ).toBe(false);
  });
  it("locks correct and incorrect first picks and reveals both the owner and the island", () => {
    journey.rounds.forEach((q, i) => {
      for (const id of q.choices!.map((c) => c.id)) {
        const answered = gameReducer(
          at(i),
          { type: "select", id },
          journey,
          context,
        );
        expect(answered.phase).toBe("feedback");
        expect(answered.answers).toHaveLength(1);
        expect(answered.answers[0].correct).toBe(id === owners[i]);
        expect(
          gameReducer(
            answered,
            { type: "select", id: owners[i] },
            journey,
            context,
          ),
        ).toBe(answered);
        const reveal = journeyWorld(world, journey, answered, context);
        expect(reveal.states[owners[i]]).toBe(
          id === owners[i] ? "correct" : "answer",
        );
        expect(reveal.states[highlightedPartId(owners[i])]).toBe(
          id === owners[i] ? "correct" : "answer",
        );
        if (id !== owners[i]) expect(reveal.states[id]).toBe("incorrect");
      }
    });
  });
  it("finishes all five without changing the canonical geography", () => {
    let game = at(0);
    for (const id of owners) {
      game = gameReducer(game, { type: "select", id }, journey, context);
      game = gameReducer(game, { type: "next" }, journey, context);
    }
    expect(game.phase).toBe("finished");
    expect(game.answers.filter((a) => a.correct)).toHaveLength(5);
    expect(world).toEqual(
      JSON.parse(readFileSync("public/geography/world.v1.json", "utf8")),
    );
  });
});
