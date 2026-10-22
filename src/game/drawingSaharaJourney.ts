import { defineQuestion, definePresentation } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { cityReference } from "./authoredPlaces";
import type { Journey, FactSource } from "./questionContracts";
import type { ConstructionGrid } from "./constructionTypes";
import type { GeoPoint } from "./geodesic";
import type { MapOverlay, RegionFeature } from "../geography/types";
import data from "./data/sahara-construction.v1.json";
import display from "./data/sahara-display.v1.json";
import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { gridPoint } from "./construction";
import type { ConstructionArea } from "./constructionTypes";

const frozen = data as unknown as {
  dunes: ConstructionGrid;
  population: ConstructionGrid;
  nile: GeoPoint[];
  boundary: GeoPoint[];
  algeriaGeometry: RegionFeature["geometry"];
  examples: { points: GeoPoint[]; population: number; area: number }[];
  balancedExamples: {
    points: GeoPoint[];
    population: number;
    area: number;
    orientation: string;
  }[];
};
const assets = "/journeys/drawing-the-sahara/";
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-20",
});
const nasa = source(
  "NASA GIBS · Blue Marble imagery and VIIRS 2012 nightlights",
  "https://nasa-gibs.github.io/gibs-api-docs/",
);
const dunes = source(
  "Gunn 2026 · mapped dune presence, MIT license",
  "https://doi.org/10.5281/zenodo.20054674",
);
const population = source(
  "WorldPop · Algeria 2024, R2025A v1 (alpha) constrained counts · CC BY 4.0",
  frozen.population.sourceUrl,
);
const boundary = source(
  "geoBoundaries · Algeria ADM0, OpenStreetMap/Wambacher · ODbL 1.0",
  "https://www.geoboundaries.org/api/current/gbOpen/DZA/ADM0/",
);
const nileSource = source(
  "Natural Earth · bundled Nile centerline · public domain",
  "https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-rivers-lake-centerlines/",
);
const place = (name: string, parentId?: string) => {
  const p = [...ANSWER_PLACES.values()].find(
    (p) => p.name === name && (!parentId || p.parentId === parentId),
  );
  if (!p) throw Error(`Missing Sahara reference city: ${name}`);
  return cityReference(p);
};
const capitals = [
  "Rabat",
  "Algiers",
  "Tunis",
  "Tripoli",
  "Cairo",
  "Nouakchott",
  "Bamako",
  "Niamey",
  "N'Djamena",
  "Khartoum",
].map((name) => place(name, name === "Tripoli" ? "wurl:LBY" : undefined));
const aswan = cityReference({
    ...ANSWER_PLACES.get("place:359792")!,
    name: "Aswan",
  }),
  cairo = place("Cairo"),
  algiers = place("Algiers");
const image = (
  id: string,
  asset: string,
  bounds: [number, number, number, number],
): MapOverlay => ({
  id,
  type: "raster-patch",
  assetUrl: assets + asset,
  bounds,
  opacity: 1,
});
const africaArea = {
  ...display.africa,
  name: "North Africa",
} as ConstructionArea;
const egyptArea = { ...display.egypt, name: "Egypt" } as ConstructionArea;
const algeriaArea = { ...display.algeria, name: "Algeria" } as ConstructionArea;
const earth = image(
  "sahara:true-color",
  "africa-satellite.webp",
  [-18, 10, 52, 38],
);
const nileImage = image(
  "sahara:nile-image",
  "egypt-satellite.webp",
  [24, 21, 37, 33],
);
const lights = image(
  "sahara:nightlights",
  "algeria-lights.png",
  [-9, 18, 12, 38],
);
const heatmap = image(
  "sahara:population",
  "algeria-population.png",
  [-9, 18, 12, 38],
);
function areaOutlines(area: ConstructionArea, id: string): MapOverlay[] {
  const g = area.geometry,
    polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  return polys.map((p, i) => ({
    id: `sahara:${id}-outline:${i}`,
    type: "path",
    foreground: true,
    coordinates: p[0],
    visualState: "hinted",
    opacity: 1,
  }));
}
const africaOutlines = areaOutlines(africaArea, "africa"),
  egyptOutlines = areaOutlines(egyptArea, "egypt"),
  algeriaOutlines = areaOutlines(algeriaArea, "algeria");
