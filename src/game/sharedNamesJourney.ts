import { definePresentation, defineQuestion } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { cityReference, explanationPlace } from "./authoredPlaces";
import { US_STATES } from "../geography/usStates";
import type { FactSource, Journey } from "./questionContracts";
import type { PhysicalFeature, PlaceFeature } from "../geography/types";
import geography from "./data/shared-names-context.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-12",
});
const reference = (id: string, name?: string): PlaceFeature => {
  const place = ANSWER_PLACES.get(id);
  if (!place) throw Error(`Missing shared-name place: ${id}`);
  return { ...cityReference(place), ...(name ? { name } : {}) };
};
const chatham = cityReference(geography.chatham as PlaceFeature);
const kingston = cityReference(geography.kingston as PlaceFeature);
const london = reference("place:6058560");
const londonCandidates = [
  kingston,
  reference("place:6094817"),
  london,
  chatham,
];
const londonReferences = [
  reference("place:6167865"),
  reference("place:4990729"),
];
const capitals = [reference("place:2314302"), reference("place:2260535")];
const tripolis = [
  reference("place:2210247", "Tripoli · Libya"),
  reference("place:266826", "Tripoli · Lebanon"),
];
const falls = geography.falls as PlaceFeature;
const congo = geography.congo as PhysicalFeature[];
const zambezi = geography.zambezi as PhysicalFeature[];
const thames = geography.thames as PhysicalFeature;
const lakes = geography.lakes as PhysicalFeature[];
const lakeLabel = (
  id: string,
  name: string,
  lat: number,
  lng: number,
): PlaceFeature => ({
  id: `shared-names:${id}`,
  name,
  lat,
  lng,
  kind: "other",
  markerHidden: true,
  sourceId: "natural-earth:5.1.2",
  labelFlexible: true,
});
const georgia = lakeLabel("georgia-country", "Georgia", 42.2, 43.5);
const georgiaState = US_STATES.find((state) => state.id === "wurl:USA-GA")!;
const usGeorgia = lakeLabel(
  "georgia-state",
  "Georgia · U.S. state",
  32.6,
  -83.4,
);
const naturalEarth = source(
  "Natural Earth · public-domain river and lake geometry",
  "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
);
const thamesSource = source(
  "OpenStreetMap contributors · Ontario Thames River",
  "https://www.openstreetmap.org/relation/7666913",
);
const base = definePresentation({
  topic: "shared place-names",
  instruction: "",
  failure: "feedback",
  allowTyping: false,
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
    candidates: "highlighted",
    revealOnAnswer: true,
  },
});

