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
    "Leave the famous cities behind: discover where capitals moved, why expectations mislead, and when one capital is not enough.",
  rounds: [
    {
      ...base,
      id: "unexpected-turkey-capital",
      leadIn: "Start where the biggest city isn’t the capital.",
      progressLabel: "Türkiye",
      title: "The famous distraction.",
      prompt: "What is the capital of Türkiye?",
      guidance: {
        hint: "Look to inland Anatolia, rather than a city on the coast.",
        assist: {
          text: "Three choices remain. Think beyond the famous city on the Bosporus.",
          candidateIds: ["city:ankara", "city:istanbul", "city:bursa"],
        },
      },
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
        "Istanbul is the largest city, but that doesn’t make it the capital.",
    },
    {
      ...base,
      id: "unexpected-canberra-pin",
      leadIn: "Jump to Australia for another surprise.",
      progressLabel: "Australia",
      title: "Find Canberra.",
      label: "Drop a pin",
      prompt: "Drop a pin within 150 km of Canberra, Australia.",
      guidance: {
        hint: "The capital is inland in southeastern Australia, between Sydney and Melbourne.",
        assist: {
          text: "The shaded area narrows your search to the southeast; its center is not the answer. You still need to land within 150 km.",
          overlays: [
            {
              id: "assist:canberra-search",
              type: "circle",
              center: { lat: -34, lng: 145 },
              radiusKm: 800,
              shade: true,
            },
          ],
        },
      },
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
      sources: [
        source(
          "National Capital Authority · Canberra’s history",
          "https://www.nca.gov.au/education/canberras-history",
        ),
      ],
      explanation:
        "Look inland, between Sydney and Melbourne. The capital isn’t either of the two famous coastal cities.",
    },
    {
      ...base,
      id: "unexpected-abuja",
      leadIn: "Head to West Africa.",
      progressLabel: "Nigeria",
      title: "The capital that moved.",
      prompt:
        "Nigeria moved its capital away from Lagos in 1991. What is its current capital?",
      guidance: {
        hint: "The new capital was planned near the country’s center, making it more accessible from across Nigeria.",
        assist: {
          text: "Its name has five letters and begins with A: A _ _ _ _.",
        },
      },
      instruction: "",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:NGA" },
      contextIds: ["wurl:NGA"],
      focus: { lat: 9, lng: 8, altitude: 0.76 },
      feedbackPlaces: [place("place:2352778"), place("place:2332459")],
      explanation:
        "The move in 1991 took the federal capital inland. Lagos stayed on the coast.",
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
      leadIn: "Cross the Atlantic to Brazil.",
      progressLabel: "Brazil",
      title: "Find Brasília.",
      label: "City",
      prompt: "Which marker is Brasília, Brazil’s capital since 1960?",
      guidance: {
        hint: "Moving the capital was a push toward the interior. Look away from the Atlantic coast, into central Brazil.",
        assist: {
          text: "Three inland candidates remain. Look for the one farther into central Brazil, rather than the cluster in the southeast.",
          candidateIds: ["place:3469058", "place:3448439", "place:3470127"],
        },
      },
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
        "In 1960, the seat of government moved from coastal Rio de Janeiro to a planned city in the interior.",
      source: source(
        "Presidency of Brazil · Law 3,273, capital transfer date",
        "https://www.planalto.gov.br/ccivil_03/leis/l3273.htm",
      ),
    },
    {
      ...base,
      id: "unexpected-south-africa-capitals",
      leadIn: "Finish with more than one capital.",
      progressLabel: "South Africa",
      title: "One country, three capitals.",
      label: "Cities",
      prompt: "Select South Africa’s three national capitals.",
      guidance: {
        hint: "Government is split across three cities: one hosts the administration, one Parliament, and one the Supreme Court of Appeal.",
        assist: {
          text: "Four candidates remain for three roles. A major commercial city is still among them, so don’t select every marker.",
          candidateIds: [...SOUTH_AFRICA_CAPITAL_TARGETS, "place:993800"],
        },
      },
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
        "The three cities serve administrative, legislative, and judicial roles respectively. Our final stop breaks the idea that there must be just one capital.",
      source: source(
        "South African Government · three national capitals",
        "https://www.gov.za/about-sa/south-africas-provinces",
      ),
    },
  ],
};
