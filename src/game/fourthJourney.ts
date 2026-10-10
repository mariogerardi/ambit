import type { Journey, Question } from "./questions";
import { CAPITALS, FEATURES, capitalSource } from "./quizData";

const tripoli = CAPITALS.find((c) => c.countryId === "wurl:LBY")!;
export const YUGOSLAV_REPUBLICS = [
  "BIH",
  "HRV",
  "MKD",
  "MNE",
  "SRB",
  "SVN",
].map((c) => `wurl:${c}`);
const base: Question = {
  id: "",
  title: "",
  label: "",
  topic: "",
  prompt: "",
  instruction: "",
  mode: "choice-single",
  rule: { type: "choice-ids", ids: [] },
  count: 1,
  selection: { type: "none" },
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  commitment: "submit",
  failure: "feedback",
  focus: { lat: 36, lng: 17, altitude: 1.4 },
  explanation: "",
  source: capitalSource,
  map: { borders: true, hover: false, muteOthers: true },
};
export const FOURTH_JOURNEY: Journey = {
  id: "mediterranean-v1",
  title: "Around the Mediterranean",
  description:
    "Around one sea, islands, languages, and shared histories bring many countries together.",
  rounds: [
    {
      ...base,
      id: "spain-regional-languages",
      label: "Languages",
      topic: "regional languages",
      title: "Two regions, two languages.",
      prompt: "Which two of these languages are official in parts of Spain?",
      instruction: "",
      mode: "choice-multiple",
      count: 2,
      rule: { type: "choice-ids", ids: ["language:cat", "language:eus"] },
      choices: [
        { id: "language:fra", label: "French" },
        { id: "language:cat", label: "Catalan" },
        { id: "language:deu", label: "German" },
        { id: "language:eus", label: "Basque" },
        { id: "language:nld", label: "Dutch" },
        { id: "language:pol", label: "Polish" },
      ],
      contextIds: ["wurl:ESP"],
      focus: { lat: 40, lng: -3, altitude: 0.75 },
      explanation:
        "Catalan is co-official with Spanish in Catalonia; Basque (Euskara) is co-official with Spanish in the Basque Country. Spain also has other regional co-official languages.",
      source: {
        name: "Spain Ministry of Territorial Policy · official languages",
        url: "https://mptmd.gob.es/en/portal/politica-territorial/autonomica/lenguas-cooficiales",
        reviewedOn: "2026-10-05",
      },
    },
    {
      ...base,
      id: "italy-sicily",
      label: "Island",
      topic: "islands",
      title: "Name this island.",
      prompt: "What is the name of the highlighted island?",
      instruction: "",
      rule: { type: "choice-ids", ids: ["island:sicily"] },
      choices: [
        { id: "island:sardinia", label: "Sardinia" },
        { id: "island:crete", label: "Crete" },
        { id: "island:sicily", label: "Sicily" },
        { id: "island:corsica", label: "Corsica" },
        { id: "island:cyprus", label: "Cyprus" },
        { id: "island:malta", label: "Malta" },
      ],
      contextIds: ["wurl:ITA"],
      highlightParts: [
        {
          countryId: "wurl:ITA",
          point: { lat: 37.6, lng: 14 },
          name: "Sicily",
          reveal: "part",
        },
      ],
      focus: { lat: 37.6, lng: 14, altitude: 0.32 },
      explanation:
        "Sicily is Italy’s largest island and the largest island in the Mediterranean, just beyond the toe of the Italian peninsula.",
      feedbackPlaces: [
        {
          id: "clue:sicily",
          name: "Sicily",
          kind: "other",
          lat: 37.6,
          lng: 14,
          sourceId: "curated:sicily-v1",
        },
      ],
      source: {
        name: "Visit Sicily · official regional tourism brochure",
        url: "https://www.visitsicily.info/wp-content/uploads/2024/11/SR_Brochure-Sicilia_20241102_Inglese_Maggiore-risoluzione.pdf",
        reviewedOn: "2026-10-05",
      },
    },
    {
      ...base,
      id: "libya-capital",
      label: "Capital",
      topic: "capitals",
      title: "A capital on the coast.",
      prompt: "What is the capital of Libya?",
      instruction: "",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:LBY" },
      contextIds: ["wurl:LBY"],
      focus: { lat: 27, lng: 17, altitude: 0.9 },
      feedbackPlaces: [tripoli],
      explanation:
        "Tripoli is the capital of Libya, on its Mediterranean coast.",
    },
    {
      ...base,
      id: "yugoslavia-six",
      label: "Republics",
      topic: "historical geography",
      title: "Six republics, one former federation.",
      prompt:
        "Select the six present-day countries corresponding to Yugoslavia’s six constituent republics.",
      instruction: "",
      mode: "map-multiple",
      rule: { type: "country-ids", ids: YUGOSLAV_REPUBLICS },
      count: 6,
      selection: {
        type: "ids",
        ids: CAPITALS.filter((c) => c.continent === "EU").map(
          (c) => c.countryId,
        ),
      },
      disclosure: {
        ...base.disclosure,
        hoverNames: true,
        committedNames: true,
      },
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      focus: { lat: 44, lng: 19, altitude: 0.85 },
      explanation:
        "Bosnia and Herzegovina, Croatia, North Macedonia, Montenegro, Serbia, and Slovenia correspond to the six constituent republics of socialist Yugoslavia. Macedonia is named North Macedonia today. Kosovo was an autonomous province, not a constituent republic.",
      source: {
        name: "UN ICTY · the former Yugoslavia",
        url: "https://www.icty.org/en/about/what-former-yugoslavia",
        reviewedOn: "2026-10-05",
      },
    },
    {
      ...base,
      id: "mediterranean-shores",
      label: "Sea",
      topic: "coastlines",
      title: "How many shores?",
      prompt: "How many countries have a coastline on the Mediterranean Sea?",
      instruction:
        "Include Palestine and connected Mediterranean seas; exclude overseas dependencies such as Gibraltar.",
      mode: "number",
      inputLabel: "Number of coastal countries",
      rule: { type: "feature-count", featureId: "mediterranean" },
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      places: [
        {
          id: "clue:mediterranean-sea",
          name: "Mediterranean Sea",
          kind: "other",
          lat: 35,
          lng: 18,
          sourceId: "curated:mediterranean-v1",
        },
      ],
      explanation:
        "This convention counts 21 coastal countries listed by UNEP/MAP plus Palestine’s Gaza coastline. The European Union is not a country; Gibraltar is an overseas dependency, not an additional country.",
      source: FEATURES.mediterranean.source,
      sources: [
        FEATURES.mediterranean.source,
        {
          name: "UNRWA · Gaza’s Mediterranean coastline",
          url: "https://www.unrwa.org/careers/duty-stations-gaza",
          reviewedOn: "2026-10-05",
        },
      ],
    },
  ],
};
