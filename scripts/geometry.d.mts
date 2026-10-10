import type { Polygon, MultiPolygon } from "geojson";
export function sphericalGeometry(
  geometry: Polygon | MultiPolygon,
): MultiPolygon;
export function center(geometry: Polygon | MultiPolygon): [number, number];
export function contains(
  geometry: Polygon | MultiPolygon,
  point: [number, number],
): boolean;
export function validateGeometry(geometry: Polygon | MultiPolygon): number;
