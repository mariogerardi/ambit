import { useEffect, useMemo, useState } from "react";
import type { RegionFeature } from "../geography/types";
import { createQuestionContext } from "../game/questionPreparation";
import { journeyWorld } from "../app/journeyWorld";
import { createNeighborSave } from "./sharedNeighborsSave";
import {
  sharedNeighborPairs,
  poolSignature,
  neighborDeck,
  startNeighborRun,
  neighborJourneyBase,
  neighborJourney,
  neighborGame,
  neighborReducer,
  neighborRunEnded,
} from "./sharedNeighbors";
import {
  missingBorderPairs,
  missingBorderJourney,
  missingBordersBase,
} from "./missingBorders";
import type { MissingBorderPair } from "./missingBorders";
import type { BorderMinigame, NeighborAction } from "./sharedNeighbors";

export function useBorderMinigame(
  regions: RegionFeature[],
  subject: string | undefined,
  kind: BorderMinigame,
) {
  const [store] = useState(() => createNeighborSave(subject, kind));
  const [run, setRun] = useState(() => store.load().run);
  const [saved, setSaved] = useState(store.writable);
  const base = useMemo(
    () =>
      regions.length
        ? createQuestionContext(
            regions,
            [],
            kind === "missing-borders"
              ? missingBordersBase
              : neighborJourneyBase,
          )
        : undefined,
    [regions, kind],
  );
  const pairs = useMemo(
    () =>
      base
        ? kind === "missing-borders"
          ? missingBorderPairs(regions)
          : sharedNeighborPairs(base.graph)
        : [],
    [base, kind, regions],
  );
  const signature = useMemo(() => poolSignature(pairs), [pairs]);
  const current =
    run?.signature === signature && run.index < pairs.length ? run : undefined;
  const deck = useMemo(
    () => (current ? neighborDeck(pairs, current.seed, current.cycle) : []),
    [pairs, current?.seed, current?.cycle],
  );
  const pair = current ? deck[current.index] : undefined;
  const journey = useMemo(
    () =>
      pair && base
        ? kind === "missing-borders"
          ? missingBorderJourney(
              pair as MissingBorderPair,
              base,
              regions,
              (current!.seed + Math.imul(current!.cycle, 0x9e3779b9)) >>> 0,
            )
          : neighborJourney(pair, base)
        : undefined,
    [pair, base, kind, regions, current?.seed, current?.cycle],
  );
  const context = useMemo(
    () =>
      journey ? createQuestionContext(regions, [], journey, base) : undefined,
    [regions, journey, base],
  );
  const game = current && journey ? neighborGame(current, journey) : undefined;
  const world = useMemo(
    () =>
      journey && context && game
        ? journeyWorld(regions, journey, game, context)
        : undefined,
    [regions, journey, context, current],
  );
  useEffect(() => {
    if (run) {
      const result = store.save({ version: 1, run });
      setSaved(result.ok);
      if (!store.equivalent(result.value, { version: 1, run }))
        setRun(result.value.run);
    }
  }, [store, run]);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith(store.prefix))
        setRun(store.load().run);
    };
    addEventListener("storage", update);
    return () => removeEventListener("storage", update);
  }, [store]);
  return {
    kind,
    title: kind === "missing-borders" ? "Missing Borders" : "Shared Neighbors",
    run: current,
    pair,
    journey,
    world,
    context,
    game,
    count: pairs.length,
    saved,
    ended: !!current && neighborRunEnded(current),
    restart: () => {
      if (pairs.length)
        setRun((previous) => startNeighborRun(pairs, previous?.startedAt));
    },
    start: () => {
      if (pairs.length)
        setRun((previous) =>
          previous?.signature === signature &&
          previous.index < pairs.length &&
          !neighborRunEnded(previous)
            ? previous
            : startNeighborRun(pairs, previous?.startedAt),
        );
    },
    action: (action: NeighborAction) => {
      if (journey && context)
        setRun((previous) =>
          previous?.signature === signature &&
          previous.id === current?.id &&
          previous.cycle === current.cycle &&
          previous.index === current.index
            ? neighborReducer(previous, action, journey, context, pairs.length)
            : previous,
        );
    },
  };
}
