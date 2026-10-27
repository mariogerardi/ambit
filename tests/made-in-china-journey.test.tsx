// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MADE_IN_CHINA_JOURNEY as journey } from "../src/game/madeInChinaJourney";
import { journeyWorld } from "../src/app/journeyWorld";
import { auditJourney } from "../src/game/journeyAudit";
import { pointAnswerNoun } from "../src/game/answerTargets";
import { journeyPoints } from "../src/game/points";
import media from "../src/game/data/made-in-china-media.v1.json";
import geography from "../src/game/data/made-in-china-context.v1.json";
import {
  createQuestionContext,
  canSubmit,
  solutionIds,
  selectableIds,
} from "../src/game/questions";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import {
  upgradeDailyAttempt,
  validGame,
  type DailyAttempt,
} from "../src/app/dailyProgress";
import { GameShell } from "../src/game/GameShell";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const atRound = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const step = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, context),
    game,
  );
const view = (game: GameState) => journeyWorld(regions, journey, game, context);
const choose = (index: number, id: string, game = atRound(index)) =>
  step(game, { type: "select", id }, { type: "submit" });
const shell = (game: GameState) => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={game}
      dispatch={() => {}}
      webgl
      onHome={() => {}}
      onStudy={() => {}}
      frame={() => {}}
    />,
  );
  return node;
};

