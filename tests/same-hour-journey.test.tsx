// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../src/geography/types";
import { SAME_HOUR_JOURNEY as journey } from "../src/game/sameHourJourney";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import {
  createQuestionContext,
  canSubmit,
  isCorrect,
} from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import { answerPlace, cityIdForName } from "../src/game/answerTargets";
import { journeyWorld } from "../src/app/journeyWorld";
import { prepareGlobeRegions } from "../src/globe/geometry";
import { AnswerForm } from "../src/game/AnswerForm";
import { mechanicFor } from "../src/game/mechanics";
import { GameShell } from "../src/game/GameShell";
import { auditJourney } from "../src/game/journeyAudit";
import { JOURNEYS } from "../src/game/journeys";
import { JOURNEY_INDEX, loadJourney } from "../src/game/journeyRegistry";
import {
  emptyDaily,
  openDaily,
  setDailyPuzzle,
  validDaily,
  recoverDaily,
  upgradeDailyAttempt,
} from "../src/app/dailyProgress";

const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, context),
    game,
  );
const help = (game: GameState) =>
  reduce(game, { type: "request-hint" }, { type: "request-assist" });
const view = (game: GameState) => journeyWorld(world, journey, game, context);
const actions: Action[][] = [
  [{ type: "select", id: "place:2306104" }],
  [{ type: "select", id: "wurl:POL" }],
  [{ type: "select", id: "same-hour:09" }],
  [{ type: "select", id: "same-hour:sunday" }],
  [{ type: "select", id: "place:2174003" }],
];

