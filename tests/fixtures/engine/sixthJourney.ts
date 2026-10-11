import territoryData from "./data/enclosed-territories.v1.json";
import type { RegionFeature } from "../../../src/geography/types";
import type { FactSource, Journey, Question } from "../../../src/game/questions";

// Small pinned subset of the same canonical regions used by Explore. Do not
// ship or triangulate every Russian/Australian subdivision for these clues.
const territories = territoryData as RegionFeature[];
const regions = (...ids: string[]) =>
  territories.filter((r) => ids.includes(r.id));
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-06",
});
const base: Question = {
  id: "",
  label: "",
  topic: "enclaves and exclaves",
  title: "",
  prompt: "",
  instruction: "",
  mode: "text",
  rule: { type: "manual-text", answers: [] },
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
  focus: { lat: 0, lng: 0, altitude: 1.4 },
  explanation: "",
  source: source("", ""),
  map: { borders: true, hover: false, muteOthers: true },
};

export const SIXTH_JOURNEY: Journey = {
  id: "enclosed-territories-v1",
  title: "Worlds within worlds",
  description:
    "A place can be surrounded, separated, or connected in ways a first glance misses.",
  rounds: [
    {
      ...base,
      id: "enclosed-lesotho",
      label: "Kingdom",
      title: "A kingdom within a country.",
      prompt:
        "The highlighted kingdom is entirely surrounded by South Africa. What is its name?",
      instruction: "",
      inputLabel: "Country",
      rule: { type: "manual-text", answers: ["Lesotho", "Kingdom of Lesotho"] },
      contextIds: ["wurl:LSO"],
      focus: { lat: -29.5, lng: 28.2, altitude: 0.45 },
      explanation:
        "Lesotho is an independent kingdom whose entire land border is with South Africa.",
      source: source(
        "Government of Lesotho · national circumstances",
        "https://www.gov.ls/wp-content/uploads/2022/03/Lesotho-Biennial-Update-Report.pdf",
      ),
    },
    {
      ...base,
      id: "leningrad-surrounded-city",
      label: "City",
      title: "A city on the gulf.",
      prompt:
        "Which Russian city is surrounded on land by the highlighted Leningrad Oblast?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["wurl:RUS-SPE"] },
      choices: [
        { id: "city:moscow", label: "Moscow" },
        { id: "city:kazan", label: "Kazan" },
        { id: "wurl:RUS-SPE", label: "Saint Petersburg" },
        { id: "city:pskov", label: "Pskov" },
        { id: "city:novgorod", label: "Veliky Novgorod" },
        { id: "city:petrozavodsk", label: "Petrozavodsk" },
      ],
      importedRegions: regions("wurl:RUS-LEN", "wurl:RUS-SPE"),
      contextIds: ["wurl:RUS-LEN"],
      feedbackContextIds: ["wurl:RUS-SPE"],
      focus: { lat: 60, lng: 30.9, altitude: 0.3 },
      feedbackPlaces: [
        {
          id: "reveal:saint-petersburg",
          name: "Saint Petersburg",
          kind: "city",
          lat: 59.9386,
          lng: 30.3141,
          parentId: "wurl:RUS",
          sourceId: "curated:saint-petersburg-v1",
        },
      ],
      explanation:
        "Saint Petersburg is a separate federal city. Leningrad Oblast surrounds it on land; its coast opens onto the Gulf of Finland, so it is not completely enclosed by land.",
      source: source(
        "Saint Petersburg regional geography research · Baltic Region",
        "https://balticregion.kantiana.ru/upload/iblock/cf3/2-Degusarova_19-40.pdf",
      ),
    },
    {
      ...base,
      id: "temburong-owner",
      label: "Exclave",
      title: "Across the divide.",
      prompt:
        "The highlighted district, Temburong, is separated from its country’s main territory by Malaysia. Which country does it belong to?",
      instruction: "",
      mode: "choice-single",
      rule: { type: "choice-ids", ids: ["wurl:BRN"] },
      choices: [
        { id: "wurl:IDN", label: "Indonesia" },
        { id: "wurl:MYS", label: "Malaysia" },
        { id: "wurl:PHL", label: "Philippines" },
        { id: "wurl:BRN", label: "Brunei" },
        { id: "wurl:SGP", label: "Singapore" },
        { id: "wurl:TLS", label: "Timor-Leste" },
      ],
      importedRegions: regions("wurl:BRN-TE"),
      contextIds: ["wurl:BRN-TE"],
      feedbackContextIds: ["wurl:BRN-TE"],
      focus: { lat: 4.65, lng: 115.05, altitude: 0.09 },
      explanation:
        "Temburong is Brunei’s easternmost district, separated from the rest of Brunei by Sarawak and Brunei Bay. A bridge across the bay now connects the two parts by road.",
      source: source(
        "Brunei Tourism · Temburong district brochure",
        "https://www.bruneitourism.com/wp-content/uploads/2025/03/Brunei-Tourism-Temburong-Brochure-3.pdf",
      ),
    },
    {
      ...base,
      id: "act-surrounding-state",
      label: "Territory",
      title: "A capital inside a state.",
      prompt:
        "Which Australian state completely surrounds the highlighted Australian Capital Territory?",
      instruction: "",
      inputLabel: "Australian state",
      mode: "typed-regions",
      rule: { type: "region-ids", ids: ["wurl:AUS-NSW"] },
      importedRegions: regions("wurl:AUS-ACT", "wurl:AUS-NSW").map((r) =>
        r.id === "wurl:AUS-NSW"
          ? { ...r, aliases: [...(r.aliases ?? []), "NSW"] }
          : r,
      ),
      contextIds: ["wurl:AUS-ACT"],
      focus: { lat: -35.5, lng: 149, altitude: 0.14 },
      explanation:
        "New South Wales surrounds the Australian Capital Territory, where Canberra is located.",
      source: source(
        "Australian Government · Old Parliament House heritage listing",
        "https://www.legislation.gov.au/F2021L01868/asmade/2021-12-21/text/original/pdf",
      ),
    },
    {
      ...base,
      id: "kaliningrad-land-neighbors",
      label: "Ownership",
      title: "An exclave on the Baltic.",
      prompt:
        "Bordered on land by Lithuania and Poland, which country does the highlighted exclave belong to?",
      instruction: "",
      inputLabel: "Country",
      rule: {
        type: "manual-text",
        answers: ["Russia", "Russian Federation", "The Russian Federation"],
      },
      importedRegions: regions("wurl:RUS-KGD"),
      contextIds: ["wurl:RUS-KGD"],
      feedbackContextIds: ["wurl:RUS-KGD", "wurl:RUS"],
      focus: { lat: 54.8, lng: 21.3, altitude: 0.45 },
      explanation:
        "Russia. The highlighted exclave is Kaliningrad, separated from the rest of Russia. Its only land neighbors are Lithuania and Poland, and it has a Baltic Sea coast.",
      source: source(
        "Council of Europe · Kaliningrad’s geographic situation",
        "https://pace.coe.int/en/files/17041/html",
      ),
    },
  ],
};
