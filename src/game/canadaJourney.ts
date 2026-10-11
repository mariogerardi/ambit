import { SECOND_JOURNEY } from "./secondJourney";
import { CAPITALS, capitalSource } from "./quizData";
import type { Journey, Question } from "./questions";

const base: Question = {
  ...SECOND_JOURNEY.rounds[1],
  mode: "choice-single",
  count: 1,
  source: capitalSource,
};
const regionsSource = {
  name: "Government of Canada · Canada’s regions",
  url: "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada/read-online/canadas-regions.html",
  reviewedOn: "2026-10-11",
};
export const CANADA_JOURNEY: Journey = {
  id: "beyond-the-maple-leaf-v1",
  title: "Beyond the maple leaf",
  description:
    "Start with a familiar flag, follow Canada’s two official languages to the east coast, then travel through its capital to the Arctic shore.",
  rounds: [
    {
      ...SECOND_JOURNEY.rounds[0],
      id: "canada-maple-flag-v1",
      leadIn: "Our first stop begins with a familiar leaf.",
      explanation:
        "The maple leaf is the national symbol at the heart of this flag.",
    },
    {
      ...SECOND_JOURNEY.rounds[1],
      id: "canada-federal-languages-v1",
      leadIn: "One flag, more than one official voice.",
      explanation:
        "Both have equal status in federal institutions. Provincial language policies differ.",
    },
    {
      ...base,
      id: "canada-bilingual-province-v1",
      label: "Province",
      topic: "official languages",
      title: "Two voices on the Atlantic coast.",
      leadIn:
        "Head east, where federal bilingualism has a provincial counterpart.",
      prompt:
        "Which Canadian province is officially bilingual in English and French?",
      rule: { type: "choice-ids", ids: ["province:nb"] },
      choices: [
        { id: "province:qc", label: "Quebec" },
        { id: "province:on", label: "Ontario" },
        { id: "province:nb", label: "New Brunswick" },
        { id: "province:ns", label: "Nova Scotia" },
        { id: "province:mb", label: "Manitoba" },
        { id: "province:nl", label: "Newfoundland and Labrador" },
      ],
      focus: { lat: 46, lng: -67, altitude: 0.65 },
      explanation:
        "It’s the only province with both as official languages, rather than simply a bilingual population.",
      source: {
        name: "Government of New Brunswick · basic facts",
        url: "https://www.gnb.ca/en/admin/about-nb/basic-facts.html",
        reviewedOn: "2026-10-11",
      },
    },
    {
      ...base,
      id: "canada-ottawa-v1",
      label: "Capital",
      topic: "capitals",
      title: "Back to the federal seat.",
      leadIn: "Turn inland to the city where those federal institutions meet.",
      prompt: "What is the capital of Canada?",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:CAN" },
      choices: undefined,
      focus: { lat: 53, lng: -96, altitude: 1.1 },
      feedbackPlaces: [
        CAPITALS.find((capital) => capital.countryId === "wurl:CAN")!,
      ],
      explanation:
        "The federal capital sits in Ontario, beside Quebec—not in Toronto or Montreal.",
      source: regionsSource,
    },
    {
      ...base,
      id: "canada-arctic-shore-v1",
      label: "Ocean",
      topic: "coastlines",
      title: "The northern edge.",
      leadIn: "Finish far north, where Canada’s islands meet the sea.",
      prompt: "Which ocean borders Canada to the north?",
      rule: { type: "choice-ids", ids: ["ocean:arctic"] },
      choices: [
        { id: "ocean:pacific", label: "Pacific Ocean" },
        { id: "ocean:atlantic", label: "Atlantic Ocean" },
        { id: "ocean:arctic", label: "Arctic Ocean" },
        { id: "ocean:indian", label: "Indian Ocean" },
        { id: "ocean:southern", label: "Southern Ocean" },
      ],
      focus: { lat: 73, lng: -105, altitude: 1.05 },
      explanation:
        "Canada reaches three oceans: this northern shore completes the trio with the Atlantic and Pacific.",
      source: regionsSource,
    },
  ],
};
