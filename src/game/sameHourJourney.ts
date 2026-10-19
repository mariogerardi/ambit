import { ANSWER_PLACES } from "./answerTargets";
import { cityReference, areaLabel } from "./authoredPlaces";
import { definePresentation, defineQuestion } from "./questionBuilder";
import { capitalSource } from "./quizData";
import type { FactSource, Journey } from "./questionContracts";
import type { Focus, PlaceFeature, RegionFeature } from "../geography/types";
import mapData from "./data/same-hour-map.v1.json";
import samoaTimeZoneLine from "./data/samoa-time-zone-line.v1.json";

const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-10-12",
});
const zone = (name: string, path: string) =>
  source(
    `Time and Date · ${name}`,
    `https://www.timeanddate.com/time/zone/${path}`,
  );
const city = (id: string, name?: string): PlaceFeature => {
  const record = ANSWER_PLACES.get(`place:${id}`);
  if (!record) throw Error(`Missing Same Hour city: ${id}`);
  return { ...cityReference(record), ...(name ? { name } : {}) };
};
const reykjavik = city("3413829", "Reykjavík");
const accra = city("2306104");
const algiers = city("2507480");
const praia = city("3374333");
const oran = city("2485926");
const madrid = city("3117735");
const warsaw = city("756135");
const beijing = city("1816670");
const kashgar = city("1280849");
const vladivostok = city("2013348");
const brisbane = city("2174003");
const perth = city("2063523");
const samoa = areaLabel(city("4035413", "Samoa"));
const savaii: PlaceFeature = {
  id: "same-hour:savaii-label",
  name: "Savai‘i",
  kind: "landmark",
  parentId: "wurl:WSM",
  lat: -13.63,
  lng: -172.48,
  markerHidden: true,
  priority: 70,
  sourceId: "naturalearth:1159321423:savaii",
};
// Reviewed GeoNames records absent from the bundled city pool. Keep them local:
// answerPlace resolves authored candidates without regenerating geography.
const darwin = cityReference({
  id: "place:2073124",
  name: "Darwin",
  kind: "city",
  parentId: "wurl:AUS",
  lat: -12.46113,
  lng: 130.84185,
  sourceId: "geonames:2073124",
});
const americanSamoa = areaLabel(
  cityReference({
    id: "place:5881576",
    name: "American Samoa",
    kind: "city",
    parentId: "wurl:ASM",
    lat: -14.27806,
    lng: -170.7025,
    sourceId: "geonames:5881576",
  }),
);
const africaCities = [accra, algiers, praia, oran];
const australianCities = [brisbane, darwin, perth];
const context = (place: PlaceFeature): PlaceFeature => ({
  ...place,
  visualState: "hinted",
});
const clock = (place: PlaceFeature, reading: string): PlaceFeature => ({
  ...place,
  name: `${place.name} · ${reading}`,
});
const africaView: Focus = { lat: 34, lng: -8, altitude: 1.8 };
const atlanticView: Focus = { lat: 34, lng: -12, altitude: 1.6 };
const europeView: Focus = { lat: 52, lng: 13, altitude: 1 };
const chinaView: Focus = { lat: 37, lng: 97, altitude: 0.95 };
const samoaView: Focus = { lat: -13.95, lng: -171.65, altitude: 0.12 };
const pacificView: Focus = { lat: 6, lng: 136, altitude: 1.6 };
const base = definePresentation({
  topic: "civil time",
  instruction: "",
  failure: "feedback",
  disclosure: {
    hoverNames: true,
    namedChoices: true,
    committedNames: true,
    previousVisits: false,
  },
  map: {
    borders: true,
    hoverFeedback: false,
    muteOthers: true,
    feedbackRegions: "neutral",
  },
  feedbackContextIds: [],
  source: capitalSource,
});

