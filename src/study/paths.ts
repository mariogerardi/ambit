import { defaultSettings } from "./engine";
import type { StudySettings, StudyStyle, StudyTopic } from "./engine";

function pathSettings(
  topic: StudyTopic,
  method: StudyStyle,
  continent?: string,
): StudySettings {
  return {
    ...defaultSettings,
    topics: [topic],
    scope: continent ? "continent" : "all",
    continent: continent ?? "AF",
    countryIds: [],
    styles: { countries: method, capitals: method, flags: method },
    length: 10,
    choiceCount: 4,
    autoAdvance: false,
  };
}

export const STUDY_PATHS = [
  {
    id: "asia",
    title: "Discover Asia",
    description: "Get to know Asia's countries on the globe.",
    detail: "Asia · Tap globe · 10 questions",
    image: "/previews/discover-asia.svg",
    imageAlt: "A map of Asia with several countries highlighted.",
    howToPlay:
      "Read a country name and find it on the globe. Tap your choice, submit your answer, and use the reveal to learn its location. Practice ten countries at your own pace.",
    settings: pathSettings("countries", "map", "AS"),
  },
  {
    id: "africa",
    title: "African capitals",
    description: "Connect African countries with their capitals.",
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
    description: "Recognize the flags of countries worldwide.",
    detail: "Worldwide · Multiple choice · 10 questions",
    image: "/previews/world-flags.svg",
    imageAlt: "A collection of national flags from around the world.",
    howToPlay:
      "Look at a flag and choose its country from four options. Learn from each reveal and work through ten flags, with no timer.",
    settings: pathSettings("flags", "choices"),
  },
];
