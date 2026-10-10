import type {
  RegionFeature,
  PlaceFeature,
  BoundaryLayerManifest,
} from "./types";
export class GeographyCatalog {
  readonly regions = new Map<string, RegionFeature>();
  readonly places = new Map<string, PlaceFeature>();
  register(regions: RegionFeature[]) {
    for (const feature of regions) this.regions.set(feature.id, feature);
  }
  hierarchy(id: string): RegionFeature[] {
    const path: RegionFeature[] = [],
      seen = new Set<string>();
    let feature = this.regions.get(id);
    while (feature && !seen.has(feature.id)) {
      path.unshift(feature);
      seen.add(feature.id);
      feature = feature.parentId
        ? this.regions.get(feature.parentId)
        : undefined;
    }
    return path;
  }
}
export function childLayer(id: string, manifest: BoundaryLayerManifest[]) {
  return manifest.find((layer) => layer.parentId === id);
}
export function parentLayer(
  key: string,
  manifest: BoundaryLayerManifest[],
  catalog: GeographyCatalog,
) {
  const layer = manifest.find((l) => l.key === key);
  const parent = layer?.parentId
    ? catalog.regions.get(layer.parentId)
    : undefined;
  return (
    manifest.find(
      (l) => l.level === parent?.level && l.parentId === parent?.parentId,
    )?.key ?? "WORLD/ADM0"
  );
}