describe("Same Hour, Different Worlds", () => {
  it("grades all five single-answer questions and rejects every distractor", () => {
    for (const [i, question] of journey.rounds.entries()) {
      expect(canSubmit(question, context, at(i))).toBe(false);
      const correct = reduce(at(i), ...actions[i], { type: "submit" });
      expect(correct.phase).toBe("feedback");
      expect(correct.answers.at(-1)?.correct, question.id).toBe(true);
      const ids =
        question.selection.type === "ids"
          ? question.selection.ids
          : question.choices!.map((c) => c.id);
      for (const id of ids)
        expect(
          isCorrect(question, context, { ...at(i), selectedIds: [id] }),
        ).toBe(correct.selectedIds.includes(id));
    }
    let game = at(0);
    for (const answer of actions)
      game = reduce(game, ...answer, { type: "submit" }, { type: "next" });
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
    expect(game.answers.map((a) => a.receiptLabel)).toEqual(
      journey.rounds.map((q) => q.resolvedLabel),
    );
  });

  it("keeps named city candidates equally styled, with neutral parent countries and no offset clues", () => {
    const africa = view(at(0)).places.filter((p) => p.answerTarget);
    expect(africa.map((p) => p.name)).toEqual([
      "Accra",
      "Algiers",
      "Praia",
      "Oran",
    ]);
    const accra = africa[0];
    expect(africa.slice(1).every((p) => p.lat > accra.lat)).toBe(true);
    expect(africa.slice(2).every((p) => p.lng < accra.lng)).toBe(true);
    for (const index of [0, 4]) {
      const scene = view(at(index));
      const candidates = scene.places.filter((p) => p.answerTarget);
      expect(candidates).toHaveLength(index === 0 ? 4 : 3);
      expect(
        new Set(
          candidates.map(
            (p) => `${p.kind}/${p.markerSize}/${p.priority}/${p.visualState}`,
          ),
        ).size,
      ).toBe(1);
      for (const p of candidates) {
        expect(p.name).not.toMatch(/UTC|CET|\d:\d/);
        expect(p.kind).toBe("city");
        expect(p.visualState).toBe("selectable");
        expect(scene.states[p.parentId!]).toBe("disabled");
      }
      expect(mechanicFor(journey.rounds[index]).mapSelection).toBe("places");
      expect(scene.regionInteraction).toBe(false);
      const narrowed = view(help(at(index))).places.filter(
        (p) => p.answerTarget,
      );
      expect(narrowed.map((p) => p.id)).toEqual(
        journey.rounds[index].guidance!.assist!.candidateIds,
      );
      expect(new Set(narrowed.map((p) => p.visualState))).toEqual(
        new Set(["selectable"]),
      );
      expect(view(help(at(index))).focus).toEqual(scene.focus);
    }
    const q5 = journey.rounds[4];
    expect(cityIdForName(q5, "Guam")).toBeUndefined();
    expect(cityIdForName(q5, "Hagatna")).toBeUndefined();
    expect(answerPlace(q5, "place:2073124")?.sourceId).toBe("geonames:2073124");
  });

  it("highlights all four European candidates, narrows equally, and keeps only mainland Spain contextual", () => {
    const question = journey.rounds[1];
    const scene = view(at(1));
    for (const id of ["wurl:PRT", "wurl:POL", "wurl:GBR", "wurl:GRC"]) {
      expect(scene.states[id]).toBe("selectable");
      expect(
        scene.regions.find((r) => r.id === id)?.geometry.coordinates.length,
      ).toBeGreaterThan(0);
    }
    const mainland = scene.regions.find((r) => r.id === "clue-part:wurl:ESP")!;
    expect(
      geoContains(sphericalGeometry(mainland.geometry), [-3.7, 40.42]),
    ).toBe(true);
    expect(
      geoContains(sphericalGeometry(mainland.geometry), [-16.25, 28.46]),
    ).toBe(false);
    expect(scene.states[mainland.id]).toBe("hinted");
    expect(scene.states["wurl:ESP"]).toBe("disabled");
    const narrowed = view(help(at(1)));
    expect(narrowed.states["wurl:PRT"]).toBe("disabled");
    expect(narrowed.states["wurl:GBR"]).toBe("disabled");
    expect(narrowed.states["wurl:POL"]).toBe("selectable");
    expect(narrowed.states["wurl:GRC"]).toBe("selectable");
    for (const id of ["wurl:POL", "wurl:PRT"]) {
      const reveal = view(
        reduce(at(1), { type: "select", id }, { type: "submit" }),
      );
      expect(reveal.states[mainland.id]).toBe("hinted");
      expect(reveal.states["wurl:ESP"]).toBe("disabled");
      expect(reveal.states["wurl:POL"]).toBe(
        id === "wurl:POL" ? "correct" : "answer",
      );
    }
    expect(question.prompt).toContain("Madrid");
  });

  it("narrows the China choices and preserves the official/local distinction without reveal leaks", () => {
    const question = journey.rounds[2];
    expect(question.prompt).toContain("official time in Kashgar");
    expect(question.explanation).toContain(
      "unofficial local clock two hours behind",
    );
    expect(view(at(2)).places.map((p) => p.name)).toEqual([
      "Beijing",
      "Kashgar",
    ]);
    const helped = help(at(2));
    expect(
      reduce(helped, { type: "select", id: "same-hour:07" }).selectedIds,
    ).toEqual([]);
    expect(
      reduce(helped, { type: "select", id: "same-hour:08" }).selectedIds,
    ).toEqual(["same-hour:08"]);
    const reveal = view(reduce(at(2), ...actions[2], { type: "submit" }));
    expect(reveal.states["wurl:CHN"]).toBe("hinted");
    expect(reveal.places.every((p) => p.name.includes("09:00 · UTC+8"))).toBe(
      true,
    );
  });

  it("replaces matching with one day choice and reveals equal clock readings on different days", () => {
    const question = journey.rounds[3];
    expect(question.mode).toBe("choice-single");
    expect(question.choices!.map((c) => c.label)).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
    ]);
    expect(question.prompt).toContain("noon on Monday in Samoa");
    const scene = view(at(3));
    const rendered = prepareGlobeRegions(scene.regions);
    const samoa = scene.places.find((p) => p.name === "Samoa")!;
    const samoaLand = rendered.find((r) => r.id === "wurl:WSM")!;
    expect(geoContains(samoaLand.geometry, [samoa.lng, samoa.lat])).toBe(true);
    expect(scene.regionInteraction).toBe(false);
    expect(scene.places.map((p) => p.name)).toEqual([
      "Samoa",
      "American Samoa",
      "Savai‘i",
    ]);
    expect(
      scene.places.every((p) => p.visualState === "hinted" && !p.answerTarget),
    ).toBe(true);
    const helped = help(at(3));
    expect(
      reduce(helped, { type: "select", id: "same-hour:tuesday" }).selectedIds,
    ).toEqual([]);
    const answered = reduce(helped, ...actions[3], { type: "submit" });
    expect(answered.answers.at(-1)?.correct).toBe(true);
    const reveal = view(answered);
    expect(reveal.places.map((p) => p.name)).toEqual([
      "Samoa · Mon 12:00",
      "American Samoa · Sun 12:00",
      "Savai‘i",
    ]);
    expect(scene.overlays).toEqual([]);
    expect(reveal.overlays).toHaveLength(1);
    expect(reveal.overlays![0].type).toBe("path");
    const boundary = JSON.parse(
      readFileSync("public/geography/samoa-time-zone-line.v1.json", "utf8"),
    );
    const bundledBoundary = JSON.parse(
      readFileSync("src/game/data/samoa-time-zone-line.v1.json", "utf8"),
    );
    expect(bundledBoundary).toEqual(boundary);
    expect(boundary.sourceVersion).toBe("2026e");
    expect(boundary.geometry.coordinates.length).toBeGreaterThan(2);
    expect(reveal.overlays![0]).toMatchObject({
      coordinates: boundary.geometry.coordinates,
    });
    const western = scene.places.find((p) => p.name === "Samoa")!;
    const eastern = scene.places.find((p) => p.name === "American Samoa")!;
    expect(
      boundary.geometry.coordinates.every(
        ([lng]: number[]) => lng > western.lng && lng < eastern.lng,
      ),
    ).toBe(true);
    expect(Object.values(reveal.states)).not.toContain("correct");
    expect(reveal.routes).toEqual([]);
    expect(question.explanation).toContain("Sunday—at noon, too");
  });

  it("replaces Samoa's coarse outlines without duplicate land or changed grading geometry", () => {
    const scenes = [
      view(at(3)),
      view(reduce(at(3), ...actions[3], { type: "submit" })),
      view({ ...at(4), phase: "finished" }),
    ];
    for (const scene of scenes) {
      expect(scene.regions).toHaveLength(world.length);
      expect(new Set(scene.regions.map((r) => r.id)).size).toBe(world.length);
      for (const id of ["wurl:WSM", "wurl:ASM"]) {
        const original = world.find((r) => r.id === id)!;
        const visible = scene.regions.find((r) => r.id === id)!;
        expect(visible.geometry).toBe(original.geometry);
        expect(context.targets.get(id)?.geometry).toBe(original.geometry);
        expect(visible.displayGeometry).toBe(
          journey.rounds[3].displayGeometries![id],
        );
        expect(original.displayGeometry).toBeUndefined();
      }
    }
    const scene = scenes[0];
    const land = prepareGlobeRegions(scene.regions);
    const samoaLand = land.find((r) => r.id === "wurl:WSM")!;
    expect(samoaLand.geometry.type).toBe("MultiPolygon");
    expect(samoaLand.geometry.coordinates).toHaveLength(2);
    for (const p of scene.places) {
      const region = land.find((r) => r.id === p.parentId)!;
      expect(geoContains(region.geometry, [p.lng, p.lat]), p.name).toBe(true);
    }
    expect(scene.places.find((p) => p.name === "Savai‘i")?.markerHidden).toBe(
      true,
    );
    // Other stops continue to use the original, shared map.
    expect(view(at(0)).regions).toBe(world);
  });

  it("makes the finale one Australian pick, preserves edits and help in saves, and omits Guam", () => {
    const question = journey.rounds[4];
    for (const state of [
      at(4),
      help(at(4)),
      reduce(at(4), ...actions[4], { type: "submit" }),
    ])
      expect(view(state).places.some((p) => p.parentId === "wurl:GUM")).toBe(
        false,
      );
    expect(question.leadIn).not.toContain("Guam");
    expect(question.explanation).not.toContain("Guam");
    expect(question.mode).toBe("city-single");
    expect(question.selection).toEqual({
      type: "ids",
      ids: ["place:2174003", "place:2073124", "place:2063523"],
    });
    expect(
      reduce(at(4), { type: "select", id: "place:4044012" }).selectedIds,
    ).toEqual([]);
    expect(reduce(at(4), { type: "submit" }).phase).toBe("playing");
    let game = help(reduce(at(4), { type: "select", id: "place:2063523" }));
    expect(game.selectedIds).toEqual(["place:2063523"]);
    expect(
      view(game).places.some(
        (p) => p.id === "place:2063523" && p.visualState === "selected",
      ),
    ).toBe(true);
    game = reduce(game, { type: "select", id: "place:2174003" });
    expect(game.selectedIds).toEqual(["place:2174003"]);
    expect(view(game).places.some((p) => p.id === "place:2063523")).toBe(false);
    expect(
      reduce(game, { type: "select", id: "place:2063523" }).selectedIds,
    ).toEqual(game.selectedIds);
    const day = "2026-10-12";
    const progress = openDaily(
      setDailyPuzzle(emptyDaily, day, journey.id),
      day,
    );
    progress.attempts[day].game = game;
    expect(validDaily(progress)).toBe(true);
    const restored = recoverDaily(JSON.parse(JSON.stringify(progress)))!
      .attempts[day].game;
    expect(restored.selectedIds).toEqual(game.selectedIds);
    expect(restored.help).toEqual(game.help);
    expect(reduce(restored, { type: "submit" }).answers.at(-1)?.correct).toBe(
      true,
    );
    expect(
      reduce(restored, { type: "select", id: "place:2174003" }).selectedIds,
    ).toEqual([]);
    const q1 = help(reduce(at(0), { type: "select", id: "place:2485926" }));
    expect(q1.selectedIds).toEqual(["place:2485926"]);
    expect(
      reduce(q1, { type: "select", id: "place:2306104" }).selectedIds,
    ).toEqual(["place:2306104"]);
  });

  it("upgrades prior drafts without losing earned grades or the old South Asia receipt", () => {
    const day = "2026-10-12";
    const progress = openDaily(
      setDailyPuzzle(emptyDaily, day, journey.id),
      day,
    );
    const old = {
      ...progress.attempts[day],
      contentRevision: 1,
      game: {
        ...at(4),
        selectedIds: ["place:4044012", "place:2073124"],
        help: {
          "same-hour-q4": "assisted" as const,
          "same-hour-q5": "assisted" as const,
        },
        answers: journey.rounds
          .slice(0, 4)
          .map((q) => ({ ...initialGame, roundId: q.id, correct: true })),
      },
    };
    const upgraded = upgradeDailyAttempt(old, JOURNEY_INDEX);
    expect(upgraded.contentRevision).toBe(5);
    expect(upgraded.game.selectedIds).toEqual([]);
    expect(upgraded.game.answers.every((a) => a.correct)).toBe(true);
    expect(upgraded.game.answers[3].receiptLabel).toBe(
      "Sri Lanka / Nepal / Bhutan",
    );
    expect(upgraded.game.help).toEqual({ "same-hour-q4": "assisted" });
    const priorCityDraft = upgradeDailyAttempt(
      {
        ...progress.attempts[day],
        contentRevision: 3,
        game: {
          ...at(0),
          selectedIds: ["place:2352778"],
          help: { "same-hour-q1": "assisted" as const },
        },
      },
      JOURNEY_INDEX,
    );
    expect(priorCityDraft.contentRevision).toBe(5);
    expect(priorCityDraft.game.selectedIds).toEqual([]);
    expect(priorCityDraft.game.help).toBeUndefined();
    const priorCountryDraft = upgradeDailyAttempt(
      {
        ...progress.attempts[day],
        contentRevision: 4,
        game: {
          ...at(1),
          selectedIds: ["wurl:FIN"],
          answers: [
            {
              ...initialGame,
              roundId: "same-hour-q1",
              correct: true,
              receiptLabel: "Reykjavík + Accra",
            },
          ],
        },
      },
      JOURNEY_INDEX,
    );
    expect(priorCountryDraft.contentRevision).toBe(5);
    expect(priorCountryDraft.game.roundIndex).toBe(1);
    expect(priorCountryDraft.game.selectedIds).toEqual([]);
    expect(priorCountryDraft.game.answers[0]).toMatchObject({
      correct: true,
      receiptLabel: "Reykjavík + Accra",
    });
    const completed = upgradeDailyAttempt(
      {
        ...old,
        game: {
          ...old.game,
          phase: "finished",
          answers: [
            ...old.game.answers,
            { ...initialGame, roundId: "same-hour-q5", correct: false },
          ],
        },
      },
      JOURNEY_INDEX,
    );
    expect(completed.game.phase).toBe("finished");
    expect(completed.game.answers[3].receiptLabel).toBe(
      "Sri Lanka / Nepal / Bhutan",
    );
    expect(completed.game.answers[4].correct).toBe(false);
    expect(completed.game.selectedIds).toEqual(old.game.selectedIds);
  });

  it("uses authored reveal labels for contextual and answer markers and provides a visited constellation without routes", () => {
    for (const i of [0, 4]) {
      const reveal = view(reduce(at(i), ...actions[i], { type: "submit" }));
      expect(
        reveal.places.find(
          (p) => p.id === (i === 0 ? "place:3413829" : "place:2013348"),
        ),
      ).toMatchObject({
        name: i === 0 ? "Reykjavík · UTC+0" : "Vladivostok · UTC+10",
        visualState: "hinted",
      });
      expect(
        reveal.places.filter((p) => p.visualState === "correct"),
      ).toHaveLength(1);
    }
    const missed = view(
      reduce(
        at(4),
        { type: "select", id: "place:2073124" },
        { type: "submit" },
      ),
    );
    expect(
      missed.places.filter((p) => p.visualState === "answer").map((p) => p.id),
    ).toEqual(["place:2174003"]);
    expect(missed.places.find((p) => p.id === "place:2073124")).toMatchObject({
      name: "Darwin · UTC+9:30",
      visualState: "incorrect",
    });
    const completion = view({ ...at(4), phase: "finished" });
    expect(completion.places).toHaveLength(10);
    expect(completion.places.every((p) => p.visualState === "visited")).toBe(
      true,
    );
    expect(Object.values(completion.states)).not.toContain("visited");
    expect(completion.routes).toEqual([]);
    expect(journey.completion!.views).toHaveLength(5);
  });

  it("shows the sourced time-zone texture only on completion and preserves country grading", () => {
    for (const i of [0, 1, 2, 3, 4]) {
      expect(view(at(i)).overlays?.some((o) => o.type === "texture")).toBe(
        false,
      );
      expect(
        view(reduce(at(i), ...actions[i], { type: "submit" })).overlays?.some(
          (o) => o.type === "texture",
        ),
      ).toBe(false);
    }
    const completed = view({ ...at(4), phase: "finished" });
    expect(completed.showBorders).toBe(false);
    expect(completed.overlays).toBe(journey.completion!.overlays);
    expect(completed.overlays).toEqual([
      {
        id: "same-hour:time-zone-map",
        type: "texture",
        assetUrl: "/geography/time-zones.v1.png",
        opacity: 0.85,
      },
    ]);
    const image = readFileSync("public/geography/time-zones.v1.png");
    const metadata = JSON.parse(
      readFileSync("public/geography/time-zones.metadata.json", "utf8"),
    );
    expect(image.subarray(1, 4).toString()).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(4096);
    expect(image.readUInt32BE(20)).toBe(2048);
    expect(image[25]).toBe(6); // RGBA keeps the underlying globe visible.
    expect(createHash("sha256").update(image).digest("hex")).toBe(
      metadata.assetSha256,
    );
    expect(metadata.checkedOffsetsMinutes).toMatchObject({
      Accra: 0,
      Praia: -60,
      Oran: 60,
      Kashgar: 480,
      Apia: 780,
      "Pago Pago": -660,
      Brisbane: 600,
      Vladivostok: 600,
    });
    expect(metadata.sourceVersion).toBe("2026e");
    const markup = renderToStaticMarkup(
      createElement(GameShell, {
        journey,
        context,
        game: { ...at(4), phase: "finished" },
        dispatch: () => {},
        webgl: true,
        frame: () => {},
        onHome: () => {},
        onStudy: () => {},
      }),
    );
    expect(markup).toContain("Standard-time zones");
    expect(markup).toContain("OpenStreetMap contributors");
    const playing = renderToStaticMarkup(
      createElement(GameShell, {
        journey,
        context,
        game: at(4),
        dispatch: () => {},
        webgl: true,
        frame: () => {},
        onHome: () => {},
        onStudy: () => {},
      }),
    );
    expect(playing).not.toContain("OpenStreetMap contributors");
    expect(auditJourney(journey, world, () => false).errors).toContain(
      "Missing local asset: /geography/time-zones.v1.png",
    );
  });

  it("keeps city markers primary, offers a fallback without WebGL, and shows simple day choices", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const globals = globalThis as typeof globalThis & {
      IS_REACT_ACT_ENVIRONMENT?: boolean;
    };
    globals.IS_REACT_ACT_ENVIRONMENT = true;
    let game = at(4);
    const render = () =>
      root.render(
        createElement(AnswerForm, {
          question: journey.rounds[game.roundIndex],
          context,
          game,
          webgl: false,
          dispatch: (action) => {
            game = reduce(game, action);
            render();
          },
        }),
      );
    try {
      await act(async () => render());
      const click = async (label: string) =>
        act(async () => {
          const button = [...host.querySelectorAll("button")].find(
            (b) =>
              b.getAttribute("aria-label") === label ||
              b.querySelector("span")?.textContent === label ||
              b.textContent?.trim() === label,
          );
          expect(button, label).toBeDefined();
          button!.click();
        });
      await click("Brisbane — select answer");
      expect(game.selectedIds).toEqual(["place:2174003"]);
      expect(isCorrect(journey.rounds[4], context, game)).toBe(true);
      game = help(at(3));
      await act(async () => render());
      expect(host.textContent).toContain("Sunday");
      expect(host.textContent).toContain("Monday");
      expect(
        [...host.querySelectorAll("button")].find((b) =>
          b.textContent?.includes("Tuesday"),
        )?.disabled,
      ).toBe(true);
      await click("Sunday");
      expect(game.selectedIds).toEqual(["same-hour:sunday"]);
    } finally {
      await act(async () => root.unmount());
      host.remove();
      delete globals.IS_REACT_ACT_ENVIRONMENT;
    }
    const shell = renderToStaticMarkup(
      createElement(GameShell, {
        journey,
        context,
        game: at(4),
        dispatch: () => {},
        webgl: true,
        frame: () => {},
        onHome: () => {},
        onStudy: () => {},
      }),
    );
    expect(shell).not.toContain('aria-label="Choose an answer"');
    expect(shell).toContain("Which marked Australian city shares its clock");
    expect(shell).not.toContain("Choose one city marker on the globe.");
    expect(shell).not.toContain("UTC+9:30");
    expect(shell).not.toContain("GeoNames");
  });

  it("registers for Admin scheduling and deferred loading without changing automatic dates, and passes scene audit", async () => {
    expect(JOURNEYS).toContain(journey);
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)?.path).toBe(
      "/journey/same-hour-different-worlds",
    );
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === journey.id)?.id,
    ).toBe(journey.id);
    expect(await loadJourney(journey.id)).toBe(journey);
    expect(auditJourney(journey, world).errors).toEqual([]);
  });
});
