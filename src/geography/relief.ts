import type { PhysicalFeature } from "./types";

/** Clear complete mountain symbols around an authored focal feature. */
export function withReliefClearance(
  feature: PhysicalFeature,
  focalId: string,
): PhysicalFeature {
  const relief = feature.relief;
  const clearance = relief?.clearances?.[focalId];
  if (!relief || !clearance) return feature;
  const cleared = { ...relief };
  for (const key of [
    "ridges",
    "hachures",
    "highlights",
    "lightFaces",
    "darkFaces",
  ] as const) {
    const excluded = new Set(clearance[key] ?? []);
    const paths = relief[key];
    if (paths) cleared[key] = paths.filter((_, index) => !excluded.has(index));
  }
  return { ...feature, relief: cleared };
}
