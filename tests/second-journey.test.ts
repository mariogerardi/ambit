import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RegionFeature } from "../src/geography/types";
import { SECOND_JOURNEY } from "./fixtures/engine/secondJourney";
import { SECOND_VARIANTS } from "./fixtures/ruleVariants";
import { COUNTRY_FACTS } from "./fixtures/engine/journey";
import { CAPITALS } from "../src/game/quizData";
import {
  createQuestionContext,
  isCorrect,
  matchingCapitals,
  selectableIds,
  solutionIds,
} from "../src/game/questions";
import type { Response } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { questionPlaces, journeyVisitedStates } from "../src/game/presentation";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, SECOND_JOURNEY);
const response = (selectedIds: string[] = [], text = ""): Response => ({
  selectedIds,
  text,
  ordered: [],
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, SECOND_JOURNEY, context), state);

describe("local second journey", () => {
  it("has one coordinate record for every eligible member and a local clue without an answer title", () => {
    expect(CAPITALS).toHaveLength(193);
    expect(new Set(CAPITALS.map((c) => c.countryId))).toEqual(context.members);
    expect(
      CAPITALS.every((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)),
    ).toBe(true);
    const clue = SECOND_JOURNEY.rounds[0].image!;
    expect(clue.src).toBe("/flags/clue-01.svg");
    expect(clue.alt).not.toMatch(/Canada/i);
    const svg = readFileSync(`public${clue.src}`, "utf8");
    expect(svg).not.toMatch(/<title|<script|https?:\/\/(?!www.w3.org)/);
    expect(svg).toContain('viewBox="0 0 9600 4800"');
  });
  it("commits the flag pick, separates language choices from country clicks, and permits edits", () => {
    let game = reduce(
      initialGame,
      { type: "start" },
      { type: "select", id: "wurl:CAN" },
    );
    expect(game.phase).toBe("feedback");
    expect(game.answers[0].correct).toBe(true);
    game = reduce(game, { type: "next" });
    expect(reduce(game, { type: "select", id: "wurl:CAN" })).toBe(game);
    game = reduce(
      game,
      { type: "select", id: "language:eng" },
      { type: "select", id: "language:spa" },
    );
    expect(game.phase).toBe("playing");
    game = reduce(
      game,
      { type: "select", id: "language:spa" },
      { type: "select", id: "language:fra" },
      { type: "submit" },
    );
    expect(game.answers.at(-1)?.correct).toBe(true);
    expect(
      isCorrect(
        SECOND_JOURNEY.rounds[1],
        context,
        response(["language:eng", "language:eng"]),
      ),
    ).toBe(false);
    expect(
      isCorrect(SECOND_VARIANTS[0], context, response(["language:fra"])),
    ).toBe(true);
  });
  it("accepts any qualifying distinct mountain/river subset without narrowing candidates to the answers", () => {
    const q = SECOND_JOURNEY.rounds[2];
    expect(selectableIds(q, context)).toContain("wurl:BRA");
    expect(solutionIds(q, context)).not.toContain("wurl:BRA");
    expect(
      isCorrect(q, context, response(["wurl:PER", "wurl:COL", "wurl:VEN"])),
    ).toBe(true);
    expect(
      isCorrect(q, context, response(["wurl:PER", "wurl:PER", "wurl:VEN"])),
    ).toBe(false);
    expect(
      isCorrect(q, context, response(["wurl:PER", "wurl:COL", "wurl:BRA"])),
    ).toBe(false);
    expect(
      isCorrect(SECOND_VARIANTS[2], context, response(solutionIds(q, context))),
    ).toBe(true);
    expect(
      isCorrect(
        SECOND_VARIANTS[2],
        context,
        response(["wurl:PER", "wurl:COL", "wurl:VEN"]),
      ),
    ).toBe(false);
    expect(
      isCorrect(
        SECOND_VARIANTS[1],
        context,
        response(["wurl:DEU", "wurl:AUT", "wurl:MDA", "wurl:UKR"]),
      ),
    ).toBe(true);
  });
  it("accepts every African capital north of Amman and normalizes spelling aliases", () => {
    const q = SECOND_JOURNEY.rounds[3];
    expect(
      matchingCapitals(q, context)
        .map((c) => c.name)
        .sort(),
    ).toEqual(["Algiers", "Rabat", "Tripoli", "Tunis"]);
    for (const city of [" Algiers ", "RABAT", "Tripoli", "Tunis", "Alger"])
      expect(isCorrect(q, context, response([], city)), city).toBe(true);
    for (const city of ["Cairo", "Algeria", "Madrid", ""])
      expect(isCorrect(q, context, response([], city)), city).toBe(false);
    expect(isCorrect(SECOND_VARIANTS[3], context, response([], "Moscow"))).toBe(
      true,
    );
    expect(isCorrect(SECOND_VARIANTS[3], context, response([], "Rome"))).toBe(
      false,
    );
  });
  it("counts capitals from the snapshot, hides answer dots until feedback, and reveals the count", () => {
    const q = SECOND_JOURNEY.rounds[4],
      matches = matchingCapitals(q, context);
    expect(matches).toHaveLength(25);
    expect(matches.map((c) => c.name)).toContain("Paris");
    expect(matches.map((c) => c.name)).not.toContain("Prague");
    expect(isCorrect(q, context, response([], "25"))).toBe(true);
    expect(isCorrect(q, context, response([], "24"))).toBe(false);
    expect(questionPlaces(q, context, "playing").map((c) => c.name)).toEqual([
      "Tunis",
    ]);
    expect(questionPlaces(q, context, "feedback", "25", true)).toHaveLength(25);
    expect(questionPlaces(q, context, "feedback", "24", false)).toHaveLength(
      25,
    );
    expect(questionPlaces(q, context, "finished")).toEqual([]);
    expect(
      questionPlaces(
        SECOND_JOURNEY.rounds[3],
        context,
        "feedback",
        "Rabat",
        true,
      ).map((c) => c.name),
    ).toEqual(["Amman", "Rabat"]);
  });
  it("finishes all five rounds and keeps language IDs out of the geographic recap", () => {
    let game = reduce(
      initialGame,
      { type: "start" },
      { type: "select", id: "wurl:CAN" },
      { type: "next" },
      { type: "select", id: "language:eng" },
      { type: "select", id: "language:fra" },
      { type: "submit" },
      { type: "next" },
    );
    game = reduce(
      game,
      { type: "select", id: "wurl:PER" },
      { type: "select", id: "wurl:CHL" },
      { type: "select", id: "wurl:ARG" },
      { type: "submit" },
      { type: "next" },
      { type: "text", value: "Rabat" },
      { type: "submit" },
      { type: "next" },
      { type: "text", value: "25" },
      { type: "submit" },
      { type: "next" },
    );
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
    const visited = journeyVisitedStates(SECOND_JOURNEY, context, game.answers);
    expect(visited["wurl:CAN"]).toBe("visited");
    expect(visited["wurl:MAR"]).toBe("visited");
    expect(visited["wurl:FRA"]).toBe("visited");
    expect(Object.keys(visited).every((id) => context.members.has(id))).toBe(
      true,
    );
    const onlyLatitude = journeyVisitedStates(SECOND_JOURNEY, context, [
      game.answers[3],
    ]);
    expect(onlyLatitude["wurl:MAR"]).toBe("visited");
    expect(onlyLatitude["wurl:DZA"]).toBeUndefined();
  });
  it("rejects unreviewed compound language counts instead of treating unknown facts as false", () => {
    const q = {
      ...SECOND_VARIANTS[4],
      rule: {
        ...SECOND_VARIANTS[4].rule,
        type: "country-circle" as const,
        circle: { center: { lat: 0, lng: 0 }, radiusKm: 10000 },
        officialLanguageId: "language:nld",
      },
    };
    expect(() => solutionIds(q, context)).toThrow("complete reviewed");
  });
});
