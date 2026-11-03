// @vitest-environment jsdom
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { geoContains } from "d3-geo";
import {
  POWER_TO_THE_PEOPLE_JOURNEY as journey,
  UKRAINE_2004 as data,
} from "../src/game/powerToThePeopleJourney";
import {
  createQuestionContext,
  selectableIds,
} from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  type GameState,
  type Action,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { dailySaveCodec } from "../src/app/progressSaves";
import { journeyPoints } from "../src/game/points";
import { evaluateConstruction, gridPoint } from "../src/game/construction";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import { auditJourney } from "../src/game/journeyAudit";
import { GameShell } from "../src/game/GameShell";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import type { RegionFeature } from "../src/geography/types";
import type { Construction } from "../src/game/constructionTypes";

const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, [], journey);
const start = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const step = (game: GameState, ...actions: Action[]) =>
  actions.reduce((g, a) => gameReducer(g, a, journey, context), game);
const view = (game: GameState, index?: number) =>
  journeyWorld(regions, journey, game, context, index);
const pick = (i: number, ...ids: string[]) =>
  step(start(i), ...ids.map((id) => ({ type: "select" as const, id })), {
    type: "submit",
  });
const paint = (construction: Construction, help?: "hint" | "assist") =>
  step(
    start(2),
    ...(help
      ? [
          { type: "request-hint" } as Action,
          ...(help === "assist" ? [{ type: "request-assist" } as Action] : []),
        ]
      : []),
    { type: "construction", value: construction },
    { type: "submit" },
  );
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

