import type { PhysicalFeature } from "../geography/types";
import { referenceCity, referenceLabel } from "./helpReferences";
import andesContext from "./data/andes-context.v1.json";
import andesRelief from "./data/andes-relief.v1.json";
import { defineQuestion, definePresentation } from "./questionBuilder";
import type { Journey } from "./questionContracts";
import { CAPITALS, FEATURES, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import flagCatalog from "./data/flags.v1.json";

export const PACIFIC_ANDEAN_COUNTRIES = ["COL", "ECU", "PER", "CHL"].map(
  (code) => `wurl:${code}`,
);
const wellington = CAPITALS.find((c) => c.countryId === "wurl:NZL")!;
const base = definePresentation({
  label: "",
  topic: "Pacific geography",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 20, lng: 145, altitude: 1.5 },
  map: { borders: true, hoverFeedback: false, muteOthers: true },
  source: { ...mapSource, reviewedOn: "2026-10-06" },
});

export const TENTH_JOURNEY: Journey = {
  id: "ring-of-fire-v1",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "Pacific Landfalls",
  description:
    "Island chains, narrow straits, a mountain-lined continent: follow the changing shores of the Pacific to a final harbor in New Zealand.",
  rounds: [
    defineQuestion({
      count: 1,

      ...base,
      id: "pacific-rising-sun",
      resolvedLabel: "Japan",
      guidance: {
        hint: "Look for an island country east of the Korean Peninsula.",
        assist: {
          text: "Japan, South Korea, and China remain. Compare their shapes without country labels.",
          candidateIds: ["wurl:JPN", "wurl:KOR", "wurl:CHN"],
          focus: { lat: 36, lng: 132, altitude: 1 },
        },
      },
      leadIn:
        "Begin off the eastern coast of Asia, among the Pacific’s island countries.",
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
      explanation:
        "The red disc represents the sun. Japan’s islands form our first Pacific shore; next, look more closely at the land and water within the chain.",
      scenes: {
        play: {
          map: {
            borders: true,
            hoverFeedback: true,
            muteOthers: true,
            candidates: "neutral",
          },
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "pacific-hokkaido",
      resolvedLabel: "Hokkaido",
      guidance: {
        hint: "Sapporo is the principal city on this island.",
        assist: {
          text: "Sapporo is now marked. Hokkaido, Honshu, and Sakhalin remain as named choices.",
          candidateIds: ["island:hokkaido", "island:honshu", "island:sakhalin"],
          places: [referenceCity("Sapporo")],
        },
      },
      leadIn: "Follow Japan’s island chain north.",
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
      highlightParts: [
        {
          countryId: "wurl:JPN",
          point: { lat: 43.2, lng: 142.7 },
          name: "Hokkaido",
          reveal: "part",
        },
      ],
      explanation:
        "The Tsugaru Strait separates Hokkaido from Honshu. Even within one country, a narrow stretch of sea can divide two large pieces of land.",
      source: {
        name: "Japan National Tourism Organization · Hokkaido",
        url: "https://www.japan.travel/en/destinations/hokkaido/hokkaido/",
        reviewedOn: "2026-10-06",
      },
      scenes: {
        play: {
          contextIds: ["wurl:JPN"],
          focus: { lat: 43.2, lng: 142.7, altitude: 0.48 },
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "pacific-indonesia-pin",
      resolvedLabel: "Indonesia",
      visualExceptions: {
        "open-search-background":
          "The island country’s footprint is withheld within an unrestricted pin search field.",
        "hidden-boundaries":
          "Identify the country’s islands from their shapes without political borders.",
      },
      guidance: {
        hint: "Look along the island chain between mainland Southeast Asia and Australia.",
        assist: {
          text: "Singapore and Darwin are now marked outside the target country. Search along the archipelago between them.",
          places: [referenceCity("Singapore"), referenceCity("Darwin")],
          focus: { lat: -5, lng: 120, altitude: 1.15 },
        },
      },
      leadIn: "Farther southwest, islands stretch between two oceans.",
      title: "Pick an island.",
      label: "Archipelago",
      topic: "archipelagos",
      prompt: "Place a pin anywhere on Indonesia’s land.",
      instruction:
        "Country borders are hidden. Use the island shapes to estimate your pin.",
      mode: "pin",
      rule: { type: "pin-inside", ids: ["wurl:IDN"] },
      explanation:
        "Indonesia spreads across an archipelago between the Indian and Pacific oceans. Its many islands form a country whose connections run across water.",
      scenes: {
        play: {
          focus: { lat: -5, lng: 118, altitude: 1.15 },
          map: {
            background: "open-search",
            borders: false,
            hoverFeedback: false,
            muteOthers: true,
            revealOnAnswer: true,
          },
        },
      },
    }),
    defineQuestion({
      commitment: "submit",

      ...base,
      id: "pacific-andes-coast",
      resolvedLabel: "Pacific-facing Andes",
      guidance: {
        hint: "Follow the mountain chain along South America’s western side. Which countries also reach the ocean to its west?",
        assist: {
          text: "The Andes are now shown. Of the six remaining countries, one is landlocked and another faces the Atlantic. Find the four with Pacific shores.",
          candidateIds: [
            "wurl:COL",
            "wurl:ECU",
            "wurl:PER",
            "wurl:CHL",
            "wurl:BOL",
            "wurl:ARG",
          ],
          physicalFeatures: [
            { ...(andesContext.andes as PhysicalFeature), relief: andesRelief },
          ],
          focus: { lat: -20, lng: -70, altitude: 1.5 },
        },
      },
      leadIn: "Cross to the Pacific’s eastern shore.",
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
      explanation:
        "Colombia, Ecuador, Peru, and Chile share both the mountain chain and a Pacific shore. Argentina’s coast faces the Atlantic, while Bolivia is landlocked: the same mountains do not give every country the same ocean.",
      source: FEATURES.andes.source,
      sources: [FEATURES.andes.source, mapSource],
      scenes: {
        play: {
          focus: { lat: -17, lng: -65, altitude: 1.3 },
          map: {
            borders: true,
            hoverFeedback: true,
            muteOthers: true,
            candidates: "highlighted",
          },
        },
      },
    }),
    defineQuestion({
      mode: "text",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "pacific-wellington",
      resolvedLabel: "Wellington",
      guidance: {
        hint: "It sits at the southern end of the North Island, beside the strait between the main islands.",
        assist: {
          text: "Auckland, Christchurch, and Cook Strait are now marked. The capital’s name begins with W.",
          places: [
            referenceCity("Auckland"),
            referenceCity("Christchurch"),
            referenceLabel("Cook Strait", -41.2, 174.4),
          ],
          focus: { lat: -40, lng: 174, altitude: 0.7 },
        },
      },
      leadIn: "Cross back into the South Pacific for a final harbor.",
      title: "One last landing.",
      label: "Capital",
      topic: "capitals",
      prompt: "What is the capital of New Zealand?",
      instruction: "",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:NZL" },
      explanation:
        "Wellington sits beside a harbor at the southern end of the North Island, near Cook Strait. Our last landfall brings us back to the water between islands.",
      source: capitalSource,
      scenes: {
        play: {
          contextIds: ["wurl:NZL"],
          focus: { lat: -41, lng: 173, altitude: 0.8 },
        },
        reveal: { places: [wellington] },
      },
    }),
  ],
  completion: {
    focus: { lat: 0, lng: -160, altitude: 1.9 },
    views: [
      { lat: 36, lng: 139, altitude: 1.05 },
      { lat: 44, lng: 143, altitude: 0.5 },
      { lat: -3, lng: 118, altitude: 1.15 },
      { lat: -17, lng: -68, altitude: 1.45 },
      { lat: -41.2, lng: 174.8, altitude: 0.55 },
    ],
    physicalFeatures: [
      { ...(andesContext.andes as PhysicalFeature), relief: andesRelief },
    ],
    places: [],
    caption:
      "From Japan’s straits through Indonesia’s archipelago, across to the Pacific-facing Andes and back to Wellington’s harbor: one ocean meets many forms of land. The water between these places is part of what connects them.",
  },
};
