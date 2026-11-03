// @vitest-environment jsdom
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { geoDistance } from "d3-geo";
import { BARE_MINIMUM_JOURNEY as journey } from "../src/game/bareMinimumJourney";
import {
  createQuestionContext,
  selectableIds,
} from "../src/game/questionPreparation";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { journeyWorld } from "../src/app/journeyWorld";
import { auditJourney } from "../src/game/journeyAudit";
import { journeyPoints } from "../src/game/points";
import { ANSWER_PLACES } from "../src/game/answerTargets";
import { dailySaveCodec } from "../src/app/progressSaves";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { GameShell } from "../src/game/GameShell";
import type { RegionFeature } from "../src/geography/types";
const regions: RegionFeature[] = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
);
const context = createQuestionContext(regions, [], journey);
const start = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const step = (g: GameState, ...actions: Action[]) =>
  actions.reduce((s, a) => gameReducer(s, a, journey, context), g);
const choose = (i: number, ...ids: string[]) =>
  step(start(i), ...ids.map((id) => ({ type: "select" as const, id })), {
    type: "submit",
  });
const pin = (lat: number, lng: number, help?: "hint" | "assist") =>
  step(
    start(1),
    ...(help
      ? [
          { type: "request-hint" } as Action,
          ...(help === "assist" ? [{ type: "request-assist" } as Action] : []),
        ]
      : []),
    { type: "drop-pin", lat, lng },
    { type: "submit" },
  );
