import { definePresentation, defineQuestion } from "./questionBuilder";
import { cityReference } from "./authoredPlaces";
import { GLOBE_SYMBOLS } from "../globe/symbols";
import { CAPITALS } from "./quizData";
import type { FactSource, Journey } from "./questionContracts";
import type { MapOverlay, PlaceFeature } from "../geography/types";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-11",
});
const placesSource = source(
  "GeoNames · city coordinates",
  "https://www.geonames.org/",
);
const lizibaSource = source(
  "Liziba station designer · station and building designed together",
  "https://www.ichongqing.info/2022/01/06/which-came-first-liziba-station-or-its-residential-building/",
);
const depthSources = [
  source(
    "Independent Kyiv Metro guide · Arsenalna station",
    "https://kyivmetro.org/en/m1-line/arsenalna/",
  ),
  source(
    "Station depth comparison, including measurement conventions",
    "https://metroteca.com/en/depth/",
  ),
];
const quitoSource = source(
  "Transdev · Quito's underground metro line at 2,850 m",
  "https://www.transdev.com/en/news/south-america/press-release/commissioning-of-quitos-first-metro-line-jointly-operated-by-transdev",
);
const berlinSource = source(
  "Berlin government · Border and ghost stations in divided Berlin",
  "https://www.berlin.de/en/tickets/exhibitions/border-and-ghost-stations-in-divided-berlin-b20043c9-a84f-4435-a240-4b2b51a41410/",
);
const marmaraySource = source(
  "Marmaray tunnel construction consortium · Bosphorus rail crossing",
  "https://holding.gama.com.tr/en/project/10274/",
);
const hongyancunSource = source(
  "CSCEC · Hongyancun station's hillside entrances",
  "https://en.cscec.com/CompanyNews/CorporateNews/202510/3911551.html",
);
const stationMapSource = source(
  "© OpenStreetMap contributors · Hongyancun station location",
  "https://www.openstreetmap.org/node/9436112299",
);

const lizibaPhoto = {
  src: "/journeys/mind-the-gap/liziba.v1.jpg",
  alt: "A monorail train emerges from the middle floors of a tall apartment building built into a green hillside.",
  caption:
    "Liziba station, where Chongqing Rail Transit Line 2 passes through a residential-commercial building.",
  credit: {
    name: "David290 · Wikimedia Commons",
    url: "https://commons.wikimedia.org/wiki/File:A_train_of_Chongqing_Rail_Transit_Line_2_coming_through_a_residential_building_at_Liziba_2251.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
  },
};

const city = (
  geonameId: number,
  name: string,
  lat: number,
  lng: number,
  country: string,
): PlaceFeature =>
  cityReference({
    id: `place:${geonameId}`,
    name,
    kind: "city",
    lat,
    lng,
    parentId: `wurl:${country}`,
    sourceId: `geonames:${geonameId}`,
  });

// GeoNames place IDs/coordinates are fixed facts; don't derive grading from marker labels.
const chongqing = city(1814906, "Chongqing", 29.56026, 106.55771, "CHN");
const chengdu = city(1815286, "Chengdu", 30.66667, 104.06667, "CHN");
const xian = city(1790630, "Xi’an", 34.25833, 108.92861, "CHN");
const wuhan = city(1791247, "Wuhan", 30.58333, 114.26667, "CHN");
const guiyang = city(1809461, "Guiyang", 26.58333, 106.71667, "CHN");
const chinaCities: PlaceFeature[] = [
  chongqing,
  chengdu,
  xian,
  wuhan,
  guiyang,
].map((place) => ({
  ...place,
  markerSize: GLOBE_SYMBOLS.candidate,
  markerBadge: undefined,
}));

// The station appears only in the Q2 reveal; Ukraine is the answer.
const kyiv: PlaceFeature = {
  id: "mind-the-gap:kyiv-arsenalna",
  name: "Kyiv · Arsenalna (105.5 m)",
  kind: "landmark",
  lat: 50.4415,
  lng: 30.5455,
  parentId: "wurl:UKR",
  sourceId: "mind-the-gap:station-reference",
  displayRole: "reference",
  visualState: "hinted",
  labelFlexible: true,
};
const hongyancun: PlaceFeature = {
  id: "mind-the-gap:hongyancun",
  name: "Hongyancun · Chongqing",
  kind: "landmark",
  lat: 29.5525861,
  lng: 106.4893638,
  parentId: "wurl:CHN",
  sourceId: "osm:node:9436112299",
  displayRole: "reference",
  visualState: "hinted",
  labelFlexible: true,
};
const europeanSearch = { lat: 53.8, lng: 29.2, altitude: 0.88 };
const quito = city(3652462, "Quito", -0.22985, -78.52495, "ECU");
const berlin = city(2950159, "Berlin", 52.52437, 13.41053, "DEU");
// Match the existing Study continent grouping, using the globe's own country surfaces.
const europeBackground = [
  ...new Set([
    ...CAPITALS.filter((p) => p.continent === "EU").map((p) => p.countryId),
    "wurl:NE-KOS",
  ]),
];

