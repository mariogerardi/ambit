import type { PhysicalFeature } from "../geography/types";
import {
  referenceCity,
  referenceFeature,
  referenceLabel,
} from "./helpReferences";
import andesContext from "./data/andes-context.v1.json";
import andesRelief from "./data/andes-relief.v1.json";
import { defineQuestion } from "./questionBuilder";
import type { Focus } from "../geography/types";
import type { Journey, Question } from "./questionContracts";
import { mapSource } from "./countryFacts";

/** Each answer is the unique intersection of the two countries' land neighbors. */
export const SHARED_NEIGHBOR_CLUES: {
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
    id: "pin-ivory-coast-benin",
    guidance: {
      hint: "Their shared neighbor is inland, north of the coastal countries between the two clues.",
      assist: {
        text: "Accra and Lomé are now marked. Search inland, north of these coastal cities.",
        places: [referenceCity("Accra"), referenceCity("Lomé")],
        focus: { lat: 10, lng: -1, altitude: 0.8 },
      },
    },
    countries: ["wurl:CIV", "wurl:BEN"],
    names: ["Ivory Coast", "Benin"],
    answer: "wurl:BFA",
    answerName: "Burkina Faso",
    explanation:
      "Burkina Faso reaches both Ivory Coast and Benin from inland. The two coastal countries are separated along the Gulf of Guinea, but share a neighbor to the north.",
    focus: { lat: 6, lng: 0, altitude: 1.05 },
  },
  {
    id: "pin-bulgaria-georgia",
    guidance: {
      hint: "Look along the southern side of the Black Sea.",
      assist: {
        text: "Bucharest and Yerevan are now marked, along with the Black and Aegean seas. Search between the Balkans and Caucasus.",
        places: [
          referenceCity("Bucharest"),
          referenceCity("Yerevan"),
          referenceLabel("Aegean Sea", 38, 25),
        ],
        physicalFeatures: [referenceFeature("Black Sea")],
        focus: { lat: 40, lng: 31, altitude: 0.85 },
      },
    },
    countries: ["wurl:BGR", "wurl:GEO"],
    names: ["Bulgaria", "Georgia"],
    answer: "wurl:TUR",
    answerName: "Türkiye",
    explanation:
      "Türkiye meets Bulgaria at its European end and Georgia at its Caucasian end. A long east–west country connects two very different stretches of the Black Sea region.",
    focus: { lat: 43, lng: 35, altitude: 0.95 },
  },
  {
    id: "pin-norway-belarus",
    guidance: {
      hint: "Norway’s relevant border is at its far northeastern end, well beyond Oslo.",
      assist: {
        text: "Helsinki and Vilnius are now marked. Use the Barents Sea to orient the larger landmass east of the two clues.",
        places: [
          referenceCity("Helsinki"),
          referenceCity("Vilnius"),
          referenceLabel("Barents Sea", 73, 38),
        ],
        focus: { lat: 63, lng: 35, altitude: 1.15 },
      },
    },
    countries: ["wurl:NOR", "wurl:BLR"],
    names: ["Norway", "Belarus"],
    answer: "wurl:RUS",
    answerName: "Russia",
    explanation:
      "Russia meets Norway in the far north and Belarus much farther south. A shared neighbor can connect countries that are nowhere near each other.",
    focus: { lat: 58, lng: 20, altitude: 1.1 },
  },
  {
    id: "pin-eswatini-zambia",
    guidance: {
      hint: "Look for an Indian Ocean country extending northward from beside Eswatini.",
      assist: {
        text: "Johannesburg and Harare are now marked. Use the Indian Ocean to orient your search along southeastern Africa.",
        places: [referenceCity("Johannesburg"), referenceCity("Harare")],
        physicalFeatures: [referenceFeature("Indian Ocean")],
        focus: { lat: -20, lng: 32, altitude: 0.9 },
      },
    },
    countries: ["wurl:SWZ", "wurl:ZMB"],
    names: ["Eswatini", "Zambia"],
    answer: "wurl:MOZ",
    answerName: "Mozambique",
    explanation:
      "Mozambique meets Eswatini near its southern end and Zambia much farther north. Its long Indian Ocean coast can draw attention away from those inland connections.",
    focus: { lat: -20, lng: 25, altitude: 1.1 },
  },
  {
    id: "pin-chile-colombia",
    guidance: {
      hint: "Look along the Pacific side of the Andes, between the two reference countries.",
      assist: {
        text: "Guayaquil and La Paz are now marked outside the target country. Use the Andes to estimate a landing between the clues.",
        places: [referenceCity("Guayaquil"), referenceCity("La Paz", "BOL")],
        physicalFeatures: [
          { ...(andesContext.andes as PhysicalFeature), relief: andesRelief },
        ],
        focus: { lat: -12, lng: -74, altitude: 1.05 },
      },
    },
    countries: ["wurl:CHL", "wurl:COL"],
    names: ["Chile", "Colombia"],
    answer: "wurl:PER",
    answerName: "Peru",
    explanation:
      "Peru meets Colombia in the north and Chile in the south. The Andes and the Pacific run along a country that links the two distant clues.",
    focus: { lat: -15, lng: -65, altitude: 1.25 },
  },
];

export const NINTH_JOURNEY: Journey = {
  id: "shared-neighbors-v1",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "Shared neighbors",
  description:
    "Two countries can point to a third. Follow five pairs of neighbors across inland frontiers, long coasts, and mountain borders to find the land between them.",
  rounds: SHARED_NEIGHBOR_CLUES.map(
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
          "Country borders are hidden. Use the coastlines and the two reference countries to estimate your pin.",
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
        source: { ...mapSource, reviewedOn: "2026-10-06" },
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
    views: SHARED_NEIGHBOR_CLUES.map((clue) => clue.focus),
    physicalFeatures: [],
    places: [],
    caption:
      "A shared neighbor may sit inland, span a sea’s southern shore, or stretch between distant borders. Across five pairs, the same relationship takes five very different shapes.",
  },
};
