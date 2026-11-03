import { defineQuestion, definePresentation } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { cityReference, explanationPlace, areaLabel } from "./authoredPlaces";
import type { Journey, FactSource } from "./questionContracts";
import type {
  ConstructionGrid,
  Construction,
  ConstructionArea,
} from "./constructionTypes";
import type { MapOverlay, RegionFeature } from "../geography/types";
import snapshot from "./data/power-people-ukraine.v1.json";

export const UKRAINE_2004 = snapshot as unknown as {
  regions: {
    iso: string;
    name: string;
    winner: string;
    geometry: RegionFeature["geometry"];
  }[];
  countryGeometry: RegionFeature["geometry"];
  grid: ConstructionGrid;
  mask: NonNullable<ConstructionArea["mask"]>;
  targetMask: NonNullable<ConstructionArea["mask"]>;
  examples: Record<
    "complete" | "broad" | "partial" | "middle" | "lower" | "wrongSide",
    Construction
  >;
};
const assets = "/journeys/power-to-the-people/";
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-02",
});
const countries = (...codes: string[]) => codes.map((code) => `wurl:${code}`);
const city = (id: string) => {
  const place = ANSWER_PLACES.get(`place:${id}`);
  if (!place) throw Error(`Missing Power to the People city: ${id}`);
  return cityReference(place);
};
const manila = city("1701668");
const candidates = [
  manila,
  city("1609350"),
  city("1581130"),
  city("1821306"),
  city("1651944"),
  city("1735161"),
];
const sidiBouzid = cityReference({
  id: "power-people:sidi-bouzid",
  name: "Sidi Bouzid",
  kind: "city",
  lat: 35.03823,
  lng: 9.48494,
  parentId: "wurl:TUN",
  sourceId: "geodatos:sidi-bouzid",
});
const kathmandu = explanationPlace(city("1283240"));
const edsa = explanationPlace(
  cityReference({
    id: "power-people:edsa",
    name: "EDSA · Quezon City",
    kind: "landmark",
    lat: 14.61,
    lng: 121.055,
    parentId: "wurl:PHL",
    sourceId: "nhcp:edsa-camp-aguinaldo",
  }),
);
const lviv = { ...city("702550"), name: "Lviv · Yushchenko example" };
const donetsk = { ...city("709717"), name: "Donetsk · Yanukovych example" };
const cec = source(
  "Ukraine CEC · December 26, 2004 regional results",
  "https://cvk.gov.ua/pls/vp2004/wp301e2e3e.html",
);
const outline = (
  id: string,
  geometry: RegionFeature["geometry"],
): MapOverlay[] =>
  (geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates
  ).map((poly, p) => ({
    id: `power-people:${id}:${p}`,
    type: "path" as const,
    // Grade the original polygons, but don't outline subpixel seams/holes.
    coordinates: poly[0],
    foreground: true,
    visualState: "hinted" as const,
    opacity: 0.8,
  }));
const ukraine = { lat: 48.7, lng: 31.2, altitude: 0.22 };
const southernAfrica = { lat: -23, lng: 26, altitude: 0.95 };
const northAfrica = { lat: 27, lng: 15, altitude: 1.1 };
const southAsia = { lat: 24, lng: 84, altitude: 0.62 };
const common = definePresentation({
  label: "Political turning points",
  topic: "Public participation",
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
    candidates: "highlighted",
  },
});

