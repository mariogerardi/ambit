import type { FactSource, Journey, Question } from "./questions";
import flagCatalog from "./data/flags.v1.json";
import { mapSource } from "./countryFacts";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const flag = (code: string, alt: string) => ({
  src: flagCatalog.flags.find((item) => item.countryId === `wurl:${code}`)!.src,
  alt,
  feedbackAlt: `National flag of ${({ ARG: "Argentina", URY: "Uruguay", KAZ: "Kazakhstan", JPN: "Japan", MWI: "Malawi" } as Record<string, string>)[code]}`,
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
  id: "chasing-the-sun-v1",
  title: "Chasing the sun",
  description:
    "Five flags, one familiar symbol. Cross oceans and continents to discover how differently the same sun can shine.",
  rounds: [
    {
      ...base,
      id: "sun-flags-revolution-month-v1",
      label: "History",
      title: "A sun with a date.",
      leadIn: "Begin beside the Río de la Plata.",
      prompt:
        "Argentina’s sun recalls a revolution in 1810. Which month gives the ‘Sun of ___’ its name?",
      rule: { type: "choice-ids", ids: ["month:may"] },
      choices: ["January", "March", "May", "July", "September", "November"].map(
        (month) => ({ id: `month:${month.toLowerCase()}`, label: month }),
      ),
      image: flag(
        "ARG",
        "Light-blue and white stripes with a golden, human-faced sun at the center.",
      ),
      focus: { lat: -24, lng: -58, altitude: 1.35 },
      feedbackContextIds: ["wurl:ARG"],
      feedbackFocus: { lat: -35, lng: -64, altitude: 1.1 },
      explanation:
        "The emblem recalls the 1810 revolution. Across the Río de la Plata, the same symbol appears on Uruguay’s flag.",
      source: source(
        "Buenos Aires City Government · the national flag’s sun",
        "https://buenosaires.gob.ar/gcaba_historico/noticias/dia-de-la-bandera-como-debe-representarse-el-sol-de-mayo-en-la-insignia",
      ),
    },
    {
      ...base,
      id: "sun-flags-uruguay-rays-v1",
      label: "Look closely",
      title: "A familiar face, a different count.",
      leadIn: "Cross the river and take a closer look.",
      prompt:
        "Uruguay shares that sun—but not the same ray count. How many rays surround its face?",
      instruction: "Count both straight and wavy rays.",
      inputLabel: "Number of rays",
      mode: "number",
      rule: { type: "manual-number", value: 16 },
      image: {
        src: "/flags/clues/sun-detail-01.svg",
        alt: "Enlarged detail of the flag’s golden sun, with straight and wavy rays alternating around a face.",
        feedbackAlt: "The sun detail from Uruguay’s national flag",
      },
      focus: { lat: -29, lng: -58, altitude: 1.1 },
      feedbackContextIds: ["wurl:URY"],
      feedbackFocus: { lat: -33, lng: -56, altitude: 0.7 },
      explanation:
        "Eight straight rays alternate with eight wavy ones. Argentina’s version has twice as many: the same emblem, two different designs.",
      source: source(
        "Intendencia de Canelones · history of the national flag",
        "https://www.imcanelones.gub.uy/noticias/182o-aniversario-del-primer-pabellon-nacional",
      ),
      sources: [
        source(
          "Government of Argentina · national flag design",
          "https://www.argentina.gob.ar/pais/simbolos/bandera",
        ),
      ],
    },
    {
      ...base,
      id: "sun-flags-kazakhstan-grain-v1",
      label: "Symbolism",
      title: "Read the rays.",
      leadIn: "Cross to the Central Asian steppe.",
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
      focus: { lat: 42, lng: 65, altitude: 1.35 },
      feedbackContextIds: ["wurl:KAZ"],
      feedbackFocus: { lat: 48, lng: 68, altitude: 1.1 },
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
      focus: { lat: -10, lng: 30, altitude: 1.3 },
      feedbackContextIds: ["wurl:MWI"],
      feedbackFocus: { lat: -13, lng: 34, altitude: 0.85 },
      explanation:
        "This dawn looks beyond one country to a whole continent. Our route ends with the sun as a promise of a new beginning.",
      source: source(
        "Embassy of Malawi in Cairo · national flag",
        "https://www.malawiembassycairo.org/about-malawi",
      ),
    },
  ],
};
