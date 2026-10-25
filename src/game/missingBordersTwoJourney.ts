import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey, Question } from "./questionContracts";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-22",
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
    slug: "01-india-nepal",
    progress: "Asia",
    members: ["IND", "NPL"],
    receipt: "India + Nepal",
    candidates: ["CHN", "PAK", "@", "BGD", "MMR", "THA"],
    assist: ["CHN", "PAK", "@", "MMR"],
    focus: { lat: 30, lng: 95, altitude: 1.45 },
    reveal: { lat: 26, lng: 81, altitude: 0.7 },
    leadIn: "A border has been erased from this map of Asia.",
    prompt: "Select the territory that should be two countries.",
    hint: "Look for a smaller, landlocked country absorbed into the northern edge of a much larger neighbor.",
    assistText:
      "Four territories remain selectable. Compare the outlines near the Himalayan foothills.",
    explanation:
      "Nepal lies along India's northern border in the Himalayan region. Remove their shared boundary, and Nepal becomes a bulge in the outline of its much larger neighbor.",
    source: source(
      "Government of India · India–Nepal relations",
      "https://meacms.mea.gov.in/Portal/ForeignRelation/Open-bilateral-brief-20-June-2024.pdf",
    ),
  },
  {
    slug: "02-indonesia-papua-new-guinea",
    progress: "Oceania",
    members: ["IDN", "PNG"],
    receipt: "Indonesia + Papua New Guinea",
    candidates: ["AUS", "NZL", "SLB", "@", "VUT", "FJI"],
    assist: ["AUS", "NZL", "SLB", "@"],
    focus: { lat: -16, lng: 146, altitude: 1.5 },
    reveal: { lat: -5, lng: 139, altitude: 0.58 },
    leadIn: "Another border has vanished from the islands around Australia.",
    prompt: "Which apparent territory is hiding two countries?",
    hint: "One large island is divided between a country to its east and an archipelago stretching far to its west.",
    assistText:
      "Four territories remain selectable. Look north of Australia for an island that normally has an international border through it.",
    explanation:
      "New Guinea's western part belongs to Indonesia, while its eastern part belongs to Papua New Guinea. Erasing that boundary joins the whole island to the Indonesian archipelago on this altered map.",
    source: source(
      "Embassy of Papua New Guinea · location",
      "https://pngembassy.org/location.html",
    ),
  },
  {
    slug: "03-costa-rica-panama",
    progress: "North America",
    members: ["CRI", "PAN"],
    receipt: "Costa Rica + Panama",
    candidates: ["USA", "MEX", "GTM", "@", "HND", "CUB"],
    assist: ["MEX", "GTM", "@", "HND"],
    focus: { lat: 35, lng: -100, altitude: 1.6 },
    reveal: { lat: 9, lng: -82.5, altitude: 0.23 },
    leadIn: "A missing border has changed this map of North America.",
    prompt: "Find the territory that should be two countries.",
    hint: "Follow the narrow land bridge toward South America. One stretch now looks like a single country.",
    assistText:
      "Four territories remain selectable. Look between Nicaragua and Colombia for the pair joined into one long outline.",
    explanation:
      "Costa Rica and Panama meet near the southern end of Central America. Without their shared border, the land between Nicaragua and Colombia becomes one continuous apparent country.",
    source: source(
      "Costa Rica Tourism Board · about Costa Rica",
      "https://www.visitcostarica.com/about-costa-rica",
    ),
  },
  {
    slug: "04-moldova-romania",
    progress: "Europe",
    members: ["MDA", "ROU"],
    receipt: "Moldova + Romania",
    candidates: ["POL", "BLR", "UKR", "BGR", "@", "HUN"],
    assist: ["POL", "UKR", "BGR", "@"],
    focus: { lat: 52, lng: 18, altitude: 1.1 },
    reveal: { lat: 46.7, lng: 26.5, altitude: 0.3 },
    leadIn: "Here, a country has blended into its western neighbor.",
    prompt: "Select the merged territory in Europe.",
    hint: "Look west of Ukraine. A smaller country has become a northeastern extension of its neighbor.",
    assistText:
      "Four territories remain selectable. Compare the shapes just north and west of the Black Sea.",
    explanation:
      "Moldova and Romania are neighbors across the Prut River. Restoring their shared boundary separates Moldova from the northeastern edge of Romania.",
    source: source(
      "Government of Moldova · cross-border cooperation on the Prut",
      "https://gov.md/en/press-releases/coordinated-control-be-set-sculeni-border-crossing-between-moldova-and-romania",
    ),
  },
  {
    slug: "05-rwanda-burundi",
    progress: "Africa",
    members: ["RWA", "BDI"],
    receipt: "Rwanda + Burundi",
    candidates: ["MWI", "LSO", "@", "SWZ", "TGO", "BEN"],
    assist: ["MWI", "@", "TGO", "BEN"],
    focus: { lat: 1, lng: 20, altitude: 1.4 },
    reveal: { lat: -2.7, lng: 29.8, altitude: 0.16 },
    leadIn: "The final missing border joins two small neighbors in Africa.",
    prompt: "Which apparent territory should be two countries?",
    hint: "Both countries are landlocked. Look between the Democratic Republic of the Congo and Tanzania.",
    assistText:
      "Four territories remain selectable. The merged pair lies south of Uganda, in Africa's Great Lakes region.",
    explanation:
      "Rwanda lies immediately north of Burundi. They are separate, landlocked neighbors between the Democratic Republic of the Congo and Tanzania; their shared boundary can disappear inside one compact outline.",
    source: source(
      "Government of Rwanda · geography",
      "https://www.gov.rw/about",
    ),
  },
];
const revealLabels = [
  ["IND", "India", 22, 78],
  ["NPL", "Nepal", 28.2, 84],
  ["IDN", "Indonesia", -2, 119],
  ["PNG", "Papua New Guinea", -6.3, 145],
  ["CRI", "Costa Rica", 9.8, -84.1],
  ["PAN", "Panama", 8.7, -80.5],
  ["MDA", "Moldova", 47.2, 28.7],
  ["ROU", "Romania", 45.8, 24.8],
  ["RWA", "Rwanda", -1.9, 29.9],
  ["BDI", "Burundi", -3.4, 29.9],
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

export const MISSING_BORDERS_TWO_JOURNEY: Journey = {
  id: "missing-borders-two-v1",
  addedAt: "2026-10-22",
  saveRevision: 1,
  title: "Missing Borders II",
  mapAttribution: {
    label: "Natural Earth · bundled 50m v5.1.2, existing de facto portrayal",
    url: cartography.url,
  },
  description:
    "Five more maps, five missing borders. Search across continents for apparent territories hiding two countries, then watch their boundaries return.",
  rounds: definitions.map((definition): Question => {
    const targetId = `composite:missing-borders-two:${definition.slug}`;
    const targets = (codes: string[]) =>
      codes.map((code) => (code === "@" ? targetId : country(code)));
    const memberIds = definition.members.map(country);
    return defineQuestion({
      ...base,
      id: `missing-borders-two-${definition.slug}`,
      title: `Missing border: ${definition.progress}`,
      progressLabel: definition.progress,
      resolvedLabel: definition.receipt,
      leadIn: definition.leadIn,
      prompt: definition.prompt,
      mode: "merged-region-single",
      count: 1,
      commitment: "immediate",
      selection: { type: "ids", ids: targets(definition.candidates) },
      rule: {
        type: "merged-region",
        targetId,
        memberIds,
        hiddenAdjacencies: [[memberIds[0], memberIds[1]]],
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
      correctFeedback: "Well spotted.",
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
      "Five missing borders hid ten countries. Across mountains, islands and land bridges, each restored line separates a pair of neighbors inside a once-unbroken outline.",
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
