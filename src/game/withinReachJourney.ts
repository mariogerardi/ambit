import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey } from "./questionContracts";
import type { Focus, RegionFeature } from "../geography/types";
import type { ConstructionIsland } from "./constructionTypes";
import data from "./data/within-reach.v1.json";

type Site = {
  id: string;
  name: string;
  parentId: string;
  bounds: [number, number, number, number];
  focus: Focus;
  initial: { lat: number; lng: number };
  radiusKm: number;
  backgroundGeometry: RegionFeature["geometry"];
  islands: (RegionFeature & ConstructionIsland & { areaKm2: number })[];
  sourceRevision: string;
  benchmark: {
    maximum: number;
    samples: {
      count: number;
      center: { lat: number; lng: number };
      clearanceKm: number;
      containedIds: string[];
    }[];
  };
};
export const WITHIN_REACH_SITES = data.sites as unknown as Site[];
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-22",
});
const osm = source(
  "OpenStreetMap contributors · detailed island shores",
  "https://www.openstreetmap.org/copyright",
);
const stories: Record<
  string,
  {
    label: string;
    leadIn: string;
    prompt: string;
    hint: string;
    assist: string;
    explanation: string;
    source: FactSource;
  }
> = {
  boston: {
    prompt: "How many of these islands can fit inside a single circle?",
    label: "Boston Harbor",
    leadIn:
      "Boston doesn’t end at the waterfront. Beyond the city, wooded shores and old forts rise from the harbor.",
    hint: "Try centering the circle over open water. That leaves more room for the islands around its edge.",
    assist:
      "Explore the water east of Long Island. Can you keep the Brewsters and the smaller islands toward Hingham inside the same circle?",
    explanation:
      "Forts, hospitals and lighthouses mark the harbor’s islands. Their wooded slopes and rocky shores hold centuries of Boston’s history, just beyond the waterfront.",
    source: source(
      "Boston Harbor Islands Partnership · the islands’ history and habitats",
      "https://www.bostonharborislands.org/about-the-park/",
    ),
  },
  scilly: {
    prompt:
      "Find room for as many complete islands as you can among these scattered shores.",
    label: "Isles of Scilly",
    leadIn:
      "Out in the Atlantic, Scilly breaks into green islands and scattered granite. Narrow channels wind between its larger shores and small outcrops.",
    hint: "Explore the central islands before reaching for a remote rock. A small island can fit where a larger neighbor cannot.",
    assist:
      "Explore the water around St Martin’s and St Helen’s. Their smaller neighbors may fit more easily than a large island farther west.",
    explanation:
      "Five of Scilly’s islands are inhabited. Beyond them, smaller islands and rocky outcrops shelter seabirds and wildlife. The villages are just one part of this scattered archipelago.",
    source: source(
      "Visit Isles of Scilly · uninhabited islands",
      "https://www.visitislesofscilly.com/explore/uninhabited-islands/",
    ),
  },
  singapore: {
    prompt:
      "Bring as many whole islands as you can inside the circle, across the gap between east and west.",
    label: "Southern Islands",
    leadIn:
      "South of Singapore’s busy waterfront, St John’s, Lazarus and Kusu sit just across the water. Farther west, more islands spread along the strait.",
    hint: "There is room to reach beyond the eastern group. Explore the water between the two clusters.",
    assist:
      "Keep St John’s and Lazarus within reach while moving west. Which islands on the far side of the gap can join them?",
    explanation:
      "From St John’s and Kusu to the western islands, Singapore continues beyond its main shoreline. The gaps look wide from the waterfront; a circle shows how close some of these shores really are.",
    source: source(
      "Singapore Land Authority · St John’s, Lazarus and Kusu islands",
      "https://www.sla.gov.sg/properties/management-of-state-land-and-property/visiting-the-sla-managed-islands",
    ),
  },
  hauraki: {
    prompt:
      "Circle as many of the gulf’s islands as you can, keeping every shoreline inside.",
    label: "Hauraki Gulf",
    leadIn:
      "Beyond Auckland, the Hauraki Gulf opens around wooded islands and long, sheltered shores. Follow the channels past Waiheke and the gulf keeps unfolding.",
    hint: "Start around Waiheke and the smaller islands nearby. Reaching for a distant shore can cost you several closer ones.",
    assist:
      "Explore the water between Waiheke and the smaller islands toward Coromandel. Follow each whole shoreline before reaching for another island.",
    explanation:
      "Several gulf islands are wildlife sanctuaries, where water helps keep introduced predators at bay. The channels that separate the islands can also help protect what lives on them.",
    source: source(
      "New Zealand Department of Conservation · Hauraki Gulf islands",
      "https://www.doc.govt.nz/parks-and-recreation/places-to-go/auckland/hauraki-gulf-marine-park/hauraki-gulf-islands/",
    ),
  },
  cyclades: {
    prompt: "Where will your circle hold the most whole islands?",
    label: "The Cyclades",
    leadIn:
      "Syros, Mykonos, Paros, Naxos: the Cyclades scatter across the Aegean. Look between the larger islands for the small shores that are easy to miss.",
    hint: "Explore the central islands and their smaller neighbors to the south. The best center may be out at sea.",
    assist:
      "Compare the water between Paros and Naxos. Leave room for the smaller islands stretching south toward Iraklia and Koufonisi.",
    explanation:
      "The Cyclades take their name from islands seen as circling sacred Delos. Here, a different circle fills up farther south, around Paros, Naxos and the smaller islands between them.",
    source: source(
      "Greek National Tourism Organisation · the Cyclades and Delos",
      "https://www.visitgreece.gr/islands/cyclades",
    ),
  },
};
// A few geographic anchors orient each field; every island still grades and pulses.
const keyIslands: Record<string, string[]> = {
  boston: [
    "Long Island",
    "Peddocks Island",
    "Thompson Island",
    "Spectacle Island",
    "Lovells Island",
    "Georges Island",
    "Great Brewster Island",
    "Grape Island",
  ],
  scilly: [
    "St Mary's",
    "Tresco",
    "St Martin's",
    "Bryher",
    "St Agnes",
    "St Helen's",
    "Teän",
  ],
  singapore: [
    "Jurong Island",
    "Sentosa",
    "Pulau Semakau",
    "Pulau Sudong",
    "Pulau Busing",
    "Pulau Senang",
    "St John’s & Lazarus",
    "Kusu Island",
  ],
  hauraki: [
    "Great Barrier Island",
    "Waiheke Island",
    "Little Barrier Island",
    "Rangitoto Island",
    "Kawau Island",
    "Ponui Island",
    "Motutapu Island",
    "Rotoroa Island",
  ],
  cyclades: [
    "Syros",
    "Mykonos",
    "Paros",
    "Naxos",
    "Antiparos",
    "Ios",
    "Iraklia",
    "Santorini",
    "Amorgos",
  ],
};
const assistIslands = (site: Site) =>
  site.islands
    .filter((i) => site.benchmark.samples[0].containedIds.includes(i.id))
    .slice(0, 3);
