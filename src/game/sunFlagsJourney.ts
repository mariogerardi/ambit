import { defineQuestion, definePresentation } from "./questionBuilder";
import type { FactSource, FlagDisplay, Journey } from "./questions";
import flagCatalog from "./data/flags.v1.json";
import { mapSource } from "./countryFacts";
import { CAPITALS, capitalSource } from "./quizData";
import type { PlaceFeature } from "../geography/types";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const flagSrc = (code: string) =>
  flagCatalog.flags.find((item) => item.countryId === `wurl:${code}`)!.src;
const flag = (code: string, alt: string) => ({
  src: flagSrc(code),
  alt,
  feedbackAlt: `National flag of ${({ ARG: "Argentina", URY: "Uruguay", KAZ: "Kazakhstan", JPN: "Japan", MWI: "Malawi", PHL: "the Philippines" } as Record<string, string>)[code]}`,
});
const seoul = CAPITALS.find((capital) => capital.countryId === "wurl:KOR")!;
const southAmerica = CAPITALS.filter(
  (capital) => capital.continent === "SA",
).map((capital) => capital.countryId);
// Continental context includes map units outside the sovereign-capital catalog.
const africa = [
  ...CAPITALS.filter((capital) => capital.continent === "AF").map(
    (capital) => capital.countryId,
  ),
  "wurl:ESH",
  "wurl:NE-SOL",
  "wurl:SHN",
];
const flagDisplay = (
  code: string,
  label: string,
  detailAlt: string,
): FlagDisplay => ({
  src: flagSrc(code),
  alt: `National flag of ${label}`,
  label,
  detail: {
    src: `/flags/clues/sun-detail-${code.toLowerCase()}.v1.svg`,
    alt: detailAlt,
  },
});
const sunFlags = [
  flagDisplay(
    "ARG",
    "Argentina",
    "Argentina’s Sun of May with 32 alternating straight and wavy rays.",
  ),
  flagDisplay(
    "URY",
    "Uruguay",
    "Uruguay’s Sun of May with 16 alternating straight and wavy rays.",
  ),
  flagDisplay(
    "PHL",
    "Philippines",
    "The eight-rayed sun from the Philippine flag.",
  ),
  flagDisplay(
    "KAZ",
    "Kazakhstan",
    "Kazakhstan’s golden sun with grain-shaped rays.",
  ),
  flagDisplay("JPN", "Japan", "The simple red sun disc from Japan’s flag."),
  flagDisplay(
    "MWI",
    "Malawi",
    "The red rising sun on the black stripe of Malawi’s flag.",
  ),
];
const sunCountries = ["ARG", "URY", "PHL", "KAZ", "JPN", "MWI"].map(
  (code) => `wurl:${code}`,
);
const countryLabel = (
  code: string,
  name: string,
  lat: number,
  lng: number,
): PlaceFeature => ({
  id: `sun:visited:${code}`,
  parentId: `wurl:${code}`,
  name,
  lat,
  lng,
  kind: "other",
  sourceId: "natural-earth:5.1.2",
  markerHidden: true,
  labelFlexible: true,
  priority: 90,
  visualState: "visited",
});
const base = definePresentation({
  label: "Flag",
  topic: "sun symbols",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: true,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 10, lng: 0, altitude: 1.7 },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    revealOnAnswer: true,
  },
  source: mapSource,
});

