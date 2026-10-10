import originData from "./data/name-origins.v1.json";
import type { RegionFeature } from "../geography/types";
import type { FactSource, Journey, Question } from "./questions";
import { US_STATES } from "../geography/usStates";
import { CAPITALS } from "./quizData";

const originRegions = originData as RegionFeature[];
const regions = (...ids: string[]) =>
  originRegions.filter((r) => ids.includes(r.id));
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-06",
});
export const NEW_ENGLAND_STATES = ["CT", "ME", "MA", "NH", "RI", "VT"].map(
  (id) => `wurl:USA-${id}`,
);
const base: Question = {
  id: "",
  label: "",
  topic: "place-name origins",
  title: "",
  prompt: "",
  instruction: "",
  mode: "typed-regions",
  rule: { type: "region-ids", ids: [] },
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
  focus: { lat: 14, lng: 24, altitude: 1.65 },
  explanation: "",
  source: source("", ""),
  map: { borders: true, hover: false, muteOthers: true },
};

export const SEVENTH_JOURNEY: Journey = {
  id: "borrowed-names-v1",
  title: "Borrowed names",
  description:
    "Names travel too. A familiar word can connect places on opposite sides of the world.",
  rounds: [
    {
      ...base,
      id: "new-zealand-namesake",
      label: "Namesake",
      title: "Across two oceans.",
      prompt:
        "Which South Pacific country takes its name from the highlighted Dutch coastal province?",
      instruction: "",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:NZL"] },
      selection: { type: "members" },
      commitment: "immediate",
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      importedRegions: regions("wurl:NLD-ZE"),
      contextIds: ["wurl:NLD-ZE"],
      feedbackContextIds: ["wurl:NZL"],
      focus: { lat: 51.5, lng: 3.75, altitude: 0.14 },
      feedbackFocus: { lat: -41.5, lng: 173, altitude: 0.72 },
      explanation:
        "Zeeland. Dutch cartographers named New Zealand after this coastal province of the Netherlands. The Dutch province is Zeeland; the Danish island Zealand is a different place.",
      source: source(
        "Te Ara · Dutch naming of New Zealand",
        "https://teara.govt.nz/en/dutch/page-1",
      ),
    },
    {
      ...base,
      id: "papua-new-guinea-namesake",
      label: "Coast",
      title: "A borrowed coast.",
      prompt:
        "The highlighted country’s main island has a “New” name from an African region. Which African country shares that region’s entire English name?",
      instruction: "",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:GIN"] },
      selection: {
        type: "ids",
        ids: CAPITALS.filter((c) => c.continent === "AF").map(
          (c) => c.countryId,
        ),
      },
      commitment: "immediate",
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      contextIds: ["wurl:PNG"],
      focus: { lat: -6.5, lng: 145, altitude: 0.9 },
      feedbackFocus: { lat: 10.4, lng: -10.9, altitude: 0.5 },
      explanation:
        "Guinea. Íñigo Ortiz de Retes called the island New Guinea in 1545, comparing its inhabitants with those of Africa’s Guinea coast. The namesake was a historical coastal region, not the modern Republic of Guinea. Guinea-Bissau and Equatorial Guinea include additional words and do not fit this clue.",
      source: source(
        "Sociedad Geográfica Española · Ortiz de Retes’s naming account",
        "https://sge.org/publicaciones/articulos/el-pacifico-en-espanol/",
      ),
    },
    {
      ...base,
      id: "new-england-six-states",
      label: "Six states",
      title: "A new England.",
      prompt: "Select the six U.S. states that make up New England.",
      instruction: "",
      mode: "map-multiple",
      count: 6,
      rule: { type: "region-ids", ids: NEW_ENGLAND_STATES },
      importedRegions: US_STATES,
      selection: { type: "ids", ids: US_STATES.map((r) => r.id) },
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
      focus: { lat: 39, lng: -98, altitude: 1.1 },
      feedbackFocus: { lat: 43, lng: -71.5, altitude: 0.5 },
      explanation:
        "New England comprises Connecticut, Maine, Massachusetts, New Hampshire, Rhode Island, and Vermont. New York and New Jersey belong to the Middle Atlantic division, not New England. John Smith applied the name after exploring the coast in 1614.",
      source: source(
        "U.S. Census Bureau · New England’s six states",
        "https://www.census.gov/library/stories/state-by-state/northeast-region.html",
      ),
      sources: [
        source(
          "National Park Service · John Smith’s New England voyage",
          "https://www.nps.gov/jame/learn/historyculture/life-of-john-smith.htm",
        ),
      ],
    },
    {
      ...base,
      id: "new-jersey-namesake",
      label: "Island",
      title: "An island’s American echo.",
      prompt: "Which Channel Island gave the highlighted U.S. state its name?",
      instruction: "",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:JEY"] },
      selection: {
        type: "ids",
        ids: [
          ...CAPITALS.filter((c) => c.continent === "EU").map(
            (c) => c.countryId,
          ),
          "wurl:JEY",
          "wurl:GGY",
          "wurl:IMN",
        ],
      },
      importedRegions: US_STATES.filter((r) => r.id === "wurl:USA-NJ"),
      contextIds: ["wurl:USA-NJ"],
      commitment: "immediate",
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      focus: { lat: 40, lng: -74.5, altitude: 0.36 },
      feedbackFocus: { lat: 49.22, lng: -2.15, altitude: 0.085 },
      explanation:
        "Jersey. New Jersey was named for the Channel Island in 1664, honoring Sir George Carteret, a former governor of Jersey. The island namesake is Jersey, not neighboring Guernsey.",
      source: source(
        "New Jersey Legislature · the state’s island namesake",
        "https://pub.njleg.gov/bills/2014/SR/132_I1.HTM",
      ),
    },
    {
      ...base,
      id: "nuevo-leon-namesake",
      label: "Country",
      title: "An old name in a new country.",
      prompt:
        "Which country has Nuevo León, named after the highlighted Spanish province?",
      instruction: "",
      mode: "map-single",
      rule: { type: "country-ids", ids: ["wurl:MEX"] },
      selection: { type: "members" },
      commitment: "immediate",
      map: {
        borders: true,
        hover: true,
        muteOthers: true,
        candidates: "highlighted",
      },
      importedRegions: regions("wurl:MEX-NLE", "wurl:ESP-LE"),
      contextIds: ["wurl:ESP-LE"],
      feedbackContextIds: ["wurl:MEX-NLE"],
      focus: { lat: 42.6, lng: -5.85, altitude: 0.2 },
      feedbackFocus: { lat: 25.6, lng: -100, altitude: 0.48 },
      explanation:
        "Mexico. Nuevo León is a state in northeastern Mexico, with Monterrey as its capital. Its colonial name, Nuevo Reino de León, borrowed the name of León in Spain.",
      source: source(
        "Mexico’s Secretariat of Public Education · colonial place names",
        "https://nuevaescuelamexicana.sep.gob.mx/contenido/coleccion/4012/",
      ),
      sources: [
        source(
          "Mexican Postal Service · the 1579 New Kingdom of León",
          "https://www.gob.mx/correosdemexico/acciones-y-programas/200-aniversario-de-la-declaratoria-de-nuevo-leon-como-estado-libre-y-soberano",
        ),
      ],
    },
  ],
};
