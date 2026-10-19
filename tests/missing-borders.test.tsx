// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { geoArea, geoContains } from "d3-geo";
import type { RegionFeature } from "../src/geography/types";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { MISSING_BORDERS_JOURNEY as journey } from "../src/game/missingBordersJourney";
import { compositeRegion, dissolveRegions } from "../src/game/compositeRegions";
import { defineQuestion } from "../src/game/questionBuilder";
import {
  createQuestionContext,
  selectableIds,
} from "../src/game/questionPreparation";
import { canSubmit, isCorrect } from "../src/game/questionEvaluation";
import { regionAnswerId } from "../src/game/presentation";
import { initialGame, gameReducer } from "../src/game/state";
import type { GameState } from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { AnswerForm } from "../src/game/AnswerForm";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const playing = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const parts = (region: RegionFeature) =>
  region.geometry.type === "Polygon"
    ? [region.geometry.coordinates]
    : region.geometry.coordinates;
const edges = (region: RegionFeature) =>
  parts(region).flatMap((part) =>
    part.flatMap((ring) =>
      ring
        .slice(1)
        .map((point, i) => [point.join(), ring[i].join()].sort().join("|")),
    ),
  );

describe("Missing Borders composite mechanic", () => {
  for (const [index, question] of journey.rounds.entries()) {
    it(`dissolves only internal edges and picks all members: ${question.id}`, () => {
      if (question.rule.type !== "merged-region") throw Error("Wrong rule");
      const rule = question.rule;
      const members = rule.memberIds.map(
        (id) => regions.find((region) => region.id === id)!,
      );
      const merged = compositeRegion(regions, question);
      const frequencies = new Map<string, number>();
      for (const edge of members.flatMap(edges))
        frequencies.set(edge, (frequencies.get(edge) ?? 0) + 1);
      expect(edges(merged).sort()).toEqual(
        [...frequencies]
          .filter(([, count]) => count === 1)
          .map(([edge]) => edge)
          .sort(),
      );
      expect(geoArea(sphericalGeometry(merged.geometry))).toBeCloseTo(
        members.reduce(
          (sum, member) => sum + geoArea(sphericalGeometry(member.geometry)),
          0,
        ),
        10,
      );
      for (const member of members) {
        expect(regionAnswerId(question, member)).toBe(rule.targetId);
        for (const part of parts(member)) {
          const ring = part[0];
          const samples = ring
            .slice(2)
            .map((point, i): [number, number] => [
              (ring[i][0] + ring[i + 1][0] + point[0]) / 3,
              (ring[i][1] + ring[i + 1][1] + point[1]) / 3,
            ]);
          const inside = samples.find((point) =>
            geoContains(
              sphericalGeometry({ type: "Polygon", coordinates: part }),
              point,
            ),
          );
          expect(inside, `interior sample of ${member.id}`).toBeDefined();
          expect(geoContains(sphericalGeometry(merged.geometry), inside!)).toBe(
            true,
          );
        }
        // Offshore parts have the same ID and retain their entire boundary, not a member picking mesh.
        expect(selectableIds(question, context)).not.toContain(member.id);
      }
      const rendered = journeyWorld(regions, journey, playing(index), context);
      expect(
        rendered.regions.filter((region) => rule.memberIds.includes(region.id)),
      ).toEqual([]);
      expect(
        rendered.regions.find((region) => region.id === rule.targetId),
      ).toBe(merged);
      expect(rendered.regionNames).toBe("none");
      expect(rendered.places).toEqual([]);
      for (const stage of ["hinted", "assisted"] as const) {
        const helped = journeyWorld(
          regions,
          journey,
          {
            ...playing(index),
            help: { [question.id]: stage },
          },
          context,
        );
        expect(helped.regions).toBe(rendered.regions);
        expect(helped.places).toEqual([]);
      }
      const neighbor =
        question.selection.type === "ids"
          ? question.selection.ids.find((id) => id !== rule.targetId)!
          : "";
      expect(regionAnswerId(question, context.targets.get(neighbor)!)).toBe(
        neighbor,
      );
    });
    it(`commits a tap, assists and restores both feedback outcomes: ${question.id}`, () => {
      if (
        question.rule.type !== "merged-region" ||
        question.selection.type !== "ids"
      )
        throw Error("Wrong contract");
      const target = question.rule.targetId;
      const wrong = question.selection.ids.find((id) => id !== target)!;
      const reduce = (
        state: GameState,
        action: Parameters<typeof gameReducer>[1],
      ) => gameReducer(state, action, journey, context);
      let game = playing(index);
      expect(canSubmit(question, context, game)).toBe(false);
      expect(
        canSubmit(question, context, {
          ...game,
          selectedIds: [question.rule.memberIds[0]],
        }),
      ).toBe(false);
      expect(
        isCorrect(question, context, {
          ...game,
          selectedIds: [question.rule.memberIds[0]],
        }),
      ).toBe(false);
      const typed = { ...game, text: question.resolvedLabel! };
      expect(reduce(typed, { type: "guess-country" })).toBe(typed);
      const miss = reduce(game, { type: "select", id: wrong });
      expect(miss.answers.at(-1)?.correct).toBe(false);
      expect(miss.phase).toBe("feedback");
      expect(reduce(miss, { type: "select", id: target })).toBe(miss);
      game = reduce(game, { type: "request-hint" });
      expect(journeyWorld(regions, journey, game, context).regions).toBe(
        journeyWorld(regions, journey, playing(index), context).regions,
      );
      game = reduce(game, { type: "request-assist" });
      expect(game.selectedIds).toEqual([]);
      const assisted = journeyWorld(regions, journey, game, context);
      expect(
        Object.values(assisted.states).filter(
          (state) => state === "selectable",
        ),
      ).toHaveLength(4);
      expect(assisted.states[target]).toBe("selectable");
      game = reduce(game, { type: "select", id: target });
      expect(game.answers.at(-1)?.correct).toBe(true);
      expect(game.answers.at(-1)?.receiptLabel).toBe(question.resolvedLabel);
      for (const correct of [true, false]) {
        const feedback = journeyWorld(
          regions,
          journey,
          {
            ...game,
            selectedIds: [correct ? target : wrong],
            answers: [{ ...game.answers[0], correct }],
          },
          context,
        );
        expect(feedback.regions).toBe(regions);
        expect(feedback.regions.some((region) => region.id === target)).toBe(
          false,
        );
        for (const id of question.rule.memberIds)
          expect(feedback.states[id]).toBe(correct ? "correct" : "answer");
        if (!correct) expect(feedback.states[wrong]).toBe("incorrect");
        expect(feedback.places.map((place) => place.name)).toEqual(
          question.rule.memberIds.map((id) =>
            id === "wurl:GMB" ? "The Gambia" : context.names.get(id),
          ),
        );
      }
    });
  }
  it("preserves a removed candidate in a restored assisted draft until the player changes it", () => {
    const question = journey.rounds[0];
    if (question.selection.type !== "ids") throw Error("Wrong contract");
    const removed = question.selection.ids.find(
      (id) => !question.guidance?.assist?.candidateIds?.includes(id),
    )!;
    const game = {
      ...playing(0),
      selectedIds: [removed],
      help: { [question.id]: "assisted" as const },
    };
    expect(canSubmit(question, context, game)).toBe(true);
    expect(journeyWorld(regions, journey, game, context).states[removed]).toBe(
      "selected",
    );
    const cleared = gameReducer(game, { type: "clear" }, journey, context);
    expect(
      journeyWorld(regions, journey, cleared, context).states[removed],
    ).toBe("disabled");
    expect(
      gameReducer(cleared, { type: "select", id: removed }, journey, context)
        .selectedIds,
    ).toEqual([]);
  });
  it("recaps canonical countries with all borders restored and five views", () => {
    const result = journeyWorld(
      regions,
      journey,
      { ...playing(4), phase: "finished" },
      context,
    );
    expect(result.regions).toBe(regions);
    expect(result.showBorders).toBe(true);
    expect(result.routes).toEqual([]);
    expect(journey.completion?.views).toHaveLength(5);
    expect(
      Object.values(result.states).filter((state) => state === "visited"),
    ).toHaveLength(11);
    expect(result.places).toHaveLength(11);
  });
  it("rejects duplicates, disconnected/incomplete adjacencies, member candidates and answer-revealing names", () => {
    const question = journey.rounds[0];
    if (question.rule.type !== "merged-region") throw Error("Wrong contract");
    const rule = question.rule;
    for (const invalid of [
      { ...question, rule: { ...rule, memberIds: ["wurl:ESP", "wurl:ESP"] } },
      {
        ...question,
        disclosure: { ...question.disclosure, committedNames: true },
      },
      {
        ...question,
        selection: {
          type: "ids" as const,
          ids: [rule.targetId, ...rule.memberIds],
        },
      },
    ])
      expect(() =>
        createQuestionContext(regions, [], { ...journey, rounds: [invalid] }),
      ).toThrow();
    for (const invalid of [
      {
        ...question,
        rule: {
          ...rule,
          memberIds: ["wurl:ESP", "wurl:JPN"],
          hiddenAdjacencies: [["wurl:ESP", "wurl:JPN"] as [string, string]],
        },
      },
      {
        ...question,
        rule: { ...rule, memberIds: [...rule.memberIds, "wurl:FRA"] },
      },
      {
        ...question,
        guidance: {
          hint: "Hint",
          assist: { text: "Only one", candidateIds: [rule.targetId] },
        },
      },
    ])
      expect(() =>
        createQuestionContext(regions, [], { ...journey, rounds: [invalid] }),
      ).toThrow();
    expect(() =>
      defineQuestion({
        ...question,
        mode: "merged-region-single",
        count: 1,
        commitment: "submit",
        selection: { type: "ids", ids: [rule.targetId, "wurl:FRA"] },
        rule: { ...rule, hiddenAdjacencies: [] },
      }),
    ).toThrow();
  });
  it("preserves holes rather than absorbing an enclave", () => {
    const square = (id: string, coordinates: number[][][]): RegionFeature => ({
      id,
      name: id,
      level: "ADM0",
      sourceId: "fixture",
      focus: { lat: 1, lng: 1 },
      geometry: { type: "Polygon", coordinates },
    });
    const left = square("left", [
      [
        [0, 0],
        [2, 0],
        [2, 3],
        [0, 3],
        [0, 0],
      ],
      [
        [0.5, 0.5],
        [0.5, 1],
        [1, 1],
        [1, 0.5],
        [0.5, 0.5],
      ],
    ]);
    const right = square("right", [
      [
        [2, 0],
        [4, 0],
        [4, 3],
        [2, 3],
        [2, 0],
      ],
    ]);
    const dissolved = dissolveRegions([left, right]);
    expect(dissolved.type).toBe("Polygon");
    expect(dissolved.coordinates).toHaveLength(2);
    expect(geoContains(sphericalGeometry(dissolved), [0.75, 0.75])).toBe(false);
    expect(geoContains(sphericalGeometry(dissolved), [3, 1])).toBe(true);
  });
});

