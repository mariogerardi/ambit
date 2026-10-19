// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { PerspectiveCamera } from "three";
import type { RegionFeature } from "../src/geography/types";
import {
  ClueLocators,
  prepareClueLocator,
  projectClueLocator,
} from "../src/globe/clueLocators";
import type { ClueLocator } from "../src/globe/clueLocators";
import { validateQuestionContract } from "../src/game/questionBuilder";
import { FOURTEENTH_JOURNEY } from "../src/game/fourteenthJourney";

const region = (size: number, lng = 0): RegionFeature => ({
  id: "clue",
  name: "Withheld owner name",
  level: "ADM0",
  sourceId: "test",
  focus: { lat: 0, lng, altitude: 1 },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [lng - size, -size],
        [lng - size, size],
        [lng + size, size],
        [lng + size, -size],
        [lng - size, -size],
      ],
    ],
  },
});
const clue = (size = 0.5, lng = 0): ClueLocator => ({
  id: "given-area",
  label: "Given island",
  region: region(size, lng),
});
const camera = (distance = 300) => {
  const result = new PerspectiveCamera(50, 800 / 600, 0.5, 1200);
  result.position.set(0, 0, distance);
  result.lookAt(0, 0, 0);
  result.updateMatrixWorld();
  return result;
};

describe("supplied small-area clue locators", () => {
  it("responds to projected footprint size, zoom and the horizon without changing geography", () => {
    const small = clue();
    const before = JSON.stringify(small.region.geometry);
    const prepared = prepareClueLocator(small);
    expect(projectClueLocator(prepared, camera(), 800, 600, 100)).toBeDefined();
    expect(
      projectClueLocator(prepared, camera(102), 800, 600, 100),
    ).toBeUndefined();
    expect(
      projectClueLocator(prepareClueLocator(clue(35)), camera(), 800, 600, 100),
    ).toBeUndefined();
    expect(
      projectClueLocator(
        prepareClueLocator(clue(0.5, 175)),
        camera(),
        800,
        600,
        100,
      ),
    ).toBeUndefined();
    expect(JSON.stringify(small.region.geometry)).toBe(before);
  });
  it("keeps an authored callout after the initial pulse without revealing the region's name or restarting on updates", () => {
    const layer = new ClueLocators(),
      given = clue();
    layer.update([given]);
    expect(layer.view(camera(), 800, 600, 100)).toHaveLength(1);
    const group = layer.element.querySelector("g")!;
    expect(group.classList.contains("is-pulsing")).toBe(true);
    expect(layer.element.textContent).toBe("Given island");
    expect(layer.element.textContent).not.toContain(given.region.name);
    group.classList.remove("is-pulsing"); // The finite CSS animation has finished.
    layer.update([{ ...given }]);
    layer.view(camera(), 800, 600, 100);
    expect(layer.element.querySelector("g")).toBe(group);
    expect(group.classList.contains("is-pulsing")).toBe(false);
    expect(group.style.display).toBe("");
    expect(layer.element.querySelector("path")?.getAttribute("d")).toContain(
      "M0 0 L",
    );
    expect(layer.element.getAttribute("aria-hidden")).toBe("true");
    layer.update([]);
    expect(layer.element.childElementCount).toBe(0);
    layer.dispose();
  });
  it("uses a static callout for reduced motion and avoids panel space", () => {
    const layer = new ClueLocators();
    layer.update([clue()], "paper", true);
    expect(
      layer.view(camera(), 800, 600, 100, [
        { left: 420, right: 800, top: 0, bottom: 600 },
      ]),
    ).toHaveLength(1);
    const group = layer.element.querySelector("g")!;
    expect(group.classList.contains("is-pulsing")).toBe(false);
    expect(
      Number(layer.element.querySelector("text")!.getAttribute("x")),
    ).toBeLessThan(0);
    expect(
      layer.view(camera(), 800, 600, 100, [
        { left: 0, right: 800, top: 0, bottom: 600 },
      ]),
    ).toHaveLength(0);
    expect(group.style.display).toBe("none");
    layer.dispose();
  });
  it("rejects a locator aimed at geography not explicitly supplied in the question", () => {
    const question = FOURTEENTH_JOURNEY.rounds[0];
    expect(() =>
      validateQuestionContract({
        ...question,
        clueLocators: [{ regionId: "wurl:IND", label: "Answer" }],
      }),
    ).toThrow("explicitly supplied");
    expect(() =>
      validateQuestionContract({
        ...question,
        clueLocators: [{ ...question.clueLocators![0], label: " " }],
      }),
    ).toThrow("authored labels");
  });
});
