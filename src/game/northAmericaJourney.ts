import { FIFTH_JOURNEY, CANADIAN_TERRITORIES } from "./fifthJourney";
import type { Journey } from "./questions";

export const MEXICO_BORDER_STATES = ["CA", "AZ", "NM", "TX"].map(
  (code) => `wurl:USA-${code}`,
);

/** Revised edition; published v1 remains loadable for existing results. */
export const NORTH_AMERICA_JOURNEY: Journey = {
  ...FIFTH_JOURNEY,
  id: "north-america-v2",
  description:
    "Travel from Canada’s northern territories to the Mexican border, then find your way across the United States. Names, latitude, and borders are your guides.",
  rounds: FIFTH_JOURNEY.rounds.map((question, index) => ({
    ...question,
    id: `${question.id}-v2`,
    ...(index === 0
      ? {
          prompt: "Name one of Canada’s three northern territories.",
          count: 1,
          rule: {
            type: "region-ids" as const,
            ids: CANADIAN_TERRITORIES,
            match: "any" as const,
          },
        }
      : {}),
    ...(index === 2
      ? {
          id: "state-bordering-mexico-v2",
          label: "Southern border",
          title: "Across the southern border.",
          prompt: "Name a U.S. state that borders Mexico.",
          instruction: "",
          count: 1,
          rule: {
            type: "region-ids" as const,
            ids: MEXICO_BORDER_STATES,
            match: "any" as const,
          },
          focus: { lat: 32, lng: -106, altitude: 1.3 },
          explanation:
            "California, Arizona, New Mexico, and Texas border Mexico. Any one qualifies; postal abbreviations are accepted too.",
          source: {
            name: "U.S. Customs and Border Protection · Southwest Region",
            url: "https://www.cbp.gov/sites/default/files/2025-07/250728%20AMO%20Southwest%20Region_0.pdf",
            reviewedOn: "2026-10-10",
          },
        }
      : {}),
  })),
};
