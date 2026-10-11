import type { FactSource, Journey, Question } from "./questions";
import { CAPITALS, capitalSource } from "./quizData";
import { mapSource } from "./countryFacts";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-11",
});
const vienna = CAPITALS.find((capital) => capital.countryId === "wurl:AUT")!;
const budapest = CAPITALS.find((capital) => capital.countryId === "wurl:HUN")!;
const basinSource = source(
  "ICPDR · the Danube River Basin",
  "https://www.icpdr.org/danube-basin/danube-river-basin",
);
const base: Question = {
  id: "",
  title: "",
  label: "River",
  topic: "the Danube",
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
  focus: { lat: 47, lng: 18, altitude: 1.1 },
  map: { borders: true, hover: false, muteOthers: true, revealOnAnswer: true },
  source: basinSource,
};

export const DANUBE_JOURNEY: Journey = {
  id: "down-the-danube-v1",
  title: "Down the Danube",
  description:
    "Follow a river that can vanish underground, divide a city, and squeeze between mountains. Five stops carry us from its upper reaches to the sea.",
  rounds: [
    {
      ...base,
      id: "danube-underground-detour-v1",
      label: "Detour",
      title: "The river takes a shortcut.",
      leadIn: "Start near the upper river, in Germany.",
      prompt:
        "Some Danube water sinks underground and resurfaces at the Aach spring. Which other river system carries that water onward?",
      rule: { type: "choice-ids", ids: ["river:rhine"] },
      choices: [
        { id: "river:elbe", label: "Elbe" },
        { id: "river:rhone", label: "Rhône" },
        { id: "river:rhine", label: "Rhine" },
        { id: "river:oder", label: "Oder" },
      ],
      contextIds: ["wurl:DEU"],
      focus: { lat: 48, lng: 9, altitude: 1 },
      explanation:
        "Limestone caves divert some water to a different drainage basin. It takes an underground shortcut while we stay with the Danube above ground.",
      source: source(
        "UNESCO Global Geopark Swabian Alb · Danube seepage",
        "https://www.geopark-alb.de/en/experience-geopark/journey-into-earths-history/detail/the-danube-seepage",
      ),
    },
    {
      ...base,
      id: "danube-vienna-pin-v1",
      label: "Drop a pin",
      title: "The first capital downstream.",
      leadIn: "Follow the river east into Austria.",
      prompt:
        "Our first capital downstream is Vienna. Drop a pin within 80 km of its center.",
      mode: "pin",
      rule: { type: "pin-distance", targetId: vienna.id, radiusKm: 80 },
      disclosure: { ...base.disclosure, namedChoices: false },
      focus: { lat: 48, lng: 13, altitude: 1.2 },
      feedbackFocus: { lat: vienna.lat, lng: vienna.lng, altitude: 0.65 },
      map: {
        borders: false,
        hover: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      explanation:
        "The river runs through the eastern side of the city. Continue downstream: this is only the first capital on our route.",
      source: source(
        "City of Vienna · Danube Island",
        "https://www.wien.gv.at/en/environment/danube-island",
      ),
      sources: [capitalSource],
    },
    {
      ...base,
      id: "danube-two-banks-city-v1",
      label: "Two banks",
      title: "A city made across the river.",
      leadIn: "Continue downstream to two familiar names.",
      prompt:
        "Buda stands on one bank; Pest on the other. What national capital did they become part of in 1873?",
      mode: "text",
      inputLabel: "Capital city",
      rule: { type: "capital-name", countryId: "wurl:HUN" },
      focus: { lat: 47, lng: 19, altitude: 1.1 },
      feedbackPlaces: [budapest],
      feedbackFocus: { lat: budapest.lat, lng: budapest.lng, altitude: 0.7 },
      explanation:
        "The river still divides the city’s two best-known halves. The 1873 union also included Óbuda: the familiar name leaves one founding town out.",
      source: source(
        "Óbuda municipality · the 1873 city union",
        "https://obuda.hu/pest-buda-es-obuda-egyesitesenek-150-evfordulojat-unnepeljuk-november-17-budapest-napja/",
      ),
      sources: [capitalSource],
    },
    {
      ...base,
      id: "danube-iron-gates-border-v1",
      label: "Gorge",
      title: "A river between two countries.",
      leadIn: "Travel southeast into the Iron Gates gorge.",
      prompt:
        "At the Iron Gates, the Danube cuts between mountains and forms a border. Which two countries face each other across the river here?",
      instruction: "Choose two countries.",
      mode: "map-multiple",
      count: 2,
      selection: { type: "members" },
      rule: { type: "country-ids", ids: ["wurl:SRB", "wurl:ROU"] },
      disclosure: {
        ...base.disclosure,
        namedChoices: false,
        committedNames: true,
      },
      focus: { lat: 44, lng: 22, altitude: 1.1 },
      explanation:
        "Dams at the gorge generate power, but block an ancient upstream route for sturgeon. The river is a border for people and a corridor for fish.",
      source: source(
        "ICPDR · restoring fish migration at the Iron Gates",
        "https://www.icpdr.org/tasks-topics/tasks/river-basin-management/sturgeon-conservation/we-pass-facilitating-fish-migration",
      ),
      sources: [mapSource],
    },
    {
      ...base,
      id: "danube-delta-sea-v1",
      label: "Delta",
      title: "One river becomes many channels.",
      leadIn: "Finish where the river fans into a delta.",
      prompt:
        "The Danube splits into three main branches near its mouth. Which sea receives them?",
      rule: { type: "choice-ids", ids: ["sea:black"] },
      choices: [
        { id: "sea:adriatic", label: "Adriatic Sea" },
        { id: "sea:baltic", label: "Baltic Sea" },
        { id: "sea:black", label: "Black Sea" },
        { id: "sea:caspian", label: "Caspian Sea" },
        { id: "sea:aegean", label: "Aegean Sea" },
        { id: "sea:north", label: "North Sea" },
      ],
      focus: { lat: 45, lng: 29, altitude: 1.2 },
      feedbackPlaces: [
        {
          id: "danube:delta",
          name: "Danube Delta",
          kind: "other",
          lat: 45.2,
          lng: 29.5,
          sourceId: "icpdr:river-basin",
        },
      ],
      feedbackFocus: { lat: 45.2, lng: 29.5, altitude: 0.85 },
      explanation:
        "The main river ends in a maze of channels, lakes, and wetlands. The water that stayed above ground has reached a different sea from our underground detour.",
    },
  ],
};