export const SHARED_NAMES_JOURNEY: Journey = {
  id: "same-name-different-place-v1",
  addedAt: "2026-10-12",
  saveRevision: 2,
  title: "Same Name, Different Place",
  description:
    "One name can cross borders, borrow a history, or mean something entirely different. Explore five pairs of namesakes around the world.",
  rounds: [
    defineQuestion({
      ...base,
      id: "shared-names-congo",
      label: "River",
      progressLabel: "Shared river",
      resolvedLabel: "Republic of the Congo + DR Congo",
      title: "Two Congos.",
      leadIn:
        "In Central Africa, two neighboring countries share the name Congo.",
      prompt: "Find them on the globe.",
      mode: "map-multiple",
      count: 2,
      commitment: "submit",
      selection: {
        type: "ids",
        ids: [
          "wurl:COG",
          "wurl:COD",
          "wurl:GAB",
          "wurl:CMR",
          "wurl:CAF",
          "wurl:AGO",
        ],
      },
      rule: { type: "country-ids", ids: ["wurl:COG", "wurl:COD"] },
      explanation:
        "The Republic of the Congo and the Democratic Republic of the Congo share the river’s name. At Kinshasa and Brazzaville, their capitals face each other across the Congo River.",
      source: source(
        "NASA · Kinshasa and Brazzaville",
        "https://science.nasa.gov/earth/earth-observatory/kinshasa-and-brazzaville-4329/",
      ),
      sources: [naturalEarth],
      guidance: {
        hint: "Think of the great equatorial river basin. The two countries face each other across part of that river system.",
        assist: {
          text: "Four countries remain on the map. Two share the river’s name.",
          candidateIds: ["wurl:COG", "wurl:COD", "wurl:GAB", "wurl:CAF"],
        },
      },
      scenes: {
        play: { focus: { lat: -3, lng: 20, altitude: 0.9 } },
        reveal: {
          focus: { lat: -4.3, lng: 15.3, altitude: 0.14 },
          places: capitals,
          physicalFeatures: congo,
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "shared-names-london",
      label: "City",
      progressLabel: "The other London",
      resolvedLabel: "London, Ontario",
      title: "The other London.",
      leadIn:
        "London isn’t only in England. There’s another one in southern Ontario.",
      prompt: "Which marker is the Canadian London?",
      mode: "city-single",
      count: 1,
      commitment: "submit",
      selection: { type: "ids", ids: londonCandidates.map((p) => p.id) },
      rule: { type: "place-ids", ids: [london.id] },
      explanation:
        "London, Ontario sits upstream on the Thames; Chatham lies downstream, nearer Lake St. Clair. The city and river repeat names from England, on lands with much longer Indigenous histories.",
      source: source(
        "City of London · heritage",
        "https://london.ca/living-london/arts-heritage/heritage",
      ),
      sources: [
        source(
          "Chatham-Kent · Chatham",
          "https://www.chatham-kent.ca/livingck/communities/Pages/Chatham.aspx",
        ),
        thamesSource,
      ],
      guidance: {
        hint: "Two of these cities sit on Ontario’s Thames River. That river flows southwest toward Lake St. Clair.",
        assist: {
          text: "The two Thames River cities remain. Follow the river away from Lake St. Clair: which marker lies farther upstream?",
          candidateIds: [london.id, chatham.id],
        },
      },
      scenes: {
        play: {
          focus: { lat: 43.7, lng: -79.4, altitude: 0.3 },
          contextIds: ["wurl:CAN", "wurl:USA"],
          places: [...londonCandidates, ...londonReferences],
          map: { feedbackRegions: "neutral" },
        },
        assist: {
          focus: { lat: 42.7, lng: -81.65, altitude: 0.15 },
          physicalFeatures: [
            thames,
            lakes.find((l) => l.name === "Lake St. Clair")!,
          ],
        },
        reveal: {
          focus: { lat: 42.7, lng: -81.65, altitude: 0.13 },
          contextIds: ["wurl:CAN", "wurl:USA"],
          places: [...londonCandidates, ...londonReferences],
          physicalFeatures: [
            thames,
            lakes.find((l) => l.name === "Lake St. Clair")!,
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "shared-names-tripoli",
      label: "Place-name",
      progressLabel: "Three of something",
      resolvedLabel: "Tripoli, Libya + Tripoli, Lebanon",
      title: "Two Tripolis.",
      leadIn:
        "Libya and Lebanon each have a Mediterranean city called Tripoli.",
      prompt: "What does the Greek-derived name mean?",
      mode: "choice-single",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: { type: "choice-ids", ids: ["tripoli:three-cities"] },
      shuffleChoices: true,
      choices: ["cities", "ports", "islands", "rulers"].map((word) => ({
        id: `tripoli:three-${word}`,
        label: `Three ${word}`,
      })),
      explanation:
        "Tripoli means “three cities.” In Libya: Oea, Sabratha and Leptis Magna. Lebanon’s Tripoli was associated with communities from Tyre, Sidon and Arwad. Similar Greek words, distinct local histories.",
      source: source(
        "Britannica (1911) · Tripoli, North Africa",
        "https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Tripoli_%28North_Africa%29",
      ),
      sources: [
        source(
          "Britannica (1911) · Tripoli, Syria",
          "https://en.wikisource.org/wiki/1911_Encyclop%C3%A6dia_Britannica/Tripoli_%28Syria%29",
        ),
      ],
      guidance: {
        hint: "The first part, tri-, means three. Think about the kinds of places a Greek name might group together.",
        assist: {
          text: "Two meanings remain: Three cities or Three islands.",
          candidateIds: ["tripoli:three-cities", "tripoli:three-islands"],
        },
      },
      scenes: {
        play: {
          focus: { lat: 34.5, lng: 24.5, altitude: 1 },
          contextIds: ["wurl:LBY", "wurl:LBN"],
          places: tripolis,
          map: { feedbackRegions: "neutral" },
        },
        reveal: {
          contextIds: ["wurl:LBY", "wurl:LBN"],
          places: tripolis.map(explanationPlace),
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "shared-names-georgia",
      label: "Namesake",
      progressLabel: "Across the Caucasus",
      resolvedLabel: "Georgia (country) + Georgia (U.S. state)",
      title: "Across the Caucasus.",
      leadIn:
        "A U.S. state and a country in the Caucasus happen to share an English name.",
      prompt: "Find the country on the globe.",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: {
        type: "ids",
        ids: ["wurl:GEO", "wurl:ARM", "wurl:AZE", "wurl:TUR"],
      },
      rule: { type: "country-ids", ids: ["wurl:GEO"] },
      importedRegions: [georgiaState],
      explanation:
        "Georgians call their country Sakartvelo. Its English name is commonly traced through Persian-derived names for its people, though its ultimate origin is unsettled. The U.S. state honors King George II: a shared English name need not mean a shared namesake.",
      source: source(
        "Encyclopaedia Iranica · the land and people",
        "https://www.iranicaonline.org/articles/georgia-i/",
      ),
      sources: [
        source(
          "New Georgia Encyclopedia · historical overview",
          "https://www.georgiaencyclopedia.org/articles/history-archaeology/georgia-history-overview/",
        ),
      ],
      guidance: {
        hint: "Look between the eastern Black Sea and the Caucasus Mountains. A shared English spelling doesn’t mean the places were named for the same person.",
        assist: {
          text: "Three regional candidates remain. Use the Black Sea and Caucasus to orient yourself, then choose the country that shares a U.S. state’s name.",
          candidateIds: ["wurl:GEO", "wurl:TUR", "wurl:AZE"],
        },
      },
      scenes: {
        play: { focus: { lat: 40.5, lng: 40.5, altitude: 0.65 } },
        reveal: {
          focus: { lat: 42, lng: 43.5, altitude: 0.3 },
          answerIds: ["wurl:GEO"],
          contextIds: [georgiaState.id],
          places: [georgia],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "shared-names-victoria",
      label: "Waterfall",
      progressLabel: "Follow the river",
      resolvedLabel: "Mosi-oa-Tunya / Victoria Falls",
      title: "Victoria, by the river.",
      leadIn:
        "Lake Victoria lies in East Africa. Farther south, Victoria Falls is on the Zambezi River at the Zambia–Zimbabwe border.",
      prompt: "Drop a pin as close to the falls as you can.",
      instruction: "",
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: {
        type: "pin-distance",
        targetId: falls.id,
        radiusKm: 120,
        tiers: [
          { radiusKm: 40, feedback: "Bullseye!" },
          { radiusKm: 80, feedback: "Very close." },
          { radiusKm: 120, feedback: "In range." },
        ],
      },
      explanation:
        "Victoria Falls, also called Mosi-oa-Tunya (“The Smoke That Thunders”), drops into the Zambezi’s basalt gorges. Livingstone named the falls for Queen Victoria; Speke separately named the East African lake for her.",
      qualification:
        "Lake Victoria and Victoria Falls are not on the same river system. The royal names overlay much older local geographies.",
      source: source(
        "UNESCO · Mosi-oa-Tunya / Victoria Falls",
        "https://whc.unesco.org/en/list/509/",
      ),
      sources: [
        source(
          "Royal Geographical Society · John Hanning Speke",
          "https://www.rgs.org/our-collections/stories-from-our-collections/explore-our-collections/portrait-of-john-hanning-speke",
        ),
        naturalEarth,
        source("OpenStreetMap · Main Falls lip", geography.fallsSourceUrl),
      ],
      guidance: {
        hint: "Look upstream of Lake Kariba, toward the western stretch of the Zambia–Zimbabwe river boundary.",
        assist: {
          text: "Lake Kariba and two distant cities are now marked as references. Follow the Zambezi upstream from the lake; the waterfall is still unmarked.",
        },
      },
      scenes: {
        play: {
          focus: { lat: -9, lng: 29.5, altitude: 0.85 },
          contextIds: ["wurl:ZMB", "wurl:ZWE"],
          places: [falls],
          physicalFeatures: [
            ...zambezi,
            lakes.find((l) => l.name === "Lake Victoria")!,
          ],
          map: {
            feedbackRegions: "neutral",
            borderIds: ["wurl:ZMB", "wurl:ZWE"],
          },
        },
        assist: {
          physicalFeatures: [lakes.find((l) => l.name === "Lake Kariba")!],
          places: [reference("place:909137"), reference("place:894701")],
        },
        reveal: {
          focus: { lat: -17.9, lng: 25.9, altitude: 0.35 },
          contextIds: ["wurl:ZMB", "wurl:ZWE"],
          places: [falls],
          physicalFeatures: [
            ...zambezi,
            ...lakes.filter((l) => l.name !== "Lake St. Clair"),
          ],
        },
      },
    }),
  ],
  completion: {
    focus: { lat: -17.2, lng: 27, altitude: 0.55 },
    views: [
      { lat: -3, lng: 20, altitude: 0.9 },
      { lat: -4.3, lng: 15.3, altitude: 0.14 },
      { lat: 42.7, lng: -81.65, altitude: 0.15 },
      { lat: 34.5, lng: 24.5, altitude: 1 },
      { lat: 42, lng: 43.5, altitude: 0.3 },
      { lat: 32.6, lng: -83.4, altitude: 0.6 },
      { lat: -17.9, lng: 25.9, altitude: 0.23 },
      { lat: -1, lng: 33.3, altitude: 0.5 },
    ],
    regionIds: ["wurl:COG", "wurl:COD", "wurl:GEO", georgiaState.id],
    physicalFeatures: [...congo, thames, ...zambezi, ...lakes],
    places: [
      ...capitals,
      london,
      chatham,
      ...tripolis,
      georgia,
      usGeorgia,
      falls,
    ].map((p) => ({ ...p, visualState: "visited" })),
    caption:
      "One river, borrowed cities, an ancient Greek word, an accidental English match, and a royal name laid over an older one: a place-name rarely tells its whole story.",
    mapAttribution: {
      label: "Natural Earth · © OpenStreetMap contributors",
      url: "/geography/shared-names-context.v1.json",
    },
  },
  mapAttribution: {
    label: "Natural Earth · © OpenStreetMap contributors",
    url: "/geography/shared-names-context.v1.json",
  },
};
