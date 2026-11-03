import { definePresentation, defineQuestion } from "./questionBuilder";
import { ANSWER_PLACES } from "./answerTargets";
import { cityReference, areaLabel } from "./authoredPlaces";
import type { FactSource, FlagDisplay, Journey } from "./questionContracts";
import type { MapOverlay } from "../geography/types";
import flags from "./data/flags.v1.json";
import borneo from "./data/bare-minimum-borneo.v1.json";

const assets = "/journeys/bare-minimum/";
const ids = (...codes: string[]) => codes.map((code) => `wurl:${code}`);
const source = (name: string, url: string): FactSource => ({
  name,
  url,
  reviewedOn: "2026-11-02",
});
const city = (number: string) => {
  const p = ANSWER_PLACES.get(`place:${number}`);
  if (!p) throw Error(`Missing Bare Minimum city: ${number}`);
  return cityReference(p);
};
const capital = city("1820906"),
  kuching = city("1735634"),
  balikpapan = city("1650527"),
  kabul = city("1138958");
const afghanCities = [
  kabul,
  city("1138336"),
  city("1140026"),
  city("1133616"),
  city("1139715"),
];
const currentFlag = (code: string) =>
  flags.flags.find((f) => f.countryId === `wurl:${code}`)!.src;
const swatch = (n: string, label: string, caption?: string): FlagDisplay => ({
  src: assets + `field-${n}.svg`,
  alt: label,
  label,
  caption,
});
const history = [
  swatch("01", "France · Restoration", "White national ensign"),
  swatch("02", "Brunei · 18th–19th c.", "Sultan’s royal banner"),
  swatch("03", "Hungary · 1919", "Hungarian Soviet Republic"),
  swatch("04", "Muscat and Oman · pre-1970", "Historical red flag"),
  swatch("05", "Afghan emirate · 1880–1901", "Black banner · reconstruction"),
  swatch("06", "Afghanistan · 1996", "Taliban’s initially white banner"),
  swatch("07", "Libya · 1977–2011", "Former national flag"),
];
const europe = { lat: 49, lng: 0, altitude: 0.78 };
const island = { lat: 1, lng: 114, altitude: 0.5 };
const redFlags = { lat: 34, lng: 37, altitude: 0.9 };
const afghanistan = { lat: 34, lng: 67, altitude: 0.62 };
const northAfrica = { lat: 28, lng: 14, altitude: 1.05 };
const coast: MapOverlay = {
  id: "bare:borneo-coast",
  type: "path",
  coordinates: borneo.coast,
  visualState: "hinted",
  foreground: true,
  opacity: 1,
};
const bruneiSource = source(
  "Brunei Information Department · flag history",
  "https://www.information.gov.bn/Majalah%20Alai%20Ginis/2024/MAGAZINE%20DECEMBER%202024%20FINAL.pdf",
);
const base = definePresentation({
  label: "Historical flags",
  topic: "Flags and banners",
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
    candidates: "highlighted",
  },
});
const image = (file: string, alt: string, feedbackAlt = alt) => ({
  src: assets + file,
  alt,
  feedbackAlt,
});

