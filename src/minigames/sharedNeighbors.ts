import roster from "../game/data/un-members.v1.json";
import { geoDistance, geoInterpolate } from "d3-geo";
import type { BorderGraph } from "../game/reasoning";
import { defineQuestion } from "../game/questionBuilder";
import { isCorrect } from "../game/questionEvaluation";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { Focus } from "../geography/types";
import { initialGame } from "../game/state";
import type { GameState } from "../game/state";
import { validPin } from "../game/answerTargets";
import { mapSource } from "../game/countryFacts";
import { canSelect } from "../game/questionPreparation";

export type BorderMinigame = "shared-neighbors" | "missing-borders";

export interface NeighborPair {
  id: string;
  countries: [string, string];
  answer: string;
}
export interface NeighborRun {
  id: string;
  startedAt: number;
  signature: string;
  seed: number;
  cycle: number;
  index: number;
  answered: number;
  correct: number;
  pin?: { lat: number; lng: number };
  selectedId?: string;
  result?: boolean;
  ended?: "strikes" | "finished";
}

/** Also recognizes runs saved before the three-strike limit was introduced. */
export const neighborRunEnded = (run: NeighborRun) =>
  !!run.ended || run.answered - run.correct >= 3;

/** Intersect the complete graph before checking answer eligibility. */
export function sharedNeighborPairs(graph: BorderGraph): NeighborPair[] {
  const members = new Set(roster.members.map((country) => country.id));
  const ids = [...members].filter((id) => graph.has(id)).sort();
  const pairs: NeighborPair[] = [];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i],
        b = ids[j];
      const common = [...graph.get(a)!].filter((id) => graph.get(b)!.has(id));
      if (common.length === 1 && members.has(common[0]))
        pairs.push({ id: `${a}|${b}`, countries: [a, b], answer: common[0] });
    }
  return pairs;
}

export function poolSignature(pairs: NeighborPair[]): string {
  let hash = 2166136261;
  for (const pair of pairs)
    for (const char of `${pair.id}:${pair.answer};`)
      hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return `${pairs.length}:${hash.toString(16)}`;
}

/** Fisher–Yates: every pair appears once per cycle; seed makes reloads stable. */
export function neighborDeck(
  pairs: NeighborPair[],
  seed: number,
  cycle: number,
): NeighborPair[] {
  let state = (seed + Math.imul(cycle, 0x9e3779b9)) >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const deck = [...pairs];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function startNeighborRun(
  pairs: NeighborPair[],
  previousStartedAt = 0,
): NeighborRun {
  return {
    id: crypto.randomUUID(),
    startedAt: Math.max(Date.now(), previousStartedAt + 1),
    signature: poolSignature(pairs),
    seed: crypto.getRandomValues(new Uint32Array(1))[0],
    cycle: 0,
    index: 0,
    answered: 0,
    correct: 0,
  };
}

export const neighborJourneyBase: Journey = {
  id: "minigame-shared-neighbors",
  title: "Shared Neighbors",
  description: "Find the country bordering both clues.",
  rounds: [],
};

export function neighborJourney(
  pair: NeighborPair,
  context: QuestionContext,
): Journey {
  const [a, b] = pair.countries.map((id) => context.targets.get(id)!);
  // Frame the given countries only; the hidden answer must not influence entry framing.
  const midpoint = geoInterpolate(
    [a.focus.lng, a.focus.lat],
    [b.focus.lng, b.focus.lat],
  )(0.5);
  const focus: Focus = {
    lat: midpoint[1],
    lng: midpoint[0],
    altitude: Math.min(
      2.5,
      Math.max(
        0.7,
        geoDistance([a.focus.lng, a.focus.lat], [b.focus.lng, b.focus.lat]) *
          1.4,
      ),
    ),
  };
  const answer = context.targets.get(pair.answer)!;
  const names = pair.countries.map((id) => context.names.get(id)!);
  return {
    ...neighborJourneyBase,
    rounds: [
      defineQuestion({
        source: mapSource,
        id: `shared-neighbors:${pair.id}`,
        title: "Shared neighbor",
        label: "Shared neighbor",
        resolvedLabel: context.names.get(pair.answer)!,
        topic: "shared land borders",
        prompt: `Place a pin inside the country that shares a land border with both ${names[0]} and ${names[1]}.`,
        instruction:
          "Borders are hidden. Use the two highlighted countries as clues.",
        mode: "pin",
        rule: { type: "pin-inside", ids: [pair.answer] },
        count: 1,
        selection: { type: "none" },
        commitment: "submit",
        failure: "feedback",
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        explanation: `${context.names.get(pair.answer)} shares a land border with both ${names[0]} and ${names[1]}.`,
        scenes: {
          play: {
            contextIds: [...pair.countries],
            focus,
            map: {
              background: "open-search",
              borders: false,
              borderIds: [...pair.countries],
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
            },
          },
          reveal: {
            focus: {
              ...answer.focus,
              altitude: Math.max(
                0.35,
                Math.min(1.1, answer.focus.altitude ?? 0.7),
              ),
            },
          },
        },
      }),
    ],
  };
}

export function neighborGame(run: NeighborRun, journey: Journey): GameState {
  const response = {
    selectedIds: run.selectedId ? [run.selectedId] : [],
    text: "",
    ordered: [],
    pin: run.pin,
  };
  return {
    ...initialGame,
    ...response,
    phase: run.result === undefined ? "playing" : "feedback",
    answers:
      run.result === undefined
        ? []
        : [{ ...response, correct: run.result, roundId: journey.rounds[0].id }],
  };
}

export type NeighborAction =
  | { type: "select"; id: string }
  | { type: "pin"; lat: number; lng: number }
  | { type: "submit" }
  | { type: "finish" }
  | { type: "next" };
export function neighborReducer(
  run: NeighborRun,
  action: NeighborAction,
  journey: Journey,
  context: QuestionContext,
  count: number,
): NeighborRun {
  if (neighborRunEnded(run)) return run;
  if (action.type === "finish") return { ...run, ended: "finished" };
  const grade = (response: NeighborRun): NeighborRun => {
    const correct = isCorrect(
      journey.rounds[0],
      context,
      neighborGame(response, journey),
    );
    return {
      ...response,
      result: correct,
      answered: run.answered + 1,
      correct: run.correct + Number(correct),
      ended:
        run.answered + 1 - run.correct - Number(correct) >= 3
          ? "strikes"
          : undefined,
    };
  };
  if (action.type === "select")
    return run.result === undefined &&
      journey.rounds[0].mode === "merged-region-single" &&
      canSelect(journey.rounds[0], context, action.id)
      ? grade({ ...run, selectedId: action.id })
      : run;
  if (action.type === "pin")
    return journey.rounds[0].mode === "pin" &&
      run.result === undefined &&
      validPin(action)
      ? { ...run, pin: { lat: action.lat, lng: action.lng } }
      : run;
  if (action.type === "submit") {
    if (
      journey.rounds[0].mode !== "pin" ||
      run.result !== undefined ||
      !validPin(run.pin)
    )
      return run;
    return grade(run);
  }
  if (run.result === undefined) return run;
  const next = run.index + 1;
  return {
    ...run,
    index: next % count,
    cycle: run.cycle + Number(next === count),
    pin: undefined,
    selectedId: undefined,
    result: undefined,
  };
}
