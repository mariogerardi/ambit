// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { geoContains } from "d3-geo";
import { IM_LIKE_A_BIRD_JOURNEY as journey } from "../src/game/imLikeABirdJourney";
import { greatCircleArc } from "../src/game/geodesic";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import {
  JOURNEY_INDEX,
  journeyPath,
  loadJourney,
} from "../src/game/journeyRegistry";
import { auditJourney } from "../src/game/journeyAudit";
import {
  createQuestionContext,
  solutionIds,
} from "../src/game/questionPreparation";
import { canSubmit, isCorrect } from "../src/game/questionEvaluation";
import { GameShell } from "../src/game/GameShell";
import { AnswerForm } from "../src/game/AnswerForm";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
  ordered: [...journey.rounds[roundIndex].orderInitial!],
});
const step = (game: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, journey, context), game);
const view = (game: GameState) => journeyWorld(regions, journey, game, context);
const place = (
  index: number,
  ids = solutionIds(journey.rounds[index], context),
) =>
  step(
    at(index),
    ...ids.map((id, index): Action => ({ type: "order-card", id, index })),
  );
const html = (game: GameState) =>
  renderToStaticMarkup(
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

describe("I’m Like a Bird", () => {
  it("passes the audit, retains licensed media, and loads through its registered route", async () => {
    const report = auditJourney(journey, regions, (asset) =>
      existsSync(`public${asset}`),
    );
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)).toMatchObject({
      path: "/journey/im-like-a-bird",
      module: "./imLikeABirdJourney.ts",
      addedAt: "2026-11-02",
      saveRevision: 1,
    });
    expect(journeyPath(journey.id)).toBe("/journey/im-like-a-bird");
    expect(await loadJourney(journey.id)).toBe(journey);
    expect(journey.rounds).toHaveLength(5);
    for (const q of journey.rounds) {
      expect(existsSync(`public${q.image!.src}`)).toBe(true);
      expect(q.feedbackImage!.credit.license).toMatch(/^CC BY/);
    }
  });

  it.each(journey.rounds.map((q, index) => ({ q, index })))(
    "grades exact sequence and exclusion for $q.title",
    ({ q, index }) => {
      const ids = solutionIds(q, context);
      const distractor = q.choices!.find((c) => !ids.includes(c.id))!.id;
      expect(q.choices).toHaveLength(5);
      expect(ids).toHaveLength(4);
      expect(canSubmit(q, context, at(index))).toBe(true);
      expect(
        canSubmit(q, context, { ...at(index), ordered: ids.slice(0, 3) }),
      ).toBe(false);
      expect(isCorrect(q, context, place(index))).toBe(true);
      const correct = step(place(index), { type: "submit" });
      expect(correct.answers.at(-1)).toMatchObject({ correct: true });
      expect(html(correct)).toContain("Well ordered.");
      expect(html(correct)).not.toContain('aria-label="Your assignments"');
      expect(html(correct)).not.toContain("journey-correct-answer");
      for (let slot = 0; slot < 4; slot++) {
        const wrongIds = [...ids];
        wrongIds[slot] = distractor;
        const wrong = step(place(index, wrongIds), { type: "submit" });
        expect(wrong.answers.at(-1)).toMatchObject({ correct: false });
        expect(view(wrong).states[distractor]).toBe("incorrect");
        expect(["answer", "correct", "incorrect"]).toContain(
          view(wrong).states[ids[slot]],
        );
        expect(html(wrong)).toContain("Not quite.");
      }
      expect(isCorrect(q, context, place(index, [...ids].reverse()))).toBe(
        false,
      );
      const duplicate = {
        ...at(index),
        ordered: [ids[0], ids[0], ids[2], ids[3]],
      };
      expect(isCorrect(q, context, duplicate)).toBe(false);
    },
  );

  it("keeps countries anonymous through play/help while flow cues follow the route and clear on advance", () => {
    for (const [index, q] of journey.rounds.entries()) {
      for (const game of [
        at(index),
        place(index),
        step(at(index), { type: "request-hint" }),
        step(at(index), { type: "request-hint" }, { type: "request-assist" }),
      ]) {
        const world = view(game);
        expect(world.regionReveal).toBeUndefined();
        expect(world.overlays).toHaveLength(1);
        expect(world.overlays![0]).toMatchObject({
          type: "path",
          opacity: 0,
          arrowhead: false,
          flow: { durationMs: 18000, size: 1.8, opacity: 1 },
        });
        expect(world.showBorders).toBe(true);
        expect(world.regionNames).toBe("none");
        expect(world.selectableRegionIds).toEqual([]);
        expect(world.physicalFeatures).toEqual(q.physicalFeatures);
        for (const id of q.choices!.map((c) => c.id))
          expect(world.states[id]).toBe("disabled");
      }
      const assisted = step(
        at(index),
        { type: "request-hint" },
        { type: "request-assist" },
      );
      expect(assisted.ordered[0]).toBe(solutionIds(q, context)[0]);
      const revealed = step(place(index), { type: "submit" });
      expect(view(revealed).regionReveal?.ids).toEqual(solutionIds(q, context));
      expect(
        view(revealed).overlays?.find((o) => o.type === "path" && o.reveal),
      ).toMatchObject({
        type: "path",
        arrowhead: true,
        reveal: { durationMs: 3400 },
      });
      if (index < 4) {
        const next = view(step(revealed, { type: "next" }));
        expect(next.overlays).toHaveLength(1);
        expect(next.overlays![0].id).not.toBe(q.overlays![0].id);
        expect(
          next.physicalFeatures.some((f) => f.id === q.physicalFeatures![0].id),
        ).toBe(false);
        expect(next.regionReveal).toBeUndefined();
      }
    }
  });

  it("uses small corridor polygons with the selected Bhutan crossing and no distractor center", () => {
    for (const [index, q] of journey.rounds.entries()) {
      const shape = q.physicalFeatures![0].geometry!;
      expect(shape.type).toBe("Polygon");
      const path = q.feedbackOverlays![0];
      if (path.type !== "path") throw Error("Missing migration direction");
      for (const point of path.coordinates.slice(1, -1))
        expect(geoContains(shape, point as [number, number])).toBe(true);
      const distractor = q.choices!.find(
        (c) => !solutionIds(q, context).includes(c.id),
      )!;
      const f = context.targets.get(distractor.id)!.focus;
      expect(geoContains(shape, [f.lng, f.lat])).toBe(false);
      const samples = path.coordinates.flatMap(([lng, lat], i, points) =>
        i === 0
          ? [[lng, lat]]
          : greatCircleArc(
              { lng: points[i - 1][0], lat: points[i - 1][1] },
              { lng, lat },
            ).slice(1),
      );
      const crossed = samples.flatMap((point) =>
        solutionIds(q, context).filter((id) =>
          geoContains(
            sphericalGeometry(context.targets.get(id)!.geometry),
            point as [number, number],
          ),
        ),
      );
      expect([...new Set(crossed)]).toEqual(solutionIds(q, context));
      const boundary =
        shape.type === "Polygon"
          ? shape.coordinates.flat()
          : shape.coordinates.flat(2);
      for (const point of [...samples, ...boundary]) {
        // Check the ribbon boundary as well as its centerline against the spare.
        expect(
          geoContains(
            sphericalGeometry(context.targets.get(distractor.id)!.geometry),
            point as [number, number],
          ),
          `${q.id}: corridor enters ${distractor.label} at ${point}`,
        ).toBe(false);
      }
      if (index === 4) expect(geoContains(shape, [90.2, 27.4])).toBe(true);
    }
  });

  it("finishes with five separate corridors and saved reviews, without replaying reveal animations", () => {
    let game: GameState = step(initialGame, { type: "start" });
    for (const q of journey.rounds) {
      game = step(
        game,
        ...solutionIds(q, context).map(
          (id, index): Action => ({ type: "order-card", id, index }),
        ),
        { type: "submit" },
        { type: "next" },
      );
    }
    expect(game.phase).toBe("finished");
    expect(game.answers).toHaveLength(5);
    expect(view(game).physicalFeatures).toEqual(
      journey.rounds.flatMap((q) => q.physicalFeatures!),
    );
    expect(view(game).overlays).toHaveLength(5);
    expect(
      view(game).overlays!.every(
        (o) => o.type === "path" && !o.reveal && !o.flow,
      ),
    ).toBe(true);
    expect(view(game).regionReveal).toBeUndefined();
    expect(html(game)).toContain("Political borders");
  });

  it("starts with five occupied positions, swaps the leave-out card, and preserves assistance and the draft", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const q = journey.rounds[0];
    let game = step(initialGame, { type: "start" });
    const render = () =>
      root.render(
        <AnswerForm
          question={q}
          context={context}
          game={game}
          dispatch={(a) => {
            game = step(game, a);
            render();
          }}
          webgl
        />,
      );
    const names = () =>
      [...host.querySelectorAll(".order-slots .order-card")].map((b) =>
        b.textContent?.replace("⠿", ""),
      );
    try {
      await act(render);
      const first = names();
      expect(first).toHaveLength(5);
      expect(new Set(first).size).toBe(5);
      expect(first).not.toEqual(q.choices!.map((c) => c.label));
      expect(host.querySelector(".order-bank")).toBeNull();
      expect(host.querySelectorAll(".order-slots li")).toHaveLength(5);
      expect(canSubmit(q, context, game)).toBe(true);
      expect(
        host.querySelector('[aria-label="Leave out: Sweden"]'),
      ).toBeTruthy();
      await act(() =>
        host
          .querySelector<HTMLButtonElement>('[aria-label="First: Germany"]')!
          .click(),
      );
      await act(() =>
        host
          .querySelector<HTMLButtonElement>('[aria-label="Leave out: Sweden"]')!
          .click(),
      );
      expect(game.ordered[0]).toBe("wurl:SWE");
      expect(
        host.querySelector('[aria-label="Leave out: Germany"]'),
      ).toBeTruthy();
      game = step(game, { type: "request-hint" });
      await act(render);
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="Leave out: Italy, locked by hint"]',
        )!.disabled,
      ).toBe(true);
      expect(game.ordered).not.toContain("wurl:ITA");
      expect(new Set(names()).size).toBe(5);
      game = step(game, { type: "request-assist" });
      await act(render);
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="First: Sweden, locked by assist"]',
        )!.disabled,
      ).toBe(true);
      expect(
        step(game, { type: "order-card", id: "wurl:SWE", index: -1 }),
      ).toBe(game);
      expect(new Set(names()).size).toBe(5);
      expect(canSubmit(q, context, game)).toBe(true);
    } finally {
      await act(() => root.unmount());
      host.remove();
      random.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it("keeps the hint's eliminated spare out through assist, clear and stale-draft restoration", () => {
    for (const [index, q] of journey.rounds.entries()) {
      const spare = q.guidance!.hintAsideId!;
      const hinted = step(at(index), { type: "request-hint" });
      expect(hinted.ordered).not.toContain(spare);
      expect(step(hinted, { type: "order-card", id: spare, index: 0 })).toBe(
        hinted,
      );
      expect(
        step(hinted, { type: "order-card", id: hinted.ordered[0], index: -1 }),
      ).toBe(hinted);
      const assisted = step(hinted, { type: "request-assist" });
      const cleared = step(assisted, { type: "clear" });
      expect(cleared.ordered[0]).toBe(solutionIds(q, context)[0]);
      expect(cleared.ordered).not.toContain(spare);
      const stale = step(
        { ...at(index), help: assisted.help },
        { type: "order-card", id: spare, index: 2 },
      );
      expect(stale.ordered).not.toContain(spare);
      expect(stale.ordered[0]).toBe(solutionIds(q, context)[0]);
      const complete = (base: GameState) =>
        step(
          base,
          ...solutionIds(q, context).map(
            (id, index): Action => ({ type: "order-card", id, index }),
          ),
          { type: "submit" },
        );
      expect(complete(hinted).answers.at(-1)).toMatchObject({
        correct: true,
        points: 2,
      });
      expect(complete(assisted).answers.at(-1)).toMatchObject({
        correct: true,
        points: 1,
      });
      expect(() =>
        createQuestionContext(regions, [], {
          ...journey,
          rounds: [
            {
              ...q,
              guidance: {
                ...q.guidance!,
                hintAsideId: solutionIds(q, context)[0],
              },
            },
          ],
        }),
      ).toThrow("Invalid ordering");
    }
  });
});
