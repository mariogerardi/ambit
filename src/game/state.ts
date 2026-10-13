import { countryIdForName } from "./answerNames";
import { mechanicFor, usesChoiceCards } from "./mechanics";
import { orderedCards, swapOrderCard, isSlotAnswer } from "./ordering";
import { pointAnswerNoun, validPin } from "./answerTargets";
import {
  candidateAvailable,
  lockedOrderSlots,
  lockedSelectionIds,
  withAssistanceLocks,
} from "./guidance";
import type { HelpUsage } from "./guidance";
import { canSelect, responseCount, solutionIds } from "./questionPreparation";
import type { Journey, QuestionContext, Response } from "./questionContracts";
import { canSubmit, isCorrect } from "./questionEvaluation";
import { cityIdForName } from "./answerTargets";
export interface Answer extends Response {
  roundId: string;
  /** Captured at submission so a later facelift cannot rename earned results. */
  receiptLabel?: string;
  correct: boolean;
}
export interface GameState extends Response {
  phase: "home" | "playing" | "feedback" | "finished" | "failed";
  roundIndex: number;
  answers: Answer[];
  inputError?: string;
  help?: HelpUsage;
}
export type Action =
  | { type: "start" }
  | { type: "home" }
  | { type: "select"; id: string }
  | { type: "drop-pin"; lat: number; lng: number }
  | { type: "guess-country" }
  | { type: "text"; value: string }
  | { type: "ordered"; index: number; value: string }
  | { type: "order-card"; index: number; id: string }
  | { type: "clear" }
  | { type: "request-hint" }
  | { type: "request-assist" }
  | { type: "submit" }
  | { type: "next" };
