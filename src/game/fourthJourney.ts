import { defineQuestion, definePresentation } from "./questionBuilder";
import { cityReference } from "./authoredPlaces";
import { ANSWER_PLACES } from "./answerTargets";
import type { Journey, FactSource } from "./questionContracts";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import { capitalSource } from "./quizData";
import mapData from "./data/mediterranean-map.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-12",
});
const city = (id: string) => cityReference(ANSWER_PLACES.get(`place:${id}`)!);
const tripoli = city("2210247");
export const LIBYA_ASSIST_CITIES = [
  tripoli,
  { ...city("2214846"), name: "Misrata" },
  city("88319"),
];
export const SUEZ_ENTRANCE = ANSWER_PLACES.get("place:358619")!;
export const SUEZ_REFERENCE_CITIES = [city("360630"), city("361058")];
export const ADRIATIC_REPUBLICS = ["SVN", "HRV", "BIH", "MNE"].map(
  (c) => `wurl:${c}`,
);
export const ADRIATIC_CANDIDATES = [
  ...ADRIATIC_REPUBLICS,
  "wurl:ALB",
  "wurl:GRC",
];
export const WESTERN_GATEWAY_CANDIDATES = [
  "DZA",
  "FRA",
  "ITA",
  "MLT",
  "MAR",
  "PRT",
].map((c) => `wurl:${c}`);
export const SUEZ_CANAL: PhysicalFeature = mapData.canal as PhysicalFeature;
const label = (
  id: string,
  name: string,
  lat: number,
  lng: number,
): PlaceFeature => ({
  id: `clue:mediterranean:${id}`,
  name,
  lat,
  lng,
  kind: "other",
  markerHidden: true,
  priority: 100,
  sourceId: `curated:mediterranean:${id}`,
});
const strait = label("gibraltar", "Strait of Gibraltar", 35.97, -5.62);
const sicily = label("sicily", "Sicily", 37.6, 14);
const adriatic = label("adriatic", "Adriatic Sea", 42.8, 15.2);
const ionian = label("ionian", "Ionian Sea", 38.5, 18.5);
const neum: PlaceFeature = {
  id: "clue:mediterranean:neum",
  name: "Neum",
  lat: 42.923333,
  lng: 17.615556,
  kind: "town",
  markerSize: 24,
  labelFlexible: true,
  priority: 95,
  sourceId: "curated:geonames-neum",
};
const sea = label("sea", "Mediterranean Sea", 35.8, 20);
const redSea = label("red-sea", "Red Sea", 27.4, 34.2);
const canalSource = source(
  "Suez Canal Authority · Mediterranean entrance at Port Said",
  "https://www.suezcanal.gov.eg/English/About/SuezCanal/Pages/AboutSuezCanal.aspx",
);
const geometrySource = source(
  "Natural Earth · 1:10m river and canal centerlines (public domain)",
  mapData.source.url,
);
const base = definePresentation({
  label: "",
  topic: "Mediterranean geography",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 36, lng: 17, altitude: 1.4 },
  source: capitalSource,
  map: { borders: true, hoverFeedback: false, muteOthers: true },
  feedbackContextIds: [],
});

