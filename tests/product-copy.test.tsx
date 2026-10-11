import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  correctAnswerCopy,
  feedbackLegend,
  roundIdentity,
} from "../src/game/copy";
import { GameShell } from "../src/game/GameShell";
import { JOURNEY, COUNTRY_FACTS } from "../src/game/journey";
import { SEVENTH_JOURNEY } from "../src/game/seventhJourney";
import { EIGHTH_JOURNEY } from "../src/game/eighthJourney";
import { NINTH_JOURNEY } from "../src/game/ninthJourney";
import { ELEVENTH_JOURNEY } from "../src/game/eleventhJourney";
import { FIFTH_JOURNEY } from "../src/game/fifthJourney";
import { THIRD_JOURNEY } from "../src/game/thirdJourney";
import { JOURNEYS } from "../src/game/journeys";
import {
  createQuestionContext,
  countryIdForName,
  explanation,
  questionPrompt,
} from "../src/game/questions";
import type { Journey } from "../src/game/questions";
import type { RegionFeature } from "../src/geography/types";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { StudyPanel } from "../src/study/StudyPanel";
import { StudyEditor } from "../src/study/StudySetup";
import {
  answerLabel,
  defaultSettings,
  emptyStudy,
  startStudy,
  studyReducer,
} from "../src/study/engine";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
function play(journey: Journey, roundIndex: number, actions: Action[]) {
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const game = actions.reduce<GameState>(
    (state, action) => gameReducer(state, action, journey, context),
    { ...initialGame, phase: "playing" as const, roundIndex },
  );
  return { context, game, question: journey.rounds[roundIndex] };
}

