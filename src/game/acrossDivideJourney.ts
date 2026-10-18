import { definePresentation, defineQuestion } from "./questionBuilder";
import { CAPITALS } from "./quizData";
import { US_STATES } from "../geography/usStates";
import type { FactSource, Journey } from "./questionContracts";
import type { PlaceFeature } from "../geography/types";

type Point = { lat: number; lng: number };
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-17",
});
const bridge = (id: string, name: string, point: Point): PlaceFeature => ({
  id: `bridge:${id}`,
  name,
  kind: "landmark",
  ...point,
  sourceId: "authored-bridge-location:2026-10-17",
  visualState: "answer",
  labelFlexible: true,
  priority: 100,
});
const place = (
  id: string,
  name: string,
  point: Point,
  kind: PlaceFeature["kind"] = "city",
): PlaceFeature => ({
  id: `bridge-context:${id}`,
  name,
  kind,
  ...point,
  sourceId: "authored-bridge-context:2026-10-17",
  visualState: "hinted",
  labelFlexible: true,
  priority: 90,
});
const label = (
  id: string,
  name: string,
  point: Point,
  kind: PlaceFeature["kind"] = "other",
): PlaceFeature => ({
  ...place(id, name, point, kind),
  markerHidden: true,
});
const targets = [
  bridge("golden-gate", "Golden Gate Bridge", {
    lat: 37.81972,
    lng: -122.47861,
  }),
  bridge("sydney-harbour", "Sydney Harbour Bridge", {
    lat: -33.85222,
    lng: 151.21056,
  }),
  bridge("tower", "Tower Bridge", { lat: 51.50556, lng: -0.07528 }),
  bridge("oresund", "Øresund Bridge", { lat: 55.57644, lng: 12.82164 }),
  bridge("qiansimen", "Qiansimen Jialing River Bridge", {
    lat: 29.568209,
    lng: 106.57561,
  }),
];
const northAmerica = [
  ...new Set(
    CAPITALS.filter((capital) => capital.continent === "NA").map(
      (capital) => capital.countryId,
    ),
  ),
];
const california = US_STATES.find((state) => state.id === "wurl:USA-CA")!;
const common = definePresentation({
  instruction: "Place a pin within 300 km of the bridge.",
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
    neutralRegions: true,
    revealOnAnswer: true,
    feedbackRegions: "neutral",
  },
});
const stops = [
  {
    id: "bridge-golden-gate",
    label: "Bridge 1 · Suspension",
    resolvedLabel: "Golden Gate Bridge · San Francisco",
    leadIn:
      "Built in the 1930s, this suspension crossing spans a tidal strait at the edge of an ocean.",
    prompt: "Where is this bridge? Place your pin as close to it as you can.",
    hint: "The strait beneath this bridge connects a large bay to the Pacific Ocean on North America's west coast.",
    hintMap: {
      regionIds: northAmerica,
      focus: { lat: 40, lng: -100, altitude: 1.35 },
    },
    assist:
      "Los Angeles is now marked. Follow the Pacific coast north to the mouth of a much larger bay.",
    assistRegions: [california.id],
    assistFocus: { lat: 37, lng: -119, altitude: 0.62 },
    reference: place("los-angeles", "Los Angeles", {
      lat: 34.0522,
      lng: -118.2437,
    }),
    explanation:
      "The Golden Gate Bridge spans the Golden Gate strait—the Pacific entrance to San Francisco Bay.",
    context: [
      label("san-francisco-bay", "San Francisco Bay", {
        lat: 37.74,
        lng: -122.36,
      }),
      label("pacific", "Pacific Ocean", { lat: 37.83, lng: -122.7 }, "ocean"),
    ],
    imageAlt:
      "A tall orange-red suspension bridge rises above a coastal waterway, with stone fortifications below one end.",
    feedbackAlt:
      "Golden Gate Bridge above Fort Point at the entrance to San Francisco Bay.",
    caption: "The Golden Gate Bridge above Fort Point.",
    credit: {
      name: "ThomasLendt",
      url: "https://commons.wikimedia.org/wiki/File:Golden_Gate_Bridge_with_Fort_Point.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    fact: source(
      "Golden Gate Bridge District · bridge history",
      "https://www.goldengate.org/bridge/history-research/",
    ),
    location: source(
      "Wikidata · Golden Gate Bridge location",
      "https://www.wikidata.org/wiki/Q44440",
    ),
  },
  {
    id: "bridge-sydney-harbour",
    label: "Bridge 2 · Arch",
    resolvedLabel: "Sydney Harbour Bridge · Sydney",
    leadIn:
      "This steel arch carries road and rail traffic between the two shores of a busy harbor.",
    prompt: "Where is this bridge? Place your pin as close to it as you can.",
    hint: "The harbor lies on Australia's eastern seaboard, and the bridge connects its central district to the north shore.",
    hintMap: {
      regionIds: ["wurl:AUS"],
      focus: { lat: -25, lng: 134, altitude: 1.05 },
    },
    assist:
      "Melbourne is now marked. Search northeast along Australia's southeastern coast.",
    assistRegions: ["wurl:AUS"],
    assistFocus: { lat: -35.5, lng: 146.5, altitude: 0.7 },
    reference: place("melbourne", "Melbourne", {
      lat: -37.8136,
      lng: 144.9631,
    }),
    explanation:
      "Sydney Harbour Bridge opened in 1932, providing a direct road and rail link across the harbor to the North Shore.",
    context: [
      place("sydney", "Sydney", { lat: -33.8688, lng: 151.2093 }),
      label("sydney-harbour", "Sydney Harbour", { lat: -33.848, lng: 151.225 }),
    ],
    imageAlt:
      "A monumental dark steel arch stretches across a busy harbor, supported by stone pylons.",
    feedbackAlt: "Sydney Harbour Bridge seen from Circular Quay.",
    caption: "Sydney Harbour Bridge from Circular Quay.",
    credit: {
      name: "JJ Harrison",
      url: "https://commons.wikimedia.org/wiki/File:Sydney_Harbour_Bridge_from_Circular_Quay.jpg",
      license: "CC BY-SA 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
    },
    fact: source(
      "State Library NSW · bridge history",
      "https://www.sl.nsw.gov.au/learning/sydney-harbour-bridge-past-present",
    ),
    location: source(
      "NSW Government · Sydney Harbour Bridge",
      "https://www.nsw.gov.au/media-releases/century-of-an-icon-100-years-since-construction-began-on-sydney-harbour-bridge",
    ),
  },
  {
    id: "bridge-tower",
    label: "Bridge 3 · Towers",
    resolvedLabel: "Tower Bridge · London",
    leadIn:
      "The central roadway of this late-19th-century bridge opens for river traffic.",
    prompt: "Where is this bridge? Place your pin as close to it as you can.",
    hint: "This working river flows through a European capital toward the North Sea.",
    hintMap: {
      regionIds: ["wurl:GBR", "wurl:IRL"],
      focus: { lat: 54, lng: -3, altitude: 0.78 },
    },
    assist:
      "Newcastle is marked. Look farther south toward a much larger city on the same island.",
    assistRegions: ["wurl:GBR"],
    assistFocus: { lat: 53, lng: -1.5, altitude: 0.58 },
    reference: place("newcastle", "Newcastle upon Tyne", {
      lat: 54.9783,
      lng: -1.6178,
    }),
    explanation:
      "This is London's Tower Bridge, completed in 1894. Its two bascules lift to keep the River Thames accessible to river traffic.",
    context: [
      place("london", "London", { lat: 51.5072, lng: -0.1276 }),
      label("thames", "River Thames", { lat: 51.504, lng: -0.065 }, "river"),
    ],
    imageAlt:
      "A river bridge with two ornate stone towers, blue suspension details, and a raised upper walkway.",
    feedbackAlt: "Tower Bridge over the River Thames in London.",
    caption: "Tower Bridge from the south bank of the Thames.",
    credit: {
      name: "Helen Ilus",
      url: "https://commons.wikimedia.org/wiki/File:Tower_Bridge_from_South_Bank.jpg",
      license: "CC BY-SA 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    },
    fact: source(
      "Tower Bridge · construction timeline",
      "https://www.towerbridge.org.uk/stories/timeline-the-construction-of-tower-bridge",
    ),
    location: source(
      "Wikidata · Tower Bridge location",
      "https://www.wikidata.org/wiki/Q83125",
    ),
  },
  {
    id: "bridge-oresund",
    label: "Bridge 4 · Strait",
    resolvedLabel: "Øresund Bridge · Denmark–Sweden",
    leadIn:
      "Road and rail share this crossing, which continues through an island and tunnel beyond the bridge.",
    prompt: "Where is this bridge? Place your pin as close to it as you can.",
    hint: "This crossing links the Scandinavian Peninsula with a neighboring country across a narrow strait.",
    hintMap: {
      regionIds: ["wurl:NOR", "wurl:SWE", "wurl:DNK"],
      focus: { lat: 60, lng: 13, altitude: 1.05 },
    },
    assist:
      "Oslo is marked. Look south toward the sea between Sweden and Denmark.",
    assistRegions: ["wurl:SWE", "wurl:DNK"],
    assistFocus: { lat: 57, lng: 12, altitude: 0.7 },
    reference: place("oslo", "Oslo", { lat: 59.9139, lng: 10.7522 }),
    explanation:
      "The Øresund Bridge links Sweden with the artificial island Peberholm. Traffic then continues through a tunnel to Denmark: the full link is bridge, island and tunnel.",
    context: [
      place("malmo", "Malmö", { lat: 55.605, lng: 13.0038 }),
      place("copenhagen", "Copenhagen", { lat: 55.6761, lng: 12.5683 }),
      label("peberholm", "Peberholm", { lat: 55.593, lng: 12.755 }),
      label(
        "oresund-strait",
        "Øresund Strait",
        { lat: 55.63, lng: 12.8 },
        "ocean",
      ),
    ],
    imageAlt:
      "A long low bridge crosses open water toward a cable-stayed span with tall white pylons.",
    feedbackAlt: "Øresund Bridge across the strait between Sweden and Denmark.",
    caption:
      "The bridge section of the Øresund Link, viewed from the Swedish shore.",
    credit: {
      name: "Philaweb / Paul Bischoff",
      url: "https://commons.wikimedia.org/wiki/File:Oresund_Bridge.JPG",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
    },
    fact: source(
      "Øresund Bridge operator · infrastructure facts",
      "https://www.oresundsbron.com/en/about-oresundsbron/about-us/facts-about-oresundsbron",
    ),
    location: source(
      "OpenStreetMap · Øresund Bridge geometry",
      "https://www.openstreetmap.org/way/912575184",
    ),
  },
  {
    id: "bridge-qiansimen",
    label: "Bridge 5 · River city",
    resolvedLabel: "Qiansimen Jialing River Bridge · Chongqing",
    leadIn:
      "The final crossing carries road and rail above a river in a steep, densely built city.",
    prompt: "Where is this bridge? Place your final pin as close as you can.",
    hint: "Look for a southwestern Chinese metropolis built around steep river valleys and the meeting of two major rivers.",
    hintMap: {
      regionIds: ["wurl:CHN"],
      focus: { lat: 35, lng: 104, altitude: 1.12 },
    },
    assist:
      "Xi'an is marked. Search southwest for a great city where two major rivers meet.",
    assistRegions: ["wurl:CHN"],
    assistFocus: { lat: 32, lng: 107, altitude: 0.65 },
    reference: place("xian", "Xi'an", { lat: 34.3416, lng: 108.9398 }),
    explanation:
      "The Qiansimen Bridge crosses the Jialing River beside Hongyadong in Chongqing. Together with the Dongshuimen Bridge on the Yangtze and the tunnel between them, it forms the city's Twin River Bridges.",
    context: [
      place("chongqing", "Chongqing", { lat: 29.563, lng: 106.55 }),
      label("jialing", "Jialing River", { lat: 29.576, lng: 106.573 }, "river"),
      label("yangtze", "Yangtze River", { lat: 29.551, lng: 106.585 }, "river"),
      place(
        "hongyadong",
        "Hongyadong",
        { lat: 29.5659, lng: 106.576 },
        "landmark",
      ),
      place(
        "dongshuimen",
        "Dongshuimen Bridge",
        { lat: 29.557, lng: 106.586 },
        "landmark",
      ),
    ],
    imageAlt:
      "A brightly lit cable-stayed bridge stretches across a broad river beside a dense high-rise skyline after dark.",
    feedbackAlt:
      "Qiansimen Jialing River Bridge beside Chongqing's riverfront after dark.",
    caption: "Qiansimen Bridge beside Hongyadong after dark.",
    credit: {
      name: "DvTor8303",
      url: "https://commons.wikimedia.org/wiki/File:Qiansimen_Bridge_at_night_20251027.jpg",
      license: "CC0 1.0",
      licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    },
    fact: source(
      "Chongqing Municipal Government · city of bridges",
      "https://english.cq.gov.cn/specials/explore/CapitalofBridges/202608/t20260812_15922704.html",
    ),
    location: source(
      "Twin River Bridges · Qiansimen location",
      "https://en.wikipedia.org/wiki/Twin_River_Bridges_(Chongqing)",
    ),
  },
] as const;

export const ACROSS_DIVIDE_JOURNEY: Journey = {
  id: "across-the-divide-v1",
  addedAt: "2026-10-17",
  availability: "unlisted",
  title: "Across the Divide",
  description:
    "Five bridges. Five photographs. Five pins. How close can you get?",
  completion: {
    focus: { lat: 8, lng: 20, altitude: 2.05 },
    views: [
      ...targets.map(({ lat, lng }) => ({ lat, lng, altitude: 0.44 })),
      { lat: 8, lng: 20, altitude: 2.05 },
    ],
    borders: true,
    physicalFeatures: [],
    places: targets.map((target) => ({
      ...target,
      visualState: "visited" as const,
    })),
    photoResults: true,
    caption:
      "Five crossings, five corners of the world. From the Pacific entrance to San Francisco Bay to the rivers of Chongqing, bridges turn water from a barrier into a connection. Here is how close you came.",
  },
  rounds: stops.map((stop, index) => {
    const target = targets[index];
    const src = `/journeys/bridges/${String(index + 1).padStart(2, "0")}.v1.jpg`;
    return defineQuestion({
      ...common,
      id: stop.id,
      label: stop.label,
      progressLabel: stop.label,
      resolvedLabel: stop.resolvedLabel,
      title: stop.label,
      topic: "bridges",
      prompt: stop.prompt,
      leadIn: stop.leadIn,
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: {
        type: "pin-distance",
        targetId: target.id,
        radiusKm: 300,
        tiers: [
          { radiusKm: 100, feedback: "Bullseye!" },
          { radiusKm: 200, feedback: "Very close." },
          { radiusKm: 300, feedback: "In range." },
        ],
      },
      explanation: stop.explanation,
      source: stop.fact,
      sources: [stop.location],
      importedRegions: index === 0 ? [california] : undefined,
      image: {
        src,
        alt: stop.imageAlt,
        feedbackAlt: stop.feedbackAlt,
        presentation: "photo",
      },
      feedbackImage: {
        src,
        alt: stop.feedbackAlt,
        caption: stop.caption,
        credit: stop.credit,
      },
      guidance: {
        hint: stop.hint,
        hintMap: stop.hintMap,
        assist: {
          text: stop.assist,
          regionIds: stop.assistRegions,
          focus: stop.assistFocus,
        },
      },
      scenes: {
        play: {
          focus: { lat: 0, lng: 0, altitude: 2.05 },
          places: [target],
          map: common.map,
        },
        assist: { places: [stop.reference] },
        reveal: {
          focus: { lat: target.lat, lng: target.lng, altitude: 0.5 },
          places: [target, ...stop.context],
        },
      },
    });
  }),
};
