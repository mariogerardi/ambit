import { definePresentation, defineQuestion } from "./questionBuilder";
import { cityReference, areaLabel } from "./authoredPlaces";
import { ANSWER_PLACES } from "./answerTargets";
import type { FactSource, Journey, Question } from "./questionContracts";
import type { PlaceFeature, RegionFeature } from "../geography/types";
import provinceData from "./data/made-in-china-provinces.v1.json";
import media from "./data/made-in-china-media.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-26",
});
const provinces = provinceData as RegionFeature[];
const province = (code: string) =>
  provinces.find((region) => region.id === `wurl:CHN-${code}`)!;
const photo = (
  key: keyof typeof media,
): NonNullable<Question["feedbackImage"]> => {
  const { src, alt, caption, credit } = media[key];
  return { src, alt, caption, credit };
};
const clue = (key: keyof typeof media): NonNullable<Question["image"]> => {
  const image = photo(key);
  return {
    src: image.src,
    alt: image.alt,
    feedbackAlt: image.alt,
    presentation: "photo",
  };
};
const city = (id: string) => cityReference(ANSWER_PLACES.get(`place:${id}`)!);
const chengdu = city("1815286"),
  guangzhou = city("1809858"),
  xian = city("1790630");
const jingdezhen = city("1805680"),
  shenzhen = city("1795565");
