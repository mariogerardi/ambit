import { defaultSettings } from "./engine";
import type { StudySettings, StudyStyle, StudyTopic } from "./engine";

function pathSettings(
  topic: StudyTopic | StudyTopic[],
  method: StudyStyle,
  continent?: string,
): StudySettings {
  return {
    ...defaultSettings,
    topics: Array.isArray(topic) ? topic : [topic],
    scope: continent ? "continent" : "all",
    continent: continent ?? "AF",
    countryIds: [],
    styles: {
      countries: method,
      capitals: method,
      flags: method,
      ...Object.fromEntries(
        (Array.isArray(topic) ? topic : [topic]).map((item) => [item, method]),
      ),
    },
    length: 10,
    choiceCount: 4,
    autoAdvance: false,
  };
}

export const STUDY_PATHS = [
  {
    id: "asia",
    title: "Discover Asia",
    description:
      "Explore Asia through ten country-finding questions, from familiar outlines to places you may be meeting for the first time. Select each named country on the globe, learn from the reveal, and move on at your own pace.",
    detail: "Asia · Select on globe · 10 questions",
    image: "/previews/discover-asia.svg",
    imageAlt: "A map of Asia with several countries highlighted.",
    howToPlay:
      "Find each named country on the globe. Selecting a country reveals the answer. Ten questions, at your own pace.",
    settings: pathSettings("countries", "map", "AS"),
  },
  {
    id: "africa",
    title: "African capitals",
    description:
      "Build a clearer picture of Africa by connecting countries with their capitals. Choose from four city names, then use the globe to see where the answer belongs. Ten questions give you room to learn without rushing.",
    detail: "Africa · Multiple choice · 10 questions",
    image: "/previews/african-capitals.svg",
    imageAlt: "An illustrated map of Africa with capital city markers.",
    howToPlay:
      "Choose the capital of each country from four options. Check the answer on the globe, then move on when you are ready. Each session has ten questions.",
    settings: pathSettings("capitals", "choices", "AF"),
  },
  {
    id: "flags",
    title: "World flags",
    description:
      "Look beyond familiar flags and learn to recognize countries by their colors, shapes, and symbols. Choose each flag’s country from four options, then find it on the globe. Work through ten flags with no timer.",
    detail: "Worldwide · Multiple choice · 10 questions",
    image: "/previews/world-flags.svg",
    imageAlt: "A collection of national flags from around the world.",
    howToPlay:
      "Look at a flag and choose its country from four options. Learn from each reveal and work through ten flags, with no timer.",
    settings: pathSettings("flags", "choices"),
  },
  {
    id: "europe-essentials",
    title: "Europe essentials",
    description:
      "Connect the outlines, flags, and capitals of European countries. Twenty multiple-choice questions switch between the three topics, helping you build a picture of the region rather than memorize one list.",
    detail: "Europe · Multiple choice · 20 questions",
    settings: {
      ...pathSettings(["countries", "capitals", "flags"], "choices", "EU"),
      length: 20 as const,
    },
  },
  {
    id: "south-american-capitals",
    title: "South American capitals",
    description:
      "Can you recall the capital when you see its country? Type your answers across South America, then use each reveal to connect the city with its place on the continent. Ten questions, without a timer.",
    detail: "South America · Type answers · 10 questions",
    settings: pathSettings("capitals", "typing", "SA"),
  },
  {
    id: "north-american-neighbors",
    title: "North American neighbors",
    description:
      "Find countries from Canada through Central America and the Caribbean. Follow each name to the globe, paying attention to coastlines, islands, and neighbors. A ten-question map exercise that goes beyond the largest outlines.",
    detail: "North America · Select on globe · 10 questions",
    settings: pathSettings("countries", "map", "NA"),
  },
  {
    id: "world-cities",
    title: "World cities",
    description:
      "Match a marked location with a major city. Choose from four city names, then see the answer on the globe. Ten questions connect familiar names with the coastlines, rivers, and regions around them.",
    detail: "Worldwide · Multiple choice · 10 questions",
    settings: pathSettings("cities", "choices"),
  },
  {
    id: "asian-city-finder",
    title: "Asian city finder",
    description:
      "Place ten major Asian cities on the map. Use the shape of the continent and its coastlines to narrow your search, then place a pin within 50 km of each city. Every reveal shows how close you came.",
    detail: "Asia · Place a pin · 10 questions",
    settings: pathSettings("cities", "pin", "AS"),
  },
  {
    id: "european-landmarks",
    title: "European landmarks",
    description:
      "Recognize European landmarks from photographs and place them in their geographic setting. Questions mix naming a landmark, finding its country, and placing a pin near its location. The photos and globe work together across ten questions.",
    detail: "Europe · Mixed methods · 10 questions",
    settings: pathSettings("landmarks", "mixed", "EU"),
  },
  {
    id: "mediterranean-mix",
    title: "Mediterranean mix",
    description:
      "Travel around the Mediterranean through countries, capitals, major cities, and landmarks. Twenty varied questions connect famous sights with the places around them, from Morocco and Spain to Greece, Türkiye, and Egypt.",
    detail: "Mediterranean countries · Mixed methods · 20 questions",
    settings: {
      ...pathSettings(
        ["countries", "capitals", "cities", "landmarks"],
        "mixed",
      ),
      scope: "custom" as const,
      countryIds: [
        "wurl:MAR",
        "wurl:ESP",
        "wurl:FRA",
        "wurl:ITA",
        "wurl:HRV",
        "wurl:GRC",
        "wurl:TUR",
        "wurl:EGY",
        "wurl:TUN",
      ],
      length: 20 as const,
    },
  },
];
