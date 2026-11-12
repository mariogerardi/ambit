// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  sayWherePairs,
  sayWhereDeck,
  sayWhereJourney,
  SAY_WHERE_HELD,
  SAY_WHERE_RESEARCH,
} from "../src/minigames/sayWhere";
import {
  neighborReducer,
  neighborGame,
  startNeighborRun,
  neighborRunEnded,
} from "../src/minigames/sharedNeighbors";
import {
  createQuestionContext,
  canSelect,
} from "../src/game/questionPreparation";
import { isCorrect } from "../src/game/questionEvaluation";
import { journeyWorld } from "../src/app/journeyWorld";
import { TextClue } from "../src/game/TextClue";
import {
  validNeighborRun,
  createNeighborSave,
} from "../src/minigames/sharedNeighborsSave";
import type { NeighborRun } from "../src/minigames/sharedNeighbors";
import type { RegionFeature } from "../src/geography/types";
import {
  minigameResult,
  minigameResultText,
} from "../src/minigames/minigameSharing";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const pairs = sayWherePairs();
const base = createQuestionContext(regions, [], {
  id: "test",
  title: "Test",
  description: "",
  rounds: [],
});
const prepared = (pair = pairs[0]) => {
  const journey = sayWhereJourney(pair, base);
  return {
    journey,
    context: createQuestionContext(regions, [], journey, base),
  };
};
describe("Say Where?", () => {
  it("shares its own result without exposing expressions or answer countries", () => {
    const run = {
      ...startNeighborRun(pairs),
      kind: "say-where" as const,
      answered: 5,
      correct: 3,
    };
    const text = minigameResultText(minigameResult("say-where", run, true));
    expect(text).toContain("Say Where?");
    expect(text).toContain("/minigames/say-where");
    expect(text).toContain("3 expressions placed");
    expect(text).not.toContain(pairs[0].expression.native_text);
    expect(text).not.toContain("Portugal");
  });
  it("preserves linked research and keeps unresolved expressions out of live grading", () => {
    const { languages, expressions } = SAY_WHERE_RESEARCH;
    expect(new Set(languages.map((l) => l.id)).size).toBe(languages.length);
    expect(new Set(expressions.map((e) => e.id)).size).toBe(expressions.length);
    for (const e of expressions) {
      expect(languages.some((l) => l.id === e.language_id)).toBe(true);
      expect(e.native_text.normalize("NFC")).toBe(e.native_text);
      expect(e.publication_status).toBe("research_candidate");
    }
    for (const id of Object.keys(SAY_WHERE_HELD))
      expect(pairs.some((p) => p.expression.id === id)).toBe(false);
    expect(new Set(pairs.map((p) => p.languageId)).size).toBe(languages.length);
    for (const pair of pairs) {
      expect(pair.expression).toEqual(
        expressions.find((e) => e.id === pair.expression.id),
      );
      for (const id of pair.answerIds) expect(base.targets.has(id)).toBe(true);
    }
  });
  it("uses deterministic, balanced language cycles and rotates every language's expressions", () => {
    expect(sayWhereDeck(pairs, 42, 0)).toEqual(sayWhereDeck(pairs, 42, 0));
    const seen = new Set<string>();
    for (let cycle = 0; cycle < 6; cycle++) {
      const deck = sayWhereDeck(pairs, 42, cycle);
      expect(new Set(deck.map((p) => p.languageId)).size).toBe(deck.length);
      deck.forEach((p) => seen.add(p.id));
    }
    expect(seen.size).toBe(pairs.length);
  });
  it("accepts every reviewed country, including broader Hindi/Persian sets and Vietnamese government use", () => {
    for (const pair of pairs) {
      const { journey, context } = prepared(pair),
        q = journey.rounds[0];
      for (const id of pair.answerIds) {
        expect(canSelect(q, context, id)).toBe(true);
        expect(
          isCorrect(q, context, { selectedIds: [id], text: "", ordered: [] }),
        ).toBe(true);
      }
      expect(
        isCorrect(q, context, {
          selectedIds: ["wurl:CHN"],
          text: "",
          ordered: [],
        }),
      ).toBe(false);
    }
    expect(pairs.find((p) => p.languageId === "hi")!.answerIds).toContain(
      "wurl:FJI",
    );
    expect(pairs.find((p) => p.languageId === "fa")!.answerIds).toEqual([
      "wurl:IRN",
      "wurl:AFG",
      "wurl:TJK",
    ]);
    expect(
      pairs
        .find((p) => p.languageId === "vi")!
        .sources.some((s) => s.url.includes("64-2025")),
    ).toBe(true);
    expect(pairs.find((p) => p.languageId === "it")!.answerIds).toContain(
      "wurl:VAT",
    );
    for (const id of ["sw-id-02", "sw-id-03"])
      expect(pairs.find((p) => p.expression.id === id)!.answerIds).toEqual([
        "wurl:MYS",
        "wurl:BRN",
        "wurl:SGP",
        "wurl:IDN",
      ]);
  });
  it("withholds language, translation and answer geography until submission, then reveals the whole network", () => {
    const pair = pairs.find((p) => p.languageId === "fa")!;
    const { journey, context } = prepared(pair),
      q = journey.rounds[0];
    const run = { ...startNeighborRun(pairs), kind: "say-where" as const };
    const play = neighborGame(run, journey),
      world = journeyWorld(regions, journey, play, context);
    const markup = renderToStaticMarkup(
      <TextClue clue={q.textClue!} revealed={false} />,
    );
    expect(markup).toContain('dir="rtl"');
    expect(markup).not.toContain(pair.expression.english_translation);
    expect(markup).not.toContain(pair.language);
    expect(world.places).toEqual([]);
    expect(world.states["wurl:AFG"]).toBe("selectable");
    expect(world.states["wurl:CHN"]).toBe("selectable");
    const selected = neighborReducer(
      run,
      { type: "select", id: "wurl:AFG" },
      journey,
      context,
      17,
    );
    expect(selected.answered).toBe(0);
    const result = neighborReducer(
      selected,
      { type: "submit" },
      journey,
      context,
      17,
    );
    const reveal = journeyWorld(
      regions,
      journey,
      neighborGame(result, journey),
      context,
    );
    expect(reveal.states["wurl:AFG"]).toBe("correct");
    expect(reveal.states["wurl:TJK"]).toBe("answer");
    expect(reveal.focus).toMatchObject(base.targets.get("wurl:AFG")!.focus);
    expect(
      renderToStaticMarkup(<TextClue clue={q.textClue!} revealed />),
    ).toContain(pair.expression.english_translation);
  });
  it("preserves editable selections and feedback in an account-scoped save; three misses end the run", () => {
    const { journey, context } = prepared();
    let run: NeighborRun = { ...startNeighborRun(pairs), kind: "say-where" };
    const act = (action: Parameters<typeof neighborReducer>[1]) =>
      (run = neighborReducer(run, action, journey, context, 17));
    act({ type: "submit" });
    expect(run.answered).toBe(0);
    act({ type: "select", id: pairs[0].answer });
    act({ type: "select", id: "wurl:CHN" });
    const store = createNeighborSave("say-where-test", "say-where");
    store.save({ version: 1, run });
    expect(store.load().run?.selectedId).toBe("wurl:CHN");
    for (let i = 0; i < 3; i++) {
      act({ type: "select", id: "wurl:CHN" });
      act({ type: "submit" });
      expect(run.answered).toBe(i + 1);
      const result = run;
      act({ type: "submit" });
      expect(run).toBe(result);
      expect(validNeighborRun(run)).toBe(true);
      if (i < 2) {
        act({ type: "next" });
        expect(run.selectedId).toBeUndefined();
      }
    }
    expect(neighborRunEnded(run)).toBe(true);
    expect(run.ended).toBe("strikes");
    act({ type: "overview" });
    expect(run.overview).toBe(true);
    store.save({ version: 1, run });
    expect(store.load().run).toEqual(run);
    expect(
      createNeighborSave("another-user", "say-where").load().run,
    ).toBeUndefined();
  });
});
