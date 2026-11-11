import { definePresentation, defineQuestion } from "./questionBuilder";
import { referenceLabel } from "./helpReferences";
import { US_STATES } from "../geography/usStates";
import type {
  RegionFeature,
  MapOverlay,
  PlaceFeature,
  Focus,
} from "../geography/types";
import type { ConstructionGrid } from "./constructionTypes";
import type { FactSource, Journey } from "./questionContracts";
import data from "./data/how-america-population.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-04",
});
const census = source(
  "U.S. Census Bureau · Vintage 2025 state population estimates",
  "https://www.census.gov/data/datasets/time-series/demo/popest/2020s-state-total.html",
);
const centerSource = source(
  "U.S. Census Bureau · 2020 Center of Population",
  "https://www.census.gov/geographies/reference-files/time-series/geo/centers-population.html",
);
const worldpop = source(
  "WorldPop · modeled population counts, R2024B 2025 · CC BY 4.0",
  "https://hub.worldpop.org/geodata/summary?id=57010",
);
const grid = data.grid as ConstructionGrid;
const states = US_STATES.map((r) => r.id);
const least = ["WY", "VT", "AK", "ND", "SD"].map((s) => `wurl:USA-${s}`);

// Camera perspectives across national, regional, and intimate scales
const nationalFocus: Focus = { lat: 42, lng: -115, altitude: 1.45 };
const northwestFocus: Focus = { lat: 44, lng: -115, altitude: 1.25 };
const conusFocus: Focus = { lat: 38, lng: -96, altitude: 0.95 };
const hawaiiFocus: Focus = { lat: 20.7, lng: -157.5, altitude: 0.3 };
const nyHarborFocus: Focus = { lat: 40.75, lng: -73.6, altitude: 0.16 };
const plainsFocus: Focus = { lat: 44.5, lng: -104, altitude: 0.48 };
const densityFocus: Focus = { lat: 38, lng: -96, altitude: 0.78 };

const density: MapOverlay = {
  id: "us-population-density-2025",
  type: "raster-patch",
  assetUrl: "/journeys/how-america-adds-up/density.png",
  bounds: [-125, 24, -66, 50],
  opacity: 0.9,
};

// Crisp vector outline layered on top of the raster patch
const conusOutlines: MapOverlay[] = (
  data.geometry.coordinates as [number, number][][][]
)
  .filter((p) => p[0].length >= 10)
  .map((p, i) => ({
    id: `us-population:conus-outline:${i}`,
    type: "path",
    foreground: true,
    coordinates: p[0],
    visualState: "hinted",
    opacity: 0.85,
  }));

// The 230-year decennial migration track of the mean center of population (1790–2020)
const populationCenterTrack: MapOverlay = {
  id: "us-population:center-track",
  type: "path",
  dashed: true,
  foreground: true,
  coordinates: [
    [-76.19, 39.27], // 1790: Kent County, Maryland (east of Baltimore)
    [-78.5, 39.0], // 1820: West Virginia / Virginia border
    [-81.32, 38.98], // 1850: near Parkersburg, West Virginia
    [-85.81, 39.16], // 1900: near Columbus, Indiana
    [-88.06, 38.8], // 1950: near Olney, Illinois
    [-92.35, 37.42], // 2020: Hartville, Wright County, Missouri
  ],
};

const meanCenter: PlaceFeature = {
  id: "us-population:mean-center-2020",
  name: "Hartville, Missouri",
  lat: 37.4158,
  lng: -92.3464,
  kind: "other",
  parentId: "wurl:USA",
  sourceId: "census:mean-center-2020",
  visualState: "answer",
  labelFlexible: true,
  priority: 100,
};

const base = definePresentation({
  topic: "U.S. population",
  instruction: "",
  failure: "feedback",
  focus: conusFocus,
  source: census,
  disclosure: {
    hoverNames: true,
    namedChoices: false,
    committedNames: true,
    previousVisits: false,
  },
  map: { borders: true, hoverFeedback: true, muteOthers: true },
});

