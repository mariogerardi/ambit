import { definePresentation, defineQuestion } from "./questionBuilder";
import { cityReference, areaLabel, explanationPlace } from "./authoredPlaces";
import { ANSWER_PLACES } from "./answerTargets";
import type { FactSource, Journey, Question } from "./questionContracts";
import type {
  MapOverlay,
  PlaceFeature,
  RegionFeature,
} from "../geography/types";
import provinceData from "./data/made-in-china-provinces.v1.json";
import geography from "./data/made-in-china-context.v1.json";
import media from "./data/made-in-china-media.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-26",
});
const photo = (
  key: keyof typeof media,
): NonNullable<Question["feedbackImage"]> => {
  const { src, alt, caption, credit } = media[key];
  return { src, alt, caption, credit };
};
const clue = (key: keyof typeof media): NonNullable<Question["image"]> => ({
  src: media[key].src,
  alt: media[key].alt,
  feedbackAlt: media[key].alt,
  presentation: "photo",
});
const city = (id: string) => cityReference(ANSWER_PLACES.get(`place:${id}`)!);
const xian = city("1790630"),
  chengdu = city("1815286"),
  guangzhou = city("1809858");
const jingdezhen = city("1805680"),
  shanghai = city("1796236"),
  nanjing = city("1799962"),
  ningbo = city("1799397");
const shenzhen = city("1795565"),
  dongguan = city("1812545"),
  huizhou = city("1806776");
const hongKong = cityReference({
  id: "place:1819729",
  name: "Hong Kong",
  kind: "city",
  parentId: "wurl:HKG",
  lat: 22.27832,
  lng: 114.17469,
  sourceId: "geonames:1819729",
});
const label = (id: string, name: string, lat: number, lng: number) =>
  areaLabel({
    id: `made-in-china:${id}`,
    name,
    kind: "other",
    lat,
    lng,
    sourceId: "made-in-china:context",
    visualState: "hinted",
    priority: 85,
  });
const locations = source(
  "GeoNames · populated-place coordinates",
  "https://www.geonames.org/",
);
const terrainSource = source(
  "NASA · Blue Marble shaded relief via GIBS",
  "https://earthobservatory.nasa.gov/features/BlueMarble",
);
const named = {
  hoverNames: true,
  namedChoices: true,
  committedNames: true,
  previousVisits: false,
};
const common = definePresentation({
  topic: "Why here?",
  instruction: "",
  failure: "feedback",
  disclosure: named,
  map: { borders: true, hoverFeedback: false, muteOthers: true },
});
const citySelection = (places: PlaceFeature[]) => ({
  type: "ids" as const,
  ids: places.map((p) => p.id),
});
const jiangxi = (provinceData as RegionFeature[]).find(
  (p) => p.id === "wurl:CHN-JX",
)!;
const estuary: MapOverlay = {
  id: "made-in-china:yangtze-estuary",
  type: "raster-patch",
  foreground: true,
  assetUrl: geography.provenance.estuary.src,
  bounds: geography.provenance.estuary.bounds as [
    number,
    number,
    number,
    number,
  ],
  opacity: 1,
};
// Terrain supplies a clue, never an answer surface. These are three discrete sites.
const fortSites: PlaceFeature[] = [
  {
    id: "made-in-china:fort-north",
    name: "Site A",
    kind: "landmark" as const,
    lat: 39.99,
    lng: 98.0,
    sourceId: "made-in-china:candidate",
  },
  {
    id: "landmark:jiayuguan",
    name: "Jiayuguan",
    kind: "landmark" as const,
    lat: 39.802,
    lng: 98.217,
    sourceId: "unesco:jiayuguan",
  },
  {
    id: "made-in-china:fort-south",
    name: "Site C",
    kind: "landmark" as const,
    lat: 39.43,
    lng: 98.05,
    sourceId: "made-in-china:candidate",
  },
].map((p, i) => ({
  ...p,
  parentId: "wurl:CHN",
  markerSize: 24,
  priority: 90,
  markerBadge: "ABC"[i],
  visualState: "hinted",
  displayRole: "reference",
  labelFlexible: true,
}));
const fort = { ...fortSites[1], name: "Jiayuguan · the mountain gateway" };
const terrain: MapOverlay = {
  id: "made-in-china:jiayuguan-terrain",
  type: "raster-patch",
  foreground: true,
  assetUrl: "/journeys/made-in-china/jiayuguan-terrain.v1.jpg",
  bounds: [96.4, 38.8, 100.0, 40.7],
  opacity: 1,
};
const mountains = [
  label("heishan", "Heishan Mountains", 40.12, 98.12),
  label("qilian", "Qilian Mountains", 39.34, 98.38),
];
const coastalCities = [nanjing, shanghai, ningbo];
const factoryCities = [dongguan, shenzhen, huizhou];
const anonymousFactories = factoryCities.map((p, i) => ({
  ...p,
  name: p.name,
  markerBadge: "ABC"[i],
}));

