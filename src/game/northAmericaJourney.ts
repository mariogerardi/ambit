import { referenceCity, referenceLabel } from "./helpReferences";
import { cityReference } from "./authoredPlaces";
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
  title: "A Continent in Pieces",
  description:
    "Familiar countries, unfamiliar pieces. Explore the territories, provinces, and states within North America—and the surprises hidden in their boundaries and names.",
  rounds: (
    [
      defineQuestion({
        commitment: "submit",

        ...base,
        id: "canada-three-territories",
        guidance: {
          hint: "One territory shares its name with a major river; another has a directional name.",
          assist: {
            text: "Whitehorse, Yellowknife, and Iqaluit are now marked. Recall the name of a territory containing one of these cities.",
            places: [
              referenceCity("Whitehorse"),
              referenceCity("Yellowknife"),
              referenceCity("Iqaluit"),
            ],
          },
        },
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
              candidateRole: "clue",
              borders: true,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
              candidates: undefined,
              selectionFeedback: "after-submit",
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
        guidance: {
          hint: "Look toward the Great Lakes rather than the Atlantic coast.",
          assist: {
            text: "Lakes Erie and Ontario are now labeled. Follow Boston’s latitude across the lakes; province names remain hidden.",
            places: [
              referenceLabel("Lake Erie", 42.2, -81.2),
              referenceLabel("Lake Ontario", 43.7, -77.8),
            ],
            focus: { lat: 43.5, lng: -80, altitude: 0.55 },
          },
        },
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
              candidateRole: "clue",
              borders: true,
              hoverFeedback: false,
              muteOthers: true,
              revealOnAnswer: true,
              candidates: undefined,
              selectionFeedback: "after-submit",
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
        visualExceptions: {
          "hidden-boundaries":
            "Recall a state’s name without using visible state boundaries as clues.",
        },
        guidance: {
          hint: "Both the Pacific end and the Gulf end of the border offer possible answers.",
          assist: {
            text: "San Diego and El Paso are now marked. Use them to recall a state along the Mexican border.",
            places: [referenceCity("San Diego"), referenceCity("El Paso")],
            focus: { lat: 31, lng: -106, altitude: 1.05 },
          },
        },
        label: "Southern border",
        title: "Across the southern border.",
        prompt: "Name a U.S. state that borders Mexico.",
        instruction: "State borders are hidden.",
        mode: "typed-regions",
        inputLabel: "State",
        count: 1,
        rule: { type: "region-ids", ids: MEXICO_BORDER_STATES, match: "any" },
        selection: { type: "none" },
        importedRegions: US_STATES,
        explanation:
          "California, Arizona, New Mexico, and Texas each meet Mexico. On one side of the international boundary, four different states share the same southern neighbor.",
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
        visualExceptions: {
          "hidden-boundaries":
            "Recall border crossings from memory; the assist deliberately restores state boundaries.",
        },
        guidance: {
          hint: "Try a corridor through the Southwest and southern Plains. Count transitions between states, rather than the states themselves.",
          assist: {
            text: "State boundaries are now visible, including competing routes. Find a shortest sequence; no route has been drawn.",
            borders: true,
            focus: { lat: 37, lng: -104, altitude: 0.85 },
          },
        },
        label: "Crossings",
        title: "The shortest state route.",
        prompt:
          "What is the fewest number of state border crossings from California to Missouri?",
        instruction:
          "State borders are hidden. Stay in the U.S.; corner contacts don’t count.",
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
        guidance: {
          hint: "Think of two North/South pairs and one state containing West. East contributes none.",
          assist: {
            text: "West Virginia is selected and locked. Find the other four among the remaining candidates.",
            candidateIds: [
              "wurl:USA-WV",
              "wurl:USA-ND",
              "wurl:USA-SD",
              "wurl:USA-NC",
              "wurl:USA-SC",
              "wurl:USA-VA",
              "wurl:USA-NH",
              "wurl:USA-NY",
              "wurl:USA-NM",
            ],
            fixedSelections: ["wurl:USA-WV"],
          },
        },
        label: "Directions",
        title: "Five names, four directions.",
        prompt:
          "Select the five U.S. states with North, South, East, or West in their name.",
        instruction: "",
        count: 5,
        rule: { type: "region-ids", ids: CARDINAL_STATES },
        sources: [
          {
            name: "North Carolina DNCR · the division of Carolina",
            url: "https://www.dncr.nc.gov/index.php/blog/2024/01/19/north-carolina-south-carolina-p-13",
            reviewedOn: "2026-10-19",
          },
          {
            name: "North Dakota Geological Survey · Dakota’s boundaries",
            url: "https://www.dmr.nd.gov/ndgs/ndnotes/Boundaries/Boundaries.asp",
            reviewedOn: "2026-10-19",
          },
          {
            name: "National Archives · West Virginia statehood",
            url: "https://www.archives.gov/legislative/features/west-virginia",
            reviewedOn: "2026-10-19",
          },
        ],
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
    progressLabel: [
      "Northern territories",
      "Great Lakes",
      "Mexican border",
      "State connections",
      "Names of division",
    ][index],
    resolvedLabel: [
      "Canada’s northern territories",
      "Ontario",
      "States bordering Mexico",
      "California → Missouri",
      "Five directional states",
    ][index],
    leadIn: [
      "Begin with the vast northern pieces of Canada.",
      "Farther south, a province reaches past an unexpected neighbor.",
      "At the Mexican border, several states share one international boundary.",
      "Now follow the connections between the pieces.",
      "Some divisions survive in the names themselves.",
    ][index],
    explanation: [
      "Yukon, the Northwest Territories, and Nunavut span Canada’s north. These vast territories sit alongside ten provinces: one country, two kinds of subdivision.",
      "Ontario reaches south into the Great Lakes, including the Point Pelee area below Boston’s latitude. The Canada–U.S. border is not a simple division of north from south.",
      "California, Arizona, New Mexico, and Texas each meet Mexico. On one side of the international boundary, four different states share the same southern neighbor.",
      "",
      "The Carolinas grew from one colony, and the Dakotas from one territory. West Virginia separated from Virginia during the Civil War. These directions preserve histories of division, not just positions on a compass.",
    ][index],
  })),
  completion: {
    focus: { lat: 46, lng: -100, altitude: 1.05 },
    views: [
      { lat: 67, lng: -110, altitude: 1 },
      { lat: 43, lng: -82, altitude: 0.7 },
      { lat: 32, lng: -106, altitude: 1.1 },
      { lat: 37, lng: -104, altitude: 0.85 },
      { lat: 39, lng: -97, altitude: 0.9 },
    ],
    physicalFeatures: [],
    places: [cityReference(boston)],
    caption:
      "Vast territories, a province south of Boston, four states on one international border, and a route through neighboring pieces. Even the directional names preserve divisions of older regions: familiar countries become more interesting when we look inside their outlines.",
  },
};