export const initialGame: GameState = {
  phase: "home",
  roundIndex: 0,
  selectedIds: [],
  text: "",
  ordered: [],
  answers: [],
};
export function gameReducer(
  state: GameState,
  action: Action,
  journey: Journey,
  context: QuestionContext,
): GameState {
  if (action.type === "start")
    return {
      ...initialGame,
      phase: "playing",
      ordered: [...(journey.rounds[0].orderInitial ?? [])],
    };
  if (action.type === "home") return { ...initialGame };
  const round = journey.rounds[state.roundIndex];
  const finish = (response: Response, correct: boolean): GameState => ({
    ...state,
    selectedIds: response.selectedIds,
    text: response.text,
    ordered: response.ordered,
    pin: response.pin ? { ...response.pin } : undefined,
    inputError: undefined,
    phase: !correct && round.failure === "end-game" ? "failed" : "feedback",
    answers: [
      ...state.answers,
      {
        roundId: round.id,
        ...(journey.saveRevision
          ? { receiptLabel: round.resolvedLabel ?? round.label }
          : {}),
        selectedIds: [...response.selectedIds],
        text: response.text,
        ordered: [...response.ordered],
        pin: response.pin ? { ...response.pin } : undefined,
        correct,
      },
    ],
  });
  if (action.type === "next") {
    if (state.phase !== "feedback") return state;
    return state.roundIndex === journey.rounds.length - 1
      ? { ...state, phase: "finished" }
      : {
          ...state,
          phase: "playing",
          roundIndex: state.roundIndex + 1,
          pin: undefined,
          selectedIds: [],
          text: "",
          ordered: [
            ...(journey.rounds[state.roundIndex + 1].orderInitial ?? []),
          ],
          inputError: undefined,
        };
  }
  if (state.phase !== "playing") return state;
  state = withAssistanceLocks(round, state);
  if (action.type === "request-hint")
    return round.guidance && !state.help?.[round.id]
      ? { ...state, help: { ...state.help, [round.id]: "hinted" } }
      : state;
  if (action.type === "request-assist") {
    if (!round.guidance?.assist || state.help?.[round.id] !== "hinted")
      return state;
    const helped: GameState = {
      ...state,
      help: { ...state.help, [round.id]: "assisted" },
    };
    return withAssistanceLocks(round, helped);
  }
  if (action.type === "drop-pin")
    return round.mode === "pin" && validPin(action)
      ? {
          ...state,
          pin: { lat: action.lat, lng: action.lng },
          inputError: undefined,
        }
      : state;
  if (action.type === "text")
    return { ...state, text: action.value, inputError: undefined };
  if (action.type === "ordered") {
    if (isSlotAnswer(round)) return state;
    if (action.index < 0 || action.index >= responseCount(round, context))
      return state;
    const ordered = Array.from(
      { length: responseCount(round, context) },
      (_, i) => (i === action.index ? action.value : (state.ordered[i] ?? "")),
    );
    return { ...state, ordered, inputError: undefined };
  }
  if (action.type === "order-card") {
    const fixed = lockedOrderSlots(round, state);
    if (
      !isSlotAnswer(round) ||
      !Number.isInteger(action.index) ||
      action.index < -1 ||
      action.index >= round.count ||
      !canSelect(round, context, action.id) ||
      fixed.some((slot) => slot.id === action.id || slot.index === action.index)
    )
      return state;
    const current = orderedCards(round, state);
    if (current.indexOf(action.id) === action.index) return state;
    const ordered = swapOrderCard(round, current, action.id, action.index);
    return { ...state, ordered, inputError: undefined };
  }
  if (action.type === "clear")
    return round.commitment === "immediate"
      ? state
      : {
          ...state,
          pin: undefined,
          selectedIds: [...lockedSelectionIds(round, state)],
          text: "",
          ordered: round.orderInitial
            ? lockedOrderSlots(round, state).reduce(
                (cards, slot) =>
                  swapOrderCard(round, cards, slot.id, slot.index),
                [...round.orderInitial],
              )
            : lockedOrderSlots(round, state).length
              ? Array.from(
                  { length: round.count },
                  (_, index) =>
                    lockedOrderSlots(round, state).find(
                      (slot) => slot.index === index,
                    )?.id ?? "",
                )
              : [],
        };
  if (action.type === "select" || action.type === "guess-country") {
    const mechanic = mechanicFor(round);
    if (mechanic.response !== "selected") return state;
    if (
      action.type === "guess-country" &&
      (usesChoiceCards(round) || round.mode === "merged-region-single")
    )
      return state;
    const id =
      action.type === "select"
        ? action.id
        : mechanic.mapSelection === "places"
          ? cityIdForName(round, state.text)
          : countryIdForName(context, state.text);
    if (!id || !canSelect(round, context, id))
      return action.type === "guess-country"
        ? {
            ...state,
            inputError:
              (mechanic.mapSelection === "places"
                ? `Choose a marked ${pointAnswerNoun(round)} or type its name. If names are ambiguous, choose the marker on the globe.`
                : round.rule.type === "region-ids"
                  ? "Choose a region allowed by this question. Check the name and spelling."
                  : "Choose a country allowed by this question. Check the name and spelling.") +
              (round.selection.type === "members" &&
              round.selection.excludeIds?.includes("wurl:TCD")
                ? " Chad is already given."
                : ""),
          }
        : state;
    if (!candidateAvailable(round, state, id))
      return action.type === "guess-country"
        ? {
            ...state,
            inputError:
              "That option was removed by the assist. Choose one of the remaining candidates.",
          }
        : state;
    if (state.selectedIds.includes(id))
      return round.commitment === "immediate" ||
        lockedSelectionIds(round, state).includes(id)
        ? state
        : {
            ...state,
            selectedIds: state.selectedIds.filter((value) => value !== id),
          };
    if (
      state.selectedIds.length >= responseCount(round, context) &&
      !mechanic.single
    )
      return state;
    const response: Response = {
      selectedIds: mechanic.single ? [id] : [...state.selectedIds, id],
      text: "",
      ordered: state.ordered,
    };
    if (round.commitment === "immediate") {
      const valid = solutionIds(round, context).includes(id);
      if (!valid) return finish(response, false);
      if (response.selectedIds.length === round.count)
        return finish(response, isCorrect(round, context, response));
    }
    return { ...state, ...response, inputError: undefined };
  }
  if (action.type === "submit" && canSubmit(round, context, state))
    return finish(
      {
        ...state,
        ordered: isSlotAnswer(round)
          ? orderedCards(round, state)
          : state.ordered,
      },
      isCorrect(round, context, state),
    );
  return state;
}
export const journeyScore = (state: GameState) =>
  state.answers.filter((answer) => answer.correct).length;
