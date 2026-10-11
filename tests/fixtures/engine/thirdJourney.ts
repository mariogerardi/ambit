import type { Journey, Question } from "../../../src/game/questions";
import { mapSource } from "../../../src/game/countryFacts";
import {
  capitalSource,
  FEATURES,
  languageFamilySource,
  tajikSource,
} from "../../../src/game/quizData";

const centralAsia = ["KAZ", "KGZ", "TKM", "UZB", "TJK"].map((c) => `wurl:${c}`);
const capitalRoute = ["AZE", "RUS", "KAZ", "UZB", "TJK"].map(
  (c) => `wurl:${c}`,
);
const base: Question = {
  title: "",
  id: "",
  label: "",
  topic: "",
  prompt: "",
  instruction: "",
  mode: "map-single",
  rule: { type: "country-ids", ids: [] },
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
  focus: { lat: 40, lng: 62, altitude: 1.5 },
  explanation: "",
  source: mapSource,
};
export const THIRD_JOURNEY: Journey = {
  id: "silk-roads-v1",
  title: "Across the Silk Roads",
  description:
    "Across Central Asia, languages and borders trace different paths through the same landscape.",
  rounds: [
    {
      qualification:
        "This comparison uses the main national language. Each country also has other language communities.",
      ...base,
      id: "central-asia-families",
      label: "Families",
      topic: "language families",
      title: "One language, another family.",
      prompt:
        "Which highlighted Central Asian country has a main national language outside the Turkic family?",
      instruction: "",
      rule: {
        type: "language-family",
        countryIds: centralAsia,
        familyId: "family:turkic",
        relation: "is-not",
      },
      selection: { type: "ids", ids: centralAsia },
      disclosure: {
        ...base.disclosure,
        hoverNames: true,
        namedChoices: true,
        committedNames: true,
      },
      commitment: "immediate",
      map: {
        borders: true,
        hover: true,
        muteOthers: false,
        candidates: "highlighted",
      },
      explanation:
        "Tajik belongs to the Iranian branch of the Indo-European language family. The other four countries’ main national languages are Turkic.",
      source: languageFamilySource,
      sources: [languageFamilySource, tajikSource],
    },
    {
      ...base,
      id: "tajikistan-armenia-crossings",
      label: "Crossings",
      topic: "land borders",
      title: "Across the mountains.",
      prompt:
        "What is the fewest number of land-border crossings from Tajikistan to Armenia?",
      instruction:
        "Use shared land borders, regardless of roads or checkpoints.",
      mode: "number",
      inputLabel: "Minimum border crossings",
      rule: { type: "shortest-borders", from: "wurl:TJK", to: "wurl:ARM" },
      contextIds: ["wurl:TJK", "wurl:ARM"],
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnCorrect: true,
      },
      explanation:
        "Only geographic shared land borders count; this is not a question about currently open roads or border checkpoints.",
    },
    {
      ...base,
      id: "caspian-shores",
      label: "Caspian",
      topic: "coastlines",
      title: "One sea, how many shores?",
      prompt: "How many countries border the Caspian Sea?",
      instruction: "",
      mode: "number",
      inputLabel: "Number of bordering countries",
      rule: { type: "feature-count", featureId: "caspian" },
      focus: { lat: 42, lng: 51, altitude: 1.15 },
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      places: [
        {
          id: "clue:caspian",
          name: "Caspian Sea",
          kind: "other",
          lat: 42,
          lng: 51,
          sourceId: "curated:caspian-clue-v1",
        },
      ],
      explanation:
        "The five countries have coastlines on the Caspian. Islands and maritime boundaries are not extra countries.",
      source: FEATURES.caspian.source,
    },
    {
      ...base,
      id: "nakhchivan-owner",
      label: "Exclave",
      topic: "enclaves and exclaves",
      title: "Separated, but still connected.",
      prompt: "Which country does the highlighted exclave belong to?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "territory-owner", countryId: "wurl:AZE" },
      choices: [
        { id: "wurl:ARM", label: "Armenia" },
        { id: "wurl:AZE", label: "Azerbaijan" },
        { id: "wurl:GEO", label: "Georgia" },
        { id: "wurl:IRN", label: "Iran" },
        { id: "wurl:RUS", label: "Russia" },
        { id: "wurl:TUR", label: "Türkiye" },
      ],
      highlightParts: [
        { countryId: "wurl:AZE", point: { lat: 39.21, lng: 45.41 } },
      ],
      focus: { lat: 39.3, lng: 45.6, altitude: 0.3 },
      explanation:
        "The highlighted territory is Nakhchivan, an autonomous republic and exclave of Azerbaijan. Armenia separates it from Azerbaijan's main territory. Exclave is the precise term here because it borders more than one neighboring country.",
      source: {
        name: "Azerbaijan Presidential Library · Nakhchivan Autonomous Republic",
        url: "https://nakhchivan.preslib.az/en_a3-0.html",
        reviewedOn: "2026-10-05",
      },
    },
    {
      ...base,
      id: "silk-road-capitals",
      label: "Capitals",
      topic: "capitals along a route",
      title: "Five stops on the road home.",
      prompt: "Name the capitals along this route, in order.",
      instruction: "",
      mode: "ordered-capitals",
      rule: { type: "capital-order", countryIds: capitalRoute },
      count: 5,
      contextIds: capitalRoute,
      focus: { lat: 44, lng: 63, altitude: 1.6 },
      map: {
        borders: true,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "These capitals correspond to the five countries on the specified route. Each successive pair of countries shares a land border.",
      source: capitalSource,
      sources: [capitalSource, mapSource],
    },
  ],
};
