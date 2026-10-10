import type { Polygon, MultiPolygon } from "geojson";
export function sphericalGeometry(
  geometry: Polygon | MultiPolygon,
): MultiPolygon;
