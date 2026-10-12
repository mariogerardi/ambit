import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { geoDistance } from "d3-geo";
import { SHARED_NAMES_JOURNEY as journey } from "../src/game/sharedNamesJourney";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import {
  canSubmit,
  createQuestionContext,
  isCorrect,
} from "../src/game/questions";
import { answerPlace, pinDistanceTier } from "../src/game/answerTargets";
import { gameReducer, initialGame, journeyScore } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import type { RegionFeature } from "../src/geography/types";
import { journeyWorld } from "../src/app/journeyWorld";
import { GameShell } from "../src/game/GameShell";
import geography from "../src/game/data/shared-names-context.v1.json";
import { ANDES_JOURNEY } from "../src/game/andesJourney";

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
  actions.reduce((g, action) => gameReducer(g, action, journey, context), game);
const help = (game: GameState) =>
  reduce(game, { type: "request-hint" }, { type: "request-assist" });
const view = (game: GameState) => journeyWorld(world, journey, game, context);
const select = (...ids: string[]): Action[] =>
  ids.map((id) => ({ type: "select", id }));
const render = (game: GameState) =>
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

describe("Same Name, Different Place", () => {
  it("completes five distinct contracts with resolved receipts and one point per stop", () => {
    const answers: Action[][] = [
      select("wurl:COG", "wurl:COD"),
      select("place:6058560"),
      select("tripoli:three-cities"),
      select("wurl:GEO"),
      [{ type: "drop-pin", ...geography.falls }],
    ];
    let game = at(0);
    for (const [i, actions] of answers.entries()) {
      expect(canSubmit(journey.rounds[i], context, game)).toBe(false);
      game = reduce(game, ...actions, { type: "submit" });
      expect(game.phase).toBe("feedback");
      expect(game.answers.at(-1)?.correct).toBe(true);
      game = reduce(game, { type: "next" });
    }
    expect(game.phase).toBe("finished");
    expect(journeyScore(game)).toBe(5);
    expect(game.answers.map((a) => a.receiptLabel)).toEqual(
      journey.rounds.map((q) => q.resolvedLabel),
    );
    expect(view(game).routes).toEqual([]);
    expect(view(game).regions.some((r) => r.id === "wurl:USA-GA")).toBe(true);
    expect(view(game).states["wurl:USA-GA"]).toBe("visited");
    expect(view(game).states["wurl:USA"]).toBe("disabled");
    expect(view(game).places.every((p) => p.visualState === "visited")).toBe(
      true,
    );
    expect(journey.completion!.views!.length).toBeGreaterThan(5);
    expect(render(game)).toContain("a place-name rarely tells its whole story");
  });

  it("requires both Congos, keeps every candidate equal, and reveals geography and mistakes", () => {
    const q = journey.rounds[0];
    for (const ids of [[], ["wurl:COG"], ["wurl:COG", "wurl:GAB"]]) {
      const game = { ...at(0), selectedIds: ids };
      expect(isCorrect(q, context, game)).toBe(false);
      expect(canSubmit(q, context, game)).toBe(ids.length === 2);
    }
    expect(view(at(0)).physicalFeatures).toEqual([]);
    for (const id of q.selection.type === "ids" ? q.selection.ids : [])
      expect(view(at(0)).states[id]).toBe("selectable");
    const assisted = help(at(0));
    expect(
      Object.values(view(assisted).states).filter((s) => s === "selectable"),
    ).toHaveLength(4);
    expect(
      isCorrect(
        q,
        context,
        reduce(assisted, ...select("wurl:COD", "wurl:COG")),
      ),
    ).toBe(true);
    const missed = view(
      reduce(at(0), ...select("wurl:GAB", "wurl:COG"), { type: "submit" }),
    );
    expect(missed.states["wurl:COG"]).toBe("correct");
    expect(missed.states["wurl:COD"]).toBe("answer");
    expect(missed.states["wurl:GAB"]).toBe("incorrect");
    expect(
      missed.physicalFeatures.every(
        (f) => f.name === "Congo" && f.paths?.length,
      ),
    ).toBe(true);
    expect(missed.places.map((p) => p.parentId)).toEqual([
      "wurl:COD",
      "wurl:COG",
    ]);
  });

  it("keeps four anonymous equal city targets, then two Thames choices with named references", () => {
    const initial = view(at(1));
    expect(initial.places).toHaveLength(6);
    const candidates = initial.places.filter((p) => p.answerTarget);
    expect(candidates).toHaveLength(4);
    expect(
      candidates.every((p) => !p.name && p.labelHidden && !p.hoverName),
    ).toBe(true);
    expect(
      new Set(
        candidates.map(
          (p) => `${p.kind}/${p.markerSize}/${p.priority}/${p.visualState}`,
        ),
      ).size,
    ).toBe(1);
    expect(
      initial.places.filter((p) => !p.answerTarget).map((p) => p.name),
    ).toEqual(["Toronto", "Detroit"]);
    expect(initial.overlays).toEqual([]);
    const assisted = view(help(at(1)));
    expect(
      assisted.places.filter((p) => p.answerTarget).map((p) => p.id),
    ).toEqual(["place:6058560", "place:5920457"]);
    expect(
      assisted.physicalFeatures.some(
        (f) => f.name === "Thames River" && f.paths![0].length > 100,
      ),
    ).toBe(true);
    expect(
      assisted.physicalFeatures.some(
        (f) => f.name === "Lake St. Clair" && f.geometry,
      ),
    ).toBe(true);
    expect(assisted.focus.altitude).toBeLessThan(initial.focus.altitude!);
    expect(
      view(reduce(help(at(1)), ...select("place:6058560"), { type: "submit" }))
        .focus,
    ).toEqual(journey.rounds[1].feedbackFocus);
    expect(
      isCorrect(journey.rounds[1], context, {
        ...at(1),
        selectedIds: ["place:5920457"],
      }),
    ).toBe(false);
    const reveal = view(
      reduce(at(1), ...select("place:5920457"), { type: "submit" }),
    );
    expect(
      reveal.places.find((p) => p.id === "place:6058560")?.visualState,
    ).toBe("answer");
    expect(
      reveal.places.find((p) => p.id === "place:5920457")?.visualState,
    ).toBe("incorrect");
    expect(reveal.states["wurl:CAN"]).toBe("hinted");
  });

  it("retains the cities/islands breather and withholds the unnamed country across all help stages", () => {
    const semantic = journey.rounds[2];
    expect(semantic.shuffleChoices).toBe(true);
    expect(semantic.guidance!.assist!.candidateIds).toEqual([
      "tripoli:three-cities",
      "tripoli:three-islands",
    ]);
    expect(
      isCorrect(semantic, context, {
        ...at(2),
        selectedIds: ["tripoli:three-islands"],
      }),
    ).toBe(false);
    expect(view(at(2)).places.map((p) => p.name)).toEqual([
      "Tripoli · Libya",
      "Tripoli · Lebanon",
    ]);
    for (const [choice, state] of [
      ["tripoli:three-cities", "correct"],
      ["tripoli:three-islands", "answer"],
    ] as const) {
      const feedback = view(
        reduce(at(2), ...select(choice), { type: "submit" }),
      );
      expect(feedback.places.map((p) => p.visualState)).toEqual([state, state]);
      expect(feedback.states["wurl:LBY"]).toBe("hinted");
      expect(feedback.states["wurl:LBN"]).toBe("hinted");
    }
    expect(journey.rounds[3].guidance!.assist!.text).not.toMatch(
      /eastern|coast|north of|Türkiye/,
    );
    for (const game of [
      at(3),
      reduce(at(3), { type: "request-hint" }),
      help(at(3)),
      reduce(help(at(3)), ...select("wurl:GEO")),
    ]) {
      expect(render(game).replace(/data-question-id="[^"]*"/g, "")).not.toMatch(
        /Georgia|Sakartvelo|Tbilisi|Atlanta|iranicaonline|georgiaencyclopedia/i,
      );
      expect(view(game).regionNames).toBe("none");
      expect(view(game).places).toEqual([]);
      expect(view(game).regions.some((r) => r.id === "wurl:USA-GA")).toBe(
        false,
      );
      expect(view(game).regionInteraction).toBe(true);
    }
    expect(
      Object.values(view(at(3)).states).filter((s) => s === "selectable"),
    ).toHaveLength(4);
    expect(
      Object.values(view(help(at(3))).states).filter((s) => s === "selectable"),
    ).toHaveLength(3);
    for (const id of ["wurl:GEO", "wurl:ARM", "wurl:AZE", "wurl:TUR"])
      expect(
        isCorrect(journey.rounds[3], context, { ...at(3), selectedIds: [id] }),
      ).toBe(id === "wurl:GEO");
    expect(
      render(reduce(at(3), ...select("wurl:GEO"), { type: "submit" })),
    ).toContain("Sakartvelo");
  });

  it("uses the Andes lake surface and shoreline treatment for Victoria and St. Clair", () => {
    const andesLake = ANDES_JOURNEY.completion!.physicalFeatures.find(
      (f) => f.name === "Lake Titicaca",
    )!;
    const scenes = [
      view(help(at(1))),
      view(
        reduce(
          at(4),
          { type: "drop-pin", ...geography.falls },
          { type: "submit" },
        ),
      ),
      view({ ...at(4), phase: "finished" }),
    ];
    for (const name of ["Lake St. Clair", "Lake Victoria"]) {
      const lake = scenes
        .flatMap((s) => s.physicalFeatures)
        .find((f) => f.name === name)!;
      expect(lake.color).toBe(andesLake.color);
      expect(lake.fillOpacity).toBe(andesLake.fillOpacity);
      expect(lake.geometry).toBeDefined();
      expect(lake.paths!.length).toBeGreaterThan(0);
      expect(
        lake.paths!.every(
          (path) =>
            path.length > 3 &&
            path[0][0] === path.at(-1)![0] &&
            path[0][1] === path.at(-1)![1],
        ),
      ).toBe(true);
    }
  });

  it("shows real Zambezi context at first render, hides the target/rings, and keeps distant help honest", () => {
    const scene = view(at(4));
    expect(scene.states["wurl:ZMB"]).toBe("hinted");
    expect(scene.states["wurl:ZWE"]).toBe("hinted");
    expect(scene.physicalFeatures.every((f) => f.name === "Zambezi")).toBe(
      true,
    );
    expect(
      scene.physicalFeatures.flatMap((f) => f.paths ?? []).flat().length,
    ).toBeGreaterThan(800);
    expect(scene.places).toEqual([]);
    expect(scene.overlays).toEqual([]);
    expect(scene.regionNames).toBe("none");
    const q = journey.rounds[4];
    const target = answerPlace(q, geography.falls.id)!;
    const assisted = view(help(at(4)));
    for (const reference of assisted.places)
      expect(
        geoDistance([target.lng, target.lat], [reference.lng, reference.lat]) *
          6371.0088,
      ).toBeGreaterThan(120);
    expect(
      assisted.physicalFeatures.filter((f) => f.name === "Zambezi"),
    ).toEqual(scene.physicalFeatures);
    const lake = assisted.physicalFeatures.find(
      (f) => f.name === "Lake Kariba",
    )!;
    expect(lake.geometry).toBeDefined();
    const shoreline =
      lake.geometry!.type === "Polygon"
        ? lake.geometry!.coordinates.flat()
        : lake.geometry!.coordinates.flat(2);
    expect(
      Math.min(
        ...shoreline.map(
          (p) =>
            geoDistance([target.lng, target.lat], p as [number, number]) *
            6371.0088,
        ),
      ),
    ).toBeGreaterThan(120);
    expect(assisted.places.map((p) => p.name)).toEqual(["Lusaka", "Bulawayo"]);
    const reveal = view(
      reduce(
        at(4),
        { type: "drop-pin", lat: -20, lng: 25 },
        { type: "submit" },
      ),
    );
    expect(
      reveal.overlays
        ?.filter((o) => o.type === "circle")
        .map((o) => o.radiusKm),
    ).toEqual([40, 80, 120]);
    expect(reveal.places.some((p) => p.id === target.id)).toBe(true);
    expect(
      reveal.physicalFeatures.some((f) => f.name === "Lake Victoria"),
    ).toBe(true);
  });

  it.each([
    [40, "Bullseye!"],
    [80, "Very close."],
    [120, "In range."],
    [120.001, undefined],
  ])(
    "grades inclusive %s km tiers identically with and without assistance",
    (km, feedback) => {
      const q = journey.rounds[4];
      const target = answerPlace(q, geography.falls.id)!;
      // Travel due north along a meridian to obtain an exact spherical distance.
      const pin = {
        lat: target.lat + ((km / 6371.0088) * 180) / Math.PI,
        lng: target.lng,
      };
      for (const game of [at(4), help(at(4))]) {
        const response = { ...game, pin };
        expect(isCorrect(q, context, response)).toBe(km <= 120);
        expect(pinDistanceTier(q, response)?.feedback).toBe(feedback);
        const submitted = reduce(response, { type: "submit" });
        expect(journeyScore(submitted)).toBe(km <= 120 ? 1 : 0);
      }
    },
  );

  it("retains actual Thames vertices in order, from the head reach through both cities to the lake", () => {
    const source = JSON.parse(
      readFileSync(
        "public/geography/shared-names-thames-source.v1.geojson",
        "utf8",
      ),
    );
    const coordinates = new Set(
      source.features.flatMap((f: { geometry: { coordinates: number[][] } }) =>
        f.geometry.coordinates.map((p) => p.join(",")),
      ),
    );
    const path = geography.thames.paths[0];
    expect(path.every((p) => coordinates.has(p.join(",")))).toBe(true);
    expect(path[0]).toEqual([-80.8712861, 43.3061417]);
    expect(path.at(-1)).toEqual([-82.4543366, 42.31917]);
    for (const place of [
      answerPlace(journey.rounds[1], "place:6058560")!,
      geography.chatham,
    ]) {
      const closest = Math.min(
        ...path.map(
          (p) =>
            geoDistance(p as [number, number], [place.lng, place.lat]) *
            6371.0088,
        ),
      );
      expect(closest).toBeLessThan(2);
    }
    expect(
      readFileSync("public/geography/shared-names-context.v1.json", "utf8"),
    ).toBe(readFileSync("src/game/data/shared-names-context.v1.json", "utf8"));
    const waterfall = JSON.parse(
      readFileSync(
        "public/geography/shared-names-falls-source.v1.geojson",
        "utf8",
      ),
    );
    expect([geography.falls.lng, geography.falls.lat]).toEqual(
      waterfall.features[0].geometry.coordinates,
    );
    expect(waterfall.features[0].properties.waterway).toBe("waterfall");
    expect(waterfall.features[1].geometry.coordinates).toContainEqual([
      geography.falls.lng,
      geography.falls.lat,
    ]);
  });
});
