import { areaLabel, cityReference } from "./authoredPlaces";
import { ANSWER_PLACES } from "./answerTargets";
import { referenceLabel } from "./helpReferences";
import { definePresentation, defineQuestion } from "./questionBuilder";
import type { FactSource, Journey, Question } from "./questionContracts";
import type { PlaceFeature } from "../geography/types";
import rottnestGeometry from "./data/small-wonders-rottnest.v1.json";
import type { RegionFeature } from "../geography/types";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-25",
});
const city = (id: string) => cityReference(ANSWER_PLACES.get(id)!);
const quokkas = source(
  "Perth Zoo · quokkas and introduced predators",
  "https://perthzoo.wa.gov.au/animal/quokka",
);
const axolotls = source(
  "San Diego Zoo Wildlife Alliance · axolotl habitat",
  "https://animals.sandiegozoo.org/animals/axolotl",
);
const redPandas = source(
  "Red Panda Network · range and forest habitat",
  "https://redpandanetwork.org/red-panda-facts/",
);
const fennecs = source(
  "San Diego Zoo Wildlife Alliance · fennec fox adaptations",
  "https://animals.sandiegozoo.org/animals/fennec-fox",
);
const arcticFoxes = source(
  "Visit Greenland · Arctic foxes",
  "https://visitgreenland.com/articles/land-mammals/",
);
const penguins = source(
  "Galápagos Conservancy · penguins and cold ocean currents",
  "https://www.galapagos.org/about_galapagos/biodiversity/",
);
const galapagosLocation = source(
  "GeoNames · Galápagos island group",
  "https://www.geonames.org/3658931/galapagos-islands.html",
);

// Area-name anchors identify already supplied geography without inventing settlements.
const rottnest = areaLabel({
  id: "small-wonders:rottnest",
  name: "Rottnest Island",
  kind: "landform",
  lat: -32.00528,
  lng: 115.512497,
  sourceId: "geonames:2062194",
  visualState: "hinted",
});
const galapagos: PlaceFeature = {
  id: "small-wonders:galapagos",
  name: "Galápagos Islands",
  kind: "landform",
  lat: 0,
  lng: -90.5,
  sourceId: "geonames:3658931",
  labelFlexible: true,
  visualState: "answer",
};
// These are comparison locations in the two habitats, not claimed wildlife sightings.
const elOued = cityReference({
  id: "small-wonders:el-oued",
  name: "El Oued",
  kind: "city",
  parentId: "wurl:DZA",
  lat: 33.35608,
  lng: 6.863186,
  sourceId: "geonames:2497411",
});
const nuuk = cityReference({
  id: "place:3421319",
  name: "Nuuk",
  kind: "city",
  parentId: "wurl:GRL",
  lat: 64.18347,
  lng: -51.72157,
  sourceId: "geonames:3421319",
});
const equator = {
  id: "small-wonders:equator",
  type: "parallel" as const,
  latitude: 0,
};
const mexicoCity = city("place:3530597");
const mountainContext = [
  referenceLabel("India", 22, 79),
  referenceLabel("China", 35, 100),
];
const xochimilco = areaLabel({
  id: "small-wonders:xochimilco",
  name: "Xochimilco · canals and chinampas",
  kind: "landform",
  lat: 19.27761,
  lng: -99.11591,
  sourceId: "geonames:8379481",
  visualState: "hinted",
});
const rottnestRegion: RegionFeature = {
  id: "small-wonders:rottnest-island",
  name: "Rottnest Island",
  parentId: "wurl:AUS",
  level: "ADM1",
  geometry: rottnestGeometry as RegionFeature["geometry"],
  focus: { lat: rottnest.lat, lng: rottnest.lng },
  sourceId: "natural-earth:5.1.2:10m:AUS:rottnest",
};
const rottnestOutline = {
  id: "small-wonders:rottnest-coast",
  type: "path" as const,
  coordinates: rottnestGeometry.coordinates[0][0],
  visualState: "hinted" as const,
  surfaceAligned: true,
};
const arcticPhoto: NonNullable<Question["feedbackImage"]> = {
  src: "/journeys/small-wonders/arctic-fox.v1.jpg",
  alt: "A fluffy white Arctic fox sleeps curled up with its nose tucked into its bushy tail.",
  caption:
    "An Arctic fox at Silz wildlife park, Germany. Compact ears and thick fur help conserve warmth.",
  credit: {
    name: "Traroth",
    url: "https://commons.wikimedia.org/wiki/File:Silz_renardpolaire1.jpg",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
  },
};
const candidates = [
  "place:6173331", // Vancouver
  "place:5368361", // Los Angeles
  "place:3995465", // Monterrey
  mexicoCity.id,
  "place:3598132", // Guatemala City
  "place:3703443", // Panama City
];

