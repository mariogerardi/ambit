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
    "Across the Pacific, islands, mountains, and capitals connect one Journey.",
  rounds: [
    {
      ...base,
      id: "pacific-rising-sun",
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
        "Japan’s flag is a red sun on white. First stop: the Japanese islands.",
    },
    {
      ...base,
      id: "pacific-hokkaido",
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
        "Hokkaido is the northernmost of Japan’s four main islands. The narrow Tsugaru Strait separates it from Honshu.",
      source: {
        name: "Japan National Tourism Organization · Hokkaido",
        url: "https://www.japan.travel/en/destinations/hokkaido/hokkaido/",
        reviewedOn: "2026-10-06",
      },
    },
    {
      ...base,
      id: "pacific-indonesia-pin",
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
        "Indonesia spans an archipelago between the Indian and Pacific oceans. Java, Sumatra, and its portions of Borneo and New Guinea all count.",
    },
    {
      ...base,
      id: "pacific-andes-coast",
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
        "Colombia, Ecuador, Peru, and Chile meet both conditions. Bolivia is landlocked; Argentina and Venezuela have Andean mountains but no Pacific coastline.",
      source: FEATURES.andes.source,
      sources: [FEATURES.andes.source, mapSource],
    },
    {
      ...base,
      id: "pacific-wellington",
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
        "Wellington is New Zealand’s capital, at the southern tip of the North Island.",
      source: capitalSource,
    },
  ],
};
