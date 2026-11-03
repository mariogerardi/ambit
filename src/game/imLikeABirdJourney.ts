import { geoArea, geoDistance } from "d3-geo";
import { CatmullRomCurve3, Vector3 } from "three";
import { definePresentation, defineQuestion } from "./questionBuilder";
import { initialBearing, pointAlongBearing } from "./geodesic";
import { EARTH_KM } from "./spatial";
import type { FactSource, Journey } from "./questionContracts";
import type { Focus, MapOverlay, PhysicalFeature } from "../geography/types";
import media from "./data/im-like-a-bird-media.v1.json";

// Original illustrative geometry, not digitized tracks or seasonal range polygons.
// Evidence, widths, limitations and media licenses: public/journeys/im-like-a-bird/SOURCES.md.
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-01",
});
const craneSource = source(
  "Crane Conservation Germany · western European flyway",
  "https://kraniche.de/en/crane-migration.html",
);
const hummingbirdSource = source(
  "Cornell Lab · ruby-throated hummingbird migration",
  "https://www.allaboutbirds.org/guide/Ruby-throated_Hummingbird/maps-range",
);
const storkSource = source(
  "Berthold et al. · satellite tracking of white storks",
  "https://www.internationalornithology.org/sites/default/files/23rd%20IOC%20Proceedings_1.pdf",
);
const falconSource = source(
  "Wildlife Institute of India · satellite tracking of Amur falcons",
  "https://raptors.cms.int/sites/default/files/document/Inf.14_Satellite%20Tracking%20of%20Amur%20Falcon%20Falco%20Amurensis.pdf",
);
const gooseSource = source(
  "Hawkes et al. · high-altitude migration of bar-headed geese",
  "https://pmc.ncbi.nlm.nih.gov/articles/PMC3574432/",
);
const notes = source(
  "Migration corridors · sources and illustration notes",
  "/journeys/im-like-a-bird/SOURCES.md",
);

interface Migration {
  id: keyof typeof media;
  title: string;
  species: string;
  scientific: string;
  season: string;
  context: string;
  prompt: string;
  countries: [string, string][];
  distractor: [string, string];
  points: [number, number][];
  halfWidthKm: number;
  focus: Focus;
  hint: string;
  explanation: string;
  source: FactSource;
}