// Grading is from an approximate midpoint of Marmaray's Bosphorus crossing,
// *not* a claimed survey coordinate of the precise tunnel alignment.
const bosphorusTarget: PlaceFeature = {
  id: "mind-the-gap:bosphorus-crossing",
  name: "Marmaray crossing · Bosphorus",
  kind: "landmark",
  lat: 41.021,
  lng: 29.0,
  sourceId: "mind-the-gap:approximate-crossing-midpoint",
  markerHidden: true,
  labelHidden: true,
  visualState: "surface",
  answerTarget: false,
};
const bosphorusRevealed: PlaceFeature = {
  ...bosphorusTarget,
  markerHidden: false,
  labelHidden: false,
  visualState: "answer",
  answerTarget: true,
};

const crossingSketch: MapOverlay = {
  id: "mind-the-gap:marmaray-schematic",
  type: "path",
  purpose: "comparison",
  coordinates: [
    [28.977, 41.018], // near Sirkeci; illustrative, not surveyed track geometry
    [29.0, 41.021],
    [29.018, 41.026], // near Uskudar
  ],
  dashed: true,
  opacity: 0.85,
  reveal: { durationMs: 1500 },
  label: "Marmaray · schematic Bosphorus crossing",
};

const base = definePresentation({
  label: "Underground",
  topic: "the surprising geography of urban rail",
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
    muteOthers: false,
    candidates: "neutral",
  },
});

