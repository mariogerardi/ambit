import type { FactSource, Journey, Question } from "./questions";
import type { PlaceFeature, RegionFeature } from "../geography/types";
import geography from "./data/exceptions-geography.v1.json";
import { ANSWER_PLACES } from "./answerTargets";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-06",
});
const neighbors = [
  ["wurl:KAZ", "Kazakhstan", 48, 68],
  ["wurl:KGZ", "Kyrgyzstan", 41.3, 75],
  ["wurl:TJK", "Tajikistan", 38.5, 71],
  ["wurl:AFG", "Afghanistan", 33.5, 66],
  ["wurl:TKM", "Turkmenistan", 39.5, 58.5],
] as const;
const base: Question = {
  id: "",
  label: "Country",
  topic: "geographic exceptions",
  title: "",
  prompt: "",
  instruction: "",
  explanation: "",
  mode: "map-single",
  rule: { type: "country-ids", ids: [] },
  count: 1,
  selection: { type: "members" },
  commitment: "submit",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 20, lng: 0, altitude: 1.3 },
  map: { borders: true, hover: true, muteOthers: false },
  source: source("", ""),
};
export const TWELFTH_JOURNEY: Journey = {
  id: "exceptions-to-the-rule-v1",
  title: "Exceptions to the rule",
  description:
    "Five map assumptions, five exceptions. Test what borders, coastlines, hemispheres, and sea level really tell you.",
  rounds: [
    {
      ...base,
      id: "exceptions-france-border",
      leadIn:
        "First assumption: a European country’s longest border must be in Europe.",
      title: "The long way around.",
      label: "Border",
      prompt:
        "Which country shares France’s longest international land border?",
      instruction: "Include France’s overseas departments.",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["wurl:BRA"] },
      selection: { type: "none" },
      choices: ["BRA", "ESP", "DEU", "BEL", "CHE", "SUR"].map((code, i) => ({
        id: `wurl:${code}`,
        label: [
          "Brazil",
          "Spain",
          "Germany",
          "Belgium",
          "Switzerland",
          "Suriname",
        ][i],
      })),
      map: { borders: true, hover: false, muteOthers: true },
      focus: { lat: 28, lng: -25, altitude: 1.7 },
      highlightParts: [
        {
          countryId: "wurl:FRA",
          name: "Metropolitan France",
          point: { lat: 46.5, lng: 2.5 },
        },
      ],
      importedRegions: geography.regions as RegionFeature[],
      feedbackContextIds: ["wurl:FRA-GF"],
      feedbackFocus: { lat: 4, lng: -53, altitude: 0.35 },
      feedbackPlaces: [
        {
          id: "reveal:french-guiana",
          name: "French Guiana · France",
          kind: "other",
          lat: 4.2,
          lng: -53.3,
          sourceId: "naturalearth:1159311355",
        },
      ],
      explanation:
        "French Guiana is part of France. Its South American border beats every border France has in Europe.",
      source: source(
        "Presidency of Brazil · France’s longest land border",
        "https://www.gov.br/planalto/en/latest-news/2023/05/presidents-lula-and-macron-meet-at-the-g7-summit-and-seal-resumption-of-brazil-france-relations",
      ),
    },
    {
      ...base,
      id: "exceptions-double-landlocked",
      leadIn:
        "Next: one border should be enough to escape a landlocked country.",
      title: "No coast in sight.",
      prompt:
        "Besides Liechtenstein, which landlocked country has only landlocked neighbors?",
      instruction: "",
      rule: { type: "country-ids", ids: ["wurl:UZB"] },
      disclosure: {
        ...base.disclosure,
        hoverNames: true,
        committedNames: true,
      },
      focus: { lat: 43, lng: 58, altitude: 1.45 },
      feedbackFocus: { lat: 40, lng: 66, altitude: 0.6 },
      feedbackPlaces: neighbors.map(([id, name, lat, lng]) => ({
        id: `reveal:${id}`,
        name,
        lat,
        lng,
        kind: "other",
        sourceId: "naturalearth",
        parentId: id,
      })),
      explanation:
        "Every neighboring country is landlocked too. Reaching an ocean over land means crossing at least two borders.",
      source: source(
        "World Bank · Uzbekistan country overview",
        "https://www.worldbank.org/ext/en/country/uzbekistan",
      ),
    },
    {
      ...base,
      id: "exceptions-four-hemispheres",
      leadIn: "Now try fitting one country into just one pair of hemispheres.",
      title: "Every direction at once.",
      label: "Hemispheres",
      prompt: "Which Pacific country has islands in all four hemispheres?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["wurl:KIR"] },
      selection: { type: "none" },
      choices: ["KIR", "FJI", "WSM", "TON", "TUV", "MHL"].map((code, i) => ({
        id: `wurl:${code}`,
        label: [
          "Kiribati",
          "Fiji",
          "Samoa",
          "Tonga",
          "Tuvalu",
          "Marshall Islands",
        ][i],
      })),
      map: { borders: false, hover: false, muteOthers: true },
      focus: { lat: -3, lng: -173, altitude: 1.25 },
      feedbackFocus: { lat: 0, lng: -173, altitude: 0.85 },
      feedbackOverlays: [
        { id: "kiribati-equator", type: "parallel", latitude: 0 },
        { id: "kiribati-antimeridian", type: "meridian", longitude: 180 },
      ],
      feedbackPlaces: (geography.islands as PlaceFeature[]).map((p) => ({
        ...p,
        visualState: "answer",
        answerTarget: true,
      })),
      explanation:
        "The islands cross both the Equator and the 180° meridian. One country can belong to all four hemispheres.",
      source: source(
        "Kiribati Ministry of Finance · Development Plan 2024–2027",
        "https://mfed.gov.ki/sites/default/files/2025-09/KDP%202024-2027_Launched_17.09.25_3.pdf",
      ),
      sources: [geography.islandSource],
    },
    {
      ...base,
      id: "exceptions-bolivia-coast",
      leadIn:
        "A coastline can disappear from a country’s map without moving the sea.",
      title: "A country remembers the sea.",
      label: "History",
      prompt: "Which country gained Bolivia’s coast in the War of the Pacific?",
      instruction: "",
      rule: { type: "country-ids", ids: ["wurl:CHL"] },
      contextIds: ["wurl:BOL"],
      map: {
        borders: false,
        borderIds: ["wurl:BOL"],
        hover: true,
        muteOthers: true,
        candidates: "neutral",
      },
      focus: { lat: -20, lng: -65, altitude: 0.95 },
      feedbackFocus: { lat: -23, lng: -68, altitude: 0.62 },
      feedbackPlaces: [
        {
          id: "reveal:bolivia",
          name: "Bolivia",
          lat: -17,
          lng: -64,
          kind: "other",
          sourceId: "naturalearth",
        },
        {
          id: "reveal:chile",
          name: "Chile",
          lat: -25,
          lng: -69,
          kind: "other",
          sourceId: "naturalearth",
        },
      ],
      explanation:
        "Bolivia lost its coast in the war. The 1904 treaty confirmed the border, leaving it landlocked.",
      source: source(
        "International Court of Justice · Bolivia v. Chile, historical background",
        "https://www.icj-cij.org/case/153",
      ),
    },
    {
      ...base,
      id: "exceptions-baku",
      leadIn: "Last assumption: surely a city on land sits above sea level.",
      title: "How low can a capital go?",
      label: "Capital",
      prompt:
        "Baku sits about 28 meters below sea level. Which country is it the capital of?",
      instruction: "",
      rule: { type: "country-ids", ids: ["wurl:AZE"] },
      focus: { lat: 40, lng: 48, altitude: 0.68 },
      feedbackFocus: { lat: 40.4, lng: 48.5, altitude: 0.32 },
      feedbackPlaces: [ANSWER_PLACES.get("place:587084")!],
      explanation:
        "The Caspian’s surface is below sea level—and so is this capital. Even land doesn’t always sit above the sea.",
      source: source(
        "Azerbaijan · Baku’s Caspian setting and elevation",
        "https://azerbaijan.az/en/related-information/217",
      ),
    },
  ],
};
