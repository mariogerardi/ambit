import { withReliefClearance } from "../geography/relief";
import { defineQuestion, definePresentation } from "./questionBuilder";
import { CAPITALS, capitalSource } from "./quizData";
import type { FactSource, Journey } from "./questions";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import relief from "./data/andes-relief.v1.json";
import geography from "./data/andes-context.v1.json";

const andes: PhysicalFeature = {
  ...(geography.andes as PhysicalFeature),
  relief,
};
const lake: PhysicalFeature = {
  ...(geography.lake as PhysicalFeature),
  fillOpacity: 1,
};
const andesAtLake = withReliefClearance(andes, lake.id);
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const terrainSource = source(
  "Mapzen Terrain Tiles · elevation-derived relief",
  "https://registry.opendata.aws/terrain-tiles/",
);
const physicalSource = source(
  "Natural Earth · physical geography",
  "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-geography-regions/",
);
const bogota = CAPITALS.find((city) => city.countryId === "wurl:COL")!;
const caracas = CAPITALS.find((city) => city.countryId === "wurl:VEN")!;
const summit = (
  id: string,
  name: string,
  coordinates: { lat: number; lng: number },
  parentId: string,
): PlaceFeature => ({
  id,
  name,
  kind: "mountain",
  ...coordinates,
  parentId,
  sourceId: "natural-earth:5.1.2",
  visualState: "answer",
  labelFlexible: true,
  priority: 100,
});
const chimborazo = summit(
  "andes:chimborazo",
  "Chimborazo",
  geography.peaks.Chimborazo,
  "wurl:ECU",
);
const aconcagua = summit(
  "andes:aconcagua",
  "Aconcagua",
  geography.peaks["Cerro Aconcagua"],
  "wurl:ARG",
);
const lakeCandidates = ["CHL", "PER", "ECU", "ARG", "BOL", "COL"].map(
  (id) => `wurl:${id}`,
);
const names: Record<string, string> = {
  CHL: "Chile",
  PER: "Peru",
  ECU: "Ecuador",
  ARG: "Argentina",
  BOL: "Bolivia",
  COL: "Colombia",
  BRA: "Brazil",
  PRY: "Paraguay",
};
const choices = (ids: string[]) =>
  ids.map((id) => ({ id, label: names[id.replace("wurl:", "")] }));
const countryLabel = (
  id: string,
  name: string,
  lat: number,
  lng: number,
): PlaceFeature => ({
  id: `andes:label:${id}`,
  name,
  kind: "other",
  lat,
  lng,
  sourceId: "natural-earth:5.1.2",
  markerHidden: true,
  labelFlexible: true,
  priority: 100,
});
const andeanCountries = ["VEN", "COL", "ECU", "PER", "BOL", "CHL", "ARG"].map(
  (id) => `wurl:${id}`,
);
const southAmerica = [
  "VEN",
  "COL",
  "ECU",
  "PER",
  "BOL",
  "CHL",
  "ARG",
  "BRA",
  "GUY",
  "SUR",
  "PRY",
  "URY",
].map((id) => `wurl:${id}`);
const discoveries: PlaceFeature[] = [
  {
    ...bogota,
    visualState: "visited",
    labelFlexible: true,
    priority: 100,
    markerSize: 30,
  },
  { ...chimborazo, visualState: "visited" },
  { ...aconcagua, visualState: "visited" },
];
const santiago = CAPITALS.find((city) => city.countryId === "wurl:CHL")!;
// Shared presentation only. Every round declares its own answer method and rule.
const common = definePresentation({
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    revealOnAnswer: true,
  },
  physicalFeatures: [andes],
  sources: [physicalSource, terrainSource],
});

