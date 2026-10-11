// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act, useReducer } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi } from "vitest";
import { geoContains } from "d3-geo";
import { ANDES_JOURNEY as journey } from "../src/game/andesJourney";
import { AnswerForm } from "../src/game/AnswerForm";
import { gameReducer, initialGame } from "../src/game/state";
import type { Action, GameState } from "../src/game/state";
import {
  createQuestionContext,
  canSubmit,
  isCorrect,
} from "../src/game/questions";
import { correctAnswerSummary } from "../src/game/copy";
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
const order = journey.rounds[4];
const placed = () =>
  reduce(
    at(4),
    ...["wurl:PER", "wurl:BOL", "wurl:ARG"].map(
      (id, index): Action => ({ type: "order-card", id, index }),
    ),
  );

describe("Along the Andes authored map and ordering puzzle", () => {
  it("provides the physical spine throughout, without leaking exact targets", () => {
    const footprint = journey.rounds[0].physicalFeatures![0].geometry!;
    expect(geoContains(sphericalGeometry(footprint), [-74.0818, 4.6097])).toBe(
      true,
    );
    expect(geoContains(sphericalGeometry(footprint), [-66.8792, 10.488])).toBe(
      false,
    );
    for (let index = 0; index < 5; index++) {
      const map = journeyWorld(regions, journey, at(index), context);
      expect(map.physicalFeatures.map((feature) => feature.id)).toEqual([
        "andes:range",
      ]);
      expect(map.physicalFeatures[0].geometry?.type).toBe("MultiPolygon");
      expect(map.physicalFeatures[0].relief!.hachures.length).toBeGreaterThan(
        1000,
      );
      if (index !== 1) expect(map.places).toEqual([]);
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
  it("uses summit choices without answer-bearing markers and reveals Chimborazo afterward", () => {
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
      for (const name of ["Chimborazo", "Cotopaxi", "Cayambe", "Antisana"])
        expect(html).toContain(name);
      expect(html).not.toContain("Tap a summit marker");
    }
    const answered = reduce(
      at(1),
      { type: "select", id: "peak:chimborazo" },
      { type: "submit" },
    );
    expect(answered.answers.at(-1)?.correct).toBe(true);
    expect(
      journeyWorld(regions, journey, answered, context).places.map(
        (place) => place.name,
      ),
    ).toEqual(["Chimborazo"]);
  });
  it("makes Aconcagua selectable through the actual map contract and keeps assists neutral", () => {
    const map = journeyWorld(regions, journey, at(3), context);
    expect(map.regionInteraction).toBe(true);
    expect(map.selectDisabled).toBe(true);
    expect(map.showBorders).toBe(true);
    for (const id of ["wurl:CHL", "wurl:ARG", "wurl:PRY", "wurl:URY"])
      expect(map.states[id]).toBe("selectable");
    expect(map.borderRegionIds).toEqual([
      "wurl:ARG",
      "wurl:CHL",
      "wurl:PRY",
      "wurl:URY",
    ]);
    const helped = reduce(
      at(3),
      { type: "request-hint" },
      { type: "request-assist" },
    );
    const assistMap = journeyWorld(regions, journey, helped, context);
    expect(assistMap.states["wurl:CHL"]).toBe("selectable");
    expect(assistMap.states["wurl:ARG"]).toBe("selectable");
    expect(reduce(helped, { type: "select", id: "wurl:PER" })).toBe(helped);
    const answer = reduce(
      helped,
      { type: "select", id: "wurl:ARG" },
      { type: "submit" },
    );
    expect(answer.answers.at(-1)?.correct).toBe(true);
    const reveal = journeyWorld(regions, journey, answer, context);
    const summit = reveal.places[0];
    expect(
      geoContains(
        sphericalGeometry(context.targets.get("wurl:ARG")!.geometry),
        [summit.lng, summit.lat],
      ),
    ).toBe(true);
    expect(reveal.focus).toEqual(journey.rounds[3].feedbackFocus);
    for (const webgl of [true, false]) {
      const html = renderToStaticMarkup(
        <AnswerForm
          question={journey.rounds[3]}
          context={context}
          game={at(3)}
          dispatch={() => {}}
          webgl={webgl}
        />,
      );
      expect(html.includes("Answer by typing")).toBe(!webgl);
    }
  });
  it("grades complete, unique card order with a real distractor", () => {
    expect(canSubmit(order, context, at(4))).toBe(true);
    expect(isCorrect(order, context, at(4))).toBe(false);
    expect(reduce(at(4), { type: "jump", index: 4 }).ordered).toEqual(
      order.orderInitial,
    );
    const correct = placed();
    expect(canSubmit(order, context, correct)).toBe(true);
    expect(isCorrect(order, context, correct)).toBe(true);
    expect(reduce(correct, { type: "submit" }).answers.at(-1)?.correct).toBe(
      true,
    );
    expect(correctAnswerSummary(order, context, correct).value).toBe(
      "Peru → Bolivia → Argentina",
    );
    for (const ordered of [
      ["wurl:BOL", "wurl:PER", "wurl:ARG"],
      ["wurl:PER", "wurl:PRY", "wurl:ARG"],
      ["wurl:PER", "wurl:PER", "wurl:ARG"],
      ["wurl:PER", "wurl:BOL"],
    ])
      expect(isCorrect(order, context, { ...correct, ordered })).toBe(false);
    expect(
      reduce(correct, { type: "order-card", id: "wurl:USA", index: 0 }),
    ).toBe(correct);
    expect(
      reduce(correct, { type: "order-card", id: "wurl:PER", index: 3 }),
    ).toBe(correct);
    expect(
      reduce(correct, { type: "ordered", index: 0, value: "wurl:PRY" }),
    ).toBe(correct);
  });
  it("swaps placed cards, returns displaced cards to spares, and enforces assist locks", () => {
    const correct = placed();
    const swapped = reduce(correct, {
      type: "order-card",
      id: "wurl:ARG",
      index: 0,
    });
    expect(swapped.ordered).toEqual(["wurl:ARG", "wurl:BOL", "wurl:PER"]);
    const displaced = reduce(swapped, {
      type: "order-card",
      id: "wurl:PRY",
      index: 2,
    });
    expect(displaced.ordered).toEqual(["wurl:ARG", "wurl:BOL", "wurl:PRY"]);
    const helped = reduce(
      displaced,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(helped.ordered).toEqual(["wurl:PRY", "wurl:BOL", "wurl:ARG"]);
    expect(helped.help?.[order.id]).toBe("assisted");
    for (const action of [
      { type: "order-card", id: "wurl:ARG", index: -1 },
      { type: "order-card", id: "wurl:PRY", index: 2 },
    ] as Action[])
      expect(reduce(helped, action)).toBe(helped);
    const cleared = reduce(helped, { type: "clear" });
    expect(cleared.ordered).toEqual(["wurl:BOL", "wurl:PRY", "wurl:ARG"]);
    const bankSwap = reduce(correct, {
      type: "order-card",
      id: "wurl:PER",
      index: -1,
    });
    expect(bankSwap.ordered).toEqual(["wurl:PRY", "wurl:BOL", "wurl:ARG"]);
    expect(
      reduce(
        cleared,
        { type: "order-card", id: "wurl:PER", index: 0 },
        { type: "order-card", id: "wurl:BOL", index: 1 },
        { type: "submit" },
      ).answers.at(-1)?.correct,
    ).toBe(true);
    expect(() =>
      createQuestionContext(regions, [], {
        ...journey,
        rounds: [
          {
            ...order,
            guidance: {
              hint: "Hint",
              assist: {
                text: "Assist",
                fixedSlots: [{ index: 2, id: "wurl:PRY" }],
              },
            },
          },
        ],
      }),
    ).toThrow("Invalid ordering");
  });
  it("supports button placement, pointer drag, and the hint-to-lock transition", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    function Puzzle() {
      const [game, dispatch] = useReducer(
        (state: GameState, action: Action) =>
          gameReducer(state, action, journey, context),
        at(4),
      );
      return (
        <AnswerForm
          question={order}
          context={context}
          game={game}
          dispatch={dispatch}
          webgl
        />
      );
    }
    try {
      await act(async () => root.render(<Puzzle />));
      const button = (text: string) =>
        [...host.querySelectorAll<HTMLButtonElement>("button")].find(
          (element) => element.textContent?.includes(text),
        )!;
      await act(async () => button("Peru").click());
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>('[aria-label="North: Bolivia"]')!
          .click(),
      );
      expect(host.querySelector('[aria-label="North: Peru"]')).toBeTruthy();
      expect(host.querySelectorAll(".order-card")).toHaveLength(4);
      expect(host.textContent).not.toContain("Spare cards");
      expect(host.textContent).toContain("Impostor");
      expect(host.textContent).not.toContain("North → South");
      expect(host.textContent).not.toContain("empty");
      const card = button("Bolivia");
      const middle = host.querySelector<HTMLElement>('[data-order-slot="1"]')!;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: () => middle,
      });
      card.getBoundingClientRect = () =>
        ({ left: 40, top: 60, width: 240, height: 44 }) as DOMRect;
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointerdown", {
            bubbles: true,
            clientX: 100,
            clientY: 80,
          }),
        ),
      );
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointermove", {
            bubbles: true,
            clientX: 300,
            clientY: 150,
          }),
        ),
      );
      const preview = document.body.querySelector<HTMLElement>(
        ".order-drag-preview",
      )!;
      expect(host.contains(preview)).toBe(false); // Escape transformed panel ancestors.
      expect(preview.style.left).toBe("240px");
      expect(preview.style.top).toBe("130px");
      expect(preview.style.width).toBe("240px");
      expect(preview.style.height).toBe("44px");
      await act(async () =>
        card.dispatchEvent(
          new MouseEvent("pointerup", {
            bubbles: true,
            clientX: 300,
            clientY: 150,
          }),
        ),
      );
      expect(document.body.querySelector(".order-drag-preview")).toBeNull();
      expect(host.querySelector('[aria-label="Middle: Bolivia"]')).toBeTruthy();
      await act(async () => button("Need a hint?").click());
      await act(async () => button("Need an assist?").click());
      expect(
        host.querySelector<HTMLButtonElement>(
          '[aria-label="South: Argentina, locked by assist"]',
        )!.disabled,
      ).toBe(true);
      expect(button("Submit answer").disabled).toBe(false);
      expect(
        host.querySelector('[data-order-slot="-1"]')?.textContent,
      ).toContain("Paraguay");
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
      delete (document as unknown as Record<string, unknown>).elementFromPoint;
    }
  });
  it("hides Chile and borders before ordering, then tours consistently styled resolved stops", () => {
    const before = journeyWorld(regions, journey, at(4), context);
    expect(before.showBorders).toBe(false);
    expect(before.states["wurl:CHL"]).toBe("disabled");
    const finished = { ...placed(), phase: "finished" as const };
    const recap = journeyWorld(regions, journey, finished, context);
    expect(
      journey.completion!.views!.slice(0, 5).map((view) => view.lat),
    ).toEqual([4.6, -1, -15.8, -32.65, -40]);
    expect(recap.places.every((place) => place.visualState === "visited")).toBe(
      true,
    );
    for (const id of ["wurl:PER", "wurl:BOL", "wurl:ARG"])
      expect(recap.states[id]).toBe("visited");
    expect(recap.states["wurl:CHL"]).toBe("disabled");
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
