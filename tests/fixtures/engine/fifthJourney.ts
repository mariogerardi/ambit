import { geoBounds } from "d3-geo";
import { US_STATES } from "../../../src/geography/usStates";
import canadaData from "../../../public/geography/can-adm1.v1.json";
import { catalogRegions, subdivisionKind } from "../../../src/geography/regions";
import { sphericalGeometry } from "../../../src/geography/sphericalGeometry.mjs";
import type { RegionFeature } from "../../../src/geography/types";
import type { FactSource, Journey, Question } from "../../../src/game/questions";

export { US_STATES } from "../../../src/geography/usStates";
export const CANADIAN_SUBDIVISIONS = catalogRegions(
  canadaData as RegionFeature[],
);
export const CANADIAN_TERRITORIES = CANADIAN_SUBDIVISIONS.filter(
  (r) => subdivisionKind(r) === "territory",
).map((r) => r.id);
const provinces = CANADIAN_SUBDIVISIONS.filter(
  (r) => subdivisionKind(r) === "province",
);
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
// International boundaries through the Great Lakes count as borders too.
export const CANADA_BORDER_STATES = [
  "AK",
  "WA",
  "ID",
  "MT",
  "ND",
  "MN",
  "MI",
  "OH",
  "PA",
  "NY",
  "VT",
  "NH",
  "ME",
].map((code) => `wurl:USA-${code}`);
export const CARDINAL_STATES = US_STATES.filter((r) =>
  /\b(north|south|east|west)\b/i.test(r.name),
).map((r) => r.id);
const subdivisionSource: FactSource = {
  name: "Natural Earth · pinned administrative subdivisions",
  url: "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
  reviewedOn: "2026-10-05",
};
const base: Question = {
  id: "",
  label: "",
  topic: "North American geography",
  title: "",
  prompt: "",
  instruction: "",
  mode: "map-multiple",
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
  focus: { lat: 46, lng: -98, altitude: 0.95 },
  source: subdivisionSource,
  explanation: "",
  map: {
    borders: true,
    hoverFeedback: true,
    muteOthers: true,
    candidates: "highlighted",
  },
};
export const FIFTH_JOURNEY: Journey = {
  id: "north-america-v1",
  title: "North America by name",
  description:
    "From Canada’s far north to the southern states, names and borders offer a new way to read the map.",
  rounds: [
    {
      ...base,
      id: "canada-three-territories",
      label: "Territories",
      title: "Canada’s far north.",
      prompt: "Name Canada’s three northern territories.",
      instruction: "",
      mode: "typed-regions",
      inputLabel: "Territory",
      count: 3,
      rule: { type: "region-ids", ids: CANADIAN_TERRITORIES },
      selection: { type: "none" },
      contextIds: CANADIAN_TERRITORIES,
      map: {
        borders: true,
        hoverFeedback: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      importedRegions: CANADIAN_SUBDIVISIONS,
      focus: { lat: 64, lng: -108, altitude: 1.1 },
      explanation:
        "Yukon, Northwest Territories, and Nunavut are Canada’s three territories; its other ten subdivisions are provinces.",
      source: {
        name: "Government of Canada · provinces and territories",
        url: "https://www.canada.ca/en/intergovernmental-affairs/services/provinces-territories.html",
        reviewedOn: "2026-10-05",
      },
    },
    {
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
      contextIds: provinces.map((r) => r.id),
      map: {
        borders: true,
        hoverFeedback: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      importedRegions: CANADIAN_SUBDIVISIONS,
      focus: { lat: 48, lng: -90, altitude: 0.9 },
      places: [boston],
      overlays: [
        { id: "boston-latitude", type: "parallel", latitude: boston.lat },
      ],
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
    },
    {
      ...base,
      id: "five-states-bordering-canada",
      label: "Pick five",
      title: "Across the northern border.",
      prompt: "Name five U.S. states that border Canada.",
      instruction: "Include borders across water.",
      mode: "typed-regions",
      inputLabel: "State",
      count: 5,
      rule: { type: "region-ids", ids: CANADA_BORDER_STATES, match: "any" },
      selection: { type: "none" },
      importedRegions: US_STATES,
      map: {
        borders: false,
        hoverFeedback: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      focus: { lat: 46, lng: -108, altitude: 1.3 },
      explanation:
        "Any five distinct states from Alaska, Washington, Idaho, Montana, North Dakota, Minnesota, Michigan, Ohio, Pennsylvania, New York, Vermont, New Hampshire, and Maine qualify. Ohio and Pennsylvania border Canada across Lake Erie. Postal abbreviations are accepted too.",
      source: {
        name: "U.S. Customs and Border Protection · northern border, Great Lakes region",
        url: "https://www.cbp.gov/sites/default/files/documents/Ch.%206%20Great%20Lakes.pdf",
        reviewedOn: "2026-10-05",
      },
    },
    {
      qualification:
        "Routes use Natural Earth state boundaries. The result describes geography, not a driving itinerary.",
      ...base,
      id: "california-missouri-crossings",
      label: "Crossings",
      title: "The shortest state route.",
      prompt:
        "What is the fewest number of state border crossings from California to Missouri?",
      instruction:
        "Stay within the United States. States meeting at a single point don’t count.",
      mode: "number",
      inputLabel: "State border crossings",
      rule: {
        type: "shortest-borders",
        from: "wurl:USA-CA",
        to: "wurl:USA-MO",
      },
      contextIds: ["wurl:USA-CA", "wurl:USA-MO"],
      importedRegions: US_STATES,
      map: {
        borders: false,
        hoverFeedback: false,
        muteOthers: true,
        revealOnAnswer: true,
      },
      focus: { lat: 37, lng: -104, altitude: 0.85 },
      explanation:
        "Only shared land borders count; states meeting at a single point are not neighbors.",
    },
    {
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
      focus: { lat: 39, lng: -97, altitude: 0.9 },
      explanation:
        "North Carolina, South Carolina, North Dakota, South Dakota, and West Virginia. No U.S. state has East in its name.",
    },
  ],
};
