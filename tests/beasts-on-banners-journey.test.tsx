// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BEASTS_ON_BANNERS_JOURNEY as journey } from "../src/game/beastsOnBannersJourney";
import { GameShell } from "../src/game/GameShell";
import { auditJourney } from "../src/game/journeyAudit";
import {
  JOURNEY_INDEX,
  journeyPath,
  loadJourney,
} from "../src/game/journeyRegistry";
import { modeForPath } from "../src/app/modes";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { pointAlongBearing } from "../src/game/geodesic";
import { pinDistance } from "../src/game/answerTargets";
import type { RegionFeature } from "../src/geography/types";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const at = (roundIndex: number): GameState => ({
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
const imagePaths = (game: GameState) =>
  [...shell(game).querySelectorAll("img")].map((image) =>
    image.getAttribute("src"),
  );
const playImages = (index: number) =>
  [
    journey.rounds[index].image!.src,
    journey.rounds[index].image!.context?.src,
  ].filter(Boolean);
const revealImages = (flags: NonNullable<typeof journey.completion>["flags"]) =>
  flags!.flatMap((flag) => [flag.detail?.src, flag.src].filter(Boolean));
const assist = (game: GameState) =>
  step(game, { type: "request-hint" }, { type: "request-assist" });

describe("Beasts on Banners", () => {
  it("passes the audit and loads through its registered practice route", async () => {
    const report = auditJourney(journey, regions, (asset) =>
      existsSync(`public${asset}`),
    );
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
    expect(JOURNEY_INDEX.find((item) => item.id === journey.id)).toMatchObject({
      path: "/journey/beasts-on-banners",
      module: "./beastsOnBannersJourney.ts",
      addedAt: "2026-10-29",
      saveRevision: 2,
    });
    expect(journeyPath(journey.id)).toBe("/journey/beasts-on-banners");
    expect(modeForPath(journeyPath(journey.id))).toBe("practice");
    expect(await loadJourney(journey.id)).toBe(journey);
  });

  it("withholds Mexico's point through help, then reveals the target and an actual missed pin", () => {
    const q = journey.rounds[0];
    const country = regions.find((region) => region.id === "wurl:MEX")!;
    expect(view(at(0)).focus.altitude).toBeGreaterThanOrEqual(
      country.focus.altitude!,
    );
    expect(
      pinDistance(q, { ...initialGame, pin: view(at(0)).focus }),
    ).toBeGreaterThan(300);
    for (const reference of view(assist(at(0))).places)
      expect(
        pinDistance(q, { ...initialGame, pin: reference }),
      ).toBeGreaterThan(300);
    for (const game of [
      at(0),
      step(at(0), { type: "request-hint" }),
      assist(at(0)),
    ]) {
      const world = view(game);
      expect(
        world.places.some(
          (p) => p.id === "beasts:templo-mayor" || /Mexico City/.test(p.name),
        ),
      ).toBe(false);
      expect(
        (world.overlays ?? []).some((o) => o.id.startsWith("pin-tolerance:")),
      ).toBe(false);
      expect(world.states["wurl:MEX"]).toBe("hinted");
    }
    expect(view(assist(at(0))).places.map((p) => p.name)).toEqual(
      expect.arrayContaining(["Guadalajara", "Oaxaca"]),
    );
    const missed = step(
      assist(at(0)),
      { type: "drop-pin", lat: 25, lng: -105 },
      { type: "submit" },
    );
    expect(missed.answers[0]).toMatchObject({ correct: false, points: 0 });
    const revealed = view(missed);
    expect(revealed.places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "beasts:templo-mayor",
          markerRole: "target",
          visualState: "answer",
        }),
        expect.objectContaining({
          id: `pin:${q.id}:guess`,
          lat: 25,
          lng: -105,
          visualState: "incorrect",
        }),
      ]),
    );
    expect(
      revealed.places.some((p) =>
        ["place:4005539", "place:3522507"].includes(p.id),
      ),
    ).toBe(false);
    expect(
      (revealed.overlays ?? [])
        .filter((o) => o.id.startsWith("pin-tolerance:"))
        .map((o) => o.type === "circle" && o.radiusKm),
    ).toEqual([100, 200, 300]);
    const advanced = step(missed, { type: "next" });
    expect(advanced.pin).toBeUndefined();
    expect(
      view(advanced).places.some(
        (p) => p.id === "beasts:templo-mayor" || p.sourceId === "player",
      ),
    ).toBe(false);
    expect(
      (view(advanced).overlays ?? []).some((o) =>
        o.id.startsWith("pin-tolerance:"),
      ),
    ).toBe(false);
  });

  it("grades the authored pin boundaries and applies help ceilings independently", () => {
    const q = journey.rounds[0];
    if (q.rule.type !== "pin-distance") throw Error("Expected a distance pin");
    const targetId = q.rule.targetId;
    const target = q.places!.find((p) => p.id === targetId)!;
    for (const [km, points] of [
      [0, 3],
      [100, 3],
      [100.001, 2],
      [200, 2],
      [200.001, 1],
      [300, 1],
      [300.001, 0],
    ] as const) {
      const pin = pointAlongBearing(target, 90, km / 6371.0088);
      for (const [start, ceiling] of [
        [at(0), 3],
        [step(at(0), { type: "request-hint" }), 2],
        [assist(at(0)), 1],
      ] as const) {
        const result = step(
          start,
          { type: "drop-pin", ...pin },
          { type: "submit" },
        );
        expect(result.answers[0].points).toBe(Math.min(points, ceiling));
        expect(result.answers[0].correct).toBe(km <= 300);
      }
    }
  });

  it.each([1, 2, 3, 4])(
    "restores both images after every correct/wrong answer and clears the prior round (%i)",
    (index) => {
      const q = journey.rounds[index];
      if (q.rule.type !== "choice-ids") throw Error("Expected choices");
      const country = q.contextIds![0];
      for (const start of [
        at(index),
        step(at(index), { type: "request-hint" }),
        assist(at(index)),
      ]) {
        const paths = imagePaths(start);
        expect(paths).toEqual(playImages(index));
        if (index === 2) expect(paths).toHaveLength(1);
        expect(view(start).states[country]).toBe("hinted");
      }
      if (index !== 2) {
        // The full flag must be altered too. Only rendered media is checked here;
        // named answer choices are intentionally visible before submission.
        expect(q.image!.context!.src).toContain("-clue.svg");
        const markup = shell(at(index));
        const mediaAlt = [...markup.querySelectorAll(".flag-clue img")]
          .map((img) => img.getAttribute("alt"))
          .join(" ");
        expect(mediaAlt).not.toMatch(
          index === 1 ? /cows?/i : index === 3 ? /sword/i : /llama/i,
        );
      } else {
        expect(
          shell(at(index)).querySelector(".flag-clue")!.textContent,
        ).not.toMatch(/thunder/i);
        expect(
          [...shell(at(index)).querySelectorAll(".flag-clue img")]
            .map((img) => img.getAttribute("alt"))
            .join(" "),
        ).not.toMatch(/thunder/i);
      }
      for (const choice of q.choices!) {
        const result = step(
          at(index),
          { type: "select", id: choice.id },
          { type: "submit" },
        );
        const correct = choice.id === q.rule.ids[0];
        expect(result.answers[0]).toMatchObject({
          correct,
          points: correct ? 3 : 0,
        });
        expect(imagePaths(result)).toEqual(revealImages(q.feedbackFlags));
        if (index === 2) expect(imagePaths(result)).toHaveLength(1);
        expect(shell(result).querySelector(".flag-clue")).toBeNull();
        expect(view(result).states[country]).toBe("hinted");
        expect(Object.values(view(result).states)).not.toContain("correct");
        if (index < journey.rounds.length - 1) {
          const next = step(result, { type: "next" });
          expect(imagePaths(next)).toEqual(playImages(index + 1));
          expect(imagePaths(next)).not.toContain(q.image!.src);
        }
      }
    },
  );

  it.each([1, 2, 3, 4])(
    "preserves a removable selection, limits fresh assist candidates and caps points (%i)",
    (index) => {
      const q = journey.rounds[index];
      if (q.rule.type !== "choice-ids") throw Error("Expected choices");
      const survivors = q.guidance!.assist!.candidateIds!;
      const eliminated = q.choices!.find((c) => !survivors.includes(c.id))!.id;
      const helped = assist(
        step(at(index), { type: "select", id: eliminated }),
      );
      expect(helped.selectedIds).toEqual([eliminated]);
      // Shared help preserves pending answers until the player removes them.
      const cleared = step(helped, { type: "select", id: eliminated });
      expect(cleared.selectedIds).toEqual([]);
      const markup = shell(cleared);
      const buttons = [
        ...markup.querySelectorAll<HTMLButtonElement>(".candidate-grid button"),
      ];
      expect(
        buttons
          .filter((button) => !button.disabled)
          .map((button) => button.querySelector("span")?.textContent?.trim()),
      ).toEqual(
        q.choices!.filter((c) => survivors.includes(c.id)).map((c) => c.label),
      );
      const reduced = step(
        helped,
        { type: "select", id: q.rule.ids[0] },
        { type: "submit" },
      );
      expect(reduced.answers[0]).toMatchObject({ correct: true, points: 1 });
      const hinted = step(
        at(index),
        { type: "request-hint" },
        { type: "select", id: q.rule.ids[0] },
        { type: "submit" },
      );
      expect(hinted.answers[0]).toMatchObject({ correct: true, points: 2 });
    },
  );

  it("finishes a mixed run with five restored flags, reviewed geography and the saved missed pin", () => {
    let game = step(
      at(0),
      { type: "drop-pin", lat: 25, lng: -105 },
      { type: "submit" },
      { type: "next" },
    );
    for (let index = 1; index < journey.rounds.length; index++) {
      const q = journey.rounds[index];
      if (q.rule.type !== "choice-ids") throw Error("Expected choices");
      const answerId = q.rule.ids[0];
      const selected =
        index === 2 ? q.choices!.find((c) => c.id !== answerId)!.id : answerId;
      game = step(
        game,
        { type: "select", id: selected },
        { type: "submit" },
        { type: "next" },
      );
    }
    expect(game.phase).toBe("finished");
    expect(game.answers).toHaveLength(5);
    const final = view(game);
    for (const id of [
      "wurl:MEX",
      "wurl:AND",
      "wurl:BTN",
      "wurl:LKA",
      "wurl:BOL",
    ])
      expect(final.states[id]).toBe("visited");
    expect(final.places).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "beasts:templo-mayor",
          visualState: "visited",
        }),
        expect.objectContaining({
          sourceId: "player",
          lat: 25,
          lng: -105,
          visualState: "incorrect",
        }),
      ]),
    );
    expect(final.routes).toEqual([]);
    expect(final.overlays ?? []).toEqual([]);
    expect(imagePaths(game)).toEqual(revealImages(journey.completion!.flags));
    expect(shell(game).textContent).toContain(
      "Five animals, five different meanings",
    );
    expect(step(game, { type: "start" }).answers).toEqual([]);
  });
});
