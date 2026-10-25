import { definePresentation, defineQuestion } from "./questionBuilder";
import { cityReference, areaLabel } from "./authoredPlaces";
import type { Journey, FactSource } from "./questionContracts";
import type { ConstructionGrid, ConstructionArea } from "./constructionTypes";
import type { GeoPoint } from "./geodesic";
import type {
  RegionFeature,
  MapOverlay,
  PlaceFeature,
} from "../geography/types";
import snapshot from "./data/india-journey.v1.json";

export const INDIA_DATA = snapshot as unknown as {
  revision: string;
  zoneRevision: string;
  indiaGeometry: RegionFeature["geometry"];
  landGeometry: RegionFeature["geometry"];
  landMask: NonNullable<ConstructionArea["mask"]>;
  indiaMask: NonNullable<ConstructionArea["mask"]>;
  paint: ConstructionGrid;
  population: ConstructionGrid;
  zones: {
    id: string;
    label: string;
    geometry: RegionFeature["geometry"];
    example: GeoPoint;
  }[];
  boundary: GeoPoint[];
  cities: PlaceFeature[];
  circleExample: GeoPoint;
  balancedExamples: {
    points: GeoPoint[];
    population: number;
    sourcePopulation: number;
    area: number;
    orientation: string;
  }[];
};
const data = INDIA_DATA;
const assets = "/journeys/the-shape-of-india/";
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-23",
});
const geography = source(
  "Natural Earth 5.1.2 · administered boundaries and disputed areas · public domain",
  "https://www.naturalearthdata.com/about/disputed-boundaries-policy/",
);
const landforms = source(
  "National Portal of India · mountains, plains, desert and peninsula",
  "https://www.india.gov.in/explore-india/facts-of-india/physical-background/physical-features",
);
const ecoregions = source(
  "RESOLVE / Esri · Ecoregions 2017 · broad teaching zones · CC BY 4.0",
  "https://www.arcgis.com/home/item.html?id=37ea320eebb647c6838c23f72abae5ef",
);
const nasa = source(
  "NASA GIBS · Blue Marble shaded relief",
  "https://nasa-gibs.github.io/gibs-api-docs/",
);
const population = source(
  "WorldPop · India 2025 R2025A v1 (alpha) · modeled population counts",
  data.population.sourceUrl,
);
const borderSource = source(
  "Land Ports Authority of India · official seven-neighbor convention",
  "https://lpai.gov.in/index.php/en/genesis",
);
const citySource = source(
  "GeoNames · bundled Indian city centers · CC BY 4.0",
  "https://www.geonames.org/",
);
const triangle = source(
  "Delhi Tourism · the Golden Triangle",
  "https://delhitourism.gov.in/itinerary/golden_triangle.html",
);
const broad = { lat: 23, lng: 82, altitude: 1.05 };
const indiaArea: ConstructionArea = {
  name: "India",
  geometry: data.indiaGeometry,
  mask: data.indiaMask,
};
const southAsia: ConstructionArea = {
  name: "South Asian land",
  geometry: data.landGeometry,
  mask: data.landMask,
};
const relief: MapOverlay = {
  id: "india:relief",
  type: "raster-patch",
  assetUrl: assets + "south-asia.webp",
  bounds: [60, 2, 104, 42],
  opacity: 1,
};
const indiaRelief: MapOverlay = {
  ...relief,
  id: "india:country-relief",
  assetUrl: assets + "india-relief.webp",
  bounds: [66, 6, 99, 38],
};
const heat: MapOverlay = {
  id: "india:population-density",
  type: "raster-patch",
  assetUrl: assets + "population.png",
  bounds: [66, 6, 99, 38],
  opacity: 0.88,
};
const lines = (id: string, geometry: RegionFeature["geometry"]): MapOverlay[] =>
  (geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates
  ).map((p, i) => ({
    id: `india:${id}:${i}`,
    type: "path",
    foreground: true,
    coordinates: p[0],
    visualState: "hinted",
    opacity: 0.75,
  }));
const outline = lines("outline", data.indiaGeometry);
const labels = data.zones.map((z) =>
  areaLabel({
    id: `india-zone-label:${z.id}`,
    name: z.label,
    kind: "landform",
    sourceId: "resolve-ecoregions-2017",
    ...z.example,
  }),
);
const neighbors = [
  "wurl:PAK",
  "wurl:CHN",
  "wurl:NPL",
  "wurl:BTN",
  "wurl:BGD",
  "wurl:MMR",
];
const base = definePresentation({
  label: "India",
  topic: "India",
  instruction: "",
  failure: "feedback",
  source: geography,
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
});

