import type { Journey, Question } from "./questions";

const destinations = [
  {
    code: "FIN",
    name: "Finland",
    focus: { lat: 57, lng: 41, altitude: 1.15 },
    explanation:
      "Finland lies west of Russia, between Sweden and Russia, with the Gulf of Finland to its south.",
  },
  {
    code: "PRK",
    name: "North Korea",
    focus: { lat: 46, lng: 123, altitude: 1.15 },
    explanation:
      "North Korea lies south of China and southwest of Russia. Its short border with Russia meets the coast near the Tumen River.",
  },
  {
    code: "MNG",
    name: "Mongolia",
    focus: { lat: 40, lng: 113, altitude: 1.15 },
    explanation:
      "Mongolia is landlocked between Russia to the north and China to the south.",
  },
  {
    code: "GEO",
    name: "Georgia",
    focus: { lat: 38, lng: 36, altitude: 1.15 },
    explanation:
      "Georgia lies south of Russia in the Caucasus, east of the Black Sea and north of Türkiye and Armenia.",
  },
  {
    code: "EST",
    name: "Estonia",
    focus: { lat: 54, lng: 38, altitude: 1.15 },
    explanation:
      "Estonia lies west of Russia, south of the Gulf of Finland, and north of Latvia.",
  },
];

export const FIFTEENTH_JOURNEY: Journey = {
  id: "try-not-to-click-russia-v1",
  title: "On Russia’s doorstep",
  description:
    "Try not to click Russia! Drop a pin in five of its neighbors, with no borders or names to guide you.",
  rounds: destinations.map(
    ({ code, name, focus, explanation }): Question => ({
      id: `russia-neighbor-${code.toLowerCase()}`,
      label: "Drop a pin",
      progressLabel: name,
      topic: "Russia’s neighbors",
      title: `Try not to click Russia: ${name}`,
      prompt: `Drop a pin inside ${name}.`,
      instruction: "",
      mode: "pin",
      rule: { type: "pin-inside", ids: [`wurl:${code}`] },
      count: 1,
      selection: { type: "none" },
      disclosure: {
        hoverNames: false,
        namedChoices: false,
        committedNames: false,
        previousVisits: false,
      },
      commitment: "submit",
      failure: "feedback",
      focus,
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation,
      source: {
        name: "Natural Earth · country boundaries",
        url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
        reviewedOn: "2026-10-09",
      },
    }),
  ),
};