describe("Made in China: why here?", () => {
  it("audits the registered content and verifies local photograph/terrain provenance", () => {
    const report = auditJourney(journey, regions, (asset) =>
      existsSync(`public${asset}`),
    );
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(report.assets).toHaveLength(9);
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)?.saveRevision).toBe(
      2,
    );
    for (const image of Object.values(media)) {
      expect(
        createHash("sha256")
          .update(readFileSync(`public${image.src}`))
          .digest("hex"),
      ).toBe(image.sha256);
      expect(image.credit.licenseUrl).toMatch(/^https:\/\//);
    }
    for (const asset of Object.values(geography.provenance))
      expect(
        createHash("sha256")
          .update(readFileSync(`public${asset.src}`))
          .digest("hex"),
      ).toBe(asset.sha256);
  });

  it.each(journey.rounds.map((q, i) => [q.label, i] as const))(
    "grades every eligible response at %s, preserving actual misses",
    (_, index) => {
      const q = journey.rounds[index];
      const expected = solutionIds(q, context);
      expect(canSubmit(q, context, atRound(index))).toBe(false);
      const candidates = selectableIds(q, context);
      expect(candidates).toHaveLength(3);
      for (const id of candidates) {
        const result = choose(index, id);
        const correct = expected.includes(id);
        expect(result.phase).toBe("feedback");
        expect(result.answers[0]).toMatchObject({
          selectedIds: [id],
          correct,
          points: correct ? 3 : 0,
        });
        if (q.mode === "city-single") {
          const places = view(result).places;
          expect(places.find((p) => p.id === expected[0])?.visualState).toBe(
            correct ? "correct" : "answer",
          );
          if (!correct)
            expect(places.find((p) => p.id === id)?.visualState).toBe(
              "incorrect",
            );
        }
      }
      const invalid = step(
        atRound(index),
        { type: "select", id: "not-an-answer" },
        { type: "submit" },
      );
      expect(invalid.answers).toEqual([]);
      for (const [actions, reward] of [
        [[{ type: "request-hint" }], 2],
        [[{ type: "request-hint" }, { type: "request-assist" }], 1],
      ] as [Action[], number][]) {
        const helped = step(atRound(index), ...actions);
        expect(choose(index, expected[0], helped).answers[0]).toMatchObject({
          correct: true,
          points: reward,
        });
        if (reward === 1) {
          const remaining = q.guidance!.assist!.candidateIds!;
          expect(remaining).toContain(expected[0]);
          expect(remaining).toHaveLength(2);
          const excluded = candidates.find((id) => !remaining.includes(id))!;
          expect(
            step(helped, { type: "select", id: excluded }).selectedIds,
          ).toEqual([]);
        }
      }
    },
  );

  it("shows known cities, keeps factory identities for the reveal, and calls the fort candidates sites", () => {
    expect(
      view(atRound(0))
        .places.map((p) => p.name)
        .sort(),
    ).toEqual(["Chengdu", "Guangzhou", "Xi’an"].sort());
    const porcelain = view(atRound(1));
    expect(
      porcelain.places.find((p) => p.id === "place:1805680"),
    ).toMatchObject({
      name: "Jingdezhen",
      visualState: "hinted",
      displayRole: "explanation",
      answerTarget: false,
    });
    expect(pointAnswerNoun(journey.rounds[2])).toBe("site");
    expect(shell(atRound(2)).textContent).not.toContain("Select a city");
    const factories = view(atRound(4)).places;
    expect(factories.map((p) => p.name).sort()).toEqual([
      "",
      "",
      "",
      "Hong Kong",
    ]);
    expect(new Set(factories.map((p) => p.markerSize)).size).toBe(1);
    expect(shell(atRound(4)).textContent).not.toContain("Shenzhen");
    const missed = choose(4, "place:1812545");
    expect(
      view(missed).places.find((p) => p.id === "place:1795565"),
    ).toMatchObject({ name: "Shenzhen", visualState: "answer" });
    expect(
      shell(missed).querySelectorAll(".journey-feedback-image"),
    ).toHaveLength(2);
  });

  it("keeps terrain and rivers scoped to their questions and clears them for completion", () => {
    const terrain = view(atRound(2)).overlays!;
    expect(terrain).toHaveLength(1);
    expect(terrain[0]).toMatchObject({
      type: "raster-patch",
      bounds: geography.provenance.terrain.bounds,
    });
    expect(view(choose(2, "made-in-china:fort-north")).overlays).toEqual(
      terrain,
    );
    expect(view(atRound(3)).overlays).toEqual([
      expect.objectContaining({ assetUrl: geography.provenance.estuary.src }),
    ]);
    expect(
      view(atRound(3)).places.some((p) => p.name === "Yangtze River"),
    ).toBe(true);
    expect(view(atRound(4)).overlays ?? []).toEqual([]);
    expect(view(atRound(4)).physicalFeatures ?? []).toEqual([]);
    let game = step(initialGame, { type: "start" });
    journey.rounds.forEach((q, i) => {
      game = step(choose(i, solutionIds(q, context)[0], game), {
        type: "next",
      });
    });
    expect(game.phase).toBe("finished");
    expect(journeyPoints(game)).toBe(15);
    expect(validGame(JSON.parse(JSON.stringify(game)), journey)).toBe(true);
    expect(view(game).places).toHaveLength(5);
    expect(view(game).places.every((p) => p.visualState === "visited")).toBe(
      true,
    );
    expect(view(game).overlays ?? []).toEqual([]);
    expect(shell(game).querySelectorAll(".journey-answer-recap")).toHaveLength(
      5,
    );
  });

  it("preserves old earned grades and receipts while dropping obsolete drafts and reviews", () => {
    const old: DailyAttempt = {
      date: "2026-10-26",
      journeyId: journey.id,
      scheduleVersion: 1,
      runId: "original-run",
      startedAt: 123,
      game: {
        ...atRound(1),
        selectedIds: ["place:1800163"],
        help: {
          [journey.rounds[0].id]: "hinted",
          [journey.rounds[1].id]: "assisted",
        },
        answers: [
          {
            ...initialGame,
            roundId: journey.rounds[0].id,
            correct: true,
            points: 2,
            pointsVersion: 1,
            selectedIds: [],
            ordered: ["place:1815286", "place:1809858", "place:1790630"],
          },
        ],
      },
    };
    const upgraded = upgradeDailyAttempt(old, JOURNEY_INDEX);
    expect(upgraded).toMatchObject({
      runId: "original-run",
      startedAt: 123,
      contentRevision: 2,
    });
    expect(upgraded.game.roundIndex).toBe(1);
    expect(upgraded.game.selectedIds).toEqual([]);
    expect(upgraded.game.answers[0]).toMatchObject({
      correct: true,
      points: 2,
      receiptLabel: "Chengdu, Guangzhou & Xi’an",
      ordered: old.game.answers[0].ordered,
    });
    expect(upgraded.game.help).toEqual({ [journey.rounds[0].id]: "hinted" });
    expect(validGame(upgraded.game, journey)).toBe(true);
    const completed = { ...upgraded.game, phase: "finished" as const };
    const receipt = shell(completed);
    expect(receipt.textContent).toContain("Chengdu, Guangzhou & Xi’an");
    expect(receipt.querySelectorAll(".journey-answer-recap")).toHaveLength(0);
    expect(upgradeDailyAttempt(upgraded, JOURNEY_INDEX)).toBe(upgraded);
  });
});
