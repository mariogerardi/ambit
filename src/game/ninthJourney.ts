import type { Focus } from "../geography/types";
import type { Journey, Question } from "./questions";
import { mapSource } from "./countryFacts";

/** Each answer is the unique intersection of the two countries' land neighbors. */
export const SHARED_NEIGHBOR_CLUES: {
  id: string;
  countries: [string, string];
  names: [string, string];
  answer: string;
  explanation: string;
  focus: Focus;
}[] = [
  {
    id: "pin-ivory-coast-benin",
    countries: ["wurl:CIV", "wurl:BEN"],
    names: ["Ivory Coast", "Benin"],
    answer: "wurl:BFA",
    explanation:
      "Both clues meet this landlocked neighbor in West Africa. Finding the shared border is only half the pin challenge.",
    focus: { lat: 6, lng: 0, altitude: 1.05 },
  },
  {
    id: "pin-bulgaria-georgia",
    countries: ["wurl:BGR", "wurl:GEO"],
    names: ["Bulgaria", "Georgia"],
    answer: "wurl:TUR",
    explanation:
      "Its long east–west footprint connects the Balkans to the Caucasus.",
    focus: { lat: 43, lng: 35, altitude: 0.95 },
  },
  {
    id: "pin-norway-belarus",
    countries: ["wurl:NOR", "wurl:BLR"],
    names: ["Norway", "Belarus"],
    answer: "wurl:RUS",
    explanation:
      "The same country meets both clues, despite how far apart they are. Its exclaves count too.",
    focus: { lat: 58, lng: 20, altitude: 1.1 },
  },
  {
    id: "pin-eswatini-zambia",
    countries: ["wurl:SWZ", "wurl:ZMB"],
    names: ["Eswatini", "Zambia"],
    answer: "wurl:MOZ",
    explanation:
      "Its long coastal outline hides a less obvious inland connection to both clues.",
    focus: { lat: -20, lng: 25, altitude: 1.1 },
  },
  {
    id: "pin-chile-colombia",
    countries: ["wurl:CHL", "wurl:COL"],
    names: ["Chile", "Colombia"],
    answer: "wurl:PER",
    explanation:
      "Both clues meet this country at opposite ends of its Andean footprint.",
    focus: { lat: -15, lng: -65, altitude: 1.25 },
  },
];

export const NINTH_JOURNEY: Journey = {
  id: "shared-neighbors-v1",
  title: "Shared neighbors",
  description:
    "Two neighbors name the country; an unfamiliar outline makes pinning it another challenge. Find the shared neighbor five times.",
  rounds: SHARED_NEIGHBOR_CLUES.map(
    (clue): Question => ({
      id: clue.id,
      title: "One shared neighbor.",
      label: "Drop a pin",
      progressLabel: `${clue.names[0]} + ${clue.names[1]}`,
      topic: "shared land borders",
      prompt: `Place a pin inside the country that shares a land border with both ${clue.names[0]} and ${clue.names[1]}.`,
      instruction: "",
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
      contextIds: [...clue.countries],
      focus: clue.focus,
      map: {
        borders: false,
        borderIds: [...clue.countries],
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation: clue.explanation,
      source: { ...mapSource, reviewedOn: "2026-10-06" },
    }),
  ),
};
