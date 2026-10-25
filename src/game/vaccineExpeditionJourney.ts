import { defineQuestion, definePresentation } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { cityReference } from "./authoredPlaces";
import type { Journey, FactSource } from "./questionContracts";
import type { PlaceFeature, Focus } from "../geography/types";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-20",
});
const itinerary = source(
  "University of Alicante · Royal Vaccine Expedition itinerary",
  "https://balmis.org/expedicion-vacuna-1803-1813/",
);
const children = source(
  "University of Alicante · children of the expedition",
  "https://balmis.org/expedicion-vacuna-1803-1813/los-ninos/",
);
const research = source(
  "Tuells & Duro-Torrijos · archival research on the vaccine expedition",
  "https://balmis.org/articulos/articulo-2/",
);
/** Reviewed city centers, not historical docks. Reuse canonical IDs where bundled;
 * the two smaller cities are local GeoNames records, without regenerating geography. */
function city(
  id: string,
  name: string,
  lat: number,
  lng: number,
  parentId: string,
): PlaceFeature {
  return {
    ...ANSWER_PLACES.get(`place:${id}`),
    id: `place:${id}`,
    name,
    lat,
    lng,
    parentId,
    kind: "city",
    sourceId: `geonames:${id}`,
  };
}
export const VACCINE_MILESTONES = [
  city("3119841", "A Coruña", 43.37135, -8.396, "wurl:ESP"),
  city("2511174", "Santa Cruz de Tenerife", 28.46824, -16.25462, "wurl:ESP"),
  city("4568127", "San Juan", 18.46633, -66.10572, "wurl:PRI"),
  city("3646738", "Caracas", 10.48801, -66.87919, "wurl:VEN"),
  city("3533462", "Acapulco", 16.84942, -99.90891, "wurl:MEX"),
  city("1701668", "Manila", 14.6042, 120.9822, "wurl:PHL"),
];
const base = definePresentation({
  label: "Compass",
  topic: "vaccine expedition",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: false,
    namedChoices: false,
    committedNames: false,
    previousVisits: false,
  },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    feedbackRegions: "neutral",
  },
  source: itinerary,
});
const comparison =
  "Shortest paths between cities; the expedition traveled by other routes.";
