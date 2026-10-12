import { useEffect, useMemo, useState } from "react";
import type { RegionFeature } from "../geography/types";
import { COUNTRY_FACTS } from "../game/countryFacts";
import { loadJourney } from "../game/journeyRegistry";
import { createQuestionContext } from "../game/questionPreparation";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { AppMode } from "./modes";
import type { PublishedPuzzle } from "./publishedPuzzles";

type GameRuntime = typeof import("../game/runtime");
interface ContextCache {
  journeys: WeakMap<Journey, QuestionContext>;
  base?: QuestionContext;
}
const emptyJourney: Journey = {
  id: "",
  title: "",
  description: "",
  rounds: [],
};
function prepareContext(
  journey: Journey,
  regions: RegionFeature[],
  cache: ContextCache,
) {
  let context = cache.journeys.get(journey);
  if (!context) {
    context = createQuestionContext(
      regions,
      COUNTRY_FACTS,
      journey,
      cache.base,
    );
    cache.journeys.set(journey, context);
    cache.base ??= context;
  }
  return context;
}

/** Deferred content and canonical contexts; navigation still chooses the Journey. */
export function useJourneyContent({
  mode,
  journeyId,
  warmJourneyId,
  ready,
  regions,
  published,
  retry,
}: {
  mode: AppMode;
  journeyId?: string;
  warmJourneyId: string;
  ready: boolean;
  regions: RegionFeature[];
  published: PublishedPuzzle[];
  retry: number;
}) {
  const [loaded, setLoaded] = useState<{
    journey: Journey;
    runtime: GameRuntime;
  }>();
  const [journeyError, setJourneyError] = useState("");
  const wantsJourney = mode === "daily" || mode === "practice";
  const journey =
    loaded && loaded.journey.id === journeyId ? loaded.journey : emptyJourney;
  const isJourney = wantsJourney && journey !== emptyJourney;
  useEffect(() => {
    if (!wantsJourney || !journeyId) return;
    let live = true;
    setJourneyError("");
    const local = published.find((pack) => pack.id === journeyId)?.journey;
    const content = local ? Promise.resolve(local) : loadJourney(journeyId);
    void Promise.all([content, import("../game/runtime")])
      .then(([journey, runtime]) => {
        if (live) setLoaded({ journey, runtime });
      })
      .catch(() => {
        if (live) setJourneyError("The Journey could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, [wantsJourney, journeyId, mode, published, retry]);
  // A replaced world invalidates every derived answer context and shared graph.
  const contexts = useMemo<ContextCache>(
    () => ({ journeys: new WeakMap() }),
    [regions],
  );
  const contextResult = useMemo<{
    context?: QuestionContext;
    error?: string;
  }>(() => {
    if (!regions.length || !isJourney) return {};
    try {
      return { context: prepareContext(journey, regions, contexts) };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "The world could not be prepared.",
      };
    }
  }, [regions, isJourney, journey, contexts]);
  useEffect(() => {
    if (mode !== "home" || !ready || !regions.length) return;
    let live = true;
    // Prepare only Home's offered Journey at idle, without starting an attempt.
    const warm = () => {
      const local = published.find(
        (pack) => pack.id === warmJourneyId,
      )?.journey;
      void Promise.all([
        local ? Promise.resolve(local) : loadJourney(warmJourneyId),
        import("../game/runtime"),
        import("../game/GameShell"),
      ])
        .then(([journey, runtime]) => {
          if (!live) return;
          prepareContext(journey, regions, contexts);
          setLoaded({ journey, runtime });
        })
        .catch(() => {}); // Navigation retains the normal retry/error UI.
    };
    const idle = window.requestIdleCallback?.(warm, { timeout: 1500 });
    const timer = idle === undefined ? window.setTimeout(warm, 200) : undefined;
    return () => {
      live = false;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [mode, ready, regions, contexts, warmJourneyId, published]);
  const warmRegions = useMemo(
    () =>
      loaded
        ? [
            ...new Map(
              loaded.journey.rounds
                .flatMap((question) => question.importedRegions ?? [])
                .map((region) => [region.id, region]),
            ).values(),
          ]
        : undefined,
    [loaded?.journey],
  );
  return {
    loaded,
    journey,
    isJourney,
    wantsJourney,
    context: contextResult.context,
    contextError: contextResult.error,
    journeyError,
    warmRegions,
  };
}
