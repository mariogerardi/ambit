import { describe, expect, it, vi } from "vitest";
import { geoDistance } from "d3-geo";
import { Mesh, MeshBasicMaterial, Raycaster } from "three";
import { bearingSectorGeometry } from "../src/globe/bearingSector";
import { MapOverlays } from "../src/globe/overlays";
import { initialBearing, angularError } from "../src/game/geodesic";
import { playColors } from "../src/theme/playColors";
import type { MapOverlay } from "../src/geography/types";

const sector: Extract<MapOverlay, { type: "bearing-sector" }> = {
  id: "assist",
  type: "bearing-sector",
  center: { lat: 35.91869, lng: 74.31245 },
  bearing: 20,
  halfWidthDegrees: 15,
  radiusKm: 1200,
};

describe("geographic bearing-sector assist", () => {
  it("samples the spherical swath at its authored reach, including wrapped headings and the antimeridian", () => {
    for (const settings of [
      sector,
      { ...sector, center: { lat: 75, lng: 179 }, bearing: 354 },
    ]) {
      const geometry = bearingSectorGeometry(settings),
        positions = geometry.getAttribute("position");
      let farthest = 0;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i),
          y = positions.getY(i),
          z = positions.getZ(i),
          r = Math.hypot(x, y, z);
        expect(r).toBeCloseTo(1.004, 6);
        const p = {
          lat: (Math.asin(y / r) * 180) / Math.PI,
          lng: (Math.atan2(x, z) * 180) / Math.PI,
        };
        const distance =
          geoDistance(
            [settings.center.lng, settings.center.lat],
            [p.lng, p.lat],
          ) * 6371.0088;
        farthest = Math.max(farthest, distance);
        if (distance > 1)
          expect(
            angularError(initialBearing(settings.center, p), settings.bearing),
          ).toBeLessThanOrEqual(settings.halfWidthDegrees + 0.001);
      }
      expect(farthest).toBeCloseTo(settings.radiusKm, 2);
      const index = geometry.index!;
      // No triangle's chord can cut back through the unit-radius globe.
      for (let i = 0; i < index.count; i += 3) {
        const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        const centroid = ["X", "Y", "Z"].map(
          (axis) =>
            ids.reduce(
              (sum, id) => sum + positions[`get${axis}` as "getX"](id),
              0,
            ) / 3,
        );
        expect(Math.hypot(...centroid)).toBeGreaterThan(1);
      }
      geometry.dispose();
    }
  });
  it("uses reference colors, does not intercept pins, reuses geometry and disposes on advance", () => {
    const overlays = new MapOverlays();
    overlays.update(
      { id: "map", kind: "map-overlays", overlays: [sector] },
      100,
    );
    const group = overlays.group.children[0],
      mesh = group.children[0] as Mesh;
    expect(group.children).toHaveLength(1); // Filled swath only: no centerline.
    expect((mesh.material as MeshBasicMaterial).color.getHexString()).toBe(
      playColors().hinted.slice(1),
    );
    expect(new Raycaster().intersectObject(group, true)).toEqual([]);
    overlays.update(
      { id: "map", kind: "map-overlays", overlays: [{ ...sector }] },
      100,
    );
    expect(overlays.group.children[0]).toBe(group);
    overlays.setPalette("paper");
    expect((mesh.material as MeshBasicMaterial).color.getHexString()).toBe(
      playColors("paper").hinted.slice(1),
    );
    const dispose = vi.spyOn(mesh.geometry, "dispose");
    overlays.update({ id: "map", kind: "map-overlays", overlays: [] }, 100);
    expect(dispose).toHaveBeenCalledOnce();
    expect(overlays.group.children).toHaveLength(0);
    overlays.dispose();
  });
});
