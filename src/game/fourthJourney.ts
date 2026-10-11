import { defineQuestion, definePresentation } from "./questionBuilder";
import type { Journey } from "./questions";
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
const base = definePresentation({
  label: "",
  topic: "",
  instruction: "",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  failure: "feedback",
  focus: { lat: 36, lng: 17, altitude: 1.4 },
  source: capitalSource,
  map: { borders: true, hoverFeedback: false, muteOthers: true },
});
export const FOURTH_JOURNEY: Journey = {
  id: "mediterranean-v1",
  title: "Around the Mediterranean",
  description:
    "Follow the Mediterranean from Spain to an Italian island, across to Libya, and back to the Balkans. Five stops, one shared sea.",
  rounds: [
    defineQuestion({
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "spain-regional-languages",
      leadIn: "Begin on Spain’s Mediterranean shore.",
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
        "Regional languages share official status with Spanish; Catalonia and the Basque Country are two examples.",
      source: {
        name: "Spain Ministry of Territorial Policy · official languages",
        url: "https://mptmd.gob.es/en/portal/politica-territorial/autonomica/lenguas-cooficiales",
        reviewedOn: "2026-10-05",
      },
    }),
    defineQuestion({
      mode: "choice-single",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "italy-sicily",
      leadIn: "Sail east toward Italy.",
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
        "The Mediterranean’s largest island sits just beyond the toe of Italy.",
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
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "libya-capital",
      leadIn: "Cross to the southern shore.",
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
        "On Libya’s Mediterranean coast, this city ties our southern stop back to the same sea.",
    }),
    defineQuestion({
      commitment: "submit",

      ...base,
      id: "yugoslavia-six",
      leadIn: "Head north toward the Adriatic.",
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
        hoverFeedback: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      focus: { lat: 44, lng: 19, altitude: 0.85 },
      explanation:
        "These were Yugoslavia’s six constituent republics. Kosovo was an autonomous province, so it isn’t part of this set.",
      source: {
        name: "UN ICTY · the former Yugoslavia",
        url: "https://www.icty.org/en/about/what-former-yugoslavia",
        reviewedOn: "2026-10-05",
      },
    }),
    defineQuestion({
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      ...base,
      id: "mediterranean-shores",
      leadIn: "Zoom out to the whole sea.",
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
        hoverFeedback: false,
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
        "One sea connects Europe, Africa, and Asia. This total includes Palestine’s Gaza coast, but not overseas dependencies.",
      source: FEATURES.mediterranean.source,
      sources: [
        FEATURES.mediterranean.source,
        {
          name: "UNRWA · Gaza’s Mediterranean coastline",
          url: "https://www.unrwa.org/careers/duty-stations-gaza",
          reviewedOn: "2026-10-05",
        },
      ],
    }),
  ],
};
