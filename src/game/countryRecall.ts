import { countryIdForName, normalizeAnswer } from "./answerNames";
import type { Question, QuestionContext, Response } from "./questionContracts";
import type { AnswerOutcome } from "./answerOutcome";

export interface CountryRecall {
  version: 1;
  entries: {
    id: string;
    input: string;
    result: "accepted" | "wrong" | "exception";
  }[];
  assistedId?: string;
  ended?: "all-found" | "finish" | "third-wrong";
}
export function validCountryRecall(value: unknown): value is CountryRecall {
  const r = value as CountryRecall;
  return (
    !!r &&
    r.version === 1 &&
    Array.isArray(r.entries) &&
    r.entries.length <= 200 &&
    r.entries.every(
      (e) =>
        !!e &&
        typeof e.id === "string" &&
        e.id.length <= 200 &&
        typeof e.input === "string" &&
        e.input.length <= 160 &&
        ["accepted", "wrong", "exception"].includes(e.result),
    ) &&
    new Set(r.entries.map((e) => e.id)).size === r.entries.length &&
    r.entries.filter((e) => e.result === "wrong").length <= 3 &&
    (r.entries.filter((e) => e.result === "wrong").length === 3) ===
      (r.ended === "third-wrong") &&
    (r.assistedId === undefined ||
      r.entries.some(
        (e) => e.id === r.assistedId && e.result === "accepted",
      )) &&
    (r.ended === undefined ||
      ["all-found", "finish", "third-wrong"].includes(r.ended))
  );
}
export const recalledIds = (r?: CountryRecall) =>
  r?.entries.filter((e) => e.result === "accepted").map((e) => e.id) ?? [];
export const recallMistakes = (r?: CountryRecall) =>
  r?.entries.filter((e) => e.result === "wrong").map((e) => e.id) ?? [];
export const recallCeiling = (r?: CountryRecall) =>
  Math.max(0, 3 - recallMistakes(r).length);
export const hasRecallCredit = (r: unknown): r is CountryRecall =>
  validCountryRecall(r) &&
  recalledIds(r).length > 0 &&
  recallCeiling(r) > 0 &&
  r.ended !== "third-wrong";
/** Guesses are irreversible within a run, including stale-tab/account merges. */
export function mergeCountryRecall(
  a?: CountryRecall,
  b?: CountryRecall,
): CountryRecall | undefined {
  if (!a) return b;
  if (!b) return a;
  const assistedId = a.assistedId ?? b.assistedId;
  const byId = new Map<string, CountryRecall["entries"][number]>();
  for (const e of [...a.entries, ...b.entries]) {
    if (e.result === "accepted" && !e.input && e.id !== assistedId) continue;
    const old = byId.get(e.id);
    if (!old || (!old.input && e.input)) byId.set(e.id, e);
  }
  let wrong = 0;
  const entries = [...byId.values()].filter(
    (e) => e.result !== "wrong" || ++wrong <= 3,
  );
  return {
    version: 1,
    entries,
    ...(assistedId ? { assistedId } : {}),
    ...(wrong >= 3
      ? { ended: "third-wrong" }
      : a.ended || b.ended
        ? { ended: a.ended ?? b.ended }
        : {}),
  };
}
export function recallOutcome(
  q: Question,
  response: Response,
): AnswerOutcome | undefined {
  if (q.rule.type !== "country-set-recall") return;
  const ids = recalledIds(response.recall).filter(
    (id) => q.rule.type === "country-set-recall" && q.rule.ids.includes(id),
  );
  const n = ids.length,
    total = q.rule.ids.length;
  const base =
    n === total ? 3 : n >= Math.ceil((total * 2) / 3) ? 2 : n ? 1 : 0;
  return {
    correct: n === total && recallCeiling(response.recall) > 0,
    accuracyPoints: Math.min(base, recallCeiling(response.recall)),
  };
}
/** Resolve locally and exactly. Unknown spelling never consumes the mistake budget. */
export function enterRecall(
  q: Question,
  context: QuestionContext,
  recall: CountryRecall | undefined,
  input: string,
) {
  const r: CountryRecall = recall ?? { version: 1, entries: [] };
  if (q.rule.type !== "country-set-recall" || r.ended || recallCeiling(r) === 0)
    return { recall: r };
  const text = input.trim().slice(0, 160);
  const aliases: Record<string, string> = {
    burma: "wurl:MMR",
    prc: "wurl:CHN",
    "peoples republic of china": "wurl:CHN",
    "islamic republic of afghanistan": "wurl:AFG",
  };
  const id = countryIdForName(context, text) ?? aliases[normalizeAnswer(text)];
  if (!id || !context.members.has(id))
    return {
      recall: r,
      message: "Check the country name and spelling. No incorrect guess used.",
    };
  if (r.entries.some((e) => e.id === id))
    return { recall: r, message: "Already entered. No additional guess used." };
  const exception = q.rule.exceptions?.find((e) => e.id === id);
  const result = exception
    ? "exception"
    : q.rule.ids.includes(id)
      ? "accepted"
      : "wrong";
  const next: CountryRecall = {
    ...r,
    entries: [...r.entries, { id, input: text, result }],
  };
  if (recallMistakes(next).length === 3) next.ended = "third-wrong";
  else if (recalledIds(next).length === q.rule.ids.length)
    next.ended = "all-found";
  return {
    recall: next,
    message:
      exception?.message ??
      (result === "wrong"
        ? `${context.names.get(id) ?? text} does not meet this round's land-border rule.`
        : undefined),
  };
}
export function assistRecall(
  q: Question,
  recall?: CountryRecall,
): CountryRecall | undefined {
  if (q.rule.type !== "country-set-recall") return recall;
  const r: CountryRecall = recall ?? { version: 1, entries: [] };
  if (r.ended || r.assistedId) return r;
  const id = q.rule.assistOrder.find((id) => !recalledIds(r).includes(id));
  if (!id) return r;
  const next: CountryRecall = {
    ...r,
    assistedId: id,
    entries: [...r.entries, { id, input: "", result: "accepted" }],
  };
  if (recalledIds(next).length === q.rule.ids.length) next.ended = "all-found";
  return next;
}
