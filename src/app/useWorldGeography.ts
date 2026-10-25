import { useCallback, useEffect, useMemo, useState } from "react";
import { LayerLoader } from "../geography/loadLayer";
import type { BoundaryLayerManifest, RegionFeature } from "../geography/types";
import {
  PHYSICAL_REVISION,
  validatePhysicalSnapshot,
} from "../geography/physical";
import type { PhysicalSnapshot } from "../geography/physical";
import { reportFailure } from "../services/monitoring";
import type { AppMode } from "./modes";
import type { GlobeLayers } from "./worldPreferences";

type RegionalRuntime = typeof import("../geography/regions");

/** Own geographic requests and cancellation; selection/framing stay in the shell. */
export function useWorldGeography({
  mode,
  retry,
  breakdown,
  layers,
}: {
  mode: AppMode;
  retry: number;
  breakdown?: string;
  layers?: GlobeLayers;
}) {
  const [regions, setRegions] = useState<RegionFeature[]>([]);
  const [error, setError] = useState("");
  const [boundaryLoader, setBoundaryLoader] = useState<LayerLoader>();
  const [regional, setRegional] = useState<RegionalRuntime>();
  const [branches, setBranches] = useState<RegionFeature[][]>([]);
  const [regionalStatus, setRegionalStatus] = useState("");
  const [physicalData, setPhysicalData] = useState<PhysicalSnapshot>();
  const [physicalError, setPhysicalError] = useState("");
  const clearBranches = useCallback(() => setBranches([]), []);
  useEffect(() => {
    if (error) reportFailure("geography loading");
  }, [error]);
  useEffect(() => {
    const controller = new AbortController();
    let loader: LayerLoader | undefined;
    setError("");
    void (async () => {
      try {
        const worldUrl = "/geography/world.v1.json";
        const [response, worldResponse] = await Promise.all([
          fetch("/geography/manifest.json", { signal: controller.signal }),
          fetch(worldUrl, { signal: controller.signal }),
        ]);
        if (!response.ok) throw Error("Couldn’t load the world. Try again.");
        loader = new LayerLoader(
          (await response.json()) as BoundaryLayerManifest[],
          undefined,
          (input, init) =>
            input === worldUrl
              ? Promise.resolve(worldResponse)
              : fetch(input, init),
        );
        const world = await loader.loadBoundaryLayer("WORLD/ADM0");
        if (!controller.signal.aborted) {
          setRegions(world);
          setBoundaryLoader(loader);
        }
      } catch {
        if (!controller.signal.aborted)
          setError(
            "Couldn’t load the world. Check your connection and try again.",
          );
      }
    })();
    return () => {
      controller.abort();
      loader?.cancel();
    };
  }, [retry]);
  useEffect(() => {
    if (mode !== "explore") return;
    let live = true;
    void import("../geography/regions")
      .then((module) => {
        if (live) setRegional(module);
      })
      .catch(() => {
        if (live)
          setRegionalStatus(
            "Couldn’t load regional boundaries. Try reloading the page.",
          );
      });
    return () => {
      live = false;
    };
  }, [mode, retry]);
  useEffect(() => {
    if (!breakdown) {
      setBranches([]);
      setRegionalStatus("");
      return;
    }
    if (mode !== "explore" || !boundaryLoader || !regional) return;
    let live = true;
    setRegionalStatus("Loading regional boundaries…");
    void (async () => {
      const loaded: RegionFeature[][] = [];
      for (const layer of regional.regionalChain(breakdown)) {
        const rows = await boundaryLoader.loadBoundaryLayer(layer.key);
        if (!live) return;
        loaded.push(regional.catalogRegions(rows));
      }
      if (live) {
        setBranches(loaded);
        setRegionalStatus("");
      }
    })().catch((error) => {
      if (live && error.name !== "AbortError") {
        setBranches([]);
        setRegionalStatus(
          "Couldn’t load regional boundaries. Turn the layer off and on to try again.",
        );
      }
    });
    return () => {
      live = false;
      boundaryLoader.cancel();
    };
  }, [breakdown, boundaryLoader, mode, regional]);
  useEffect(() => {
    if (
      !layers ||
      physicalData?.revision === PHYSICAL_REVISION ||
      !(layers.rivers || layers.mountains || layers.landforms || layers.oceans)
    )
      return;
    const controller = new AbortController();
    void fetch(`/geography/physical.v1.json?v=${PHYSICAL_REVISION}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw Error(
            "Couldn’t load geographic layers. Turn the layer off and on to try again.",
          );
        const data = validatePhysicalSnapshot(await response.json());
        if (!controller.signal.aborted) {
          setPhysicalData(data);
          setPhysicalError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setPhysicalError(
            "Couldn’t load map details. Try reloading the page.",
          );
      });
    return () => controller.abort();
  }, [layers, physicalData]);
  const physicalFeatures = useMemo(
    () =>
      layers
        ? (physicalData?.revision === PHYSICAL_REVISION
            ? physicalData.features
            : []
          ).filter((feature) =>
            feature.kind === "river"
              ? layers.rivers
              : feature.kind === "mountain"
                ? layers.mountains
                : feature.kind === "landform"
                  ? layers.landforms
                  : layers.oceans,
          )
        : undefined,
    [layers, physicalData],
  );
  return {
    regions,
    error,
    regional,
    branches,
    clearBranches,
    regionalStatus,
    physicalFeatures,
    physicalError,
  };
}
