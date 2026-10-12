import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { ANDES_JOURNEY } from "../src/game/andesJourney";
import { LATITUDE_JOURNEY } from "../src/game/latitudeJourney";
import { TWELFTH_JOURNEY } from "../src/game/twelfthJourney";
import { ELEVENTH_JOURNEY } from "../src/game/eleventhJourney";
import { SECOND_JOURNEY } from "./fixtures/engine/secondJourney";
import { JOURNEYS } from "../src/game/journeys";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { correctAnswerSummary } from "../src/game/copy";
import { GameShell } from "../src/game/GameShell";
import { createQuestionContext, matchingCapitals } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import type { Journey } from "../src/game/questions";
import type { RegionFeature } from "../src/geography/types";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const text = (value: string): Action[] => [
  { type: "text", value },
  { type: "submit" },
];
const select = (...ids: string[]): Action[] => [
  ...ids.map((id): Action => ({ type: "select", id })),
  { type: "submit" },
];
function play(journey: Journey, index: number, actions: Action[]) {
  const context = createQuestionContext(world, COUNTRY_FACTS, journey);
  const game = actions.reduce<GameState>(
    (state, action) => gameReducer(state, action, journey, context),
    { ...initialGame, phase: "playing", roundIndex: index },
  );
  return { context, game, question: journey.rounds[index] };
}
function render(journey: Journey, index: number, actions: Action[]) {
  const { context, game } = play(journey, index, actions);
  return renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={game}
      dispatch={() => {}}
      webgl
      frame={() => {}}
      onHome={() => {}}
      onStudy={() => {}}
      onPlayground={() => {}}
    />,
  );
}

