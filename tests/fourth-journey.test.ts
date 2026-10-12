// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { geoContains, geoDistance } from "d3-geo";
import { describe, expect, it } from "vitest";
import {
  FOURTH_JOURNEY as journey,
  ADRIATIC_REPUBLICS,
  ADRIATIC_CANDIDATES,
  WESTERN_GATEWAY_CANDIDATES,
  LIBYA_ASSIST_CITIES,
  SUEZ_ENTRANCE,
  SUEZ_REFERENCE_CITIES,
  SUEZ_CANAL,
} from "../src/game/fourthJourney";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import { createQuestionContext, canSelect } from "../src/game/questions";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { JOURNEYS, journeyPath } from "../src/game/journeys";
import { QUESTION_CATALOG } from "../src/game/questionCatalog";
import { journeyWorld } from "../src/app/journeyWorld";
import {
  questionVisualStates,
  questionRegions,
  highlightedPartId,
} from "../src/game/presentation";
import { GameShell } from "../src/game/GameShell";
import {
  playRegionStyle,
  PLAY_HIGHLIGHTS,
  PLAY_FEEDBACK,
} from "../src/globe/themes";
import { pinDistanceTier } from "../src/game/answerTargets";
import { EARTH_KM } from "../src/game/spatial";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { candidateAvailable } from "../src/game/guidance";
import { placeLabelStyle } from "../src/globe/placeLabels";
import canalData from "../src/game/data/mediterranean-map.v1.json";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, journey, context), state);
const shell = (game: GameState, webgl = true) =>
  renderToStaticMarkup(
    createElement(GameShell, {
      journey,
      context,
      game,
      dispatch: () => {},
      webgl,
      frame: () => {},
      onHome: () => {},
      onStudy: () => {},
    }),
  );
const assisted = (i: number) =>
  reduce(at(i), { type: "request-hint" }, { type: "request-assist" });

