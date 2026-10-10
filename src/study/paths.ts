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
    settings: pathSettings("countries", "map", "AS"),
  },
  {
    id: "africa",
    title: "African capitals",
    description: "Connect African countries with their capitals.",
    detail: "Africa · Multiple choice · 10 questions",
    settings: pathSettings("capitals", "choices", "AF"),
  },
  {
    id: "flags",
    title: "World flags",
    description: "Recognize the flags of countries worldwide.",
    detail: "Worldwide · Multiple choice · 10 questions",
    settings: pathSettings("flags", "choices"),
  },
];