afterEach(() => vi.unstubAllGlobals());
describe("globe-only answer controls", () => {
  for (const webgl of [true, false])
    it(`explains immediate tapping without submission, extra choices or hidden typing (WebGL ${webgl})`, async () => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      const host = document.createElement("div");
      const root = createRoot(host);
      const dispatch = vi.fn();
      const question = journey.rounds[0];
      try {
        await act(async () =>
          root.render(
            <AnswerForm
              question={question}
              context={context}
              game={playing(0)}
              dispatch={dispatch}
              webgl={webgl}
            />,
          ),
        );
        expect(host.textContent).not.toMatch(
          /Spain|Portugal|Answer by typing|Choose a territory with buttons|Territory [A-Z]/,
        );
        expect(
          host.querySelector("input, details, .candidate-grid, svg[role=img]"),
        ).toBeNull();
        const submit = () =>
          [...host.querySelectorAll<HTMLButtonElement>("button")].find(
            (button) => button.textContent?.includes("Submit answer"),
          )!;
        expect(submit()).toBeUndefined();
        expect(host.textContent).toContain("Your first answer is final.");
        if (question.rule.type !== "merged-region")
          throw Error("Wrong contract");
        const targetId = question.rule.targetId;
        await act(async () =>
          root.render(
            <AnswerForm
              question={question}
              context={context}
              game={{ ...playing(0), selectedIds: [targetId] }}
              dispatch={dispatch}
              webgl={webgl}
            />,
          ),
        );
        expect(submit()).toBeUndefined();
        const clear = [
          ...host.querySelectorAll<HTMLButtonElement>("button"),
        ].find((button) => button.textContent?.includes("Clear selection"))!;
        expect(clear).toBeUndefined();
      } finally {
        await act(async () => root.unmount());
      }
    });
  it("uses the requested Caribbean choices and four honest assist survivors", () => {
    const question = journey.rounds[1];
    if (
      question.rule.type !== "merged-region" ||
      question.selection.type !== "ids"
    )
      throw Error("Wrong contract");
    expect(question.selection.ids).toEqual([
      question.rule.targetId,
      "wurl:CUB",
      "wurl:JAM",
      "wurl:PAN",
      "wurl:COL",
      "wurl:VEN",
    ]);
    expect(question.guidance?.assist?.candidateIds).toEqual([
      question.rule.targetId,
      "wurl:CUB",
      "wurl:JAM",
      "wurl:COL",
    ]);
    expect(question.leadIn).toContain("around the Caribbean Sea");
    expect(question.guidance?.assist?.text).not.toContain(
      "four Caribbean island territories",
    );
  });
});

