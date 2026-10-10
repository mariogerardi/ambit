import type { Journey, Question, FactSource } from "./questions";
import { ANSWER_PLACES } from "./answerTargets";
import { capitalSource } from "./quizData";
import flagCatalog from "./data/flags.v1.json";

const place = (id: string) => ANSWER_PLACES.get(id)!;
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-06",
});
export const BRAZIL_CITY_TARGETS = [
  "3469058",
  "3451190",
  "3448439",
  "3450554",
  "3470127",
  "3663517",
].map((id) => `place:${id}`);
export const SOUTH_AFRICA_CITY_TARGETS = [
  "964137",
  "3369157",
  "1018725",
  "993800",
  "1007311",
  "964420",
].map((id) => `place:${id}`);
export const SOUTH_AFRICA_CAPITAL_TARGETS = SOUTH_AFRICA_CITY_TARGETS.slice(
  0,
  3,
);
const base: Question = {
  id: "",
  title: "",
  label: "Capital",
  topic: "capital geography",
  prompt: "",
  instruction: "",
  explanation: "",
  mode: "text",
  rule: { type: "manual-text", answers: [] },
  count: 1,
  selection: { type: "none" },
  commitment: "submit",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  focus: { lat: 20, lng: 0, altitude: 1.3 },
  map: { borders: true, hover: false, muteOthers: true },
  source: capitalSource,
};

export const ELEVENTH_JOURNEY: Journey = {
  id: "not-the-obvious-city-v1",
  title: "Not the obvious city",
  description:
    "The best-known city isn’t always the capital. Find the places behind the familiar names.",
  rounds: [
    {
      ...base,
      id: "unexpected-turkey-capital",
      progressLabel: "Türkiye",
      title: "The famous distraction.",
      prompt: "What is the capital of Türkiye?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["city:ankara"] },
      choices: [
        { id: "city:ankara", label: "Ankara" },
        { id: "city:istanbul", label: "Istanbul" },
        { id: "city:izmir", label: "İzmir" },
        { id: "city:bursa", label: "Bursa" },
        { id: "city:antalya", label: "Antalya" },
        { id: "city:adana", label: "Adana" },
      ],
      image: {
        src: flagCatalog.flags.find((f) => f.countryId === "wurl:TUR")!.src,
        alt: "Türkiye’s flag: a white crescent and star on red.",
        feedbackAlt: "National flag of Türkiye",
      },
      focus: { lat: 39, lng: 34, altitude: 0.82 },
      contextIds: ["wurl:TUR"],
      feedbackFocus: { lat: 40.4, lng: 31, altitude: 0.38 },
      feedbackContextIds: ["wurl:TUR"],
      feedbackPlaces: [place("place:323786"), place("place:745044")],
      explanation:
        "Ankara is Türkiye’s capital. Istanbul, the metropolis spanning Europe and Asia, is its largest city.",
    },
    {
      ...base,
      id: "unexpected-canberra-pin",
      progressLabel: "Australia",
      title: "Find Canberra.",
      label: "Drop a pin",
      prompt: "Drop a pin within 150 km of Canberra, Australia.",
      instruction: "",
      mode: "pin",
      rule: { type: "pin-distance", targetId: "place:2172517", radiusKm: 150 },
      focus: { lat: -26, lng: 134, altitude: 1.02 },
      contextIds: ["wurl:AUS"],
      map: {
        borders: false,
        borderIds: ["wurl:AUS"],
        hover: false,
        muteOthers: true,
      },
      feedbackContextIds: ["wurl:AUS"],
      feedbackPlaces: [place("place:2147714"), place("place:2158177")],
      explanation:
        "Canberra is inland in southeastern Australia, between Sydney and Melbourne.",
    },
    {
      ...base,
      id: "unexpected-abuja",
      progressLabel: "Nigeria",
      title: "The capital that moved.",
      prompt:
        "Nigeria moved its capital away from Lagos in 1991. What is its current capital?",
      instruction: "",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:NGA" },
      contextIds: ["wurl:NGA"],
      focus: { lat: 9, lng: 8, altitude: 0.76 },
      feedbackPlaces: [place("place:2352778"), place("place:2332459")],
      explanation:
        "Abuja replaced Lagos as Nigeria’s capital in 1991. It was developed inland as a planned federal capital. Lagos remains on the coast.",
      source: source(
        "Federal Capital Development Authority · history of Abuja",
        "https://fcda.gov.ng/the-history-of-abuja/",
      ),
      sources: [
        source(
          "World Bank · Abuja’s capital relocation",
          "https://documents.worldbank.org/curated/en/929431468063249516/pdf/SFG1989-RP-P103499-Box394881B-PUBLIC-Disclosed-3-28-2016.pdf",
        ),
      ],
    },
    {
      ...base,
      id: "unexpected-brasilia-marker",
      progressLabel: "Brazil",
      title: "Find Brasília.",
      label: "City",
      prompt: "Which marker is Brasília, Brazil’s capital since 1960?",
      instruction: "",
      mode: "city-single",
      rule: { type: "place-ids", ids: ["place:3469058"] },
      selection: { type: "ids", ids: BRAZIL_CITY_TARGETS },
      commitment: "immediate",
      contextIds: ["wurl:BRA"],
      feedbackContextIds: ["wurl:BRA"],
      focus: { lat: -13, lng: -54, altitude: 1.05 },
      feedbackFocus: { lat: -15, lng: -51, altitude: 0.82 },
      feedbackPlaces: [
        { ...place("place:3469058"), priority: 100 },
        { ...place("place:3451190"), visualState: "hinted", priority: 90 },
      ],
      explanation:
        "Brasília became Brazil’s capital on April 21, 1960, moving the seat of government from coastal Rio de Janeiro to the interior.",
      source: source(
        "Presidency of Brazil · Law 3,273, capital transfer date",
        "https://www.planalto.gov.br/ccivil_03/leis/l3273.htm",
      ),
    },
    {
      ...base,
      id: "unexpected-south-africa-capitals",
      progressLabel: "South Africa",
      title: "One country, three capitals.",
      label: "Cities",
      prompt: "Select South Africa’s three national capitals.",
      instruction: "",
      mode: "city-multiple",
      count: 3,
      rule: { type: "place-ids", ids: SOUTH_AFRICA_CAPITAL_TARGETS },
      selection: { type: "ids", ids: SOUTH_AFRICA_CITY_TARGETS },
      disclosure: {
        ...base.disclosure,
        namedChoices: true,
        hoverNames: true,
        committedNames: true,
      },
      contextIds: ["wurl:ZAF"],
      feedbackContextIds: ["wurl:ZAF"],
      focus: { lat: -28.5, lng: 25, altitude: 0.42 },
      feedbackPlaces: [
        { ...place("place:964137"), name: "Pretoria · administrative" },
        { ...place("place:3369157"), name: "Cape Town · legislative" },
        { ...place("place:1018725"), name: "Bloemfontein · judicial" },
      ],
      explanation:
        "The South African government identifies Pretoria as the administrative capital, Cape Town as the legislative capital, and Bloemfontein as the judicial capital, home to the Supreme Court of Appeal. Johannesburg, Durban, and Gqeberha are not among the three.",
      source: source(
        "South African Government · three national capitals",
        "https://www.gov.za/about-sa/south-africas-provinces",
      ),
    },
  ],
};
