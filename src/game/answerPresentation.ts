import type { Question, QuestionContext, Response } from "./questionContracts";
import type { GameState } from "./state";
import type { VisualState } from "../geography/types";
import { capitalForName, countryIdForName } from "./answerNames";
import { solutionIds, selectableIds } from "./questionPreparation";
import { lockedOrderSlots, lockedSelectionIds } from "./guidance";
import { recalledIds, recallMistakes } from "./countryRecall";

/** These are response roles, not colors or new grading/scoring rules. */
export interface AnswerItem {
  id: string;
  geographyIds: string[];
  selected: boolean;
  eliminated: boolean;
  supplied: boolean;
  slot?: number;
  state: VisualState;
}
export const acceptsAlternatives = (q: Question) =>
  ("match" in q.rule && q.rule.match === "any") ||
  q.rule.type === "name-length" ||
  q.rule.type === "capital-coordinate" ||
  q.rule.type === "shortest-borders";

export function answerGeography(q: Question, id: string): string[] {
  return q.choices?.find((choice) => choice.id === id)?.geographyIds ?? [id];
}

export function responseIds(
  q: Question,
  context: QuestionContext,
  response: Response,
) {
  if (q.mode === "country-recall")
    return [
      ...recalledIds(response.recall),
      ...recallMistakes(response.recall),
    ];
  if (q.mode === "typed-regions" || q.mode === "ordered-countries")
    return response.ordered.map(
      (name) => countryIdForName(context, name) ?? "",
    );
  if (q.mode === "ordered-capitals")
    return response.ordered.map(
      (name) => capitalForName(context, name)?.countryId ?? "",
    );
  if (q.mode === "choice-order" || q.mode === "choice-match")
    return response.ordered;
  return response.selectedIds;
}

/** Preserve slot identity and assist provenance even when several items share geography. */
export function answerItems(
  q: Question,
  context: QuestionContext,
  game: GameState,
): AnswerItem[] {
  if (q.rule.type === "bearing-angle") return [];
  const expected = solutionIds(q, context);
  const picked = responseIds(q, context, game);
  const reveal = game.phase === "feedback" || game.phase === "failed";
  if (q.mode === "country-recall")
    return [...new Set([...expected, ...picked])].map((id) => ({
      id,
      geographyIds: [id],
      selected: picked.includes(id),
      eliminated: false,
      supplied: game.recall?.assistedId === id,
      state: reveal
        ? recalledIds(game.recall).includes(id)
          ? "correct"
          : expected.includes(id)
            ? "answer"
            : "incorrect"
        : recalledIds(game.recall).includes(id)
          ? "visited"
          : "disabled",
    }));
  const ordered = [
    "ordered-countries",
    "ordered-capitals",
    "choice-order",
    "choice-match",
  ].includes(q.mode);
  const survivors =
    game.help?.[q.id] === "assisted"
      ? q.guidance?.assist?.candidateIds
      : undefined;
  const fixed = lockedSelectionIds(q, game);
  const slots = lockedOrderSlots(q, game);
  const ids = [
    ...new Set(
      [...selectableIds(q, context), ...expected, ...picked].filter(Boolean),
    ),
  ];
  const entries = ordered
    ? [
        ...picked.map((id, slot) => ({ id, slot })),
        ...ids
          .filter((id) => !picked.includes(id))
          .map((id) => ({ id, slot: -1 })),
      ]
    : ids.map((id) => ({ id, slot: picked.indexOf(id) }));
  return entries
    .filter(({ id }) => !!id)
    .map(({ id, slot }) => {
      const selected = slot >= 0;
      const valid =
        q.mode === "land-path" && game.answers.at(-1)?.correct
          ? selected || expected.includes(id)
          : ordered && selected
            ? expected[slot] === id
            : expected.includes(id);
      const eliminated = !!survivors && !survivors.includes(id);
      return {
        id,
        geographyIds: answerGeography(q, id),
        selected,
        eliminated,
        supplied:
          fixed.includes(id) ||
          slots.some((s) => s.index === slot && s.id === id),
        slot: ordered && selected ? slot : undefined,
        state: reveal
          ? selected
            ? valid
              ? "correct"
              : "incorrect"
            : expected.includes(id)
              ? "answer"
              : "disabled"
          : selected
            ? q.commitment === "immediate" && q.count > 1
              ? "correct"
              : "selected"
            : eliminated
              ? "disabled"
              : "selectable",
      };
    });
}
