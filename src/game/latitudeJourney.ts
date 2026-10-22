import { referenceCountries } from "./helpReferences";
import { cityReference } from "./authoredPlaces";
import { defineQuestion } from "./questionBuilder";
import { CAPITALS, capitalSource } from "./quizData";
import type { Journey, Question } from "./questionContracts";

const comparisons = [
  {
    id: "africa-amman",
    guidance: {
      hint: "Africa’s Mediterranean coast reaches farther north than you might expect.",
      assist: {
        text: "Compare the Mediterranean countries with Amman’s line. Country names are now shown, but their capitals remain unmarked.",
        regionIds: ["wurl:MAR", "wurl:DZA", "wurl:TUN", "wurl:LBY", "wurl:EGY"],
        places: referenceCountries(["MAR", "DZA", "TUN", "LBY", "EGY"]),
        focus: { lat: 33, lng: 14, altitude: 1.1 },
      },
    },
    reference: "Amman",
    continent: "AF",
    direction: "north",
    leadIn: "Begin with a comparison across the Mediterranean region.",
    prompt: "Name an African capital city farther north than Amman, Jordan.",
    focus: { lat: 22, lng: 22, altitude: 1.5 },
    explanation:
      "Algiers, Tunis, and Tripoli all lie north of Amman. Northern Africa reaches well above a capital we often associate with the Middle East.",
  },
  {
    id: "europe-ottawa",
    guidance: {
      hint: "Try the Mediterranean-facing parts of Europe rather than northern Europe.",
      assist: {
        text: "Compare Portugal, Spain, France, Italy, and Greece with Ottawa’s line. Their capitals remain unmarked.",
        regionIds: ["wurl:PRT", "wurl:ESP", "wurl:FRA", "wurl:ITA", "wurl:GRC"],
        places: referenceCountries(["PRT", "ESP", "FRA", "ITA", "GRC"]),
        focus: { lat: 43, lng: 6, altitude: 1.15 },
      },
    },
    reference: "Ottawa",
    continent: "EU",
    direction: "south",
    leadIn: "Now put Europe beside a Canadian reference point.",
    prompt: "Name a European capital city farther south than Ottawa, Canada.",
    focus: { lat: 46, lng: 12, altitude: 1.4 },
    explanation:
      "Ottawa’s latitude runs through southern Europe. Several Mediterranean capitals lie farther south, even though they sit across the Atlantic from a Canadian city.",
  },
  {
    id: "asia-rome",
    guidance: {
      hint: "Look inland toward Central Asia and Mongolia.",
      assist: {
        text: "Compare the highlighted Central Asian countries and Mongolia with Rome’s line. Their capitals remain unmarked.",
        regionIds: ["wurl:KAZ", "wurl:KGZ", "wurl:UZB", "wurl:TJK", "wurl:MNG"],
        places: referenceCountries(["KAZ", "KGZ", "UZB", "TJK", "MNG"]),
        focus: { lat: 44, lng: 81, altitude: 1.35 },
      },
    },
    reference: "Rome",
    continent: "AS",
    direction: "north",
    leadIn: "Follow Rome’s latitude into Asia.",
    prompt: "Name an Asian capital city farther north than Rome, Italy.",
    focus: { lat: 40, lng: 82, altitude: 1.5 },
    explanation:
      "Astana, Bishkek, and Ulaanbaatar lie north of Rome. The comparison carries a familiar Mediterranean latitude deep into the Asian interior.",
  },
  {
    id: "south-america-pretoria",
    guidance: {
      hint: "Think of the continent’s southern cone and the Río de la Plata region.",
      assist: {
        text: "Compare Chile, Argentina, Uruguay, and Paraguay with Pretoria’s line. Their capitals remain unmarked.",
        regionIds: ["wurl:CHL", "wurl:ARG", "wurl:URY", "wurl:PRY"],
        places: referenceCountries(["CHL", "ARG", "URY", "PRY"]),
        focus: { lat: -30, lng: -64, altitude: 1.1 },
      },
    },
    reference: "Pretoria",
    continent: "SA",
    direction: "south",
    leadIn:
      "Turn to the Southern Hemisphere, where farther south means a larger southern latitude.",
    prompt:
      "Name a South American capital city farther south than Pretoria, South Africa.",
    focus: { lat: -24, lng: -63, altitude: 1.4 },
    explanation:
      "Santiago, Buenos Aires, and Montevideo lie south of Pretoria. The southern cone puts three South American capitals beyond this South African reference point.",
  },
  {
    id: "oceania-buenos-aires",
    guidance: {
      hint: "Look toward the southern parts of Australia and New Zealand.",
      assist: {
        text: "Compare Australia, New Zealand, and Fiji with Buenos Aires’s line. Their capitals remain unmarked.",
        regionIds: ["wurl:AUS", "wurl:NZL", "wurl:FJI"],
        places: referenceCountries(["AUS", "NZL", "FJI"]),
        focus: { lat: -32, lng: 157, altitude: 1.45 },
      },
    },
    reference: "Buenos Aires",
    continent: "OC",
    direction: "south",
    leadIn: "Make one last comparison across the South Pacific.",
    prompt:
      "Name a capital city in Oceania farther south than Buenos Aires, Argentina.",
    focus: { lat: -25, lng: 162, altitude: 1.6 },
    explanation:
      "Canberra and Wellington both lie south of Buenos Aires. Across five continents, the same comparison has brought distant cities into unexpected company.",
  },
] as const;

