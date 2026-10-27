import type { Question, Response } from "./questionContracts";
import type { HelpStage } from "./guidance";

/** Frozen evidence; historical rewards never consult a later answer key. */
export interface PartialSelectionCredit {
  matchedId: string;
}

export function validPartialSelectionCredit(
  credit: unknown,
  selectedIds: unknown,
): credit is PartialSelectionCredit {
  return (
    !!credit &&
    typeof credit === "object" &&
    "matchedId" in credit &&
    typeof credit.matchedId === "string" &&
    /^wurl:[A-Z]{3}$/.test(credit.matchedId) &&
    Array.isArray(selectedIds) &&
    selectedIds.length === 2 &&
    selectedIds.every(
      (id) => typeof id === "string" && /^wurl:[A-Z]{3}$/.test(id),
    ) &&
    new Set(selectedIds).size === 2 &&
    selectedIds.includes(credit.matchedId)
  );
}

export function partialSelectionCredit(
  question: Question,
  response: Response,
  help?: HelpStage,
): PartialSelectionCredit | undefined {
  const { rule, selection } = question;
  if (
    question.partialCredit !== "one-of-two" ||
    rule.type !== "country-ids" ||
    selection.type !== "ids" ||
    response.selectedIds.length !== 2 ||
    new Set(response.selectedIds).size !== 2 ||
    !response.selectedIds.every((id) => selection.ids.includes(id))
  )
    return;
  const found = response.selectedIds.filter((id) => rule.ids.includes(id));
  if (found.length !== 1) return;
  if (
    help === "assisted" &&
    question.guidance?.assist?.fixedSelections?.includes(found[0])
  )
    return;
  return { matchedId: found[0] };
}
