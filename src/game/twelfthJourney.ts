import { referenceLabel } from "./helpReferences";
import { defineQuestion, definePresentation } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import type { PlaceFeature, RegionFeature } from "../geography/types";
import geography from "./data/exceptions-geography.v1.json";
import { ANSWER_PLACES } from "./answerTargets";
import { areaLabel } from "./authoredPlaces";

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
const base = definePresentation({
  label: "Country",
  topic: "geographic exceptions",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 20, lng: 0, altitude: 1.3 },
  map: { borders: true, hoverFeedback: true, muteOthers: false },
  source: source("", ""),
});
export const TWELFTH_JOURNEY: Journey = {
  id: "exceptions-to-the-rule-v1",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "Exceptions to the rule",
  description:
    "A country need not fit on one continent, a coastline need not last, and land need not stand above the sea. Follow five places that complicate a familiar map.",
  rounds: [
    defineQuestion({
      count: 1,
      commitment: "submit",

      ...base,
      id: "exceptions-france-border",
      resolvedLabel: "France and Brazil",
      guidance: {
        hint: "The relevant part of France is in South America.",
        assist: {
          text: "Brazil, Suriname, and Spain remain. French Guiana is highlighted as reference territory; compare its South American neighbors.",
          candidateIds: ["wurl:BRA", "wurl:SUR", "wurl:ESP"],
          regionIds: ["wurl:FRA"],
          focus: { lat: 5, lng: -54, altitude: 0.8 },
        },
      },
      leadIn: "Start with a country whose borders reach beyond Europe.",
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
      highlightParts: [
        {
          countryId: "wurl:FRA",
          name: "Metropolitan France",
          point: { lat: 46.5, lng: 2.5 },
        },
      ],
      importedRegions: geography.regions as RegionFeature[],
      explanation:
        "French Guiana is part of France, so the country’s longest land border lies in South America. A European mainland does not contain all of a country’s geography.",
      source: source(
        "Presidency of Brazil · France’s longest land border",
        "https://www.gov.br/planalto/en/latest-news/2023/05/presidents-lula-and-macron-meet-at-the-g7-summit-and-seal-resumption-of-brazil-france-relations",
      ),
      scenes: {
        play: {
          map: { borders: true, hoverFeedback: false, muteOthers: true },
          focus: { lat: 46.5, lng: 2.5, altitude: 0.6 },
        },
        reveal: {
          contextIds: ["wurl:FRA-GF"],
          focus: { lat: 4, lng: -53, altitude: 0.35 },
          places: [
            {
              id: "reveal:french-guiana",
              name: "French Guiana · France",
              kind: "other",
              markerHidden: true,
              lat: 4.2,
              lng: -53.3,
              sourceId: "naturalearth:1159311355",
            },
          ],
        },
      },
    }),
    defineQuestion({
      mode: "map-single",
      count: 1,
      selection: { type: "members" },
      commitment: "immediate",

      ...base,
      id: "exceptions-double-landlocked",
      resolvedLabel: "Uzbekistan",
      guidance: {
        hint: "Look among the former Soviet republics of Central Asia.",
        assist: {
          text: "Five Central Asian countries remain. Inspect their neighbors: each neighbor must also be landlocked.",
          candidateIds: [
            "wurl:KAZ",
            "wurl:UZB",
            "wurl:TKM",
            "wurl:KGZ",
            "wurl:TJK",
          ],
          focus: { lat: 42, lng: 66, altitude: 1.05 },
        },
      },
      leadIn: "Now test how many borders can separate a country from the sea.",
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
      explanation:
        "Uzbekistan is doubly landlocked: every neighboring country is landlocked too. Its distance from an ocean is a matter of political neighbors as well as physical miles.",
      source: source(
        "World Bank · Uzbekistan country overview",
        "https://www.worldbank.org/ext/en/country/uzbekistan",
      ),
      scenes: {
        play: {
          focus: { lat: 43, lng: 58, altitude: 1.45 },
          map: { candidates: "neutral" },
        },
        reveal: {
          focus: { lat: 40, lng: 66, altitude: 0.6 },
          contextIds: neighbors.map(([id]) => id),
          places: neighbors.map(([id, name, lat, lng]) => ({
            id: `reveal:${id}`,
            name,
            lat,
            lng,
            kind: "other",
            markerHidden: true,
            sourceId: "naturalearth",
            parentId: id,
          })),
        },
      },
    }),
    defineQuestion({
      count: 1,
      commitment: "submit",

      ...base,
      id: "exceptions-four-hemispheres",
      resolvedLabel: "Kiribati",
      guidance: {
        hint: "You need islands on both sides of the Equator and both sides of the 180° meridian.",
        assist: {
          text: "Kiribati, Fiji, and Samoa remain. The Equator and 180° meridian are now shown; island ownership is still unlabeled.",
          candidateIds: ["wurl:KIR", "wurl:FJI", "wurl:WSM"],
          overlays: [
            { id: "help:kiribati:equator", type: "parallel", latitude: 0 },
            { id: "help:kiribati:180", type: "meridian", longitude: 180 },
          ],
          focus: { lat: 0, lng: -175, altitude: 1.55 },
        },
      },
      leadIn: "A single hemisphere is not always enough to place a country.",
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
      explanation:
        "Kiribati’s islands lie on both sides of the Equator and the 180° meridian. Spread across the Pacific, one country reaches into all four hemispheres.",
      source: source(
        "Kiribati Ministry of Finance · Development Plan 2024–2027",
        "https://mfed.gov.ki/sites/default/files/2025-09/KDP%202024-2027_Launched_17.09.25_3.pdf",
      ),
      sources: [geography.islandSource],
      scenes: {
        play: {
          map: { borders: false, hoverFeedback: false, muteOthers: true },
          focus: { lat: -3, lng: -173, altitude: 1.25 },
        },
        reveal: {
          focus: { lat: 0, lng: -173, altitude: 0.85 },
          overlays: [
            { id: "kiribati-equator", type: "parallel", latitude: 0 },
            { id: "kiribati-antimeridian", type: "meridian", longitude: 180 },
          ],
          places: (geography.islands as PlaceFeature[]).map((p) => ({
            ...areaLabel(p),
            displayRole: "explanation",
            visualState: "hinted",
          })),
        },
      },
    }),
    defineQuestion({
      mode: "map-single",
      count: 1,
      selection: { type: "members" },
      commitment: "immediate",

      ...base,
      id: "exceptions-bolivia-coast",
      resolvedLabel: "Bolivia and Chile",
      guidance: {
        hint: "Look for the long Pacific country immediately west of Bolivia.",
        assist: {
          text: "Chile, Peru, and Argentina remain. Compare their positions west and south of Bolivia, beside the Pacific coast and the Andes.",
          candidateIds: ["wurl:CHL", "wurl:PER", "wurl:ARG"],
          focus: { lat: -22, lng: -68, altitude: 1.05 },
        },
      },
      leadIn:
        "Today’s landlocked outline does not tell a country’s whole history.",
      title: "A country remembers the sea.",
      label: "History",
      prompt: "Which country gained Bolivia’s coast in the War of the Pacific?",
      instruction: "",
      rule: { type: "country-ids", ids: ["wurl:CHL"] },
      explanation:
        "Bolivia lost its Pacific coast in the war, and the 1904 treaty confirmed the border with Chile. A modern map shows the outcome, but not the coastline Bolivia once had.",
      source: source(
        "International Court of Justice · Bolivia v. Chile, historical background",
        "https://www.icj-cij.org/case/153",
      ),
      scenes: {
        play: {
          contextIds: ["wurl:BOL"],
          map: {
            borders: true,
            hoverFeedback: true,
            muteOthers: true,
            candidates: "neutral",
          },
          focus: { lat: -20, lng: -65, altitude: 0.95 },
        },
        reveal: {
          focus: { lat: -23, lng: -68, altitude: 0.62 },
          places: [
            {
              id: "reveal:bolivia",
              name: "Bolivia",
              markerHidden: true,
              lat: -17,
              lng: -64,
              kind: "other",
              sourceId: "naturalearth",
            },
            {
              id: "reveal:chile",
              name: "Chile",
              markerHidden: true,
              lat: -25,
              lng: -69,
              kind: "other",
              sourceId: "naturalearth",
            },
          ],
        },
      },
    }),
    defineQuestion({
      mode: "map-single",
      count: 1,
      selection: { type: "members" },
      commitment: "immediate",

      ...base,
      id: "exceptions-baku",
      resolvedLabel: "Baku, Azerbaijan",
      guidance: {
        hint: "Look on the western shore of the Caspian Sea, in the Caucasus region.",
        assist: {
          text: "Azerbaijan, Georgia, and Armenia remain. Use the labeled Caspian Sea to compare their locations.",
          candidateIds: ["wurl:AZE", "wurl:GEO", "wurl:ARM"],
          places: [referenceLabel("Caspian Sea", 41, 51)],
          focus: { lat: 41, lng: 47, altitude: 0.8 },
        },
      },
      leadIn: "Finish by questioning the boundary between land and sea level.",
      title: "How low can a capital go?",
      label: "Capital",
      prompt:
        "Baku sits about 28 meters below sea level. Which country is it the capital of?",
      instruction: "",
      rule: { type: "country-ids", ids: ["wurl:AZE"] },
      explanation:
        "Baku stands on the Caspian shore, below the level of the world’s oceans. Sea level is a reference height, not a guarantee that dry land must be above it.",
      source: source(
        "Azerbaijan · Baku’s Caspian setting and elevation",
        "https://azerbaijan.az/en/related-information/217",
      ),
      scenes: {
        play: {
          focus: { lat: 40, lng: 48, altitude: 0.68 },
          map: { candidates: "neutral" },
        },
        reveal: {
          focus: { lat: 40.4, lng: 48.5, altitude: 0.32 },
          places: [ANSWER_PLACES.get("place:587084")!],
        },
      },
    }),
  ],
  completion: {
    focus: { lat: 15, lng: 30, altitude: 1.9 },
    views: [
      { lat: 5, lng: -54, altitude: 0.9 },
      { lat: 41, lng: 65, altitude: 0.8 },
      { lat: 0, lng: -160, altitude: 1.8 },
      { lat: -19, lng: -69, altitude: 0.7 },
      { lat: 40.4, lng: 49.9, altitude: 0.6 },
    ],
    physicalFeatures: [],
    places: [],
    caption:
      "An overseas border, two layers of landlocked neighbors, four hemispheres, a lost coast, and land below sea level. Each place complicates a different assumption; a map becomes more revealing when we ask what its outlines leave out.",
  },
};
