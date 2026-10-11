import type { FactSource, Journey, Question } from "./questions";
import flagCatalog from "./data/flags.v1.json";
import { mapSource } from "./countryFacts";
import { CAPITALS } from "./quizData";

const southAmerica = CAPITALS.filter(
  (capital) => capital.continent === "SA",
).map((capital) => capital.countryId);

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const flag = (code: string, alt: string) => ({
  src: flagCatalog.flags.find((item) => item.countryId === `wurl:${code}`)!.src,
  alt,
  feedbackAlt: `National flag of ${({ ARG: "Argentina", URY: "Uruguay", KAZ: "Kazakhstan", JPN: "Japan", MWI: "Malawi", PHL: "the Philippines" } as Record<string, string>)[code]}`,
});
const base: Question = {
  id: "",
  title: "",
  label: "Flag",
  topic: "sun symbols",
  prompt: "",
  instruction: "",
  explanation: "",
  mode: "choice-single",
  rule: { type: "choice-ids", ids: [] },
  count: 1,
  selection: { type: "none" },
  commitment: "submit",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: true,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 10, lng: 0, altitude: 1.7 },
  map: { borders: true, hover: false, muteOthers: true, revealOnAnswer: true },
  source: mapSource,
};

export const SUN_FLAGS_JOURNEY: Journey = {
  id: "chasing-the-sun-v2",
  supersedes: "chasing-the-sun-v1",
  title: "Chasing the sun",
  description:
    "One familiar symbol, many different stories. Cross oceans and continents to discover how differently a sun can shine.",
  rounds: [
    {
      ...base,
      id: "sun-flags-may-pair-v2",
      label: "Shared sun",
      title: "Two flags, one face.",
      leadIn: "Begin in South America.",
      prompt:
        "The Sun of May has a face. Which two South American countries put it on their national flags?",
      instruction: "Tap both countries on the globe.",
      mode: "map-multiple",
      count: 2,
      rule: { type: "country-ids", ids: ["wurl:ARG", "wurl:URY"] },
      selection: { type: "members" },
      contextIds: southAmerica,
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "neutral",
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
      explanation:
        "This shared face recalls the May Revolution of 1810. The two neighbors draw its rays differently, but carry the same Sun of May.",
      source: source(
        "Buenos Aires City Government · the national flag’s sun",
        "https://buenosaires.gob.ar/gcaba_historico/noticias/dia-de-la-bandera-como-debe-representarse-el-sol-de-mayo-en-la-insignia",
      ),
    },
    {
      ...base,
      id: "sun-flags-philippines-revolution-v2",
      label: "Revolution",
      title: "A revolution in the rays.",
      leadIn: "Cross the Pacific to another revolutionary sun.",
      prompt:
        "The Philippine flag’s eight sun rays honor provinces that rose in the 1896 revolution. Against which colonial power?",
      rule: { type: "choice-ids", ids: ["power:spain"] },
      choices: [
        { id: "power:portugal", label: "Portugal" },
        { id: "power:britain", label: "Britain" },
        { id: "power:netherlands", label: "The Netherlands" },
        { id: "power:spain", label: "Spain" },
        { id: "power:usa", label: "The United States" },
        { id: "power:france", label: "France" },
      ],
      image: flag(
        "PHL",
        "Blue and red bands beside a white triangle containing a golden sun and three stars.",
      ),
      contextIds: ["wurl:PHL"],
      focus: { lat: 11.76, lng: 122.96, altitude: 0.36 },
      feedbackContextIds: ["wurl:ESP"],
      feedbackFocus: { lat: 40.28, lng: -3.66, altitude: 0.35 },
      explanation:
        "Each ray preserves the memory of a province in the uprising. Like the Sun of May, this sun carries a story of independence rather than a weather forecast.",
      source: source(
        "Philippine Supreme Court · constitutional discussion of the flag",
        "https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/24/51077",
      ),
    },
    {
      ...base,
      id: "sun-flags-kazakhstan-grain-v1",
      label: "Symbolism",
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
      image: flag(
        "KAZ",
        "A golden sun with tapered rays above a soaring bird, on a blue field with a vertical ornamental band.",
      ),
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
    },
    {
      ...base,
      id: "sun-flags-pacific-pin-v1",
      label: "Drop a pin",
      title: "No rays required.",
      leadIn: "Head east to the Pacific.",
      prompt:
        "Here the sun becomes a simple red disc. Drop a pin on any land belonging to the country that flies this flag.",
      mode: "pin",
      rule: { type: "pin-inside", ids: ["wurl:JPN"] },
      disclosure: { ...base.disclosure, namedChoices: false },
      image: flag("JPN", "A red disc centered on a white field."),
      focus: { lat: 25, lng: 132, altitude: 1.5 },
      feedbackFocus: { lat: 37, lng: 138, altitude: 0.85 },
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "The flag’s name, Hinomaru, means ‘sun circle.’ A face, rays, and a horizon disappear; the sun is still unmistakable.",
      source: source(
        "Web Japan · national flag and anthem",
        "https://web-japan.org/factsheet/en/pdf/11NFlagAnthem.pdf",
      ),
      sources: [mapSource],
    },
    {
      ...base,
      id: "sun-flags-malawi-dawn-v1",
      label: "Meaning",
      title: "A new day.",
      leadIn: "Finish with a sunrise in Africa.",
      prompt:
        "On Malawi’s flag, the sun is still rising. What does this sunrise officially represent?",
      rule: { type: "choice-ids", ids: ["dawn:freedom"] },
      choices: [
        { id: "dawn:seasons", label: "The start of the planting season" },
        { id: "dawn:freedom", label: "Hope and freedom for Africa" },
        { id: "dawn:monarchy", label: "The power of a royal dynasty" },
        { id: "dawn:equator", label: "The country’s position on the Equator" },
      ],
      image: flag(
        "MWI",
        "Black, red, and green horizontal stripes, with a red sun rising within the black stripe.",
      ),
      contextIds: ["wurl:MWI"],
      focus: { lat: -13.19, lng: 34.27, altitude: 0.24 },
      feedbackContextIds: [],
      feedbackHintIds: ["wurl:MWI"],
      feedbackFocus: { lat: -13.19, lng: 34.27, altitude: 0.24 },
      explanation:
        "This dawn looks beyond one country to a whole continent. Our route ends with the sun as a promise of a new beginning.",
      source: source(
        "Embassy of Malawi in Cairo · national flag",
        "https://www.malawiembassycairo.org/about-malawi",
      ),
    },
  ],
};
