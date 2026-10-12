// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { geoContains } from "d3-geo";
import { ANDES_JOURNEY as journey } from "../src/game/andesJourney";
import { AnswerForm } from "../src/game/AnswerForm";
import { GameShell } from "../src/game/GameShell";
import { placeMarkerSize } from "../src/globe/placeLabels";
import { ANSWER_PLACES, pinDistanceTier } from "../src/game/answerTargets";
import { EARTH_KM } from "../src/game/spatial";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import {
  createQuestionContext,
  canSubmit,
  isCorrect,
} from "../src/game/questions";
import { journeyWorld } from "../src/app/journeyWorld";
import { PhysicalFeatures } from "../src/globe/physicalFeatures";
import { sphericalGeometry } from "../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../src/geography/types";
import type { Mesh } from "three";

const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const context = createQuestionContext(regions, [], journey);
const at = (roundIndex: number): GameState => ({
  ...initialGame,
  phase: "playing",
  roundIndex,
});
const reduce = (state: GameState, ...actions: Action[]) =>
  actions.reduce(
    (game, action) => gameReducer(game, action, journey, context),
    state,
  );
const shell = (game: GameState) =>
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
describe("Along the Andes authored map and finale", () => {
  it("provides the physical spine throughout, without leaking exact targets", () => {
    const footprint = journey.rounds[0].physicalFeatures![0].geometry!;
    expect(geoContains(sphericalGeometry(footprint), [-74.0818, 4.6097])).toBe(
      true,
    );
    expect(geoContains(sphericalGeometry(footprint), [-66.8792, 10.488])).toBe(
      false,
    );
    for (let index = 0; index < 4; index++) {
      const map = journeyWorld(regions, journey, at(index), context);
      expect(map.physicalFeatures.map((feature) => feature.id)).toEqual([
        "andes:range",
      ]);
      expect(map.physicalFeatures[0].geometry?.type).toBe("MultiPolygon");
      expect(map.physicalFeatures[0].relief!.hachures.length).toBeGreaterThan(
        1000,
      );
      if (index !== 3) expect(map.places).toEqual([]);
      else expect(map.places.every((place) => place.markerHidden)).toBe(true);
      expect(journey.rounds[index].guidance?.assist).toBeTruthy();
    }
    const lakeQuestion = journey.rounds[2];
    const before = journeyWorld(regions, journey, at(2), context);
    for (const choice of lakeQuestion.choices!)
      expect(before.states[choice.id]).toBe("selectable");
    const answered = reduce(
      at(2),
      { type: "select", id: "wurl:PER" },
      { type: "select", id: "wurl:BOL" },
      { type: "submit" },
    );
    const after = journeyWorld(regions, journey, answered, context);
    expect(after.states["wurl:PER"]).toBe("correct");
    expect(after.states["wurl:BOL"]).toBe("correct");
    const lake = after.physicalFeatures.find(
      (feature) => feature.id === "andes:titicaca",
    )!;
    expect(lake.geometry?.type).toBe("Polygon");
    expect(lake.paths?.[0].length).toBeGreaterThan(50);
    for (const id of ["wurl:PER", "wurl:BOL"])
      expect(
        lake
          .paths!.flat()
          .some((point) =>
            geoContains(
              sphericalGeometry(context.targets.get(id)!.geometry),
              point as [number, number],
            ),
          ),
      ).toBe(true);
  });
  it("supports named lake picks on the globe and buttons, with a clear single-label lake reveal", () => {
    const round = journey.rounds[2];
    const before = journeyWorld(regions, journey, at(2), context);
    expect(before.regionInteraction).toBe(true);
    expect(before.regionNames).toBe("all");
    const buttons = renderToStaticMarkup(
      <AnswerForm
        question={round}
        context={context}
        game={at(2)}
        dispatch={() => {}}
        webgl
      />,
    );
    expect(buttons).toContain("Peru — select answer");
    expect(buttons).toContain("Bolivia — select answer");
    const answered = reduce(
      at(2),
      { type: "select", id: "wurl:PER" },
      { type: "select", id: "wurl:BOL" },
      { type: "submit" },
    );
    const after = journeyWorld(regions, journey, answered, context);
    const cleared = after.physicalFeatures.find(
      (feature) => feature.id === "andes:range",
    )!;
    const original = round.physicalFeatures![0];
    expect(
      after.physicalFeatures.filter((feature) => feature.id === "andes:range"),
    ).toHaveLength(1);
    expect(cleared.relief!.lightFaces!.length).toBeLessThan(
      original.relief!.lightFaces!.length,
    );
    const lake = after.physicalFeatures.find(
      (feature) => feature.id === "andes:titicaca",
    )!;
    for (const ring of [
      ...cleared.relief!.lightFaces!,
      ...cleared.relief!.darkFaces!,
    ])
      for (const point of ring)
        expect(
          geoContains(
            sphericalGeometry(lake.geometry!),
            point as [number, number],
          ),
        ).toBe(false);
    expect(
      after.physicalFeatures.some((feature) => feature.name === "Altiplano"),
    ).toBe(false);
    const recap = journeyWorld(
      regions,
      journey,
      { ...answered, phase: "finished" },
      context,
    );
    expect(
      [...recap.physicalFeatures, ...recap.places].filter(
        (feature) => feature.name === "Lake Titicaca",
      ),
    ).toHaveLength(1);
    expect(
      recap.places.some((place) => place.name.includes("Pacific finish")),
    ).toBe(false);
  });
  it("asks why Chimborazo is farther from the center, then reveals the summit and schematic", () => {
    const map = journeyWorld(regions, journey, at(1), context);
    expect(map.overlays).toContainEqual({
      id: "andes:equator",
      type: "parallel",
      latitude: 0,
    });
    expect(map.places).toEqual([]);
    for (const webgl of [true, false]) {
      const html = renderToStaticMarkup(
        <AnswerForm
          question={journey.rounds[1]}
          context={context}
          game={at(1)}
          dispatch={() => {}}
          webgl={webgl}
        />,
      );
      for (const name of [
        "Earth bulges around the Equator.",
        "Chimborazo is taller above sea level.",
        "Earth is wider around its poles.",
        "Everest’s height is measured from its base.",
      ])
        expect(html).toContain(name);
      expect(html).not.toContain("Tap a summit marker");
    }
    const answered = reduce(
      at(1),
      { type: "select", id: "earth:equatorial-bulge" },
      { type: "submit" },
    );
    expect(answered.answers.at(-1)?.correct).toBe(true);
    const html = renderToStaticMarkup(
      <GameShell
        journey={journey}
        context={context}
        game={answered}
        dispatch={() => {}}
        webgl
        frame={() => {}}
        onHome={() => {}}
        onStudy={() => {}}
      />,
    );
    expect(html).toContain('class="earth-shape-diagram"');
    expect(html).toContain("shape and heights exaggerated");

    expect(
      journeyWorld(regions, journey, answered, context).places.map(
        (place) => place.name,
      ),
    ).toEqual(["Chimborazo"]);
  });
  it("keeps Aconcagua hidden while pinning, grades distance, and reveals pins, distance line and tolerance", () => {
    const round = journey.rounds[3];
    const target = round.places!.find(
      (place) => place.id === "andes:aconcagua",
    )!;
    const map = journeyWorld(regions, journey, at(3), context);
    expect(map.regionInteraction).toBe(false);
    expect(map.showBorders).toBe(true);
    expect(map.borderRegionIds).toEqual(["wurl:ARG", "wurl:CHL"]);
    expect(map.places.map((place) => place.name)).toEqual([
      "Argentina",
      "Chile",
    ]);
    expect(map.overlays).toEqual([]);
    expect(canSubmit(round, context, at(3))).toBe(false);
    const helped = reduce(
      at(3),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    const assistMap = journeyWorld(regions, journey, helped, context);
    expect(assistMap.places.map((place) => place.name)).toEqual([
      "Argentina",
      "Chile",
      "Córdoba",
    ]);
    expect(assistMap.places.some((place) => place.id === target.id)).toBe(
      false,
    );
    for (const reference of round.guidance!.assist!.places!) {
      const onReference = {
        ...helped,
        pin: { lat: reference.lat, lng: reference.lng },
      };
      expect(isCorrect(round, context, onReference)).toBe(false);
      expect(pinDistanceTier(round, onReference)).toBeUndefined();
    }
    const answer = reduce(
      helped,
      { type: "drop-pin", lat: target.lat, lng: target.lng },
      { type: "submit" },
    );
    expect(answer.answers.at(-1)?.correct).toBe(true);
    const reveal = journeyWorld(regions, journey, answer, context);
    expect(reveal.places.find((place) => place.id === target.id)).toMatchObject(
      { kind: "pin", visualState: "answer" },
    );
    expect(reveal.routes).toHaveLength(1);
    expect(reveal.overlays).toContainEqual(
      expect.objectContaining({ type: "circle", radiusKm: 450 }),
    );
    expect(reveal.focus).toEqual(round.feedbackFocus);
    expect(
      isCorrect(round, context, {
        ...at(3),
        pin: { lat: target.lat + 5, lng: target.lng },
      }),
    ).toBe(false);
    // The scoring radius crosses the border; nationality never overrides proximity.
    const nearbyChile = { lat: target.lat, lng: target.lng - 0.2 };
    expect(
      geoContains(
        sphericalGeometry(context.targets.get("wurl:CHL")!.geometry),
        [nearbyChile.lng, nearbyChile.lat],
      ),
    ).toBe(true);
    expect(isCorrect(round, context, { ...at(3), pin: nearbyChile })).toBe(
      true,
    );
    expect(
      renderToStaticMarkup(
        <AnswerForm
          question={round}
          context={context}
          game={at(3)}
          dispatch={() => {}}
          webgl={false}
        />,
      ),
    ).toContain("Enter coordinates");
  });
  it("grades all three bullseye tiers as correct with inclusive edges and distinct feedback", () => {
    const round = journey.rounds[3];
    const target = round.places!.find(
      (place) => place.id === "andes:aconcagua",
    )!;
    for (const [km, expectedFeedback] of [
      [0, "Bullseye!"],
      [150, "Bullseye!"],
      [150.001, "Very close."],
      [300, "Very close."],
      [300.001, "In range."],
      [450, "In range."],
      [450.001, undefined],
    ] as const) {
      const answer = reduce(
        at(3),
        {
          type: "drop-pin",
          lat: target.lat + ((km / EARTH_KM) * 180) / Math.PI,
          lng: target.lng,
        },
        { type: "submit" },
      );
      expect(answer.answers.at(-1)?.correct, `${km} km`).toBe(
        !!expectedFeedback,
      );
      expect(pinDistanceTier(round, answer)?.feedback, `${km} km`).toBe(
        expectedFeedback,
      );
      const html = renderToStaticMarkup(
        <GameShell
          journey={journey}
          context={context}
          game={answer}
          dispatch={() => {}}
          webgl
          frame={() => {}}
          onHome={() => {}}
          onStudy={() => {}}
        />,
      );
      expect(html).toContain(expectedFeedback ?? "Not quite.");
      expect(html).toContain("Your pin was");
      const rings = journeyWorld(regions, journey, answer, context).overlays!;
      expect(
        rings.map((ring) =>
          ring.type === "circle" ? ring.radiusKm : undefined,
        ),
      ).toEqual([150, 300, 450]);
      expect(new Set(rings.map((ring) => ring.id)).size).toBe(3);
    }
    // Tier boundaries must be ordered, cover the complete target, and have feedback.
    for (const tiers of [
      [],
      [{ radiusKm: 150, feedback: "Close" }],
      [
        { radiusKm: 300, feedback: "Close" },
        { radiusKm: 150, feedback: "Closer" },
        { radiusKm: 450, feedback: "In range" },
      ],
      [
        { radiusKm: NaN, feedback: "Close" },
        { radiusKm: 450, feedback: "In range" },
      ],
      [
        { radiusKm: 150, feedback: "" },
        { radiusKm: 450, feedback: "In range" },
      ],
    ]) {
      if (round.rule.type !== "pin-distance")
        throw Error("Expected pin distance rule");
      const rule = round.rule;
      expect(() =>
        createQuestionContext(regions, [], {
          ...journey,
          rounds: [{ ...round, rule: { ...rule, tiers } }],
        }),
      ).toThrow("Invalid pin distance tiers");
    }
  });
  it("grades the wildlife choices and narrows assist to the two birds", () => {
    const round = journey.rounds[4];
    expect(canSubmit(round, context, at(4))).toBe(false);
    for (const choice of round.choices!) {
      const selected = reduce(at(4), { type: "select", id: choice.id });
      expect(canSubmit(round, context, selected)).toBe(true);
      expect(reduce(selected, { type: "submit" }).answers.at(-1)?.correct).toBe(
        choice.id === "animal:penguins",
      );
    }
    const helped = reduce(
      at(4),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    const html = shell(helped);
    const host = document.createElement("div");
    host.innerHTML = html;
    expect(
      [...host.querySelectorAll(".candidate-grid button:disabled")].map(
        (button) => button.textContent,
      ),
    ).toEqual(["Walruses·", "Polar bears·"]);
    for (const id of ["animal:walruses", "animal:polar-bears"])
      expect(reduce(helped, { type: "select", id })).toBe(helped);
    for (const id of ["animal:penguins", "animal:puffins"])
      expect(reduce(helped, { type: "select", id }).selectedIds).toEqual([id]);
    // Requesting assist preserves an existing pick, even if it is ruled out.
    const preserved = reduce(
      at(4),
      { type: "select", id: "animal:walruses" },
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(preserved.selectedIds).toEqual(["animal:walruses"]);
    expect(reduce(preserved, { type: "submit" }).answers.at(-1)?.correct).toBe(
      false,
    );
    // Editing the current edition must still allow an old in-progress Q5 to finish.
    const resumed = {
      ...helped,
      selectedIds: ["wurl:VEN", "wurl:CHL", "wurl:PER"],
    };
    expect(canSubmit(round, context, resumed)).toBe(false);
    const replaced = reduce(resumed, { type: "select", id: "animal:penguins" });
    expect(replaced.selectedIds).toEqual(["animal:penguins"]);
    expect(reduce(replaced, { type: "submit" }).answers.at(-1)?.correct).toBe(
      true,
    );
  });
  it("keeps the documentary photo and animal marker hidden until any answer is submitted", () => {
    const round = journey.rounds[4];
    for (const state of [
      at(4),
      reduce(at(4), { type: "request-hint" }),
      reduce(at(4), { type: "request-hint" }, { type: "request-assist" }),
    ]) {
      const html = shell(state);
      expect(html).not.toContain(round.feedbackImage!.src);
      expect(html).not.toContain("King penguin colony");
      expect(html).not.toContain("Gillermo Adolfo");
      const map = journeyWorld(regions, journey, state, context);
      expect(map.regionInteraction).toBe(false);
      expect(map.places.every((place) => place.markerHidden)).toBe(true);
      expect(map.places.map((place) => place.name)).toEqual([
        "Bahía Inútil",
        "Tierra del Fuego",
      ]);
      expect(map.physicalFeatures).toEqual([]);
    }
    for (const id of ["animal:penguins", "animal:puffins"]) {
      const answered = reduce(
        at(4),
        { type: "select", id },
        { type: "submit" },
      );
      const html = shell(answered);
      expect(html).toContain(round.feedbackImage!.src);
      expect(html).toContain("Gillermo Adolfo");
      expect(html).toContain("CC BY 3.0");
      expect(html).toContain("breeding grounds extend far beyond Antarctica");
      const map = journeyWorld(regions, journey, answered, context);
      expect(map.places).toContainEqual(
        expect.objectContaining({
          name: "King penguin colony",
        }),
      );
      expect(map.places[0].markerHidden).not.toBe(true);
      expect(map.focus).toEqual(round.feedbackFocus);
    }
    expect(
      readFileSync(`public${round.feedbackImage!.src}`).byteLength,
    ).toBeGreaterThan(1000);
  });
  it("highlights Q3 selections using the existing chosen-button class and offsets its initial camera", () => {
    const round = journey.rounds[2];
    const selected = reduce(
      at(2),
      { type: "select", id: "wurl:PER" },
      { type: "select", id: "wurl:BOL" },
    );
    const html = renderToStaticMarkup(
      <AnswerForm
        question={round}
        context={context}
        game={selected}
        dispatch={() => {}}
        webgl
      />,
    );
    const host = document.createElement("div");
    host.innerHTML = html;
    expect(
      [...host.querySelectorAll("button.chosen")].map(
        (button) => button.textContent,
      ),
    ).toEqual(["Peru✓", "Bolivia✓"]);
    expect(host.querySelectorAll('[aria-pressed="true"]')).toHaveLength(2);
    expect(round.focus.lat).toBeGreaterThan(-16);
    expect(round.focus.lng).toBeLessThan(-69);
    expect(round.feedbackFocus).toEqual({
      lat: -15.8,
      lng: -69.3,
      altitude: 0.2,
    });
    const shell = renderToStaticMarkup(
      <GameShell
        journey={journey}
        context={context}
        game={selected}
        dispatch={() => {}}
        webgl
        frame={() => {}}
        onHome={() => {}}
        onStudy={() => {}}
      />,
    );
    expect(shell).not.toContain('class="question-instruction"');
  });
  it("enlarges Q1 reveal stars without changing ordinary map capital sizes", () => {
    const answer = reduce(
      at(0),
      { type: "select", id: "city:bogota" },
      { type: "submit" },
    );
    const places = journeyWorld(regions, journey, answer, context).places;
    expect(places.map(placeMarkerSize)).toEqual([30, 30]);
    expect(places.every((place) => place.kind === "capital")).toBe(true);
    expect(placeMarkerSize(ANSWER_PLACES.get(places[0].id)!)).toBe(18);
  });
  it("ends the completion tour at the colony and keeps the full Journey discoveries", () => {
    const recap = journeyWorld(
      regions,
      journey,
      { ...at(4), phase: "finished" },
      context,
    );
    const colony = journey.rounds[4].feedbackPlaces![0];
    expect(
      journey.completion!.views!.slice(0, 4).map((view) => view.lat),
    ).toEqual([4.6, -1, -15.8, -32.65]);
    expect(journey.completion!.views![4]).toMatchObject({
      lat: colony.lat,
      lng: colony.lng,
    });
    expect(recap.places.every((place) => place.visualState === "visited")).toBe(
      true,
    );
    expect(recap.places.map((place) => place.name)).toEqual([
      "Bogota",
      "Chimborazo",
      "Aconcagua",
      "King penguin colony",
    ]);
    expect(journey.completion!.caption).toContain(
      "king penguins of Tierra del Fuego",
    );
    for (const id of ["VEN", "COL", "ECU", "PER", "BOL", "CHL", "ARG"])
      expect(recap.states[`wurl:${id}`]).toBe("visited");
    expect(recap.states["wurl:BRA"]).toBe("disabled");
  });
  it("renders terrain ink instead of the mountain footprint and cleans it up", () => {
    const physical = new PhysicalFeatures();
    physical.update(
      {
        id: "physical",
        kind: "physical-features",
        features: journey.rounds[0].physicalFeatures!,
      },
      100,
    );
    const faces = physical.group.children.find(
      (group) => group.children[0]?.type === "Mesh",
    )!;
    expect(faces.children).toHaveLength(2); // Batched symbols, no range footprint.
    for (const face of faces.children) {
      expect((face as Mesh).material).toMatchObject({
        opacity: 1,
        transparent: false,
      });
      const intersections: unknown[] = [];
      face.raycast({} as never, intersections as never);
      expect(intersections).toEqual([]);
    }
    const lines = physical.group.children.filter(
      (group) => group.type === "LineSegments2",
    );
    expect(lines).toHaveLength(3);
    for (const line of lines) {
      const intersections: unknown[] = [];
      line.raycast({} as never, intersections as never);
      expect(intersections).toEqual([]);
    }
    physical.update(
      { id: "physical", kind: "physical-features", features: [] },
      100,
    );
    expect(lines.every((line) => !line.visible)).toBe(true);
    physical.dispose();
    expect(physical.group.children).toEqual([]);
  });
  it("replaces cached ink when a same-ID mountain variant clears the lake, then reuses the original safely", () => {
    const physical = new PhysicalFeatures();
    const original = journey.rounds[0].physicalFeatures!;
    const cleared = journey.rounds[2].feedbackPhysicalFeatures!;
    const layer = (features: typeof original) => ({
      id: "physical",
      kind: "physical-features" as const,
      features,
    });
    physical.update(layer(original), 100);
    const oldInk = physical.group.children.filter(
      (child) => child.type === "LineSegments2",
    );
    physical.update(layer([...original, cleared[1]]), 100);
    expect(oldInk.every((line) => line.visible)).toBe(true); // Unrelated layers reuse existing ink.
    physical.update(layer(cleared), 100);
    expect(oldInk.every((line) => !line.visible)).toBe(true);
    expect(
      physical.group.children.filter(
        (child) => child.type === "LineSegments2" && child.visible,
      ),
    ).toHaveLength(4);
    physical.update(layer(original), 100);
    expect(oldInk.every((line) => line.visible)).toBe(true);
    expect(
      physical.group.children.filter(
        (child) => child.type === "LineSegments2" && child.visible,
      ),
    ).toEqual(oldInk);
    physical.dispose();
  });
  it("keeps sourced physical surfaces noninteractive, hides inactive ones, and disposes them", () => {
    const physical = new PhysicalFeatures();
    const feature = journey.rounds[2].feedbackPhysicalFeatures!.find(
      (entry) => entry.id === "andes:titicaca",
    )!;
    physical.update(
      { id: "physical", kind: "physical-features", features: [feature] },
      100,
    );
    const surface = physical.group.children.find(
      (group) => group.children[0]?.type === "Mesh",
    )!;
    const mesh = surface.children[0] as Mesh;
    const dispose = vi.spyOn(mesh.geometry, "dispose");
    expect(mesh.geometry.getAttribute("position").count).toBeGreaterThan(20);
    const intersections: unknown[] = [];
    mesh.raycast({} as never, intersections as never);
    expect(intersections).toEqual([]);
    physical.update(
      { id: "physical", kind: "physical-features", features: [] },
      100,
    );
    expect(surface.visible).toBe(false);
    physical.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });
});
