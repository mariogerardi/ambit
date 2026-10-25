// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { Scene, PerspectiveCamera, Vector3 } from "three";
import { bindFrameAnnotations } from "../src/globe/frameAnnotations";
import { projectSmallRegion } from "../src/globe/smallRegionLocators";

it("projects the same camera frame throughout fast rotation, damping and resize without controls events", () => {
  const scene = new Scene(),
    camera = new PerspectiveCamera(50, 4 / 3, 0.01, 1200);
  const anchor = new Vector3(0, 0, 1),
    projected: { x: number; y: number }[] = [];
  const previous = vi.fn();
  scene.onBeforeRender = previous;
  const unbind = bindFrameAnnotations(scene, () => {
    const point = projectSmallRegion(
      { anchor, area: 1e-8 },
      camera,
      800,
      600,
      100,
    );
    if (point) projected.push(point);
  });
  const render = () => {
    // Three updates matrices before calling Scene.onBeforeRender. No control
    // event or separately scheduled animation callback is required.
    camera.updateMatrixWorld();
    scene.onBeforeRender(null!, scene, camera, null!, null!, null!);
  };
  for (let step = -9; step <= 9; step++) {
    camera.position.set(step * 14, step * 4, 300);
    camera.lookAt(0, 0, 0);
    render();
    const expected = anchor.clone().multiplyScalar(100).project(camera);
    expect(projected.at(-1)!.x).toBeCloseTo((expected.x + 1) * 400);
    expect(projected.at(-1)!.y).toBeCloseTo((1 - expected.y) * 300);
  }
  expect(projected).toHaveLength(19);
  render();
  expect(projected).toHaveLength(19);
  camera.fov = 35;
  camera.updateProjectionMatrix();
  render();
  expect(projected).toHaveLength(20);
  unbind();
  expect(scene.onBeforeRender).toBe(previous);
  expect(previous).toHaveBeenCalledTimes(21);
});

it("finishes pending label work on still frames without continuously reprojecting a paused globe", () => {
  const scene = new Scene(),
    camera = new PerspectiveCamera();
  let pending = true;
  const refresh = vi.fn();
  const unbind = bindFrameAnnotations(scene, refresh, () => pending);
  const render = () =>
    scene.onBeforeRender(null!, scene, camera, null!, null!, null!);
  render();
  render();
  expect(refresh).toHaveBeenCalledTimes(2);
  pending = false;
  render();
  expect(refresh).toHaveBeenCalledTimes(2);
  unbind();
});
