import { geoDistance } from "d3-geo";
import type { Focus, RegionFeature } from "../geography/types";
import { studyPool } from "./engine";
import type { StudySettings } from "./engine";

const centers: Record<string, Focus> = {
  AF: { lat: 3, lng: 20 },
  AS: { lat: 35, lng: 90 },
  EU: { lat: 50, lng: 20 },
  NA: { lat: 30, lng: -95 },
  SA: { lat: -15, lng: -60 },
  OC: { lat: -25, lng: 140 },
};

/** Fit the eligible land around a stable area center, including dateline groups. */
export function studyScopeFocus(
  settings: StudySettings,
  regions: RegionFeature[],
  worldAltitude: number,
): Focus | undefined {
  if (settings.scope === "all") return undefined;
  const ids = new Set(studyPool(settings));
  const eligible = regions.filter((r) => ids.has(r.id));
  if (!eligible.length) return undefined;
  const radians = Math.PI / 180;
  const sum = eligible.reduce(
    (v, r) => {
      const lat = r.focus.lat * radians,
        lng = r.focus.lng * radians;
      return [
        v[0] + Math.cos(lat) * Math.cos(lng),
        v[1] + Math.cos(lat) * Math.sin(lng),
        v[2] + Math.sin(lat),
      ];
    },
    [0, 0, 0],
  );
  const center =
    settings.scope === "continent"
      ? centers[settings.continent]
      : {
          lat: Math.atan2(sum[2], Math.hypot(sum[0], sum[1])) / radians,
          lng: Math.atan2(sum[1], sum[0]) / radians,
        };
  let radius = 0;
  for (const region of eligible) {
    const polygons =
      region.geometry.type === "Polygon"
        ? [region.geometry.coordinates]
        : region.geometry.coordinates;
    for (const polygon of polygons)
      for (const ring of polygon)
        for (const point of ring)
          radius = Math.max(
            radius,
            geoDistance([center.lng, center.lat], [point[0], point[1]]),
          );
  }
  const angle = Math.min(Math.PI / 2, radius + 5 * radians);
  const altitude =
    radius > Math.PI / 2
      ? worldAltitude
      : Math.min(
          worldAltitude,
          Math.max(
            0.65,
            Math.cos(angle) + Math.sin(angle) / Math.tan(25 * radians) - 1,
          ),
        );
  return { ...center, altitude };
}