const playViews: Focus[] = [
  { lat: 39, lng: -15, altitude: 1.05 },
  { lat: 28, lng: -28, altitude: 1.65 },
  { lat: 18, lng: -67, altitude: 0.8 },
  { lat: 14, lng: -72, altitude: 1.45 },
  { lat: 17, lng: -110, altitude: 1.8 },
];
const arrivalViews: Focus[] = [
  { lat: 28.5, lng: -16.3, altitude: 0.4 },
  { lat: 18.5, lng: -66.1, altitude: 0.45 },
  { lat: 11, lng: -67, altitude: 0.45 },
  { lat: 17, lng: -100, altitude: 0.5 },
  { lat: 15, lng: 121, altitude: 0.55 },
];
const comparisons: Focus[] = [
  { lat: 36, lng: -13, altitude: 0.8 },
  { lat: 27, lng: -42, altitude: 1.15 },
  { lat: 14.5, lng: -66.5, altitude: 0.65 },
  { lat: 16, lng: -83, altitude: 1 },
  { lat: 35, lng: -170, altitude: 2.05 },
];
const stops = [
  {
    slug: "tenerife",
    progress: "Departure",
    leadIn:
      "In November 1803, the María Pita left A Coruña carrying a vaccine kept active through successive vaccinations among children.",
    prompt:
      "Set your first bearing from A Coruña toward Santa Cruz de Tenerife, the expedition’s first island stop.",
    hint: "The Canary Islands lie off northwestern Africa, considerably south of Galicia. Start by considering the Atlantic southwest of the Iberian Peninsula.",
    assist:
      "The dial highlights south through west to northwest. Use the Canary Islands’ position off Africa to refine your heading.",
    sector: { start: 180, end: 315 },
    explanation:
      "Santa Cruz de Tenerife was the first island stop and a center for spreading vaccination through the Canaries. Successive arm-to-arm vaccinations among children kept the vaccine material active during travel. Isabel Zendal cared for the children aboard the María Pita; many had been taken from foundling institutions.",
  },
  {
    slug: "san-juan",
    progress: "Atlantic",
    leadIn:
      "From the Canaries, the expedition faced the Atlantic. The vaccine could not simply be packed away for the crossing: the chain of vaccinations had to continue at sea.",
    prompt:
      "From Santa Cruz de Tenerife, set a bearing toward San Juan, Puerto Rico, on the far side of the Atlantic.",
    hint: "Puerto Rico is in the northeastern Caribbean. Compared with the crossing from Galicia to Tenerife, this leg covers much more longitude.",
    assist:
      "The same broad south-to-northwest guide is shown. Consider how the Atlantic crossing changes the initial direction on a sphere.",
    sector: { start: 180, end: 315 },
    explanation:
      "The expedition reached Puerto Rico in February 1804, but vaccination had already arrived independently from St. Thomas. It encountered an existing vaccination network and difficulty finding children to carry vaccine material onward. The vaccine’s spread followed several initiatives, rather than one expedition alone.",
  },
  {
    slug: "caracas",
    progress: "Venezuela",
    leadIn:
      "After Puerto Rico, the expedition turned toward the South American mainland. Beyond the port of Puerto Cabello lay Caracas, where the work would take root ashore.",
    prompt:
      "From San Juan, set a bearing toward Caracas, inland from Venezuela’s Caribbean coast.",
    hint: "Caracas lies inland from Venezuela’s Caribbean coast. Think of the mainland south of Puerto Rico, rather than islands farther along the Antilles.",
    assist:
      "The guide runs clockwise from east to southwest. Compare Puerto Rico with Venezuela’s mainland coast to choose your heading.",
    sector: { start: 90, end: 225 },
    explanation:
      "After entering Venezuela through Puerto Cabello, the expedition reached Caracas. A vaccination board established there in 1804 organized continuing distribution. The mission then split: José Salvany’s party headed toward South America, while Balmis’s continued toward Cuba, Mexico and the Pacific.",
  },
  {
    slug: "acapulco",
    progress: "To the Pacific",
    leadIn:
      "In Venezuela, the expedition divided. Salvany’s party headed into South America; Balmis continued through Havana and Mexico, preparing to take the vaccine across another ocean.",
    prompt:
      "From Caracas, set a bearing toward Acapulco, the Mexican port where the Pacific crossing would begin.",
    hint: "Acapulco is on Mexico’s Pacific coast, across Central America from the Caribbean-facing coast of Venezuela.",
    assist:
      "The guide runs from southwest through west to northwest. Consider both the northward change and the much larger westward change.",
    sector: { start: 225, end: 315 },
    explanation:
      "By way of Havana, Sisal, Veracruz and Mexico City, Balmis reached Acapulco on Mexico’s Pacific coast. Vaccination boards helped keep the work going after the expedition moved on. Here, a new group of children would carry the vaccine across the Pacific to the Philippines.",
  },
  {
    slug: "manila",
    progress: "The Pacific",
    leadIn:
      "In early 1805, a new group of children left Acapulco with the expedition. Ahead lay the long Pacific crossing to the Philippines; keeping the vaccine alive still depended on them.",
    prompt:
      "From Acapulco, set your final bearing toward Manila, across the Pacific in the Philippines.",
    hint: "Manila lies across the Pacific in Southeast Asia. On a sphere, the shortest route can start at a surprising angle compared with a flat-map east–west line.",
    assist:
      "The guide covers west clockwise to north. Imagine the shortest arc over the North Pacific, rather than following a line of latitude.",
    sector: { start: 270, end: 0 },
    explanation:
      "The expedition reached Manila in April 1805. Twenty-six children from Mexico carried the vaccine, with Isabel Zendal caring for them in harsh shipboard conditions. The shortest path to Manila begins northwest, curving over the North Pacific. For the expedition, Manila was another beginning: the work continued in the Philippines and onward to Macao and Canton.",
  },
];
const havana = ANSWER_PLACES.get("place:3553478")!;
const mexico = ANSWER_PLACES.get("place:3530597")!;
const puertoCabello = city(
  "3629706",
  "Puerto Cabello",
  10.47306,
  -68.0125,
  "wurl:VEN",
);
export const VACCINE_EXPEDITION_JOURNEY: Journey = {
  id: "the-vaccine-that-crossed-the-world-v1",
  addedAt: "2026-10-20",
  saveRevision: 1,
  title: "The Vaccine That Crossed the World",
  description:
    "Set five compass bearings between milestones of a vaccination expedition, from Galicia to the Philippines.",
  rounds: stops.map((stop, i) => {
    const origin = VACCINE_MILESTONES[i],
      destination = VACCINE_MILESTONES[i + 1];
    return defineQuestion({
      ...base,
      id: `vaccine-0${i + 1}-${stop.slug}`,
      title: `${origin.name} to ${destination.name}`,
      progressLabel: stop.progress,
      resolvedLabel: destination.name,
      leadIn: stop.leadIn,
      prompt: stop.prompt,
      explanation: stop.explanation,
      mode: "compass-bearing",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "bearing-angle",
        origin,
        destination,
        tiers: [
          { degrees: 8, feedback: "Right on course." },
          { degrees: 18, feedback: "A close heading." },
          { degrees: 35, feedback: "Within range." },
        ],
      },
      guidance: {
        hint: stop.hint,
        assist: { text: stop.assist, compassSector: stop.sector },
      },
      sources: [
        children,
        research,
        ...(i === 2
          ? [
              source(
                "GeoNames · Puerto Cabello",
                "https://www.geonames.org/3629706/puerto-cabello.html",
              ),
            ]
          : []),
        ...[origin, destination].map((p) =>
          source(
            `GeoNames · ${p.name}`,
            `https://www.geonames.org/${p.sourceId.split(":")[1]}/`,
          ),
        ),
      ],
      mapCaption:
        "Find the initial direction of the shortest path to the named city.",
      feedbackMapCaption: comparison,
      scenes: {
        play: {
          focus: playViews[i],
          contextIds: [],
          places: VACCINE_MILESTONES.slice(0, i).map(cityReference),
        },
        reveal: {
          focus: arrivalViews[i],
          views: [playViews[i], comparisons[i], arrivalViews[i]],
          contextIds: [destination.parentId!],
          places:
            i === 2
              ? [cityReference(puertoCabello)]
              : i === 3
                ? [havana, mexico].map(cityReference)
                : [],
        },
      },
    });
  }),
  completion: {
    focus: comparisons[4],
    views: [...comparisons, comparisons[0]],
    physicalFeatures: [],
    places: [
      ...VACCINE_MILESTONES.map(
        (p, i): PlaceFeature => ({
          ...p,
          visualState: i === 0 ? "hinted" : "visited",
          displayRole: i === 0 ? "reference" : undefined,
        }),
      ),
      ...[puertoCabello, havana, mexico].map(cityReference),
    ],
    mapCaption:
      "1803–1805 · Lines show shortest paths, not the expedition’s full itinerary.",
    caption:
      "From Galicia to the Canaries, the Caribbean, Venezuela, Mexico and the Philippines, vaccination crossed oceans. This colonial expedition depended on the children who kept vaccine material active and the people who cared for and vaccinated them. Children endured separation and harsh conditions. The mission continued beyond Manila, reaching more communities in the Philippines and China.",
  },
};
