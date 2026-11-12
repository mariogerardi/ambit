import {
  outOfPlacePairs,
  outOfPlaceDeck,
  outOfPlaceJourney,
  type OutOfPlacePair,
} from "./outOfPlace";
import {
  sayWherePairs,
  sayWhereDeck,
  sayWhereJourney,
  sayWhereRoundCount,
} from "./sayWhere";
import type { SayWherePair } from "./sayWhere";
import { regionalPinpointPoints } from "./pinpointSearch";
import { minigameBase } from "./minigameContext";
import { minigameWorld } from "./minigameWorld";
import { useRevealSequence } from "./useRevealSequence";
import { geoDistance } from "d3-geo";
import { useEffect, useMemo, useState } from "react";
import type { Focus, RegionFeature } from "../geography/types";
import { createQuestionContext } from "../game/questionPreparation";
import { createNeighborSave } from "./sharedNeighborsSave";
import {
  sharedNeighborPairs,
  poolSignature,
  neighborDeck,
  startNeighborRun,
  neighborJourney,
  neighborGame,
  neighborReducer,
  neighborRunEnded,
} from "./sharedNeighbors";
import {
  missingBorderPairs,
  missingBorderJourney,
  missingBorderFocus,
  inMissingBorderSearch,
} from "./missingBorders";
import {
  borderRunPairs,
  borderRunJourney,
  landTopology,
  pinpointPairs,
  pinpointDeck,
  pinpointJourney,
  pinpointPoints,
} from "./extraGames";
import type { RoutePair, PinpointPair } from "./extraGames";
import { MINIGAME_TITLES } from "./sharedNeighbors";
import { solutionIds } from "../game/questionPreparation";
import { minigameCompletion } from "./minigameRecap";
import { createMinigameScores } from "./minigameScores";
import type { MissingBorderPair } from "./missingBorders";
import type { BorderMinigame, NeighborAction } from "./sharedNeighbors";
import { createMinigameSettingsSave } from "./minigameSettingsSave";
import {
  defaultMinigameSettings,
  filterMinigamePairs,
  mainlandBorderGraph,
  sameMinigameSettings,
  usesDefaultMinigameRules,
  smallCountryIds,
} from "./minigameSettings";

