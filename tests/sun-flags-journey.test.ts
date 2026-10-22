// @vitest-environment jsdom
import { readFileSync, existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GameShell } from "../src/game/GameShell";
import { describe, expect, it } from "vitest";
import { SUN_FLAGS_JOURNEY } from "../src/game/sunFlagsJourney";
import { JOURNEYS } from "../src/game/journeys";
import { JOURNEY_INDEX, loadJourney } from "../src/game/journeyRegistry";
import { CAPITALS } from "../src/game/quizData";
import {
  dailyJourney,
  openDaily,
  emptyDaily,
  validDaily,
  recoverDaily,
} from "../src/app/dailyProgress";
import { modeForPath } from "../src/app/modes";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext, isCorrect } from "../src/game/questions";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Response } from "../src/game/questions";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import { playRegionStyle } from "../src/globe/themes";
import { playColors } from "../src/theme/playColors";
const world = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(world, COUNTRY_FACTS, SUN_FLAGS_JOURNEY);

const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (game, action) => gameReducer(game, action, SUN_FLAGS_JOURNEY, context),
    state,
  );
const help = (roundIndex: number) =>
  reduce(at(roundIndex), { type: "request-hint" }, { type: "request-assist" });
const shell = (game: GameState) =>
  renderToStaticMarkup(
    createElement(GameShell, {
      journey: SUN_FLAGS_JOURNEY,
      context,
      game,
      dispatch: () => {},
      webgl: true,
      frame: () => {},
      onHome: () => {},
      onStudy: () => {},
    }),
  );
