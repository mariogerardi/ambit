import type { BoundaryLayerManifest, RegionFeature, LoadEvent } from "./types";
export function validateRegions(input: unknown): RegionFeature[] {
  if (!Array.isArray(input)) throw Error("Boundary asset must be an array");
  const ids = new Set<string>();
  for (const feature of input) {
    if (
      !feature ||
      typeof feature.id !== "string" ||
      !feature.id.startsWith("wurl:") ||
      ids.has(feature.id) ||
      typeof feature.name !== "string" ||
      !/^ADM[0-5]$/.test(feature.level) ||
      !["Polygon", "MultiPolygon"].includes(feature.geometry?.type) ||
      !Array.isArray(feature.geometry.coordinates) ||
      (feature.displayGeometry != null &&
        (!["Polygon", "MultiPolygon"].includes(feature.displayGeometry.type) ||
          !Array.isArray(feature.displayGeometry.coordinates))) ||
      (feature.displayPartition != null &&
        (typeof feature.displayPartition.id !== "string" ||
          !Number.isInteger(feature.displayPartition.members) ||
          feature.displayPartition.members < 1)) ||
      !Number.isFinite(feature.focus?.lat) ||
      !Number.isFinite(feature.focus?.lng)
    )
      throw Error("Invalid boundary asset or duplicate canonical ID");
    ids.add(feature.id);
  }
  return input as RegionFeature[];
}
export class LayerUnavailableError extends Error {
  constructor(key: string) {
    super(
      `No boundary layer is available for ${key}. The current globe remains usable.`,
    );
    this.name = "LayerUnavailableError";
  }
}
export class LayerLoader {
  private readonly cache = new Map<string, RegionFeature[]>();
  private controller?: AbortController;
  private generation = 0;
  constructor(
    readonly manifest: BoundaryLayerManifest[],
    private onEvent: (event: LoadEvent) => void = () => {},
    // Native browser fetch must receive Window, not this LayerLoader instance.
    private fetcher: typeof fetch = (input, init) =>
      globalThis.fetch(input, init),
  ) {}
  peek(key: string) {
    return this.cache.get(key);
  }
  cancel() {
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
  }
  async loadBoundaryLayer(key: string): Promise<RegionFeature[]> {
    this.cancel();
    const version = this.generation;
    const layer = this.manifest.find((l) => l.key === key);
    if (!layer) throw new LayerUnavailableError(key);
    const cached = this.cache.get(key);
    if (cached) {
      this.onEvent({ key, status: "cached" });
      return cached;
    }
    const controller = new AbortController();
    this.controller = controller;
    const start = performance.now();
    this.onEvent({ key, status: "loading" });
    try {
      const response = await this.fetcher(layer.assetUrl, {
        signal: controller.signal,
      });
      if (!response.ok)
        throw Error(`Could not load ${key} (HTTP ${response.status})`);
      const text = await response.text();
      if (controller.signal.aborted || version !== this.generation)
        throw new DOMException("Superseded layer request", "AbortError");
      const features = validateRegions(JSON.parse(text));
      if (
        features.some(
          (f) => f.level !== layer.level || f.parentId !== layer.parentId,
        )
      )
        throw Error(`Layer hierarchy mismatch: ${key}`);
      this.cache.set(key, features);
      this.onEvent({
        key,
        status: "loaded",
        bytes: new TextEncoder().encode(text).byteLength,
        durationMs: performance.now() - start,
      });
      return features;
    } catch (error) {
      this.onEvent({
        key,
        status: controller.signal.aborted ? "aborted" : "failed",
      });
      throw error;
    } finally {
      if (this.controller === controller) this.controller = undefined;
    }
  }
}