export function useBorderMinigame(
  regions: RegionFeature[],
  subject: string | undefined,
  kind: BorderMinigame,
  readView?: () => Focus | undefined,
  active = true,
) {
  const [entryFocus, setEntryFocus] = useState<Focus>();
  const [store] = useState(() => createNeighborSave(subject, kind));
  const [run, setRun] = useState(() => store.load().run);
  const [saved, setSaved] = useState(store.writable);
  const [settingsStore] = useState(() =>
    createMinigameSettingsSave(subject, kind),
  );
  const [settings, setSettings] = useState(() => settingsStore.load());
  const [settingsSaved, setSettingsSaved] = useState(settingsStore.writable);
  const runSettings = useMemo(
    () =>
      run
        ? {
            ...defaultMinigameSettings,
            ...run.settings,
            excludeSmallCountries: run.settings?.excludeSmallCountries ?? false,
          }
        : defaultMinigameSettings,
    [run?.settings, !!run],
  );
  const [scoresStore] = useState(() => createMinigameScores(subject, kind));
  const [scores, setScores] = useState(() => scoresStore.load());
  const scoreKey =
    kind === "say-where" || kind === "out-of-place"
      ? `best:${kind}:v1`
      : `best:${kind === "pinpoint" && (!run || run.pinpointRules === "regional") ? "v3:" : kind === "border-run" || kind === "pinpoint" ? "v2:" : ""}${kind === "pinpoint" ? [...(runSettings.categories ?? defaultMinigameSettings.categories!)].sort().join("|") : JSON.stringify(kind === "missing-borders" ? [runSettings.region, runSettings.framing, runSettings.excludeSmallCountries ?? true, [...runSettings.excludedCountries].sort()] : kind === "border-run" ? [runSettings.showBorders ?? false, [...runSettings.excludedCountries].sort()] : [runSettings.includeTerritories, runSettings.excludeAdjacentClues, [...runSettings.excludedCountries].sort()])}`;
  const ranked = usesDefaultMinigameRules(runSettings, kind);
  const base = useMemo(
    () => (regions.length ? minigameBase(regions) : undefined),
    [regions, kind],
  );
  const topology = useMemo(
    () => (base && kind === "border-run" ? landTopology(regions) : undefined),
    [base, regions, kind],
  );
  const small = useMemo(
    () =>
      kind === "missing-borders" ? smallCountryIds(regions) : new Set<string>(),
    [regions, kind],
  );
  const allPairs = useMemo(
    () =>
      base
        ? kind === "out-of-place"
          ? outOfPlacePairs(regions)
          : kind === "say-where"
            ? sayWherePairs()
            : kind === "missing-borders"
              ? missingBorderPairs(regions)
              : kind === "border-run"
                ? borderRunPairs(topology!, runSettings.excludedCountries)
                : kind === "pinpoint"
                  ? pinpointPairs(regions, runSettings)
                  : sharedNeighborPairs(base.graph)
        : [],
    [
      base,
      kind,
      regions,
      topology,
      kind === "pinpoint" ? runSettings : undefined,
    ],
  );
  const needMainland =
    kind === "shared-neighbors" &&
    (!settings.includeTerritories || !runSettings.includeTerritories);
  const graph = useMemo(
    () =>
      base
        ? needMainland
          ? mainlandBorderGraph(regions)
          : base.graph
        : undefined,
    [base, regions, needMainland],
  );
  const mainlandPairs = useMemo(
    () => (graph && needMainland ? sharedNeighborPairs(graph) : allPairs),
    [graph, needMainland, allPairs],
  );
  const pairs = useMemo(
    () =>
      base
        ? kind === "pinpoint" || kind === "say-where" || kind === "out-of-place"
          ? allPairs
          : filterMinigamePairs(
              runSettings.includeTerritories ? allPairs : mainlandPairs,
              runSettings,
              runSettings.includeTerritories ? base.graph : graph!,
              kind,
              small,
            )
        : [],
    [base, allPairs, mainlandPairs, runSettings, graph, kind, small],
  );
  const choices = useMemo(
    () =>
      base
        ? kind === "say-where" || kind === "out-of-place"
          ? allPairs
          : kind === "border-run"
            ? borderRunPairs(topology!, settings.excludedCountries)
            : kind === "pinpoint"
              ? pinpointPairs(regions, settings)
              : filterMinigamePairs(
                  settings.includeTerritories ? allPairs : mainlandPairs,
                  settings,
                  settings.includeTerritories ? base.graph : graph!,
                  kind,
                  small,
                )
        : [],
    [
      base,
      allPairs,
      mainlandPairs,
      settings,
      graph,
      kind,
      small,
      topology,
      regions,
    ],
  );
  const signature = useMemo(() => poolSignature(pairs), [pairs]);
  const roundCount =
    kind === "say-where" ? sayWhereRoundCount(pairs) : pairs.length;
  const current =
    run?.signature === signature &&
    run.index < (kind === "pinpoint" ? 10 : roundCount)
      ? run
      : undefined;
  const deck = useMemo(
    () =>
      current
        ? kind === "out-of-place"
          ? outOfPlaceDeck(
              pairs as OutOfPlacePair[],
              regions,
              current.seed,
              current.cycle,
            )
          : kind === "say-where"
            ? sayWhereDeck(pairs as SayWherePair[], current.seed, current.cycle)
            : kind === "pinpoint"
              ? pinpointDeck(
                  pairs as PinpointPair[],
                  current.seed,
                  current.cycle,
                )
              : neighborDeck(pairs, current.seed, current.cycle)
        : [],
    [pairs, regions, current?.seed, current?.cycle, kind],
  );
  const pair = current ? deck[current.index] : undefined;
  const questionJourney = useMemo(
    () =>
      pair && base
        ? kind === "out-of-place"
          ? outOfPlaceJourney(pair as OutOfPlacePair, base)
          : kind === "say-where"
            ? sayWhereJourney(pair as SayWherePair, base)
            : kind === "missing-borders"
              ? missingBorderJourney(
                  pair as MissingBorderPair,
                  base,
                  regions,
                  (current!.seed + Math.imul(current!.cycle, 0x9e3779b9)) >>> 0,
                  runSettings.framing === "wide",
                )
              : kind === "border-run"
                ? borderRunJourney(
                    pair as RoutePair,
                    base,
                    runSettings.showBorders ?? false,
                  )
                : kind === "pinpoint"
                  ? pinpointJourney(
                      pair as PinpointPair,
                      entryFocus,
                      current?.pinpointRules === "regional",
                    )
                  : neighborJourney(pair, base)
        : undefined,
    [
      pair,
      base,
      kind,
      regions,
      current?.seed,
      current?.cycle,
      runSettings.framing,
      runSettings.showBorders,
      entryFocus,
      current?.pinpointRules,
    ],
  );
  const overview =
    !!current &&
    neighborRunEnded(current) &&
    (current.overview ?? current.ended === "finished");
  const journey = useMemo(
    () =>
      questionJourney &&
      (overview
        ? { ...questionJourney, completion: minigameCompletion(current!, base) }
        : questionJourney),
    [questionJourney, overview, current?.history, base],
  );
  const context = useMemo(
    () =>
      journey ? createQuestionContext(regions, [], journey, base) : undefined,
    [regions, journey, base],
  );
  const game =
    current && journey
      ? neighborGame({ ...current, overview }, journey)
      : undefined;
  const routeLength =
    kind === "border-run" && pair ? (pair as RoutePair).route.length - 1 : 0;
  const { step: revealStep, reduced } = useRevealSequence(
    kind === "border-run" && current?.result !== undefined && !overview
      ? `${current.id}:${current.cycle}:${current.index}`
      : undefined,
    routeLength * 2,
    active,
  );
  const world = useMemo(() => {
    if (!journey || !context || !game) return undefined;
    const view = minigameWorld({
      regions,
      journey,
      context,
      game,
      kind,
      pair: pair!,
      showBorders: runSettings.showBorders,
      revealStep,
      reduced,
      overview,
      regionalPinpoint: current?.pinpointRules === "regional",
      revealKey: current
        ? `${current.id}:${current.cycle}:${current.index}`
        : undefined,
    });
    if (overview && kind !== "out-of-place") {
      view.regionInteraction = false;
      for (const visit of current?.history ?? []) {
        for (const id of visit.ids)
          view.states[id] = visit.correct ? "correct" : "answer";
        if (kind === "say-where" && !visit.correct && visit.selectedId)
          view.states[visit.selectedId] = "incorrect";
      }
    }
    return view;
  }, [
    regions,
    journey,
    context,
    current,
    kind,
    pair,
    overview,
    runSettings.showBorders,
    revealStep,
    routeLength,
    reduced,
  ]);
  useEffect(() => {
    if (!current || !ranked || !neighborRunEnded(current)) return;
    const value = kind === "pinpoint" ? (current.points ?? 0) : current.correct;
    if ((scores[scoreKey] ?? -1) >= value) return;
    const result = scoresStore.save({ ...scores, [scoreKey]: value });
    setScores(result.value);
    if (!result.ok) setSaved(false);
  }, [current, ranked, kind, scoreKey, scores, scoresStore]);
  useEffect(() => {
    if (run) {
      const result = store.save({ version: 1, run });
      setSaved(result.ok);
      if (!store.equivalent(result.value, { version: 1, run }))
        setRun(result.value.run);
    }
  }, [store, run]);
  useEffect(() => {
    const result = settingsStore.save(settings);
    setSettingsSaved(result.ok);
    if (!settingsStore.equivalent(result.value, settings))
      setSettings(result.value);
  }, [settingsStore, settings]);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(store.prefix))
        setRun(store.load().run);
      if (event.key === null || event.key.startsWith(scoresStore.prefix))
        setScores(scoresStore.load());
      if (event.key === null || event.key.startsWith(settingsStore.prefix))
        setSettings(settingsStore.load());
    };
    addEventListener("storage", update);
    return () => removeEventListener("storage", update);
  }, [store, settingsStore, scoresStore]);
  return {
    kind,
    title: MINIGAME_TITLES[kind],
    overview,
    ranked,
    best: ranked ? scores[scoreKey] : undefined,
    run: current,
    pair,
    journey,
    world,
    context,
    game,
    count: choices.length,
    ready: !!base,
    settings,
    settingsSaved,
    onSettings: setSettings,
    hasUnfinished: !!current && !neighborRunEnded(current),
    canResume:
      !!current &&
      !neighborRunEnded(current) &&
      sameMinigameSettings(runSettings, settings, kind),
    saved,
    ended: !!current && neighborRunEnded(current),
    canSelectPoint: (point: { lat: number; lng: number }) =>
      kind !== "missing-borders" ||
      (!!journey &&
        inMissingBorderSearch(
          point,
          runSettings.framing === "wide"
            ? journey.rounds[0].focus
            : missingBorderFocus(
                pair as MissingBorderPair,
                regions,
                (current!.seed + Math.imul(current!.cycle, 0x9e3779b9)) >>> 0,
              ),
          runSettings.framing === "wide",
        )),
    restart: () => {
      if (kind === "pinpoint") {
        const view = readView?.();
        if (view) setEntryFocus({ ...view, altitude: 1.15 });
      }
      if (pairs.length)
        setRun((previous) => ({
          ...startNeighborRun(pairs, previous?.startedAt),
          settings: runSettings,
          pinpointRules: kind === "pinpoint" ? "regional" : undefined,
          kind,
        }));
    },
    start: (forceNew = false) => {
      if (kind === "pinpoint") {
        const view = readView?.();
        if (view) setEntryFocus({ ...view, altitude: 1.15 });
      }
      if (choices.length)
        setRun((previous) =>
          !forceNew &&
          previous?.signature === signature &&
          previous.index < (kind === "pinpoint" ? 10 : roundCount) &&
          !neighborRunEnded(previous) &&
          sameMinigameSettings(runSettings, settings, kind)
            ? previous
            : {
                ...startNeighborRun(choices, previous?.startedAt),
                settings,
                pinpointRules: kind === "pinpoint" ? "regional" : undefined,
                kind,
              },
        );
    },
    action: (action: NeighborAction) => {
      if (kind === "pinpoint" && action.type === "next") {
        const view = readView?.();
        if (view) setEntryFocus({ ...view, altitude: 1.15 });
      }
      if (journey && context)
        setRun((previous) =>
          previous?.signature === signature &&
          previous.id === current?.id &&
          previous.cycle === current.cycle &&
          previous.index === current.index
            ? (() => {
                const next = neighborReducer(
                  previous,
                  action,
                  journey,
                  context,
                  kind === "pinpoint" ? 10 : roundCount,
                );
                if (next.answered === previous.answered) return next;
                const q = journey.rounds[0];
                const ids =
                  kind === "say-where"
                    ? [next.result ? next.selectedId! : pair!.answer]
                    : kind === "border-run"
                      ? (pair as RoutePair).route
                      : kind === "missing-borders"
                        ? pair!.countries
                        : solutionIds(q, context).filter((id) =>
                            context.targets.has(id),
                          );
                const target =
                  kind === "out-of-place"
                    ? (pair as OutOfPlacePair).items.find(
                        (i) => i.id === pair!.answer,
                      )!
                    : kind === "say-where"
                      ? context.targets.get(
                          next.result ? next.selectedId! : pair!.answer,
                        )!.focus
                      : kind === "pinpoint"
                        ? ((pair as PinpointPair).region?.focus ??
                          (pair as PinpointPair).place!)
                        : kind === "missing-borders" || kind === "border-run"
                          ? (q.feedbackFocus ?? q.focus)
                          : (context.targets.get(ids.at(-1)!)?.focus ??
                            q.focus);
                const distanceKm =
                  kind === "pinpoint" &&
                  (pair as PinpointPair).place &&
                  next.pin
                    ? geoDistance(
                        [next.pin.lng, next.pin.lat],
                        [target.lng, target.lat],
                      ) * 6371.0088
                    : undefined;
                const points =
                  kind === "pinpoint"
                    ? distanceKm === undefined
                      ? Number(next.result) * 1000
                      : current?.pinpointRules === "regional" &&
                          (pair as PinpointPair).searchArea
                        ? regionalPinpointPoints(
                            distanceKm,
                            (pair as PinpointPair).searchContext ??
                              (pair as PinpointPair).searchArea!,
                          )
                        : pinpointPoints(distanceKm)
                    : undefined;
                const result = points === undefined ? next.result! : points > 0;
                const pinpointTarget =
                  kind === "pinpoint" ? (pair as PinpointPair) : undefined;
                const chosenPlace =
                  kind === "out-of-place"
                    ? (pair as OutOfPlacePair).displayed.find(
                        (i) => i.id === next.selectedId,
                      )
                    : undefined;
                const visit = {
                  ...(kind === "say-where" || kind === "out-of-place"
                    ? { selectedId: next.selectedId }
                    : {}),
                  ids,
                  correct: result,
                  point: { lat: target.lat, lng: target.lng },
                  pin:
                    kind === "out-of-place" && !next.result
                      ? chosenPlace && {
                          lat: chosenPlace.lat,
                          lng: chosenPlace.lng,
                        }
                      : next.pin,
                  points,
                  distanceKm,
                  ...(kind === "out-of-place"
                    ? {
                        target: {
                          id: pair!.answer,
                          name: (pair as OutOfPlacePair).items.find(
                            (i) => i.id === pair!.answer,
                          )!.name,
                          lat: target.lat,
                          lng: target.lng,
                        },
                      }
                    : {}),
                  ...(pinpointTarget
                    ? {
                        target: {
                          id: pinpointTarget.id,
                          name: pinpointTarget.name,
                          lat: target.lat,
                          lng: target.lng,
                          regionId: pinpointTarget.region?.id,
                          sourceUrl: pinpointTarget.sourceUrl,
                        },
                      }
                    : {}),
                };
                const needsReview = (
                  v: import("./sharedNeighbors").MinigameVisit,
                ) =>
                  kind === "pinpoint"
                    ? (v.points ?? (v.correct ? 1000 : 0)) < 500
                    : !v.correct;
                return {
                  ...next,
                  result,
                  correct: previous.correct + Number(result),
                  points:
                    points === undefined
                      ? next.points
                      : (previous.points ?? 0) + points,
                  history: [...(previous.history ?? []), visit].slice(-64),
                  review: [
                    ...(previous.review ??
                      previous.history?.filter(needsReview) ??
                      []),
                    ...(needsReview(visit) ? [visit] : []),
                  ],
                };
              })()
            : previous,
        );
    },
  };
}
