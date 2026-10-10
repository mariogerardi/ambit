import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { LayerLoader } from "../src/geography/loadLayer";
import type { BoundaryLayerManifest, LoadEvent } from "../src/geography/types";
const manifest = JSON.parse(
  readFileSync("public/geography/manifest.json", "utf8"),
) as BoundaryLayerManifest[];
const responses = new Map(
  manifest.map((m) => [
    m.assetUrl,
    readFileSync(`public${m.assetUrl}`, "utf8"),
  ]),
);
const response = (url: string) =>
  new Response(responses.get(url)!, { status: 200 });
describe("on-demand loading, cache and navigation cancellation", () => {
  it("calls the default browser fetch with its global receiver", async () => {
    const browserFetch = vi.fn(function (
      this: unknown,
      url: RequestInfo | URL,
    ) {
      if (this !== globalThis)
        throw new TypeError(
          "Failed to execute 'fetch' on 'Window': Illegal invocation",
        );
      return Promise.resolve(response(String(url)));
    });
    vi.stubGlobal("fetch", browserFetch);
    try {
      const loader = new LayerLoader(manifest);
      expect(await loader.loadBoundaryLayer("WORLD/ADM0")).toHaveLength(242);
      expect(browserFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("downloads only the initial world layer and caches subsequent navigation", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
        response(String(url)),
      ),
      events: LoadEvent[] = [];
    const loader = new LayerLoader(manifest, (e) => events.push(e), fetcher);
    const initial = await loader.loadBoundaryLayer("WORLD/ADM0");
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      "/geography/world.v1.json",
    ]);
    expect(loader.peek("USA/ADM1")).toBeUndefined();
    expect(loader.peek("USA-NY/ADM2")).toBeUndefined();
    await loader.loadBoundaryLayer("USA/ADM1");
    await loader.loadBoundaryLayer("USA-NY/ADM2");
    expect(await loader.loadBoundaryLayer("WORLD/ADM0")).toBe(initial);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(events.at(-1)?.status).toBe("cached");
  });
  it("aborts a stale request when the next navigation starts", async () => {
    let firstSignal: AbortSignal | undefined;
    const fetcher = vi.fn((url: RequestInfo | URL, opts?: RequestInit) => {
      if (String(url).includes("world"))
        return new Promise<Response>((_, reject) => {
          firstSignal = opts?.signal ?? undefined;
          firstSignal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      return Promise.resolve(response(String(url)));
    });
    const loader = new LayerLoader(manifest, () => {}, fetcher),
      first = loader.loadBoundaryLayer("WORLD/ADM0");
    const rejection = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    const current = await loader.loadBoundaryLayer("USA/ADM1");
    await rejection;
    expect(firstSignal?.aborted).toBe(true);
    expect(current).toHaveLength(56);
    expect(loader.peek("WORLD/ADM0")).toBeUndefined();
  });
  it("rejects stale results even when the transport ignores abort", async () => {
    let resolveFirst!: (r: Response) => void;
    const fetcher = vi.fn((url: RequestInfo | URL) =>
      String(url).includes("world")
        ? new Promise<Response>((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(response(String(url))),
    );
    const loader = new LayerLoader(manifest, () => {}, fetcher),
      first = loader.loadBoundaryLayer("WORLD/ADM0");
    const rejection = expect(first).rejects.toMatchObject({
      name: "AbortError",
    });
    await loader.loadBoundaryLayer("USA/ADM1");
    resolveFirst(response("/geography/world.v1.json"));
    await rejection;
    expect(loader.peek("WORLD/ADM0")).toBeUndefined();
  });
  it("reports missing ADM3–ADM5 without fetching or discarding cached geography", async () => {
    const fetcher = vi.fn(async (url: RequestInfo | URL) =>
        response(String(url)),
      ),
      loader = new LayerLoader(manifest, () => {}, fetcher);
    const original = await loader.loadBoundaryLayer("WORLD/ADM0");
    for (const level of ["ADM3", "ADM4", "ADM5"])
      await expect(
        loader.loadBoundaryLayer(`USA-NY/${level}`),
      ).rejects.toMatchObject({ name: "LayerUnavailableError" });
    expect(loader.peek("WORLD/ADM0")).toBe(original);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retries failures and never caches corrupt or mismatched layers", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(response("/geography/usa-adm1.v1.json"))
      .mockResolvedValueOnce(response("/geography/world.v1.json"));
    const loader = new LayerLoader(manifest, () => {}, fetcher);
    await expect(loader.loadBoundaryLayer("WORLD/ADM0")).rejects.toThrow("503");
    await expect(loader.loadBoundaryLayer("WORLD/ADM0")).rejects.toThrow(
      "hierarchy mismatch",
    );
    expect(loader.peek("WORLD/ADM0")).toBeUndefined();
    expect(await loader.loadBoundaryLayer("WORLD/ADM0")).toHaveLength(242);
  });
});
