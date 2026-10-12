import { CAPITALS } from "../game/quizData";
import { normalizeAnswer } from "../game/answerNames";
import { MAJOR_CITIES } from "../geography/places";
import type { StudySettings } from "./engine";

export const CAPITAL_DISTRACTORS = {
  study: "Capitals in this study",
  region: "Capitals in the same continent",
  countryCities: "Cities within the target country",
  globalCities: "Cities worldwide",
  globalCapitals: "Capitals worldwide",
} as const;
export type CapitalDistractors = keyof typeof CAPITAL_DISTRACTORS;
const capitals = new Map(
  CAPITALS.map((capital) => [capital.countryId, capital]),
);
const cities = new Map(MAJOR_CITIES.map((city) => [city.id, city]));
const citiesByCountry = new Map<string, string[]>();
for (const city of MAJOR_CITIES) {
  const ids = citiesByCountry.get(city.parentId!) ?? [];
  ids.push(city.id);
  citiesByCountry.set(city.parentId!, ids);
}
export const capitalChoiceName = (id: string) =>
  capitals.get(id)?.name ?? cities.get(id)?.name;
export const validCapitalChoice = (id: string) =>
  capitals.has(id) || cities.has(id);

/** Answer countries stay separate from distractors; city options carry their
 * own place IDs. Never offer a correct capital's alias as a wrong answer. */
export function capitalChoicePool(
  settings: Pick<StudySettings, "capitalDistractors">,
  studyPool: string[],
  targetId: string,
): string[] {
  const capital = capitals.get(targetId)!;
  let candidates: string[];
  switch (settings.capitalDistractors ?? "study") {
    case "region":
      candidates = CAPITALS.filter(
        (other) => other.continent === capital.continent,
      ).map((other) => other.countryId);
      break;
    case "countryCities":
      candidates = citiesByCountry.get(targetId) ?? [];
      break;
    case "globalCities":
      candidates = [...capitals.keys(), ...cities.keys()];
      break;
    case "globalCapitals":
      candidates = [...capitals.keys()];
      break;
    default:
      candidates = studyPool;
  }
  const seen = new Set([capital.name, ...capital.aliases].map(normalizeAnswer));
  return [
    targetId,
    ...candidates.filter((id) => {
      const label = capitalChoiceName(id);
      if (!label || id === targetId) return false;
      const normalized = normalizeAnswer(label);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    }),
  ];
}
export const hasCountryCityDistractors = (id: string) =>
  capitalChoicePool({ capitalDistractors: "countryCities" }, [], id).length > 1;