describe("product copy follows the answer and visible reveal", () => {
  it("reveals Journey progress labels only for the active stage or stages already answered", () => {
    const context = createQuestionContext(regions, COUNTRY_FACTS, JOURNEY);
    const render = (game: GameState) =>
      renderToStaticMarkup(
        <GameShell
          journey={JOURNEY}
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
    const progress = (html: string) =>
      html.match(/<ol class="journey-progress"[^>]*>(.*?)<\/ol>/)![1];
    const first = render({ ...initialGame, phase: "playing" });
    expect(first).toContain(
      'class="round-number journey-step" aria-label="Round 1">1</span>',
    );
    expect(progress(first)).toContain(roundIdentity(JOURNEY.rounds[0]));
    expect(progress(first).match(/\?\?\?/g)).toHaveLength(
      JOURNEY.rounds.length - 1,
    );
    const next = progress(
      render({
        ...initialGame,
        phase: "playing",
        roundIndex: 1,
        answers: [
          { ...initialGame, roundId: JOURNEY.rounds[0].id, correct: true },
        ],
      }),
    );
    expect(next).toContain(roundIdentity(JOURNEY.rounds[0]));
    expect(next).toContain(roundIdentity(JOURNEY.rounds[1]));
    expect(next).toContain("✓");
    for (const question of JOURNEY.rounds.slice(2))
      expect(next).not.toContain(roundIdentity(question));
    expect(next.match(/\?\?\?/g)).toHaveLength(JOURNEY.rounds.length - 2);
  });

  it.each(JOURNEYS.map((journey) => [journey.id, journey] as const))(
    "%s makes each question the heading and omits duplicate headlines and interface narration",
    (_, journey) => {
      const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
      journey.rounds.forEach((question, roundIndex) => {
        const html = renderToStaticMarkup(
          <GameShell
            journey={journey}
            context={context}
            game={{ ...initialGame, phase: "playing", roundIndex }}
            dispatch={() => {}}
            webgl
            frame={() => {}}
            onHome={() => {}}
            onStudy={() => {}}
            onPlayground={() => {}}
          />,
        );
        expect(html).toContain(
          renderToStaticMarkup(
            <h1 tabIndex={-1}>{questionPrompt(question, context)}</h1>,
          ),
        );
        expect(html).not.toContain("question-prompt");
        expect(html).not.toContain(question.title);
        expect(question.instruction).not.toMatch(
          /names are hidden|borders are hidden|any order|when you hover|until you (?:submit|answer)/i,
        );
      });
    },
  );
  it("gives equivalent territory inputs without suggesting order, while keeping ordered route labels", () => {
    const render = (journey: Journey, roundIndex: number) =>
      renderToStaticMarkup(
        <GameShell
          journey={journey}
          context={createQuestionContext(regions, COUNTRY_FACTS, journey)}
          game={{ ...initialGame, phase: "playing", roundIndex }}
          dispatch={() => {}}
          webgl
          frame={() => {}}
          onHome={() => {}}
          onStudy={() => {}}
          onPlayground={() => {}}
        />,
      );
    const territories = render(FIFTH_JOURNEY, 0);
    expect(territories).toMatch(
      /<\/h1><form[^>]*><ul class="ordered-answer unordered-answer"/,
    );
    expect(territories.match(/placeholder="Your answer"/g)).toHaveLength(3);
    expect(territories).not.toContain("Any order");
    expect(territories).not.toContain("question-instruction");
    const capitals = render(THIRD_JOURNEY, 4);
    expect(capitals).toContain("in order.");
    for (const name of [
      "Azerbaijan",
      "Russia",
      "Kazakhstan",
      "Uzbekistan",
      "Tajikistan",
    ])
      expect(capitals).toContain(`>${name}</label>`);
    expect(capitals).toContain('<ol class="ordered-answer"');
  });
  it("distinguishes recall, placement, recognition, reasoning and fallback", () => {
    expect(correctAnswerCopy(JOURNEY.rounds[3])).toBe("Nicely remembered.");
    expect(correctAnswerCopy(JOURNEY.rounds[1])).toBe("Beautifully reasoned.");
    expect(correctAnswerCopy(EIGHTH_JOURNEY.rounds[0])).toBe("Nicely placed.");
    expect(correctAnswerCopy(EIGHTH_JOURNEY.rounds[1])).toBe("Well spotted.");
    expect(correctAnswerCopy(ELEVENTH_JOURNEY.rounds[0])).toBe("Well spotted.");
    expect(
      correctAnswerCopy({
        ...JOURNEY.rounds[1],
        rule: { type: "manual-number", value: 4 },
      }),
    ).toBe("Exactly right.");
  });
  it("omits nonexistent incorrect and other-answer colors for a correct single answer", () => {
    const { question, context, game } = play(EIGHTH_JOURNEY, 1, [
      { type: "select", id: "place:2988507" },
    ]);
    expect(feedbackLegend(question, context, game).map((e) => e.key)).toEqual([
      "correct",
      "neutral",
    ]);
    const wrong = play(EIGHTH_JOURNEY, 1, [
      { type: "select", id: "place:2950159" },
    ]);
    expect(
      feedbackLegend(wrong.question, wrong.context, wrong.game).map(
        (e) => e.label,
      ),
    ).toContain("Correct answer");
    expect(
      feedbackLegend(wrong.question, wrong.context, wrong.game).map(
        (e) => e.label,
      ),
    ).not.toContain("Other correct answers");
  });
  it("shows other correct answers only for a multiple-answer reveal", () => {
    const { question, context, game } = play(ELEVENTH_JOURNEY, 4, [
      { type: "select", id: "place:964137" },
      { type: "select", id: "place:3369157" },
      { type: "select", id: "place:993800" },
      { type: "submit" },
    ]);
    expect(feedbackLegend(question, context, game).map((e) => e.label)).toEqual(
      ["Correct", "Other correct answers", "Incorrect pick", "Other places"],
    );
  });
  it("explains a pin target and highlighted clues without claiming multiple correct answers", () => {
    const distance = play(EIGHTH_JOURNEY, 0, [
      { type: "drop-pin", lat: -12.04318, lng: -77.02824 },
      { type: "submit" },
    ]);
    expect(
      feedbackLegend(distance.question, distance.context, distance.game).map(
        (e) => e.label,
      ),
    ).toEqual(["Correct", "Target location", "Other countries"]);
    const inside = play(NINTH_JOURNEY, 0, [
      { type: "drop-pin", lat: 12, lng: -1 },
      { type: "submit" },
    ]);
    expect(
      feedbackLegend(inside.question, inside.context, inside.game).map(
        (e) => e.label,
      ),
    ).toContain("Highlighted context");
  });
  it("uses distinct clue identities without revealing the shared-neighbor answers", () => {
    const labels = NINTH_JOURNEY.rounds.map(roundIdentity);
    expect(new Set(labels).size).toBe(5);
    expect(labels[0]).toBe("Ivory Coast + Benin");
    expect(labels.join(" ")).not.toMatch(
      /Burkina Faso|Turkey|Russia|Mozambique|Peru/,
    );
    expect(ELEVENTH_JOURNEY.rounds.map(roundIdentity)).toEqual([
      "Türkiye",
      "Australia",
      "Nigeria",
      "Brazil",
      "South Africa",
    ]);
  });
  it("removes the duplicate Journey total and clearly marks completion", () => {
    const { context, game } = play(JOURNEY, 0, [
      { type: "select", id: "wurl:NAM" },
    ]);
    const props = {
      journey: JOURNEY,
      context,
      game,
      dispatch: () => {},
      webgl: true,
      frame: () => {},
      onHome: () => {},
      onStudy: () => {},
      onPlayground: () => {},
    };
    const reveal = renderToStaticMarkup(<GameShell {...props} />);
    expect(reveal).not.toContain("round-of");
    expect(reveal).not.toContain("Next adventure");
    expect(reveal).toContain("Well spotted.");
    const finished = renderToStaticMarkup(
      <GameShell {...props} game={{ ...game, phase: "finished" }} />,
    );
    expect(finished).not.toContain("JOURNEY COMPLETE");
    expect(finished).toContain("Look how far");
    expect(finished).not.toContain(JOURNEY.description);
  });
  it.each(["typing", "choices", "map"] as const)(
    "keeps Study %s feedback accurate and avoids repeating a correct answer",
    (style) => {
      let session = startStudy(
        {
          ...defaultSettings,
          topics: ["countries"],
          autoAdvance: false,
          styles: { ...defaultSettings.styles, countries: style },
        },
        24,
      );
      if (style === "typing")
        session = studyReducer(
          studyReducer(session, {
            type: "text",
            value: answerLabel(session.prompt),
          }),
          { type: "submit" },
        );
      else if (style === "choices")
        session = studyReducer(
          studyReducer(session, {
            type: "choice",
            id: session.prompt.targetId,
          }),
          { type: "submit" },
        );
      else
        session = studyReducer(session, {
          type: "pick",
          id: session.prompt.targetId,
        });
      const props = {
        save: { ...emptyStudy, settings: session.settings, session },
        setup: false,
        webgl: true,
        active: true,
        onSettings: () => {},
        onStart: () => {},
        onAction: () => {},
        onSetup: () => {},
      };
      const correct = renderToStaticMarkup(<StudyPanel {...props} />);
      expect(correct).toContain(
        style === "typing" ? "Nicely remembered." : "Well spotted.",
      );
      expect(correct).not.toContain("Correct answer:");
      const wrong = {
        ...session,
        history: session.history.map((h) => ({
          ...h,
          correct: false,
          response: "Incorrect response",
        })),
      };
      expect(
        renderToStaticMarkup(
          <StudyPanel {...props} save={{ ...props.save, session: wrong }} />,
        ),
      ).toContain("Correct answer:");
    },
  );
  it("keeps Mixed concise and uses included-country wording", () => {
    const settings = {
      ...defaultSettings,
      topics: [
        "countries",
        "capitals",
        "flags",
      ] as typeof defaultSettings.topics,
      styles: {
        countries: "mixed",
        capitals: "mixed",
        flags: "mixed",
      } as const,
    };
    const setup = renderToStaticMarkup(
      <StudyPanel
        save={{ ...emptyStudy, settings }}
        setup
        active
        webgl
        onSettings={() => {}}
        onStart={() => {}}
        onAction={() => {}}
        onSetup={() => {}}
      />,
    );
    const builder = renderToStaticMarkup(
      <StudyEditor
        settings={settings}
        onSettings={() => {}}
        onStart={() => {}}
      />,
    );
    expect(builder).toContain(">Mixed<");
    expect(builder).not.toContain("Mixed methods combine");
    expect(builder).not.toContain("study-method-help");
    expect(setup).not.toContain("Your own session");
    expect(setup).toContain("Custom");
    expect(setup).not.toContain(
      "Choose a path, or build a session of your own.",
    );
    expect(setup).toContain("African capitals");
    expect(setup).toContain("Recognize the flags of countries worldwide.");
    expect(setup).not.toContain("Tap globe · 10 questions");
    expect(setup).not.toContain("your pool");
  });
  it("accepts Türkiye and Turkey while displaying Türkiye", () => {
    const names = new Map([["wurl:TUR", "Türkiye"]]);
    for (const answer of ["Türkiye", "Turkiye", "Turkey", "TÜRKIYE"])
      expect(countryIdForName({ names }, answer)).toBe("wurl:TUR");
  });
  it("reveals a capital once before its insight", () => {
    const { question, context } = play(JOURNEY, 3, []);
    expect(explanation(question, context, [], true)).toBe(question.explanation);
    expect(explanation(question, context, [], true)).not.toMatch(
      /^Lima\. Lima/,
    );
  });
  it("shows an honest empty Study summary and a results action on the final answer", () => {
    const props = {
      setup: false,
      active: true,
      webgl: true,
      onSettings: () => {},
      onStart: () => {},
      onAction: () => {},
      onSetup: () => {},
    };
    let session = startStudy(
      { ...defaultSettings, length: 10, autoAdvance: false },
      9,
    );
    const empty = renderToStaticMarkup(
      <StudyPanel
        {...props}
        save={{
          ...emptyStudy,
          session: studyReducer(session, { type: "finish" }),
        }}
      />,
    );
    expect(empty).toContain("No answers yet.");
    expect(empty).not.toContain("Beautifully done");
    expect(empty).not.toContain("study-score");
    for (let i = 0; i < 10; i++) {
      session = studyReducer(session, {
        type: "pick",
        id: session.prompt.targetId,
      });
      if (i < 9) session = studyReducer(session, { type: "next" });
    }
    const final = renderToStaticMarkup(
      <StudyPanel {...props} save={{ ...emptyStudy, session }} />,
    );
    expect(final).toContain("See results");
  });
  it("keeps the shortened namesake clues from giving away their answers", () => {
    expect(SEVENTH_JOURNEY.rounds[1].prompt).not.toMatch(/Guinea/);
    expect(SEVENTH_JOURNEY.rounds[1].prompt).toContain("entire English name");
    expect(SEVENTH_JOURNEY.rounds[3].prompt).not.toMatch(/Jersey/);
    expect(SEVENTH_JOURNEY.rounds[3].prompt).toContain(
      "highlighted U.S. state",
    );
  });
});
