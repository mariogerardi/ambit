import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Raycaster,
  Sprite,
  Vector3,
} from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { MapOverlays } from "../src/globe/overlays";
import { pathArrowhead, viewPathArrowhead } from "../src/globe/pathAnnotations";
import { playColors } from "../src/theme/playColors";
import type { MapOverlay } from "../src/geography/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function canvasStub() {
  const context = {
    measureText: (text: string) => ({ width: text.length * 18 }),
    strokeText: vi.fn(),
    fillText: vi.fn(),
  };
  vi.stubGlobal("document", {
    createElement: () => ({ width: 0, height: 0, getContext: () => context }),
  });
}
const path: Extract<MapOverlay, { type: "path" }> = {
  id: "submitted-bearing",
  type: "path",
  coordinates: [
    [-12, -8],
    [12, 8],
  ],
  visualState: "incorrect",
  arrowhead: true,
  label: "Your bearing",
};
function cameraAt(z: number) {
  const camera = new PerspectiveCamera(45, 800 / 600, 0.1, 2000);
  camera.position.set(0, 0, z);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

describe("bearing path annotations", () => {
  it("keeps the arrow seven pixels long and attached to the line through zoom, roll and grazing views", () => {
    const arrow = pathArrowhead(
      [
        [179, 10],
        [-179, 10],
      ],
      "#ffffff",
      0.9,
    )!;
    const group = new Group();
    group.scale.setScalar(100);
    group.add(arrow);
    const tip = (arrow.userData.tip as Vector3).clone();
    const radial = tip.clone().normalize();
    const tangent = new Vector3()
      .crossVectors(new Vector3(0, 1, 0), radial)
      .normalize();
    for (const [distance, angle, roll] of [
      [130, 0, false],
      [300, 0, true],
      [600, 0, false],
      [300, 60, false],
    ] as const) {
      const camera = cameraAt(300);
      camera.position
        .copy(radial)
        .multiplyScalar(Math.cos((angle * Math.PI) / 180))
        .addScaledVector(tangent, Math.sin((angle * Math.PI) / 180))
        .multiplyScalar(distance);
      if (roll) camera.up.set(0, -1, 0);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      viewPathArrowhead(arrow, group, camera, 800, 600);
      expect(arrow.visible).toBe(true);
      const project = (p: Vector3) => {
        const v = p.clone().applyMatrix4(group.matrixWorld).project(camera);
        return new Vector3(v.x * 400, v.y * 300, 0);
      };
      const positions = arrow.geometry.getAttribute("position");
      const vertices = Array.from({ length: 3 }, (_, i) =>
        project(new Vector3().fromBufferAttribute(positions, i)),
      );
      expect(vertices[0].distanceTo(project(tip))).toBeLessThan(0.005);
      const base = vertices[1].clone().add(vertices[2]).multiplyScalar(0.5);
      expect(vertices[0].distanceTo(base)).toBeCloseTo(7, 2);
      expect(vertices[1].distanceTo(vertices[2])).toBeCloseTo(5, 2);
      const shaft = project(tip).sub(project(arrow.userData.previous));
      expect(
        vertices[0].clone().sub(base).normalize().dot(shaft.normalize()),
      ).toBeCloseTo(1, 5);
    }
    viewPathArrowhead(arrow, group, cameraAt(300), 800, 600);
    expect(arrow.visible).toBe(false); // The Date Line is on the far side.
    expect(arrow.material.side).toBe(DoubleSide);
    expect(arrow.material.depthTest).toBe(false);
    expect(new Raycaster().intersectObject(arrow, true)).toEqual([]);
    arrow.geometry.dispose();
    arrow.material.dispose();
  });

  it("aligns upright text to the projected line and keeps a readable size as the camera moves", () => {
    canvasStub();
    const overlays = new MapOverlays();
    const layer = {
      id: "labels",
      kind: "map-overlays" as const,
      overlays: [path],
    };
    overlays.update(layer, 100);
    const label = overlays.group.children[0].children.find(
      (child) => child instanceof Sprite,
    ) as Sprite;
    const camera = cameraAt(300);
    overlays.view(camera, 800, 600);
    expect(label.visible).toBe(true);
    expect(label.material.depthTest).toBe(false); // The globe cannot slice through the text quad.
    expect(label.material.rotation).toBeGreaterThan(0.3);
    expect(label.material.rotation).toBeLessThan(Math.PI / 2);
    camera.up.set(0, -1, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    overlays.view(camera, 800, 600);
    expect(Math.abs(label.material.rotation)).toBeLessThan(Math.PI / 2);
    const distant = cameraAt(450);
    overlays.view(distant, 800, 600);
    const anchor = label.getWorldPosition(new Vector3());
    const worldPerPixel =
      ((450 - anchor.z) * 2 * Math.tan((distant.fov * Math.PI) / 360)) / 600;
    expect((label.scale.y * 100) / worldPerPixel).toBeCloseTo(14, 6);
    overlays.view(cameraAt(-300), 800, 600);
    expect(label.visible).toBe(false);
    overlays.dispose();
  });

  it("recolors cached lines, tips and labels together, then disposes every annotation on exit", () => {
    canvasStub();
    const overlays = new MapOverlays();
    const scene = new Group();
    scene.add(overlays.group);
    const layer = {
      id: "labels",
      kind: "map-overlays" as const,
      overlays: [path],
    };
    overlays.update(layer, 100);
    const group = overlays.group.children[0];
    const line = group.children.find(
      (child) => child instanceof LineSegments2,
    ) as LineSegments2;
    const tip = group.children.find(
      (child) => child.name === "path-arrowhead",
    ) as Mesh;
    const label = group.children.find(
      (child) => child instanceof Sprite,
    ) as Sprite;
    const tipDispose = vi.spyOn(tip.geometry, "dispose"),
      textureDispose = vi.spyOn(label.material.map!, "dispose");
    const labelDispose = vi.spyOn(label.material, "dispose");
    overlays.setPalette("paper");
    for (const material of [
      line.material,
      tip.material as MeshBasicMaterial,
      label.material,
    ])
      expect(material.color.getHexString()).toBe(
        playColors("paper").incorrect.slice(1),
      );
    overlays.update(
      {
        ...layer,
        palette: "paper",
        overlays: [{ ...path, visualState: "correct" }],
      },
      100,
    );
    expect(overlays.group.children[0]).toBe(group);
    overlays.setPalette("dusk");
    expect(label.material.color.getHexString()).toBe(
      playColors("dusk").correct.slice(1),
    );
    expect(new Raycaster().intersectObject(overlays.group, true)).toEqual([]);
    overlays.update({ ...layer, overlays: [] }, 100);
    expect(group.parent).toBeNull();
    expect(tipDispose).toHaveBeenCalledOnce();
    expect(textureDispose).toHaveBeenCalledOnce();
    expect(labelDispose).toHaveBeenCalledOnce();
    overlays.dispose();
    expect(textureDispose).toHaveBeenCalledOnce();
  });
});
