import { areaLabel, cityReference } from "./authoredPlaces";
import { ANSWER_PLACES } from "./answerTargets";
import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import type { Focus, MapOverlay, PlaceFeature } from "../geography/types";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-19",
});
const gazetteer = (id: string, name: string) =>
  source(`GeoNames · ${name}`, `https://www.geonames.org/${id}/`);
const point = (
  id: string,
  name: string,
  lat: number,
  lng: number,
  sourceId: string,
  kind: PlaceFeature["kind"] = "landform",
): PlaceFeature => ({
  id,
  name,
  lat,
  lng,
  sourceId,
  kind,
  visualState: "answer",
  labelFlexible: true,
  priority: 100,
});
const reference = (place: PlaceFeature): PlaceFeature => ({
  ...place,
  displayRole: "reference",
  visualState: "hinted",
  answerTarget: false,
});

// Reviewed island reference points, not invented settlements or country centroids.
const rapaNui = point(
  "remote:rapa-nui",
  "Rapa Nui",
  -27.11667,
  -109.36667,
  "geonames:4030726",
);
const ittoqqortoormiit = point(
  "place:3422891",
  "Ittoqqortoormiit",
  70.48456,
  -21.96221,
  "geonames:3422891",
  "city",
);
const tristan = point(
  "remote:tristan-da-cunha",
  "Tristan da Cunha",
  -(37 + 6.714 / 60),
  -(12 + 17.33 / 60),
  "tristandc:ATBA:2020:queen-marys-peak",
);
const bouvet = point(
  "remote:bouvet",
  "Bouvet Island",
  -(54 + 25 / 60),
  3 + 20 / 60,
  "npolar:bouvetoya",
);
// Versioned NOAA conventional coordinate: never silently replace it with a refinement.
const nemo = point(
  "remote:point-nemo:noaa-v1",
  "Point Nemo",
  -(48 + 52.6 / 60),
  -(123 + 23.6 / 60),
  "noaa:point-nemo:conventional-v1",
  "ocean",
);
const targets = [rapaNui, ittoqqortoormiit, tristan, bouvet, nemo];
const pitcairn = reference(
  point(
    "place:4030700",
    "Pitcairn Island",
    -25.07075,
    -130.10834,
    "geonames:4030700",
  ),
);
const tasiilaq = cityReference(
  point(
    "place:3424607",
    "Tasiilaq",
    65.61451,
    -37.63676,
    "geonames:3424607",
    "city",
  ),
);
const edinburgh = cityReference(
  point(
    "place:3370726",
    "Edinburgh of the Seven Seas",
    -37.06757,
    -12.31155,
    "geonames:3370726",
    "city",
  ),
);
const stHelena = areaLabel(
  reference(
    point(
      "place:6930057",
      "St Helena",
      -15.93183,
      -5.71817,
      "geonames:6930057",
    ),
  ),
);
const valparaiso = cityReference(ANSWER_PLACES.get("place:3868626")!);
const capeTown = cityReference(ANSWER_PLACES.get("place:3369157")!);
const montevideo = cityReference(ANSWER_PLACES.get("place:3441575")!);
const nearestLand = [
  reference(
    point(
      "place:4030717",
      "Ducie Island",
      -24.67406,
      -124.77733,
      "geonames:4030717",
    ),
  ),
  {
    ...reference(
      point(
        "place:4030745",
        "Motu Nui · Rapa Nui group",
        -27.20116,
        -109.45292,
        "geonames:4030745",
      ),
    ),
    // Rapa Nui carries the shared label at this scale; the reveal names Motu Nui.
    labelHidden: true,
  },
  reference(
    point(
      "remote:maher-island",
      "Maher Island",
      -(72 + 58 / 60),
      -(126 + 22 / 60),
      "scar:128348",
    ),
  ),
];
// Paths interpolate as great circles in the shared renderer. These compare actual
// gazetteer island points; they do not pretend to survey each nearest shoreline.
const nemoComparisons: MapOverlay[] = nearestLand.map((land) => ({
  id: `ffe:land-distance:${land.id}`,
  type: "path",
  coordinates: [
    [nemo.lng, nemo.lat],
    [land.lng, land.lat],
  ],
  dashed: true,
}));
const nemoCaption =
  "Dashed lines compare island reference points. The nearest shore is about 2,688 km away.";