const duneGrid = {
  ...frozen.dunes,
  revision: `${frozen.dunes.revision}:africa-v2`,
  cells: frozen.dunes.cells.filter(([i]) => {
    const p = gridPoint(frozen.dunes, i);
    return geoContains(sphericalGeometry(africaArea.geometry), [p.lng, p.lat]);
  }),
};
const base = definePresentation({
  label: "Construct",
  topic: "Sahara",
  instruction: "",
  failure: "feedback",
  source: nasa,
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
const algeriaFocus = { lat: 28.5, lng: 2.8, altitude: 0.6 };
const algeriaDisplay = { "wurl:DZA": frozen.algeriaGeometry };

export const DRAWING_SAHARA_JOURNEY: Journey = {
  id: "drawing-the-sahara-v1",
  addedAt: "2026-10-20",
  saveRevision: 1,
  title: "Drawing the Sahara",
  description:
    "Look beyond the dunes: follow water, find cities and discover where people make their homes across the Sahara.",
  rounds: [
    defineQuestion({
      ...base,
      id: "sahara-01-sand-or-stone",
      title: "Sand or Stone?",
      label: "Sand seas",
      constructionArea: africaArea,
      progressLabel: "Sand or Stone?",
      resolvedLabel: "Dune seas",
      leadIn:
        "From the Atlantic to the Red Sea, the Sahara is far more than sand.",
      prompt:
        "Paint the broad dune fields you can recognize in the satellite view.",
      mode: "geo-brush",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "raster-overlap",
        grid: duneGrid,
        brushRadiusKm: 160,
        tiers: [
          { f1: 0.62, precision: 0.67, feedback: "You saw the pattern." },
          { f1: 0.48, precision: 0.6, feedback: "The sands emerge." },
          { f1: 0.33, precision: 0.55, feedback: "Dunes take shape." },
        ],
      },
      guidance: {
        hint: "Look for flowing bands and repeated ridges. Exposed mountains and plateaus can be just as dry, but their texture is different.",
        assist: {
          text: "Compare the flowing dune ridges with the rugged rocky terrain. Where do those textures appear across the desert?",
          images: [
            {
              src: assets + "sand-texture.jpg",
              alt: "Repeated sandy ridges in natural-color imagery",
              caption: "Dune ridges",
            },
            {
              src: assets + "rock-texture.jpg",
              alt: "Dark, rugged exposed rock in natural-color imagery",
              caption: "Rocky terrain",
            },
          ],
        },
      },
      explanation:
        "The Sahara is a mosaic. Wind piles sand into dune seas such as Algeria’s Grand Ergs and Libya’s Murzuq, while stony plains and mountains occupy much of the space between. Pale ground is not always sand: ridges and sweeping dune patterns offer better clues than color alone.",
      sources: [
        dunes,
        source(
          "NASA · Grand Erg Oriental",
          "https://science.nasa.gov/earth/earth-observatory/grand-erg-oriental-algeria-92232/",
        ),
      ],
      mapCaption: "NASA Blue Marble · natural-color composite",
      scenes: {
        play: {
          focus: { lat: 25, lng: 10, altitude: 1.12 },
          contextIds: [],
          overlays: [earth, ...africaOutlines],
        },
        reveal: { focus: { lat: 25, lng: 10, altitude: 1.12 }, contextIds: [] },
      },
    }),
    defineQuestion({
      ...base,
      id: "sahara-02-capitals-at-edge",
      title: "Capitals at the Edge",
      label: "Desert margins",
      constructionInitial: {
        version: 1,
        kind: "circle",
        center: { lat: 23, lng: 13 },
      },
      progressLabel: "Capitals",
      resolvedLabel: "Capital cluster",
      leadIn:
        "The Sahara crosses borders, but many of these countries’ capitals stand around its edges.",
      prompt:
        "Move the 1,400 km circle to cover as many of the ten marked capitals as you can.",
      mode: "geo-circle",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "point-coverage-max",
        radiusKm: 1400,
        candidates: capitals,
        maximum: 5,
        tiers: [
          { count: 5, feedback: "A crowded edge." },
          { count: 4, feedback: "Almost the cluster." },
          { count: 3, feedback: "A cluster found." },
        ],
      },
      constructionExample: {
        version: 1,
        kind: "circle",
        center: { lat: 25.75344, lng: 3.75944 },
      },
      guidance: {
        hint: "The middle of the desert is not necessarily the best place for the circle. Compare the Mediterranean-facing capitals with those along the Sahel.",
        assist: {
          text: "Look across both margins. A circle can bridge a northern group and a capital farther south; its center can sit between the cities.",
        },
      },
      explanation:
        "Five capitals fit together: Rabat, Algiers, Tunis, Tripoli and Niamey. Four face the Mediterranean or the nearby Atlantic; Niamey lies along the Niger in the Sahel. Between them stretches much of the Sahara’s dry interior. The cities trace the desert’s edges rather than filling its heart.",
      sources: capitals.map((p) =>
        source(
          `GeoNames · ${p.name}`,
          `https://www.geonames.org/${p.id.split(":")[1]}/`,
        ),
      ),
      scenes: {
        play: {
          focus: { lat: 24, lng: 13, altitude: 1.25 },
          contextIds: capitals.map((p) => p.parentId!),
        },
        reveal: {
          focus: { lat: 25, lng: 6, altitude: 1.05 },
          contextIds: capitals.map((p) => p.parentId!),
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "sahara-03-green-thread",
      title: "The Green Thread",
      label: "The Nile",
      constructionArea: egyptArea,
      progressLabel: "Lifeline",
      resolvedLabel: "The Nile corridor",
      leadIn:
        "In Egypt, the Nile sustains a narrow strip of farms and cities between two vast deserts.",
      prompt:
        "Trace its course north from Aswan to Cairo, following the river’s bends.",
      mode: "geo-trace",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "line-following",
        reference: frozen.nile,
        sourceRevision:
          "natural-earth-physical-f04df9c054b7cd57-aswan-cairo-v1",
        tiers: [
          {
            coverage: 0.9,
            referenceKm: 15,
            strokeKm: 20,
            feedback: "Followed the water.",
          },
          {
            coverage: 0.8,
            referenceKm: 25,
            strokeKm: 30,
            feedback: "The valley bends.",
          },
          {
            coverage: 0.7,
            referenceKm: 35,
            strokeKm: 45,
            feedback: "The thread emerges.",
          },
        ],
      },
      guidance: {
        hint: "Follow the agricultural ribbon through its changes of direction. A straight line between the cities misses the valley’s bends.",
        assist: {
          text: "Look closely around Luxor and Qena, where the valley makes a broad turn. Keep your existing trace and follow the ribbon onward to Cairo.",
          focus: { lat: 26.05, lng: 32.5, altitude: 0.22 },
          places: [place("Luxor")],
        },
      },
      explanation:
        "The Nile carries a narrow ribbon of fields and settlements through Egypt’s deserts. Life follows the river’s turns, including the great bend near Luxor and Qena. Beyond Cairo, the valley opens into the delta and the river reaches the Mediterranean. Water draws a very different map from the surrounding sand and stone.",
      sources: [
        nileSource,
        source(
          "NASA · Nile Bend, Egypt",
          "https://science.nasa.gov/earth/earth-observatory/nile-bend-egypt-8770/",
        ),
      ],
      mapCaption: "NASA Blue Marble · Egypt",
      scenes: {
        play: {
          focus: { lat: 26.8, lng: 30.3, altitude: 0.62 },
          contextIds: ["wurl:EGY"],
          places: [aswan, cairo],
          overlays: [nileImage, ...egyptOutlines],
        },
        reveal: {
          focus: { lat: 26.8, lng: 30.3, altitude: 0.62 },
          contextIds: ["wurl:EGY"],
          places: [aswan, cairo],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "sahara-04-northern-ribbon",
      title: "The Northern Ribbon",
      label: "Algeria at night",
      constructionArea: algeriaArea,
      progressLabel: "Settlement",
      resolvedLabel: "Algeria’s population belt",
      leadIn:
        "Algeria is Africa’s largest country, stretching deep into the Sahara. Yet most of its people live near the Mediterranean coast.",
      prompt:
        "Place 4–8 points to enclose at least 75% of Algeria’s population within no more than 20% of its land.",
      mode: "geo-polygon",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "population-coverage-area-budget",
        grid: frozen.population,
        minVertices: 4,
        maxVertices: 8,
        tiers: [
          { population: 75, area: 20, feedback: "Most people, little land." },
          { population: 65, area: 30, feedback: "The north concentrates." },
          { population: 55, area: 40, feedback: "A northern ribbon." },
        ],
      },
      constructionExampleFootprint: display.northernRibbon
        .geometry as RegionFeature["geometry"],
      constructionExample: {
        version: 1,
        kind: "polygon",
        points: display.northernRibbon.points,
      },
      guidance: {
        hint: "Compare the Mediterranean-facing north with the much larger interior. Where could a small region gather the greatest share of people?",
        assist: {
          text: "Find Algiers, Oran and Constantine, then look at the lights between and around them. What connects these northern cities?",
          places: [algiers, place("Oran"), place("Constantine")],
        },
      },
      explanation:
        "Most Algerians live in a comparatively narrow northern belt, close to the Mediterranean and the country’s largest cities. The Sahara occupies far more land, with settlements clustered around oases and other sources of water. Lights help reveal that contrast, though a bright industrial site can shine more strongly than a much larger community.",
      sources: [population, boundary],
      displayGeometries: algeriaDisplay,
      mapCaption: "NASA/NOAA VIIRS · Algeria at night, 2012",
      feedbackMapCaption: "WorldPop · Algeria’s population, 2024 estimates",
      scenes: {
        play: {
          focus: algeriaFocus,
          contextIds: ["wurl:DZA"],
          overlays: [lights, ...algeriaOutlines],
        },
        reveal: {
          focus: algeriaFocus,
          contextIds: ["wurl:DZA"],
          overlays: [heatmap],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "sahara-05-half-the-people",
      title: "Half the People",
      label: "Finding balance",
      constructionArea: algeriaArea,
      progressLabel: "Half the People",
      resolvedLabel: "People and land",
      leadIn:
        "The Sahara fills most of Africa’s largest country, but Algeria’s people are concentrated in the north. How would you divide this vast country into two equally populated halves?",
      prompt:
        "Draw a line across the country that puts half its population on each side.",
      mode: "geo-cut",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "population-balance",
        grid: frozen.population,
        boundary: frozen.boundary,
        tiers: [
          { error: 5, feedback: "An even split." },
          { error: 10, feedback: "The balance is close." },
          { error: 18, feedback: "Two close halves." },
        ],
      },
      constructionExample: {
        version: 1,
        kind: "cut",
        points: frozen.balancedExamples[0].points,
      },
      guidance: {
        hint: "Start with the busy northern belt. A line can divide its cities from east to west, or separate a coastal strip from the interior.",
        assist: {
          text: "Use Algiers, Oran and Constantine to picture where the people live. Try turning your line as well as moving its ends.",
          places: [place("Oran"), place("Constantine")],
        },
      },
      explanation:
        "An east–west line can separate a busy coastal strip from the much larger interior. A north–south line can share out the northern cities instead. Both can balance the population; their land areas may be very different—or surprisingly similar.",
      sources: [population, boundary],
      displayGeometries: algeriaDisplay,
      mapCaption: "WorldPop · Algeria’s population, 2024 estimates",
      scenes: {
        play: {
          focus: algeriaFocus,
          contextIds: ["wurl:DZA"],
          places: [algiers],
          overlays: algeriaOutlines,
        },
        reveal: { focus: algeriaFocus, contextIds: ["wurl:DZA"] },
      },
    }),
  ],
  completion: {
    constructionResults: true,
    focus: { lat: 26, lng: 12, altitude: 1.1 },
    views: [
      { lat: 25, lng: 1, altitude: 1.05 },
      { lat: 26, lng: 27, altitude: 1.05 },
      { lat: 30, lng: 8, altitude: 1.05 },
    ],
    regionIds: [...new Set(capitals.map((p) => p.parentId!))],
    places: [...capitals, aswan],
    physicalFeatures: [],
    overlays: [
      ...africaOutlines,
      {
        id: "sahara:completed-nile",
        type: "path",
        foreground: true,
        coordinates: frozen.nile.map((p) => [p.lng, p.lat]),
        visualState: "visited",
        opacity: 1,
      },
    ],
    borders: true,
    mapAttribution: {
      label: "Data, imagery, licenses and model notes",
      url: assets + "SOURCES.md",
    },
    mapCaption:
      "From Atlantic sand seas to the Nile, then back to Algeria’s northern cities",
    caption:
      "Across the Sahara, sand gathers in pockets, water draws green corridors, and cities cluster where people can make a living. A country’s outline tells you its size; the lives within it draw a different map.",
  },
};