const migrations: Migration[] = [
  {
    id: "common-crane",
    title: "The Autumn Flight",
    species: "Common crane",
    scientific: "Grus grus",
    season: "Autumn · western Europe",
    context:
      "As autumn arrives, great flocks of common cranes gather in northern Europe and move southwest toward milder wintering grounds.",
    prompt:
      "Arrange four of these countries in the order of the crane’s autumn migration. Leave one out.",
    countries: [
      ["SWE", "Sweden"],
      ["DEU", "Germany"],
      ["FRA", "France"],
      ["ESP", "Spain"],
    ],
    distractor: ["ITA", "Italy"],
    points: [
      [13, 59],
      [13, 56],
      [12, 54],
      [10.5, 52],
      [8, 50.5],
      [6, 49.5],
      [4.5, 48.5],
      [0, 45],
      [-1, 43],
      [-2, 41],
      [-6, 39],
    ],
    halfWidthKm: 100,
    focus: { lat: 49, lng: 6, altitude: 0.9 },
    hint: "Italy is left out. Arrange the four remaining countries.",
    explanation:
      "Common cranes gather in great flocks at staging areas before continuing southwest. These stopovers break a long migration into a chain of places to rest and feed.",
    source: craneSource,
  },
  {
    id: "ruby-throated-hummingbird",
    title: "Across the Gulf",
    species: "Ruby-throated hummingbird",
    scientific: "Archilochus colubris",
    season: "Spring · the Americas",
    context:
      "Each spring, the tiny ruby-throated hummingbird leaves its tropical wintering grounds and travels north to breed. Some make an astonishing nonstop crossing over open water.",
    prompt:
      "Arrange four of these countries along its northbound spring migration. Leave one out.",
    countries: [
      ["GTM", "Guatemala"],
      ["MEX", "Mexico"],
      ["USA", "United States"],
      ["CAN", "Canada"],
    ],
    distractor: ["CUB", "Cuba"],
    points: [
      [-90.5, 15.5],
      [-90, 18],
      [-89, 21.5],
      [-90, 25],
      [-91, 29.5],
      [-87, 34],
      [-84, 39],
      [-80, 43],
      [-77, 46],
    ],
    halfWidthKm: 100,
    focus: { lat: 31, lng: -87, altitude: 1.05 },
    hint: "Cuba is left out. Arrange the four remaining countries.",
    explanation:
      "A ruby-throated hummingbird can cross the Gulf of Mexico in one nonstop flight. Others take the longer coastal or overland route: the same seasonal journey can have very different paths.",
    source: hummingbirdSource,
  },
  {
    id: "white-stork",
    title: "The Long Way Around",
    species: "White stork",
    scientific: "Ciconia ciconia",
    season: "Autumn · eastern Europe to Africa",
    context:
      "Instead of crossing the Mediterranean directly, many white storks follow a sweeping land-based detour, taking advantage of rising warm air.",
    prompt:
      "Arrange four of these countries along the eastern autumn flyway. Leave one out.",
    countries: [
      ["DEU", "Germany"],
      ["TUR", "Turkey"],
      ["EGY", "Egypt"],
      ["KEN", "Kenya"],
    ],
    distractor: ["ESP", "Spain"],
    points: [
      [12, 52],
      [17, 48],
      [23, 43],
      [28.9, 41.1],
      [30, 40],
      [33, 37.5],
      [36, 36.5],
      [36, 33],
      [35, 31],
      [34.5, 29.5],
      [33, 28.5],
      [32, 27],
      [32, 24],
      [33, 19],
      [33, 15],
      [32, 10],
      [32, 5],
      [32, 1],
      [35, -0.5],
      [36, -2],
    ],
    halfWidthKm: 80,
    focus: { lat: 26, lng: 25, altitude: 1.65 },
    hint: "Spain is left out. Arrange the four remaining countries.",
    explanation:
      "Rising warm air lets white storks gain height without constant flapping. Following land and narrow sea crossings helps these soaring birds conserve energy over a long migration.",
    source: storkSource,
  },
  {
    id: "amur-falcon",
    title: "An Ocean Between",
    species: "Amur falcon",
    scientific: "Falco amurensis",
    season: "Autumn · Asia to Africa",
    context:
      "Amur falcons leave northeastern Asia, gather in enormous numbers on the Indian subcontinent, and then embark on an extraordinary ocean crossing toward Africa.",
    prompt:
      "Arrange four of these countries along their autumn migration. Leave one out.",
    countries: [
      ["CHN", "China"],
      ["IND", "India"],
      ["SOM", "Somalia"],
      ["ZAF", "South Africa"],
    ],
    distractor: ["MDG", "Madagascar"],
    points: [
      [123, 47],
      [119, 41],
      [112, 33],
      [104, 29],
      [97, 25],
      [94, 26],
      [93, 24.8],
      [88, 23],
      [80, 20],
      [73, 16],
      [65, 12],
      [56, 7],
      [49, 5],
      [46, 4],
      [43, 1],
      [40, -5],
      [34, -14],
      [29, -23],
      [28, -28],
    ],
    halfWidthKm: 140,
    focus: { lat: 13, lng: 73, altitude: 2.65 },
    hint: "Madagascar is left out. Arrange the four remaining countries.",
    explanation:
      "An open ocean offers nowhere to perch. Amur falcons make an extraordinary nonstop crossing of the Arabian Sea before continuing across the African mainland.",
    source: falconSource,
  },
  {
    id: "bar-headed-goose",
    title: "Above the Clouds",
    species: "Bar-headed goose",
    scientific: "Anser indicus",
    season: "Autumn · the eastern Himalayas",
    context:
      "As colder weather approaches, bar-headed geese leave Central Asian breeding grounds and travel south across one of Earth’s most formidable mountain systems.",
    prompt:
      "Arrange four of these countries along a representative southbound migration. Leave one out.",
    countries: [
      ["MNG", "Mongolia"],
      ["CHN", "China"],
      ["BTN", "Bhutan"],
      ["IND", "India"],
    ],
    distractor: ["MMR", "Myanmar"],
    points: [
      [99.6, 48.1],
      [99, 43],
      [96, 37],
      [92, 32],
      [89.8, 29.7],
      [90.1, 28.5],
      [90.2, 27.4],
      [90.3, 26.3],
    ],
    halfWidthKm: 55,
    focus: { lat: 37, lng: 95, altitude: 0.93 },
    hint: "Myanmar is left out. Arrange the four remaining countries.",
    explanation:
      "Thin, cold air makes high-altitude flight demanding. Bar-headed geese often follow valleys and lower passes through the Himalayas, rather than flying above the highest summits.",
    source: gooseSource,
  },
];