// Hong Kong's supplied center is outside all three Shenzhen acceptance bands.
const hongKong = cityReference({
  id: "place:1819729",
  name: "Hong Kong",
  kind: "city",
  parentId: "wurl:HKG",
  lat: 22.27832,
  lng: 114.17469,
  sourceId: "geonames:1819729",
});
const regionalSource = source(
  "Natural Earth · provincial boundaries (public domain)",
  "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
);
const wallSource = source(
  "UNESCO · Great Wall history and fortifications",
  "https://whc.unesco.org/en/list/438/",
);
const wallDistribution = source(
  "China State Administration of Cultural Heritage · Great Wall conservation plan",
  "https://whc.unesco.org/document/157507",
);
const locations = source(
  "GeoNames · populated-place coordinates",
  "https://www.geonames.org/",
);
const foods = [chengdu, guangzhou, xian];
const dishNames = ["Mapo tofu", "Dim sum", "Biangbiang noodles"];
const foodReveal = foods.map((place, index) => ({
  ...place,
  name: `${place.name} · ${dishNames[index]}`,
  answerTarget: true,
}));
const common = definePresentation({
  topic: "Chinese creations",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: { borders: true, hoverFeedback: false, muteOthers: true },
});
const provinceLabel = (code: string) => {
  const region = province(code);
  return areaLabel({
    id: `made-in-china:province-label:${code}`,
    name: region.name,
    kind: "other",
    lat: region.focus.lat,
    lng: region.focus.lng,
    sourceId: region.sourceId,
    visualState: "hinted",
    priority: 75,
  });
};
export const MADE_IN_CHINA_WALL_ANSWERS = ["GS", "HE", "SX"].map(
  (code) => province(code).id,
);
export const MADE_IN_CHINA_WALL_CANDIDATES = [
  "GS",
  "SC",
  "HE",
  "JS",
  "SX",
  "ZJ",
].map((code) => province(code).id);
export const MADE_IN_CHINA_WALL_REGIONS = [
  "BJ",
  "TJ",
  "HE",
  "SX",
  "NM",
  "LN",
  "JL",
  "HL",
  "SD",
  "HA",
  "SN",
  "GS",
  "QH",
  "NX",
  "XJ",
].map((code) => province(code).id);
const otherWallRegions = MADE_IN_CHINA_WALL_REGIONS.filter(
  (id) => !MADE_IN_CHINA_WALL_ANSWERS.includes(id),
);
const landmarks: PlaceFeature[] = [
  {
    id: "landmark:terracotta-army",
    name: "Terracotta Army · late 3rd century BCE",
    kind: "landmark",
    lat: 34.384,
    lng: 109.278,
    parentId: "wurl:CHN",
    sourceId: "made-in-china:terracotta",
    answerTarget: true,
    markerBadge: "1",
  },
  {
    id: "landmark:forbidden-city",
    name: "Forbidden City · 1420",
    kind: "landmark",
    lat: 39.9163,
    lng: 116.3972,
    parentId: "wurl:CHN",
    sourceId: "made-in-china:forbidden-city",
    answerTarget: true,
    markerBadge: "2",
  },
  {
    id: "landmark:shanghai-customs-house",
    name: "Shanghai Customs House · 1927",
    kind: "landmark",
    lat: 31.239,
    lng: 121.485,
    parentId: "wurl:CHN",
    sourceId: "made-in-china:customs-house",
    answerTarget: true,
    markerBadge: "3",
  },
  {
    id: "landmark:birds-nest",
    name: "Bird’s Nest · 2008",
    kind: "landmark",
    lat: 39.9928,
    lng: 116.3967,
    parentId: "wurl:CHN",
    sourceId: "made-in-china:birds-nest",
    answerTarget: true,
    markerBadge: "4",
  },
];
const chronology = defineQuestion({
  ...common,
  id: "made-in-china-four-frames-v1",
  label: "Architecture",
  title: "Four Frames of History",
  leadIn:
    "Across China’s long history, people have left remarkable structures behind. Some were made for emperors. Others reflected international commerce or a new vision of the future. Four photographs tell that story across more than two thousand years.",
  prompt: "Arrange these four Chinese landmarks from oldest to newest.",
  mode: "choice-order",
  count: 4,
  selection: { type: "none" },
  commitment: "submit",
  rule: {
    type: "choice-ids",
    ids: landmarks.map((place) => place.id),
    ordered: true,
  },
  choices: [
    {
      id: landmarks[2].id,
      label: "Shanghai Customs House · the Bund",
      image: photo("customs-house"),
    },
    {
      id: landmarks[3].id,
      label: "Bird’s Nest · Beijing National Stadium",
      image: photo("birds-nest"),
    },
    {
      id: landmarks[0].id,
      label: "Terracotta Army · near Xi’an",
      image: photo("terracotta"),
    },
    {
      id: landmarks[1].id,
      label: "Forbidden City · Beijing",
      image: photo("forbidden-city"),
    },
  ],
  orderLabels: ["Oldest", "Second", "Third", "Newest"],
  guidance: {
    hint: "Two of these places belong to imperial China. The other two reflect the twentieth and twenty-first centuries.",
    assist: {
      text: "The Terracotta Army is locked in the earliest position. Arrange the remaining three.",
      fixedSlots: [{ index: 0, id: landmarks[0].id }],
    },
  },
  correctFeedback: "Well ordered.",
  explanation:
    "An army of clay soldiers was buried for China’s first emperor in the late third century BCE. More than sixteen centuries later, the Forbidden City, completed in 1420, became the seat of imperial power in Beijing. Shanghai’s waterfront grew into a showcase of international commerce: its Customs House was completed in 1927. The Bird’s Nest, completed in 2008, became an architectural centerpiece of the Beijing Olympics. Four creations, four radically different moments in China’s history. And the country’s transformation didn’t stop with its most famous monuments. Farther south, another city was changing almost beyond recognition.",
  feedbackImages: [
    photo("terracotta"),
    photo("forbidden-city"),
    photo("customs-house"),
    photo("birds-nest"),
  ],
  scenes: {
    play: {
      focus: { lat: 35, lng: 113, altitude: 0.9 },
      contextIds: ["wurl:CHN"],
    },
    reveal: {
      focus: { lat: 35, lng: 115, altitude: 0.85 },
      contextIds: ["wurl:CHN"],
      places: landmarks,
      views: landmarks.map((place) => ({
        lat: place.lat,
        lng: place.lng,
        altitude: place.kind === "landmark" ? 0.16 : 0.4,
      })),
    },
  },
  source: source(
    "UNESCO · Mausoleum of the First Qin Emperor",
    "https://whc.unesco.org/en/list/441/",
  ),
  sources: [
    source(
      "Palace Museum · completed in 1420",
      "https://www.dpm.org.cn/subject_600/buildingdetails/253789.html",
    ),
    source(
      "Shanghai government · Customs House completed in 1927",
      "https://touch.shio.gov.cn/jsp/zfxw_detail.jsp?id=20250929181837586",
    ),
    source(
      "Beijing government · National Stadium",
      "https://english.beijing.gov.cn/beijing2022/venues/beijing/202103/t20210316_2308893.html",
    ),
  ],
});