export const SUN_FLAGS_JOURNEY: Journey = {
  id: "chasing-the-sun-v2",
  supersedes: "chasing-the-sun-v1",
  title: "Chasing the sun",
  description:
    "One familiar symbol, many different stories. Cross oceans and continents to discover how differently a sun can shine.",
  completion: {
    flags: sunFlags,
    focus: { lat: 12, lng: 65, altitude: 1.9 },
    views: [
      { lat: -34, lng: -60, altitude: 0.65 },
      { lat: 11.76, lng: 122.96, altitude: 0.55 },
      { lat: 48.36, lng: 67.24, altitude: 0.85 },
      { lat: 37, lng: 138, altitude: 0.85 },
      { lat: -13.19, lng: 34.27, altitude: 0.55 },
      { lat: 12, lng: 65, altitude: 1.9 },
    ],
    regionIds: sunCountries,
    physicalFeatures: [],
    places: [
      countryLabel("ARG", "Argentina", -34.68424, -64.76533),
      countryLabel("URY", "Uruguay", -32.7916, -56.0259),
      countryLabel("PHL", "Philippines", 11.75694, 122.95568),
      countryLabel("KAZ", "Kazakhstan", 48.36083, 67.24225),
      countryLabel("JPN", "Japan", 37.56021, 137.81248),
      countryLabel("MWI", "Malawi", -13.19473, 34.27103),
    ],
    caption:
      "A shared face, revolutionary rays, a harvest, a red disc and a rising dawn: across six countries, the same sun carries different stories.",
  },
  rounds: [
    defineQuestion({
      commitment: "submit",

      ...base,
      id: "sun-flags-may-pair-v2",
      label: "Shared sun",
      resolvedLabel: "Argentina and Uruguay",
      title: "Two flags, one face.",
      leadIn: "Begin in South America.",
      prompt:
        "The Sun of May has a face. Which two South American countries put it on their national flags?",
      instruction: "Tap both countries on the globe.",
      mode: "map-multiple",
      count: 2,
      rule: { type: "country-ids", ids: ["wurl:ARG", "wurl:URY"] },
      selection: { type: "ids", ids: southAmerica },
      map: {
        borders: true,
        hoverFeedback: true,
        muteOthers: true,
        candidates: "highlighted",
        revealOnAnswer: true,
      },
      disclosure: {
        ...base.disclosure,
        namedChoices: false,
        committedNames: true,
      },
      image: {
        src: "/flags/clues/sun-detail-01.svg",
        alt: "A golden sun with a human face and alternating straight and wavy rays.",
        feedbackAlt: "The Sun of May, shown here in Uruguay’s flag design",
      },
      focus: { lat: -22, lng: -62, altitude: 1.05 },
      feedbackFocus: { lat: -34, lng: -60, altitude: 0.6 },
      feedbackFlags: sunFlags.slice(0, 2),
      explanation:
        "This shared face recalls the May Revolution of 1810. Compare the suns: one has 32 rays, the other 16, alternating straight and wavy in both designs.",
      source: source(
        "Buenos Aires City Government · the national flag’s sun",
        "https://buenosaires.gob.ar/gcaba_historico/noticias/dia-de-la-bandera-como-debe-representarse-el-sol-de-mayo-en-la-insignia",
      ),
      sources: [
        source(
          "Argentina · national flag design",
          "https://www.argentina.gob.ar/pais/simbolos/bandera",
        ),
        source(
          "Uruguay · national flag design",
          "https://www.impo.com.uy/bases/decretos-reglamento/339-2003",
        ),
      ],
      guidance: {
        hint: "The symbol appears on two flags from the Río de la Plata region.",
        assist: {
          text: "Argentina, Brazil, Chile and Uruguay remain available. Choose the two whose flags carry this sun.",
          candidateIds: ["wurl:ARG", "wurl:BRA", "wurl:CHL", "wurl:URY"],
        },
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "sun-flags-philippines-revolution-v2",
      label: "Revolution",
      resolvedLabel: "Philippines · revolution",
      title: "A revolution in the rays.",
      leadIn: "Cross the Pacific to another revolutionary sun.",
      prompt:
        "The Philippine flag’s eight sun rays honor provinces that rose in the 1896 revolution. Against which colonial power?",
      rule: { type: "choice-ids", ids: ["power:spain"] },
      choices: [
        { id: "power:portugal", label: "Portugal" },
        { id: "power:netherlands", label: "The Netherlands" },
        { id: "power:spain", label: "Spain" },
        { id: "power:usa", label: "The United States" },
      ],
      image: flag(
        "PHL",
        "Blue and red bands beside a white triangle containing a golden sun and three stars.",
      ),
      contextIds: ["wurl:PHL"],
      focus: { lat: 11.76, lng: 122.96, altitude: 0.36 },
      feedbackContextIds: [],
      feedbackHintIds: ["wurl:PHL"],
      feedbackFocus: { lat: 11.76, lng: 122.96, altitude: 0.36 },
      feedbackFlags: [sunFlags[2]],
      explanation:
        "Each of the eight rays preserves the memory of a province in the 1896 uprising. The sun carries that struggle for independence into the national flag.",
      source: source(
        "Philippine Supreme Court · constitutional discussion of the flag",
        "https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/24/51077",
      ),
      guidance: {
        hint: "Think of the European empire that also ruled much of Central and South America.",
        assist: {
          text: "The Netherlands and the United States are ruled out. Choose between Spain and Portugal.",
          candidateIds: ["power:spain", "power:portugal"],
        },
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "sun-flags-kazakhstan-grain-v1",
      label: "Symbolism",
      resolvedLabel: "Kazakhstan · abundance",
      title: "Read the rays.",
      leadIn: "Head northwest to the Central Asian steppe.",
      prompt:
        "Kazakhstan gives its sun a different kind of ray. What are the golden rays designed to resemble?",
      rule: { type: "choice-ids", ids: ["rays:grain"] },
      choices: [
        { id: "rays:grain", label: "Grains" },
        { id: "rays:feathers", label: "Feathers" },
        { id: "rays:flames", label: "Flames" },
        { id: "rays:arrows", label: "Arrowheads" },
      ],
      image: {
        src: "/flags/clues/sun-detail-kaz.v1.svg",
        alt: "A golden sun surrounded by repeated tapered rays on a blue field.",
        feedbackAlt: "Sun detail from Kazakhstan’s national flag",
        context: {
          src: flagSrc("KAZ"),
          alt: "Kazakhstan’s complete flag: a golden sun and eagle on blue, with an ornamental band.",
        },
      },
      feedbackFlags: [
        {
          ...sunFlags[3],
          detail: {
            src: "/flags/clues/sun-ray-kaz.v1.svg",
            alt: "A single grain-shaped ray from Kazakhstan’s sun.",
          },
        },
      ],
      contextIds: ["wurl:KAZ"],
      focus: { lat: 48.36, lng: 67.24, altitude: 0.65 },
      feedbackContextIds: [],
      feedbackHintIds: ["wurl:KAZ"],
      feedbackFocus: { lat: 48.36, lng: 67.24, altitude: 0.65 },
      explanation:
        "The sun represents life and abundance. Its rays connect that idea to the harvest; the eagle below stands for independence.",
      source: source(
        "President of Kazakhstan · national flag symbolism",
        "https://www.akorda.kz/en/state_symbols/kazakhstan_flag",
      ),
      guidance: {
        hint: "The sun symbolizes abundance. Think about how sunlight supports life on the steppe.",
        assist: {
          text: "Feathers and arrowheads are ruled out. Choose between grains and flames.",
          candidateIds: ["rays:grain", "rays:flames"],
        },
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "sun-flags-pacific-pin-v1",
      label: "Drop a pin",
      resolvedLabel: "Japan · sun circle",
      title: "No rays required.",
      leadIn: "Head east to the Pacific.",
      prompt:
        "Here the sun becomes a simple red disc. Drop a pin on one of the four main islands of the country that flies this flag.",
      mode: "pin",
      rule: { type: "pin-inside", ids: ["wurl:JPN"] },
      disclosure: { ...base.disclosure, namedChoices: false },
      image: flag("JPN", "A red disc centered on a white field."),
      focus: { lat: 25, lng: 132, altitude: 1.5 },
      feedbackFocus: { lat: 37, lng: 138, altitude: 0.85 },
      map: {
        borders: false,
        hoverFeedback: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "The flag’s name, Hinomaru, means ‘sun circle.’ A face, rays, and a horizon disappear; the sun is still unmistakable.",
      source: source(
        "Web Japan · national flag and anthem",
        "https://web-japan.org/factsheet/en/pdf/11NFlagAnthem.pdf",
      ),
      sources: [mapSource, capitalSource],
      guidance: {
        hint: "Look for an island country off the eastern coast of mainland Asia.",
        assist: {
          text: "Seoul is marked as a reference. Look east across the water for the island chain; place your pin on land.",
          places: [
            {
              ...seoul,
              visualState: "hinted",
              labelFlexible: true,
              priority: 90,
            },
          ],
        },
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "sun-flags-malawi-dawn-v1",
      map: { ...base.map!, feedbackBorders: false },
      label: "Meaning",
      resolvedLabel: "Malawi · a new dawn",
      title: "A new day.",
      leadIn: "Finish with a sunrise in Africa.",
      prompt:
        "On Malawi’s flag, the sun is still rising. What does this sunrise officially represent?",
      rule: { type: "choice-ids", ids: ["dawn:freedom"] },
      choices: [
        { id: "dawn:seasons", label: "The start of the planting season" },
        { id: "dawn:freedom", label: "Hope and freedom for Africa" },
        { id: "dawn:unity", label: "Unity among Malawi’s communities" },
        { id: "dawn:energy", label: "The warmth and energy of the sun" },
      ],
      image: flag(
        "MWI",
        "Black, red, and green horizontal stripes, with a red sun rising within the black stripe.",
      ),
      contextIds: ["wurl:MWI"],
      focus: { lat: -13.19, lng: 34.27, altitude: 0.24 },
      feedbackContextIds: [],
      feedbackHintIds: africa,
      feedbackFocus: { lat: 2, lng: 20, altitude: 1.35 },
      feedbackFlags: [sunFlags[5]],
      feedbackPlaces: [
        {
          id: "sun:africa",
          name: "Africa",
          kind: "other",
          lat: 2,
          lng: 20,
          sourceId: "natural-earth:5.1.2",
          markerHidden: true,
          labelFlexible: true,
          priority: 100,
        },
      ],
      explanation:
        "The rising sun looks beyond Malawi to a whole continent: a dawn of freedom and hope across Africa. Our final view places that promise in its wider setting.",
      source: source(
        "Embassy of Malawi in Cairo · national flag",
        "https://www.malawiembassycairo.org/about-malawi",
      ),
      guidance: {
        hint: "Think of a new political beginning, rather than a daily or seasonal cycle.",
        assist: {
          text: "The planting-season and solar-energy options are ruled out. Choose between community unity and hope and freedom for Africa.",
          candidateIds: ["dawn:unity", "dawn:freedom"],
        },
      },
    }),
  ],
};