export const MADE_IN_CHINA_JOURNEY: Journey = {
  id: "made-in-china-v1",
  addedAt: "2026-10-26",
  saveRevision: 2,
  legacyRoundLabels: {
    "made-in-china-country-of-kitchens-v1": "Chengdu, Guangzhou & Xi’an",
    "made-in-china-blue-and-white-v1": "Jingdezhen",
    "made-in-china-wall-not-border-v1": "Gansu, Hebei & Shanxi",
    "made-in-china-four-frames-v1": "Architecture",
    "made-in-china-city-reinvented-v1": "Shenzhen",
  },
  title: "Made in China",
  description:
    "From wheat noodles to a new metropolis: why did people make these things here?",
  rounds: [
    defineQuestion({
      ...common,
      id: "made-in-china-country-of-kitchens-v1",
      label: "A bowl of wheat",
      title: "A Bowl of Wheat",
      resolvedLabel: "Xi’an · wheat noodles",
      leadIn:
        "These broad noodles are made from wheat, the traditional staple of northern China.",
      prompt: "Which marked city is their most likely home?",
      mode: "city-single",
      count: 1,
      selection: citySelection([chengdu, guangzhou, xian]),
      commitment: "submit",
      rule: { type: "place-ids", ids: [xian.id] },
      image: clue("noodles"),
      feedbackImage: photo("noodles"),
      guidance: {
        hint: "Compare the cities’ positions. Rice has traditionally been the main staple farther south.",
        assist: {
          text: "Guangzhou, the farthest south, is ruled out. Compare Xi’an and Chengdu.",
          candidateIds: [xian.id, chengdu.id],
        },
      },
      explanation:
        "Xi’an’s biangbiang noodles belong to Shaanxi’s wheat-based cooking. Farther south, rice plays a larger role in everyday meals. Climate and farming helped shape regional kitchens; there has never been just one Chinese cuisine. Our next makers needed ingredients from the earth, too.",
      qualification:
        "Wheat in the north and rice in the south describe broad staple-food traditions, not exclusive growing areas or a precise boundary.",
      scenes: {
        play: {
          focus: { lat: 30.4, lng: 109.2, altitude: 0.58 },
          contextIds: ["wurl:CHN"],
          places: [chengdu, guangzhou, xian],
        },
        reveal: {
          focus: { lat: 31, lng: 109.2, altitude: 0.62 },
          places: [
            chengdu,
            guangzhou,
            { ...xian, name: "Xi’an · biangbiang noodles" },
          ],
        },
      },
      source: source(
        "FAO · regional staple-food patterns",
        "https://www.fao.org/4/J0962e/J0962e00.htm",
      ),
      sources: [
        source(
          "Xi’an local standard · biangbiang noodles",
          "https://std.samr.gov.cn/db/search/stdDBDetailed?id=0DA2AA7B7EC733EEE06397BE0A0A8797",
        ),
        locations,
      ],
    }),
    defineQuestion({
      ...common,
      id: "made-in-china-blue-and-white-v1",
      label: "A place for porcelain",
      title: "A Place for Porcelain",
      resolvedLabel: "Jingdezhen · clay, fuel and rivers",
      leadIn:
        "Jingdezhen’s kilns made porcelain for distant markets, far from the coast.",
      prompt: "Which combination would help an inland workshop city thrive?",
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: { type: "choice-ids", ids: ["clay-wood-water"] },
      choices: [
        { id: "sea-imports", label: "A deep-sea harbor and imported clay" },
        {
          id: "clay-wood-water",
          label: "Local clay, wood for kilns, and river transport",
        },
        {
          id: "dry-caravans",
          label: "Dry grassland and overland camel routes",
        },
      ],
      image: clue("porcelain"),
      feedbackImage: photo("kiln"),
      importedRegions: [jiangxi],
      guidance: {
        hint: "Think about what a kiln consumes, then how heavy, fragile pots could reach buyers.",
        assist: {
          text: "Jiangxi is highlighted. This is a humid, river-connected part of inland China, rather than a dry caravan landscape.",
          candidateIds: ["sea-imports", "clay-wood-water"],
          regionIds: [jiangxi.id],
          places: [label("jiangxi", "Jiangxi", 27.4, 115.5)],
        },
      },
      explanation:
        "Nearby kaolin and porcelain stone supplied the materials; surrounding forests supplied wood for the kilns. The Chang River connected the workshops to a wider waterway network. Skilled craftspeople turned those advantages into porcelain for imperial courts and overseas buyers. Location helped make an inland city a workshop for the world.",
      scenes: {
        play: {
          focus: { lat: 29.7, lng: 118.9, altitude: 0.37 },
          contextIds: ["wurl:CHN"],
          places: [
            explanationPlace(jingdezhen),
            label("east-china-sea", "East China Sea", 28.7, 123.7),
          ],
        },
        reveal: {
          contextIds: ["wurl:CHN", jiangxi.id],
          places: [explanationPlace(jingdezhen)],
        },
      },
      source: source(
        "UNESCO · Jingdezhen porcelain industry sites",
        "https://whc.unesco.org/en/list/1765/",
      ),
      sources: [
        source(
          "Smithsonian · Jingdezhen materials and trade",
          "https://publications.asia.si.edu/seaceramics/place/location.php?group=7&key=102",
        ),
        source(
          "Smithsonian Folklife Festival · porcelain and kiln fuel",
          "https://festival.si.edu/2014/china/from-the-land/porcelain/smithsonian",
        ),
        source(
          "UNESCO · Jingdezhen water transport and industrial landscape",
          "https://whc.unesco.org/document/226090",
        ),
        locations,
      ],
    }),
    defineQuestion({
      ...common,
      id: "made-in-china-wall-not-border-v1",
      label: "Guard the gap",
      disclosure: {
        ...named,
        namedChoices: false,
        hoverNames: false,
        committedNames: false,
      },
      title: "Guard the Gap",
      resolvedLabel: "Jiayuguan · a mountain gateway",
      leadIn:
        "Travelers crossing this dry landscape must pass between mountains to the north and south.",
      prompt: "Which site would let a fort guard the gap?",
      mode: "city-single",
      count: 1,
      selection: citySelection(fortSites),
      commitment: "submit",
      rule: { type: "place-ids", ids: [fort.id] },
      feedbackImage: photo("jiayuguan"),
      guidance: {
        hint: "A fort should watch the usable passage, rather than stand deep in the mountains.",
        assist: {
          text: "The southern mountain site is ruled out. Look for the low ground between the two ranges.",
          candidateIds: [fortSites[0].id, fort.id],
        },
      },
      explanation:
        "This is Jiayuguan, a fortified gateway of the Ming Great Wall. The Heishan Mountains to the north and the Qilian Mountains to the south narrow the passage. Walls and a fort helped control movement through it. The Great Wall was a changing network of defenses, often shaped by terrain, rather than a line along today’s national border.",
      qualification:
        "Site B marks Jiayuguan Fort approximately. Sites A and C are comparison locations, not proposed historical fort sites. The terrain image shows the modern landscape, not a reconstruction of the wall or a historical road.",
      feedbackMapCaption:
        "Jiayuguan guards the low passage between the Heishan and Qilian mountains.",
      scenes: {
        play: {
          focus: { lat: 40.0, lng: 98.2, altitude: 0.04 },
          contextIds: ["wurl:CHN"],
          places: [...fortSites, ...mountains],
          overlays: [terrain],
        },
        reveal: {
          places: [
            { ...fortSites[0], name: "A · northern mountains" },
            fort,
            { ...fortSites[2], name: "C · southern mountains" },
            ...mountains,
          ],
        },
      },
      source: source(
        "UNESCO · Jiayuguan Pass and its mountain setting",
        "https://whc.unesco.org/document/162535",
      ),
      sources: [
        source(
          "UNESCO · the Great Wall",
          "https://whc.unesco.org/en/list/438/",
        ),
        terrainSource,
      ],
    }),
    defineQuestion({
      ...common,
      id: "made-in-china-four-frames-v1",
      label: "A trading gateway",
      title: "A Trading Gateway",
      resolvedLabel: "Shanghai · river meets sea",
      leadIn:
        "This Customs House watched over a trading port. Its city links the Yangtze’s inland markets with the sea.",
      prompt: "Which marked city fits that setting?",
      mode: "city-single",
      count: 1,
      selection: citySelection(coastalCities),
      commitment: "submit",
      rule: { type: "place-ids", ids: [shanghai.id] },
      image: {
        ...clue("customs-house"),
        alt: "A stone Customs House with a tall clock tower, beside other waterfront buildings.",
      },
      feedbackImage: photo("customs-house"),
      guidance: {
        hint: "Nanjing is farther upriver. Ningbo is coastal, but south of the Yangtze’s mouth.",
        assist: {
          text: "Ningbo is ruled out. Follow the Yangtze toward the coast, rather than farther inland.",
          candidateIds: [nanjing.id, shanghai.id],
        },
      },
      explanation:
        "Shanghai sits near the Yangtze’s mouth. Its Bund waterfront faces the Huangpu, which joins the Yangtze estuary. The Customs House, completed in 1927, reflects the work of a trading gateway: connecting inland production with ocean shipping. A city’s connections can matter as much as the resources beside it.",
      qualification:
        "The satellite composite shows the modern river and estuary, not a historical port map. Shanghai’s marker is its city center, not the Customs House itself. This stop illustrates a port’s role, rather than claiming a single porcelain export route from Jingdezhen.",
      scenes: {
        play: {
          focus: { lat: 31.3, lng: 120.9, altitude: 0.095 },
          contextIds: ["wurl:CHN"],
          places: [
            ...coastalCities,
            label("yangtze", "Yangtze River", 31.95, 119.6),
            label("estuary", "Yangtze estuary", 31.72, 121.5),
            label("sea", "East China Sea", 30.1, 123.5),
          ],
          overlays: [estuary],
        },
        reveal: {
          places: [
            ...coastalCities,
            label("yangtze", "Yangtze River", 31.95, 119.6),
            label("estuary", "Yangtze estuary", 31.72, 121.5),
            label("sea", "East China Sea", 30.1, 123.5),
          ],
        },
      },
      source: source(
        "Shanghai government · geographic setting",
        "https://english.shanghai.gov.cn/en-Overview/20231209/705180b43f794c1ca43f4d1ddaa049a2.html",
      ),
      sources: [
        source(
          "Shanghai government · Customs House completed in 1927",
          "https://touch.shio.gov.cn/jsp/zfxw_detail.jsp?id=20250929181837586",
        ),
        terrainSource,
        locations,
      ],
    }),
    defineQuestion({
      ...common,
      id: "made-in-china-city-reinvented-v1",
      label: "A new connection",
      disclosure: {
        ...named,
        namedChoices: false,
        hoverNames: false,
        committedNames: false,
      },
      title: "A New Connection",
      resolvedLabel: "Shenzhen · beside Hong Kong",
      leadIn:
        "In 1980, China chose a new special economic zone beside Hong Kong, an established center of trade and investment.",
      prompt: "Which site lies immediately across Hong Kong’s land boundary?",
      mode: "city-single",
      count: 1,
      selection: citySelection(anonymousFactories),
      commitment: "submit",
      rule: { type: "place-ids", ids: [shenzhen.id] },
      feedbackImage: photo("shenzhen-early"),
      feedbackImages: [photo("shenzhen-now")],
      guidance: {
        hint: "Look directly north of Hong Kong, on the same side of the Pearl River estuary.",
        assist: {
          text: "The eastern site is ruled out. Choose the remaining site closest to Hong Kong’s northern boundary.",
          candidateIds: [dongguan.id, shenzhen.id],
        },
      },
      explanation:
        "Shenzhen’s position beside Hong Kong helped connect its new factories with investment, business experience, and world markets. Policy, migration, and work transformed the city over the following decades. The photographs show Shenzhen in 1982 and its Futian skyline in 2025: a new manufacturing connection became a metropolis.",
      qualification:
        "The photographs show different viewpoints, not a precisely aligned repeat view. Shenzhen already had settlements and economic activity before 1980; the comparison does not depict an empty landscape becoming a city.",
      scenes: {
        play: {
          focus: { lat: 22.7, lng: 114.05, altitude: 0.11 },
          contextIds: ["wurl:CHN", "wurl:HKG"],
          places: [...anonymousFactories, hongKong],
        },
        reveal: {
          places: [...factoryCities, hongKong],
          focus: { lat: 22.7, lng: 114.05, altitude: 0.11 },
        },
      },
      source: source(
        "World Bank · China’s special economic zones and Hong Kong connections",
        "https://documents1.worldbank.org/curated/en/310891468018256346/pdf/WPS5583.pdf",
      ),
      sources: [
        source(
          "Shenzhen government · special economic zone established in 1980",
          "https://www.sz.gov.cn/en_szgov/news/latest/content/post_8174716.html",
        ),
        locations,
      ],
    }),
  ],
  completion: {
    mapMode: "authored",
    answerReviews: true,
    focus: { lat: 33, lng: 110, altitude: 0.95 },
    regionIds: [],
    views: [
      { lat: 34.3, lng: 108.9, altitude: 0.3 },
      { lat: 29.3, lng: 117.2, altitude: 0.3 },
      { lat: 39.8, lng: 98.2, altitude: 0.2 },
      { lat: 31.2, lng: 121.5, altitude: 0.3 },
      { lat: 22.7, lng: 114.05, altitude: 0.11 },
    ],
    loopViews: false,
    places: [
      { ...xian, name: "Xi’an · wheat and noodles" },
      { ...jingdezhen, name: "Jingdezhen · porcelain workshops" },
      fort,
      { ...shanghai, name: "Shanghai · trading gateway" },
      { ...shenzhen, name: "Shenzhen · new connections" },
    ].map((p) => ({
      ...p,
      visualState: "visited",
      markerBadge: undefined,
      answerTarget: false,
    })),
    physicalFeatures: [],
    mapCaption:
      "Food · materials · defended crossings · trading gateways · new connections",
    caption:
      "What people make depends partly on where they are. Wheat shaped a meal; clay, fuel, and water supported workshops; a mountain gap invited a fort. Rivers and neighboring markets opened new possibilities for whole cities. Geography offered advantages. People decided what to make of them.",
  },
};
