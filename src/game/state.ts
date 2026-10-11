import { validPin } from "./answerTargets";
import { candidateAvailable } from "./guidance";
import type { HelpUsage } from "./guidance";
import {
  canSelect,
  canSubmit,
  countryIdForName,
  cityIdForName,
  isCorrect,
  responseCount,
  solutionIds,
} from "./questions";
import type { Journey, QuestionContext, Response } from "./questions";
export interface Answer extends Response {
  roundId: string;
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
  | { type: "jump"; index: number }
  | { type: "home" }
  | { type: "select"; id: string }
  | { type: "drop-pin"; lat: number; lng: number }
  | { type: "guess-country" }
  | { type: "text"; value: string }
  | { type: "ordered"; index: number; value: string }
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
  if (action.type === "start") return { ...initialGame, phase: "playing" };
  if (action.type === "jump")
    return Number.isInteger(action.index) &&
      action.index >= 0 &&
      action.index < journey.rounds.length
      ? { ...initialGame, phase: "playing", roundIndex: action.index }
      : state;
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
          ordered: [],
          inputError: undefined,
        };
  }
  if (state.phase !== "playing") return state;
  if (action.type === "request-hint")
    return round.guidance && !state.help?.[round.id]
      ? { ...state, help: { ...state.help, [round.id]: "hinted" } }
      : state;
  if (action.type === "request-assist")
    return round.guidance?.assist && state.help?.[round.id] === "hinted"
      ? { ...state, help: { ...state.help, [round.id]: "assisted" } }
      : state;
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
    if (action.index < 0 || action.index >= responseCount(round, context))
      return state;
    const ordered = Array.from(
      { length: responseCount(round, context) },
      (_, i) => (i === action.index ? action.value : (state.ordered[i] ?? "")),
    );
    return { ...state, ordered, inputError: undefined };
  }
  if (action.type === "clear")
    return round.commitment === "immediate"
      ? state
      : { ...state, pin: undefined, selectedIds: [], text: "", ordered: [] };
  if (action.type === "select" || action.type === "guess-country") {
    if (
      round.mode !== "city-single" &&
      round.mode !== "city-multiple" &&
      round.mode !== "map-single" &&
      round.mode !== "map-multiple" &&
      round.mode !== "land-path" &&
      round.mode !== "choice-single" &&
      round.mode !== "choice-multiple"
    )
      return state;
    if (action.type === "guess-country" && round.mode.startsWith("choice-"))
      return state;
    const id =
      action.type === "select"
        ? action.id
        : round.mode.startsWith("city-")
          ? cityIdForName(round, state.text)
          : countryIdForName(context, state.text);
    if (!id || !canSelect(round, context, id))
      return action.type === "guess-country"
        ? {
            ...state,
            inputError:
              (round.mode.startsWith("city-")
                ? "Choose a marked city or type its name. If cities share a name, choose the marker on the globe."
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
      return round.commitment === "immediate"
        ? state
        : {
            ...state,
            selectedIds: state.selectedIds.filter((value) => value !== id),
          };
    if (
      state.selectedIds.length >= responseCount(round, context) &&
      round.mode !== "map-single" &&
      round.mode !== "city-single" &&
      round.mode !== "choice-single"
    )
      return state;
    const response: Response = {
      selectedIds:
        round.mode === "map-single" ||
        round.mode === "city-single" ||
        round.mode === "choice-single"
          ? [id]
          : [...state.selectedIds, id],
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
    return finish(state, isCorrect(round, context, state));
  return state;
}
export const journeyScore = (state: GameState) =>
  state.answers.filter((answer) => answer.correct).length;
