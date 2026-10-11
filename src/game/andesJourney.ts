import { withReliefClearance } from "../geography/relief";
import { defineQuestion, definePresentation } from "./questionBuilder";
import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
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
const frontiers = geography.frontiers as PhysicalFeature[];
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
const southernCandidates = ["ARG", "CHL", "PRY", "URY"].map(
  (id) => `wurl:${id}`,
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
const borderLabels = [
  countryLabel("PER", "Peru · northern neighbor", -12, -75),
  countryLabel("BOL", "Bolivia · middle neighbor", -18, -64),
  countryLabel("ARG", "Argentina · southern neighbor", -35, -63),
  countryLabel("PRY", "Paraguay · no Chilean border", -23, -58),
];
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
    "Follow South America’s mountain spine: a highland capital, an equatorial surprise, a shared lake, the highest peak, and Chile’s neighbors.",
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
    regionIds: ["wurl:PER", "wurl:BOL", "wurl:ARG"],
    physicalFeatures: [
      andesAtLake,
      lake,
      ...frontiers.map((feature) => ({ ...feature, color: "#bba5f1" })),
    ],
    places: [
      { ...bogota, visualState: "visited", labelFlexible: true, priority: 100 },
      { ...chimborazo, visualState: "visited" },
      { ...aconcagua, visualState: "visited" },
      {
        ...countryLabel("CHL", "Chile", -40, -73),
        visualState: "visited",
      },
    ],
    caption:
      "From Bogotá’s highlands to Chile’s Pacific edge, one mountain system connects our five stops.",
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
          visualState: "answer",
          labelFlexible: true,
          priority: 100,
        },
        {
          ...caracas,
          name: "Caracas",
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
        "Which Ecuadorian peak is Earth’s farthest point from its center?",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["peak:chimborazo"] },
      selection: { type: "none" },
      choices: [
        { id: "peak:chimborazo", label: "Chimborazo" },
        { id: "peak:cotopaxi", label: "Cotopaxi" },
        { id: "peak:cayambe", label: "Cayambe" },
        { id: "peak:antisana", label: "Antisana" },
      ],
      contextIds: ["wurl:ECU"],
      feedbackHintIds: ["wurl:ECU"],
      feedbackContextIds: [],
      map: { ...common.map, feedbackRegions: "neutral" },
      focus: { lat: -1.5, lng: -78, altitude: 0.3 },
      feedbackFocus: { lat: -1.5, lng: -78.8, altitude: 0.18 },
      feedbackPlaces: [chimborazo],
      explanation:
        "Earth’s equatorial bulge gives this summit an edge over Everest when measured from the planet’s center, rather than sea level.",
      correctFeedback: "Nice connection.",
      source: source(
        "NOAA · Earth’s farthest summit from its center",
        "https://oceanservice.noaa.gov/facts/highestpoint.html",
      ),
      sources: [
        ...common.sources!,
        source(
          "Smithsonian GVP · Cotopaxi",
          "https://volcano.si.edu/volcano.cfm?vn=352050",
        ),
        source(
          "Smithsonian GVP · Cayambe",
          "https://volcano.si.edu/volcano.cfm?vn=352006",
        ),
        source(
          "Smithsonian GVP · Antisana",
          "https://volcano.si.edu/volcano.cfm?vn=352030",
        ),
      ],
      guidance: {
        hint: "Distance from Earth’s center depends on both elevation and latitude: the planet bulges at the Equator.",
        assist: {
          text: "Cotopaxi and Chimborazo remain. Compare their height as well as latitude.",
          candidateIds: ["peak:chimborazo", "peak:cotopaxi"],
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
      focus: { lat: -16, lng: -69, altitude: 0.8 },
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
        "Which country contains Aconcagua, the highest mountain in the Americas?",
      instruction: "Tap one of the four highlighted countries.",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:ARG"] },
      selection: { type: "ids", ids: southernCandidates },
      allowTyping: false,
      map: {
        ...common.map,
        hoverFeedback: true,
        candidates: "highlighted",
        borderIds: southernCandidates,
      },
      disclosure: { ...common.disclosure, hoverNames: true },
      contextIds: [],
      feedbackHintIds: ["wurl:CHL"],
      focus: { lat: -34, lng: -65, altitude: 0.72 },
      feedbackFocus: { lat: -32.65, lng: -70, altitude: 0.2 },
      feedbackPlaces: [aconcagua],
      explanation:
        "The summit rises in Mendoza province, about 15 km east of the Chilean frontier. The highest point is on the Argentine side.",
      source: source(
        "Argentina’s space agency · Aconcagua beside the Chilean frontier",
        "https://www.argentina.gob.ar/ciencia/conae/educacion-y-formacion-masiva/materiales-educativos/cerro-aconcagua-mendoza-sentinel-2a-msi-28-de-febrero-de-2017",
      ),
      guidance: {
        hint: "It rises extremely close to the Chilean border—but on the eastern side of it.",
        assist: {
          text: "Choose between Chile and Argentina. Both remain selectable; the summit itself stays hidden until the reveal.",
          candidateIds: ["wurl:CHL", "wurl:ARG"],
        },
      },
    }),
    defineQuestion({
      commitment: "submit",

      ...common,
      id: "andes-chile-neighbors-v2",
      label: "Border",
      resolvedLabel: "Chile’s neighbors",
      topic: "mountains and borders",
      title: "North to south beside Chile.",
      leadIn: "Finish beside Chile.",
      prompt:
        "Order Chile’s land neighbors north to south and isolate the Impostor.",
      mode: "choice-order",
      count: 3,
      selection: { type: "none" },
      rule: {
        type: "country-ids",
        ids: ["wurl:PER", "wurl:BOL", "wurl:ARG"],
        ordered: true,
      },
      choices: choices(["wurl:BOL", "wurl:PRY", "wurl:ARG", "wurl:PER"]),
      orderLabels: ["North", "Middle", "South"],
      orderInitial: ["wurl:BOL", "wurl:PRY", "wurl:PER"],
      orderAsideLabel: "Impostor",
      contextIds: [],
      map: { ...common.map, borders: false },
      feedbackHintIds: ["wurl:CHL"],
      focus: { lat: -29, lng: -68, altitude: 1.35 },
      feedbackFocus: { lat: -27, lng: -64, altitude: 1.35 },
      feedbackPlaces: borderLabels,
      feedbackPhysicalFeatures: frontiers,
      explanation:
        "Peru meets Chile at its northern tip, Bolivia farther south, and Argentina along the long eastern frontier. Paraguay lies farther east and has no Chilean border.",
      correctFeedback: "Nicely ordered.",
      source: mapSource,
      guidance: {
        hint: "One card belongs farther east and never reaches Chile.",
        assist: {
          text: "Argentina is placed and locked in the southernmost slot. Resolve the northern slots and isolate the impostor.",
          fixedSlots: [{ index: 2, id: "wurl:ARG" }],
        },
      },
    }),
  ],
};
