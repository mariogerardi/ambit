import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { areaSymbolSize } from "../src/globe/areaSymbols";

const view = (distance: number) => {
  const camera = new PerspectiveCamera(50, 1, 1, 2000);
  camera.position.set(0, 0, distance);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
};
describe("area status symbols", () => {
  it("shrinks with visible territory size and zoom instead of clamping to an overflowing minimum", () => {
    const position = new Vector3(0, 0, 100);
    const close = areaSymbolSize(position, 0.05, view(200), 800, 800);
    const distant = areaSymbolSize(position, 0.05, view(500), 800, 800);
    expect(close).toBe(30);
    expect(distant).toBeGreaterThan(0);
    expect(distant).toBeLessThan(close);
    expect(areaSymbolSize(position, 0.001, view(200), 800, 800)).toBe(0);
  });
  it("fits foreshortened and polar interiors without increasing the symbol", () => {
    const camera = view(300);
    const frontal = areaSymbolSize(
      new Vector3(0, 0, 100),
      0.04,
      camera,
      800,
      800,
    );
    const edge = areaSymbolSize(
      new Vector3(90, 0, 43.6),
      0.04,
      camera,
      800,
      800,
    );
    expect(edge).toBeLessThan(frontal);
    expect(
      Number.isFinite(
        areaSymbolSize(new Vector3(0, 100, 0), 0.04, camera, 800, 800),
      ),
    ).toBe(true);
  });
});
