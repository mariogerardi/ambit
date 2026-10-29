import { COUNTRIES, capitalOf } from "./engine";
import type { StudySettings } from "./engine";

export const STUDY_CONTINENTS: Record<string, string> = {
  AF: "Africa",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  SA: "South America",
  OC: "Oceania",
};

export function continentCountryIds(continents: string[]) {
  return COUNTRIES.filter((country) =>
    continents.includes(capitalOf(country.id).continent),
  ).map((country) => country.id);
}

/** Recognize whole-continent combinations stored using the existing custom scope. */
export function selectedContinents(settings: StudySettings): string[] {
  if (settings.scope === "continent") return [settings.continent];
  if (settings.scope !== "custom" || !settings.countryIds.length) return [];
  const selected = new Set(settings.countryIds);
  const continents = Object.keys(STUDY_CONTINENTS).filter((continent) =>
    continentCountryIds([continent]).every((id) => selected.has(id)),
  );
  return continentCountryIds(continents).length === selected.size
    ? continents
    : [];
}
