import { referenceCity } from "./helpReferences";
import { defineQuestion } from "./questionBuilder";
import type { Focus } from "../geography/types";
import type { Journey, Question } from "./questionContracts";
import { mapSource } from "./countryFacts";

/** Each pair has exactly one shared neighbor in the canonical land-border graph. */
export const SHARED_NEIGHBOR_TWO_CLUES: {
  id: string;
  countries: [string, string];
  names: [string, string];
  answer: string;
  answerName: string;
  explanation: string;
  focus: Focus;
  guidance: NonNullable<Question["guidance"]>;
}[] = [
  {
    id: "shared-neighbors-two-suriname-colombia",
    countries: ["wurl:SUR", "wurl:COL"],
    names: ["Suriname", "Colombia"],
    answer: "wurl:BRA",
    answerName: "Brazil",
    focus: { lat: 2, lng: -60, altitude: 1.25 },
    guidance: {
      hint: "Look south of both reference countries, toward the Amazon basin.",
      assist: {
        text: "Georgetown and Quito are now marked. Search south of the Guianas and east of the Andes.",
        places: [referenceCity("Georgetown"), referenceCity("Quito")],
        focus: { lat: -3, lng: -59, altitude: 1.05 },
      },
    },
    explanation:
      "Brazil meets Suriname along the southern edge of the Guianas and Colombia farther west. Those two borders belong to the same enormous country stretching across much of South America.",
  },
  {
    id: "shared-neighbors-two-tanzania-namibia",
    countries: ["wurl:TZA", "wurl:NAM"],
    names: ["Tanzania", "Namibia"],
    answer: "wurl:ZMB",
    answerName: "Zambia",
    focus: { lat: -16, lng: 26, altitude: 1.15 },
    guidance: {
      hint: "Follow Namibia's narrow northeastern extension. Tanzania's relevant border is in its southwest.",
      assist: {
        text: "Windhoek and Harare are now marked. Look north of Harare for the inland country reaching Namibia's northeastern tip and southwestern Tanzania.",
        places: [referenceCity("Windhoek"), referenceCity("Harare")],
        focus: { lat: -15, lng: 28, altitude: 0.8 },
      },
    },
    explanation:
      "Zambia borders Tanzania to the northeast and Namibia to the southwest. Namibia's narrow northeastern extension reaches far enough inland to make that less obvious connection.",
  },
  {
    id: "shared-neighbors-two-croatia-north-macedonia",
    countries: ["wurl:HRV", "wurl:MKD"],
    names: ["Croatia", "North Macedonia"],
    answer: "wurl:SRB",
    answerName: "Serbia",
    focus: { lat: 43.5, lng: 20, altitude: 0.65 },
    guidance: {
      hint: "Look inland in the central Balkans, east of the Adriatic coast.",
      assist: {
        text: "Sarajevo and Sofia are now marked. Search between them, north of North Macedonia and east of Croatia.",
        places: [referenceCity("Sarajevo"), referenceCity("Sofia")],
        focus: { lat: 43.5, lng: 21, altitude: 0.43 },
      },
    },
    explanation:
      "Serbia meets Croatia on its western side and North Macedonia at its southern end. The shared neighbor is inland, away from Croatia's long Adriatic coastline.",
  },
  {
    id: "shared-neighbors-two-senegal-liberia",
    countries: ["wurl:SEN", "wurl:LBR"],
    names: ["Senegal", "Liberia"],
    answer: "wurl:GIN",
    answerName: "Guinea",
    focus: { lat: 10, lng: -12, altitude: 0.75 },
    guidance: {
      hint: "Their common neighbor has an Atlantic coast but also reaches far inland between the two clues.",
      assist: {
        text: "Bissau and Freetown are now marked. Look northeast of Freetown for a country reaching both highlighted neighbors.",
        places: [referenceCity("Bissau"), referenceCity("Freetown")],
        focus: { lat: 10.5, lng: -11, altitude: 0.5 },
      },
    },
    explanation:
      "Guinea meets Senegal along its northern edge and Liberia along its southeastern edge. Its inland reach connects the two clues even though a coastal journey between them passes through other countries.",
  },
  {
    id: "shared-neighbors-two-laos-malaysia",
    countries: ["wurl:LAO", "wurl:MYS"],
    names: ["Laos", "Malaysia"],
    answer: "wurl:THA",
    answerName: "Thailand",
    focus: { lat: 12, lng: 105, altitude: 1.05 },
    guidance: {
      hint: "A broad northern mainland narrows into a long peninsula toward the southern clue.",
      assist: {
        text: "Yangon and Phnom Penh are now marked. Look between them for the country that extends south along the Malay Peninsula.",
        places: [referenceCity("Yangon"), referenceCity("Phnom Penh")],
        focus: { lat: 13, lng: 101, altitude: 0.8 },
      },
    },
    explanation:
      "Thailand meets Laos along its northeastern and eastern side, then stretches south down the Malay Peninsula to Malaysia. One shared neighbor connects a broad mainland with a much narrower southern arm.",
  },
];

export const SHARED_NEIGHBORS_TWO_JOURNEY: Journey = {
  id: "shared-neighbors-two-v1",
  addedAt: "2026-10-23",
  title: "Shared Neighbors II",
  description:
    "Five new pairs point to five shared neighbors. Follow inland extensions, Balkan borders and a long peninsula to place each missing country on the globe.",
  rounds: SHARED_NEIGHBOR_TWO_CLUES.map(
    (clue): Question =>
      defineQuestion({
        id: clue.id,
        visualExceptions: {
          "open-search-background":
            "The target footprint is withheld; the map is an unrestricted search field.",
          "hidden-boundaries":
            "Infer the shared neighbor and estimate its footprint from the given reference countries and coastlines.",
        },
        title: "One shared neighbor.",
        label: "Shared neighbor",
        resolvedLabel: clue.answerName,
        progressLabel: `${clue.names[0]} + ${clue.names[1]}`,
        topic: "shared land borders",
        prompt: `Place a pin inside the country that shares a land border with both ${clue.names[0]} and ${clue.names[1]}.`,
        instruction:
          "Country borders are hidden; estimate using the coastlines and reference countries.",
        mode: "pin",
        rule: { type: "pin-inside", ids: [clue.answer] },
        count: 1,
        selection: { type: "none" },
        commitment: "submit",
        failure: "feedback",
        disclosure: {
          hoverNames: false,
          namedChoices: false,
          committedNames: false,
          previousVisits: false,
        },
        guidance: clue.guidance,
        explanation: clue.explanation,
        source: { ...mapSource, reviewedOn: "2026-10-23" },
        scenes: {
          play: {
            contextIds: [...clue.countries],
            focus: clue.focus,
            map: {
              background: "open-search",
              borders: false,
              borderIds: [...clue.countries],
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
            },
          },
        },
      }),
  ),
  completion: {
    focus: { lat: 15, lng: 20, altitude: 1.9 },
    views: SHARED_NEIGHBOR_TWO_CLUES.map((clue) => clue.focus),
    physicalFeatures: [],
    places: [],
    caption:
      "A vast Amazonian neighbor, a narrow reach into southern Africa, an inland Balkan connection, a West African frontier and a long Asian peninsula: five pairs reveal how differently one country can connect two others.",
  },
};
