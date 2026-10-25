import { SILK_ROAD_CORRIDORS } from "./silkRoadCorridors";
import { defineQuestion, definePresentation } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { cityReference } from "./authoredPlaces";
import type { Journey, FactSource } from "./questionContracts";
import type { PlaceFeature, Focus } from "../geography/types";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-20",
});
const network = source(
  "UNESCO · About the Silk Roads",
  "https://www.unesco.org/en/silk-roads/about-silk-roads",
);
const histories = [
  source(
    "UNESCO · Chang’an–Tianshan Corridor",
    "https://whc.unesco.org/en/list/1442/",
  ),
  source("UNESCO · Mogao Caves", "https://whc.unesco.org/en/list/440/"),
  source(
    "Archaeological Survey of India · Silk Road sites, tentative-list submission",
    "https://whc.unesco.org/en/tentativelists/5492/",
  ),
  source(
    "UNESCO · Samarkand, Crossroad of Cultures",
    "https://whc.unesco.org/en/list/603/",
  ),
  source(
    "The Metropolitan Museum of Art · The Art of the Abbasid Period",
    "https://www.metmuseum.org/essays/the-art-of-the-abbasid-period-750-1258",
  ),
];
function bundled(id: string, name?: string): PlaceFeature {
  const place = ANSWER_PLACES.get(`place:${id}`);
  if (!place) throw Error(`Missing canonical Silk Roads city: ${id}`);
  return { ...place, name: name ?? place.name, kind: "city" };
}
function local(
  id: string,
  name: string,
  lat: number,
  lng: number,
  parentId: string,
): PlaceFeature {
  return {
    id: `place:${id}`,
    name,
    lat,
    lng,
    parentId,
    kind: "city",
    sourceId: `geonames:${id}`,
  };
}
// Canonical modern centers. Historical sites and optional monuments do not grade pins.
const xian = bundled("1790630", "Xi’an"),
  dunhuang = local("1529531", "Dunhuang", 40.16667, 94.68333, "wurl:CHN"),
  kashgar = bundled("1280849", "Kashgar"),
  samarkand = bundled("1216265", "Samarkand"),
  baghdad = bundled("98182", "Baghdad");
const targets = [xian, dunhuang, kashgar, samarkand, baghdad];
const stations: [PlaceFeature, PlaceFeature][] = [
  [bundled("1804430", "Lanzhou"), bundled("2037799", "Datong")],
  [xian, local("1529484", "Hami", 42.83393, 93.50601, "wurl:CHN")],
  [dunhuang, local("1178338", "Gilgit", 35.91869, 74.31245, "wurl:PAK")],
  [kashgar, local("1215957", "Termez", 37.22417, 67.27833, "wurl:UZB")],
  [samarkand, bundled("99072", "Mosul")],
];
const tiers = [
  [70, 145, 240],
  [55, 120, 230],
  [80, 180, 320],
  [45, 95, 190],
  [60, 135, 250],
];
const labels = [
  "Imperial center",
  "Oasis gateway",
  "Desert routes",
  "Central Asian crossroads",
  "Western exchange",
];
const reactions = [
  "The imperial center.",
  "The oasis found.",
  "Paths converge.",
  "Crossroads located.",
  "A meeting of worlds.",
];
const slugs = ["xian", "dunhuang", "kashgar", "samarkand", "baghdad"];
const reaches = [1200, 900, 1200, 900, 1000];
const base = definePresentation({
  label: "Bearings",
  topic: "Silk Roads",
  instruction: "Place a pin where the two bearings meet.",
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
    feedbackRegions: "neutral",
  },
  source: network,
});
const stops = [
  {
    leadIn:
      "The Silk Roads linked imperial capitals to trading towns far beyond their borders.",
    prompt:
      "From Lanzhou and Datong, two bearings point toward a hidden imperial center. Where do they meet?",
    hint: "The Silk Roads extended westward from the old Chinese imperial heartland. Look for a meeting place inland, rather than on China's coast.",
    assist:
      "A broad bearing sector now extends from Lanzhou. Combine it with Datong's compass reading to narrow your search.",
    explanation:
      "The bearings meet near Xi'an, historically Chang'an, a major capital under the Han and Tang dynasties. Trade and diplomacy connected its imperial courts to merchants and travelers far to the west. The Silk Roads began as overlapping networks, not a single road from one gate.",
  },
  {
    leadIn:
      "West of the imperial heartland, the caravan networks followed the Hexi Corridor toward the desert.",
    prompt:
      "Xi'an and Hami report two bearings toward the next meeting place. Where do they converge?",
    hint: "The next meeting place was an oasis at the desert's eastern approaches. Caravans moved across northwestern China through corridors where water and settlements made travel possible.",
    assist:
      "A broad bearing sector now extends from Hami. Use Xi'an's readout to decide where within the region the directions agree.",
    explanation:
      "The intersection reveals Dunhuang, where the Silk Roads reached the desert's edge. Near the oasis, the Mogao Caves preserve centuries of Buddhist art and manuscripts in many languages—a record of movement in beliefs and ideas as well as merchandise. Travelers could take different routes around the Taklamakan.",
  },
  {
    leadIn:
      "Beyond Dunhuang, northern and southern oasis routes skirted the Taklamakan before coming together again near the Pamirs.",
    prompt:
      "Dunhuang and Gilgit give two bearings toward their western crossroads. Find the intersection.",
    hint: "One observation looks far across the Tarim Basin. The other approaches from the mountains to its southwest. Think about where desert oases and mountain approaches could meet.",
    assist:
      "A broad sector from Gilgit now shows the northern approach. Combine that swath with Dunhuang's westerly bearing.",
    explanation:
      "The lines meet near Kashgar. Oasis trails around the northern and southern sides of the Taklamakan converged here, while mountain passages connected this trading world with Central and South Asia. Kashgar was a place where different journeys—and their goods and ideas—met.",
  },
  {
    leadIn:
      "Beyond the mountain gateways, trading networks spread across the river valleys and oases of Central Asia.",
    prompt:
      "Kashgar and Termez report two bearings to another great center of exchange. Where do they meet?",
    hint: "The city lies in the fertile oasis regions of Central Asia, where caravans could move between river valleys and deserts. Use the direction from the southern station to narrow the northern part of the search.",
    assist:
      "Termez's broad northward sector is now drawn. Compare it with the almost-westerly reading from Kashgar.",
    explanation:
      "The destination is Samarkand, long a cultural crossroads in the Zerafshan oasis. Traders, rulers, craftspeople, and scholars shaped a city whose layers span many centuries. Its celebrated Timurid monuments came much later than the earliest Silk Roads exchanges—a reminder that this network kept changing.",
  },
  {
    leadIn:
      "The Silk Roads reached beyond the Central Asian oases into markets connected by rivers, caravans and the sea.",
    prompt:
      "Samarkand and Mosul report two bearings toward a major center of exchange. Where is their intersection?",
    hint: "The two readings lead toward Mesopotamia, a region whose river and overland trade networks connected distant markets.",
    assist:
      "A broad southward sector from Mosul is now visible. Compare it with the long bearing from Samarkand to locate the meeting place.",
    explanation:
      "The intersection is Baghdad. Founded as the Abbasid capital in 762, it became a major center of commerce and culture, connecting the world of the caravans with wider land and sea exchange. The Silk Roads were never a single line from China to here: they were overlapping routes continually remade by people and ideas.",
  },
];