export const SHAPE_OF_INDIA_JOURNEY: Journey = {
  id: "the-shape-of-india-v1",
  addedAt: "2026-10-23",
  title: "The Shape of India",
  description:
    "A coastline becomes a country; mountains give way to crowded plains. Explore India through five shapes, ending with a line that puts half its population on either side.",
  mapAttribution: {
    label: "NASA · Natural Earth · RESOLVE · GeoNames · WorldPop",
    url: assets + "SOURCES.md",
  },
  rounds: [
    defineQuestion({
      ...base,
      id: "india-01-paint-the-country",
      title: "Paint India",
      incorrectFeedback: "Not quite.",
      label: "The outline",
      resolvedLabel: "India",
      leadIn:
        "A peninsula points into the Indian Ocean. Above it, the Himalayas fold across the continent. Somewhere between them is India—but we’ve taken away the borders.",
      prompt: "Paint India onto the map.",
      instruction: "Use the land India administers today.",
      mode: "geo-brush",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      constructionArea: southAsia,
      rule: {
        type: "raster-overlap",
        grid: data.paint,
        targetLabel: "India",
        targetMask: data.indiaMask,
        brushRadiusKm: 100,
        tiers: [
          { f1: 0.8, precision: 0.78, feedback: "Well painted." },
          { f1: 0.6, precision: 0.63, feedback: "Good coverage." },
          { f1: 0.4, precision: 0.5, feedback: "Taking shape." },
        ],
      },
      visualExceptions: {
        "hidden-boundaries":
          "Recognizing the country footprint is the task; the broader editable land does not trace the answer.",
      },
      guidance: {
        hint: "Use the peninsula and its two coastlines to anchor yourself. India’s land also extends around the Himalayan foothills and into the northeast.",
        assist: {
          text: "Five cities are marked, from Amritsar in the north to Kanyakumari at the southern tip. Kolkata and Guwahati help you find India’s eastern reach.",
          places: [
            ...[
              {
                id: "place:1278710",
                name: "Amritsar",
                lat: 31.62234,
                lng: 74.87534,
                sourceId: "geonames:1278710",
              },
              {
                id: "place:1275339",
                name: "Mumbai",
                lat: 19.07283,
                lng: 72.88261,
                sourceId: "geonames:1275339",
              },
              {
                id: "place:1275004",
                name: "Kolkata",
                lat: 22.56263,
                lng: 88.36304,
                sourceId: "geonames:1275004",
              },
              {
                id: "place:1271476",
                name: "Guwahati",
                lat: 26.1844,
                lng: 91.7458,
                sourceId: "geonames:1271476",
              },
            ].map((p) =>
              cityReference({ ...p, kind: "city", parentId: "wurl:IND" }),
            ),
            cityReference({
              id: "india:peninsula-tip",
              name: "Kanyakumari",
              lat: 8.09008,
              lng: 77.53841,
              kind: "city",
              sourceId: "geonames:1268008",
              parentId: "wurl:IND",
            }),
          ],
        },
      },
      explanation:
        "The peninsula gives India its familiar point, but it is only the start. Follow the outline north to the Himalayas, then east around Bangladesh: the country reaches much farther than that first triangle suggests. Now let’s look inside it.",
      sources: [geography, nasa, landforms, citySource],
      mapCaption: "NASA Blue Marble · coastlines and relief",
      scenes: {
        play: {
          focus: broad,
          contextIds: [],
          overlays: [relief],
          map: { borders: false, hoverFeedback: false },
        },
        reveal: {
          focus: broad,
          contextIds: ["wurl:IND", "wurl:NE-KAS"],
          borders: true,
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "india-02-three-landscapes",
      title: "Three Very Different Indias",
      incorrectFeedback: "Not quite.",
      label: "Three landscapes",
      instruction: "Keep all three pins in India.",
      resolvedLabel: "Mountains · Desert · Plain",
      leadIn:
        "Inside that outline, snowy ridges give way to pale desert and a broad sweep of green below the mountains.",
      prompt:
        "Place one pin in each: the Himalayas, the Thar Desert, and the Indo-Gangetic Plain.",
      mode: "geo-multipin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "labeled-region-pin-set",
        sourceRevision: data.zoneRevision,
        slots: data.zones,
        tiers: [
          { count: 3, feedback: "Well placed." },
          { count: 2, feedback: "Two regions found." },
          { count: 1, feedback: "One region found." },
        ],
      },
      guidance: {
        hint: "Look for high relief along the north, dry terrain in the northwest, and a wide lowland belt between the mountains and the plateau.",
        assist: {
          text: "The Himalayan arc is traced and labeled. Follow its high terrain, then look southwest for dry country and below the mountains for the plain.",
          overlays: [
            {
              id: "india:mountain-assist",
              type: "path",
              foreground: true,
              label: "Himalayan arc",
              coordinates: [
                [74.8, 34.2],
                [77.5, 32.2],
                [80, 30],
                [83, 28.8],
                [86, 27.9],
                [89, 27.6],
                [92, 28.2],
                [95, 28.6],
              ],
              visualState: "hinted",
              opacity: 1,
            },
          ],
        },
      },
      explanation:
        "Snow, sand, and river-fed farmland: three very different parts of the same country. The Himalayas form the northern arc; the Thar opens out to the northwest; the Indo-Gangetic Plain spreads beneath the mountains. Keep that plain in mind—we’ll return to it for the final challenge.",
      qualification:
        "These broad landscapes blend into one another; the shaded areas show their general extent.",
      sources: [landforms, ecoregions, nasa, geography],
      scenes: {
        play: {
          focus: { lat: 26, lng: 81, altitude: 0.8 },
          contextIds: ["wurl:IND"],
          overlays: [indiaRelief, ...outline],
        },
        reveal: {
          focus: { lat: 27, lng: 81, altitude: 0.8 },
          contextIds: ["wurl:IND"],
          overlays: [
            {
              id: "india:landscape-regions",
              type: "raster-patch",
              assetUrl: assets + "landscapes.png",
              bounds: [66, 6, 99, 38],
              foreground: true,
              opacity: 0.55,
            },
          ],
          places: labels,
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "india-03-name-the-neighbors",
      title: "Name India’s Neighbors",
      label: "The neighbors",
      resolvedLabel: "Six land neighbors",
      correctFeedback: "Well remembered.",
      leadIn:
        "Mountains may look like a wall, but India meets several countries along that arc. Follow the border west to east, then around the eastern hills.",
      prompt:
        "Which six countries share a land boundary with territory India administers?",
      instruction:
        "Enter one country at a time. Each incorrect country lowers your maximum score; a third ends the round at zero.",
      mode: "country-recall",
      count: 6,
      inputLabel: "Country name",
      selection: { type: "none" },
      commitment: "submit",
      disclosure: { ...base.disclosure, committedNames: true },
      rule: {
        type: "country-set-recall",
        ids: neighbors,
        assistOrder: [
          "wurl:BTN",
          ...neighbors.filter((id) => id !== "wurl:BTN"),
        ],
        exceptions: [
          {
            id: "wurl:AFG",
            message:
              "Afghanistan borders territory claimed by India, beyond the area India administers. Try another country.",
          },
        ],
      },
      guidance: {
        hint: "Look around the Himalayan north, the eastern hills and the western side of the subcontinent. Several smaller neighbors are tucked between larger ones.",
        assist: {
          text: "One missing neighbor has been added and highlighted. Use the surrounding geography to recall the rest.",
        },
      },
      explanation:
        "From Pakistan in the west to Myanmar in the east, India’s land neighbors span high Himalayan boundaries and broad lowland borders. The ocean opens around the peninsula to the south.",
      sources: [geography, borderSource],
      scenes: {
        play: {
          focus: { lat: 27, lng: 82, altitude: 1 },
          contextIds: ["wurl:IND"],
          map: { feedbackRegions: undefined },
        },
        reveal: {
          focus: { lat: 27, lng: 82, altitude: 1 },
          contextIds: ["wurl:IND"],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "india-04-golden-triangle",
      title: "The Golden Triangle",
      incorrectFeedback: "Not quite.",
      label: "The Golden Triangle",
      resolvedLabel: "Delhi · Jaipur · Agra",
      leadIn:
        "Step back inside the border for a short road trip. Delhi, Jaipur and Agra form the Golden Triangle—a circuit linking the capital, Rajasthan and the Taj Mahal.",
      prompt:
        "Delhi is marked; move the circle to include Delhi, Jaipur and Agra.",
      mode: "geo-circle",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      constructionInitial: {
        version: 1,
        kind: "circle",
        center: { lat: 25.5, lng: 78.5 },
      },
      constructionExample: {
        version: 1,
        kind: "circle",
        center: data.circleExample,
      },
      rule: {
        type: "point-coverage-max",
        radiusKm: 200,
        candidates: data.cities,
        pointLabel: "cities",
        maximum: 3,
        hideCandidatesUntilReveal: true,
        tiers: [
          { count: 3, feedback: "Nicely placed." },
          { count: 2, feedback: "Two cities inside." },
          { count: 1, feedback: "One city captured." },
        ],
      },
      guidance: {
        hint: "Think of Delhi at the top of a squat triangle. Jaipur is about 235 km southwest of it; Agra is about 180 km southeast. The circle has a 200 km radius, so center it a little south of Delhi.",
        assist: {
          text: "Jaipur joins Delhi on the map. Shift the circle between them, leaving room to the east for Agra.",
          places: [
            cityReference(data.cities.find((p) => p.name === "Jaipur")!),
          ],
        },
      },
      explanation:
        "Three cities, one compact loop: Delhi at the northern tip, Jaipur to the southwest, and Agra to the southeast. The Golden Triangle sits on the edge of the northern plains you found earlier. Those plains matter even more when we swap city stops for people.",
      sources: [triangle, citySource],
      scenes: {
        play: {
          focus: { lat: 27.5, lng: 77.5, altitude: 0.42 },
          contextIds: ["wurl:IND"],
          places: [cityReference(data.cities.find((p) => p.name === "Delhi")!)],
        },
        reveal: {
          focus: { lat: 27.6, lng: 77, altitude: 0.35 },
          contextIds: ["wurl:IND"],
          overlays: [
            {
              id: "india:golden-triangle",
              type: "path",
              foreground: true,
              coordinates: [...data.cities, data.cities[0]].map((p) => [
                p.lng,
                p.lat,
              ]),
              visualState: "corridor",
              opacity: 1,
            },
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "india-05-half-the-population",
      title: "Half the Population",
      incorrectFeedback: "Unevenly split.",
      label: "Half the population",
      resolvedLabel: "Equal people, unequal land",
      leadIn:
        "Remember the broad plain below the Himalayas? Watch it light up on the population map. For our last shape, forget equal pieces of land.",
      prompt: "Draw one line that puts half of India’s people on each side.",
      mode: "geo-cut",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      constructionArea: indiaArea,
      constructionExample: {
        version: 1,
        kind: "cut",
        points: data.balancedExamples[0].points,
      },
      rule: {
        type: "population-balance",
        grid: data.population,
        boundary: data.boundary,
        tiers: [
          { error: 5, feedback: "Beautifully balanced." },
          { error: 10, feedback: "Very close." },
          { error: 18, feedback: "Within range." },
        ],
      },
      guidance: {
        hint: "A line that halves India’s land will not necessarily halve its people. Pay special attention to the densely settled plains across the north.",
        assist: {
          text: "The lowland settlement belt is labeled. Use the full population map, including the less densely populated land, to choose your dividing line.",
          places: [
            areaLabel({
              id: "india:plain-assist",
              name: "Northern settlement belt",
              lat: 26.2,
              lng: 82,
              kind: "landform",
              sourceId: "resolve-ecoregions-2017",
            }),
          ],
        },
      },
      explanation:
        "The labels show the share of people on each side of your line. A broad mountain or desert region can hold fewer people than a much smaller piece of the northern plain. There is no single right angle here: many different lines can share the population evenly.",
      mapCaption: "WorldPop · India · estimated population density, 2025",
      rasterLegend: {
        label: "People per km²",
        stops: [
          { color: "#fff0b4", label: "0" },
          { color: "#f09673", label: "70" },
          { color: "#e13c32", label: "5,000+" },
        ],
      },
      qualification:
        "The map shows WorldPop’s population estimates for 2025, rather than a census. Darker areas hold more people per square kilometer; the colors emphasize differences across both sparse and dense areas.",
      sources: [population, geography],
      scenes: {
        play: {
          focus: broad,
          contextIds: ["wurl:IND"],
          overlays: [heat, ...outline],
        },
        reveal: { focus: broad, contextIds: ["wurl:IND"] },
      },
    }),
  ],
  completion: {
    focus: { lat: 23, lng: 80, altitude: 0.9 },
    views: [{ lat: 23, lng: 80, altitude: 0.9 }],
    mapMode: "authored",
    regionIds: ["wurl:IND", "wurl:NE-KAS"],
    physicalFeatures: [],
    overlays: [],
    places: data.cities.map((p) => ({
      ...cityReference(p),
      visualState: "visited",
    })),
    constructionResults: true,
    loopViews: false,
    mapCaption: "The Shape of India · five ways to read one country",
    caption:
      "You began with an outline and ended with people. In between, the same country became a mountain arc, a desert, a plain, a ring of neighbors and a triangle of cities. One map can tell very different stories depending on the shape you look for.",
  },
};