export const FOURTH_JOURNEY: Journey = {
  id: "mediterranean-v1",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "Around the Mediterranean",
  saveRevision: 2,
  legacyRoundLabels: {
    "spain-regional-languages": "Catalan and Basque",
    "yugoslavia-six": "Six Yugoslav republics",
    "mediterranean-shores": "22 Mediterranean coastal countries",
  },
  description:
    "Follow a western sea passage, an island, a coastal capital and the Adriatic–Ionian shores to a hidden gateway in Egypt.",
  mapAttribution: {
    label: "Canal geometry · Natural Earth",
    url: "https://www.naturalearthdata.com/about/terms-of-use/",
  },
  completion: {
    focus: { lat: 35.5, lng: 16, altitude: 1.15 },
    regionIds: [
      "wurl:ESP",
      "wurl:MAR",
      "wurl:ITA",
      "wurl:LBY",
      ...ADRIATIC_REPUBLICS,
      "wurl:EGY",
    ],
    views: [
      { lat: 36, lng: -5.8, altitude: 0.5 },
      { lat: 37.6, lng: 14, altitude: 0.35 },
      { lat: 33.2, lng: 13.7, altitude: 0.4 },
      { lat: 43.5, lng: 17, altitude: 0.45 },
      { lat: 30.5, lng: 32.2, altitude: 0.55 },
      { lat: 35.5, lng: 16, altitude: 1.15 },
    ],
    physicalFeatures: [SUEZ_CANAL],
    places: [
      strait,
      sicily,
      { ...tripoli, visualState: "visited" },
      adriatic,
      ionian,
      { ...neum, visualState: "visited" },
      { ...city("358619"), visualState: "visited" },
      sea,
      redSea,
    ],
    caption:
      "From Gibraltar to Suez, the Mediterranean connects African and European shores—and opens toward the Atlantic and the Red Sea.",
  },
  rounds: [
    defineQuestion({
      ...base,
      // Keep stored round identities stable; receipt snapshots preserve earlier results.
      id: "spain-regional-languages",
      label: "Gateway",
      progressLabel: "Western gateway",
      resolvedLabel: "Morocco",
      title: "Across the western gateway.",
      leadIn:
        "A narrow strait connects the Atlantic Ocean with the Mediterranean Sea.",
      prompt: "Which country faces Spain across it?",
      instruction: "Choose a country on the globe or below.",
      mode: "map-single",
      count: 1,
      commitment: "submit",
      selection: {
        type: "ids",
        ids: WESTERN_GATEWAY_CANDIDATES,
      },
      rule: { type: "country-ids", ids: ["wurl:MAR"] },
      disclosure: {
        ...base.disclosure,
        hoverNames: true,
        namedChoices: true,
        committedNames: true,
      },
      guidance: {
        hint: "Look for the western entrance to the Mediterranean, rather than a passage between islands within it.",
        assist: {
          text: "France, Morocco and Portugal remain selectable. Find the country facing Spain across the passage that joins the two bodies of water.",
          candidateIds: ["wurl:FRA", "wurl:MAR", "wurl:PRT"],
        },
      },
      explanation:
        "Morocco faces Spain across the Strait of Gibraltar. This narrow Atlantic entrance opens into the Mediterranean, bringing the African and European shores close together.",
      source: source(
        "Visit Gibraltar · Spain and Morocco across the strait",
        "https://www.visitgibraltar.gi/general-info",
      ),
      scenes: {
        play: {
          contextIds: ["wurl:ESP"],
          focus: { lat: 39, lng: 5, altitude: 1.05 },
          map: { ...base.map, hoverFeedback: true, candidates: "highlighted" },
        },
        reveal: {
          contextIds: ["wurl:ESP"],
          focus: { lat: 36, lng: -5.8, altitude: 0.32 },
          places: [strait],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "italy-sicily",
      label: "Island",
      progressLabel: "Island",
      resolvedLabel: "Sicily",
      title: "Name this island.",
      leadIn: "Continue into the central Mediterranean.",
      prompt: "What is the name of the highlighted island?",
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      shuffleChoices: true,
      rule: { type: "choice-ids", ids: ["island:sicily"] },
      choices: [
        { id: "island:sicily", label: "Sicily" },
        { id: "island:sardinia", label: "Sardinia" },
        { id: "island:corsica", label: "Corsica" },
        { id: "island:crete", label: "Crete" },
      ],
      highlightParts: [
        {
          countryId: "wurl:ITA",
          point: { lat: 37.6, lng: 14 },
          name: "Sicily",
          reveal: "part",
        },
      ],
      guidance: {
        hint: "The narrow waterway between this island and mainland Italy is the Strait of Messina.",
        assist: {
          text: "Two Italian islands remain: Sicily and Sardinia. Match the name to the highlighted island.",
          candidateIds: ["island:sicily", "island:sardinia"],
        },
      },
      explanation:
        "Sicily is the Mediterranean’s largest island. The Strait of Messina separates it from the toe of mainland Italy.",
      source: source(
        "Visit Sicily · official regional tourism brochure",
        "https://www.visitsicily.info/wp-content/uploads/2024/11/SR_Brochure-Sicilia_20241102_Inglese_Maggiore-risoluzione.pdf",
      ),
      scenes: {
        play: {
          contextIds: ["wurl:ITA"],
          focus: { lat: 38.2, lng: 13.3, altitude: 0.4 },
        },
        reveal: {
          contextIds: ["wurl:ITA"],
          focus: { lat: 38, lng: 14.8, altitude: 0.28 },
          places: [sicily],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "libya-capital",
      label: "Capital",
      progressLabel: "Libya",
      resolvedLabel: "Tripoli",
      title: "A capital on the southern shore.",
      leadIn: "Cross the Mediterranean to Libya.",
      prompt: "What is its capital?",
      mode: "text",
      inputLabel: "Capital city",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: { type: "capital-name", countryId: "wurl:LBY" },
      guidance: {
        hint: "Look in northwestern Libya, on the Mediterranean coast.",
        assist: {
          text: "Tripoli, Misrata and Benghazi are now marked as possibilities.",
        },
      },
      explanation:
        "Tripoli is Libya’s capital, on the country’s northwestern Mediterranean coast.",
      sources: [
        source(
          "GeoNames · reviewed Libyan city coordinates",
          "https://www.geonames.org/2210247/tripoli.html",
        ),
      ],
      scenes: {
        play: {
          contextIds: ["wurl:LBY"],
          focus: { lat: 31.8, lng: 16.5, altitude: 0.72 },
          map: { ...base.map, feedbackRegions: "neutral" },
        },
        assist: { places: LIBYA_ASSIST_CITIES },
        reveal: {
          contextIds: ["wurl:LBY"],
          focus: { lat: 33.1, lng: 13.5, altitude: 0.38 },
          places: [{ ...tripoli, visualState: "answer" }],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "yugoslavia-six",
      label: "Republics",
      progressLabel: "Adriatic–Ionian",
      resolvedLabel: "Four Adriatic republics",
      title: "Four republics meet the sea.",
      leadIn: "Follow the Adriatic and Ionian shores.",
      prompt: "Which four of these countries were republics of Yugoslavia?",
      instruction: "Select four countries on the globe.",
      mode: "map-multiple",
      count: 4,
      selection: { type: "ids", ids: ADRIATIC_CANDIDATES },
      commitment: "submit",
      rule: { type: "country-ids", ids: ADRIATIC_REPUBLICS },
      disclosure: {
        ...base.disclosure,
        hoverNames: true,
        committedNames: true,
      },
      guidance: {
        hint: "One of its republics bordered both Italy and Austria.",
        assist: {
          text: "Croatia is locked in. Find three more former republics among the five remaining countries.",
          fixedSelections: ["wurl:HRV"],
        },
      },
      explanation:
        "Slovenia, Croatia, Bosnia and Herzegovina, and Montenegro were republics of Yugoslavia. Albania and Greece were neighboring states outside the federation. Bosnia and Herzegovina reaches the Adriatic through its small coastal opening at Neum.",
      source: source(
        "UN ICTY · Yugoslavia’s six republics",
        "https://www.icty.org/en/about/what-former-yugoslavia",
      ),
      sources: [
        source(
          "European Commission · Adriatic–Ionian regional geography",
          "https://maritime-spatial-planning.ec.europa.eu/sea-basins/east-mediterranean",
        ),
        source(
          "Neum Tourist Board · Bosnia and Herzegovina’s coastal opening",
          "https://visitneum.com/en/",
        ),
        source(
          "GeoNames · Neum reference coordinates",
          "https://www.geonames.org/search.html?country=BA&q=Neum",
        ),
      ],
      scenes: {
        play: {
          focus: { lat: 42.5, lng: 20, altitude: 0.46 },
          places: [adriatic, ionian],
          map: { ...base.map, hoverFeedback: true, candidates: "highlighted" },
        },
        reveal: {
          focus: { lat: 43.9, lng: 17.5, altitude: 0.22 },
          places: [neum, adriatic, ionian],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "mediterranean-shores",
      label: "Canal",
      progressLabel: "Egypt",
      resolvedLabel: "Port Said",
      title: "The eastern gateway.",
      leadIn: "Continue east to Egypt.",
      prompt:
        "We’ve hidden the Suez Canal on this map. Drop a pin where ships enter it from the Mediterranean.",
      instruction:
        "Land within 150 km of the entrance. Aim for the 50 km bullseye; the 100 km and 150 km rings also count as correct.",
      mode: "pin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "pin-distance",
        targetId: SUEZ_ENTRANCE.id,
        radiusKm: 150,
        tiers: [
          { radiusKm: 50, feedback: "Bullseye!" },
          { radiusKm: 100, feedback: "Very close." },
          { radiusKm: 150, feedback: "In range." },
        ],
      },
      guidance: {
        hint: "Look near the northeastern edge of the Nile Delta.",
        assist: {
          text: "Cairo and Alexandria are now marked as references. The Mediterranean entrance to the canal stays unmarked.",
        },
      },
      explanation:
        "Port Said marks the canal’s Mediterranean entrance. Ships travel south through the Suez Canal to the Gulf of Suez and the Red Sea, opening a route beyond the Mediterranean.",
      source: canalSource,
      sources: [
        geometrySource,
        source(
          "GeoNames · Port Said gateway coordinates",
          "https://www.geonames.org/358619/port-said.html",
        ),
        source(
          "GeoNames · Egyptian reference city coordinates",
          "https://www.geonames.org/360630/cairo.html",
        ),
        source(
          "GeoNames · Alexandria reference coordinates",
          "https://www.geonames.org/361058/alexandria.html",
        ),
      ],
      scenes: {
        play: {
          contextIds: ["wurl:EGY"],
          focus: { lat: 30.2, lng: 30.4, altitude: 0.62 },
          map: { ...base.map, feedbackRegions: "neutral" },
        },
        assist: { places: SUEZ_REFERENCE_CITIES },
        reveal: {
          contextIds: ["wurl:EGY"],
          focus: { lat: 30.2, lng: 32.3, altitude: 0.4 },
          places: [{ ...city("358619"), visualState: "answer" }, redSea],
          physicalFeatures: [SUEZ_CANAL],
        },
      },
    }),
  ],
};