export const BARE_MINIMUM_JOURNEY: Journey = {
  dailyEligible: false,
  id: "bare-minimum-v1",
  addedAt: "2026-11-02",
  saveRevision: 1,
  title: "Bare Minimum",
  description:
    "No stripes. No stars. No complicated symbols. Meet the flags that did the absolute minimum—and the histories that didn’t.",
  mapAttribution: {
    label: "Natural Earth · GeoNames",
    url: "https://www.naturalearthdata.com/",
  },
  rounds: [
    defineQuestion({
      ...base,
      id: "bare-01-white-flag",
      title: "The White Flag",
      progressLabel: "The White Flag",
      resolvedLabel: "France · Bourbon Restoration",
      mode: "map-single",
      count: 1,
      selection: {
        type: "ids",
        ids: ids("FRA", "ESP", "PRT", "GBR", "NLD", "CHE"),
      },
      commitment: "immediate",
      allowTyping: false,
      rule: { type: "country-ids", ids: ["wurl:FRA"] },
      correctFeedback: "Well recognized.",
      incorrectFeedback: "Not quite.",
      leadIn:
        "Some of these flags look like someone forgot to finish them. After a revolution made its tricolor famous, a European country restored its monarchy—and replaced the three colors with a plain white flag.",
      prompt: "Which country was it?",
      explanation:
        "France. During the Bourbon Restoration, the monarchy returned to a plain white national ensign, setting aside the revolutionary tricolor. The tricolor returned after the July Revolution of 1830. Here, white represented the restored royal order.",
      guidance: {
        hint: "The revolution began in 1789, and its blue-white-red flag became one of Europe's most recognizable tricolors.",
        assist: {
          text: "Focus on the western European kingdoms. Four countries remain possible.",
          candidateIds: ids("FRA", "ESP", "PRT", "NLD"),
        },
      },
      image: image(
        "field-01.svg",
        "A completely white historical flag.",
        "White national ensign of Restoration France",
      ),
      feedbackFlags: [
        {
          src: currentFlag("FRA"),
          alt: "French tricolor",
          label: "Revolutionary tricolor",
        },
        history[0],
        {
          src: currentFlag("FRA"),
          alt: "French tricolor restored in 1830",
          label: "Tricolor restored · 1830",
        },
      ],
      source: source(
        "Flags of the World · Bourbon Restoration",
        "https://www.fotw.info/flags/fr_rest.html",
      ),
      sources: [
        source(
          "Flags of the World · Restoration naval flags",
          "https://www.fotw.info/flags/fr~rest.html",
        ),
      ],
      qualification:
        "Today’s countries locate the historical events. The white national ensign belonged to the Bourbon Restoration, interrupted by Napoleon’s Hundred Days in 1815.",
      scenes: {
        play: { focus: europe, contextIds: [] },
        reveal: { focus: europe, contextIds: [], answerIds: ["wurl:FRA"] },
      },
    }),
    defineQuestion({
      ...base,
      id: "bare-02-yellow-banner",
      title: "Yellow, Apparently",
      progressLabel: "Yellow, Apparently",
      resolvedLabel: "Brunei · Sultan’s yellow banner",
      mode: "pin",
      count: 1,
      selection: { type: "none" },
      commitment: "submit",
      rule: {
        type: "pin-distance",
        targetId: capital.id,
        radiusKm: 250,
        tiers: [
          { radiusKm: 100, feedback: "Well placed." },
          { radiusKm: 200, feedback: "Very close." },
          { radiusKm: 250, feedback: "Within range." },
        ],
      },
      incorrectFeedback: "Not quite.",
      leadIn:
        "Before it added stripes and a crest, one Southeast Asian sultan's banner was simply yellow. Brunei is a tiny sultanate on Borneo, an island shared with Malaysia and Indonesia.",
      prompt: "Place a pin at Brunei’s capital on Borneo’s coast.",
      explanation:
        "Bandar Seri Begawan is the capital, in Brunei’s larger western pocket on Borneo’s northern coast. The sultan’s plain-yellow royal banner predated the country's first official state flag, introduced in 1906 with black and white diagonal stripes. A red crest arrived in 1959. The flag did eventually get a few more details.",
      guidance: {
        hint: "Look along the northern side of Borneo rather than the coasts farther south.",
        assist: {
          text: "Brunei is on the island's northwestern coast. Use these more distant Bornean cities to orient yourself, then find the stretch of coast between them and the northern tip.",
          places: [kuching, balikpapan],
        },
      },
      image: image(
        "clue-02.svg",
        "A yellow rectangle, labeled Sultan’s historical banner.",
        "The Sultan of Brunei’s historical yellow royal banner",
      ),
      feedbackFlags: [
        history[1],
        {
          src: assets + "striped-02.svg",
          alt: "Yellow with white and black diagonal stripes",
          label: "State flag · 1906–1959",
        },
        {
          src: currentFlag("BRN"),
          alt: "Brunei’s striped flag with red crest",
          label: "Crest added · 1959",
        },
      ],
      source: bruneiSource,
      sources: [
        source(
          "Brunei Information Department · annual report",
          "https://www.information.gov.bn/Publication%20listsPDF/Annual_Report_BruneiDarussalam_2005-2009%28Part_One%29.pdf",
        ),
        source(
          "GeoNames · Bandar Seri Begawan",
          "https://www.geonames.org/1820906/",
        ),
      ],
      qualification:
        "The yellow field represents the Sultan’s personal banner. The first official state flag dates to 1906. Distance is measured from the capital, Bandar Seri Begawan.",
      visualExceptions: {
        "hidden-boundaries":
          "Brunei’s tiny border would identify the location being estimated; the supplied outline is the whole island of Borneo.",
      },
      map: {
        ...base.map,
        borders: false,
        feedbackBorders: true,
        feedbackRegions: "neutral",
      },
      scenes: {
        play: {
          focus: island,
          contextIds: [],
          overlays: [coast],
          places: [
            areaLabel({
              id: "bare:borneo-label",
              name: "Borneo",
              kind: "other",
              lat: 0.5,
              lng: 114,
              sourceId: "natural-earth:5.1.2",
            }),
          ],
        },
        reveal: {
          focus: { lat: 4.6, lng: 115, altitude: 0.35 },
          contextIds: ["wurl:BRN"],
          places: [capital],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "bare-03-redundant",
      title: "Redundant",
      progressLabel: "Redundant",
      resolvedLabel: "Hungary + Oman · Two red flags",
      mode: "map-multiple",
      count: 2,
      selection: {
        type: "ids",
        ids: ids(
          "HUN",
          "AUT",
          "SVK",
          "CZE",
          "ROU",
          "OMN",
          "YEM",
          "SAU",
          "ARE",
          "QAT",
        ),
      },
      commitment: "submit",
      allowTyping: false,
      rule: { type: "country-ids", ids: ids("HUN", "OMN") },
      partialCredit: "one-of-two",
      correctFeedback: "Both found.",
      incorrectFeedback: "Compare the two.",
      leadIn:
        "Two distant governments settled on the same color. Around 1919, both used flags that were just red. One was a short-lived socialist republic in Central Europe. The other was a sultanate on the southeastern Arabian Peninsula.",
      prompt: "Find both countries on the globe.",
      explanation:
        "Hungary's Soviet Republic flew a red flag during its brief existence in 1919. Far away, the Sultanate of Muscat and Oman used an entirely red flag before Oman adopted a multicolored design in 1970. Their governments and circumstances were very different; their graphic ambitions happened to converge.",
      guidance: {
        hint: "The European republic emerged from the collapse of Austria-Hungary. The other state lies near the eastern end of the Arabian Peninsula, facing the Arabian Sea.",
        assist: {
          text: "Compare three countries in each region. Only one in each group used the featured plain-red flag.",
          candidateIds: ids("HUN", "AUT", "SVK", "OMN", "YEM", "ARE"),
        },
      },
      image: image(
        "clue-03.svg",
        "Two identical plain-red historical flags.",
        "Red flags of Hungary’s Soviet Republic and Muscat and Oman",
      ),
      feedbackFlags: [history[2], history[3]],
      source: source(
        "The FAME · Hungarian Soviet Republic flag",
        "https://zeljko-heimer-fame.from.hr/descr/hu-sovie.html",
      ),
      sources: [
        source(
          "Oman Foreign Ministry · flag history",
          "https://www.fm.gov.om/en/about-oman/state/flag-emblem-and-national-anthem/",
        ),
      ],
      qualification:
        "Hungary’s Soviet Republic lasted from March to August 1919. Modern Hungary and Oman are geographic locators for these historical states.",
      scenes: {
        play: { focus: redFlags, contextIds: [] },
        reveal: {
          focus: redFlags,
          contextIds: [],
          answerIds: ids("HUN", "OMN"),
          views: [
            { lat: 47, lng: 19, altitude: 0.6 },
            { lat: 21, lng: 57, altitude: 0.6 },
            redFlags,
          ],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "bare-04-extremes",
      title: "A Study in Extremes",
      progressLabel: "A Study in Extremes",
      resolvedLabel: "Kabul · Afghanistan, 1996",
      mode: "city-single",
      count: 1,
      selection: { type: "ids", ids: afghanCities.map((p) => p.id) },
      commitment: "submit",
      allowTyping: false,
      rule: { type: "place-ids", ids: [kabul.id] },
      correctFeedback: "Well located.",
      incorrectFeedback: "Not quite.",
      leadIn:
        "Black was the royal flag color under Emir Abdur Rahman Khan in the late 1800s. A century later, a new movement carried white banners: the Taliban advanced from southern Afghanistan and captured the capital in September 1996, making it the seat of their government.",
      prompt: "Which marked city did they capture?",
      explanation:
        "Kabul. The two banners belonged to very different political orders: black was a royal and state flag color under the emirate, while the Taliban’s initially white banner later gained a religious inscription. Even a single-color flag could change its meaning as the government behind it changed.",
      guidance: {
        hint: "Look in the eastern half of Afghanistan. The capital lies in a mountain valley, not on the country's far western edge.",
        assist: {
          text: "Three markers remain: one in the central-eastern highlands, one farther south, and one toward the eastern border.",
          candidateIds: [kabul.id, "place:1138336", "place:1139715"],
        },
      },
      image: image(
        "clue-04.svg",
        "Black historical banner reconstruction beside an initially white banner from 1996.",
      ),
      feedbackFlags: [history[4], history[5]],
      source: source(
        "Encyclopaedia Iranica · Afghan flag history",
        "https://www.iranicaonline.org/articles/flags-ii/",
      ),
      sources: [
        source(
          "Reuters · reporting, September 1996",
          "https://www.washingtonpost.com/archive/politics/1996/09/29/afghan-militia-halts-advance-after-kabul/325ae991-b7ab-45aa-af7e-9e8d953f9be8/",
        ),
        source(
          "Flags of the World · early Taliban banners",
          "https://www.crwflags.com/FOTW/flags/af_talib.html",
        ),
      ],
      qualification:
        "The black rectangle is a reconstruction: scholarship establishes black as the royal/state flag color under Abdur Rahman Khan and records variants with emblems. Contemporary 1996 reporting documents an initially plain-white Taliban banner.",
      map: { ...base.map, feedbackRegions: "neutral" },
      scenes: {
        play: {
          focus: afghanistan,
          contextIds: ["wurl:AFG"],
          places: afghanCities,
        },
        reveal: {
          focus: afghanistan,
          contextIds: ["wurl:AFG"],
          places: [kabul],
        },
      },
    }),
    defineQuestion({
      ...base,
      id: "bare-05-final-form",
      title: "The Final Form",
      progressLabel: "The Final Form",
      resolvedLabel: "Libya · 1977–2011",
      mode: "map-single",
      count: 1,
      selection: {
        type: "ids",
        ids: ids("LBY", "TUN", "DZA", "EGY", "MAR", "SDN"),
      },
      commitment: "immediate",
      allowTyping: false,
      rule: { type: "country-ids", ids: ["wurl:LBY"] },
      correctFeedback: "Well recognized.",
      incorrectFeedback: "Not quite.",
      leadIn:
        "In 1977, a North African country adopted a national flag with no stripes, symbols, or writing—just green. It kept that design for more than three decades, until the upheaval of 2011.",
      prompt: "Which country was it?",
      explanation:
        "Libya’s 2011 uprising brought back the red-black-green flag of its earlier independence era, including the crescent and star. An older design replaced the plain-green flag adopted under Muammar Gaddafi in 1977, linking the country’s new political chapter to its earlier national symbols.",
      guidance: {
        hint: "Look to the Mediterranean side of North Africa rather than farther into the Sahara.",
        assist: {
          text: "Four Mediterranean countries remain. Consider which one experienced a major uprising against a long-serving ruler in 2011.",
          candidateIds: ids("LBY", "TUN", "DZA", "EGY"),
        },
      },
      image: image(
        "field-07.svg",
        "A completely green historical flag.",
        "Libya’s former plain-green national flag",
      ),
      feedbackFlags: [
        history[6],
        {
          src: currentFlag("LBY"),
          alt: "Libya’s red-black-green flag with crescent and star",
          label: "Independence-era design returned · 2011",
        },
      ],
      source: source(
        "SAVA · Libya national flag, 1977–2011",
        "https://www.savaflags.org.za/spec/Libya%20-%20national%20-%201977%20-%202011.pdf",
      ),
      sources: [
        source(
          "Flags of the World · Libya 1977–2011",
          "https://www.crwflags.com/fotw/flags/ly_1977.html",
        ),
      ],
      scenes: {
        play: { focus: northAfrica, contextIds: [] },
        reveal: { focus: northAfrica, contextIds: [], answerIds: ["wurl:LBY"] },
      },
    }),
  ],
  completion: {
    focus: { lat: 25, lng: 40, altitude: 2 },
    regionIds: ids("FRA", "BRN", "HUN", "OMN", "LBY"),
    contextIds: ["wurl:AFG"],
    views: [
      europe,
      { lat: 4.6, lng: 115, altitude: 0.35 },
      { lat: 47, lng: 19, altitude: 0.6 },
      { lat: 21, lng: 57, altitude: 0.6 },
      afghanistan,
      northAfrica,
    ],
    physicalFeatures: [],
    overlays: [],
    places: [
      { ...capital, displayRole: undefined, visualState: "visited" },
      { ...kabul, displayRole: undefined, visualState: "visited" },
    ],
    flags: history,
    caption:
      "Six countries. A handful of colors. More history than the designs let on.",
    mapAttribution: {
      label: "Flag and geography sources",
      url: assets + "SOURCES.md",
    },
  },
};
