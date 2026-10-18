import { defineQuestion } from "./questionBuilder";
import type { Journey, Question } from "./questionContracts";

const destinations = [
  {
    code: "FIN",
    name: "Finland",
    focus: { lat: 57, lng: 41, altitude: 1.15 },
    explanation:
      "Between Sweden and Russia, with the Gulf of Finland to the south. Our first landing stays just west of the giant neighbor.",
  },
  {
    code: "PRK",
    name: "North Korea",
    focus: { lat: 46, lng: 123, altitude: 1.15 },
    explanation:
      "The short Russian border meets the coast near the Tumen River. There’s less room for this landing.",
  },
  {
    code: "MNG",
    name: "Mongolia",
    focus: { lat: 40, lng: 113, altitude: 1.15 },
    explanation:
      "Russia lies to the north, China to the south. This landlocked stop gives the pin more room.",
  },
  {
    code: "GEO",
    name: "Georgia",
    focus: { lat: 38, lng: 36, altitude: 1.15 },
    explanation:
      "On the Black Sea’s eastern side, the Caucasus marks our next landing south of Russia.",
  },
  {
    code: "EST",
    name: "Estonia",
    focus: { lat: 54, lng: 38, altitude: 1.15 },
    explanation:
      "Back beside the Gulf of Finland, north of Latvia. Our loop ends close to where it began.",
  },
];

export const FIFTEENTH_JOURNEY: Journey = {
  id: "try-not-to-click-russia-v1",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "On Russia’s doorstep",
  description:
    "Try not to click Russia! Drop a pin in five of its neighbors, with no borders or names to guide you.",
  rounds: destinations.map(
    ({ code, name, focus, explanation }): Question =>
      defineQuestion({
        id: `russia-neighbor-${code.toLowerCase()}`,
        label: "Drop a pin",
        progressLabel: name,
        topic: "Russia’s neighbors",
        title: `Try not to click Russia: ${name}`,
        prompt: `Drop a pin inside ${name}.`,
        leadIn: {
          FIN: "Start on the western side of the giant neighbor.",
          PRK: "Jump east to its short border near the Pacific.",
          MNG: "Move inland to a broad landlocked neighbor.",
          GEO: "Head west again, this time to the Caucasus.",
          EST: "Circle back toward the Baltic for our final landing.",
        }[code],
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
        explanation,
        source: {
          name: "Natural Earth · country boundaries",
          url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
          reviewedOn: "2026-10-09",
        },
        scenes: {
          play: {
            map: {
              borders: false,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
            },
          },
        },
      }),
  ),
};