describe("Mediterranean facelift", () => {
  it("keeps the current route and catalog, with five usable authored controls and help", () => {
    expect(JOURNEYS).toHaveLength(13);
    expect(journeyPath(journey.id)).toBe("/journey/mediterranean");
    expect(journey.rounds.map((q) => q.mode)).toEqual([
      "map-single",
      "choice-single",
      "text",
      "map-multiple",
      "pin",
    ]);
    for (const q of journey.rounds) {
      expect(QUESTION_CATALOG).toContain(q);
      expect(q.guidance?.hint).toBeTruthy();
      expect(q.guidance?.assist).toBeTruthy();
      expect(q.scenes).toBeDefined();
    }
    expect(shell(at(2))).toContain('placeholder="Your answer"');
  });
  it("orients Gibraltar with Spain, shows equal candidates and named country choices, and narrows to two genuine candidates", () => {
    const q = journey.rounds[0];
    const states = questionVisualStates(q, context, at(0));
    expect(states["wurl:ESP"]).toBe("hinted");
    expect(states["wurl:MAR"]).not.toBe("hinted");
    const choices = document.createElement("div");
    choices.innerHTML = shell(at(0));
    expect(
      [...choices.querySelectorAll(".candidate-grid button span")].map(
        (e) => e.textContent,
      ),
    ).toEqual(["Algeria", "France", "Italy", "Malta", "Morocco", "Portugal"]);
    for (const id of q.selection.type === "ids" ? q.selection.ids : []) {
      expect(states[id]).toBe("selectable");
      expect(playRegionStyle(id, states[id]).fill).toBe(
        PLAY_HIGHLIGHTS.selectable,
      );
    }
    const selected = reduce(at(0), { type: "select", id: "wurl:MAR" });
    choices.innerHTML = shell(selected);
    expect(
      choices.querySelector('.candidate-grid button[aria-pressed="true"]')
        ?.textContent,
    ).toContain("Morocco");
    expect(
      playRegionStyle(
        "wurl:MAR",
        questionVisualStates(q, context, selected)["wurl:MAR"],
      ).fill,
    ).toBe(PLAY_HIGHLIGHTS.selected);
    expect(journeyWorld(regions, journey, at(0), context).places).toHaveLength(
      0,
    );
    const help = assisted(0);
    expect(candidateAvailable(q, help, "wurl:MAR")).toBe(true);
    expect(candidateAvailable(q, help, "wurl:FRA")).toBe(true);
    expect(candidateAvailable(q, help, "wurl:ITA")).toBe(false);
    const wrong = reduce(
      at(0),
      { type: "select", id: "wurl:DZA" },
      { type: "submit" },
    );
    expect(wrong.answers[0].correct).toBe(false);
    expect(questionVisualStates(q, context, wrong)).toMatchObject({
      "wurl:ESP": "hinted",
      "wurl:MAR": "answer",
      "wurl:DZA": "incorrect",
    });
  });
  it("keeps the western gateway unnamed before submission and preserves body-of-water reasoning in the assist", () => {
    const q = journey.rounds[0];
    expect(q.selection).toEqual({
      type: "ids",
      ids: WESTERN_GATEWAY_CANDIDATES,
    });
    expect(q.leadIn).toContain("Atlantic Ocean");
    expect(q.leadIn).toContain("Mediterranean Sea");
    expect(
      [
        journey.description,
        q.leadIn,
        q.prompt,
        q.progressLabel,
        q.guidance!.hint,
        q.guidance!.assist!.text,
      ].join(" "),
    ).not.toContain("Gibraltar");
    const help = assisted(0);
    expect(
      WESTERN_GATEWAY_CANDIDATES.filter((id) =>
        candidateAvailable(q, help, id),
      ),
    ).toEqual(["wurl:FRA", "wurl:MAR", "wurl:PRT"]);
    expect(q.focus).toEqual({ lat: 39, lng: 5, altitude: 1.05 });
    for (const id of WESTERN_GATEWAY_CANDIDATES.filter(
      (id) => id !== "wurl:MAR",
    ))
      expect(
        reduce(at(0), { type: "select", id }, { type: "submit" }).answers[0]
          .correct,
      ).toBe(false);
  });
  it("retains Sicily’s actual polygon clue and plausible island distractors", () => {
    const q = journey.rounds[1];
    expect(q.choices?.map((c) => c.label)).toEqual([
      "Sicily",
      "Sardinia",
      "Corsica",
      "Crete",
    ]);
    const island = questionRegions(regions, q, "playing").find(
      (r) => r.id === highlightedPartId("wurl:ITA"),
    )!;
    expect(geoContains(sphericalGeometry(island.geometry), [14, 37.6])).toBe(
      true,
    );
    expect(geoContains(sphericalGeometry(island.geometry), [9, 40])).toBe(
      false,
    );
    const help = assisted(1);
    expect(candidateAvailable(q, help, "island:sardinia")).toBe(true);
    expect(candidateAvailable(q, help, "island:crete")).toBe(false);
    expect(
      reduce(at(1), { type: "select", id: "island:sicily" }, { type: "submit" })
        .answers[0].correct,
    ).toBe(true);
  });
  it("uses bright green for a correctly named Sicily and dark green when revealing a missed answer", () => {
    const part = highlightedPartId("wurl:ITA");
    for (const [id, state] of [
      ["island:sicily", "correct"],
      ["island:sardinia", "answer"],
    ] as const) {
      const game = reduce(at(1), { type: "select", id }, { type: "submit" });
      const map = journeyWorld(regions, journey, game, context);
      expect(map.states[part]).toBe(state);
      expect(playRegionStyle(part, map.states[part]).fill).toBe(
        PLAY_FEEDBACK[state],
      );
      expect(map.states["wurl:ITA"]).toBe("disabled");
      expect(shell(game)).toContain(`background:${PLAY_FEEDBACK[state]}`);
    }
  });
  it("keeps context amber, grades Tripoli's dot, distinguishes Adriatic picks, and recaps in purple", () => {
    for (const [text, state] of [
      ["Tripoli", "correct"],
      ["Benghazi", "answer"],
    ] as const) {
      const game = reduce(
        at(2),
        { type: "text", value: text },
        { type: "submit" },
      );
      const map = journeyWorld(regions, journey, game, context);
      expect(map.places.find((p) => p.name === "Tripoli")?.visualState).toBe(
        state,
      );
      expect(playRegionStyle("wurl:LBY", map.states["wurl:LBY"]).fill).toBe(
        PLAY_HIGHLIGHTS.context,
      );
    }
    const map = journeyWorld(
      regions,
      journey,
      reduce(
        at(3),
        ...["wurl:SVN", "wurl:HRV", "wurl:MNE", "wurl:GRC"].map(
          (id): Action => ({ type: "select", id }),
        ),
        { type: "submit" },
      ),
      context,
    );
    expect(map.states).toMatchObject({
      "wurl:SVN": "correct",
      "wurl:HRV": "correct",
      "wurl:MNE": "correct",
      "wurl:BIH": "answer",
      "wurl:GRC": "incorrect",
    });
    const recap = journeyWorld(
      regions,
      journey,
      { ...at(4), phase: "finished" },
      context,
    );
    for (const id of journey.completion!.regionIds!)
      expect(recap.states[id]).toBe("visited");
    for (const place of recap.places.filter((p) => !p.markerHidden))
      expect(place.visualState).toBe("visited");
  });
  it("reveals equally styled Libyan reference cities only at assist, accepts aliases, and keeps Libya contextual", () => {
    expect(journeyWorld(regions, journey, at(2), context).places).toHaveLength(
      0,
    );
    expect(
      journeyWorld(regions, journey, assisted(2), context).places.map(
        (p) => p.name,
      ),
    ).toEqual(["Tripoli", "Misrata", "Benghazi"]);
    expect(
      new Set(LIBYA_ASSIST_CITIES.map((p) => placeLabelStyle(p).shape)),
    ).toEqual(new Set(["circle"]));
    expect(new Set(LIBYA_ASSIST_CITIES.map((p) => p.markerSize))).toEqual(
      new Set([24]),
    );
    for (const name of ["Tripoli", "Tarabulus"])
      expect(
        reduce(at(2), { type: "text", value: name }, { type: "submit" })
          .answers[0].correct,
      ).toBe(true);
    const miss = reduce(
      at(2),
      { type: "text", value: "Benghazi" },
      { type: "submit" },
    );
    expect(miss.answers[0].correct).toBe(false);
    expect(
      journeyWorld(regions, journey, miss, context).states["wurl:LBY"],
    ).toBe("hinted");
  });
  it("grades former republic membership among coastal neighbors, preserves the Croatia lock, and includes Neum’s coastal geometry", () => {
    const q = journey.rounds[3];
    expect(q.selection).toEqual({ type: "ids", ids: ADRIATIC_CANDIDATES });
    for (const id of ADRIATIC_CANDIDATES)
      expect(questionVisualStates(q, context, at(3))[id]).toBe("selectable");
    expect(canSelect(q, context, "wurl:ALB")).toBe(true);
    expect(canSelect(q, context, "wurl:GRC")).toBe(true);
    expect(canSelect(q, context, "wurl:SRB")).toBe(false);
    expect(canSelect(q, context, "wurl:MKD")).toBe(false);
    let help = assisted(3);
    expect(help.selectedIds).toEqual(["wurl:HRV"]);
    help = reduce(help, { type: "clear" }, { type: "select", id: "wurl:HRV" });
    expect(help.selectedIds).toEqual(["wurl:HRV"]);
    const correct = reduce(
      help,
      ...ADRIATIC_REPUBLICS.filter((id) => id !== "wurl:HRV").map(
        (id): Action => ({ type: "select", id }),
      ),
      { type: "submit" },
    );
    expect(correct.answers[0].correct).toBe(true);
    const wrong = reduce(
      at(3),
      ...["wurl:SVN", "wurl:HRV", "wurl:MNE", "wurl:GRC"].map(
        (id): Action => ({ type: "select", id }),
      ),
      { type: "submit" },
    );
    expect(wrong.answers[0].correct).toBe(false);
    const reveal = journeyWorld(regions, journey, correct, context);
    expect(reveal.places.some((p) => p.name === "Neum")).toBe(true);
    const bosnia = regions.find((r) => r.id === "wurl:BIH")!;
    expect(
      geoContains(
        sphericalGeometry(bosnia.displayGeometry ?? bosnia.geometry),
        [17.63, 42.93],
      ),
    ).toBe(true);
  });
  it("withholds the Suez target and canal, keeps references outside every ring, and grades inclusive accuracy tiers", () => {
    const q = journey.rounds[4];
    expect(q.prompt).toContain("We’ve hidden the Suez Canal");
    expect(q.prompt).not.toContain("strait");
    for (const state of [
      at(4),
      reduce(at(4), { type: "request-hint" }),
      assisted(4),
    ]) {
      const map = journeyWorld(regions, journey, state, context);
      expect(map.places.some((p) => p.id === SUEZ_ENTRANCE.id)).toBe(false);
      expect(map.physicalFeatures).toHaveLength(0);
      expect(map.overlays).toHaveLength(0);
    }
    for (const p of SUEZ_REFERENCE_CITIES)
      expect(
        geoDistance([p.lng, p.lat], [SUEZ_ENTRANCE.lng, SUEZ_ENTRANCE.lat]) *
          EARTH_KM,
      ).toBeGreaterThan(150);
    for (const [km, feedback] of [
      [0, "Bullseye!"],
      [50, "Bullseye!"],
      [50.001, "Very close."],
      [100, "Very close."],
      [100.001, "In range."],
      [150, "In range."],
      [150.001, undefined],
    ] as const) {
      const answer = reduce(
        at(4),
        {
          type: "drop-pin",
          lat: SUEZ_ENTRANCE.lat + ((km / EARTH_KM) * 180) / Math.PI,
          lng: SUEZ_ENTRANCE.lng,
        },
        { type: "submit" },
      );
      expect(answer.answers[0].correct, `${km}km`).toBe(!!feedback);
      expect(pinDistanceTier(q, answer)?.feedback).toBe(feedback);
      const map = journeyWorld(regions, journey, answer, context);
      expect(
        map.overlays!.map((r) => r.type === "circle" && r.radiusKm),
      ).toEqual([50, 100, 150]);
      expect(map.physicalFeatures).toEqual([SUEZ_CANAL]);
      expect(map.states["wurl:EGY"]).toBe("hinted");
      expect(
        map.places.find((p) => p.id === SUEZ_ENTRANCE.id)?.visualState,
      ).toBe("answer");
      expect(map.places.find((p) => p.name === "Your pin")?.visualState).toBe(
        feedback ? "correct" : "incorrect",
      );
      if (feedback) expect(shell(answer)).toContain(feedback);
    }
    expect(canalData.source.sha256).toMatch(/^[a-f0-9]{64}$/);
    // Existing reviewed geometry reaches the northern mouth; no invented bridge.
    expect(
      Math.max(...SUEZ_CANAL.paths!.flat().map((p) => p[1])),
    ).toBeGreaterThan(31.26);
    expect(Math.min(...SUEZ_CANAL.paths!.flat().map((p) => p[1]))).toBeLessThan(
      30.02,
    );
  });
  it("completes five forward-moving stops with captured receipts and a sourced canal payoff", () => {
    let state = reduce(
      at(0),
      { type: "select", id: "wurl:MAR" },
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      { type: "select", id: "island:sicily" },
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      { type: "text", value: "Tripoli" },
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      ...ADRIATIC_REPUBLICS.map((id): Action => ({ type: "select", id })),
      { type: "submit" },
      { type: "next" },
    );
    state = reduce(
      state,
      { type: "drop-pin", lat: SUEZ_ENTRANCE.lat, lng: SUEZ_ENTRANCE.lng },
      { type: "submit" },
      { type: "next" },
    );
    expect(state.phase).toBe("finished");
    expect(state.answers.every((a) => a.correct)).toBe(true);
    expect(state.answers.map((a) => a.receiptLabel)).toEqual([
      "Morocco",
      "Sicily",
      "Tripoli",
      "Four Adriatic republics",
      "Port Said",
    ]);
    const map = journeyWorld(regions, journey, state, context);
    expect(map.physicalFeatures).toEqual([SUEZ_CANAL]);
    expect(journey.completion?.views).toHaveLength(6);
    expect(shell(state)).toContain(journey.completion!.caption);
    const old = {
      ...state,
      answers: state.answers.map((a, i) =>
        i === 0 ? { ...a, receiptLabel: "Catalan and Basque" } : a,
      ),
    };
    expect(shell(old)).toContain("Catalan and Basque");
  });
});