export const LATITUDE_JOURNEY: Journey = {
  id: "latitude-surprises-v1",
  addedAt: "2026-10-11",
  title: "Latitude surprises",
  description:
    "Take one latitude line around the world at a time. Across five continents, familiar cities turn out to be farther north—or south—than you expect.",
  rounds: comparisons.map((comparison): Question => {
    const reference = CAPITALS.find(
      (capital) => capital.name === comparison.reference,
    )!;
    return defineQuestion({
      mode: "text",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",

      qualification:
        "We compare one primary capital per UN member state using GeoNames coordinates, downloaded in October 2026.",
      topic: "latitude",
      disclosure: {
        hoverNames: false,
        namedChoices: false,
        committedNames: false,
        previousVisits: false,
      },
      failure: "feedback",
      id: `latitude-${comparison.id}-v1`,
      title: `Compare with ${comparison.reference}.`,
      label: "Latitude",
      resolvedLabel: `${comparison.direction === "north" ? "North" : "South"} of ${comparison.reference}`,
      progressLabel: {
        AF: "Africa",
        EU: "Europe",
        AS: "Asia",
        SA: "South America",
        OC: "Oceania",
      }[comparison.continent],
      leadIn: comparison.leadIn,
      prompt: comparison.prompt,
      instruction: `The line marks ${comparison.reference}’s latitude.`,
      inputLabel: "Capital city",
      rule: {
        type: "capital-coordinate",
        referenceId: reference.id,
        continent: comparison.continent,
        direction: comparison.direction,
      },
      guidance: comparison.guidance,
      explanation: comparison.explanation,
      source: capitalSource,
      scenes: {
        play: {
          places: [reference],
          contextIds: [reference.countryId],
          focus: comparison.focus,
          overlays: [
            {
              id: `line:${comparison.id}`,
              type: "parallel",
              latitude: reference.lat,
            },
          ],
        },
      },
    });
  }),
  completion: {
    focus: { lat: 10, lng: 25, altitude: 1.9 },
    views: comparisons.map((comparison) => comparison.focus),
    physicalFeatures: [],
    places: comparisons.map((comparison) =>
      cityReference(
        CAPITALS.find((capital) => capital.name === comparison.reference)!,
      ),
    ),
    overlays: comparisons.map((comparison) => ({
      id: `completion:latitude:${comparison.id}`,
      type: "parallel",
      latitude: CAPITALS.find(
        (capital) => capital.name === comparison.reference,
      )!.lat,
    })),
    caption:
      "Africa north of Amman, Europe south of Ottawa, Asia north of Rome—and southern capitals beyond Pretoria and Buenos Aires. These comparisons connect distant places without making them neighbors or giving them the same climate or clock.",
  },
};
