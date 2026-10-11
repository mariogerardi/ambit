import type { Journey, Question, FactSource } from "./questions";
import { ANSWER_PLACES } from "./answerTargets";
import { capitalSource } from "./quizData";
import flagCatalog from "./data/flags.v1.json";

const place = (id: string) => ANSWER_PLACES.get(id)!;
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
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
  map: {
    borders: true,
    hover: false,
    muteOthers: true,
    feedbackRegions: "neutral",
  },
  feedbackContextIds: [],
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
      leadIn: "Start where the famous city isn’t the capital.",
      progressLabel: "Türkiye",
      resolvedLabel: "Ankara",
      label: "Famous city",
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
      feedbackHintIds: ["wurl:TUR"],
      feedbackPlaces: [
        {
          ...place("place:323786"),
          name: "Ankara · capital since 1923",
          visualState: "answer",
          priority: 100,
        },
        {
          ...place("place:745044"),
          name: "Istanbul · famous city",
          visualState: "hinted",
          priority: 90,
        },
      ],
      explanation:
        "The inland city was chosen as the capital in 1923, just before the republic was proclaimed. A familiar name isn’t always the seat of government.",
      source: source(
        "Türkiye Ministry of Culture and Tourism · 1923 chronology",
        "https://www.ktb.gov.tr/EN-103934/1923.html",
      ),
      sources: [capitalSource],
    },
    {
      ...base,
      id: "unexpected-canberra-pin",
      progressLabel: "Australia",
      resolvedLabel: "Canberra",
      title: "Find Canberra.",
      label: "Planned capital",
      prompt: "Drop a pin in Canberra, Australia.",
      guidance: {
        hint: "The capital is inland in southeastern Australia, between Sydney and Melbourne.",
        assist: {
          text: "Sydney and Melbourne are now marked. Look inland between them; Canberra itself is still unmarked. Land within 150 km of its center.",
          places: [
            { ...place("place:2147714"), visualState: "hinted", priority: 95 },
            { ...place("place:2158177"), visualState: "hinted", priority: 95 },
          ],
        },
      },
      instruction: "Land within 150 km of the city center.",
      mode: "pin",
      rule: { type: "pin-distance", targetId: "place:2172517", radiusKm: 150 },
      focus: { lat: -26, lng: 134, altitude: 1.02 },
      contextIds: ["wurl:AUS"],
      map: {
        borders: false,
        borderIds: ["wurl:AUS"],
        hover: false,
        muteOthers: true,
        feedbackRegions: "neutral",
      },
      feedbackHintIds: ["wurl:AUS"],
      feedbackFocus: { lat: -35.3, lng: 148.5, altitude: 0.4 },
      feedbackPlaces: [
        {
          ...place("place:2172517"),
          name: "Canberra · purpose-built capital",
          priority: 100,
        },
        {
          ...place("place:2147714"),
          name: "Sydney · reference city",
          visualState: "hinted",
          priority: 90,
        },
        {
          ...place("place:2158177"),
          name: "Melbourne · reference city",
          visualState: "hinted",
          priority: 90,
        },
      ],
      sources: [
        source(
          "National Capital Authority · Federation and the national capital",
          "https://www.nca.gov.au/education/canberras-history/federation-and-national-capital",
        ),
      ],
      explanation:
        "The site had to be at least 100 miles from Sydney. A purpose-built inland capital avoided choosing either of the two rival cities.",
    },
    {
      ...base,
      id: "unexpected-abuja",
      progressLabel: "Nigeria",
      resolvedLabel: "Abuja",
      label: "Capital move",
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
      feedbackHintIds: ["wurl:NGA"],
      feedbackFocus: { lat: 7.8, lng: 5.3, altitude: 0.4 },
      feedbackPlaces: [
        {
          ...place("place:2352778"),
          name: "Abuja · planned capital",
          visualState: "answer",
          priority: 100,
        },
        {
          ...place("place:2332459"),
          name: "Lagos · former capital",
          visualState: "hinted",
          priority: 90,
        },
      ],
      explanation:
        "The new city offered room to grow and a central location accessible from across Nigeria, away from the crowded former capital on the coast.",
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
      resolvedLabel: "Brasília",
      title: "Find Brasília.",
      label: "New capital",
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
      feedbackHintIds: ["wurl:BRA"],
      focus: { lat: -13, lng: -54, altitude: 1.05 },
      feedbackFocus: { lat: -15, lng: -51, altitude: 0.82 },
      feedbackPlaces: [
        {
          ...place("place:3469058"),
          name: "Brasília · planned capital",
          priority: 100,
        },
        {
          ...place("place:3451190"),
          name: "Rio de Janeiro · former capital",
          visualState: "hinted",
          priority: 90,
        },
      ],
      explanation:
        "In 1960, the seat of government moved from coastal Rio de Janeiro to a planned city in the interior.",
      source: source(
        "Presidency of Brazil · Law 3,273, capital transfer date",
        "https://www.planalto.gov.br/ccivil_03/leis/l3273.htm",
      ),
      sources: [
        source(
          "IPHAN · Brasília, a purpose-built capital",
          "https://www.gov.br/iphan/pt-br/superintendencias/distrito-federal/patrimonio-mundial",
        ),
      ],
    },
    {
      ...base,
      id: "unexpected-south-africa-capitals",
      leadIn: "Finish with more than one capital.",
      progressLabel: "South Africa",
      resolvedLabel: "Pretoria, Cape Town & Bloemfontein",
      title: "One country, three capitals.",
      label: "Three capitals",
      prompt: "Select South Africa’s three national capitals.",
      guidance: {
        hint: "Look for Parliament on the southwest coast. The administrative and judicial capitals are inland.",
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
      feedbackHintIds: ["wurl:ZAF"],
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
  completion: {
    focus: { lat: -15, lng: 25, altitude: 1.8 },
    views: [
      { lat: 39, lng: 32, altitude: 1.6 },
      { lat: -30, lng: 149, altitude: 1.6 },
      { lat: 9, lng: 8, altitude: 1.6 },
      { lat: -15, lng: -47, altitude: 1.6 },
      { lat: -28, lng: 25, altitude: 0.55 },
    ],
    physicalFeatures: [],
    places: [
      "place:323786",
      "place:2172517",
      "place:2352778",
      "place:3469058",
      ...SOUTH_AFRICA_CAPITAL_TARGETS,
    ].map((id) => ({
      ...place(id),
      kind: "capital",
      visualState: "answer",
      priority: 100,
      labelFlexible: true,
    })),
    caption:
      "Famous cities, coastal hubs and former capitals can all mislead. Sometimes even the idea of one capital falls short.",
  },
};
