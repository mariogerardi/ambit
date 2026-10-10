import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { FOURTH_JOURNEY, YUGOSLAV_REPUBLICS } from "../src/game/fourthJourney";
import { COUNTRY_FACTS } from "../src/game/journey";
import {
  createQuestionContext,
  isCorrect,
  solutionIds,
} from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import {
  questionPlaces,
  questionVisualStates,
  questionMapPresentation,
  journeyVisitedStates,
  questionRegions,
  highlightedPartId,
} from "../src/game/presentation";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, COUNTRY_FACTS, FOURTH_JOURNEY);
const response = (selectedIds: string[] = [], text = "") => ({
  selectedIds,
  text,
  ordered: [],
});
const playing = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, FOURTH_JOURNEY, context), state);

describe("fourth Journey", () => {
  it("registers all five questions for daily rotation, practice, and playground", () => {
    expect(JOURNEYS).toHaveLength(15);
    expect(journeyPath(FOURTH_JOURNEY.id)).toBe("/journey/mediterranean");
    expect(FOURTH_JOURNEY.rounds).toHaveLength(5);
    for (const q of FOURTH_JOURNEY.rounds) {
      expect(QUESTION_CATALOG).toContain(q);
      expect(q.choices?.length ?? 0).toBeLessThanOrEqual(6);
    }
  });
  it("requires both regional languages and accepts Sicily as the Italian island", () => {
    expect(
      isCorrect(
        FOURTH_JOURNEY.rounds[0],
        context,
        response(["language:cat", "language:eus"]),
      ),
    ).toBe(true);
    expect(
      isCorrect(
        FOURTH_JOURNEY.rounds[0],
        context,
        response(["language:cat", "language:fra"]),
      ),
    ).toBe(false);
    expect(
      isCorrect(FOURTH_JOURNEY.rounds[1], context, response(["island:sicily"])),
    ).toBe(true);
    expect(
      isCorrect(
        FOURTH_JOURNEY.rounds[1],
        context,
        response(["island:sardinia"]),
      ),
    ).toBe(false);
    const reveal = reduce(
      playing(0),
      { type: "select", id: "language:cat" },
      { type: "select", id: "language:eus" },
      { type: "submit" },
    );
    expect(reveal.answers[0].correct).toBe(true);
    expect(
      questionVisualStates(FOURTH_JOURNEY.rounds[0], context, reveal)[
        "wurl:ESP"
      ],
    ).toBe("correct");
  });
  it("highlights only Sicily and keeps the clue anonymous until feedback", () => {
    const q = FOURTH_JOURNEY.rounds[1],
      render = questionRegions(regions, q, "playing");
    const clue = render.find((r) => r.id === highlightedPartId("wurl:ITA"))!;
    const remainder = render.find((r) => r.id === "wurl:ITA")!;
    expect(geoContains(sphericalGeometry(clue.geometry), [14, 37.6])).toBe(
      true,
    );
    expect(geoContains(sphericalGeometry(remainder.geometry), [14, 37.6])).toBe(
      false,
    );
    expect(
      geoContains(sphericalGeometry(remainder.geometry), [12.5, 41.9]),
    ).toBe(true);
    expect(clue.name).toBe("Highlighted territory");
    expect(questionVisualStates(q, context, playing(1))[clue.id]).toBe(
      "hinted",
    );
    expect(questionVisualStates(q, context, playing(1))[remainder.id]).toBe(
      "disabled",
    );
    expect(questionRegions(regions, q, "playing")).toBe(render);
    for (const region of regions)
      if (region.id !== "wurl:ITA")
        expect(render.find((r) => r.id === region.id)).toBe(region);
    const reveal = reduce(
      playing(1),
      { type: "select", id: "island:sicily" },
      { type: "submit" },
    );
    const feedback = questionRegions(regions, q, "feedback");
    expect(feedback.find((r) => r.id === clue.id)?.name).toBe("Sicily");
    expect(questionVisualStates(q, context, reveal)[clue.id]).toBe("correct");
    expect(questionVisualStates(q, context, reveal)[remainder.id]).toBe(
      "disabled",
    );
    expect(questionRegions(regions, q, "playing")).toBe(render);
    expect(clue.name).toBe("Highlighted territory");
  });
  it("accepts Tripoli without revealing a capital marker before submission", () => {
    const q = FOURTH_JOURNEY.rounds[2];
    expect(isCorrect(q, context, response([], " TRIPOLI "))).toBe(true);
    expect(isCorrect(q, context, response([], "Benghazi"))).toBe(false);
    expect(questionPlaces(q, context, "playing")).toHaveLength(0);
    expect(questionPlaces(q, context, "feedback")[0].name).toBe("Tripoli");
  });
  it("requires all six republics and distinguishes selected errors from missed correct answers", () => {
    const q = FOURTH_JOURNEY.rounds[3];
    expect(solutionIds(q, context)).toEqual(YUGOSLAV_REPUBLICS);
    const before = questionVisualStates(q, context, playing(3));
    for (const id of [...YUGOSLAV_REPUBLICS, "wurl:ALB"])
      expect(before[id]).toBe("selectable");
    expect(before["wurl:USA"]).toBe("disabled");
    expect(isCorrect(q, context, response(YUGOSLAV_REPUBLICS))).toBe(true);
    const picks = [...YUGOSLAV_REPUBLICS.slice(0, 5), "wurl:ALB"];
    const reveal = reduce(
      playing(3),
      ...picks.map((id): Action => ({ type: "select", id })),
      { type: "submit" },
    );
    const states = questionVisualStates(q, context, reveal);
    expect(states["wurl:ALB"]).toBe("incorrect");
    expect(states["wurl:BIH"]).toBe("correct");
    expect(states["wurl:SVN"]).toBe("answer");
    expect(states["wurl:FRA"]).toBe("disabled");
  });
  it("counts 22 coastal countries with Palestine, hides clues, and reveals every coast after submission", () => {
    const q = FOURTH_JOURNEY.rounds[4];
    expect(solutionIds(q, context)).toHaveLength(22);
    expect(solutionIds(q, context)).toContain("wurl:PSE");
    expect(solutionIds(q, context)).not.toContain("wurl:GBR");
    expect(isCorrect(q, context, response([], "22"))).toBe(true);
    expect(isCorrect(q, context, response([], "21"))).toBe(false);
    expect(questionMapPresentation(q, "playing")).toMatchObject({
      borders: false,
      hover: false,
    });
    const reveal = reduce(
      playing(4),
      { type: "text", value: "22" },
      { type: "submit" },
    );
    expect(questionMapPresentation(q, "feedback", true)).toMatchObject({
      borders: true,
      hover: true,
    });
    expect(questionVisualStates(q, context, reveal)["wurl:PSE"]).toBe("answer");
    expect(
      journeyVisitedStates(FOURTH_JOURNEY, context, reveal.answers)["wurl:PSE"],
    ).toBe("visited");
  });
  it("completes the full Journey with a score for each round", () => {
    let s = reduce(
      playing(0),
      { type: "select", id: "language:cat" },
      { type: "select", id: "language:eus" },
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(
      s,
      { type: "select", id: "island:sicily" },
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(
      s,
      { type: "text", value: "Tripoli" },
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(
      s,
      ...YUGOSLAV_REPUBLICS.map((id): Action => ({ type: "select", id })),
      { type: "submit" },
      { type: "next" },
    );
    s = reduce(
      s,
      { type: "text", value: "22" },
      { type: "submit" },
      { type: "next" },
    );
    expect(s.phase).toBe("finished");
    expect(s.answers).toHaveLength(5);
    expect(s.answers.every((a) => a.correct)).toBe(true);
  });
});