function photo(
  name: string,
  alt: string,
  caption: string,
  credit: NonNullable<Question["feedbackImage"]>["credit"],
) {
  const src = `/journeys/small-wonders/${name}.v1.jpg`;
  return {
    image: { src, alt, feedbackAlt: alt, presentation: "photo" as const },
    feedbackImage: { src, alt, caption, credit },
  };
}
const common = definePresentation({
  topic: "wildlife habitats",
  instruction: "",
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
    revealOnAnswer: true,
    feedbackRegions: "neutral",
  },
});

export const SMALL_WONDERS_JOURNEY: Journey = {
  id: "small-wonders-v1",
  addedAt: "2026-10-25",
  saveRevision: 1,
  title: "Small Wonders",
  description: "Five adorable animals. Five extraordinary places to call home.",
  rounds: [
    defineQuestion({
      ...common,
      id: "small-wonders-quokka-refuge-v1",
      title: "An island refuge",
      label: "Quokka",
      resolvedLabel: "Quokka · Rottnest Island",
      leadIn:
        "Just off Australia’s west coast, Rottnest Island is a stronghold for the quokka.",
      prompt: "What makes this island an important refuge?",
      mode: "choice-single",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: { type: "choice-ids", ids: ["quokka:foxes"] },
      choices: [
        {
          id: "quokka:water",
          label: "Permanent freshwater pools across the island",
        },
        { id: "quokka:foxes", label: "The absence of introduced red foxes" },
        {
          id: "quokka:climate",
          label: "Cool summers without seasonal food shortages",
        },
        {
          id: "quokka:dingoes",
          label: "Dingoes keeping introduced foxes under control",
        },
      ],
      shuffleChoices: true,
      guidance: {
        hint: "Compare the risks facing mainland quokkas with the conditions on a nearby island.",
        assist: {
          text: "Two explanations remain. The nearby mainland coast is marked for comparison.",
          candidateIds: ["quokka:foxes", "quokka:water"],
          places: [city("place:2063523")],
        },
      },
      explanation:
        "Red foxes introduced to Australia helped drive quokka declines on the mainland. They haven’t reached Rottnest Island: the sea separating it from the coast makes a powerful barrier. Island life still brings dry summers and seasonal shortages. Quokkas also survive in scattered mainland habitats and on Bald Island.",
      importedRegions: [rottnestRegion],
      source: quokkas,
      sources: [
        source(
          "Natural Earth · Rottnest coastline",
          "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/",
        ),
        source(
          "GeoNames · Rottnest Island",
          "https://www.geonames.org/2062194/rottnest-island.html",
        ),
        source(
          "Rottnest Island Authority · quokkas",
          "https://www.rottnestisland.com/see-do/wildlife-nature/Quokkas",
        ),
        source(
          "Australian Government · quokka distribution",
          "https://www.dcceew.gov.au/environment/biodiversity/threatened/action-plan/quokka",
        ),
      ],
      ...photo(
        "quokka",
        "Two quokkas stand close together; the upright one has round eyes and tiny forepaws tucked against its chest.",
        "Two quokkas on Rottnest Island.",
        {
          name: "Nestek",
          url: "https://commons.wikimedia.org/wiki/File:Quokkas_Closeup.jpg",
          license: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        },
      ),
      scenes: {
        play: {
          focus: { lat: -32.02, lng: 115.7, altitude: 0.045 },
          contextIds: ["wurl:AUS", rottnestRegion.id],
          places: [rottnest],
        },
        reveal: {
          focus: { lat: -32.02, lng: 115.66, altitude: 0.018 },
          contextIds: ["wurl:AUS", rottnestRegion.id],
          places: [rottnest, city("place:2063523")],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "small-wonders-axolotl-city-v1",
      title: "A lake beneath a city",
      label: "Axolotl",
      resolvedLabel: "Axolotl · Mexico City",
      leadIn:
        "The axolotl’s wild home survives in canals left from an ancient lake system.",
      prompt: "Select the city where these waterways remain.",
      mode: "city-single",
      count: 1,
      commitment: "submit",
      selection: { type: "ids", ids: candidates },
      rule: { type: "place-ids", ids: [mexicoCity.id] },
      guidance: {
        hint: "Look inland, high above sea level. This city grew in a mountain-ringed basin rather than beside the sea.",
        assist: {
          text: "Three cities remain. Compare their positions: the old lake basin lies on a high plateau, well inland.",
          candidateIds: [mexicoCity.id, "place:3995465", "place:3598132"],
        },
      },
      explanation:
        "Mexico City grew within a basin of lakes. Wild axolotls survive in remnants of that watery landscape around Xochimilco, where canals weave between cultivated islands called chinampas. A vast city and a tiny amphibian share the same disappearing wetland.",
      source: axolotls,
      sources: [
        source(
          "GeoNames · Xochimilco",
          "https://www.geonames.org/8379481/xochimilco.html",
        ),
        source(
          "UNESCO · Mexico City and Xochimilco",
          "https://whc.unesco.org/en/list/412/",
        ),
      ],
      ...photo(
        "axolotl",
        "A pale pink axolotl rests on pebbles, with tiny toes, round eyes, and feathery rose-colored gills.",
        "A pale axolotl in an aquarium.",
        {
          name: "Amandasofiarana",
          url: "https://commons.wikimedia.org/wiki/File:Axolotl_ambystoma_mexicanum_anfibio_ASAG.jpg",
          license: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        },
      ),
      feedbackImages: [
        {
          src: "/journeys/small-wonders/xochimilco.v1.jpg",
          alt: "An aerial view of Xochimilco shows long canals between green cultivated plots, with the city beyond.",
          caption:
            "Xochimilco’s canals thread between chinampas in the wetlands south of central Mexico City.",
          credit: {
            name: "Gobierno CDMX",
            url: "https://commons.wikimedia.org/wiki/File:Sobrevuelos_CDMX_Xochimilco_(40385667161).jpg",
            license: "CC0 1.0",
            licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          },
        },
      ],
      scenes: {
        play: {
          focus: { lat: 29, lng: -101, altitude: 1.4 },
          places: candidates.map((id) => ({ ...city(id), labelHidden: true })),
        },
        reveal: {
          focus: { lat: 29, lng: -101, altitude: 1.4 },
          views: [
            { lat: 20.5, lng: -100, altitude: 0.65 },
            { lat: 29, lng: -101, altitude: 1.4 },
          ],
          places: [mexicoCity, xochimilco],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "small-wonders-red-panda-range-v1",
      title: "Bamboo in the mountains",
      label: "Red panda",
      resolvedLabel: "Red panda · Nepal & Bhutan",
      leadIn:
        "Below the Himalayan peaks, red pandas find bamboo in cool mountain forests.",
      prompt:
        "Select the two highlighted countries where red pandas live in the wild.",
      mode: "map-multiple",
      count: 2,
      commitment: "submit",
      selection: {
        type: "ids",
        ids: ["wurl:NPL", "wurl:BTN", "wurl:PAK", "wurl:TJK", "wurl:BGD"],
      },
      partialCredit: "one-of-two",
      rule: { type: "country-ids", ids: ["wurl:NPL", "wurl:BTN"] },
      guidance: {
        hint: "Think of forested slopes along India’s northern edge, rather than the drier mountain ranges farther west.",
        assist: {
          text: "Nepal is selected. Compare the remaining countries’ landscapes: look for cool mountain forests rather than dry uplands or lowland plains.",
          fixedSelections: ["wurl:NPL"],
        },
      },
      explanation:
        "Nepal and Bhutan both have the cool, bamboo-rich mountain forests red pandas need. They form part of a wider range that also includes India, Myanmar, and China. These animals live among the trees below the high, snowy summits.",
      source: redPandas,
      feedbackImages: [
        {
          src: "/journeys/small-wonders/red-panda-range.v1.png",
          alt: "A regional map shows a narrow red panda range across the Himalayas and into southwestern China and northern Myanmar, rather than covering entire countries.",
          caption:
            "This published range map follows the mountain forests. Suitable habitat occurs in patches within the band; country borders do not mark the edges of its habitat.",
          credit: {
            name: "BhagyaMani; base map © OpenStreetMap contributors",
            url: "https://commons.wikimedia.org/wiki/File:RedPanda_distribution.png",
            license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          },
        },
      ],
      ...photo(
        "red-panda",
        "A red panda balances on a tree branch, its long striped tail stretched behind it.",
        "A red panda photographed in a zoo. In the wild, forest cover and bamboo are essential.",
        {
          name: "Mathias Appel",
          url: "https://commons.wikimedia.org/wiki/File:Red_Panda_(24986761703).jpg",
          license: "CC0 1.0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
        },
      ),
      scenes: {
        play: {
          focus: { lat: 29, lng: 79, altitude: 0.72 },
          contextIds: [],
          candidateRegionIds: [
            "wurl:NPL",
            "wurl:BTN",
            "wurl:PAK",
            "wurl:TJK",
            "wurl:BGD",
          ],
          places: mountainContext,
          map: {
            candidates: "highlighted",
            hoverFeedback: true,
            feedbackRegions: undefined,
          },
        },
        reveal: {
          focus: { lat: 28, lng: 87, altitude: 0.55 },
          contextIds: [],
          places: [...mountainContext, referenceLabel("Myanmar", 22, 96)],
          answerIds: ["wurl:NPL", "wurl:BTN"],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "small-wonders-fox-bearing-v1",
      title: "Two foxes, two climates",
      label: "Fennec fox",
      resolvedLabel: "Fennec fox · Sahara to Greenland",
      leadIn:
        "Fennec foxes are at home in the Sahara; Arctic foxes thrive in Greenland.",
      prompt:
        "From El Oued in Algeria, set the starting compass bearing of the shortest path toward Nuuk, Greenland.",
      mode: "compass-bearing",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      disclosure: { ...common.disclosure!, bearingDestination: true },
      rule: {
        type: "bearing-angle",
        origin: elOued,
        destination: nuuk,
        tiers: [
          { degrees: 8, feedback: "Right on course." },
          { degrees: 18, feedback: "A close heading." },
          { degrees: 35, feedback: "Within range." },
        ],
      },
      guidance: {
        hint: "Nuuk lies both north and west of El Oued. On a globe, the shortest path bends toward the pole rather than following a fixed heading.",
        assist: {
          text: "The dial highlights west through north to northeast. Refine your starting direction using the two marked locations.",
          compassSector: { start: 270, end: 60 },
        },
      },
      explanation:
        "The shortest path starts north-northwest, then curves westward toward Greenland. Fennec foxes shed heat through their enormous ears; Arctic foxes conserve it with compact ears and dense fur. Two very different climates have shaped two very different foxes.",
      source: fennecs,
      sources: [
        arcticFoxes,
        source(
          "Alaska Department of Fish and Game · Arctic fox adaptations",
          "https://www.adfg.alaska.gov/static/education/educators/curricula/alaskawildlifecurriculum/pdfs/alaskas_tundra_wildlife_curriculum.pdf",
        ),
        source(
          "GeoNames · El Oued",
          "https://www.geonames.org/2497411/el-oued.html",
        ),
        source("GeoNames · Nuuk", "https://www.geonames.org/3421319/nuuk.html"),
      ],
      ...photo(
        "fennec",
        "Several sandy-colored fennec foxes curl together, their oversized ears standing upright.",
        "A fennec fox peers past its companions. Its large ears help release heat.",
        {
          name: "Anass ERRIHANI",
          url: "https://commons.wikimedia.org/wiki/File:Fennec_Fox_Peek.jpg",
          license: "CC BY-SA 4.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
        },
      ),
      image: {
        src: "/journeys/small-wonders/fennec.v1.jpg",
        alt: "Sandy-colored fennec foxes curl together, their enormous ears standing upright.",
        feedbackAlt: "Fennec foxes resting together.",
        presentation: "photo",
        context: { src: arcticPhoto.src, alt: arcticPhoto.alt },
      },
      feedbackImages: [arcticPhoto],
      scenes: {
        play: {
          focus: { lat: 49, lng: -20, altitude: 1.4 },
          contextIds: ["wurl:DZA", "wurl:GRL"],
        },
        reveal: {
          focus: { lat: 49, lng: -20, altitude: 1.4 },
          views: [
            { lat: 49, lng: -20, altitude: 1.4 },
            { lat: elOued.lat, lng: elOued.lng, altitude: 0.55 },
            { lat: nuuk.lat, lng: nuuk.lng, altitude: 0.55 },
          ],
          contextIds: ["wurl:DZA", "wurl:GRL"],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "small-wonders-equatorial-penguin-v1",
      title: "Penguins on the equator",
      label: "Penguin",
      resolvedLabel: "Penguin · Galápagos Islands",
      leadIn:
        "These penguins live on volcanic islands that straddle the equator.",
      prompt: "Place a pin as close to their island home as you can.",
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: {
        type: "pin-distance",
        targetId: galapagos.id,
        radiusKm: 450,
        tiers: [
          { radiusKm: 200, feedback: "Bullseye!" },
          { radiusKm: 300, feedback: "Very close." },
          { radiusKm: 450, feedback: "In range." },
        ],
      },
      visualExceptions: {
        "open-search-background":
          "The animal’s unnamed island home is a broad Pacific pin search; no answer footprint or island label is supplied before commitment.",
      },
      guidance: {
        hint: "Search the Pacific, west of South America. Cold ocean currents bring food to these islands despite the tropical sun.",
        assist: {
          text: "Guayaquil is now marked on Ecuador’s coast. Follow the equator west into the Pacific to find the islands.",
          focus: { lat: -1, lng: -88, altitude: 0.9 },
          places: [city("place:3657509")],
        },
      },
      explanation:
        "The Galápagos Islands are home to the world’s most northerly penguins. Cold, nutrient-rich currents keep fish within reach even at the equator. Most Galápagos penguins live around the western islands of Isabela and Fernandina, where cool water rises from the depths.",
      source: penguins,
      sources: [
        galapagosLocation,
        source(
          "Galápagos Conservancy · cold-water upwelling around Isabela",
          "https://www.galapagos.org/about_galapagos/the-islands/isabela-island/",
        ),
        source(
          "Galápagos Conservancy · Humboldt Current",
          "https://www.galapagos.org/wp-content/uploads/2023/12/galapagos-post-winter-2023-whl.pdf",
        ),
      ],
      feedbackMapCaption:
        "Arrows show broad current directions, not exact water tracks. The Cromwell Current flows below the surface and rises near the western islands.",
      ...photo(
        "penguin",
        "A small black-and-white penguin floats like a little boat in bright turquoise water, its flippers visible beneath the surface.",
        "A Galápagos penguin swimming off Isabela Island.",
        {
          name: "Charles J. Sharp",
          url: "https://commons.wikimedia.org/wiki/File:Gal%C3%A1pagos_penguin_(Spheniscus_mendiculus)_male.jpg",
          license: "CC BY-SA 3.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/",
        },
      ),
      scenes: {
        play: {
          focus: { lat: 5, lng: -110, altitude: 1.7 },
          places: [galapagos],
          overlays: [equator],
          map: { background: "open-search" },
        },
        reveal: {
          focus: { lat: -0.5, lng: -90.8, altitude: 0.4 },
          places: [galapagos],
          overlays: [
            {
              id: "small-wonders:cromwell-current",
              type: "path",
              foreground: true,
              coordinates: [
                [-96, 0.5],
                [-94, 0.5],
                [-91.5, 0.15],
              ],
              visualState: "hinted",
              dashed: true,
              arrowhead: true,
              label: "Cromwell Current · below the surface",
            },
            {
              id: "small-wonders:humboldt-current",
              type: "path",
              foreground: true,
              coordinates: [
                [-78, -10],
                [-80.5, -5],
                [-83, -2],
                [-87, -1],
                [-90, -1],
              ],
              visualState: "hinted",
              dashed: true,
              arrowhead: true,
              label: "Humboldt Current",
            },
          ],
        },
      },
    }),
  ],
  completion: {
    mapMode: "authored",
    mapCaption: "Small Wonders · a wildlife atlas",
    focus: { lat: -32.02, lng: 115.66, altitude: 0.025 },
    views: [
      { lat: -32.02, lng: 115.66, altitude: 0.025 },
      { lat: 20.5, lng: -100, altitude: 0.65 },
      { lat: 28, lng: 87, altitude: 0.65 },
      { lat: 49, lng: -20, altitude: 1.4 },
      { lat: -0.5, lng: -90.8, altitude: 0.5 },
    ],
    regionIds: ["wurl:NPL", "wurl:BTN"],
    physicalFeatures: [],
    overlays: [rottnestOutline],
    places: [
      {
        ...rottnest,
        name: "Quokka · Rottnest Island",
        visualState: "hinted",
        displayRole: "reference",
      },
      {
        ...mexicoCity,
        name: "Axolotl · Mexico City",
        visualState: "visited",
        displayRole: undefined,
      },
      {
        ...elOued,
        name: "Fennec fox · El Oued",
        visualState: "hinted",
        displayRole: "reference",
      },
      {
        ...nuuk,
        name: "Arctic fox · Nuuk",
        visualState: "visited",
        displayRole: undefined,
      },
      xochimilco,
      {
        ...areaLabel(galapagos),
        name: "Penguin · Galápagos Islands",
        visualState: "visited",
        displayRole: undefined,
      },
    ],
    photoResults: true,
    caption:
      "An island refuge, an urban wetland, bamboo forests, desert dunes, and equatorial shores: small animals make their homes in extraordinary places. Across the globe, geography shapes the shelter, food, and climate they depend on.",
  },
};