// Interpolate all researched waypoints with continuous tangents, then normalize
// back onto the sphere. Centripetal knots avoid loops around closely spaced stops.
function migrationPath(migration: Migration): number[][] {
  const radians = Math.PI / 180;
  const curve = new CatmullRomCurve3(
    migration.points.map(
      ([lng, lat]) =>
        new Vector3(
          Math.cos(lat * radians) * Math.sin(lng * radians),
          Math.sin(lat * radians),
          Math.cos(lat * radians) * Math.cos(lng * radians),
        ),
    ),
    false,
    "centripetal",
  );
  const result: number[][] = [migration.points[0]];
  for (let index = 0; index < migration.points.length - 1; index++) {
    const steps = Math.max(
      8,
      Math.ceil(
        (geoDistance(migration.points[index], migration.points[index + 1]) *
          EARTH_KM) /
          35,
      ),
    );
    for (let step = 1; step <= steps; step++) {
      const p = curve
        .getPoint((index + step / steps) / (migration.points.length - 1))
        .normalize();
      result.push([Math.atan2(p.x, p.z) / radians, Math.asin(p.y) / radians]);
    }
  }
  return result;
}
const paths = new Map(migrations.map((m) => [m.id, migrationPath(m)]));

// Nested translucent ribbons feather the boundary using the existing physical
// layer. Widths describe illustrations, never measured population distributions.
function corridor(
  migration: Migration,
  scale: number,
  opacity: number,
  band: number,
): PhysicalFeature {
  const points = paths.get(migration.id)!;
  const radius = (migration.halfWidthKm * scale) / EARTH_KM;
  const sides = [-90, 90].map((offset) =>
    points.map(([lng, lat], i) => {
      const a = points[Math.max(0, i - 1)],
        b = points[Math.min(points.length - 1, i + 1)];
      const bearing = initialBearing(
        { lng: a[0], lat: a[1] },
        { lng: b[0], lat: b[1] },
      );
      const p = pointAlongBearing({ lng, lat }, bearing + offset, radius);
      return [p.lng, p.lat];
    }),
  );
  const cap = (p: number[], bearing: number) =>
    Array.from({ length: 33 }, (_, index) => {
      const q = pointAlongBearing(
        { lng: p[0], lat: p[1] },
        bearing + (index * 180) / 32,
        radius,
      );
      return [q.lng, q.lat];
    });
  const first = points[0],
    next = points[1],
    last = points.at(-1)!,
    previous = points.at(-2)!;
  const startHeading = initialBearing(
    { lng: first[0], lat: first[1] },
    { lng: next[0], lat: next[1] },
  );
  const endHeading =
    initialBearing(
      { lng: last[0], lat: last[1] },
      { lng: previous[0], lat: previous[1] },
    ) + 180;
  const ring = [
    ...sides[0],
    ...cap(last, endHeading - 90),
    ...sides[1].reverse(),
    ...cap(first, startHeading + 90),
    sides[0][0],
  ];
  const geometry = { type: "Polygon" as const, coordinates: [ring] };
  if (geoArea(geometry) > 2 * Math.PI) ring.reverse();
  return {
    id: `bird-corridor:${migration.id}:${band}`,
    name: "",
    kind: "landform",
    rank: 1,
    lat: migration.focus.lat,
    lng: migration.focus.lng,
    geometry,
    fillOpacity: opacity,
    lineOpacity: 0,
    lineWidth: 0,
  };
}

