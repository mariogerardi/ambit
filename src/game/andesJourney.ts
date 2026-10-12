import { withReliefClearance } from "../geography/relief";
import { defineQuestion, definePresentation } from "./questionBuilder";
import { CAPITALS, capitalSource } from "./quizData";
import { ANSWER_PLACES } from "./answerTargets";
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
const colony: PlaceFeature = {
  id: "andes:king-penguin-colony",
  name: "King penguin colony",
  kind: "other",
  lat: -53.460556,
  lng: -69.305833,
  parentId: "wurl:CHL",
  sourceId: "vidal-2023:king-penguin-reserve",
  visualState: "answer",
  labelFlexible: true,
  priority: 100,
};
const colonySource = source(
  "Reserva Natural Pingüino Rey · wild breeding colony",
  "https://www.pinguinorey.com/conoce-al-pinguino-rey/",
);
const colonyLocationSource = source(
  "Vidal et al. · reserve location and coordinates",
  "https://www.scielo.cl/article_plus.php?lng=es&pid=S0717-66432023000100001&tlng=es",
);
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
  { ...colony, visualState: "visited" },
];
const cordoba = ANSWER_PLACES.get("place:3860259")!;
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
    "Follow South America’s mountain spine: a highland capital, an equatorial surprise, a shared lake, the highest peak, and coastal wildlife in Tierra del Fuego.",
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
      { lat: colony.lat, lng: colony.lng, altitude: 0.45 },
      { lat: -20, lng: -72, altitude: 1.65 },
    ],
    regionIds: andeanCountries,
    physicalFeatures: [andesAtLake, lake],
    places: discoveries,
    caption:
      "From Bogotá’s highlands to the king penguins of Tierra del Fuego, this Journey connects cities, summits, a shared lake and a living southern coast.",
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
          "Bogotá · city location and elevation",
          "https://bogota.gov.co/en/node/78",
        ),
        source(
          "Inparques · Waraira Repano and the Coastal Range",
          "https://www.inparques.gob.ve/cms/main/verCalendarioV/1808",
        ),
      ],
      guidance: {
        hint: "One candidate sits on a plateau more than 2,000 meters above sea level.",
        assist: {
          text: "Medellín and Paramaribo are ruled out. Choose between Bogotá and Caracas.",
          candidateIds: ["city:bogota", "city:caracas"],
        },
      },
      scenes: {
        play: {
          contextIds: ["wurl:COL", "wurl:VEN"],
          map: { ...common.map, feedbackRegions: "neutral" },
          focus: { lat: 6, lng: -72, altitude: 0.6 },
        },
        reveal: {
          contextIds: ["wurl:COL", "wurl:VEN"],
          answerIds: [],
          focus: { lat: 5.5, lng: -73, altitude: 0.32 },
          places: [
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
        },
      },
    }),
    defineQuestion({
      count: 1,
      commitment: "submit",

      ...common,
      id: "andes-chimborazo-v2",
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
      scenes: {
        play: {
          overlays: [{ id: "andes:equator", type: "parallel", latitude: 0 }],
          contextIds: ["wurl:ECU"],
          map: { ...common.map, feedbackRegions: "neutral" },
          focus: { lat: -1.5, lng: -78, altitude: 0.3 },
        },
        reveal: {
          contextIds: ["wurl:ECU"],
          answerIds: [],
          focus: { lat: -1.5, lng: -78.8, altitude: 0.18 },
          places: [chimborazo],
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
      disclosure: {
        ...common.disclosure,
        hoverNames: true,
        namedChoices: true,
        committedNames: true,
      },
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
      scenes: {
        play: {
          contextIds: [],
          map: {
            ...common.map,
            hoverFeedback: true,
            candidates: "highlighted",
          },
          focus: { lat: -13.5, lng: -72, altitude: 0.8 },
        },
        reveal: {
          focus: { lat: -15.8, lng: -69.3, altitude: 0.2 },
          physicalFeatures: [andesAtLake, lake],
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
      explanation:
        "The summit rises in Mendoza province, about 15 km east of the Chilean frontier. The highest point is on the Argentine side.",
      source: source(
        "Argentina’s space agency · Aconcagua beside the Chilean frontier",
        "https://www.argentina.gob.ar/ciencia/conae/educacion-y-formacion-masiva/materiales-educativos/cerro-aconcagua-mendoza-sentinel-2a-msi-28-de-febrero-de-2017",
      ),
      sources: [
        ...common.sources!,
        source(
          "GeoNames · Córdoba reference coordinates",
          "https://www.geonames.org/3860259/cordoba.html",
        ),
      ],
      guidance: {
        hint: "Look in western Mendoza province, just east of the Chilean border.",
        assist: {
          text: "Córdoba is marked as a reference. Look southwest of it, along Argentina’s border with Chile. The summit stays unmarked.",
        },
      },
      scenes: {
        play: {
          map: {
            ...common.map,
            feedbackRegions: "neutral",
            borderIds: ["wurl:ARG", "wurl:CHL"],
          },
          contextIds: ["wurl:ARG", "wurl:CHL"],
          focus: { lat: -34, lng: -68.5, altitude: 0.4 },
          places: [
            aconcagua,
            countryLabel("ARG", "Argentina", -33.5, -66.5),
            countryLabel("CHL", "Chile", -34.5, -71.5),
          ],
        },
        assist: {
          places: [
            {
              ...cordoba,
              visualState: "hinted",
              labelFlexible: true,
              priority: 100,
            },
          ],
        },
        reveal: {
          focus: { lat: -32.65, lng: -70, altitude: 0.2 },
          places: [aconcagua],
        },
      },
    }),
    defineQuestion({
      commitment: "submit",

      ...common,
      id: "andes-chile-neighbors-v2",
      count: 1,
      label: "Wildlife",
      resolvedLabel: "King penguins · Tierra del Fuego",
      topic: "southern coastal wildlife",
      title: "A wild southern shore.",
      leadIn: "Finish on the shores of Bahía Inútil in Tierra del Fuego.",
      prompt: "Which of these animals breeds here in the wild?",
      mode: "choice-single",
      selection: { type: "none" },
      rule: { type: "choice-ids", ids: ["animal:penguins"] },
      choices: [
        { id: "animal:penguins", label: "Penguins" },
        { id: "animal:puffins", label: "Puffins" },
        { id: "animal:walruses", label: "Walruses" },
        { id: "animal:polar-bears", label: "Polar bears" },
      ],
      explanation:
        "King penguins breed here on a South American shore, as well as on subantarctic islands. Penguins’ breeding grounds extend far beyond Antarctica.",
      correctFeedback: "A wild discovery.",
      source: colonySource,
      sources: [colonyLocationSource],
      feedbackImage: {
        src: "/journeys/andes/king-penguin-colony.v1.jpg",
        alt: "Wild king penguins beside the water at Bahía Inútil, Tierra del Fuego.",
        caption:
          "The wild colony at Bahía Inútil, on Isla Grande de Tierra del Fuego.",
        credit: {
          name: "Gillermo Adolfo",
          url: "https://commons.wikimedia.org/wiki/File:Pinguinos_Rey,_Parque_del_mismo_nombre,_bahia_inutil_,Tierra_del_Fuego_-_panoramio.jpg",
          license: "CC BY 3.0",
          licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        },
      },
      guidance: {
        hint: "Cold coastal wildlife differs between the Arctic and the far south.",
        assist: {
          text: "Walruses and polar bears are ruled out. Choose between penguins and puffins.",
          candidateIds: ["animal:penguins", "animal:puffins"],
        },
      },
      scenes: {
        play: {
          contextIds: ["wurl:CHL", "wurl:ARG"],
          map: {
            ...common.map,
            feedbackRegions: "neutral",
            borderIds: ["wurl:CHL", "wurl:ARG"],
          },
          focus: { lat: -53.6, lng: -69.5, altitude: 0.45 },
          physicalFeatures: [],
          places: [
            countryLabel("bahia-inutil", "Bahía Inútil", -53.35, -69.65),
            countryLabel("tierra-del-fuego", "Tierra del Fuego", -54.05, -68.4),
          ],
        },
        reveal: {
          focus: { lat: colony.lat, lng: colony.lng, altitude: 0.22 },
          places: [colony],
        },
      },
    }),
  ],
};
