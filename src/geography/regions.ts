import { geometryFingerprint } from "./regionIdentity.mjs";
import index from "./data/regions.v1.json";
import type { RegionFeature } from "./types";
export const REGIONAL_INDEX = index.regions;
/** Natural Earth labels US states generically; expose their actual kinds to queries. */
export function subdivisionKind(
  region: Pick<RegionFeature, "id" | "parentId" | "localType">,
): string | undefined {
  if (region.parentId === "wurl:USA")
    return region.id === "wurl:USA-DC" ? "federal district" : "state";
  return region.localType;
}
/** Format source type labels for display without changing catalog classifications. */
export function subdivisionTypeLabel(
  region: Pick<RegionFeature, "id" | "parentId" | "localType" | "level">,
): string {
  const kind = subdivisionKind(region);
  if (!kind) return region.level;
  return kind
    .split("|")
    .map((part) => {
      const label = part.trim().replace(/governarate/gi, "governorate");
      return label.charAt(0).toUpperCase() + label.slice(1);
    })
    .join(" / ");
}
export const REGIONAL_LAYERS = [
  { parentId: "wurl:USA", key: "USA/ADM1", label: "States & Washington, D.C." },
  { parentId: "wurl:CAN", key: "CAN/ADM1", label: "Provinces & territories" },
  { parentId: "wurl:MEX", key: "MEX/ADM1", label: "States & Mexico City" },
  { parentId: "wurl:AUS", key: "AUS/ADM1", label: "States & territories" },
  { parentId: "wurl:USA-NY", key: "USA-NY/ADM2", label: "Counties" },
  ...[
    ...new Set(
      REGIONAL_INDEX.filter(
        (r) =>
          r.level === "ADM1" &&
          // Natural Earth's Antarctica ADM1 rows are continent/placeholder
          // records, not a regional breakdown. Their polar tessellation is
          // expensive and adds no useful selectable subdivisions.
          ![
            "wurl:USA",
            "wurl:CAN",
            "wurl:MEX",
            "wurl:AUS",
            "wurl:ATA",
          ].includes(r.parentId),
      ).map((r) => r.parentId),
    ),
  ].map((parentId) => ({
    parentId,
    key: `${parentId.slice(5)}/ADM1`,
    label: "Regional subdivisions",
  })),
];
export function regionalRoot(id: string): string {
  const parent = REGIONAL_INDEX.find((r) => r.id === id)?.parentId;
  return parent ? regionalRoot(parent) : id;
}
export function regionalChain(parent: string): typeof REGIONAL_LAYERS {
  const ancestor = REGIONAL_INDEX.find((r) => r.id === parent)?.parentId;
  return [
    ...(ancestor ? regionalChain(ancestor) : []),
    ...REGIONAL_LAYERS.filter((l) => l.parentId === parent),
  ];
}
export function catalogRegions(regions: RegionFeature[]) {
  const allowed = new Set(REGIONAL_INDEX.map((r) => r.id));
  return regions.filter((r) => allowed.has(r.id));
}
const bases = new WeakMap<RegionFeature, Map<boolean, RegionFeature>>();
/** Retain parent land coverage beneath branches without changing canonical identities. */
export function exploreBoundaries(
  world: RegionFeature[],
  layers: RegionFeature[][],
) {
  let result = world;
  for (const layer of layers) {
    // If this map scale cannot represent any child footprint, keep the normal
    // interactive country rather than creating an unclickable backing shape.
    if (!layer.length || layer.every((r) => r.displayGeometry === null))
      continue;
    const partition = layer[0].displayPartition;
    const covered =
      !!partition &&
      partition.members > 0 &&
      layer.filter((r) => r.displayGeometry).length === partition.members &&
      layer.every((r) => r.displayPartition?.id === partition.id);
    result = [
      ...result.map((r) => {
        if (r.id !== layer[0].parentId) return r;
        let variants = bases.get(r);
        if (!variants) bases.set(r, (variants = new Map()));
        let base = variants.get(covered);
        if (!base) {
          base = { ...r, displayBase: true, displayCovered: covered };
          variants.set(covered, base);
        }
        return base;
      }),
      ...layer,
    ];
  }
  return result;
}

export function isCanonicalRegion(region: RegionFeature): boolean {
  const indexed = REGIONAL_INDEX.find((r) => r.id === region.id);
  return (
    !!indexed &&
    indexed.parentId === region.parentId &&
    indexed.level === region.level &&
    indexed.sourceId === region.sourceId &&
    indexed.geometryFingerprint === geometryFingerprint(region.geometry)
  );
}