export const ANDES_JOURNEY: Journey = {
  id: "along-the-andes-v1",
  title: "Along the Andes",
  description:
    "Follow South America’s mountain spine: a highland capital, an equatorial surprise, a shared lake, the highest peak, and a seven-country recap.",
  mapAttribution: {
    label: "Terrain · USGS / NOAA via Mapzen",
    url: "https://github.com/tilezen/joerd/blob/master/docs/attribution.md",
  },
  completion: {
    focus: { lat: -20, lng: -72, altitude: 1.65 },
    views: [
      { lat: 4.6, lng: -74.1, altitude: 0.42 },
      { lat: -1, lng: -78.5, altitude: 0.4 },
      { lat: -15.8, lng: -69.3, altitude: 0.5 },
      { lat: -32.65, lng: -70, altitude: 0.55 },
      { lat: -40, lng: -73, altitude: 0.7 },
      { lat: -20, lng: -72, altitude: 1.65 },
    ],
    regionIds: andeanCountries,
    physicalFeatures: [andesAtLake, lake],
    places: discoveries,
    caption:
      "From the Caribbean to Patagonia, the Andes pass through Venezuela, Colombia, Ecuador, Peru, Bolivia, Chile and Argentina.",
  },
  rounds: [
    defineQuestion({
      count: 1,
      commitment: "submit",

      ...common,
      id: "andes-capital-v2",
      label: "Capital",
      resolvedLabel: "Bogotá",
      topic: "highland cities",
      title: "A capital in the Andes.",
      leadIn:
        "Begin in northern South America, where the Andes continue from Colombia into western Venezuela.",
      prompt: "Which of these cities is a national capital in the Andes?",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["city:bogota"] },
      selection: { type: "none" },
      choices: [
        { id: "city:bogota", label: "Bogotá" },
        { id: "city:caracas", label: "Caracas" },
        { id: "city:paramaribo", label: "Paramaribo" },
        { id: "city:medellin", label: "Medellín" },
      ],
      contextIds: ["wurl:COL", "wurl:VEN"],
      feedbackHintIds: ["wurl:COL", "wurl:VEN"],
      feedbackContextIds: [],
      map: { ...common.map, feedbackRegions: "neutral" },
      focus: { lat: 6, lng: -72, altitude: 0.6 },
      feedbackFocus: { lat: 5.5, lng: -73, altitude: 0.32 },
      feedbackPlaces: [
        {
          ...bogota,
          name: "Bogotá",
          markerSize: 30,
          visualState: "answer",
          labelFlexible: true,
          priority: 100,
        },
        {
          ...caracas,
          name: "Caracas",
          markerSize: 30,
          visualState: "hinted",
          labelFlexible: true,
          priority: 100,
        },
      ],
      explanation:
        "The capital sits high in Colombia’s Eastern Cordillera. Caracas lies farther east, in Venezuela’s separate Coastal Range.",
      correctFeedback: "Nice connection.",
      source: source(
        "Bogotá · Eastern Hills",
        "https://bogota.gov.co/especiales/cerros-orientales/index.php",
      ),
      sources: [
        ...common.sources!,
        capitalSource,
        source(
          "Inparques · Waraira Repano and the Coastal Range",
          "https://www.inparques.gob.ve/cms/main/verCalendarioV/1808",
        ),
      ],
      guidance: {
        hint: "The Andes reach both Colombia and Venezuela, but only one of their capitals lies within the range.",
        assist: {
          text: "Medellín and Paramaribo are ruled out. Choose between Bogotá and Caracas.",
          candidateIds: ["city:bogota", "city:caracas"],
        },
      },
    }),
    defineQuestion({
      count: 1,
      commitment: "submit",

      ...common,
      id: "andes-chimborazo-v2",
      overlays: [{ id: "andes:equator", type: "parallel", latitude: 0 }],
      label: "Equator",
      resolvedLabel: "Chimborazo",
      topic: "mountains and Earth’s shape",
      title: "Farthest from the center.",
      leadIn:
        "Head south into Ecuador, where the Andes cross almost directly over the Equator.",
      prompt:
        "Ecuador’s Chimborazo reaches farther from Earth’s center than Everest. What gives it that advantage?",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["earth:equatorial-bulge"] },
      selection: { type: "none" },
      choices: [
        {
          id: "earth:equatorial-bulge",
          label: "Earth bulges around the Equator.",
        },
        {
          id: "earth:sea-level",
          label: "Chimborazo is taller above sea level.",
        },
        { id: "earth:polar-bulge", label: "Earth is wider around its poles." },
        {
          id: "earth:mountain-base",
          label: "Everest’s height is measured from its base.",
        },
      ],
      contextIds: ["wurl:ECU"],
      feedbackHintIds: ["wurl:ECU"],
      feedbackContextIds: [],
      map: { ...common.map, feedbackRegions: "neutral" },
      focus: { lat: -1.5, lng: -78, altitude: 0.3 },
      feedbackFocus: { lat: -1.5, lng: -78.8, altitude: 0.18 },
      feedbackPlaces: [chimborazo],
      feedbackDiagram: { type: "earth-shape" },
      explanation:
        "Earth bulges around the Equator. Chimborazo sits near that bulge, so its summit is farther from Earth’s center. Everest is higher above sea level; these are two different measurements.",
      correctFeedback: "Nice connection.",
      source: source(
        "NOAA · Earth’s farthest summit from its center",
        "https://oceanservice.noaa.gov/facts/highestpoint.html",
      ),
      sources: common.sources,
      guidance: {
        hint: "Consider the shape of the planet, rather than the height of the mountain alone.",
        assist: {
          text: "The two height-measurement options are ruled out. Where is Earth wider?",
          candidateIds: ["earth:equatorial-bulge", "earth:polar-bulge"],
        },
      },
    }),
    defineQuestion({
      commitment: "submit",

      ...common,
      id: "andes-titicaca-v1",
      label: "Lake",
      resolvedLabel: "Lake Titicaca",
      topic: "lakes and borders",
      title: "Two shores, one lake.",
      leadIn: "Continue south to a shared lake high on the Altiplano.",
      prompt: "Which two countries share Lake Titicaca?",
      mode: "map-multiple",
      count: 2,
      rule: { type: "country-ids", ids: ["wurl:PER", "wurl:BOL"] },
      selection: { type: "ids", ids: lakeCandidates },
      choices: choices(lakeCandidates),
      contextIds: [],
      disclosure: {
        ...common.disclosure,
        hoverNames: true,
        namedChoices: true,
        committedNames: true,
      },
      map: { ...common.map, hoverFeedback: true, candidates: "highlighted" },
      instruction: "Choose two countries on the globe or below.",
      focus: { lat: -13.5, lng: -72, altitude: 0.8 },
      feedbackFocus: { lat: -15.8, lng: -69.3, altitude: 0.2 },
      feedbackPhysicalFeatures: [andesAtLake, lake],
      explanation:
        "The lake spans their border high on the Altiplano, between Andean ranges.",
      source: source(
        "UNESCO · Lake Titicaca",
        "https://whc.unesco.org/en/tentativelists/5080",
      ),
      guidance: {
        hint: "One answer has a Pacific coastline; the other is landlocked.",
        assist: {
          text: "Colombia, Ecuador and Argentina are ruled out. Choose two of the three remaining countries.",
          candidateIds: ["wurl:CHL", "wurl:PER", "wurl:BOL"],
        },
      },
    }),
    defineQuestion({
      count: 1,
      commitment: "submit",

      ...common,
      id: "andes-aconcagua-v1",
      label: "Peak",
      resolvedLabel: "Aconcagua",
      topic: "mountains",
      title: "The highest stop.",
      leadIn: "Follow the range south to its highest peak.",
      prompt:
        "Aconcagua is the highest mountain in the Americas, on the Argentine side of the Chilean border. Drop a pin as close to its summit as you can.",
      instruction:
        "Land within 450 km of the summit. Aim for the 150 km bullseye; the 300 km and 450 km rings also count as correct.",
      mode: "pin",
      rule: {
        type: "pin-distance",
        targetId: aconcagua.id,
        radiusKm: 450,
        tiers: [
          { radiusKm: 150, feedback: "Bullseye!" },
          { radiusKm: 300, feedback: "Very close." },
          { radiusKm: 450, feedback: "In range." },
        ],
      },
      selection: { type: "none" },
      map: {
        ...common.map,
        feedbackRegions: "neutral",
        borderIds: ["wurl:ARG", "wurl:CHL"],
      },
      contextIds: ["wurl:ARG", "wurl:CHL"],
      focus: { lat: -34, lng: -68.5, altitude: 0.4 },
      feedbackFocus: { lat: -32.65, lng: -70, altitude: 0.2 },
      places: [
        aconcagua,
        countryLabel("ARG", "Argentina", -33.5, -66.5),
        countryLabel("CHL", "Chile", -34.5, -71.5),
      ],
      feedbackPlaces: [aconcagua],
      explanation:
        "The summit rises in Mendoza province, about 15 km east of the Chilean frontier. The highest point is on the Argentine side.",
      source: source(
        "Argentina’s space agency · Aconcagua beside the Chilean frontier",
        "https://www.argentina.gob.ar/ciencia/conae/educacion-y-formacion-masiva/materiales-educativos/cerro-aconcagua-mendoza-sentinel-2a-msi-28-de-febrero-de-2017",
      ),
      sources: [...common.sources!, capitalSource],
      guidance: {
        hint: "Look in western Mendoza province, just east of the Chilean border.",
        assist: {
          text: "Santiago is marked as a reference. Search north of it, on the Argentine side of the border.",
          places: [
            {
              ...santiago,
              visualState: "hinted",
              labelFlexible: true,
              priority: 100,
            },
          ],
        },
      },
    }),
    defineQuestion({
      commitment: "submit",

      ...common,
      id: "andes-chile-neighbors-v2",
      label: "Recap",
      resolvedLabel: "Seven Andean countries",
      topic: "mountains and countries",
      title: "Rebuild the mountain spine.",
      leadIn: "Bring together the countries from all four stops.",
      prompt:
        "From the Caribbean to Patagonia, which seven countries do the Andes pass through?",
      instruction:
        "Choose seven countries on the globe, in any order. Tap a selected country again to remove it.",
      mode: "map-multiple",
      count: 7,
      selection: { type: "ids", ids: southAmerica },
      rule: { type: "country-ids", ids: andeanCountries },
      contextIds: [],
      disclosure: {
        ...common.disclosure,
        hoverNames: true,
        committedNames: true,
      },
      map: {
        ...common.map,
        hoverFeedback: true,
        candidates: "highlighted",
        borderIds: southAmerica,
      },
      focus: { lat: -20, lng: -72, altitude: 1.65 },
      feedbackFocus: { lat: -20, lng: -72, altitude: 1.65 },
      physicalFeatures: [],
      places: [],
      feedbackPlaces: [],
      feedbackPhysicalFeatures: [andes],
      explanation:
        "Seven countries share the Andes: Venezuela, Colombia, Ecuador, Peru, Bolivia, Chile and Argentina. They connect this Journey’s highland capital, equatorial summit, shared lake and highest peak.",
      correctFeedback: "Journey rebuilt.",
      source: source(
        "Andean Mountain Initiative · seven Andean countries",
        "https://iam-andes.org/?lang=en",
      ),
      guidance: {
        hint: "We've mentioned every country at least once this Journey!",
        assist: {
          text: "Venezuela and Chile are locked in. Fill in the gaps along the Pacific. If you have more than seven selected, remove the extra picks.",
          fixedSelections: ["wurl:VEN", "wurl:CHL"],
        },
      },
    }),
  ],
};
