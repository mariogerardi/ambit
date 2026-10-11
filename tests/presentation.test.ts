import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { JOURNEY, COUNTRY_FACTS } from "./fixtures/engine/journey";
import { createQuestionContext } from "../src/game/questions";
import {
  journeyVisitedStates,
  questionMapPresentation,
  questionVisualStates,
} from "../src/game/presentation";
import type { Answer } from "../src/game/state";
import { initialGame } from "../src/game/state";
import { SECOND_JOURNEY } from "./fixtures/engine/secondJourney";
import { SECOND_VARIANTS } from "./fixtures/ruleVariants";
import { playRegionStyle } from "../src/globe/themes";
import { JOURNEYS } from "../src/game/journeys";
import { FIFTH_JOURNEY, CANADIAN_TERRITORIES } from "./fixtures/engine/fifthJourney";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, JOURNEY);
const answer = (
  index: number,
  selectedIds: string[] = [],
  text = "",
  ordered: string[] = [],
): Answer => ({
  roundId: JOURNEY.rounds[index].id,
  selectedIds,
  text,
  ordered,
  correct: true,
});

describe("question reveal and journey recap", () => {
  it("highlights all three Canadian territories equally without privileging array order", () => {
    const question = FIFTH_JOURNEY.rounds[0];
    const regional = createQuestionContext(world, COUNTRY_FACTS, FIFTH_JOURNEY);
    const game = { ...initialGame, phase: "playing" as const };
    const states = questionVisualStates(question, regional, game);
    expect(CANADIAN_TERRITORIES).toHaveLength(3);
    expect(
      new Set(
        CANADIAN_TERRITORIES.map((id) => playRegionStyle(id, states[id]).fill),
      ).size,
    ).toBe(1);
    expect(
      questionVisualStates(
        { ...question, contextIds: [...CANADIAN_TERRITORIES].reverse() },
        regional,
        game,
      ),
    ).toEqual(states);
  });
  it.each(
    JOURNEYS.flatMap((journey) =>
      journey.rounds
        .filter((q) => (q.contextIds?.length ?? 0) > 1)
        .map((question) => [question.id, journey, question] as const),
    ),
  )(
    "%s treats the highlighted context as a set, preserving selection and feedback colors",
    (_, journey, question) => {
      const ctx = createQuestionContext(world, COUNTRY_FACTS, journey);
      const game = { ...initialGame, phase: "playing" as const };
      const states = questionVisualStates(question, ctx, game);
      const ids = question.contextIds!.filter(
        (id) => !question.highlightParts?.some((part) => part.countryId === id),
      );
      expect(new Set(ids.map((id) => states[id])).size).toBe(1);
      expect(ids.every((id) => states[id] === "hinted")).toBe(true);
      expect(
        questionVisualStates(
          { ...question, contextIds: [...question.contextIds!].reverse() },
          ctx,
          game,
        ),
      ).toEqual(states);
    },
  );
  it("reveals chosen correct, unchosen correct and wrong river picks with distinct states; everything else stays gray", () => {
    const q = SECOND_VARIANTS[1],
      selectedIds = ["wurl:DEU", "wurl:AUT", "wurl:SVK", "wurl:POL"];
    const states = questionVisualStates(q, context, {
      ...initialGame,
      phase: "feedback",
      selectedIds,
      answers: [
        { roundId: q.id, correct: false, selectedIds, text: "", ordered: [] },
      ],
    });
    for (const id of ["wurl:DEU", "wurl:AUT", "wurl:SVK"])
      expect(states[id]).toBe("correct");
    expect(states["wurl:POL"]).toBe("incorrect");
    for (const id of [
      "wurl:HUN",
      "wurl:HRV",
      "wurl:SRB",
      "wurl:ROU",
      "wurl:BGR",
      "wurl:MDA",
      "wurl:UKR",
    ])
      expect(states[id]).toBe("answer");
    for (const id of ["wurl:FRA", "wurl:CAN", "wurl:TJK"])
      expect(states[id]).toBe("disabled");
    expect(playRegionStyle("x", "correct").fill).not.toBe(
      playRegionStyle("x", "answer").fill,
    );
  });
  it("keeps irrelevant countries gray during written and language rounds and removes pending yellows on reveal", () => {
    for (const q of [
      JOURNEY.rounds[3],
      SECOND_JOURNEY.rounds[1],
      SECOND_VARIANTS[0],
      SECOND_JOURNEY.rounds[3],
    ]) {
      const states = questionVisualStates(q, context, {
        ...initialGame,
        phase: "playing",
      });
      for (const r of world)
        if (!q.contextIds?.includes(r.id))
          expect(states[r.id], `${q.id}:${r.id}`).toBe("disabled");
    }
    const q = JOURNEY.rounds[0];
    const states = questionVisualStates(q, context, {
      ...initialGame,
      phase: "feedback",
      selectedIds: ["wurl:ZWE"],
      answers: [{ ...answer(0, ["wurl:ZWE"]), correct: false }],
    });
    expect(states["wurl:ZWE"]).toBe("incorrect");
    expect(states["wurl:NAM"]).toBe("answer");
    expect(states["wurl:ZAF"]).toBe("disabled");
    expect(Object.values(states)).not.toContain("hinted");
    expect(Object.values(states)).not.toContain("default");
  });
  it("reveals borders, hover and route geography only after a correct border-count answer", () => {
    const round = JOURNEY.rounds[1];
    expect(questionMapPresentation(round, "playing", true)).toEqual({
      borders: false,
      hover: false,
      muteOthers: true,
    });
    expect(questionMapPresentation(round, "feedback", false)).toEqual({
      borders: false,
      hover: false,
      muteOthers: true,
    });
    expect(questionMapPresentation(round, "feedback", true)).toEqual({
      borders: true,
      hover: true,
      muteOthers: false,
    });
    expect(questionMapPresentation(round, "finished", true).borders).toBe(true);
  });
  it("includes given countries, numeric routes, text facts and ordered routes in the final purple recap", () => {
    const states = journeyVisitedStates(JOURNEY, context, [
      answer(0, ["wurl:NAM"]),
      answer(1, [], "4"),
      answer(2, ["wurl:MLI", "wurl:OMN", "wurl:PER"]),
      answer(3, [], "Lima"),
      answer(4, [], "", ["Peru", "Bolivia", "Brazil", "Namibia"]),
    ]);
    for (const id of [
      "wurl:ZAF",
      "wurl:NAM",
      "wurl:TCD",
      "wurl:COD",
      "wurl:CAF",
      "wurl:MLI",
      "wurl:OMN",
      "wurl:PER",
      "wurl:BOL",
      "wurl:BRA",
    ])
      expect(states[id], id).toBe("visited");
    // Unpicked valid four-letter countries and unplayed questions do not count.
    expect(states["wurl:FJI"]).toBeUndefined();
    expect(
      journeyVisitedStates(JOURNEY, context, [answer(0, ["wurl:NAM"])])[
        "wurl:TCD"
      ],
    ).toBeUndefined();
  });
  it("preserves an incorrect map pick while including reviewed context and solutions", () => {
    const states = journeyVisitedStates(JOURNEY, context, [
      { ...answer(0, ["wurl:ZWE"]), correct: false },
    ]);
    expect(states["wurl:ZWE"]).toBe("incorrect");
    expect(states["wurl:NAM"]).toBe("visited");
    expect(states["wurl:ZAF"]).toBe("visited");
  });
});