export const SAME_HOUR_JOURNEY: Journey = {
  id: "same-hour-different-worlds",
  addedAt: "2026-10-12",
  availability: "unlisted",
  saveRevision: 5,
  legacyRoundLabels: {
    "same-hour-q4": "Sri Lanka / Nepal / Bhutan",
    "same-hour-q5": "Vladivostok + Guam + Brisbane",
  },
  title: "Same Hour, Different Worlds",
  description:
    "Cross continents and compare distant clocks. Discover why longitude is only part of the story of civil time.",
  rounds: [
    defineQuestion({
      ...base,
      id: "same-hour-q1",
      label: "Shared hour",
      progressLabel: "Across the Atlantic",
      resolvedLabel: "Reykjavík + Accra",
      title: "An Atlantic pairing.",
      leadIn: "Begin in Iceland, where Reykjavík keeps one clock all year.",
      prompt: "Which marked African city keeps exactly the same time all year?",
      instruction: "Choose a city marker on the globe.",
      mode: "city-single",
      count: 1,
      commitment: "submit",
      allowTyping: false,
      selection: { type: "ids", ids: africaCities.map((p) => p.id) },
      rule: { type: "place-ids", ids: [accra.id] },
      guidance: {
        hint: "Longitude offers a starting point, but neighboring governments need not use the same clock.",
        assist: {
          text: "Compare the mainland and the Atlantic islands. Choose between Accra and Praia.",
          candidateIds: [accra.id, praia.id],
        },
      },
      explanation:
        "Accra. Reykjavík and Accra both keep UTC+0 through the year. Praia is an hour behind; Algiers and Oran are an hour ahead. Nearby longitudes can still keep different clocks.",
      source: zone("Reykjavík", "iceland/reykjavik"),
      sources: [
        zone("Accra", "ghana/accra"),
        zone("Algiers", "algeria/algiers"),
        zone("Praia", "cape-verde/praia"),
        zone("Oran", "algeria/oran"),
        capitalSource,
      ],
      scenes: {
        play: {
          focus: africaView,
          places: [context(reykjavik), ...africaCities],
        },
        assist: {},
        reveal: {
          focus: atlanticView,
          places: [
            context(clock(reykjavik, "UTC+0")),
            clock(accra, "UTC+0"),
            { ...clock(praia, "UTC−1"), visualState: "disabled" },
            { ...clock(algiers, "UTC+1"), visualState: "disabled" },
            { ...clock(oran, "UTC+1"), visualState: "disabled" },
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "same-hour-q2",
      label: "European clocks",
      progressLabel: "Europe's mismatch",
      resolvedLabel: "Madrid + Warsaw",
      title: "Europe’s shared clocks.",
      leadIn: "Now compare Madrid's clock with the rest of Europe.",
      prompt:
        "Which of these countries keeps the same time as Madrid in both winter and summer?",
      instruction: "Tap a highlighted country on the globe.",
      mode: "map-single",
      count: 1,
      commitment: "immediate",
      selection: {
        type: "ids",
        ids: ["wurl:PRT", "wurl:POL", "wurl:GBR", "wurl:GRC"],
      },
      rule: { type: "country-ids", ids: ["wurl:POL"] },
      map: {
        ...base.map,
        candidates: "highlighted",
        feedbackRegions: undefined,
      },
      // Split only the canonical mainland component. The Canary Islands must
      // remain neutral rather than suggesting they share Madrid's clock.
      highlightParts: [
        {
          countryId: "wurl:ESP",
          point: madrid,
          name: "Mainland Spain",
          reveal: "part",
        },
      ],
      guidance: {
        hint: "Mainland Spain follows Central European Time. Think about which countries share that clock.",
        assist: {
          text: "Portugal and the United Kingdom are ruled out. Compare Poland with Greece.",
          candidateIds: ["wurl:POL", "wurl:GRC"],
        },
      },
      explanation:
        "Poland. Madrid and Warsaw change their clocks together: CET (UTC+1) in winter and CEST (UTC+2) in summer. Lisbon is an hour behind; geographical proximity is no guarantee.",
      source: zone("Madrid", "spain/madrid"),
      sources: [
        zone("Warsaw", "poland/warsaw"),
        zone("Lisbon", "portugal/lisbon"),
        zone("Athens", "greece/athens"),
        zone("United Kingdom", "uk"),
        capitalSource,
      ],
      scenes: {
        play: {
          focus: europeView,
          contextIds: ["wurl:ESP"],
          places: [context(madrid)],
        },
        assist: {},
        reveal: {
          focus: europeView,
          contextIds: ["wurl:ESP"],
          answerIds: ["wurl:POL"],
          places: [
            context(clock(madrid, "CET / CEST")),
            context(clock(warsaw, "CET / CEST")),
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "same-hour-q3",
      label: "Official time",
      progressLabel: "Across China",
      resolvedLabel: "Beijing + Kashgar",
      title: "Across China.",
      leadIn:
        "Far to Beijing's west, Kashgar experiences the Sun on a very different schedule.",
      prompt:
        "When it is 9:00 a.m. by the official clock in Beijing, what is the official time in Kashgar?",
      mode: "choice-single",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      choices: [
        { id: "same-hour:07", label: "7:00 a.m." },
        { id: "same-hour:08", label: "8:00 a.m." },
        { id: "same-hour:09", label: "9:00 a.m." },
        { id: "same-hour:10", label: "10:00 a.m." },
      ],
      rule: { type: "choice-ids", ids: ["same-hour:09"] },
      guidance: {
        hint: "The Sun's position and the legal time on a public timetable are not the same thing.",
        assist: {
          text: "It is either 8:00 or 9:00 a.m. on the official clock.",
          candidateIds: ["same-hour:08", "same-hour:09"],
        },
      },
      explanation:
        "9:00 a.m. Beijing and Kashgar share China's official UTC+8 clock, despite their distance. In Xinjiang, some people also follow an unofficial local clock two hours behind Beijing Time.",
      mapCaption: "Beijing and Kashgar · official civil time",
      feedbackMapCaption:
        "Official readings in this example: both cities are at 9:00 a.m. (UTC+8).",
      source: zone(
        "China's official time and Xinjiang's local practice",
        "china",
      ),
      sources: [capitalSource],
      scenes: {
        play: {
          focus: chinaView,
          contextIds: ["wurl:CHN"],
          places: [context(beijing), context(kashgar)],
        },
        assist: {},
        reveal: {
          focus: chinaView,
          contextIds: ["wurl:CHN"],
          places: [
            context(clock(beijing, "09:00 · UTC+8")),
            context(clock(kashgar, "09:00 · UTC+8")),
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "same-hour-q4",
      label: "Different days",
      // Replace the world-scale simplifications rather than adding overlapping
      // island outlines. The render footprints retain canonical country IDs.
      displayGeometries: mapData.displayGeometries as Record<
        string,
        RegionFeature["geometry"]
      >,
      progressLabel: "Across the date line",
      resolvedLabel: "Samoa + American Samoa",
      title: "Same hour, different day.",
      leadIn:
        "The International Date Line separates two nearby neighbors, Samoa and American Samoa.",
      prompt: "It's noon on Monday in Samoa. What day is it in American Samoa?",
      mode: "choice-single",
      count: 1,
      commitment: "submit",
      selection: { type: "none" },
      choices: [
        { id: "same-hour:sunday", label: "Sunday" },
        { id: "same-hour:monday", label: "Monday" },
        { id: "same-hour:tuesday", label: "Tuesday" },
      ],
      rule: { type: "choice-ids", ids: ["same-hour:sunday"] },
      guidance: {
        hint: "The western side of the date line starts a new calendar day first. Compare the two islands' positions.",
        assist: {
          text: "Keep noon on the clock. Choose between Sunday and Monday.",
          candidateIds: ["same-hour:sunday", "same-hour:monday"],
        },
      },
      explanation:
        "Sunday—at noon, too. Samoa is a full calendar day ahead of American Samoa. These nearby islands see almost the same daylight, but the date line gives their calendars different stories.",
      mapCaption:
        "Savai‘i and Upolu form Samoa’s two main islands; American Samoa lies to the east.",
      feedbackMapCaption:
        "Samoa UTC+13 · American Samoa UTC−11 · boundary © OpenStreetMap contributors.",
      source: zone("Apia, Samoa", "samoa/apia"),
      sources: [
        zone("Pago Pago, American Samoa", "usa/pago-pago"),
        source(
          "Time and Date · Samoa's date-line change",
          "https://www.timeanddate.com/news/time/samoa-dateline.html",
        ),
        source(
          "GeoNames · Pago Pago coordinates",
          "https://www.geonames.org/5881576/pago-pago.html",
        ),
        capitalSource,
        source(mapData.source.name, mapData.source.url),
        source(
          "Timezone Boundary Builder · Samoa boundary",
          samoaTimeZoneLine.sourceUrl,
        ),
        source(
          "Samoa Tourism · the islands of Samoa",
          "https://www.samoa.travel/discover/the-islands-of-samoa/",
        ),
      ],
      scenes: {
        play: {
          focus: samoaView,
          contextIds: ["wurl:WSM", "wurl:ASM"],
          map: { borderIds: ["wurl:WSM", "wurl:ASM"] },
          places: [context(samoa), context(americanSamoa), context(savaii)],
        },
        assist: {},
        reveal: {
          focus: samoaView,
          contextIds: ["wurl:WSM", "wurl:ASM"],
          overlays: [
            {
              id: "same-hour:date-line",
              type: "path",
              opacity: 0.65,
              coordinates: samoaTimeZoneLine.geometry.coordinates,
            },
          ],
          places: [
            context(clock(samoa, "Mon 12:00")),
            context(clock(americanSamoa, "Sun 12:00")),
            context(savaii),
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "same-hour-q5",
      label: "The Pacific hour",
      progressLabel: "One Pacific hour",
      resolvedLabel: "Vladivostok + Brisbane",
      title: "A clock across the Pacific.",
      leadIn: "Vladivostok keeps UTC+10 all year.",
      prompt:
        "Which marked Australian city shares its clock throughout the year?",
      instruction: "Choose one city marker on the globe.",
      mode: "city-single",
      count: 1,
      commitment: "submit",
      allowTyping: false,
      selection: { type: "ids", ids: australianCities.map((p) => p.id) },
      rule: { type: "place-ids", ids: [brisbane.id] },
      guidance: {
        hint: "Australia has more than one standard time, and not every state changes its clocks for summer.",
        assist: {
          text: "Choose between Brisbane and Darwin.",
          candidateIds: [brisbane.id, darwin.id],
        },
      },
      explanation:
        "Brisbane. Russia’s Vladivostok and Queensland’s largest city share UTC+10 all year, despite the distance between them. Darwin is just 30 minutes behind; Perth is two hours behind. One country can keep several clocks.",
      source: zone("Vladivostok", "russia/vladivostok"),
      sources: [
        zone("Brisbane", "australia/brisbane"),
        zone("Darwin", "australia/darwin"),
        zone("Perth", "australia/perth"),
        source(
          "GeoNames · Darwin coordinates",
          "https://www.geonames.org/2073124/darwin.html",
        ),
        capitalSource,
      ],
      scenes: {
        play: {
          focus: pacificView,
          places: [context(clock(vladivostok, "UTC+10")), ...australianCities],
        },
        assist: {},
        reveal: {
          focus: pacificView,
          places: [
            context(clock(vladivostok, "UTC+10")),
            clock(brisbane, "UTC+10"),
            { ...clock(darwin, "UTC+9:30"), visualState: "disabled" },
          ],
        },
      },
    }),
  ],
  completion: {
    focus: pacificView,
    views: [
      atlanticView,
      europeView,
      chinaView,
      { ...samoaView, altitude: 1.6 },
      pacificView,
    ],
    regionIds: [],
    physicalFeatures: [],
    borders: false,
    overlays: [
      {
        id: "same-hour:time-zone-map",
        type: "texture",
        assetUrl: "/geography/time-zones.v1.png",
        opacity: 0.85,
      },
    ],
    mapCaption: "Standard-time zones · seasonal clock changes vary.",
    mapAttribution: {
      label: "Time-zone map © OpenStreetMap contributors",
      url: "https://www.openstreetmap.org/copyright",
    },
    places: [
      clock(reykjavik, "UTC+0"),
      clock(accra, "UTC+0"),
      clock(madrid, "CET / CEST"),
      clock(warsaw, "CET / CEST"),
      clock(beijing, "official UTC+8"),
      clock(kashgar, "official UTC+8"),
      clock(samoa, "UTC+13"),
      clock(americanSamoa, "UTC−11"),
      clock(vladivostok, "UTC+10"),
      clock(brisbane, "UTC+10"),
    ].map((p) => ({
      ...p,
      visualState: "visited",
      priority: [vladivostok.id, brisbane.id].includes(p.id) ? 100 : 90,
    })),
    caption:
      "Reykjavík meets Accra; Madrid keeps pace with Warsaw; Beijing and Kashgar share one official standard. Samoa and American Samoa share a clock reading but a different day. Vladivostok and Brisbane finish together at UTC+10. Clocks tell a political story as well as a geographic one.",
  },
};
