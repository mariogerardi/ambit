import type { Question } from "./questions";
import {
  CAPITALS,
  FEATURES,
  LANGUAGES,
  capitalSource,
  languageSource,
} from "./quizData";
const amman = CAPITALS.find((c) => c.name === "Amman")!;
const base: Question = {
  title: "",
  id: "",
  label: "",
  topic: "",
  prompt: "",
  instruction: "",
  mode: "map-single",
  rule: { type: "country-ids", ids: [] },
  count: 1,
  selection: { type: "members" },
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: true,
    previousVisits: false,
  },
  commitment: "immediate",
  failure: "feedback",
  focus: { lat: 14, lng: 24, altitude: 1.65 },
  explanation: "",
  source: capitalSource,
};

export const mapleFlagQuestion: Question = {
  ...base,
  id: "flag-maple",
  label: "Flag",
  topic: "flags",
  title: "A flag, a place.",
  prompt: "Which country flies this flag?",
  instruction: "",
  rule: { type: "flag-country", countryId: "wurl:CAN" },
  image: {
    src: "/flags/clue-01.svg",
    alt: "Flag clue: red side panels and an eleven-point red maple leaf on white.",
    feedbackAlt: "National flag of Canada",
  },
  explanation: "Canada flies this red-and-white maple leaf flag.",
  source: {
    name: "Government of Canada · national flag",
    url: "https://www.canada.ca/en/canadian-heritage/services/flag-canada-description.html",
    reviewedOn: "2026-10-05",
  },
};

export const canadianLanguagesQuestion: Question = {
  ...base,
  id: "canada-languages",
  label: "Languages",
  topic: "official languages",
  title: "One country, two languages.",
  prompt: "Which two languages are official at Canada’s federal level?",
  instruction: "",
  mode: "choice-multiple",
  rule: { type: "official-languages", countryId: "wurl:CAN", match: "all" },
  count: 2,
  choices: LANGUAGES,
  selection: { type: "none" },
  contextIds: ["wurl:CAN"],
  map: { borders: true, hover: false, muteOthers: true },
  focus: { lat: 55, lng: -95, altitude: 1.5 },
  commitment: "submit",
  explanation:
    "These are the federal official languages; provincial and regional language policies are separate.",
  source: languageSource,
};

export const andesCountriesQuestion: Question = {
  qualification:
    "Andean countries follow the UN Environment list. The highlighted mountain shape is a visual guide.",
  ...base,
  id: "andes-three",
  label: "Mountains",
  topic: "physical geography",
  title: "Follow the spine.",
  prompt: "Select any three UN member countries the Andes run through.",
  instruction: "",
  mode: "map-multiple",
  rule: { type: "physical-feature", featureId: "andes", match: "any" },
  count: 3,
  selection: {
    type: "ids",
    ids: CAPITALS.filter((c) => c.continent === "SA").map((c) => c.countryId),
  },
  disclosure: { ...base.disclosure, hoverNames: true },
  commitment: "submit",
  focus: { lat: -20, lng: -65, altitude: 1.5 },
  explanation: "Any three of these seven countries count.",
  source: FEATURES.andes.source,
};

export const africanLatitudeQuestion: Question = {
  qualification:
    "We compare one primary capital per UN member state using GeoNames coordinates, downloaded in October 2026.",
  ...base,
  id: "africa-north-amman",
  label: "Latitude",
  topic: "latitude",
  title: "Further north than you think.",
  prompt: "Name an African capital city farther north than Amman, Jordan.",
  instruction: "The line marks Amman’s latitude.",
  mode: "text",
  inputLabel: "African capital",
  rule: {
    type: "capital-coordinate",
    referenceId: amman.id,
    direction: "north",
    continent: "AF",
  },
  selection: { type: "none" },
  contextIds: ["wurl:JOR"],
  disclosure: { ...base.disclosure, committedNames: false },
  commitment: "submit",
  focus: { lat: 22, lng: 22, altitude: 1.5 },
  places: [amman],
  overlays: [
    { id: "overlay:amman-latitude", type: "parallel", latitude: amman.lat },
  ],
  source: capitalSource,
};