export const POWER_TO_THE_PEOPLE_JOURNEY: Journey = {
  dailyEligible: false,
  id: "power-to-the-people-v1",
  addedAt: "2026-11-02",
  saveRevision: 1,
  title: "Power to the People",
  description:
    "Five political turning points, from crowds in the streets to ballots and online deliberations.",
  mapAttribution: {
    label:
      "Natural Earth · GeoNames · © OpenStreetMap contributors / geoBoundaries (ODbL)",
    url: "https://www.geoboundaries.org/",
  },
  rounds: [
    defineQuestion({
      ...common,
      id: "power-people-01-people-power",
      title: "People Power",
      progressLabel: "People Power",
      resolvedLabel: "Manila · EDSA, 1986",
      mode: "city-single",
      count: 1,
      selection: { type: "ids", ids: candidates.map((p) => p.id) },
      commitment: "submit",
      allowTyping: false,
      rule: { type: "place-ids", ids: [manila.id] },
      correctFeedback: "You found it.",
      incorrectFeedback: "Not quite.",
      disclosure: {
        ...common.disclosure,
        namedChoices: true,
        hoverNames: true,
        committedNames: true,
      },
      leadIn:
        "In February 1986, civilians filled the streets to protect rebel soldiers after a disputed election, helping end Ferdinand Marcos’s rule.",
      prompt: "Which marked capital is in the country where this happened?",
      explanation:
        "Manila is the capital of the Philippines. The People Power crowds gathered along EDSA in Metro Manila, especially near the military camps in Quezon City. Their protection of defecting soldiers helped end Marcos’s two-decade rule. Corazon Aquino took office on February 25, 1986.",
      guidance: {
        hint: "Look for a predominantly Catholic archipelago in the western Pacific. That cultural distinction sets it apart from many of its Southeast Asian neighbors.",
        assist: {
          text: "Four capitals remain. Look across the South China Sea, east of mainland Southeast Asia.",
          candidateIds: [
            manila.id,
            "place:1609350",
            "place:1581130",
            "place:1735161",
          ],
        },
      },
      source: source(
        "NHCP · EDSA People Power",
        "https://philhistoricsites.nhcp.gov.ph/registry_database/edsa-people-power/",
      ),
      sources: [
        source(
          "UNESCO · People Power radio broadcasts",
          "https://www.unesco.org/en/memory-world/radio-broadcast-philippine-people-power-revolution?hub=1081",
        ),
      ],
      map: { ...common.map, feedbackRegions: "neutral" },
      scenes: {
        play: {
          focus: { lat: 13, lng: 109, altitude: 0.48 },
          contextIds: [],
          places: candidates,
        },
        reveal: {
          focus: { lat: 14.61, lng: 121.02, altitude: 0.1 },
          contextIds: ["wurl:PHL"],
          places: [edsa],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "power-people-02-new-flag",
      title: "A New Flag",
      progressLabel: "A New Flag",
      resolvedLabel: "South Africa · 1994",
      mode: "map-single",
      count: 1,
      selection: {
        type: "ids",
        ids: countries("ZAF", "NAM", "BWA", "ZWE", "ZMB", "MOZ"),
      },
      commitment: "immediate",
      allowTyping: false,
      rule: { type: "flag-country", countryId: "wurl:ZAF" },
      correctFeedback: "Well recognized.",
      incorrectFeedback: "Look farther south.",
      leadIn:
        "In April 1994, citizens of all races voted on equal terms in a landmark national election. A new flag marked the country’s change of era.",
      prompt: "Which country adopted this flag?",
      explanation:
        "South Africa first flew this flag on April 27, 1994, as its first nonracial democratic national elections ended decades of apartheid-era voting exclusions. Nelson Mandela became president in May. The flag’s converging design evokes people moving forward together.",
      guidance: {
        hint: "Look toward Africa's southern end. The flag was introduced as the country's apartheid-era political order was dismantled.",
        assist: {
          text: "The country is one of three neighbors in southern Africa. Compare South Africa, Namibia, and Botswana.",
          candidateIds: countries("ZAF", "NAM", "BWA"),
        },
      },
      image: {
        src: "/flags/study/flag-160.svg",
        alt: "Six-color flag: a green Y with white borders, red above and blue below, and a gold-edged black triangle at the hoist.",
        feedbackAlt: "National flag of South Africa",
      },
      source: source(
        "South African Government · national flag",
        "https://www.gov.za/about-sa/national-flag-1",
      ),
      sources: [
        source(
          "South African Government · freedom milestones",
          "https://www.gov.za/issues/20years/milestones-20-years-freedom",
        ),
      ],
      scenes: {
        play: { focus: southernAfrica, contextIds: [] },
        reveal: {
          focus: southernAfrica,
          contextIds: [],
          answerIds: ["wurl:ZAF"],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "power-people-03-election-regions",
      title: "A Country at the Polls",
      progressLabel: "A Country at the Polls",
      resolvedLabel: "Ukraine · December 2004 repeat runoff",
      mode: "geo-brush",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      instruction:
        "Estimate the broad pattern; the regional results appear after you submit.",
      constructionArea: {
        name: "Ukraine",
        geometry: UKRAINE_2004.countryGeometry,
        mask: UKRAINE_2004.mask,
      },
      constructionExample: UKRAINE_2004.examples.complete,
      rule: {
        type: "raster-overlap",
        grid: UKRAINE_2004.grid,
        targetLabel: "Yushchenko-winning regions",
        targetMask: UKRAINE_2004.targetMask,
        brushRadiusKm: 50,
        tiers: [
          { f1: 0.8, precision: 0.78, feedback: "Well reconstructed." },
          { f1: 0.6, precision: 0.63, feedback: "The pattern emerges." },
          { f1: 0.4, precision: 0.5, feedback: "Part of the picture." },
        ],
      },
      incorrectFeedback: "Compare the regions.",
      leadIn:
        "In Ukraine’s 2004 election, Viktor Yushchenko promised to fight corruption and strengthen ties with Europe, drawing support from the west and Kyiv. Viktor Yanukovych’s base lay in the industrial east, closely tied to Russia. A disputed runoff led to mass protests and a repeat vote.",
      prompt:
        "Paint the regions you think Yushchenko won in the December 26 repeat vote.",
      explanation:
        "Yushchenko’s winning regions stretched across western, northern and central Ukraine, including Kyiv. Yanukovych led across much of the industrial east and the Black Sea south, including Crimea. The repeat runoff gave Yushchenko the presidency after the protests known as the Orange Revolution.",
      guidance: {
        hint: "Start near Ukraine’s western neighbors, then consider the northern and central regions around Kyiv. Yushchenko’s coalition reached beyond the far west.",
        assist: {
          text: "Compare two contrasting examples: the area around Lviv supported Yushchenko, while the Donetsk area favored Yanukovych. Use them as anchors—but the rest of the country is still yours to infer.",
          places: [lviv, donetsk],
        },
      },
      feedbackMapCaption:
        "December 26, 2004 repeat runoff · leading candidate by region",
      source: cec,
      sources: [
        source(
          "CRS · Ukraine’s political crisis, February 2005",
          "https://www.everycrsreport.com/reports/RL32691.html",
        ),
        source(
          "OSCE/ODIHR · 2004 election mission",
          "https://odihr.osce.org/odihr/elections/ukraine/eoms/presidential_2004",
        ),
        source(
          "geoBoundaries · Ukraine ADM1 · ODbL 1.0",
          "https://www.geoboundaries.org/api/current/gbOpen/UKR/ADM1/",
        ),
      ],
      qualification:
        "Regional winners in the December 26, 2004 repeat runoff, including Crimea. Boundaries are reconstructed from the same 27 administrative units in a later geographic dataset; they do not depict subsequent control or occupation.",
      map: { ...common.map, feedbackRegions: "neutral" },
      scenes: {
        play: {
          focus: ukraine,
          contextIds: [],
          overlays: outline("ukraine", UKRAINE_2004.countryGeometry),
        },
        reveal: {
          focus: ukraine,
          contextIds: [],
          overlays: [
            {
              id: "power-people:historical-results",
              type: "raster-patch",
              assetUrl: assets + "regional-winners.png",
              bounds: [22, 44, 41, 53],
              foreground: true,
              opacity: 0.8,
            },
            ...UKRAINE_2004.regions.flatMap((r) => outline(r.iso, r.geometry)),
          ],
          places: [
            areaLabel({
              id: "power-people:yushchenko-label",
              name: "Yushchenko-winning regions",
              kind: "other",
              lat: 49.3,
              lng: 26.5,
              sourceId: "cec:2004-12-26",
            }),
            areaLabel({
              id: "power-people:yanukovych-label",
              name: "Yanukovych-winning regions",
              kind: "other",
              lat: 47,
              lng: 35.7,
              sourceId: "cec:2004-12-26",
            }),
          ],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "power-people-04-spark-spreads",
      title: "The Spark Spreads",
      progressLabel: "The Spark Spreads",
      resolvedLabel: "Tunisia, Egypt and Libya · 2010–11",
      mode: "map-multiple",
      count: 2,
      selection: {
        type: "ids",
        ids: countries("MAR", "DZA", "LBY", "EGY", "SDN"),
      },
      commitment: "submit",
      allowTyping: false,
      rule: { type: "country-ids", ids: countries("EGY", "LBY") },
      correctFeedback: "Both found.",
      incorrectFeedback: "Different outcomes.",
      leadIn:
        "Protests erupted in Sidi Bouzid, Tunisia, in December 2010. Within weeks, President Ben Ali had fled, and unrest inspired movements across the Arab world.",
      prompt:
        "Which two other North African countries saw their longtime rulers removed amid uprisings in 2011?",
      explanation:
        "The unrest that began in Tunisia in December 2010 helped set off the Arab Spring. In Egypt, President Hosni Mubarak resigned in February 2011 after mass demonstrations. In Libya, an uprising escalated into a civil war, and Muammar Gaddafi was overthrown later that year.",
      guidance: {
        hint: "The two uprisings had different courses: one president resigned after mass demonstrations, while another ruler fell during an uprising that became a civil war.",
        assist: {
          text: "Narrow the search to Algeria, Libya, and Egypt. Two had longtime leaders removed in 2011.",
          candidateIds: countries("DZA", "LBY", "EGY"),
        },
      },
      source: source(
        "Wilson Center · Tunisia",
        "https://www.wilsoncenter.org/tunisia",
      ),
      sources: [
        source(
          "Sidi Bouzid · city coordinates",
          "https://www.geodatos.net/en/coordinates/tunisia/sidi-bouzid",
        ),
        source(
          "CFR · Arab Spring retrospective",
          "https://www.cfr.org/articles/arab-spring-ten-years-whats-legacy-uprisings",
        ),
      ],
      scenes: {
        play: {
          focus: northAfrica,
          contextIds: ["wurl:TUN"],
          places: [sidiBouzid],
        },
        reveal: {
          focus: northAfrica,
          contextIds: ["wurl:TUN"],
          answerIds: countries("EGY", "LBY"),
          places: [sidiBouzid],
        },
      },
    }),
    defineQuestion({
      ...common,
      id: "power-people-05-digital-turn",
      title: "The Digital Turn",
      progressLabel: "The Digital Turn",
      resolvedLabel: "Nepal · 2025 youth uprising",
      mode: "map-single",
      count: 1,
      selection: {
        type: "ids",
        ids: countries("NPL", "BTN", "BGD", "PAK", "IND", "MMR"),
      },
      commitment: "immediate",
      allowTyping: false,
      rule: { type: "country-ids", ids: ["wurl:NPL"] },
      correctFeedback: "Nepal.",
      incorrectFeedback: "It was Nepal.",
      leadIn:
        "In September 2025, youth-led protests over corruption and social-media restrictions brought down a South Asian government. Demonstrators used an online discussion and poll to help choose a proposed interim leader.",
      prompt: "Which country was this?",
      explanation:
        "In Nepal, protesters used Discord to debate possible interim leaders and hold an informal poll. Former chief justice Sushila Karki emerged as a favorite, and President Ramchandra Paudel appointed her interim prime minister on September 12, 2025. Parliamentary elections followed in March 2026, and Balendra Shah became prime minister later that month.",
      guidance: {
        hint: "Look toward the Himalayas, where smaller countries lie along the northern edge of the Indian subcontinent.",
        assist: {
          text: "Three possibilities remain: India, Nepal, and Bhutan. Consider which saw the 2025 youth-led political crisis.",
          candidateIds: countries("IND", "NPL", "BTN"),
        },
      },
      source: source(
        "WIRED · online activist deliberations",
        "https://www.wired.com/story/nepal-discord-gen-z-protests-vote-prime-minister-election/",
      ),
      sources: [
        source(
          "Harvard · 2025 uprising and constitutional appointment",
          "https://hsph.harvard.edu/atrocity-prevention-lab/news/the-2025-gen-z-uprising-in-nepal-a-three-part-analysis/",
        ),
        source(
          "Nepal PM Office · Balendra Shah",
          "https://opmcm.gov.np/minister-detail/",
        ),
      ],
      scenes: {
        play: { focus: southAsia, contextIds: [] },
        reveal: {
          focus: { lat: 28, lng: 84, altitude: 0.48 },
          contextIds: [],
          answerIds: ["wurl:NPL"],
          places: [kathmandu],
        },
      },
    }),
  ],
  completion: {
    focus: { lat: 25, lng: 65, altitude: 2.2 },
    mapMode: "cumulative",
    mapAttribution: {
      label: "Journey sources and geographic data",
      url: assets + "SOURCES.md",
    },
    regionIds: countries("ZAF", "EGY", "LBY", "NPL"),
    views: [
      { lat: 14.61, lng: 121.02, altitude: 0.32 },
      southernAfrica,
      ukraine,
      northAfrica,
      { lat: 28, lng: 84, altitude: 0.48 },
    ],
    physicalFeatures: [],
    overlays: [],
    places: [
      { ...manila, displayRole: undefined, visualState: "visited" },
      edsa,
      sidiBouzid,
      kathmandu,
    ],
    constructionResults: true,
    caption:
      "From crowds along Manila's EDSA to South Africa's newly inclusive elections, Ukraine's contested runoff, uprisings across North Africa, and Nepal's online deliberations, political change has taken many forms. Ballots, streets, institutions, and digital spaces each played a different part.",
  },
};