const keyIsland = (site: Site, island: Site["islands"][number]) =>
  keyIslands[site.id].includes(island.name) ||
  assistIslands(site).some((i) => i.id === island.id);
const base = definePresentation({
  label: "Island circle",
  topic: "island coastlines",
  instruction: "",
  failure: "feedback",
  focus: { lat: 42.307, lng: -70.961, altitude: 0.012 },
  disclosure: {
    hoverNames: true,
    namedChoices: true,
    committedNames: false,
    previousVisits: false,
  },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    feedbackRegions: "neutral",
  },
  source: osm,
});

export const WITHIN_REACH_JOURNEY: Journey = {
  id: "within-reach-v2",
  supersedes: "within-reach-v1",
  retainMapDetails: true,
  addedAt: "2026-10-21",
  title: "Within Reach",
  description:
    "From Boston Harbor to the Cyclades, explore islands large and small. Move one circle across five island groups and see how many complete shores you can bring within reach.",
  mapAttribution: {
    label: "© OpenStreetMap contributors · GeoNames · source notes",
    url: "/journeys/within-reach/SOURCES.md",
  },
  rounds: WITHIN_REACH_SITES.map((site, index) => {
    const story = stories[site.id];
    return defineQuestion({
      ...base,
      id: `within-reach:${site.id}`,
      title: story.label,
      progressLabel: story.label,
      resolvedLabel: site.name,
      leadIn: story.leadIn,
      prompt: story.prompt,
      instruction:
        index === 0
          ? "Move the circle to enclose as many blue islands as you can. An island counts only if its whole shoreline fits."
          : "",
      mode: "geo-circle",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "island-coverage-max",
        sourceRevision: site.sourceRevision,
        radiusKm: site.radiusKm,
        candidates: site.islands.map((island) => ({
          ...island,
          priority: island.areaKm2,
          labelHidden: !keyIsland(site, island),
        })),
        maximum: site.benchmark.maximum,
        tiers: site.benchmark.samples.map((sample, tier) => ({
          count: sample.count,
          feedback: [
            "A perfect fit.",
            "Nearly there.",
            "A few more within reach.",
          ][tier],
        })),
      },
      constructionInitial: { version: 1, kind: "circle", center: site.initial },
      constructionExample: {
        version: 1,
        kind: "circle",
        center: site.benchmark.samples[0].center,
      },
      guidance: {
        hint: story.hint,
        assist: {
          text: `Three islands in one best fit are outlined in gold: ${assistIslands(
            site,
          )
            .map((i) => i.name)
            .join(", ")}. ${story.assist}`,
          regionIds: assistIslands(site).map((i) => i.id),
          overlays: assistIslands(site).flatMap((island) => {
            const polygons =
              island.geometry.type === "Polygon"
                ? [island.geometry.coordinates]
                : island.geometry.coordinates;
            return polygons.map((rings, index) => ({
              id: `assist:${island.id}:${index}`,
              type: "path" as const,
              coordinates: rings[0],
              visualState: "selected" as const,
              foreground: true,
              surfaceAligned: true,
            }));
          }),
        },
      },
      explanation: story.explanation,
      source: story.source,
      sources: [
        osm,
        ...(site.id === "boston"
          ? [
              source(
                "National Park Service · harbor island names",
                "https://www.nps.gov/boha/learn/historyculture/facts-intro.htm",
              ),
            ]
          : []),
        ...(site.id === "hauraki"
          ? [
              source(
                "GeoNames · island names (CC BY 4.0)",
                "https://www.geonames.org/",
              ),
            ]
          : []),
      ],
      displayGeometries: { [site.parentId]: site.backgroundGeometry },
      importedRegions: site.islands,
      mapCaption: `${site.name} · ${site.islands.length} islands`,
      qualification:
        "Every blue island is eligible, including those without labels. Its entire shoreline must fit inside the circle. Peninsulas and tiny background rocks do not count.",
      scenes: {
        play: {
          contextIds: site.islands.map((island) => island.id),
          focus: site.focus,
          clueLocators: site.islands.map((i) => ({
            regionId: i.id,
            label: i.name,
            pulseOnly: true,
          })),
        },
        reveal: {
          contextIds: site.islands.map((island) => island.id),
          focus: site.focus,
        },
      },
    });
  }),
  completion: {
    focus: WITHIN_REACH_SITES[0].focus,
    views: WITHIN_REACH_SITES.map((site) => ({
      ...site.focus,
      altitude: Math.max(0.018, site.focus.altitude! * 1.4),
    })),
    constructionResults: true,
    physicalFeatures: [],
    regionIds: WITHIN_REACH_SITES.flatMap((site) =>
      site.islands.map((island) => island.id),
    ),
    places: WITHIN_REACH_SITES.flatMap((site) =>
      site.islands
        .filter((island) => keyIsland(site, island))
        .map((island) => ({
          id: `${island.id}:label`,
          name: island.name,
          ...island.focus,
          kind: "other" as const,
          sourceId: island.sourceId,
          priority: island.areaKm2,
          markerHidden: true,
          surfaceAligned: true,
          labelScale: 0.8,
          labelFlexible: false,
          displayRole: "reference" as const,
          visualState: "hinted" as const,
        })),
    ),
    borders: true,
    mapCaption: "Five island groups · choose a stop to review your circle",
    caption:
      "From Boston Harbor to the Cyclades, you explored five island groups one shoreline at a time. The larger islands caught the eye; the smaller ones often made the difference. Choose a stop to revisit your circle.",
  },
};