export const SILK_ROAD_INTERSECTIONS_JOURNEY: Journey = {
  id: "where-the-silk-roads-met-v1",
  addedAt: "2026-10-20",
  saveRevision: 1,
  title: "Where the Silk Roads Met",
  description:
    "Two compass readings, one hidden city. Discover five meeting places across the Silk Roads.",
  rounds: stops.map((stop, i) => {
    const target = targets[i],
      pair = stations[i];
    // Station envelope, not a target-centered pre-answer camera. All pairs are regional.
    const overview: Focus = {
      lat: (pair[0].lat + pair[1].lat) / 2,
      lng: (pair[0].lng + pair[1].lng) / 2,
      altitude: Math.max(0.55, Math.abs(pair[0].lng - pair[1].lng) / 25),
    };
    const arrival = { lat: target.lat, lng: target.lng, altitude: 0.4 };
    return defineQuestion({
      ...base,
      id: `silk-intersection-0${i + 1}-${slugs[i]}`,
      title: labels[i],
      progressLabel: labels[i],
      resolvedLabel: target.name,
      leadIn: stop.leadIn,
      prompt: stop.prompt,
      explanation: stop.explanation,
      correctFeedback: reactions[i],
      mode: "pin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "pin-distance",
        targetId: target.id,
        radiusKm: tiers[i][2],
        tiers: tiers[i].map((radiusKm, tier) => ({
          radiusKm,
          feedback: ["Bullseye!", "Very close.", "In range."][tier],
        })),
      },
      bearingIntersection: {
        stations: pair,
        assist: {
          stationId: pair[i === 0 ? 0 : 1].id,
          halfWidthDegrees: 15,
          reachKm: reaches[i],
        },
      },
      guidance: { hint: stop.hint, assist: { text: stop.assist } },
      sources: [
        histories[i],
        ...[target, ...pair].map((p) =>
          source(
            `GeoNames · ${p.name}`,
            `https://www.geonames.org/${p.id.split(":")[1]}/`,
          ),
        ),
      ],
      feedbackMapCaption: "Modern bearing geometry · not historical routes",
      scenes: {
        play: { focus: overview, contextIds: [], places: [target] },
        reveal: {
          focus: arrival,
          views: [overview, arrival],
          contextIds: [target.parentId!],
          places: [target],
        },
      },
    });
  }),
  completion: {
    focus: { lat: 37, lng: 78, altitude: 1.85 },
    views: [
      ...targets.map((p) => ({ lat: p.lat, lng: p.lng, altitude: 0.55 })),
      { lat: 37, lng: 78, altitude: 1.85 },
    ],
    regionIds: [],
    physicalFeatures: [],
    overlays: SILK_ROAD_CORRIDORS,
    mapCaption:
      "Major overland Silk Roads corridors · schematic · routes varied over time",
    mapAttribution: {
      label: "Corridor reference: UNESCO Silk Roads map",
      url: "https://www.unesco.org/en/silk-roads/about-silk-roads",
    },
    borders: true,
    places: [
      ...targets.map((p) => ({ ...p, visualState: "visited" as const })),
      ...stations
        .flat()
        .filter((p) => !targets.some((t) => t.id === p.id))
        .map(cityReference),
    ],
    caption:
      "From Chang’an to Dunhuang, Kashgar, Samarkand and Baghdad, the Silk Roads carried far more than silk. Merchants, pilgrims, artisans and scholars joined shifting routes across deserts, mountains, river valleys and cities. Five intersections reveal one idea: the network’s power lay in the places—and people—where different worlds met.",
  },
};
