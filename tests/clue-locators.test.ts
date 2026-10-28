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

it("pulses every supplied island once after travel, including large ones, and can replay without labels", () => {
  const layer = new ClueLocators(),
    c = camera(102),
    islands = [{ ...clue(1), pulseOnly: true }];
  layer.update(islands);
  expect(layer.view(c, 800, 600, 100, [], false)).toEqual([]);
  const group = layer.element.querySelector("g")!;
  expect(group.classList.contains("is-pulsing")).toBe(false);
  expect(layer.needsRefresh()).toBe(true);
  layer.view(c, 800, 600, 100, [], true);
  expect(group.classList.contains("is-pulsing")).toBe(true);
  expect(layer.needsRefresh()).toBe(false);
  expect(layer.element.querySelectorAll("text,path")).toHaveLength(0);
  group.classList.remove("is-pulsing");
  layer.update([...islands]);
  layer.view(c, 800, 600, 100);
  expect(group.classList.contains("is-pulsing")).toBe(false);
  layer.pulse();
  layer.view(c, 800, 600, 100);
  expect(group.classList.contains("is-pulsing")).toBe(true);
  layer.update(islands, "paper", true);
  layer.pulse();
  layer.view(c, 800, 600, 100);
  expect(layer.element.dataset.reduced).toBe("true");
  expect(group.classList.contains("is-pulsing")).toBe(true); // CSS uses opacity only.
  layer.update([]);
  expect(layer.element.children).toHaveLength(0);
  layer.dispose();
});

it("adds and removes the completion ripple casing without duplicating it on updates", () => {
  const layer = new ClueLocators();
  const finish: ClueLocator = {
    ...clue(1),
    pulseOnly: true,
    repeat: true,
    appearance: "completion",
  };
  layer.update([finish]);
  layer.view(camera(), 800, 600, 100, [], false);
  const group = layer.element.querySelector("g")!;
  expect(group.classList.contains("is-pulsing")).toBe(true);
  expect(group.querySelectorAll(".completion-pulse")).toHaveLength(2);
  layer.update([finish], "survey", true);
  expect(group.querySelectorAll(".completion-pulse-casing")).toHaveLength(1);
  expect(layer.element.dataset.reduced).toBe("true");
  layer.update([{ ...finish, appearance: undefined, repeat: false }]);
  expect(group.querySelectorAll("circle")).toHaveLength(1);
  expect(group.querySelector(".clue-locator-pulse")).not.toBeNull();
  expect(group.classList.contains("completion-pulse-group")).toBe(false);
  layer.dispose();
});

it("anchors a border-crossing pulse at its supplied point rather than the country center", () => {
  const fixed = {
    ...clue(35, 175),
    pulseOnly: true,
    repeat: true,
    anchor: { lng: 0, lat: 0 },
  };
  expect(
    projectClueLocator(prepareClueLocator(fixed), camera(), 800, 600, 100),
  ).toMatchObject({ x: 400, y: 300 });
  const layer = new ClueLocators();
  layer.update([fixed]);
  layer.view(camera(), 800, 600, 100);
  expect(
    layer.element.querySelector("g")!.classList.contains("is-pulsing"),
  ).toBe(true);
  expect(
    layer.element.querySelector("g")!.classList.contains("is-repeating"),
  ).toBe(true);
  layer.update([{ ...fixed, repeat: false }]);
  expect(
    layer.element.querySelector("g")!.classList.contains("is-repeating"),
  ).toBe(false);
  layer.update([{ ...fixed, anchor: { lng: 175, lat: 0 } }]);
  layer.view(camera(), 800, 600, 100);
  expect(layer.element.querySelector("g")!.style.display).toBe("none");
  layer.dispose();
});

it("does not let a finish flag suppress its completion pulse, while still respecting real panels", () => {
  const layer = new ClueLocators();
  const c = new PerspectiveCamera(50, 1, 1, 1000);
  c.position.set(0, 0, 300);
  c.lookAt(0, 0, 0);
  c.updateMatrixWorld();
  const finish = {
    ...clue(1),
    pulseOnly: true,
    appearance: "completion" as const,
    anchor: { lat: 0, lng: 0 },
  };
  layer.update([finish], undefined, false);
  const flagBox = { left: 380, right: 440, top: 350, bottom: 410 };
  layer.view(c, 800, 800, 100, [flagBox], false, []);
  const group = layer.element.querySelector("g")!;
  expect(group.style.display).not.toBe("none");
  expect(group.classList.contains("is-pulsing")).toBe(true);
  layer.view(c, 800, 800, 100, [flagBox], false, [flagBox]);
  expect(group.style.display).toBe("none");
  layer.dispose();
});