const direction = (
  migration: Migration,
  animate: boolean,
): Extract<MapOverlay, { type: "path" }> => ({
  id: `bird-direction:${migration.id}`,
  type: "path",
  coordinates: paths.get(migration.id)!,
  visualState: animate ? "answer" : "visited",
  arrowhead: true,
  ...(animate ? { reveal: { durationMs: 3400, delayMs: 300 } } : {}),
});
const common = definePresentation({
  topic: "Bird migrations",
  instruction: "",
  failure: "feedback",
  correctFeedback: "Well ordered.",
  feedbackReview: "compact",
  disclosure: {
    hoverNames: false,
    namedChoices: true,
    committedNames: false,
    previousVisits: false,
  },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    selectionFeedback: "after-submit",
    revealOrder: { stepMs: 850, durationMs: 400 },
  },
});
const corridors = migrations.map((m) =>
  [
    [1.3, 0.012],
    [1.22, 0.02],
    [1.14, 0.026],
    [1.06, 0.032],
    [0.98, 0.038],
    [0.9, 0.045],
    [0.82, 0.05],
    [0.74, 0.055],
  ].map(([width, opacity], band) => corridor(m, width, opacity, band)),
);

export const IM_LIKE_A_BIRD_JOURNEY: Journey = {
  id: "im-like-a-bird-v1",
  addedAt: "2026-11-02",
  saveRevision: 1,
  title: "I’m Like a Bird",
  description:
    "Follow five extraordinary bird migrations across seas, continents and mountains.",
  rounds: migrations.map((migration, index) => {
    const ids = migration.countries.map(([code]) => `wurl:${code}`);
    const photo = media[migration.id];
    return defineQuestion({
      ...common,
      id: `im-like-a-bird-${migration.id}-v1`,
      label: migration.title,
      title: migration.title,
      resolvedLabel: migration.species,
      leadIn: migration.context,
      prompt: migration.prompt,
      mode: "choice-order",
      count: 4,
      selection: { type: "none" },
      commitment: "submit",
      rule: { type: "country-ids", ids, ordered: true },
      choices: [...migration.countries, migration.distractor].map(
        ([code, label]) => ({ id: `wurl:${code}`, label }),
      ),
      shuffleChoices: true,
      orderInitial: [ids[2], `wurl:${migration.distractor[0]}`, ids[0], ids[3]],
      orderLabels: ["First", "Second", "Third", "Fourth"],
      orderAsideLabel: "Leave out",
      image: {
        src: photo.src,
        alt: photo.alt,
        feedbackAlt: photo.alt,
        presentation: "photo",
      },
      feedbackImage: {
        ...photo,
        caption: `${migration.species} (${migration.scientific}).`,
      },
      guidance: {
        hint: migration.hint,
        hintAsideId: `wurl:${migration.distractor[0]}`,
        assist: {
          text: `${migration.countries[0][1]} is locked in the first position. Order the remaining three countries.`,
          fixedSlots: [{ index: 0, id: ids[0] }],
        },
      },
      explanation: migration.explanation,
      qualification:
        "The shaded corridor and animated line are research-informed illustrations, not GPS tracks or seasonal ranges. Order the four featured countries; other countries along the way are omitted. The unused country is outside this selected corridor, not necessarily outside the species’ range.",
      mapCaption: migration.season,
      feedbackMapCaption: migration.season,
      scenes: {
        play: {
          focus: migration.focus,
          physicalFeatures: corridors[index],
          contextIds: [],
          places: [],
          overlays: [
            {
              ...direction(migration, false),
              id: `bird-flow:${migration.id}`,
              visualState: "hinted",
              arrowhead: false,
              opacity: 0,
              flow: { durationMs: 18000, count: 6, opacity: 1, size: 1.8 },
            },
          ],
        },
        reveal: {
          focus: migration.focus,
          overlays: [direction(migration, true)],
        },
      },
      source: migration.source,
      sources: [
        source(
          `${migration.species} · photograph and reuse license`,
          photo.credit.url,
        ),
      ],
    });
  }),
  completion: {
    mapMode: "authored",
    focus: { lat: 20, lng: 30, altitude: 2.8 },
    regionIds: [
      ...new Set(
        migrations.flatMap((m) => m.countries.map(([code]) => `wurl:${code}`)),
      ),
    ],
    views: migrations.map((m) => m.focus),
    physicalFeatures: corridors.flat(),
    overlays: migrations.map((m) => direction(m, false)),
    places: [],
    borders: true,
    mapCaption: "Five migrations shaped by land, water and seasons",
    caption:
      "Seasons set these birds in motion, but land, water, winds and mountain passes shape their journeys. Some cross open seas; others follow land to find rising air. Political borders help us describe these movements. They do not determine where the birds fly.",
    mapAttribution: {
      label: "Migration research and image credits",
      url: notes.url,
    },
  },
};
