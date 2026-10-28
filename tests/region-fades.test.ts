import { Color } from "three";
import { expect, it, vi } from "vitest";
import { RegionFades } from "../src/globe/regionFades";

it("blends country fills on the render clock without restarting completed countries as the route advances", () => {
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const fades = new RegionFades();
  const a = fades.get("a", "run:0", "#334455", "#78dfaa", 180);
  expect(a.color).toEqual(new Color("#334455"));
  expect(fades.needsRefresh()).toBe(true);
  clock.mockReturnValue(90);
  fades.view();
  expect(a.color).toEqual(new Color("#334455").lerp(new Color("#78dfaa"), 0.5));
  expect(fades.get("a", "run:0", "#334455", "#78dfaa", 180)).toBe(a);
  clock.mockReturnValue(180);
  fades.view();
  expect(a.color).toEqual(new Color("#78dfaa"));
  expect(fades.needsRefresh()).toBe(false);
  fades.get("b", "run:0", "#334455", "#78dfaa", 180);
  expect(a.color).toEqual(new Color("#78dfaa"));
  fades.get("a", "run:1", "#334455", "#78dfaa", 180);
  expect(a.color).toEqual(new Color("#334455"));
  fades.dispose();
  clock.mockRestore();
});

it("fades global state changes and alpha from the current color without flashing on interruptions", () => {
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const fades = new RegionFades();
  const material = fades.transition("a", "#888888", 160);
  expect(material.color).toEqual(new Color("#888888"));
  expect(fades.needsRefresh()).toBe(false);
  fades.transition("a", "#78dfaa", 160);
  clock.mockReturnValue(80);
  fades.view();
  const halfway = material.color.clone();
  fades.transition("a", "rgba(40,40,40,0.5)", 160);
  expect(material.color).toEqual(halfway);
  clock.mockReturnValue(160);
  fades.view();
  expect(material.opacity).toBeCloseTo(0.75);
  fades.transition("a", "#888888", 0);
  expect(material.color).toEqual(new Color("#888888"));
  expect(material.opacity).toBe(1);
  expect(fades.needsRefresh()).toBe(false);
  fades.dispose();
  clock.mockRestore();
});

it("starts a new Missing Borders question without fading from cached answer colors", () => {
  const clock = vi.spyOn(performance, "now").mockReturnValue(0);
  const fades = new RegionFades();
  const material = fades.transition("FRA", "#888888", 160, "question-1");
  fades.transition("FRA", "#78dfaa", 160, "question-1");
  clock.mockReturnValue(80);
  fades.view();
  expect(material.color).not.toEqual(new Color("#888888"));
  fades.transition("FRA", "#888888", 160, "question-2");
  expect(material.color).toEqual(new Color("#888888"));
  expect(fades.needsRefresh()).toBe(false);
  clock.mockReturnValue(160);
  fades.view();
  expect(material.color).toEqual(new Color("#888888"));
  // Reveal fades still run normally within the next question.
  fades.transition("FRA", "#78dfaa", 160, "question-2");
  expect(fades.needsRefresh()).toBe(true);
  fades.dispose();
  clock.mockRestore();
});