export const MIND_THE_GAP_JOURNEY: Journey = {
  id: "mind-the-gap-v1",
  title: "Mind the Gap",
  description:
    "A train through a building, stations buried deep, a city in the clouds, ghost platforms, and a railway between continents.",
  addedAt: "2026-11-11",
  dailyEligible: false,
  mapAttribution: {
    label: "© OpenStreetMap contributors · station reference",
    url: "https://www.openstreetmap.org/copyright",
  },
  rounds: [
    defineQuestion({
      ...base,
      id: "mind-the-gap-01-through-the-building",
      title: "Through the Building",
      label: "A train through a building",
      progressLabel: "Through the building",
      resolvedLabel: "Liziba · Chongqing",
      leadIn:
        "In southwestern China, this monorail runs straight through the middle of a residential building.",
      prompt: "Which marked Chinese city is home to this station?",
      image: {
        src: lizibaPhoto.src,
        alt: lizibaPhoto.alt,
        feedbackAlt: lizibaPhoto.alt,
        presentation: "photo",
      },
      feedbackImage: lizibaPhoto,
      mode: "city-single",
      count: 1,
      selection: { type: "ids", ids: chinaCities.map((p) => p.id) },
      rule: { type: "place-ids", ids: [chongqing.id] },
      commitment: "submit",
      disclosure: { ...base.disclosure, namedChoices: true },
      guidance: {
        hint: "The city stands where the Jialing River meets the Yangtze, with neighborhoods climbing the surrounding hills.",
        assist: {
          text: "Two southwestern city markers remain. Use the photograph's steep hillside setting to decide.",
          candidateIds: [chengdu.id, chongqing.id],
          focus: { lat: 30.11, lng: 105.31, altitude: 0.42 },
        },
      },
      explanation:
        "This is Liziba station in Chongqing. Line 2's monorail passes through the middle floors of a building with shops below and homes above. The station and building were designed together, rather than the train cutting through an existing block.",
      qualification:
        "Liziba is a straddle-beam monorail, part of Chongqing's urban rail network, rather than an underground heavy-rail subway.",
      source: lizibaSource,
      sources: [
        placesSource,
        source(
          "Wikimedia Commons · Liziba photograph and license",
          lizibaPhoto.credit.url,
        ),
      ],
      scenes: {
        play: {
          focus: { lat: 30, lng: 108, altitude: 0.42 },
          contextIds: ["wurl:CHN"],
          places: chinaCities,
          map: { feedbackRegions: "neutral" },
        },
        reveal: {
          focus: { lat: 29.56, lng: 106.54, altitude: 0.23 },
          places: chinaCities,
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "mind-the-gap-02-the-deep-end",
      title: "The Deep End",
      label: "The deep end",
      progressLabel: "Arsenalna's country",
      resolvedLabel: "Arsenalna · Kyiv, Ukraine",
      leadIn:
        "Chongqing’s Hongyancun is widely regarded as the world’s deepest metro station. Kyiv’s Arsenalna held that record before it.",
      prompt: "Select the country home to that European station.",
      mode: "map-single",
      count: 1,
      selection: {
        type: "ids",
        ids: [
          "wurl:UKR",
          "wurl:RUS",
          "wurl:BLR",
          "wurl:POL",
          "wurl:FIN",
          "wurl:EST",
        ],
      },
      rule: { type: "country-ids", ids: ["wurl:UKR"] },
      commitment: "submit",
      map: {
        ...base.map!,
        candidates: "highlighted",
        muteOthers: true,
      },
      guidance: {
        hint: "Kyiv stands on the Dnipro River, south of Belarus.",
        assist: {
          text: "Ukraine, Belarus and Poland remain. Select the country whose capital is Kyiv.",
          candidateIds: ["wurl:UKR", "wurl:BLR", "wurl:POL"],
          focus: { lat: 52, lng: 26, altitude: 0.7 },
        },
      },
      explanation:
        "Arsenalna is in Kyiv, Ukraine. Its platforms lie about 105.5 meters below ground beneath the city's high riverbank. Chongqing's Hongyancun is commonly quoted at about 116 meters: in both cities, steep terrain can turn reaching a train into a remarkable vertical journey.",
      qualification:
        "Station depths are approximate. Measurements may refer to a platform, track or entrance, so figures quoted for different stations are not always directly comparable.",
      source: depthSources[0],
      sources: [depthSources[1], hongyancunSource, stationMapSource],
      scenes: {
        play: {
          // Deliberately regional. Auto-fit would include all of Russia and zoom out too far.
          focus: europeanSearch,
          views: [
            { lat: hongyancun.lat, lng: hongyancun.lng, altitude: 0.12 },
            { lat: 43, lng: 80, altitude: 1.7 },
            europeanSearch,
          ],
          durationScale: 0.4,
          contextIds: [],
          places: [hongyancun],
          map: { candidates: "highlighted", muteOthers: true },
        },
        reveal: {
          focus: { lat: 49, lng: 31, altitude: 0.42 },
          answerIds: ["wurl:UKR"],
          places: [kyiv],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "mind-the-gap-03-above-sea-level",
      title: "Above Sea Level",
      label: "Above sea level",
      progressLabel: "Quito's metro",
      resolvedLabel: "Quito Metro · approximately 2,850 m",
      leadIn:
        "Quito’s metro runs entirely underground, yet it is the world’s highest metro line.",
      prompt: "Roughly how many meters above sea level do its trains run?",
      mode: "slider",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      inputLabel: "Metro elevation above sea level",
      rule: {
        type: "numeric-range",
        min: 0,
        max: 5000,
        step: 50,
        value: 2850,
        unit: "m",
        tolerance: 900,
        answerLabel: "Quito Metro · approximate elevation",
        tiers: [
          { tolerance: 200, feedback: "Well estimated." },
          { tolerance: 500, feedback: "A close estimate." },
          { tolerance: 900, feedback: "Within range." },
        ],
      },
      guidance: {
        hint: "The railway runs high in the Andes, well above 2,000 meters.",
        assist: {
          text: "It's between 2,000 and 4,000 meters above sea level. Make your best estimate.",
        },
      },
      explanation:
        "Quito's metro runs at roughly 2,850 meters above sea level through a 22.6-kilometer tunnel. After the deep descents in Chongqing and Kyiv, it flips the perspective: underground means below the local surface, which can still be high above the sea.",
      qualification:
        "2,850 m is the operator's approximate elevation for the line, rather than an exact surveyed height shared by every platform.",
      source: quitoSource,
      sources: [placesSource],
      scenes: {
        play: {
          focus: { lat: -0.4, lng: -78.65, altitude: 0.66 },
          contextIds: ["wurl:ECU"],
          places: [quito],
          map: { feedbackRegions: "neutral" },
        },
        reveal: {
          focus: { lat: -0.23, lng: -78.52, altitude: 0.3 },
          contextIds: ["wurl:ECU"],
          places: [quito],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "mind-the-gap-04-ghost-stations",
      title: "Ghost Stations",
      label: "Ghost stations",
      progressLabel: "Ghost stations",
      resolvedLabel: "Berlin · the ghost stations",
      leadIn:
        "During the Cold War, trains serving the west passed through sealed stations in the east without stopping.",
      prompt: "Which city’s metro had these guarded “ghost stations”?",
      mode: "text",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      inputLabel: "City",
      rule: { type: "capital-name", countryId: "wurl:DEU" },
      map: {
        ...base.map!,
        borders: false,
        hoverFeedback: false,
        feedbackRegions: "neutral",
        backgroundRegionIds: europeBackground,
      },
      visualExceptions: {
        "hidden-boundaries":
          "A borderless European view supplies orientation for a historical metro question. Germany is supplied only by assistance or reveal.",
      },
      guidance: {
        hint: "Its postwar division became one of the defining symbols of the Cold War.",
        assist: {
          text: "The city is in Germany. Its famous wall began separating East and West in 1961.",
          regionIds: ["wurl:DEU"],
          focus: { lat: 51, lng: 10, altitude: 0.5 },
        },
      },
      explanation:
        "In divided Berlin, West Berlin trains used routes that ran under East Berlin. The eastern stations were sealed, and trains passed slowly through darkened platforms guarded by border personnel. After the Wall fell, the ghost stations reopened in stages.",
      qualification:
        "The history concerns U-Bahn and S-Bahn lines. Friedrichstraße was an exception: passengers could use its controlled interchange and border checkpoint.",
      source: berlinSource,
      sources: [placesSource],
      scenes: {
        play: {
          focus: { lat: 52, lng: 13, altitude: 1.18 },
          contextIds: [],
          map: { borders: false },
        },
        assist: {
          backgroundRegionIds: [],
        },
        reveal: {
          focus: { lat: 52.52, lng: 13.41, altitude: 0.32 },
          contextIds: ["wurl:DEU"],
          places: [
            { ...berlin, visualState: "answer", displayRole: undefined },
          ],
          borders: true,
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "mind-the-gap-05-between-continents",
      title: "Between Continents",
      label: "Between continents",
      progressLabel: "Beneath the Bosphorus",
      resolvedLabel: "Marmaray · Istanbul",
      leadIn:
        "In Istanbul, Marmaray trains travel beneath the Bosphorus Strait, linking Europe and Asia under the water.",
      prompt: "Place a pin where this crossing is, as close as you can.",
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: {
        type: "pin-distance",
        targetId: bosphorusTarget.id,
        radiusKm: 300,
        tiers: [
          { radiusKm: 50, feedback: "Well placed." },
          { radiusKm: 150, feedback: "Very close." },
          { radiusKm: 300, feedback: "Within range." },
        ],
      },
      map: {
        ...base.map!,
        neutralRegions: true,
        feedbackRegions: "neutral",
      },
      visualExceptions: {
        "natural-background":
          "The world remains ordinary reference geography for a free coordinate search; no country is an answer surface.",
      },
      guidance: {
        hint: "Find northwestern Türkiye, where the Black Sea leads into the Sea of Marmara.",
        assist: {
          text: "Türkiye is highlighted for reference. Look at its northwestern edge: the Bosphorus separates Istanbul's European and Asian shores.",
          regionIds: ["wurl:TUR"],
          focus: { lat: 40, lng: 34, altitude: 0.9 },
        },
      },
      explanation:
        "Marmaray opened its rail tunnel beneath the Bosphorus in 2013. A commuter train can now travel between Istanbul's European and Asian sides without taking a bridge or ferry. The immersed-tube section runs roughly 1.4 kilometers beneath the strait; the line's deepest point is more than 60 meters below sea level.",
      qualification:
        "Marmaray is a commuter railway. The map shows an approximate crossing location and a schematic line between the shores, rather than the tunnel's exact alignment.",
      source: marmaraySource,
      scenes: {
        play: {
          // Pull back from the current view and rotate; this is a static fallback.
          focus: { lat: 5, lng: -78, altitude: 2.2 },
          orbit: true,
          contextIds: [],
          places: [bosphorusTarget],
          overlays: [],
          map: { neutralRegions: true },
        },
        reveal: {
          focus: { lat: 41.021, lng: 29, altitude: 0.18 },
          views: [
            { lat: 42, lng: 29, altitude: 0.84 },
            { lat: 41.021, lng: 29, altitude: 0.18 },
          ],
          places: [bosphorusRevealed],
          overlays: [crossingSketch],
        },
      },
    }),
  ],
  completion: {
    mapMode: "cumulative",
    contextIds: ["wurl:CHN", "wurl:ECU", "wurl:DEU"],
    focus: { lat: 30, lng: 25, altitude: 2.2 },
    views: [
      { lat: 30, lng: 107, altitude: 0.78 },
      { lat: 54, lng: 29, altitude: 0.95 },
      { lat: -0.23, lng: -78.52, altitude: 0.82 },
      { lat: 52.52, lng: 13.41, altitude: 0.7 },
      { lat: 41.021, lng: 29.0, altitude: 0.65 },
    ],
    physicalFeatures: [],
    places: [quito, kyiv],
    overlays: [crossingSketch],
    caption:
      "Above cities, far beneath them, through divided history, and under the water between continents: city railways reveal just how unusual the world's geography can be.",
  },
};