describe("Power to the People draft", () => {
  it("passes the audit and registers with automatic Daily selection held", () => {
    const report = auditJourney(journey, regions, (asset) =>
      existsSync(`public${asset}`),
    );
    expect(report.errors).toEqual([]);
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)).toMatchObject({
      dailyEligible: false,
      path: "/journey/power-to-the-people",
    });
  });
  it("labels six regional capitals equally and retains a useful four-capital assist", () => {
    const game = start(0),
      world = view(game);
    expect(world.places).toHaveLength(6);
    expect(
      world.places.every(
        (p) => !p.labelHidden && !!p.name && p.visualState === "selectable",
      ),
    ).toBe(true);
    expect(new Set(world.places.map((p) => p.markerSize)).size).toBe(1);
    const assisted = step(
      game,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(
      view(assisted)
        .places.map((p) => p.id)
        .sort(),
    ).toEqual(
      ["1701668", "1609350", "1581130", "1735161"]
        .map((id) => `place:${id}`)
        .sort(),
    );
    expect(view(assisted).places.every((p) => !p.labelHidden)).toBe(true);
    expect(world.places.map((p) => p.name).sort()).toEqual(
      [
        "Manila",
        "Bangkok",
        "Hanoi",
        "Phnom Penh",
        "Vientiane",
        "Kuala Lumpur",
      ].sort(),
    );
    expect(new Set(world.places.map((p) => p.parentId)).size).toBe(6);
    const wrong = pick(0, "place:1609350"),
      reveal = view(wrong);
    expect(
      reveal.places.find((p) => p.id === "place:1609350")?.visualState,
    ).toBe("incorrect");
    expect(
      reveal.places.find((p) => p.id === "place:1701668")?.visualState,
    ).toBe("answer");
    expect(
      reveal.places.find((p) => p.id === "power-people:edsa"),
    ).toMatchObject({
      visualState: "hinted",
      answerTarget: false,
      displayRole: "explanation",
    });
  });
  it("restricts country input to the specified pools with useful survivor sets", () => {
    for (const [i, codes, survivors] of [
      [1, ["ZAF", "NAM", "BWA", "ZWE", "ZMB", "MOZ"], ["ZAF", "NAM", "BWA"]],
      [3, ["MAR", "DZA", "LBY", "EGY", "SDN"], ["DZA", "LBY", "EGY"]],
      [4, ["NPL", "BTN", "BGD", "PAK", "IND", "MMR"], ["IND", "NPL", "BTN"]],
    ] as const) {
      expect(selectableIds(journey.rounds[i], context).sort()).toEqual(
        codes.map((c) => `wurl:${c}`).sort(),
      );
      const w = view(start(i));
      expect(w.selectableRegionIds?.sort()).toEqual(
        codes.map((c) => `wurl:${c}`).sort(),
      );
      const a = view(
        step(start(i), { type: "request-hint" }, { type: "request-assist" }),
      );
      expect(a.selectableRegionIds?.sort()).toEqual(
        survivors.map((c) => `wurl:${c}`).sort(),
      );
    }
  });
  it("withholds source links, country flag identity and the digital finale until commitment", () => {
    for (let i = 0; i < journey.rounds.length; i++)
      expect(shell(start(i)).textContent).not.toContain("**");
    const flag = shell(start(1));
    expect(flag.querySelector("img")?.alt).not.toMatch(/South Africa/i);
    for (const stage of [
      start(4),
      step(start(4), { type: "request-hint" }),
      step(start(4), { type: "request-hint" }, { type: "request-assist" }),
    ]) {
      const html = shell(stage).innerHTML;
      expect(html).not.toMatch(
        /Discord|Kathmandu|Sushila|wired\.com|opmcm\.gov/i,
      );
      expect(view(stage).places).toEqual([]);
    }
    expect(shell(pick(4, "wurl:IND")).textContent).toMatch(/informal poll/);
    expect(shell(pick(4, "wurl:IND")).textContent).toMatch(
      /appointed her interim prime minister/,
    );
    expect(shell(pick(4, "wurl:IND")).textContent).not.toMatch(
      /not elected|nationwide Discord/,
    );
  });
  it("separates context from tasks and draws a clean play perimeter with the original grading geometry", () => {
    for (let i = 0; i < 5; i++) {
      const node = shell(start(i));
      expect(node.querySelector(".journey-lead-in")?.textContent).toBe(
        journey.rounds[i].leadIn,
      );
      expect(node.querySelector(".journey-prompt")?.textContent).toBe(
        journey.rounds[i].prompt,
      );
      expect(journey.rounds[i].leadIn).toBeTruthy();
    }
    expect(journey.rounds[2].leadIn).toMatch(/corruption.*Europe/);
    expect(journey.rounds[2].leadIn).toMatch(/industrial.*east.*Russia/);
    const paths = view(start(2)).overlays!.filter((o) => o.type === "path");
    expect(paths).toHaveLength(1);
    expect(journey.rounds[2].constructionArea?.geometry).toBe(
      data.countryGeometry,
    );
    expect(
      view(start(3)).places.find((p) => p.name === "Sidi Bouzid"),
    ).toMatchObject({
      displayRole: "reference",
      visualState: "hinted",
      parentId: "wurl:TUN",
    });
  });
  it("reproduces all 27 CEC units, their source hashes, clipped area and independent sampling", () => {
    const base = "public/journeys/power-to-the-people/";
    const results = JSON.parse(
      readFileSync(base + "regional-results.json", "utf8"),
    );
    const audit = JSON.parse(readFileSync(base + "data-audit.json", "utf8"));
    const hash = (path: string) =>
      createHash("sha256").update(readFileSync(path)).digest("hex");
    expect(hash("src/game/data/power-people-ukraine.v1.json")).toBe(
      audit.outputSHA256,
    );
    expect(hash("public/geography/world.v1.json")).toBe(audit.worldSHA256);
    for (const [file, digest] of Object.entries(audit.outputsSHA256))
      expect(hash(base + file)).toBe(digest);
    expect(results.electionDate).toBe("2004-12-26");
    expect(data.regions).toHaveLength(27);
    const winningISO = [
      "05",
      "07",
      "18",
      "21",
      "26",
      "32",
      "35",
      "46",
      "53",
      "56",
      "59",
      "61",
      "68",
      "71",
      "77",
      "74",
      "30",
    ]
      .map((c) => `UA-${c}`)
      .sort();
    expect(
      results.regions
        .filter((r: { winner: string }) => r.winner === "Yushchenko")
        .map((r: { iso: string }) => r.iso)
        .sort(),
    ).toEqual(winningISO);
    expect(
      data.regions
        .filter((r) => r.winner === "Yushchenko")
        .map((r) => r.iso)
        .sort(),
    ).toEqual(winningISO);
    expect(audit.countryAreaKm2).toBeGreaterThan(590000);
    expect(audit.countryAreaKm2).toBeLessThan(615000);
    expect(Math.abs(audit.gridAreaKm2 / audit.countryAreaKm2 - 1)).toBeLessThan(
      0.01,
    );
    expect(
      Math.abs(audit.gridTargetShare - audit.independentTargetShare),
    ).toBeLessThan(0.002);
    for (const [iso, coordinate] of [
      ["UA-30", [30.52, 50.45]],
      ["UA-32", [30.1, 50.15]],
      ["UA-40", [33.52, 44.6]],
      ["UA-43", [34.1, 44.95]],
    ] as const) {
      const unit = data.regions.find((r) => r.iso === iso)!;
      expect(
        geoContains(sphericalGeometry(unit.geometry), [...coordinate]),
      ).toBe(true);
    }
    // Independently check source-unit membership at well-inside grid points.
    for (const [index, value] of data.grid.cells
      .filter(([, v]) => v === 0 || v === 1)
      .filter((_, i) => i % 149 === 0)) {
      const p = gridPoint(data.grid, index);
      const unit = data.regions.find((r) =>
        geoContains(sphericalGeometry(r.geometry), [p.lng, p.lat]),
      );
      if (unit) expect(value).toBe(unit.winner === "Yushchenko" ? 1 : 0);
    }
  });
  it("grades realistic broad, partial and wrong-side strokes with independent help ceilings", () => {
    for (const [name, tier, points] of [
      ["complete", 0, 3],
      ["middle", 1, 2],
      ["lower", 2, 1],
      ["wrongSide", null, 0],
    ] as const) {
      const game = paint(data.examples[name]);
      expect(game.phase).toBe("feedback");
      expect(game.answers[0]?.constructionResult?.tier, name).toBe(tier);
      expect(journeyPoints(game), name).toBe(points);
    }
    expect(journeyPoints(paint(data.examples.complete, "hint"))).toBe(2);
    expect(journeyPoints(paint(data.examples.complete, "assist"))).toBe(1);
    const outside: Construction = {
      version: 1,
      kind: "brush",
      strokes: [
        { points: [{ lat: 10, lng: 10 }], radiusKm: 100, erase: false },
      ],
    };
    const result = evaluateConstruction(journey.rounds[2], {
      ...initialGame,
      construction: outside,
    });
    expect(result?.tier).toBeNull();
    expect(result?.metrics[0].value).toBe(0);
    const w = view(paint(data.examples.wrongSide));
    expect(
      w.overlays!.some(
        (o) =>
          o.type === "raster-patch" &&
          o.id === "power-people:historical-results",
      ),
    ).toBe(true);
    expect(
      w
        .overlays!.filter((o) => o.type === "paint")
        .map((o) => o.coverage)
        .sort(),
    ).toEqual(["inside", "missed", "outside"]);
    expect(
      view(start(2)).overlays!.some(
        (o) => o.id === "power-people:historical-results",
      ),
    ).toBe(false);
    expect(
      view(step(start(2), { type: "request-hint" }, { type: "request-assist" }))
        .places.map((p) => p.name)
        .sort(),
    ).toEqual(["Donetsk · Yanukovych example", "Lviv · Yushchenko example"]);
  });
  it("gives no partial country credit and retains selected errors plus the omitted solution", () => {
    const game = pick(3, "wurl:EGY", "wurl:DZA"),
      w = view(game);
    expect(journeyPoints(game)).toBe(0);
    expect(w.states).toMatchObject({
      "wurl:EGY": "correct",
      "wurl:DZA": "incorrect",
      "wurl:LBY": "answer",
      "wurl:TUN": "hinted",
    });
    expect(journeyPoints(pick(3, "wurl:EGY", "wurl:LBY"))).toBe(3);
  });
  it("restores frozen paint and all city/country errors through saves and completion review", () => {
    const city = pick(0, "place:1609350"),
      country = pick(3, "wurl:EGY", "wurl:DZA"),
      brush = paint(data.examples.lower),
      nepal = pick(4, "wurl:IND");
    const completed: GameState = {
      ...nepal,
      phase: "finished",
      answers: [
        ...city.answers,
        ...pick(1, "wurl:ZAF").answers,
        ...brush.answers,
        ...country.answers,
        ...nepal.answers,
      ],
    };
    const codec = dailySaveCodec([journey]);
    const save = {
      version: 1 as const,
      attempts: {
        "2026-11-03": {
          date: "2026-11-03",
          journeyId: journey.id,
          scheduleVersion: 1,
          game: completed,
        },
      },
    };
    expect(codec.valid(save)).toBe(true);
    const restored = codec.decode(
      JSON.parse(JSON.stringify(codec.encode(save))),
    ).attempts["2026-11-03"].game;
    expect(restored.answers).toEqual(completed.answers);
    const overview = view(restored);
    expect(overview.states).toMatchObject({
      "wurl:DZA": "incorrect",
      "wurl:IND": "incorrect",
    });
    expect(
      overview.places.find((p) => p.id === "place:1609350")?.visualState,
    ).toBe("incorrect");
    expect(overview.routes).toEqual([]);
    const cityReview = view(restored, 0);
    expect(
      cityReview.places.find((p) => p.id === "place:1701668")?.visualState,
    ).toBe("answer");
    expect(
      cityReview.places.find((p) => p.id === "place:1609350")?.visualState,
    ).toBe("incorrect");
    const review = view(restored, 2);
    const savedPaint = restored.answers[2].construction;
    if (savedPaint?.kind !== "brush") throw Error("Expected saved brush");
    for (const overlay of review.overlays!)
      if (overlay.type === "paint")
        expect(overlay.strokes).toEqual(savedPaint.strokes);
    expect(
      review.overlays!.some(
        (o) => o.type === "paint" && o.coverage === "outside",
      ),
    ).toBe(true);
  });
});