describe("connected Journey drafts and answer feedback", () => {
  it.each([
    [
      CANADA_JOURNEY.title,
      CANADA_JOURNEY,
      [
        select("wurl:CAN"),
        select("language:eng", "language:fra"),
        select("province:nb"),
        text("Ottawa"),
        select("ocean:arctic"),
      ],
    ],
    [
      ANDES_JOURNEY.title,
      ANDES_JOURNEY,
      [
        select("city:bogota"),
        select("earth:equatorial-bulge"),
        select("wurl:PER", "wurl:BOL"),
        [
          { type: "drop-pin", ...ANDES_JOURNEY.rounds[3].places![0] },
          { type: "submit" },
        ],
        select("animal:penguins"),
      ],
    ],
    [
      LATITUDE_JOURNEY.title,
      LATITUDE_JOURNEY,
      [
        text("Tunis"),
        text("Madrid"),
        text("Astana"),
        text("Santiago"),
        text("Wellington"),
      ],
    ],
  ] as [string, Journey, Action[][]][])(
    "%s is a complete playable five-stop Journey",
    (_, journey, answers) => {
      const context = createQuestionContext(world, COUNTRY_FACTS, journey);
      let game: GameState = { ...initialGame, phase: "playing" };
      expect(journey.rounds).toHaveLength(5);
      journey.rounds.forEach((question, index) => {
        expect(question.leadIn?.trim()).toBeTruthy();
        expect(question.explanation.trim()).toBeTruthy();
        expect(question.explanation.length).toBeLessThan(230);
        for (const action of answers[index])
          game = gameReducer(game, action, journey, context);
        expect(game.phase, question.id).toBe("feedback");
        expect(game.answers.at(-1)?.correct, question.id).toBe(true);
        game = gameReducer(game, { type: "next" }, journey, context);
      });
      expect(game.phase).toBe("finished");
      expect(journeyScore(game)).toBe(5);
    },
  );

  it("preserves the unmodified seed questions' reviewed answer rules", () => {
    expect(CANADA_JOURNEY.rounds[0].rule).toEqual(
      SECOND_JOURNEY.rounds[0].rule,
    );
    expect(CANADA_JOURNEY.rounds[1].rule).toEqual(
      SECOND_JOURNEY.rounds[1].rule,
    );
    expect(LATITUDE_JOURNEY.rounds[0].rule).toEqual(
      SECOND_JOURNEY.rounds[3].rule,
    );
  });

  it("has valid answers on both sides of each reference latitude", () => {
    const context = createQuestionContext(
      world,
      COUNTRY_FACTS,
      LATITUDE_JOURNEY,
    );
    const candidates = LATITUDE_JOURNEY.rounds.map((q) =>
      matchingCapitals(q, context)
        .map((c) => c.name)
        .sort(),
    );
    expect(candidates[0]).toEqual(["Algiers", "Rabat", "Tripoli", "Tunis"]);
    expect(candidates[2]).toEqual(["Astana", "Bishkek", "Ulan Bator"]);
    expect(candidates[3]).toEqual(["Buenos Aires", "Montevideo", "Santiago"]);
    expect(candidates[4]).toEqual(["Canberra", "Wellington"]);
    expect(candidates[1]).toContain("Madrid");
    expect(candidates[1]).not.toContain("Stockholm");
    expect(
      play(LATITUDE_JOURNEY, 0, text("Nairobi")).game.answers.at(-1)?.correct,
    ).toBe(false);
  });

  it("shows the correct answer, a short insight, and no incorrect guess recap", () => {
    const correct = render(TWELFTH_JOURNEY, 3, select("wurl:CHL"));
    expect(correct).toContain("Correct answer: </span><strong>Chile</strong>");
    expect(correct).toContain("Bolivia lost its coast in the war.");
    expect(correct).not.toContain("Your answer:");
    expect(correct).not.toContain("Chile. Bolivia");
    const wrong = render(CANADA_JOURNEY, 3, text("Toronto"));
    expect(wrong).toContain("Correct answer: </span><strong>Ottawa</strong>");
    expect(wrong).not.toContain("Your answer:");
    expect(wrong).not.toContain("<strong>Toronto</strong>");
  });

  it("uses accepted alternatives on success and clearly labelled examples on a miss", () => {
    const accepted = play(LATITUDE_JOURNEY, 0, text("  tUNis "));
    expect(
      correctAnswerSummary(accepted.question, accepted.context, accepted.game),
    ).toEqual({ label: "Correct answer", value: "Tunis" });
    const missed = play(LATITUDE_JOURNEY, 0, text("Nairobi"));
    expect(
      correctAnswerSummary(missed.question, missed.context, missed.game),
    ).toEqual({ label: "One correct answer", value: "Algiers" });
    const trio = play(ANDES_JOURNEY, 2, select("wurl:PER", "wurl:BOL"));
    expect(
      correctAnswerSummary(trio.question, trio.context, trio.game),
    ).toEqual({ label: "Correct answers", value: "Peru, Bolivia" });
    const pin = play(ELEVENTH_JOURNEY, 1, [
      { type: "drop-pin", lat: 0, lng: 0 },
      { type: "submit" },
    ]);
    expect(
      correctAnswerSummary(pin.question, pin.context, pin.game).value,
    ).toBe("Canberra");
  });

  it("produces a readable nonempty answer for every current question", () => {
    for (const journey of JOURNEYS) {
      const context = createQuestionContext(world, COUNTRY_FACTS, journey);
      for (const question of journey.rounds) {
        const answer = correctAnswerSummary(question, context, initialGame);
        expect(answer.value.trim(), question.id).toBeTruthy();
        expect(answer.value, question.id).not.toMatch(
          /wurl:|province:|ocean:|place:/,
        );
      }
    }
  });
  it("keeps hidden canonical answers out of introductions and supplemental question copy", () => {
    const normalize = (value: string) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    const contains = (copy: string, answer: string) => {
      const words = normalize(copy)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .join(" ");
      const target = normalize(answer)
        .split(/[^a-z0-9]+/)
        .filter(Boolean)
        .join(" ");
      return ` ${words} `.includes(` ${target} `);
    };
    for (const journey of JOURNEYS) {
      const context = createQuestionContext(world, COUNTRY_FACTS, journey);
      for (const question of journey.rounds) {
        const answers =
          question.rule.type === "capital-coordinate"
            ? matchingCapitals(question, context).map((capital) => capital.name)
            : correctAnswerSummary(question, context, initialGame).value.split(
                /, | → /,
              );
        const supplemental = [
          journey.title,
          journey.description,
          question.leadIn,
          question.instruction,
          question.inputLabel,
          question.image?.alt,
          question.image?.context?.alt,
        ]
          .filter(Boolean)
          .join(" ");
        for (const answer of answers) {
          // Some tasks intentionally name the destination and ask players to locate it.
          if (contains(question.prompt, answer)) continue;
          expect(
            contains(supplemental, answer),
            `${question.id}: supplemental copy reveals ${answer}`,
          ).toBe(false);
        }
      }
    }
  });
});
