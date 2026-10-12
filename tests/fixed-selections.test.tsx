// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { AnswerForm } from "../src/game/AnswerForm";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { createQuestionContext, canSubmit } from "../src/game/questions";
import type { Question } from "../src/game/questions";
import { journeyWorld } from "../src/app/journeyWorld";
import type { RegionFeature } from "../src/geography/types";

// Retain engine coverage independently of live Journey content.
const round: Question = {
  ...ANDES_JOURNEY.rounds[2],
  id: "test:fixed-selections",
  count: 7,
  choices: undefined,
  disclosure: {
    ...ANDES_JOURNEY.rounds[2].disclosure,
    namedChoices: false,
  },
  rule: {
    type: "country-ids",
    ids: ["VEN", "COL", "ECU", "PER", "BOL", "CHL", "ARG"].map(
      (id) => `wurl:${id}`,
    ),
  },
  selection: {
    type: "ids",
    ids: ["VEN", "COL", "ECU", "PER", "BOL", "CHL", "ARG", "BRA", "PRY"].map(
      (id) => `wurl:${id}`,
    ),
  },
  guidance: {
    hint: "We've mentioned every country at least once this Journey!",
    assist: {
      text: "Two anchors are locked in.",
      fixedSelections: ["wurl:VEN", "wurl:CHL"],
    },
  },
};
const journey = {
  ...ANDES_JOURNEY,
  rounds: [...ANDES_JOURNEY.rounds.slice(0, 4), round],
};
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (game, action) => gameReducer(game, action, journey, context),
    state,
  );
describe("fixed selection assists", () => {
  it("locks Venezuela and Chile through map taps, typing, clearing and resumed help", () => {
    const round = journey.rounds[4];
    const helped = reduce(
      at(4),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(helped.selectedIds).toEqual(["wurl:VEN", "wurl:CHL"]);
    expect(round.guidance?.hint).toBe(
      "We've mentioned every country at least once this Journey!",
    );
    for (const id of helped.selectedIds)
      expect(reduce(helped, { type: "select", id })).toBe(helped);
    expect(
      reduce(
        helped,
        { type: "text", value: "Chile" },
        { type: "guess-country" },
      ).selectedIds,
    ).toEqual(helped.selectedIds);
    expect(
      reduce(helped, { type: "select", id: "wurl:BRA" }, { type: "clear" })
        .selectedIds,
    ).toEqual(helped.selectedIds);
    const stale = { ...helped, selectedIds: [] };
    expect(reduce(stale, { type: "clear" }).selectedIds).toEqual(
      helped.selectedIds,
    );
    const map = journeyWorld(regions, journey, stale, context);
    expect(map.states["wurl:VEN"]).toBe("selected");
    expect(map.states["wurl:CHL"]).toBe("selected");
    const html = renderToStaticMarkup(
      <AnswerForm
        question={round}
        context={context}
        game={stale}
        dispatch={() => {}}
        webgl
      />,
    );
    expect(html.match(/Locked/g)).toHaveLength(2);
    const full = {
      ...at(4),
      selectedIds: [
        "wurl:COL",
        "wurl:ECU",
        "wurl:PER",
        "wurl:BOL",
        "wurl:ARG",
        "wurl:BRA",
        "wurl:PRY",
      ],
    };
    const preserved = reduce(
      full,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(preserved.selectedIds).toHaveLength(9);
    expect(canSubmit(round, context, preserved)).toBe(false);
    expect(
      renderToStaticMarkup(
        <AnswerForm
          question={round}
          context={context}
          game={preserved}
          dispatch={() => {}}
          webgl
        />,
      ),
    ).toContain("Paraguay");
    expect(
      reduce(
        preserved,
        { type: "select", id: "wurl:BRA" },
        { type: "select", id: "wurl:PRY" },
        { type: "submit" },
      ).answers.at(-1)?.correct,
    ).toBe(true);
    for (const fixedSelections of [["wurl:BRA"], ["wurl:VEN", "wurl:VEN"]])
      expect(() =>
        createQuestionContext(regions, [], {
          ...journey,
          rounds: [
            {
              ...round,
              guidance: {
                hint: "Hint",
                assist: { text: "Assist", fixedSelections },
              },
            },
          ],
        }),
      ).toThrow("Invalid fixed selection assist");
  });
});
