/** Shared name matching for Journey, Study and Explore; no runtime engine dependencies. */
import type { QuestionContext } from "./questionContracts";

export const normalizeAnswer = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function countryIdForName(
  context: Pick<QuestionContext, "names"> &
    Partial<Pick<QuestionContext, "targets">>,
  value: string,
) {
  const normalized = normalizeAnswer(value);
  if (!normalized) return undefined;
  const aliases: Record<string, string[]> = {
    "wurl:COD": ["DR Congo", "DRC", "Congo Kinshasa"],
    "wurl:USA": ["USA", "United States of America"],
    "wurl:SWZ": ["eSwatini", "Swaziland"],
    "wurl:CIV": ["Ivory Coast"],
    "wurl:CPV": ["Cape Verde"],
    "wurl:TUR": ["Turkey", "Turkiye"],
  };
  for (const [id, name] of context.names)
    if (
      normalizeAnswer(name) === normalized ||
      [
        ...(aliases[id] ?? []),
        ...(context.targets?.get(id)?.aliases ?? []),
      ].some((alias) => normalizeAnswer(alias) === normalized)
    )
      return id;
}
export function capitalForName(context: QuestionContext, value: string) {
  const normalized = normalizeAnswer(value);
  return normalized
    ? context.capitals.find((c) =>
        [c.name, ...c.aliases].some((a) => normalizeAnswer(a) === normalized),
      )
    : undefined;
}