const parallel = (latitude: number): MapOverlay => ({
  id: `ffe:parallel:${latitude}`,
  type: "parallel",
  latitude,
});
const unesco = source(
  "UNESCO · Rapa Nui cultural landscape",
  "https://whc.unesco.org/en/list/715/",
);
const greenland = source(
  "Visit Greenland · Ittoqqortoormiit and access",
  "https://visitgreenland.com/destinations/ittoqqortoormiit/",
);
const tristanLocation = source(
  "Tristan da Cunha Government · Queen Mary's Peak coordinates",
  "https://www.tristandc.com/wildlife/atbashippingrules.php",
);
const tristanAccess = source(
  "Tristan da Cunha Government · no airport",
  "https://www.tristandc.com/government/news-2023-03-15-admin-medevac.php",
);
const polar = source(
  "Norwegian Polar Institute · Bouvetøya",
  "https://npolar.no/en/themes/bouvetoya/",
);
const noaa = source(
  "NOAA · Point Nemo",
  "https://oceanservice.noaa.gov/facts/nemo.html",
);
const maherSource = source(
  "SCAR / Australian Antarctic Data Centre · Maher Island",
  "https://data.aad.gov.au/aadc/gaz/display_name.cfm?gaz_id=128348",
);
const common = definePresentation({
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
    feedbackRegions: "neutral",
  },
});

