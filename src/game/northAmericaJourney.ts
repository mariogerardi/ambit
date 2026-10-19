import { defineQuestion, definePresentation } from "./questionBuilder";
import { geoBounds } from "d3-geo";
import { US_STATES } from "../geography/usStates";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { FactSource, Journey, Question } from "./questionContracts";

export { US_STATES } from "../geography/usStates";
import {
  CANADIAN_SUBDIVISIONS,
  CANADIAN_TERRITORIES,
  CANADIAN_PROVINCES as provinces,
} from "./canadianRegions";
export { CANADIAN_TERRITORIES } from "./canadianRegions";
const boston = {
  id: "place:4930956",
  name: "Boston",
  kind: "city" as const,
  lat: 42.35843,
  lng: -71.05977,
  parentId: "wurl:USA",
  sourceId: "geonames:4930956",
};
export const PROVINCES_SOUTH_OF_BOSTON = provinces
  .filter((r) => geoBounds(sphericalGeometry(r.geometry))[0][1] < boston.lat)
  .map((r) => r.id);
export const MEXICO_BORDER_STATES = ["CA", "AZ", "NM", "TX"].map(
  (code) => `wurl:USA-${code}`,
);
export const CARDINAL_STATES = US_STATES.filter((r) =>
  /\b(north|south|east|west)\b/i.test(r.name),
).map((r) => r.id);
const subdivisionSource: FactSource = {
  name: "Natural Earth · pinned administrative subdivisions",
  url: "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
  reviewedOn: "2026-10-05",
};
const base = definePresentation({
  label: "",
  topic: "North American geography",
  instruction: "",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  failure: "feedback",
  focus: { lat: 46, lng: -98, altitude: 0.95 },
  source: subdivisionSource,
  map: {
    borders: true,
    hoverFeedback: true,
    muteOthers: true,
    candidates: "highlighted",
  },
});
export const NORTH_AMERICA_JOURNEY: Journey = {
  id: "north-america-v2",
  addedAt: "2026-10-10",
  availability: "pool",
  title: "North America by name",
  description:
    "From Canada’s far north to the southern states, names and borders offer a new way to read the map.",
  rounds: (
    [
      defineQuestion({
        commitment: "submit",

        ...base,
        id: "canada-three-territories",
        label: "Territories",
        title: "Canada’s far north.",
        prompt: "Name one of Canada’s three northern territories.",
        instruction: "",
        mode: "typed-regions",
        inputLabel: "Territory",
        count: 1,
        rule: { type: "region-ids", ids: CANADIAN_TERRITORIES, match: "any" },
        selection: { type: "none" },
        importedRegions: CANADIAN_SUBDIVISIONS,
        explanation:
          "Yukon, Northwest Territories, and Nunavut are Canada’s three territories; its other ten subdivisions are provinces.",
        source: {
          name: "Government of Canada · provinces and territories",
          url: "https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html",
          reviewedOn: "2026-10-05",
        },
        scenes: {
          play: {
            candidateRegionIds: CANADIAN_TERRITORIES,
            map: {
              borders: true,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
              candidates: undefined,
            },
            focus: { lat: 64, lng: -108, altitude: 1.1 },
          },
        },
      }),
      defineQuestion({
        count: 1,
        commitment: "submit",

        qualification: "Province boundaries are simplified from Natural Earth.",
        ...base,
        id: "canada-south-of-boston",
        label: "Latitude",
        title: "A northern latitude check.",
        prompt:
          "Which Canadian province has some land south of Boston’s latitude?",
        instruction: "The line marks Boston’s latitude.",
        mode: "typed-regions",
        inputLabel: "Province",
        rule: {
          type: "region-ids",
          ids: PROVINCES_SOUTH_OF_BOSTON,
          match: "any",
        },
        selection: { type: "none" },
        importedRegions: CANADIAN_SUBDIVISIONS,
        explanation:
          "Ontario extends south of Boston’s latitude (about 42.36° N), including the Point Pelee area.",
        sources: [
          subdivisionSource,
          {
            name: "GeoNames · Boston coordinates",
            url: "https://www.geonames.org/4930956/boston.html",
            reviewedOn: "2026-10-05",
          },
        ],
        scenes: {
          play: {
            candidateRegionIds: provinces.map((r) => r.id),
            map: {
              borders: true,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
              candidates: undefined,
            },
            focus: { lat: 48, lng: -90, altitude: 0.9 },
            places: [boston],
            overlays: [
              { id: "boston-latitude", type: "parallel", latitude: boston.lat },
            ],
          },
        },
      }),
      defineQuestion({
        commitment: "submit",

        ...base,
        id: "state-bordering-mexico",
        label: "Southern border",
        title: "Across the southern border.",
        prompt: "Name a U.S. state that borders Mexico.",
        instruction: "State borders are hidden. Name a state from memory.",
        mode: "typed-regions",
        inputLabel: "State",
        count: 1,
        rule: { type: "region-ids", ids: MEXICO_BORDER_STATES, match: "any" },
        selection: { type: "none" },
        importedRegions: US_STATES,
        explanation:
          "Four states meet Mexico along the southern border. Any one qualifies.",
        source: {
          name: "U.S. Customs and Border Protection · Southwest Region",
          url: "https://www.cbp.gov/sites/default/files/2025-07/250728%20AMO%20Southwest%20Region_0.pdf",
          reviewedOn: "2026-10-05",
        },
        scenes: {
          play: {
            map: {
              borders: false,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
              candidates: undefined,
            },
            focus: { lat: 32, lng: -106, altitude: 1.3 },
          },
        },
      }),
      defineQuestion({
        count: 1,
        selection: { type: "none" },
        commitment: "submit",

        qualification:
          "Routes use Natural Earth state boundaries. The result describes geography, not a driving itinerary.",
        ...base,
        id: "california-missouri-crossings",
        label: "Crossings",
        title: "The shortest state route.",
        prompt:
          "What is the fewest number of state border crossings from California to Missouri?",
        instruction:
          "State borders are hidden; count the crossings from memory. Stay within the United States. States meeting at a single point don’t count.",
        mode: "number",
        inputLabel: "State border crossings",
        rule: {
          type: "shortest-borders",
          from: "wurl:USA-CA",
          to: "wurl:USA-MO",
        },
        importedRegions: US_STATES,
        explanation:
          "Only shared land borders count; states meeting at a single point are not neighbors.",
        scenes: {
          play: {
            contextIds: ["wurl:USA-CA", "wurl:USA-MO"],
            map: {
              borders: false,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
              candidates: undefined,
            },
            focus: { lat: 37, lng: -104, altitude: 0.85 },
          },
        },
      }),
      defineQuestion({
        mode: "map-multiple",
        commitment: "submit",

        ...base,
        id: "five-cardinal-states",
        label: "Directions",
        title: "Five names, four directions.",
        prompt:
          "Select the five U.S. states with North, South, East, or West in their name.",
        instruction: "",
        count: 5,
        rule: { type: "region-ids", ids: CARDINAL_STATES },
        selection: { type: "ids", ids: US_STATES.map((r) => r.id) },
        importedRegions: US_STATES,
        explanation:
          "North Carolina, South Carolina, North Dakota, South Dakota, and West Virginia. No U.S. state has East in its name.",
        scenes: { play: { focus: { lat: 39, lng: -97, altitude: 0.9 } } },
      }),
    ] as Question[]
  ).map((question, index) => ({
    ...question,
    id: `${question.id}-v2`,
    leadIn: [
      "Start in the far north.",
      "Head south for a latitude check.",
      "Continue to the Mexican border.",
      "Turn inland toward Missouri.",
      "Finish with a few directional names.",
    ][index],
    explanation: [
      "These three territories make up Canada’s north; the other ten subdivisions are provinces.",
      "The province reaches below Boston’s latitude, including the Point Pelee area.",
      "Four states meet Mexico along the southern border. Any one qualifies.",
      "",
      "No state has East in its name, but the other three directions all appear.",
    ][index],
  })),
};
