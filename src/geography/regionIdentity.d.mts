import type { Polygon, MultiPolygon } from "geojson";
export function geometryFingerprint(geometry: Polygon | MultiPolygon): string;
