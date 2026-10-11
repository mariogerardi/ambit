import type { Journey, Question } from "./questions";
import { CAPITALS, FEATURES, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import flagCatalog from "./data/flags.v1.json";

export const PACIFIC_ANDEAN_COUNTRIES = ["COL", "ECU", "PER", "CHL"].map(
  (code) => `wurl:${code}`,
);
const wellington = CAPITALS.find((c) => c.countryId === "wurl:NZL")!;
const base: Question = {
  id: "",
  title: "",
  label: "",
  topic: "Pacific geography",
  prompt: "",
  instruction: "",
  explanation: "",
  mode: "text",
  rule: { type: "manual-text", answers: [] },
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
  focus: { lat: 20, lng: 145, altitude: 1.5 },
  map: { borders: true, hover: false, muteOthers: true },
  source: { ...mapSource, reviewedOn: "2026-10-06" },
};

export const TENTH_JOURNEY: Journey = {
  id: "ring-of-fire-v1",
  title: "Around the Ring of Fire",
  description:
    "Trace the Pacific rim from Japan through Indonesia to the Andes and New Zealand. One ocean connects every stop.",
  rounds: [
    {
      ...base,
      id: "pacific-rising-sun",
      leadIn: "Begin on the western rim of the Pacific.",
      title: "Follow the sun.",
      label: "Flag",
      topic: "flags",
      prompt: "Which country flies this flag?",
      instruction: "",
      mode: "map-single",
      rule: { type: "flag-country", countryId: "wurl:JPN" },
      selection: { type: "members" },
      commitment: "immediate",
      image: {
        src: flagCatalog.flags.find((f) => f.countryId === "wurl:JPN")!.src,
        alt: "Flag clue: a red circle centered on a white field.",
        feedbackAlt: "National flag of Japan",
      },
      map: {
        borders: true,
        hover: true,
        muteOthers: false,
        candidates: "decorative",
      },
      explanation:
        "The red disc represents the sun. Our trip around the Pacific begins here.",
    },
    {
      ...base,
      id: "pacific-hokkaido",
      leadIn: "Stay in the same archipelago, but head to its northern end.",
      title: "An island apart.",
      label: "Island",
      topic: "islands",
      prompt:
        "What is the highlighted island, Japan’s northernmost main island, called?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["island:hokkaido"] },
      choices: [
        { id: "island:honshu", label: "Honshu" },
        { id: "island:shikoku", label: "Shikoku" },
        { id: "island:hokkaido", label: "Hokkaido" },
        { id: "island:kyushu", label: "Kyushu" },
        { id: "island:sakhalin", label: "Sakhalin" },
        { id: "island:taiwan", label: "Taiwan" },
      ],
      contextIds: ["wurl:JPN"],
      highlightParts: [
        {
          countryId: "wurl:JPN",
          point: { lat: 43.2, lng: 142.7 },
          name: "Hokkaido",
          reveal: "part",
        },
      ],
      focus: { lat: 43.2, lng: 142.7, altitude: 0.48 },
      explanation:
        "The Tsugaru Strait separates this northern island from Honshu.",
      source: {
        name: "Japan National Tourism Organization · Hokkaido",
        url: "https://www.japan.travel/en/destinations/hokkaido/hokkaido/",
        reviewedOn: "2026-10-06",
      },
    },
    {
      ...base,
      id: "pacific-indonesia-pin",
      leadIn: "Follow the island chain south toward the Equator.",
      title: "Pick an island.",
      label: "Drop a pin",
      topic: "archipelagos",
      prompt: "Place a pin anywhere on Indonesia’s land.",
      instruction: "",
      mode: "pin",
      rule: { type: "pin-inside", ids: ["wurl:IDN"] },
      focus: { lat: -5, lng: 118, altitude: 1.15 },
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "The archipelago bridges the Indian and Pacific oceans. A pin on any of its land counts.",
    },
    {
      ...base,
      id: "pacific-andes-coast",
      leadIn: "Cross the Pacific to the mountains on its eastern shore.",
      title: "Mountains meet ocean.",
      label: "Mountains",
      topic: "mountains and coastlines",
      prompt:
        "Which four countries have both Andean mountains and a Pacific coastline?",
      instruction: "",
      mode: "map-multiple",
      count: 4,
      rule: { type: "country-ids", ids: PACIFIC_ANDEAN_COUNTRIES },
      selection: {
        type: "ids",
        ids: CAPITALS.filter((c) => c.continent === "SA").map(
          (c) => c.countryId,
        ),
      },
      disclosure: {
        ...base.disclosure,
        hoverNames: true,
        committedNames: true,
      },
      focus: { lat: -17, lng: -65, altitude: 1.3 },
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      explanation:
        "Here the Andes meet the Pacific. The other Andean countries either lack a Pacific coast or are landlocked.",
      source: FEATURES.andes.source,
      sources: [FEATURES.andes.source, mapSource],
    },
    {
      ...base,
      id: "pacific-wellington",
      leadIn: "One last ocean crossing takes us to our southern finish.",
      title: "One last landing.",
      label: "Capital",
      topic: "capitals",
      prompt: "What is the capital of New Zealand?",
      instruction: "",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:NZL" },
      contextIds: ["wurl:NZL"],
      focus: { lat: -41, lng: 173, altitude: 0.8 },
      feedbackPlaces: [wellington],
      explanation:
        "At the southern tip of the North Island, the capital is our last landing on the Pacific rim.",
      source: capitalSource,
    },
  ],
};
