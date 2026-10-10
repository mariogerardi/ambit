import metadata from "./data/physical-metadata.v1.json";
import type { PhysicalFeature } from "./types";
export const PHYSICAL_REVISION = metadata.revision;
export interface PhysicalSnapshot {
  version: 1;
  revision: string;
  features: PhysicalFeature[];
}
export function validatePhysicalSnapshot(value: unknown): PhysicalSnapshot {
  const data = value as PhysicalSnapshot;
  if (
    !data ||
    data.version !== 1 ||
    data.revision !== PHYSICAL_REVISION ||
    !Array.isArray(data.features)
  )
    throw Error("Geographic layer version mismatch. Reload to update.");
  const ids = new Set<string>();
  for (const f of data.features) {
    if (
      !f ||
      typeof f.id !== "string" ||
      ids.has(f.id) ||
      typeof f.name !== "string" ||
      !["river", "mountain", "landform", "ocean"].includes(f.kind) ||
      !Number.isFinite(f.lat) ||
      Math.abs(f.lat) > 90 ||
      !Number.isFinite(f.lng) ||
      Math.abs(f.lng) > 180 ||
      !Number.isFinite(f.rank)
    )
      throw Error("Geographic layer contains invalid or duplicate labels.");
    ids.add(f.id);
    if (
      f.labelAnchors?.some(
        (p) =>
          p.length !== 2 ||
          !Number.isFinite(p[0]) ||
          !Number.isFinite(p[1]) ||
          Math.abs(p[0]) > 180 ||
          Math.abs(p[1]) > 90,
      )
    )
      throw Error("Geographic layer contains invalid label anchors.");
  }
  return data;
}