// Deliberately absent from journeys.ts and journeyIndex.json until publication is authorized.
export const MADE_IN_CHINA_JOURNEY: Journey = {
  id: "made-in-china-v1",
  saveRevision: 1,
  title: "Made in China",
  description:
    "Five things people made. Five places with extraordinary stories.",
  rounds: [
    defineQuestion({
      ...common,
      id: "made-in-china-country-of-kitchens-v1",
      label: "Regional kitchens",
      title: "A Country of Kitchens",
      resolvedLabel: "Chengdu, Guangzhou & Xi’an",
      leadIn:
        "China has given the world countless things to taste, admire, and wonder at. First, something familiar: food. But there is no single Chinese cuisine. Across this enormous country, regional kitchens have developed flavors and traditions all their own.",
      prompt: "Match these three dishes to the cities that made them famous.",
      mode: "choice-match",
      count: 3,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "slot-matches",
        matches: [
          { slotId: "mapo", choiceId: chengdu.id },
          { slotId: "dim-sum", choiceId: guangzhou.id },
          { slotId: "noodles", choiceId: xian.id },
        ],
      },
      choices: [guangzhou, xian, chengdu].map((place) => ({
        id: place.id,
        label: place.name,
      })),
      orderAsideLabel: "Cities",
      matchSlots: [
        { id: "mapo", label: "Mapo tofu", image: photo("mapo") },
        { id: "dim-sum", label: "Dim sum", image: photo("dim-sum") },
        { id: "noodles", label: "Biangbiang noodles", image: photo("noodles") },
      ],
      guidance: {
        hint: "One city is famous for Sichuan’s fiery cooking. Another is a center of Cantonese cuisine, while the third is known for the hearty wheat noodles of Shaanxi.",
        assist: {
          text: "Chengdu is matched to mapo tofu. Complete the remaining two associations.",
          fixedSlots: [{ index: 0, id: chengdu.id }],
        },
      },
      correctFeedback: "Well matched.",
      explanation:
        "From Sichuan’s famously fiery cooking to the delicate traditions of Cantonese dim sum, geography has helped shape what ends up on the table. Chengdu is associated with mapo tofu; Guangzhou with Cantonese dim sum; Xi’an with Shaanxi’s biangbiang noodles. Three cities, three very different traditions. And China’s influence traveled much farther than its kitchens.",
      feedbackImages: [photo("mapo"), photo("dim-sum"), photo("noodles")],
      scenes: {
        play: {
          focus: { lat: 31, lng: 108, altitude: 0.85 },
          contextIds: ["wurl:CHN"],
        },
        reveal: {
          contextIds: ["wurl:CHN"],
          places: foodReveal,
          views: foods.map((place) => ({
            lat: place.lat,
            lng: place.lng,
            altitude: 0.3,
          })),
        },
      },
      source: source(
        "UNESCO · Chengdu and Sichuan cuisine",
        "https://www.unesco.org/en/creative-cities/chengdu",
      ),
      sources: [
        source(
          "Chengdu · Chen Mapo tofu",
          "https://europe.chinadaily.com.cn/life/2012-03/09/content_14800709.htm",
        ),
        source(
          "Guangzhou Foreign Affairs Office · cuisine and dim sum",
          "https://www.eguangzhou.gov.cn/gzspecialreports/intlblocks/fun/cuisine/content/post_31777.html",
        ),
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
      label: "Porcelain",
      title: "Blue and White",
      resolvedLabel: "Jingdezhen",
      leadIn:
        "For centuries, another Chinese creation found its way onto tables around the world. Its delicate blue patterns became so desirable that an entire type of fine ceramic still carries the country’s name: china.",
      prompt: "Find Jingdezhen, the city known as China’s porcelain capital.",
      mode: "city-single",
      count: 1,
      selection: {
        type: "ids",
        ids: ["place:1808722", jingdezhen.id, "place:1810821", "place:1800163"],
      },
      commitment: "submit",
      rule: { type: "place-ids", ids: [jingdezhen.id] },
      image: clue("porcelain"),
      feedbackImage: photo("porcelain"),
      feedbackImages: [photo("kiln")],
      importedRegions: [province("JX")],
      guidance: {
        hint: "Look inland in southeastern China. The city became a manufacturing center even though it wasn’t a major coastal port.",
        assist: {
          text: "Jiangxi province is highlighted and labeled. Select the city marker for Jingdezhen.",
          regionIds: [province("JX").id],
        },
      },
      explanation:
        "In Jingdezhen, generations of craftspeople transformed clay, minerals, and fire into porcelain prized around the world. Its workshops supplied imperial courts and international markets alike. Some Chinese creations were made to travel. Others were built to control who could cross a frontier.",
      scenes: {
        play: {
          focus: { lat: 29, lng: 117.5, altitude: 0.26 },
          contextIds: ["wurl:CHN"],
        },
        assist: { places: [provinceLabel("JX")] },
        reveal: {
          contextIds: ["wurl:CHN", province("JX").id],
          places: [{ ...jingdezhen, visualState: "answer" }],
          focus: { lat: 29, lng: 117.5, altitude: 0.26 },
        },
      },
      source: source(
        "UNESCO · Jingdezhen porcelain industry sites",
        "https://whc.unesco.org/en/list/1765/",
      ),
      sources: [regionalSource, locations],
    }),
    defineQuestion({
      ...common,
      id: "made-in-china-wall-not-border-v1",
      label: "Historic frontiers",
      title: "The Wall That Wasn’t a Border",
      resolvedLabel: "Gansu, Hebei & Shanxi",
      leadIn:
        "The Great Wall is one of the world’s most recognizable structures. But it doesn’t simply follow China’s modern border. And despite its name, it isn’t one uninterrupted wall.",
      prompt:
        "Which three of these six Chinese provinces contain historic sections of the Great Wall?",
      mode: "map-multiple",
      count: 3,
      commitment: "submit",
      selection: { type: "ids", ids: MADE_IN_CHINA_WALL_CANDIDATES },
      rule: { type: "region-ids", ids: MADE_IN_CHINA_WALL_ANSWERS },
      disclosure: {
        ...common.disclosure,
        namedChoices: true,
        hoverNames: true,
        committedNames: true,
      },
      choices: MADE_IN_CHINA_WALL_CANDIDATES.map((id) => ({
        id,
        label: provinces.find((region) => region.id === id)!.name,
      })),
      importedRegions: provinces.filter(
        (region) =>
          MADE_IN_CHINA_WALL_REGIONS.includes(region.id) ||
          MADE_IN_CHINA_WALL_CANDIDATES.includes(region.id),
      ),
      guidance: {
        hint: "Think north. Different dynasties built defenses across China’s northern landscapes, from the dry northwest toward the mountains nearer the coast.",
        assist: {
          text: "Gansu is selected and locked. Jiayuguan’s fortifications mark a western gateway of the Ming Great Wall. Find two more provinces.",
          fixedSelections: [province("GS").id],
          images: [
            {
              src: photo("jiayuguan").src,
              alt: photo("jiayuguan").alt,
              caption: "Jiayuguan fortifications · Gansu",
              credit: photo("jiayuguan").credit,
            },
          ],
        },
      },
      explanation:
        "The Great Wall is better understood as a vast network of fortifications, constructed and rebuilt by different dynasties over many centuries. Gansu, Hebei, and Shanxi are three examples among a much wider distribution. Some sections cross dry plains; others climb mountain ridges. Their locations tell stories about historic frontiers and changing military priorities, rather than the boundaries of today’s China. The wall was built to protect empires. Elsewhere, China’s rulers, merchants, and architects built monuments to wealth, power, and ambition.",
      qualification:
        "These six provinces are a limited candidate set. The reveal shades the fifteen provincial-level regions covered by China’s Great Wall conservation plan; it does not trace individual wall segments or imply that each region is entirely covered in remains.",
      feedbackImage: photo("jiayuguan"),
      feedbackMapCaption:
        "Gansu, Hebei, and Shanxi are the three answers. Other highlighted regions show the wider distribution of recorded remains, not the wall’s course.",
      scenes: {
        play: {
          focus: { lat: 35, lng: 110, altitude: 0.8 },
          places: ["GS", "SC", "HE", "JS", "SX", "ZJ"].map(provinceLabel),
          map: {
            borders: true,
            hoverFeedback: true,
            muteOthers: true,
            candidates: "highlighted",
          },
        },
        reveal: {
          focus: { lat: 40, lng: 105, altitude: 1.2 },
          contextIds: otherWallRegions,
          answerIds: MADE_IN_CHINA_WALL_ANSWERS,
          places: [
            "GS",
            "HE",
            "SX",
            "NM",
            "LN",
            "SN",
            "NX",
            "QH",
            "XJ",
            "HL",
            "JL",
            "SD",
            "HA",
            "BJ",
            "TJ",
          ].map(provinceLabel),
        },
      },
      source: wallSource,
      sources: [wallDistribution, regionalSource],
    }),
    chronology,
    defineQuestion({
      ...common,
      id: "made-in-china-city-reinvented-v1",
      label: "Modern metropolis",
      title: "A City Reinvented",
      resolvedLabel: "Shenzhen",
      leadIn:
        "Our final stop takes us to a city transformed within living memory. In 1980, Shenzhen became one of China’s first special economic zones. Over the following decades, manufacturing, investment, and migration helped transform it into a major metropolis.",
      prompt:
        "Hong Kong is marked. Place a pin near Shenzhen, the city that grew just across the boundary.",
      mode: "pin",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      rule: {
        type: "pin-distance",
        targetId: shenzhen.id,
        radiusKm: 24,
        tiers: [
          { radiusKm: 8, feedback: "Bullseye!" },
          { radiusKm: 16, feedback: "Very close." },
          { radiusKm: 24, feedback: "In range." },
        ],
      },
      image: {
        ...clue("shenzhen-early"),
        context: {
          src: photo("shenzhen-now").src,
          alt: photo("shenzhen-now").alt,
        },
      },
      feedbackImage: photo("shenzhen-early"),
      feedbackImages: [photo("shenzhen-now")],
      guidance: {
        hint: "Look directly north of Hong Kong, on the eastern side of the Pearl River estuary.",
        assist: {
          text: "Guangzhou is now marked as a second reference. Shenzhen lies much closer to Hong Kong.",
          places: [guangzhou],
          focus: { lat: 22.8, lng: 113.85, altitude: 0.09 },
        },
      },
      explanation:
        "Shenzhen’s factories helped connect China to global manufacturing networks. Its technology companies, dense neighborhoods, and skyscrapers tell another story: how rapidly a city—and an economy—can change. From ancient kilns to modern megacities, China’s creations have repeatedly reshaped the places where people live.",
      scenes: {
        play: {
          focus: { lat: 22.65, lng: 114.03, altitude: 0.055 },
          contextIds: ["wurl:CHN", "wurl:HKG"],
          places: [hongKong],
        },
        reveal: {
          contextIds: ["wurl:CHN", "wurl:HKG"],
          places: [hongKong, { ...shenzhen, visualState: "answer" }],
          focus: { lat: 22.6, lng: 114.03, altitude: 0.07 },
        },
      },
      source: source(
        "World Bank · China’s special economic zones",
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
    focus: { lat: 34, lng: 108, altitude: 1.1 },
    regionIds: MADE_IN_CHINA_WALL_ANSWERS,
    views: [
      { lat: 30, lng: 108, altitude: 0.85 },
      { lat: 29.3, lng: 117.2, altitude: 0.3 },
      { lat: 40, lng: 105, altitude: 1.2 },
      { lat: 35, lng: 115, altitude: 0.85 },
      { lat: 22.6, lng: 114.03, altitude: 0.07 },
    ],
    loopViews: false,
    places: [
      ...foodReveal,
      jingdezhen,
      ...landmarks,
      shenzhen,
      ...["GS", "HE", "SX"].map(provinceLabel),
    ].map((place) => ({
      ...place,
      visualState: "visited",
      markerBadge: undefined,
      answerTarget: false,
    })),
    physicalFeatures: [],
    mapCaption:
      "Regional kitchens · Jingdezhen porcelain · historic frontiers · four eras of architecture · Shenzhen’s transformation",
    caption:
      "A meal. A porcelain vessel. A wall. A monument. A metropolis. Across centuries, the people of China have shaped how the world eats, trades, builds, and lives. These five creations tell only a fraction of that story—but each began somewhere.",
  },
};