type Stop = {
  id: string;
  label: string;
  progress: string;
  leadIn: string;
  prompt: string;
  bands: [number, number, number];
  focus: Focus;
  revealFocus: Focus;
  contextIds: string[];
  references?: PlaceFeature[];
  hint: string;
  assist: string;
  assistPlaces?: PlaceFeature[];
  assistOverlays?: MapOverlay[];
  revealPlaces?: PlaceFeature[];
  explanation: string;
  source: FactSource;
  sources: FactSource[];
};
const stops: Stop[] = [
  {
    id: "ffe-01-rapa-nui",
    label: "Pacific",
    progress: "Across the Pacific",
    leadIn:
      "Far into the South Pacific, a Polynesian island belonging to Chile is famous for its moai.",
    prompt: "Rapa Nui lies about 3,700 km from continental Chile. Where is it?",
    bands: [200, 450, 700],
    focus: { lat: -24, lng: -94, altitude: 1.3 },
    revealFocus: { lat: -27, lng: -98, altitude: 1.05 },
    contextIds: ["wurl:CHL"],
    hint: "It's south of the Tropic of Capricorn, not near the Equator.",
    assist:
      "Valparaíso and Pitcairn Island are now marked far apart. Look between them, closer to Pitcairn.",
    assistPlaces: [valparaiso, pitcairn],
    explanation:
      "Rapa Nui sits thousands of kilometres west of continental Chile. Its moai and ceremonial platforms belong to a distinctive Polynesian cultural landscape that developed amid extraordinary oceanic isolation.",
    source: unesco,
    sources: [
      gazetteer("4030726", "Rapa Nui island reference"),
      gazetteer("3868626", "Valparaíso"),
      gazetteer("4030700", "Pitcairn Island"),
    ],
  },
  {
    id: "ffe-02-ittoqqortoormiit",
    label: "Arctic",
    progress: "The Arctic edge",
    leadIn:
      "On Greenland's eastern coast, a small town sits beside the entrance to a vast fjord system.",
    prompt: "Where is Ittoqqortoormiit?",
    bands: [150, 300, 450],
    focus: { lat: 72, lng: -31, altitude: 0.85 },
    revealFocus: { lat: 70.48456, lng: -21.96221, altitude: 0.4 },
    contextIds: ["wurl:GRL", "wurl:ISL"],
    hint: "Look high on the east coast, around 70° north—well above the Arctic Circle.",
    assist:
      "A 70°N latitude guide and Tasiilaq, another East Greenland town far to the south, are shown. Follow the coast north from Tasiilaq.",
    assistPlaces: [tasiilaq],
    assistOverlays: [parallel(70)],
    explanation:
      "Ittoqqortoormiit sits by the Scoresby Sund fjord system. Even reaching the town can require flying via Iceland to a regional airfield, then continuing by helicopter, boat, or snowmobile.",
    source: greenland,
    sources: [
      gazetteer("3422891", "Ittoqqortoormiit"),
      gazetteer("3424607", "Tasiilaq"),
    ],
  },
  {
    id: "ffe-03-tristan",
    label: "South Atlantic",
    progress: "The loneliest village",
    leadIn:
      "Between South America and southern Africa, a volcanic island supports the settlement of Edinburgh of the Seven Seas.",
    prompt: "Where is Tristan da Cunha?",
    bands: [250, 500, 750],
    focus: { lat: -28, lng: -19, altitude: 1.65 },
    revealFocus: { lat: -37.09, lng: -12.3, altitude: 0.4 },
    contextIds: ["wurl:ARG", "wurl:URY", "wurl:BRA", "wurl:ZAF", "wurl:NAM"],
    references: [capeTown, montevideo],
    hint: "The island is south of both cities, and it lies closer to Africa than to South America.",
    assist:
      "St Helena is now labelled farther north in the Atlantic. Tristan is well south of it.",
    assistPlaces: [stHelena],
    revealPlaces: [edinburgh],
    explanation:
      "Tristan da Cunha is home to Edinburgh of the Seven Seas. With no airport, reaching the community means travelling by sea—often from Cape Town. The village sits on the island's northern coast beneath Queen Mary's Peak.",
    source: tristanLocation,
    sources: [
      tristanAccess,
      source(
        "Tristan da Cunha Government · a voyage from Cape Town",
        "https://www.tristandc.com/government/news-2023-11-10-philipkendallarrival.php",
      ),
      gazetteer("3370726", "Edinburgh of the Seven Seas"),
      gazetteer("6930057", "St Helena"),
      gazetteer("3369157", "Cape Town"),
      gazetteer("3441575", "Montevideo"),
    ],
  },
  {
    id: "ffe-04-bouvet",
    label: "Southern Ocean",
    progress: "An island without neighbors",
    leadIn:
      "Leave the inhabited Atlantic behind. Norway claims a tiny, ice-covered island south of Africa, far beyond Tristan da Cunha.",
    prompt: "Where is Bouvet Island?",
    bands: [250, 500, 800],
    focus: { lat: -45, lng: -9, altitude: 1.4 },
    revealFocus: { lat: -54.41667, lng: 3.33333, altitude: 0.65 },
    contextIds: ["wurl:ZAF", "wurl:ATA"],
    references: [reference(tristan)],
    hint: "Look south of 50°S, but north of Antarctica. The island is farther east than Tristan.",
    assist:
      "A 55°S parallel now crosses the search area. Look near it, south of the Atlantic and southwest of Africa.",
    assistOverlays: [parallel(-55)],
    explanation:
      "Bouvetøya is a Norwegian nature reserve with no permanent population. About 89% of its 49-square-kilometre surface is glaciated. It lies roughly 1,700 km north of Antarctica's coast, outside Antarctica itself.",
    source: polar,
    sources: [tristanLocation],
  },
  {
    id: "ffe-05-point-nemo",
    label: "Ocean",
    progress: "Farthest from land",
    leadIn:
      "We've visited isolated communities and uninhabited land. Now head into the open ocean.",
    prompt:
      "Where is Point Nemo, the spot in the South Pacific farthest from any land?",
    bands: [300, 600, 900],
    focus: { lat: -37, lng: -112, altitude: 1.85 },
    revealFocus: { lat: -49, lng: -123, altitude: 1.25 },
    contextIds: ["wurl:CHL", "wurl:NZL", "wurl:ATA"],
    references: [reference(rapaNui)],
    hint: "Head southwest of Rapa Nui. The nearest land can be a tiny island, not a continent.",
    assist:
      "A 50°S latitude guide and Pitcairn Island are now shown. Look far south of Pitcairn, west of South America and southwest of Rapa Nui.",
    assistPlaces: [pitcairn],
    assistOverlays: [parallel(-50)],
    revealPlaces: nearestLand,
    explanation:
      "Point Nemo is the oceanic pole of inaccessibility. Its nearest land is Ducie Island, Motu Nui near Rapa Nui, and Maher Island in Antarctica—each thousands of kilometres away.",
    source: noaa,
    sources: [
      gazetteer("4030717", "Ducie Island"),
      gazetteer("4030745", "Motu Nui"),
      maherSource,
      gazetteer("4030700", "Pitcairn Island"),
    ],
  },
];