describe("composite persistence and completion", () => {
  it("keeps synthetic target drafts and assisted receipts in the existing save format", async () => {
    const { validGame } = await import("../src/app/dailyProgress");
    const { JOURNEY_INDEX } = await import("../src/game/journeyRegistry");
    const summary = JOURNEY_INDEX.find((entry) => entry.id === journey.id)!;
    const question = journey.rounds[0];
    if (question.rule.type !== "merged-region") throw Error("Wrong contract");
    const game = {
      ...playing(0),
      selectedIds: [question.rule.targetId],
      help: { [question.id]: "assisted" as const },
    };
    const draft = JSON.parse(JSON.stringify(game));
    expect(validGame(draft, summary)).toBe(true);
    const feedback = gameReducer(
      draft,
      { type: "select", id: question.rule.targetId },
      journey,
      context,
    );
    expect(feedback.answers[0]).toMatchObject({
      selectedIds: [question.rule.targetId],
      correct: true,
      receiptLabel: "Spain + Portugal",
    });
    expect(validGame(JSON.parse(JSON.stringify(feedback)), summary)).toBe(true);
  });
  it("shows completed receipts and help indicators without map-view links", async () => {
    const { GameShell } = await import("../src/game/GameShell");
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    const root = createRoot(host);
    const frame = vi.fn();
    const game: GameState = {
      ...playing(4),
      phase: "finished",
      answers: journey.rounds.map((question) => ({
        ...initialGame,
        roundId: question.id,
        correct: true,
        receiptLabel: question.resolvedLabel,
      })),
      help: {
        [journey.rounds[1].id]: "hinted",
        [journey.rounds[3].id]: "assisted",
      },
    };
    try {
      await act(async () =>
        root.render(
          <GameShell
            journey={journey}
            context={context}
            game={game}
            dispatch={() => {}}
            webgl
            frame={frame}
            onHome={() => {}}
            onStudy={() => {}}
          />,
        ),
      );
      expect(
        host.querySelector("[aria-label='Completion map views']"),
      ).toBeNull();
      expect(host.textContent).not.toMatch(/View [1-5]/);
      expect(host.querySelectorAll(".journey-receipt li")).toHaveLength(5);
      expect(host.querySelectorAll(".journey-row-help")).toHaveLength(2);
      expect(host.textContent).toContain("Estonia + Latvia + Lithuania");
      const notes = host.querySelector("[aria-label='Map notes']")!;
      expect(notes.textContent).toContain("Natural Earth");
      expect(notes.textContent).not.toMatch(
        /Five altered maps|Six erased borders|countries never changed/,
      );
      expect(notes.children).toHaveLength(1);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
