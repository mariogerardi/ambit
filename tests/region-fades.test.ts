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
