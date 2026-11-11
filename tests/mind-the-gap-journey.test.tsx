// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MIND_THE_GAP_JOURNEY as journey } from "../src/game/mindTheGapJourney";
import { createQuestionContext } from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { journeyPoints } from "../src/game/points";
import { auditJourney } from "../src/game/journeyAudit";
import { GameShell } from "../src/game/GameShell";
import type { RegionFeature } from "../src/geography/types";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, [], journey);
const question = (suffix: string) =>
  journey.rounds.find((q) => q.id.endsWith(suffix))!;
const play = (suffix: string): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex: journey.rounds.indexOf(question(suffix)),
});
const step = (game: GameState, ...actions: Action[]) =>
  actions.reduce(
    (state, action) => gameReducer(state, action, journey, context),
    game,
  );
const view = (game: GameState) => journeyWorld(regions, journey, game, context);
const select = (id: string): Action => ({ type: "select", id });
const submit: Action = { type: "submit" };
const help: Action[] = [{ type: "request-hint" }, { type: "request-assist" }];

describe("Mind the Gap", () => {
  it("passes the full direct-module authoring audit with its local photograph", () => {
    const report = auditJourney(journey, regions, (asset) =>
      existsSync(`public${asset}`),
    );
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("keeps city names visible through edits/help, then retains the actual miss", () => {
    const start = play("through-the-building");
    for (const game of [
      start,
      step(start, select("place:1815286")),
      step(start, ...help),
    ]) {
      const places = view(game).places;
      expect(places).toHaveLength(game.help ? 2 : 5);
      expect(
        places.every(
          (p) =>
            !!p.name &&
            p.hoverName === p.name &&
            !p.labelHidden &&
            !p.markerBadge,
        ),
      ).toBe(true);
      expect(new Set(places.map((p) => p.markerSize)).size).toBe(1);
    }
    const missed = step(start, select("place:1815286"), submit);
    expect(
      view(missed).places.find((p) => p.id === "place:1815286"),
    ).toMatchObject({ name: "Chengdu", visualState: "incorrect" });
    expect(
      view(missed).places.find((p) => p.id === "place:1814906"),
    ).toMatchObject({ name: "Chongqing", visualState: "answer" });
    expect(
      journeyPoints(step(start, ...help, select("place:1814906"), submit)),
    ).toBe(1);
  });

  it("enters via Hongyancun and ends in Europe, withholding station markers until reveal", () => {
    const q = question("the-deep-end");
    expect(q.introViews?.[0]).toMatchObject({
      lat: 29.5525861,
      lng: 106.4893638,
    });
    expect(q.introViews?.at(-1)).toEqual(q.focus);
    expect(view(play("the-deep-end")).places.map((p) => p.name)).toEqual([
      "Hongyancun · Chongqing",
    ]);
    expect(q.introDurationScale).toBe(0.4);
    for (const [id, points] of [
      ["wurl:UKR", 3],
      ["wurl:RUS", 0],
      ["wurl:POL", 0],
    ] as const) {
      const result = step(play("the-deep-end"), select(id), submit);
      expect(journeyPoints(result)).toBe(points);
      expect(view(result).states[id]).toBe(
        id === "wurl:UKR" ? "correct" : "incorrect",
      );
      expect(
        view(result).places.some((p) => p.name.includes("Admiralteyskaya")),
      ).toBe(false);
      expect(
        view(result).places.some((p) => p.name.includes("Arsenalna")),
      ).toBe(true);
    }
    const assisted = step(play("the-deep-end"), ...help);
    expect(view(assisted).focus).toEqual(q.guidance?.assist?.focus);
    expect(view(assisted).states["wurl:RUS"]).toBe("disabled");
    expect(journeyPoints(step(assisted, select("wurl:UKR"), submit))).toBe(1);
  });

  it("grades inclusive elevation bands and leaves an incorrect assisted estimate possible", () => {
    for (const [value, points] of [
      [2650, 3],
      [3050, 3],
      [2350, 2],
      [3350, 2],
      [1950, 1],
      [3750, 1],
      [1900, 0],
      [3800, 0],
    ]) {
      expect(
        journeyPoints(
          step(
            play("above-sea-level"),
            { type: "text", value: String(value) },
            submit,
          ),
        ),
      ).toBe(points);
    }
    expect(
      journeyPoints(
        step(
          play("above-sea-level"),
          ...help,
          { type: "text", value: "2850" },
          submit,
        ),
      ),
    ).toBe(1);
    expect(
      journeyPoints(
        step(
          play("above-sea-level"),
          ...help,
          { type: "text", value: "4000" },
          submit,
        ),
      ),
    ).toBe(0);
  });

  it("offers immediate typing over borderless Europe, then reveals Berlin and political outlines", () => {
    const start = play("ghost-stations");
    const world = view(start);
    expect(world.showBorders).toBe(false);
    expect(world.borderRegionIds).toEqual([]);
    expect(world.states).toMatchObject({
      "wurl:DEU": "context",
      "wurl:FRA": "context",
      "wurl:UKR": "context",
      "wurl:CHN": "disabled",
    });
    expect(world.places).toEqual([]);
    expect(world.physicalFeatures).toEqual([]);
    const node = document.createElement("div");
    node.innerHTML = renderToStaticMarkup(
      <GameShell
        journey={journey}
        context={context}
        game={start}
        dispatch={() => {}}
        webgl
        frame={() => {}}
        onHome={() => {}}
        onStudy={() => {}}
      />,
    );
    expect(node.querySelector("#written-answer")).not.toBeNull();
    const assisted = view(step(start, ...help));
    expect(assisted.states["wurl:DEU"]).toBe("hinted");
    expect(assisted.borderRegionIds).toEqual(["wurl:DEU"]);
    expect(assisted.places).toEqual([]);
    const answered = step(start, { type: "text", value: "  bErLiN! " }, submit);
    expect(answered.answers.at(-1)?.correct).toBe(true);
    expect(view(answered).showBorders).toBe(true);
    expect(
      view(answered).places.find((p) => p.name === "Berlin"),
    ).toMatchObject({ visualState: "correct" });
    expect(view(answered).physicalFeatures).toEqual([]);
    expect(view(answered).states["wurl:FRA"]).toBe("disabled");
    const missed = view(step(start, { type: "text", value: "Paris" }, submit));
    expect(missed.places.find((p) => p.name === "Berlin")).toMatchObject({
      visualState: "answer",
    });
    expect(missed.places.find((p) => p.name === "Paris")).toMatchObject({
      visualState: "incorrect",
    });
    expect(missed.physicalFeatures).toEqual([]);
  });

  it("keeps pin search global on themed land, frames Turkey on assist, and compares actual misses", () => {
    const start = play("between-continents");
    const before = view(start);
    expect(before.focus.altitude).toBeGreaterThanOrEqual(1.65);
    expect(new Set(Object.values(before.states))).toEqual(new Set(["default"]));
    for (const game of [start, step(start, help[0])]) {
      expect(view(game).focus).toEqual(before.focus);
      expect(view(game).places).toEqual([]);
      expect(view(game).overlays).toEqual([]);
    }
    const assisted = view(step(start, ...help));
    expect(assisted.focus).toEqual(
      question("between-continents").guidance?.assist?.focus,
    );
    expect(assisted.focus.altitude).toBeLessThan(before.focus.altitude!);
    expect(assisted.places).toEqual([]);
    expect(assisted.overlays).toEqual([]);
    const missed = step(
      start,
      { type: "drop-pin", lat: -33, lng: 151 },
      submit,
    );
    expect(missed.answers.at(-1)?.correct).toBe(false);
    expect(
      view(missed).places.find((p) => p.sourceId === "player"),
    ).toMatchObject({ lat: -33, lng: 151, visualState: "incorrect" });
    expect(
      view(missed).places.some(
        (p) => p.name.includes("Marmaray") && p.visualState === "answer",
      ),
    ).toBe(true);
    expect(view(missed).overlays?.some((o) => o.type === "path")).toBe(true);
  });

  it("retains point discoveries, contextual stations and actual mistakes in the mixed recap", () => {
    const actions: Record<string, Action[]> = {
      "through-the-building": [select("place:1815286")],
      "the-deep-end": [select("wurl:POL")],
      "above-sea-level": [{ type: "text", value: "2850" }],
      "ghost-stations": [{ type: "text", value: "Berlin" }],
      "between-continents": [{ type: "drop-pin", lat: -33, lng: 151 }],
    };
    let game: GameState = { ...initialGame, phase: "playing" };
    for (const q of journey.rounds) {
      const suffix = Object.keys(actions).find((suffix) =>
        q.id.endsWith(suffix),
      )!;
      game = step(game, ...actions[suffix], submit, { type: "next" });
    }
    expect(game.phase).toBe("finished");
    const recap = view(game);
    expect(recap.states).toMatchObject({
      "wurl:CHN": "hinted",
      "wurl:ECU": "hinted",
      "wurl:DEU": "hinted",
      "wurl:POL": "incorrect",
      "wurl:UKR": "visited",
    });
    expect(recap.places.find((p) => p.name === "Quito")).toMatchObject({
      displayRole: "reference",
      visualState: "hinted",
    });
    expect(
      recap.places.find((p) => p.name.includes("Arsenalna")),
    ).toMatchObject({ displayRole: "reference", visualState: "hinted" });
    expect(recap.places.find((p) => p.name === "Berlin")).toMatchObject({
      visualState: "visited",
    });
    expect(recap.places.find((p) => p.name === "Chengdu")).toMatchObject({
      visualState: "incorrect",
    });
    expect(recap.places.find((p) => p.sourceId === "player")).toMatchObject({
      visualState: "incorrect",
    });
    expect(recap.physicalFeatures).toEqual([]);
    expect(recap.states["wurl:FRA"]).toBe("disabled");
  });
});