export const HOW_AMERICA_ADDS_UP_JOURNEY: Journey = {
  id: "how-america-adds-up-v1",
  addedAt: "2026-11-04",
  title: "How America Adds Up",
  dailyEligible: false,
  description:
    "From crowded island shores to wide empty basins, trace where 340 million Americans actually live—and discover the single point where the whole country balances.",
  rounds: [
    defineQuestion({
      ...base,
      id: "america-population-01-whole-country",
      title: "The Whole Country",
      label: "National count",
      progressLabel: "The Whole Country",
      resolvedLabel: "341.8 million residents",
      leadIn:
        "Across fifty states and three thousand miles, the national headcount keeps climbing.",
      prompt: "Estimate the total population of the United States today.",
      mode: "slider",
      inputLabel: "Population estimate",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "numeric-range",
        min: 200,
        max: 450,
        step: 1,
        value: 341.8,
        unit: "million people",
        tolerance: 35,
        showAccuracyBands: false,
        answerLabel: "Census estimate",
        tiers: [
          { tolerance: 5, feedback: "Very close." },
          { tolerance: 15, feedback: "Close estimate." },
          { tolerance: 35, feedback: "In range." },
        ],
      },
      guidance: {
        hint: "The 2020 census counted roughly 331 million people. Growth has added between two and three million residents each year.",
        assist: {
          text: "The total has passed 335 million, but remains well under 360 million. Aim between 338 and 345 million.",
        },
      },
      explanation:
        "The Census Bureau estimates roughly 341.8 million residents across the fifty states and the District of Columbia. Despite shifting migration and demographic trends, the total has climbed by more than ten million people since the 2020 census.",
      scenes: {
        play: { focus: nationalFocus, contextIds: ["wurl:USA"] },
        reveal: { focus: nationalFocus, contextIds: ["wurl:USA"] },
      },
    }),
    defineQuestion({
      ...base,
      id: "america-population-02-island-state",
      title: "Islands in the Count",
      label: "Island living",
      progressLabel: "Island living",
      resolvedLabel: "New York · Long Island & NYC",
      leadIn:
        "Hawaii is surrounded by open ocean, but it isn’t the only state where water separates the majority of residents from the mainland.",
      prompt:
        "Which other state has more than half its population living on islands?",
      mode: "map-single",
      count: 1,
      selection: { type: "ids", ids: states.filter((s) => s !== "wurl:USA-HI") },
      commitment: "submit",
      importedRegions: US_STATES,
      rule: { type: "region-ids", ids: ["wurl:USA-NY"], match: "any" },
      guidance: {
        hint: "Think about the country's largest metropolitan area. Several of its most crowded boroughs and suburban counties are completely surrounded by tidal straits, bays, and open ocean.",
        assist: {
          text: "Look to the Northeast. A single island extending east from New York Harbor holds over eight million people alone.",
        },
      },
      explanation:
        "Over 11 million New Yorkers live on islands. Manhattan and Staten Island stand on their own, while Brooklyn, Queens, Nassau, and Suffolk counties span the length of Long Island. Only the Bronx and areas to the north touch the continental mainland.",
      map: {
        ...base.map,
        candidates: "highlighted",
      },
      scenes: {
        play: {
          focus: conusFocus,
          views: [hawaiiFocus, conusFocus],
          contextIds: ["wurl:USA-HI"],
        },
        reveal: {
          focus: nyHarborFocus,
          answerIds: ["wurl:USA-NY"],
          places: [
            referenceLabel("Long Island", 40.85, -73.1),
            referenceLabel("New York City", 40.71, -74.0),
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "america-population-03-sparse",
      title: "Room to Breathe",
      label: "Sparse ground",
      progressLabel: "Room to Breathe",
      resolvedLabel: "Least-populous states · Five under 1M",
      leadIn: "Enormous borders can enclose surprisingly few homes.",
      prompt:
        "Select any one of the five states with fewer than one million residents.",
      mode: "map-single",
      count: 1,
      selection: { type: "ids", ids: states },
      commitment: "submit",
      importedRegions: US_STATES,
      map: {
        ...base.map,
        candidates: "highlighted",
      },
      rule: { type: "region-ids", ids: least, match: "any" },
      guidance: {
        hint: "Consider the arid northern plains, the rugged Rocky Mountains, and the cold expanse of the far northwest. Only one qualified state lies east of the Mississippi.",
        assist: {
          text: "Wyoming, Vermont, Alaska, North Dakota, South Dakota, Montana, and Delaware are candidates. Five currently count under one million residents.",
          candidateIds: [
            ...least,
            ...["DE", "RI", "MT"].map((s) => `wurl:USA-${s}`),
          ],
        },
      },
      explanation:
        "Wyoming, Vermont, Alaska, North Dakota, and South Dakota each count fewer than one million residents—with Wyoming home to barely 588,000. Combined, all five hold fewer people than the city of Los Angeles alone.",
      scenes: {
        play: { focus: northwestFocus, contextIds: [] },
        reveal: { focus: plainsFocus, contextIds: [], returnToSelection: true },
      },
    }),
    defineQuestion({
      ...base,
      id: "america-population-04-fifty-million",
      title: "Fifty Million",
      label: "Concentration",
      progressLabel: "Fifty Million",
      resolvedLabel: "50 million people · Megalopolises",
      leadIn:
        "Between clustered coastal megalopolises and wide empty basins, density shifts by orders of magnitude.",
      prompt: "Paint an area that adds up to roughly 50 million people.",
      instruction:
        "Paint one dense corridor or sweep across multiple regions.",
      mode: "geo-brush",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      constructionArea: {
        name: "Contiguous United States",
        geometry: data.geometry as RegionFeature["geometry"],
        mask: data.mask as {
          assetUrl: string;
          bounds: [number, number, number, number];
        },
      },
      rule: {
        type: "population-brush-target",
        grid,
        targetPopulation: 50000000,
        brushRadiusKm: 160,
        tiers: [
          { error: 10000000, feedback: "Remarkably close." },
          { error: 20000000, feedback: "Close estimate." },
          { error: 30000000, feedback: "In range." },
        ],
      },
      constructionExample: {
        version: 1,
        kind: "brush",
        strokes: [
          { points: [{ lat: 40.7, lng: -74 }], radiusKm: 310, erase: false },
        ],
      },
      guidance: {
        hint: "A tight stroke along the Boston-to-Washington corridor captures tens of millions quickly. Across the rural West or Great Plains, reaching that count requires sweeping across a dozen states.",
        assist: {
          text: "Try tracing the urban Northeast, or combine coastal California with Texas’s major cities. You don't need a single continuous stroke.",
        },
      },
      explanation:
        "America’s population gathers into intense clusters. The urban corridor from Boston to northern Virginia holds over 50 million people on less than two percent of the nation's land, while matching that total in the interior West requires spanning thousands of miles.",
      source: worldpop,
      sources: [census],
      scenes: {
        play: {
          focus: densityFocus,
          contextIds: [],
          overlays: [density, ...conusOutlines],
        },
        reveal: {
          focus: densityFocus,
          contextIds: [],
          overlays: [density, ...conusOutlines],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "america-population-05-mean-center",
      title: "The Balance Point",
      label: "Balance point",
      progressLabel: "Center of population",
      resolvedLabel: "Hartville, Missouri · Mean center",
      leadIn:
        "If the country were balanced on a single fulcrum, the distribution of 340 million people creates one exact center of gravity.",
      prompt: "Place a pin on that balance point.",
      instruction: "",
      mode: "pin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "pin-distance",
        targetId: meanCenter.id,
        radiusKm: 600,
        tiers: [
          { radiusKm: 150, feedback: "Bullseye!" },
          { radiusKm: 350, feedback: "Very close." },
          { radiusKm: 600, feedback: "In range." },
        ],
      },
      guidance: {
        hint: "The balance point is pulled east by the dense Atlantic seaboard, south by fast-growing Sunbelt states, and west by California. It has crossed the Mississippi River, but has not reached the Great Plains.",
        assist: {
          text: "St. Louis and Springfield, Missouri, are marked as reference anchors. Look in the Ozarks of southern Missouri, south of the Missouri River.",
          places: [
            referenceLabel("St. Louis", 38.627, -90.1994),
            referenceLabel("Springfield", 37.209, -93.2923),
          ],
        },
      },
      explanation:
        "The Census Bureau's mean center of population sits near Hartville in southern Missouri. In 1790, America’s balance point was near Baltimore, Maryland. Over 230 years of westward settlement and Sunbelt growth, it marched across Ohio, Indiana, and Illinois before crossing the Mississippi River into the Ozarks.",
      source: centerSource,
      scenes: {
        play: {
          focus: densityFocus,
          contextIds: [],
          places: [meanCenter],
          overlays: [density, ...conusOutlines],
        },
        assist: {
          focus: { lat: 37.5, lng: -92, altitude: 0.42 },
          places: [
            referenceLabel("St. Louis", 38.627, -90.1994),
            referenceLabel("Springfield", 37.209, -93.2923),
          ],
        },
        reveal: {
          focus: { lat: 37.4, lng: -92.3, altitude: 0.22 },
          views: [
            { lat: 37.4, lng: -92.3, altitude: 0.22 },
            { lat: 38.5, lng: -84, altitude: 0.72 },
          ],
          contextIds: [],
          places: [
            meanCenter,
            referenceLabel("St. Louis", 38.627, -90.1994),
            referenceLabel("Springfield", 37.209, -93.2923),
            referenceLabel("1790 · Maryland", 39.27, -76.19),
          ],
          overlays: [...conusOutlines, populationCenterTrack],
        },
      },
    }),
  ],
  completion: {
    physicalFeatures: [],
    mapMode: "cumulative",
    focus: conusFocus,
    views: [
      { lat: 40.75, lng: -73.6, altitude: 0.2 },
      { lat: 44.5, lng: -105, altitude: 0.48 },
      { lat: 37.4, lng: -92.3, altitude: 0.24 },
      { lat: 38, lng: -96, altitude: 0.85 },
    ],
    overlays: [...conusOutlines, populationCenterTrack],
    places: [meanCenter],
    contextIds: [],
    caption:
      "From crowded island shores in New York to wide empty basins in the West, America's 340 million people do not spread evenly across the map. They cluster along coasts, gather near water, and pull the nation's center of balance ever farther west and south.",
  },
};
