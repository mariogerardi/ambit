import { BufferGeometry, Float32BufferAttribute } from "three";
import { pointAlongBearing } from "../game/geodesic";
import { EARTH_KM } from "../game/spatial";
import type { MapOverlay } from "../geography/types";

/** A sampled spherical surface, without a centerline or answer-dependent endpoint. */
export function bearingSectorGeometry(
  sector: Extract<MapOverlay, { type: "bearing-sector" }>,
) {
  const steps = Math.max(
    1,
    Math.ceil(sector.radiusKm / EARTH_KM / (Math.PI / 360)),
  );
  const columns = Math.max(2, Math.ceil(sector.halfWidthDegrees * 2));
  const vertices: number[] = [],
    indices: number[] = [];
  for (let row = 0; row <= steps; row++) {
    for (let column = 0; column <= columns; column++) {
      const point = pointAlongBearing(
        sector.center,
        sector.bearing -
          sector.halfWidthDegrees +
          (2 * sector.halfWidthDegrees * column) / columns,
        ((sector.radiusKm / EARTH_KM) * row) / steps,
      );
      const lat = (point.lat * Math.PI) / 180,
        lng = (point.lng * Math.PI) / 180;
      vertices.push(
        1.004 * Math.cos(lat) * Math.sin(lng),
        1.004 * Math.sin(lat),
        1.004 * Math.cos(lat) * Math.cos(lng),
      );
      if (row && column) {
        const i = row * (columns + 1) + column;
        indices.push(i, i - 1, i - columns - 1);
        if (row > 1) indices.push(i - 1, i - columns - 2, i - columns - 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  return geometry;
}