const view = (g: GameState) => journeyWorld(regions, journey, g, context);
const shell = (g: GameState) => {
  const node = document.createElement("div");
  node.innerHTML = renderToStaticMarkup(
    <GameShell
      journey={journey}
      context={context}
      game={g}
      dispatch={() => {}}
      webgl
      onHome={() => {}}
      onStudy={() => {}}
      frame={() => {}}
    />,
  );
  return node;
};
describe("Bare Minimum draft", () => {
  it("passes the standalone audit and registers for review with automatic Daily selection held", () => {
    expect(
      auditJourney(journey, regions, (asset) => existsSync(`public${asset}`))
        .errors,
    ).toEqual([]);
    expect(JOURNEY_INDEX.find((j) => j.id === journey.id)).toMatchObject({
      dailyEligible: false,
      path: "/journey/bare-minimum",
    });
  });
  it("ships reproducible, local historical illustrations with explicit status captions", () => {
    const base = "public/journeys/bare-minimum/",
      audit = JSON.parse(readFileSync(base + "asset-audit.json", "utf8"));
    const sha = (p: string) =>
      createHash("sha256").update(readFileSync(p)).digest("hex");
    expect(sha("public/geography/world.v1.json")).toBe(audit.worldSHA256);
    expect(sha("src/game/data/bare-minimum-borneo.v1.json")).toBe(
      audit.coastSHA256,
    );
    for (const [file, hash] of Object.entries(audit.outputsSHA256))
      expect(sha(base + file)).toBe(hash);
    expect(journey.completion?.flags).toHaveLength(7);
    expect(
      journey.completion?.flags?.find((f) => f.label.includes("Brunei"))
        ?.caption,
    ).toMatch(/royal banner/);
    expect(
      journey.completion?.flags?.find((f) => f.label.includes("emirate"))
        ?.caption,
    ).toMatch(/reconstruction/);
    expect(readFileSync(base + "clue-04.svg", "utf8")).toContain(
      "Reconstruction",
    );
    expect(
      readFileSync(base + "clue-03.svg", "utf8").match(/fill="#ce2028"/g),
    ).toHaveLength(2);
  });
  it("withholds source links and later flags while preserving genuine clue images", () => {
    for (let i = 0; i < 5; i++) {
      const node = shell(start(i));
      expect(node.querySelector(".flag-clue img")).not.toBeNull();
      expect(node.querySelector(".flag-comparison")).toBeNull();
      expect(node.querySelector('a[href*="fotw"]')).toBeNull();
      expect(node.textContent).not.toContain("Gaddafi");
    }
    expect(
      shell(start(0)).querySelector(".flag-clue img")?.getAttribute("alt"),
    ).not.toMatch(/France/i);
    expect(
      shell(start(4)).querySelector(".flag-clue img")?.getAttribute("alt"),
    ).not.toMatch(/Libya/i);
    expect(
      shell(choose(0, "wurl:FRA")).querySelectorAll(".flag-comparison figure"),
    ).toHaveLength(3);
    expect(
      shell(choose(4, "wurl:TUN")).querySelectorAll(".flag-comparison figure"),
    ).toHaveLength(2);
  });
  it("limits map choices and survivor sets without auto-selecting the solution", () => {
    for (const [i, count, survivors] of [
      [0, 6, 4],
      [2, 10, 6],
      [4, 6, 4],
    ]) {
      expect(selectableIds(journey.rounds[i], context)).toHaveLength(count);
      const assisted = step(
        start(i),
        { type: "request-hint" },
        { type: "request-assist" },
      );
      expect(view(assisted).selectableRegionIds).toHaveLength(survivors);
      expect(assisted.selectedIds).toEqual([]);
    }
    expect(view(choose(0, "wurl:ESP")).states).toMatchObject({
      "wurl:ESP": "incorrect",
      "wurl:FRA": "answer",
    });
    expect(view(choose(4, "wurl:TUN")).states).toMatchObject({
      "wurl:TUN": "incorrect",
      "wurl:LBY": "answer",
    });
  });
  it("hides Brunei borders and target during play, and uses distant orientation cities only on assist", () => {
    const world = view(start(1));
    expect(world.showBorders).toBe(false);
    expect(world.places.map((p) => p.name)).toEqual(["Borneo"]);
    expect(
      world.overlays?.find((o) => o.id === "bare:borneo-coast"),
    ).toMatchObject({ type: "path", visualState: "hinted" });
    expect(world.states["wurl:BRN"]).not.toMatch(/hinted|answer|correct/);
    const assist = view(
      step(start(1), { type: "request-hint" }, { type: "request-assist" }),
    );
    const target = ANSWER_PLACES.get("place:1820906")!;
    for (const id of ["place:1735634", "place:1650527"]) {
      const p = assist.places.find((p) => p.id === id)!;
      expect(p.visualState).toBe("hinted");
      expect(
        geoDistance([p.lng, p.lat], [target.lng, target.lat]) * 6371.0088,
      ).toBeGreaterThan(250);
    }
    expect(assist.places.some((p) => p.id === target.id)).toBe(false);
  });
  it("grades pins at Brunei’s capital with the authored three bands and independent help ceilings", () => {
    for (const [lat, lng, points] of [
      [4.89035, 114.94006, 3],
      [4.4, 114, 2],
      [4.4, 113.0, 1],
      [1.55, 110.33333, 0],
    ])
      expect(journeyPoints(pin(lat, lng)), `${lat},${lng}`).toBe(points);
    expect(journeyPoints(pin(4.89035, 114.94006, "hint"))).toBe(2);
    expect(journeyPoints(pin(4.89035, 114.94006, "assist"))).toBe(1);
    const wrong = pin(-1.26753, 116.82887),
      w = view(wrong);
    expect(
      w.places.some(
        (p) => p.sourceId === "player" && p.visualState === "incorrect",
      ),
    ).toBe(true);
    expect(w.states["wurl:BRN"]).toBe("hinted");
    const brunei = regions.find((r) => r.id === "wurl:BRN")!;
    expect(brunei.geometry.type).toBe("MultiPolygon");
    expect(brunei.geometry.coordinates.length).toBeGreaterThanOrEqual(2);
  });
  it("freezes one-of-two partial credit without turning Yemen into a correct answer", () => {
    const partial = choose(2, "wurl:HUN", "wurl:YEM"),
      w = view(partial);
    expect(journeyPoints(partial)).toBe(1);
    expect(partial.answers[0].correct).toBe(false);
    expect(w.states).toMatchObject({
      "wurl:HUN": "correct",
      "wurl:YEM": "incorrect",
      "wurl:OMN": "answer",
    });
    expect(journeyPoints(choose(2, "wurl:HUN", "wurl:OMN"))).toBe(3);
    expect(journeyPoints(choose(2, "wurl:AUT", "wurl:YEM"))).toBe(0);
  });
  it("keeps Kabul anonymous among five Afghan cities and excludes Peshawar", () => {
    const w = view(start(3));
    expect(w.places).toHaveLength(5);
    expect(w.places.every((p) => p.parentId === "wurl:AFG")).toBe(true);
    expect(selectableIds(journey.rounds[3], context)).not.toContain(
      "place:1168197",
    );
    expect(w.places.every((p) => p.name === "" && p.labelHidden)).toBe(true);
    expect(new Set(w.places.map((p) => p.markerSize)).size).toBe(1);
    const assisted = view(
      step(start(3), { type: "request-hint" }, { type: "request-assist" }),
    );
    expect(assisted.places.map((p) => p.id).sort()).toEqual(
      ["place:1138958", "place:1138336", "place:1139715"].sort(),
    );
    expect(journeyPoints(choose(3, "place:1138958"))).toBe(3);
    for (const id of ["place:1138336", "place:1140026"]) {
      const wrong = choose(3, id),
        map = view(wrong);
      expect(journeyPoints(wrong)).toBe(0);
      expect(map.places.find((p) => p.id === id)?.visualState).toBe(
        "incorrect",
      );
      expect(
        map.places.find((p) => p.id === "place:1138958")?.visualState,
      ).toBe("answer");
      expect(map.states["wurl:PAK"]).not.toBe("incorrect");
    }
  });
  it("restores mixed results and preserves actual mistakes, contextual Afghanistan and all six destinations", () => {
    const results = [
      choose(0, "wurl:ESP"),
      pin(1.55, 110.33333),
      choose(2, "wurl:HUN", "wurl:YEM"),
      choose(3, "place:1140026"),
      choose(4, "wurl:LBY"),
    ];
    const game: GameState = {
      ...results[4],
      phase: "finished",
      answers: results.flatMap((r) => r.answers),
    };
    const codec = dailySaveCodec([journey]);
    const save = {
      version: 1 as const,
      attempts: {
        "2026-11-04": {
          date: "2026-11-04",
          journeyId: journey.id,
          scheduleVersion: 1,
          game,
        },
      },
    };
    expect(codec.valid(save)).toBe(true);
    const restored = codec.decode(
      JSON.parse(JSON.stringify(codec.encode(save))),
    ).attempts["2026-11-04"].game;
    expect(restored.answers).toEqual(game.answers);
    const world = view(restored);
    expect(world.states).toMatchObject({
      "wurl:ESP": "incorrect",
      "wurl:YEM": "incorrect",
      "wurl:AFG": "hinted",
      "wurl:HUN": "visited",
      "wurl:OMN": "visited",
    });
    expect(
      world.places.find((p) => p.id === "place:1140026")?.visualState,
    ).toBe("incorrect");
    expect(world.routes).toEqual([]);
    const referenceMistake = journeyWorld(
      regions,
      {
        ...journey,
        completion: {
          ...journey.completion!,
          contextIds: ["wurl:AFG", "wurl:ESP"],
        },
      },
      restored,
      context,
    );
    expect(referenceMistake.states["wurl:ESP"]).toBe("incorrect");
    expect(journey.completion?.views).toHaveLength(6);
    const html = shell(restored);
    expect(html.querySelectorAll(".flag-collection figure")).toHaveLength(7);
    expect(html.querySelector(".construction-recap-controls")).toBeNull();
  });
});
