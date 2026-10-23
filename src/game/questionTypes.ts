import { MECHANICS } from "./mechanics";
import type { AnswerMode, Question } from "./questionContracts";

export const ANSWER_TYPES: Partial<Record<AnswerMode, string>> =
  Object.fromEntries(
    Object.entries(MECHANICS)
      .filter(([, mechanic]) => mechanic.visible)
      .map(([mode, mechanic]) => [mode, mechanic.label]),
  );
export const RULE_TYPES: Record<Question["rule"]["type"], string> = {
  "labeled-region-pin-set": "Independent labeled pins inside reviewed regions",
  "country-set-recall": "Progressive country recall with a mistake budget",
  "raster-overlap": "Painted overlap with a reviewed area mask",
  "island-coverage-max": "Whole islands enclosed by a fixed geodesic circle",
  "point-coverage-max": "Maximum point coverage with a fixed circle",
  "line-following": "Reviewed path coverage and deviation",
  "population-coverage-area-budget": "Population captured within a land budget",
  "population-balance": "Population shares across a geodesic cut",
  "bearing-angle": "Initial great-circle bearing",
  "pin-distance": "Place a pin near a local place",
  "pin-inside": "Place a pin inside a territory",
  "place-ids": "Select city markers",
  "manual-text": "Authored text and aliases",
  "manual-number": "Authored number",
  "numeric-range": "Estimate within a numeric tolerance",
  "merged-region": "One composite territory from canonical countries",
  "region-ids": "Authored region set",
  "choice-ids": "Reviewed choice set",
  "slot-matches": "Reviewed card-to-role matches",
  "capital-name": "Recall a country’s capital",
  "country-fact": "Find a country from a fact",
  "text-fact": "Recall a country fact",
  "country-ids": "Authored country set",
  "name-length": "Country name length",
  "shortest-borders": "Minimum border crossings",
  "great-circle-order": "Great-circle country traversal",
  "flag-country": "Country from a flag",
  "territory-owner": "Identify an exclave's country",
  "feature-count": "Count a feature's bordering countries",
  "capital-order": "Capitals along a country route",
  "language-family": "National language family",
  "official-languages": "Official language membership",
  "physical-feature": "Physical feature membership",
  "capital-coordinate": "Capital coordinate comparison",
  "capital-circle": "Capitals within a circle",
  "country-circle": "Whole countries within a circle",
};
