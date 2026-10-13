import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey, Question } from "./questionContracts";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-12",
});
const cartography = source(
  "Natural Earth · canonical country boundaries (bundled 50m, v5.1.2)",
  "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/",
);
const base = definePresentation({
  label: "Missing border",
  topic: "political boundaries",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  allowTyping: false,
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    candidates: "highlighted",
  },
  source: cartography,
});
const definitions = [
  {
    slug: "01-iberia",
    progress: "Iberia",
    members: ["ESP", "PRT"],
    receipt: "Spain + Portugal",
    candidates: ["FRA", "ITA", "@", "MAR", "DZA", "TUN"],
    assist: ["FRA", "ITA", "@", "MAR"],
    focus: { lat: 38, lng: 3, altitude: 0.65 },
    reveal: { lat: 39.5, lng: -5.5, altitude: 0.34 },
    leadIn:
      "A border has been erased from this map of Europe and North Africa.",
    prompt: "Tap the territory that should be two countries.",
    hint: "A peninsula can look like one continuous landmass without being one country.",
    assistText:
      "Four territories remain selectable. Compare their coastlines and the borders they still share with their neighbors.",
    explanation:
      "Spain and Portugal share the Iberian Peninsula. Without their land border, most of the peninsula reads as one enormous country.",
    source: source(
      "Encyclopaedia Britannica · Iberian Peninsula",
      "https://www.britannica.com/place/Iberian-Peninsula",
    ),
  },
  {
    slug: "02-hispaniola",
    progress: "Caribbean",
    members: ["HTI", "DOM"],
    receipt: "Haiti + Dominican Republic",
    candidates: ["@", "CUB", "JAM", "PAN", "COL", "VEN"],
    assist: ["@", "CUB", "JAM", "COL"],
    focus: { lat: 14, lng: -75, altitude: 0.48 },
    reveal: { lat: 19, lng: -71.5, altitude: 0.17 },
    leadIn: "Another border has vanished around the Caribbean Sea.",
    prompt: "Which apparent territory is hiding two countries?",
    hint: "An island’s coastline doesn’t tell you how many countries govern the land inside it.",
    assistText:
      "Four territories remain selectable around the Caribbean. Look for an island whose outline hides a political division.",
    explanation:
      "Haiti occupies the western part of Hispaniola; the Dominican Republic occupies the eastern part. One island, two countries.",
    source: source(
      "National Geographic Kids · Haiti",
      "https://kids.nationalgeographic.com/geography/countries/article/haiti",
    ),
  },
  {
    slug: "03-korea",
    progress: "East Asia",
    members: ["PRK", "KOR"],
    receipt: "North Korea + South Korea",
    candidates: ["CHN", "JPN", "RUS", "@", "MNG", "TWN"],
    assist: ["CHN", "JPN", "RUS", "@"],
    focus: { lat: 38, lng: 125, altitude: 0.68 },
    reveal: { lat: 38.5, lng: 127.5, altitude: 0.3 },
    leadIn: "A political division has disappeared from this map of East Asia.",
    prompt: "Tap the territory that should be two countries.",
    hint: "The missing boundary dates to a twentieth-century division of a peninsula, rather than a coastline or mountain barrier.",
    assistText:
      "Four territories remain selectable in the region. Think about which peninsula has been divided into two states since the mid-twentieth century.",
    explanation:
      "North and South Korea occupy the Korean Peninsula. The 1953 armistice established a Military Demarcation Line within the Demilitarized Zone. The line and the surrounding zone are related, but different, geographic features.",
    source: source(
      "US National Archives · Korean Armistice Agreement (1953)",
      "https://www.archives.gov/milestone-documents/armistice-agreement-restoration-south-korean-state",
    ),
  },
  {
    slug: "04-senegambia",
    progress: "West Africa",
    members: ["SEN", "GMB"],
    receipt: "Senegal + The Gambia",
    candidates: ["MRT", "MLI", "GIN", "GNB", "@", "SLE"],
    assist: ["MRT", "MLI", "GIN", "@"],
    focus: { lat: 13.5, lng: -12, altitude: 0.49 },
    reveal: { lat: 13.5, lng: -15.3, altitude: 0.17 },
    leadIn: "Here, erasing one border almost makes a country disappear.",
    prompt: "Find the merged territory in West Africa.",
    hint: "One country in this part of Africa is a long, narrow strip following a river toward the Atlantic.",
    assistText:
      "Four territories remain selectable along the western Sahel and Atlantic coast. The river-shaped country is still unmarked.",
    explanation:
      "The Gambia reaches inland along the Gambia River and is surrounded by Senegal on its landward sides. Remove that border, and nearly its entire shape vanishes into Senegal.",
    source: source(
      "Encyclopaedia Africana · The Gambia",
      "https://encyclopaediaafricana.com/the-gambia/",
    ),
  },
  {
    slug: "05-baltics",
    progress: "Baltic region",
    members: ["EST", "LVA", "LTU"],
    receipt: "Estonia + Latvia + Lithuania",
    candidates: ["FIN", "SWE", "POL", "@", "BLR", "RUS"],
    assist: ["FIN", "SWE", "POL", "@"],
    focus: { lat: 58, lng: 21, altitude: 0.54 },
    reveal: { lat: 56.9, lng: 24.5, altitude: 0.28 },
    leadIn:
      "This time, two borders are missing. Three neighboring countries now look like one.",
    prompt: "Tap the merged territory.",
    hint: "The missing borders separate three neighbors commonly grouped together under one regional name.",
    assistText:
      "Four territories remain selectable around the Baltic. Compare their shapes: one apparent territory normally contains three neighboring countries.",
    explanation:
      "Estonia, Latvia and Lithuania are three separate countries along the eastern Baltic coast. Erasing their two shared borders blends them into one shape.",
    source: source(
      "NATO Allied Air Command · Baltic Air Policing",
      "https://ac.nato.int/missions/air-policing/baltics",
    ),
  },
];
const revealLabels = [
  ["ESP", "Spain", 40, -3.7],
  ["PRT", "Portugal", 39.6, -8],
  ["HTI", "Haiti", 19.4, -72.7],
  ["DOM", "Dominican Republic", 18.9, -70.5],
  ["PRK", "North Korea", 40.1, 127.2],
  ["KOR", "South Korea", 36.4, 127.9],
  ["SEN", "Senegal", 14.8, -14.5],
  ["GMB", "The Gambia", 13.44, -15.5],
  ["EST", "Estonia", 58.7, 25.6],
  ["LVA", "Latvia", 56.9, 24.9],
  ["LTU", "Lithuania", 55.3, 23.9],
].map(([code, name, lat, lng]) => ({
  id: `territory-label:wurl:${code}`,
  name: String(name),
  lat: Number(lat),
  lng: Number(lng),
  kind: "other" as const,
  sourceId: "journey",
  markerHidden: true,
}));
const country = (code: string) => `wurl:${code}`;
export const MISSING_BORDERS_JOURNEY: Journey = {
  id: "missing-borders-v1",
  saveRevision: 1,
  title: "Missing Borders",
  mapAttribution: {
    label: "Natural Earth · bundled 50m v5.1.2, existing de facto portrayal",
    url: cartography.url,
  },
  description:
    "Five maps have been altered. Spot the territories hiding two—or three—countries, then watch their real boundaries return.",
  rounds: definitions.map((definition, index): Question => {
    const targetId = `composite:missing-borders:${definition.slug}`;
    const targets = (codes: string[]) =>
      codes.map((code) => (code === "@" ? targetId : country(code)));
    const memberIds = definition.members.map(country);
    return defineQuestion({
      ...base,
      id: `missing-borders-${definition.slug}`,
      title: `Missing border: ${definition.progress}`,
      progressLabel: definition.progress,
      resolvedLabel: definition.receipt,
      leadIn: definition.leadIn,
      prompt: definition.prompt,
      instruction:
        index === 0
          ? "Tap a territory on the globe, then submit. You can tap a different territory to change your selection."
          : "",
      mode: "merged-region-single",
      count: 1,
      commitment: "submit",
      selection: { type: "ids", ids: targets(definition.candidates) },
      rule: {
        type: "merged-region",
        targetId,
        memberIds,
        hiddenAdjacencies: memberIds
          .slice(1)
          .map((id, i) => [memberIds[i], id]),
      },
      guidance: {
        hint: definition.hint,
        assist: {
          text: definition.assistText,
          candidateIds: targets(definition.assist),
        },
      },
      explanation: definition.explanation,
      sources: [definition.source],
      correctFeedback: "Well spotted. The missing boundaries are back.",
      scenes: {
        play: { focus: definition.focus },
        reveal: {
          focus: definition.reveal,
          borders: true,
          places: revealLabels.filter((place) =>
            memberIds.some((id) => place.id === `territory-label:${id}`),
          ),
        },
      },
    });
  }),
  completion: {
    caption:
      "The maps were altered; the countries never changed. Restore the boundaries, and the same coastlines tell five different stories.",
    physicalFeatures: [],
    focus: definitions[0].reveal,
    views: definitions.map((definition) => definition.reveal),
    regionIds: definitions.flatMap((definition) =>
      definition.members.map(country),
    ),
    places: revealLabels.map((place) => ({ ...place, visualState: "visited" })),
    borders: true,
    mapAttribution: {
      label: "Natural Earth · bundled 50m v5.1.2, existing de facto portrayal",
      url: cartography.url,
    },
  },
};