export const FAR_FROM_EVERYTHING_JOURNEY: Journey = {
  id: "far-from-everything",
  addedAt: "2026-10-19",
  availability: "unlisted",
  title: "Far From Everything",
  description:
    "Five pins explore what remoteness means: an island across an ocean, an Arctic town, a village reached by sea, uninhabited land, and the emptiest part of the Pacific.",
  completion: {
    focus: { lat: -49, lng: -123, altitude: 1.3 },
    views: stops.map((stop) => stop.revealFocus),
    borders: true,
    physicalFeatures: [],
    places: [
      ...targets.map((target) => ({
        ...target,
        visualState: "visited" as const,
      })),
      ...nearestLand,
    ],
    overlays: nemoComparisons,
    mapCaption:
      "Dashed great-circle lines compare Point Nemo with three island reference points.",
    caption:
      "Across oceans, along an Arctic coast and beyond the last inhabited island, distance shaped five different places. Point Nemo takes that isolation furthest: even the nearest land is nearly 2,700 km away.",
  },
  rounds: stops.map((stop, index) => {
    const target = targets[index];
    const [inner, middle, outer] = stop.bands;
    return defineQuestion({
      ...common,
      id: stop.id,
      label: stop.label,
      progressLabel: stop.progress,
      resolvedLabel: target.name,
      title: stop.progress,
      topic: "remoteness",
      leadIn: stop.leadIn,
      prompt: stop.prompt,
      instruction: `Drop a pin within ${outer} km. The bullseye is ${inner} km; the other accepted bands end at ${middle} km and ${outer} km.`,
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: {
        type: "pin-distance",
        targetId: target.id,
        radiusKm: outer,
        tiers: [
          { radiusKm: inner, feedback: "Bullseye!" },
          { radiusKm: middle, feedback: "Very close." },
          { radiusKm: outer, feedback: "In range." },
        ],
      },
      explanation: stop.explanation,
      source: stop.source,
      sources: stop.sources,
      ...(target === nemo
        ? {
            qualification:
              "Point Nemo's conventional position can shift slightly with different coastline measurements.",
            feedbackMapCaption: nemoCaption,
          }
        : {}),
      guidance: { hint: stop.hint, assist: { text: stop.assist } },
      scenes: {
        play: {
          focus: stop.focus,
          contextIds: stop.contextIds,
          places: [target, ...(stop.references ?? [])],
        },
        assist: {
          places: stop.assistPlaces ?? [],
          overlays: stop.assistOverlays ?? [],
        },
        reveal: {
          focus: stop.revealFocus,
          contextIds: stop.contextIds,
          places: [
            target,
            ...(stop.references ?? []),
            ...(stop.revealPlaces ?? []),
          ],
          overlays: target === nemo ? nemoComparisons : [],
        },
      },
    });
  }),
};