describe("Chasing the sun", () => {
  it("allows both Sun of May countries to be tapped with names hidden until selection", () => {
    const view = journeyWorld(
      world,
      SUN_FLAGS_JOURNEY,
      { ...initialGame, phase: "playing" },
      context,
    );
    expect(view.regionInteraction).toBe(true);
    expect(view.regionNames).toBe("committed");
    expect(view.namedRegionIds).toEqual([]);
    const countries = CAPITALS.filter(
      (capital) => capital.continent === "SA",
    ).map((capital) => capital.countryId);
    expect(countries).toHaveLength(12);
    for (const id of countries) expect(view.states[id]).toBe("selectable");
    expect(view.states["wurl:MEX"]).toBe("disabled");
    expect(new Set(countries.map((id) => view.states[id])).size).toBe(1);
    expect(view.selectDisabled).toBe(true);
    const selected = reduce(
      at(0),
      { type: "select", id: "wurl:ARG" },
      { type: "select", id: "wurl:URY" },
    );
    const chosen = journeyWorld(world, SUN_FLAGS_JOURNEY, selected, context);
    expect(chosen.states["wurl:ARG"]).toBe("selected");
    expect(chosen.states["wurl:URY"]).toBe("selected");
    expect(chosen.states["wurl:BRA"]).toBe("selectable");
    expect(reduce(selected, { type: "submit" }).answers.at(-1)?.correct).toBe(
      true,
    );
  });
  it("keeps named settings contextual on reveal and keeps the Japan pin blind", () => {
    const prepared = (
      roundIndex: number,
      phase: GameState["phase"] = "playing",
      correct = false,
    ) =>
      journeyWorld(
        world,
        SUN_FLAGS_JOURNEY,
        {
          ...initialGame,
          roundIndex,
          phase,
          answers:
            phase === "feedback"
              ? [
                  {
                    ...initialGame,
                    roundId: SUN_FLAGS_JOURNEY.rounds[roundIndex].id,
                    correct,
                  },
                ]
              : [],
        },
        context,
      );
    for (const [index, id] of [
      [1, "wurl:PHL"],
      [2, "wurl:KAZ"],
      [4, "wurl:MWI"],
    ] as const) {
      expect(prepared(index).states[id]).toBe("hinted");
      expect(prepared(index).regionNames).toBe("none");
      expect(prepared(index).focus.lng).toBeCloseTo(
        world.find((r) => r.id === id)!.focus.lng,
        1,
      );
    }
    for (const correct of [false, true]) {
      const philippines = prepared(1, "feedback", correct);
      expect(philippines.states["wurl:ESP"]).toBe("disabled");
      expect(philippines.states["wurl:PHL"]).toBe("hinted");
      expect(philippines.focus).toEqual(SUN_FLAGS_JOURNEY.rounds[1].focus);
      for (const [index, id] of [
        [2, "wurl:KAZ"],
        [4, "wurl:MWI"],
      ] as const) {
        expect(prepared(index, "feedback", correct).states[id]).toBe("hinted");
        expect(
          Object.values(prepared(index, "feedback", correct).states),
        ).not.toContain("correct");
      }
    }
    const japan = prepared(3);
    expect(japan.showBorders).toBe(false);
    expect(japan.states["wurl:JPN"]).toBe("surface");
    expect(japan.states["wurl:CHN"]).toBe("surface");
    expect(japan.regionNames).toBe("none");
    expect(japan.places).toEqual([]);
    expect(japan.focus).toEqual({ lat: 25, lng: 132, altitude: 1.5 });
  });
  it("plays five distinct stops with history, observation, symbolism and geographic placement", () => {
    const answers: Action[][] = [
      [
        { type: "select", id: "wurl:ARG" },
        { type: "select", id: "wurl:URY" },
        { type: "submit" },
      ],
      [{ type: "select", id: "power:spain" }, { type: "submit" }],
      [{ type: "select", id: "rays:grain" }, { type: "submit" }],
      [{ type: "drop-pin", lat: 35.68, lng: 139.69 }, { type: "submit" }],
      [{ type: "select", id: "dawn:freedom" }, { type: "submit" }],
    ];
    let game: GameState = { ...initialGame, phase: "playing" };
    for (const [index, question] of SUN_FLAGS_JOURNEY.rounds.entries()) {
      expect(question.explanation.length).toBeLessThan(230);
      expect(question.leadIn).toBeTruthy();
      expect(question.choices?.length ?? 0).toBeLessThanOrEqual(6);
      expect(existsSync(`public${question.image!.src}`)).toBe(true);
      for (const action of answers[index])
        game = gameReducer(game, action, SUN_FLAGS_JOURNEY, context);
      expect(game.phase, question.id).toBe("feedback");
      expect(game.answers.at(-1)?.correct, question.id).toBe(true);
      game = gameReducer(game, { type: "next" }, SUN_FLAGS_JOURNEY, context);
    }
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
  });
  it("rejects incomplete or wrong country pairs, colonial powers, symbols, and mainland pins", () => {
    for (const [index, response] of [
      [0, { selectedIds: ["wurl:ARG"] }],
      [0, { selectedIds: ["wurl:ARG", "wurl:CHL"] }],
      [1, { selectedIds: ["power:portugal"] }],
      [2, { selectedIds: ["rays:feathers"] }],
      [3, { pin: { lat: 39.9, lng: 116.4 } }],
      [4, { selectedIds: ["dawn:energy"] }],
    ] as [number, Partial<Response>][])
      expect(
        isCorrect(SUN_FLAGS_JOURNEY.rounds[index], context, {
          ...initialGame,
          ...response,
        }),
      ).toBe(false);
    expect(SUN_FLAGS_JOURNEY.rounds[3].map).toMatchObject({
      borders: false,
      hoverFeedback: false,
      revealOnAnswer: true,
    });
  });
  it("is available in Admin and in the automatic pool", () => {
    expect(JOURNEYS).toContain(SUN_FLAGS_JOURNEY);
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === SUN_FLAGS_JOURNEY.id)?.path,
    ).toBe("/journey/chasing-the-sun");
    expect(
      JOURNEY_INDEX.find((entry) => entry.id === SUN_FLAGS_JOURNEY.id)
        ?.id,
    ).toBeDefined();
  });
  it("retires the archived Sun edition while resolving old published assignments", async () => {
    const day = "2026-10-11";
    const oldId = "chasing-the-sun-v1";
    const assignments = { [day]: oldId };
    expect(dailyJourney(day, undefined, JOURNEY_INDEX, assignments).id).toBe(
      SUN_FLAGS_JOURNEY.id,
    );
    const current = openDaily(
      emptyDaily,
      day,
      false,
      JOURNEY_INDEX,
      assignments,
    );
    const legacyDay = "2026-10-10";
    const saved = {
      ...current,
      attempts: {
        ...current.attempts,
        [legacyDay]: {
          ...current.attempts[day],
          date: legacyDay,
          journeyId: oldId,
        },
      },
      archivedAttempts: {
        [`${legacyDay}/${oldId}`]: {
          ...current.attempts[day],
          date: legacyDay,
          journeyId: oldId,
        },
      },
    };
    expect(validDaily(saved, JOURNEY_INDEX)).toBe(false);
    const recovered = recoverDaily(saved, JOURNEY_INDEX)!;
    expect(recovered.attempts[day]).toEqual(current.attempts[day]);
    expect(recovered.attempts[legacyDay]).toBeUndefined();
    expect(Object.keys(recovered.archivedAttempts ?? {})).toEqual([]);
    expect(validDaily(recovered, JOURNEY_INDEX)).toBe(true);
    await expect(loadJourney(oldId)).rejects.toThrow("Unknown Journey");
    expect(JOURNEY_INDEX.some((journey) => journey.id === oldId)).toBe(false);
    expect(modeForPath("/")).toBe("home");
  });
  it("shows the two complete flags only after correct or incorrect submission", () => {
    const round = SUN_FLAGS_JOURNEY.rounds[0];
    for (const state of [
      at(0),
      reduce(at(0), { type: "request-hint" }),
      help(0),
    ]) {
      const html = shell(state);
      expect(html).toContain(round.image!.src);
      expect(html).not.toContain('class="flag-comparison"');
      for (const flag of round.feedbackFlags!)
        expect(html).not.toContain(flag.src);
    }
    for (const ids of [
      ["wurl:ARG", "wurl:URY"],
      ["wurl:BRA", "wurl:CHL"],
    ]) {
      const answered = reduce(
        at(0),
        ...ids.map((id): Action => ({ type: "select", id })),
        { type: "submit" },
      );
      const host = document.createElement("div");
      host.innerHTML = shell(answered);
      expect(host.querySelector(".flag-clue")).toBeNull();
      expect(host.querySelectorAll(".flag-comparison .flag-full")).toHaveLength(
        2,
      );
      expect(
        host.querySelectorAll(".flag-comparison .flag-detail"),
      ).toHaveLength(2);
      expect(
        [...host.querySelectorAll(".flag-comparison figcaption strong")].map(
          (node) => node.textContent,
        ),
      ).toEqual(["Argentina", "Uruguay"]);
      for (const flag of round.feedbackFlags!)
        expect(existsSync(`public${flag.src}`)).toBe(true);
    }
  });
  it("narrows the map assist to four equal candidates while preserving an earlier pick", () => {
    const assisted = help(0);
    const map = journeyWorld(world, SUN_FLAGS_JOURNEY, assisted, context);
    expect(map.regionInteraction).toBe(true);
    for (const id of ["wurl:ARG", "wurl:BRA", "wurl:CHL", "wurl:URY"])
      expect(map.states[id]).toBe("selectable");
    expect(map.states["wurl:BOL"]).toBe("disabled");
    expect(
      reduce(assisted, { type: "select", id: "wurl:BOL" }).selectedIds,
    ).toEqual([]);
    const preserved = reduce(
      at(0),
      { type: "select", id: "wurl:BOL" },
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(preserved.selectedIds).toEqual(["wurl:BOL"]);
    expect(
      reduce(preserved, { type: "select", id: "wurl:BOL" }).selectedIds,
    ).toEqual([]);
    const answer = reduce(
      assisted,
      { type: "select", id: "wurl:ARG" },
      { type: "select", id: "wurl:URY" },
      { type: "submit" },
    );
    expect(answer.answers.at(-1)?.correct).toBe(true);
    expect(journeyScore(answer)).toBe(1);
  });
  it("leaves a genuine two-choice decision in each multiple-choice assist", () => {
    for (const index of [1, 2, 4]) {
      const round = SUN_FLAGS_JOURNEY.rounds[index];
      const assisted = help(index);
      const survivors = round.guidance!.assist!.candidateIds!;
      const host = document.createElement("div");
      host.innerHTML = shell(assisted);
      expect(
        host.querySelectorAll(".candidate-grid button:not(:disabled)"),
      ).toHaveLength(2);
      expect(host.querySelector(".question-guidance")!.textContent).toContain(
        round.guidance!.hint,
      );
      for (const choice of round.choices!) {
        const selected = reduce(assisted, { type: "select", id: choice.id });
        if (!survivors.includes(choice.id))
          expect(selected.selectedIds).toEqual([]);
        else {
          expect(selected.selectedIds).toEqual([choice.id]);
          expect(
            reduce(selected, { type: "submit" }).answers.at(-1)?.correct,
          ).toBe(
            round.rule.type === "choice-ids" &&
              round.rule.ids.includes(choice.id),
          );
        }
      }
    }
    expect(SUN_FLAGS_JOURNEY.rounds[1].choices).toHaveLength(4);
  });
  it("adds only an outside reference for the Japan assist without exposing its land boundary", () => {
    const round = SUN_FLAGS_JOURNEY.rounds[3];
    const assisted = help(3);
    const map = journeyWorld(world, SUN_FLAGS_JOURNEY, assisted, context);
    expect(map.showBorders).toBe(false);
    expect(map.regionNames).toBe("none");
    expect(map.states["wurl:JPN"]).toBe("surface");
    expect(map.overlays).toEqual([]);
    expect(map.focus).toEqual(round.focus);
    expect(map.places.map((place) => place.name)).toEqual(["Seoul"]);
    const reference = map.places[0];
    expect(isCorrect(round, context, { ...assisted, pin: reference })).toBe(
      false,
    );
    expect(
      reduce(
        assisted,
        { type: "drop-pin", lat: 35.68, lng: 139.69 },
        { type: "submit" },
      ).answers.at(-1)?.correct,
    ).toBe(true);
  });
  it("completes with the six flag countries and an authored five-stop tour, including on misses", () => {
    let game = at(0);
    const answers: Action[] = [
      { type: "select", id: "wurl:BRA" },
      { type: "select", id: "power:portugal" },
      { type: "select", id: "rays:flames" },
      { type: "drop-pin", lat: 39.9, lng: 116.4 },
      { type: "select", id: "dawn:unity" },
    ];
    game = reduce(
      game,
      answers[0],
      { type: "select", id: "wurl:CHL" },
      { type: "submit" },
      { type: "next" },
    );
    for (const action of answers.slice(1))
      game = reduce(game, action, { type: "submit" }, { type: "next" });
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(0);
    const map = journeyWorld(world, SUN_FLAGS_JOURNEY, game, context);
    const countries = [
      "wurl:ARG",
      "wurl:URY",
      "wurl:PHL",
      "wurl:KAZ",
      "wurl:JPN",
      "wurl:MWI",
    ];
    expect(
      Object.keys(map.states).filter((id) => map.states[id] === "visited"),
    ).toEqual(expect.arrayContaining(countries));
    expect(
      Object.values(map.states).filter((state) => state === "visited"),
    ).toHaveLength(6);
    expect(map.states["wurl:ESP"]).toBe("disabled");
    const labels = map.places.filter((place) => place.sourceId !== "player");
    expect(labels).toHaveLength(6);
    expect(
      labels.every(
        (place) => place.visualState === "visited" && place.markerHidden,
      ),
    ).toBe(true);
    expect(
      map.places.find((place) => place.sourceId === "player"),
    ).toMatchObject({
      kind: "pin",
      visualState: "incorrect",
      lat: 39.9,
      lng: 116.4,
    });
    expect(map.routes).toEqual([]);
    expect(
      SUN_FLAGS_JOURNEY.completion!.views!.slice(0, 5).map((view) => view.lng),
    ).toEqual([-60, 122.96, 67.24, 138, 34.27]);
    const html = shell(game);
    expect(html).toContain(SUN_FLAGS_JOURNEY.completion!.caption);
    for (const round of SUN_FLAGS_JOURNEY.rounds)
      expect(html).toContain(round.resolvedLabel);
  });
  it("makes the Kazakhstan motif inspectable without naming its meaning before submission", () => {
    const before = document.createElement("div");
    before.innerHTML = shell(at(2));
    expect(before.querySelector(".flag-clue img")!.getAttribute("src")).toBe(
      "/flags/clues/sun-detail-kaz.v1.svg",
    );
    expect(before.querySelector(".flag-context img")).not.toBeNull();
    expect(before.querySelector(".flag-comparison")).toBeNull();
    expect(
      before.querySelector(".flag-clue img")!.getAttribute("alt"),
    ).not.toContain("grain");
    const after = document.createElement("div");
    after.innerHTML = shell(
      reduce(at(2), { type: "select", id: "rays:flames" }, { type: "submit" }),
    );
    expect(after.querySelector(".flag-detail")!.getAttribute("src")).toBe(
      "/flags/clues/sun-ray-kaz.v1.svg",
    );
    expect(after.querySelector(".flag-full")).not.toBeNull();
  });
  it("keeps Philippine detail and the six-design comparison behind submission and completion", () => {
    expect(shell(at(1))).not.toContain("sun-detail-phl.v1.svg");
    const answered = reduce(
      at(1),
      { type: "select", id: "power:portugal" },
      { type: "submit" },
    );
    expect(shell(answered)).toContain("sun-detail-phl.v1.svg");
    expect(shell(answered)).not.toContain(
      'aria-label="Journey flag comparison"',
    );
    const finished = document.createElement("div");
    finished.innerHTML = shell({ ...at(4), phase: "finished" });
    const flags = finished.querySelector(
      '[aria-label="Journey flag comparison"]',
    )!;
    expect(flags.querySelectorAll(".flag-full")).toHaveLength(6);
    expect(flags.querySelectorAll(".flag-detail")).toHaveLength(6);
    expect(
      [...flags.querySelectorAll("figcaption strong")].map(
        (node) => node.textContent,
      ),
    ).toEqual([
      "Argentina",
      "Uruguay",
      "Philippines",
      "Kazakhstan",
      "Japan",
      "Malawi",
    ]);
    for (const flag of SUN_FLAGS_JOURNEY.completion!.flags!) {
      expect(existsSync(`public${flag.src}`)).toBe(true);
      expect(existsSync(`public${flag.detail!.src}`)).toBe(true);
    }
  });
  it("pulls out from Malawi to explain the continental meaning after any answer", () => {
    const round = SUN_FLAGS_JOURNEY.rounds[4];
    const before = journeyWorld(world, SUN_FLAGS_JOURNEY, at(4), context);
    expect(before.states["wurl:KEN"]).toBe("disabled");
    expect(before.showBorders).toBe(true);
    for (const id of ["dawn:freedom", "dawn:unity"]) {
      const answered = reduce(
        at(4),
        { type: "select", id },
        { type: "submit" },
      );
      const view = journeyWorld(world, SUN_FLAGS_JOURNEY, answered, context);
      expect(view.focus.altitude!).toBeGreaterThan(before.focus.altitude!);
      expect(view.showBorders).toBe(false);
      for (const country of [
        "wurl:MWI",
        "wurl:KEN",
        "wurl:ZAF",
        "wurl:EGY",
        "wurl:ESH",
        "wurl:NE-SOL",
      ]) {
        expect(view.states[country]).toBe("hinted");
        expect(playRegionStyle(country, view.states[country]).fill).toBe(
          playColors()["context-land"],
        );
      }
      expect(view.states["wurl:KAZ"]).toBe("disabled");
      expect(view.places.map((place) => place.name)).toEqual(["Africa"]);
      expect(shell(answered)).toContain(round.feedbackFlags![0].detail!.src);
      expect(shell(answered)).not.toContain("Rising sun · freedom");
    }
  });
  it("accepts all four main Japanese islands, matching the stated pin task", () => {
    for (const pin of [
      { lat: 35.68, lng: 139.69 }, // Honshu
      { lat: 43.06, lng: 141.35 }, // Hokkaido
      { lat: 33.59, lng: 130.4 }, // Kyushu
      { lat: 33.84, lng: 132.77 }, // Shikoku
    ])
      expect(
        isCorrect(SUN_FLAGS_JOURNEY.rounds[3], context, { ...at(3), pin }),
      ).toBe(true);
    expect(SUN_FLAGS_JOURNEY.rounds[3].prompt).toContain("four main islands");
    expect(
      isCorrect(SUN_FLAGS_JOURNEY.rounds[3], context, {
        ...at(3),
        pin: { lat: 26.22, lng: 127.69 },
      }),
    ).toBe(false);
  });
});
