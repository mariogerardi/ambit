// @vitest-environment jsdom
import { readFileSync, existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WHERE_IS_IT_OFFICIAL_JOURNEY as journey } from "../src/game/whereIsItOfficialJourney";
import {
  createQuestionContext,
  selectableIds,
} from "../src/game/questionPreparation";
import { initialGame, gameReducer, type GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { journeyPoints } from "../src/game/points";
import { validateQuestionContract } from "../src/game/questionBuilder";
import { PRESENTATION_RECIPES } from "../src/game/recipes";
import { GameShell } from "../src/game/GameShell";
import { auditJourney } from "../src/game/journeyAudit";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { captureReview, restoreReview } from "../src/app/journeyReview";
import type { RegionFeature } from "../src/geography/types";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const start = (index: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex: index,
});
const reduce = (
  game: GameState,
  ...actions: Parameters<typeof gameReducer>[1][]
) =>
  actions.reduce(
    (game, action) => gameReducer(game, action, journey, context),
    game,
  );
const choose = (index: number, id: string) =>
  reduce(start(index), { type: "select", id });
const view = (game: GameState) => journeyWorld(regions, journey, game, context);
const shell = (game: GameState) => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={game}
      dispatch={() => {}}
      webgl
      frame={() => {}}
      onHome={() => {}}
      onStudy={() => {}}
    />,
  );
  return node;
};
describe("Where Is It Official?", () => {
  it("audits as a workbench-only draft with five complete accepted sets", () => {
    expect(
      auditJourney(journey, regions, (asset) => existsSync(`public${asset}`))
        .errors,
    ).toEqual([]);
    expect(JOURNEY_INDEX.some((entry) => entry.id === journey.id)).toBe(false);
    expect(
      journey.rounds.map((q) =>
        q.rule.type === "country-ids" ? q.rule.ids.length : 0,
      ),
    ).toEqual([24, 9, 4, 4, 2]);
  });
  it("validates reusable text/network contracts and appends an orbit overview", () => {
    const q = journey.rounds[0];
    expect(() =>
      validateQuestionContract({
        ...q,
        textClue: { ...q.textClue!, lang: "not a language tag" },
      }),
    ).toThrow(/text clues/);
    expect(() =>
      validateQuestionContract({
        ...q,
        feedbackNetwork: {
          regionIds: ["wurl:EGY", "wurl:EGY"],
          label: "Network",
        },
      }),
    ).toThrow(/distinct regions/);
    expect(() =>
      createQuestionContext(regions, [], {
        ...journey,
        rounds: [
          {
            ...q,
            feedbackNetwork: { regionIds: ["unknown"], label: "Network" },
          },
        ],
      }),
    ).toThrow(/Unknown explanatory network/);
    const recipe = PRESENTATION_RECIPES.find(
      (q) => q.id === "recipe:multilingual-network",
    )!;
    expect(recipe.feedbackReturnToSelection).toBe(true);
    expect(recipe.feedbackOrbit).not.toBe(true);
  });
  it("accepts every qualifying country independently, including Mali, Palestine and Indonesia", () => {
    for (const [index, q] of journey.rounds.entries()) {
      if (q.rule.type !== "country-ids") throw Error("Expected country set");
      for (const id of q.rule.ids) {
        const game = choose(index, id);
        expect(game.phase, id).toBe("feedback");
        expect(game.answers[0].correct, id).toBe(true);
        expect(journeyPoints(game), id).toBe(3);
        const map = view(game);
        expect(map.states[id]).toBe("correct");
        expect(map.focus).toMatchObject({
          lat: context.targets.get(id)!.focus.lat,
          lng: context.targets.get(id)!.focus.lng,
        });
        expect(
          q.rule.ids
            .filter((other) => other !== id)
            .every((other) => map.states[other] === "hinted"),
        ).toBe(true);
        expect(
          Object.values(map.states).filter((state) => state === "correct"),
        ).toHaveLength(1);
        expect(
          shell(game).querySelector(".journey-correct-answer")?.textContent,
        ).toContain(context.names.get(id));
      }
    }
  });
  it("shows a neutral whole-world search and withholds names, translations and source clues before submission", () => {
    for (const [index, q] of journey.rounds.entries()) {
      const map = view(start(index));
      expect(map.states["wurl:PSE"]).toBe("surface");
      expect(map.states["wurl:EGY"]).toBe("surface");
      expect(Object.values(map.states)).not.toContain("selectable");
      expect(Object.values(map.states)).not.toContain("hinted");
      const node = shell(start(index));
      expect(
        node.querySelector(".journey-text-clue blockquote")?.textContent,
      ).toBe(q.textClue!.text);
      expect(
        node
          .querySelector(".journey-text-clue blockquote")
          ?.getAttribute("lang"),
      ).toBe(q.textClue!.lang);
      expect(node.querySelector(".journey-text-clue figcaption")).toBeNull();
      expect(q.prompt).toBe("Find a country where this language is official:");
      expect(q.textClue!.reveal.translation).not.toContain("—a saying");
      expect(node.textContent).not.toContain(q.textClue!.reveal.language);
      expect(node.textContent).not.toContain(q.textClue!.reveal.translation);
    }
    expect(
      shell(start(0)).querySelector("blockquote")?.getAttribute("dir"),
    ).toBe("rtl");
  });
  it("keeps assists mixed, restricts actual input and preserves the canonical answers and help ceilings", () => {
    for (const [index, q] of journey.rounds.entries()) {
      if (q.rule.type !== "country-ids") throw Error("Expected country set");
      const original = [...q.rule.ids];
      const hinted = reduce(start(index), { type: "request-hint" });
      const assisted = reduce(hinted, { type: "request-assist" });
      const candidates = q.guidance!.assist!.candidateIds!;
      expect(candidates).toHaveLength(6);
      expect(
        candidates.filter((id) => original.includes(id)).length,
      ).toBeGreaterThanOrEqual(2);
      expect(
        candidates.filter((id) => !original.includes(id)).length,
      ).toBeGreaterThanOrEqual(2);
      const map = view(assisted);
      expect(map.selectableRegionIds?.sort()).toEqual([...candidates].sort());
      const valid = candidates.find((id) => original.includes(id))!;
      expect(journeyPoints(reduce(hinted, { type: "select", id: valid }))).toBe(
        2,
      );
      expect(
        journeyPoints(reduce(assisted, { type: "select", id: valid })),
      ).toBe(1);
      const excluded = selectableIds(q, context).find(
        (id) => !candidates.includes(id),
      )!;
      expect(reduce(assisted, { type: "select", id: excluded })).toBe(assisted);
      expect(q.rule.ids).toEqual(original);
      expect(`${q.guidance!.hint} ${q.guidance!.assist!.text}`).not.toMatch(
        /\b(Arabic|Portuguese|Russian|Malay|Guaraní)\b/i,
      );
    }
    expect(journey.rounds[1].guidance!.assist!.candidateIds).toEqual(
      expect.arrayContaining(["wurl:PRT", "wurl:BRA"]),
    );
    expect(journey.rounds[2].guidance!.assist!.candidateIds).toContain(
      "wurl:RUS",
    );
  });
  it("preserves real misses while revealing every network together and retaining only an illustrative solution in recap", () => {
    for (const [index, q] of journey.rounds.entries()) {
      if (q.rule.type !== "country-ids") throw Error("Expected set");
      const game = choose(index, "wurl:CAN");
      expect(game.answers[0].correct).toBe(false);
      expect(journeyPoints(game)).toBe(0);
      const map = view(game);
      expect(map.states["wurl:CAN"]).toBe("incorrect");
      expect(map.focus).toMatchObject(
        regions.find((region) => region.id === "wurl:CAN")!.focus,
      );
      expect(q.rule.ids.every((id) => map.states[id] === "hinted")).toBe(true);
      const node = shell(game);
      expect(node.querySelector("figcaption em")?.textContent).toContain(
        q.textClue!.reveal.translation,
      );
      expect(node.querySelector(".feedback-map-key")?.textContent).toContain(
        "Official-language network",
      );
      expect(
        node.querySelector(".journey-correct-answer")?.textContent,
      ).toContain(context.names.get(q.rule.ids[0]));
      const recap = view({ ...game, phase: "finished" });
      expect(recap.states["wurl:CAN"]).toBe("incorrect");
      expect(recap.states[q.rule.ids[0]]).toBe("visited");
      expect(
        q.rule.ids.slice(1).every((id) => recap.states[id] !== "visited"),
      ).toBe(true);
    }
  });
  it("keeps accepted alternatives, actual mistakes and points through saved review captures", () => {
    const picks = ["wurl:MLI", "wurl:TLS", "wurl:KAZ", "wurl:IDN", "wurl:ARG"];
    const games = picks.map((id, index) => choose(index, id));
    const completed = {
      ...games.at(-1)!,
      phase: "finished" as const,
      answers: games.flatMap((game) => game.answers),
    };
    expect(journeyPoints(completed)).toBe(12);
    const restored = restoreReview(journey, captureReview(journey, completed));
    expect(restored).toEqual(completed);
    expect(view(restored).states).toMatchObject({
      "wurl:MLI": "visited",
      "wurl:TLS": "visited",
      "wurl:KAZ": "visited",
      "wurl:IDN": "visited",
      "wurl:ARG": "incorrect",
      "wurl:PRY": "visited",
    });
    expect(view(restored).states["wurl:EGY"]).not.toBe("visited");
    expect(view(restored).routes).toEqual([]);
  });
  it("rejects assists that remove every valid alternative or leave only valid answers", () => {
    const q = journey.rounds[0];
    for (const candidateIds of [
      ["wurl:KEN", "wurl:ETH"],
      ["wurl:EGY", "wurl:MAR"],
    ])
      expect(() =>
        createQuestionContext(regions, [], {
          ...journey,
          rounds: [
            {
              ...q,
              guidance: {
                hint: "Hint",
                assist: { text: "Assist", candidateIds },
              },
            },
          ],
        }),
      ).toThrow(/Assist must preserve/);
  });
});
