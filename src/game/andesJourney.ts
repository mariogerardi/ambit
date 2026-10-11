import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";
import type { FactSource, Journey, Question } from "./questions";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import geography from "./data/andes-context.v1.json";

const andes = geography.andes as PhysicalFeature;
const lake = geography.lake as PhysicalFeature;
const altiplano = geography.altiplano as PhysicalFeature;
const frontiers = geography.frontiers as PhysicalFeature[];
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
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
const southAmerica = [
  "ARG",
  "BOL",
  "BRA",
  "CHL",
  "COL",
  "ECU",
  "GUY",
  "PRY",
  "PER",
  "SUR",
  "URY",
  "VEN",
].map((id) => `wurl:${id}`);
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
  countryLabel("BRA", "Brazil · no Chilean border", -14, -52),
];
// Shared presentation only. Every round declares its own answer method and rule.
const common = {
  instruction: "",
  count: 1,
  commitment: "submit",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: { borders: true, hover: false, muteOthers: true, revealOnAnswer: true },
  physicalFeatures: [andes],
  sources: [physicalSource],
} satisfies Pick<
  Question,
  | "instruction"
  | "count"
  | "commitment"
  | "failure"
  | "disclosure"
  | "map"
  | "physicalFeatures"
  | "sources"
>;

export const ANDES_JOURNEY: Journey = {
  id: "along-the-andes-v1",
  title: "Along the Andes",
  description:
    "Follow South America’s mountain spine: a highland capital, an equatorial surprise, a shared lake, the highest peak, and Chile’s neighbors.",
  completion: {
    focus: { lat: -20, lng: -72, altitude: 1.65 },
    physicalFeatures: [andes, lake, ...frontiers],
    places: [
      { ...bogota, visualState: "answer", labelFlexible: true, priority: 100 },
      chimborazo,
      {
        id: "andes:lake-stop",
        name: "Lake Titicaca",
        kind: "other",
        lat: -15.8,
        lng: -69.3,
        sourceId: "natural-earth:5.1.2",
        markerHidden: true,
        labelFlexible: true,
        priority: 100,
        visualState: "answer",
      },
      aconcagua,
      countryLabel("CHL", "Chile · Pacific finish", -40, -73),
    ],
    caption:
      "From Bogotá’s highlands to Chile’s Pacific edge, one mountain system connects our five stops.",
  },
  rounds: [
    {
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
      feedbackFocus: { lat: 7.5, lng: -70, altitude: 0.4 },
      feedbackPlaces: [
        {
          ...bogota,
          name: "Bogotá · Eastern Cordillera",
          visualState: "answer",
          labelFlexible: true,
          priority: 100,
        },
        {
          ...caracas,
          name: "Caracas · Coastal Range",
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
        hint: "The Andes reach both Colombia and Venezuela, but their capitals don’t have the same relationship to the range.",
        assist: {
          text: "Medellín and Paramaribo are ruled out. Choose between Bogotá and Caracas.",
          candidateIds: ["city:bogota", "city:caracas"],
        },
      },
    },
    {
      ...common,
      id: "andes-chimborazo-v2",
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
        { id: "peak:aconcagua", label: "Aconcagua" },
        { id: "peak:huascaran", label: "Huascarán" },
      ],
      contextIds: ["wurl:ECU"],
      feedbackHintIds: ["wurl:ECU"],
      feedbackContextIds: [],
      map: { ...common.map, feedbackRegions: "neutral" },
      focus: { lat: -1.5, lng: -78, altitude: 0.38 },
      feedbackFocus: { lat: -1.5, lng: -78.8, altitude: 0.18 },
      feedbackPlaces: [chimborazo],
      explanation:
        "Earth’s equatorial bulge gives this summit an edge over Everest when measured from the planet’s center, rather than sea level.",
      correctFeedback: "Nice connection.",
      source: source(
        "NOAA · Earth’s farthest summit from its center",
        "https://oceanservice.noaa.gov/facts/highestpoint.html",
      ),
      guidance: {
        hint: "Earth bulges slightly at the Equator, so proximity to 0° latitude matters here.",
        assist: {
          text: "Aconcagua and Huascarán are ruled out. Both remaining peaks are Ecuadorian volcanoes.",
          candidateIds: ["peak:chimborazo", "peak:cotopaxi"],
        },
      },
    },
    {
      ...common,
      id: "andes-titicaca-v1",
      label: "Lake",
      resolvedLabel: "Lake Titicaca",
      topic: "lakes and borders",
      title: "Two shores, one lake.",
      leadIn: "Continue south to a shared lake high on the Altiplano.",
      prompt: "Which two countries share Lake Titicaca?",
      mode: "choice-multiple",
      count: 2,
      rule: { type: "country-ids", ids: ["wurl:PER", "wurl:BOL"] },
      selection: { type: "none" },
      choices: choices(lakeCandidates),
      contextIds: lakeCandidates,
      focus: { lat: -16, lng: -69, altitude: 0.8 },
      feedbackFocus: { lat: -15.8, lng: -69.3, altitude: 0.2 },
      feedbackPhysicalFeatures: [altiplano, lake],
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
    },
    {
      ...common,
      id: "andes-aconcagua-v1",
      label: "Peak",
      resolvedLabel: "Aconcagua",
      topic: "mountains",
      title: "The highest stop.",
      leadIn: "Follow the range south to its highest peak.",
      prompt:
        "Which country contains Aconcagua, the highest mountain in the Americas?",
      instruction: "Tap a country on the globe.",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:ARG"] },
      selection: { type: "ids", ids: southAmerica },
      allowTyping: false,
      map: { ...common.map, hover: true, candidates: "neutral" },
      contextIds: ["wurl:CHL"],
      feedbackHintIds: ["wurl:CHL"],
      focus: { lat: -29, lng: -68, altitude: 0.65 },
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
    },
    {
      ...common,
      id: "andes-chile-neighbors-v2",
      label: "Border",
      resolvedLabel: "Chile’s neighbors",
      topic: "mountains and borders",
      title: "North to south beside Chile.",
      leadIn:
        "Finish along Chile, where the Andes run beside one of the world’s longest north–south countries.",
      prompt:
        "Drag Chile’s three land neighbors into north-to-south order. Leave the country that does not border Chile aside.",
      mode: "choice-order",
      count: 3,
      selection: { type: "none" },
      rule: {
        type: "country-ids",
        ids: ["wurl:PER", "wurl:BOL", "wurl:ARG"],
        ordered: true,
      },
      choices: choices(["wurl:BOL", "wurl:BRA", "wurl:ARG", "wurl:PER"]),
      orderLabels: ["North", "Middle", "South"],
      contextIds: ["wurl:CHL"],
      feedbackHintIds: ["wurl:CHL"],
      focus: { lat: -29, lng: -68, altitude: 1.35 },
      feedbackFocus: { lat: -27, lng: -64, altitude: 1.35 },
      feedbackPlaces: borderLabels,
      feedbackPhysicalFeatures: frontiers,
      explanation:
        "Peru meets Chile at its northern tip, Bolivia farther south, and Argentina along the long eastern frontier. Brazil borders all three neighbors, but never Chile.",
      correctFeedback: "Nicely ordered.",
      source: mapSource,
      guidance: {
        hint: "One card belongs farther east and never reaches Chile.",
        assist: {
          text: "Argentina is placed and locked in the southernmost slot. Any displaced card returns to the spare cards. Resolve the two northern slots and leave the non-neighbor aside.",
          fixedSlots: [{ index: 2, id: "wurl:ARG" }],
        },
      },
    },
  ],
};
