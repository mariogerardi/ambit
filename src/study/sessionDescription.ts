import type { StudySession } from "./engine";
import { countryName, studyStyle } from "./engine";
import { STUDY_CONTINENTS as areas, selectedContinents } from "./areas";
export function sessionTitle(session: StudySession) {
  if (session.learningReview) return "Review";
  if (session.placeReview) return "Map review";
  return `${session.settings.topics.length > 1 ? "Mixed topics" : sessionTopics(session)} · ${sessionArea(session)}`;
}
export function sessionTopics(session: StudySession) {
  return session.settings.topics
    .map(
      (topic) =>
        ({
          countries: "Countries",
          capitals: "Capitals",
          flags: "Flags",
          cities: "Major Cities",
          landmarks: "Landmarks",
        })[topic],
    )
    .join(" · ");
}
export function sessionArea(session: StudySession) {
  if (session.learningReview) return "Review";
  if (session.placeReview) return "Map review";
  const settings = session.settings;
  const continents = selectedContinents(settings);
  return settings.scope === "all"
    ? "Worldwide"
    : settings.scope === "continent"
      ? areas[settings.continent]
      : continents.length
        ? continents.map((continent) => areas[continent]).join(" · ")
        : settings.countryIds.length <= 2
          ? settings.countryIds.map(countryName).join(" & ")
          : `${settings.countryIds.length} countries`;
}
export function sessionMethod(session: StudySession) {
  if (session.learningReview) return "Varied questions";
  if (session.placeReview) return "Place a pin";
  const methods = [
    ...new Set(
      session.settings.topics.map((topic) =>
        studyStyle(session.settings, topic),
      ),
    ),
  ];
  return methods.length === 1
    ? {
        map: "Select on globe",
        pin: "Place a pin",
        typing: "Type answers",
        choices: "Multiple choice",
        mixed: "Mixed methods",
      }[methods[0]]
    : "Varied methods";
}
