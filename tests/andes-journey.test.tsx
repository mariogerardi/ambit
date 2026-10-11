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
      expect(map.places).toEqual([]);
      expect(journey.rounds[index].guidance?.assist).toBeTruthy();
    }
    const lakeQuestion = journey.rounds[2];
    const before = journeyWorld(regions, journey, at(2), context);
    for (const choice of lakeQuestion.choices!)
      expect(before.states[choice.id]).toBe("hinted");
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
  it("makes Aconcagua selectable through the actual map contract and keeps assists neutral", () => {
    const map = journeyWorld(regions, journey, at(3), context);
    expect(map.regionInteraction).toBe(true);
    expect(map.selectDisabled).toBe(true);
    expect(map.showBorders).toBe(true);
    expect(map.states["wurl:CHL"]).toBe("hinted");
    expect(map.states["wurl:ARG"]).toBe("disabled");
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
    expect(canSubmit(order, context, at(4))).toBe(false);
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
      ["wurl:PER", "wurl:BRA", "wurl:ARG"],
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
      reduce(correct, { type: "ordered", index: 0, value: "wurl:BRA" }),
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
      id: "wurl:BRA",
      index: 2,
    });
    expect(displaced.ordered).toEqual(["wurl:ARG", "wurl:BOL", "wurl:BRA"]);
    const helped = reduce(
      displaced,
      { type: "request-hint" },
      { type: "request-assist" },
    );
    expect(helped.ordered).toEqual(["", "wurl:BOL", "wurl:ARG"]);
    expect(helped.help?.[order.id]).toBe("assisted");
    for (const action of [
      { type: "order-card", id: "wurl:ARG", index: -1 },
      { type: "order-card", id: "wurl:BRA", index: 2 },
    ] as Action[])
      expect(reduce(helped, action)).toBe(helped);
    const cleared = reduce(helped, { type: "clear" });
    expect(cleared.ordered).toEqual(["", "", "wurl:ARG"]);
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
                fixedSlots: [{ index: 2, id: "wurl:BRA" }],
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
          .querySelector<HTMLButtonElement>('[aria-label="North: empty"]')!
          .click(),
      );
      expect(host.querySelector('[aria-label="North: Peru"]')).toBeTruthy();
      const card = button("Bolivia");
      const middle = host.querySelector<HTMLElement>('[data-order-slot="1"]')!;
      Object.defineProperty(document, "elementFromPoint", {
        configurable: true,
        value: () => middle,
      });
      await act(async () => {
        card.dispatchEvent(
          new MouseEvent("pointerdown", {
            bubbles: true,
            clientX: 0,
            clientY: 0,
          }),
        );
        card.dispatchEvent(
          new MouseEvent("pointermove", {
            bubbles: true,
            clientX: 100,
            clientY: 100,
          }),
        );
        card.dispatchEvent(
          new MouseEvent("pointerup", {
            bubbles: true,
            clientX: 100,
            clientY: 100,
          }),
        );
      });
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
      ).toContain("Brazil");
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
      delete (document as unknown as Record<string, unknown>).elementFromPoint;
    }
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
