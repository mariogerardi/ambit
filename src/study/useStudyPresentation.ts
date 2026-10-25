import { useMemo } from "react";
import type {
  PlaceFeature,
  RegionFeature,
  VisualState,
} from "../geography/types";
import { DISPLAY_CAPITALS } from "../geography/places";
import { US_STATES } from "../geography/usStates";
import { capitalOf, studyPool, studyStates } from "./engine";
import type { StudyAnswer, StudySession, StudySettings } from "./engine";
import { isStudyPinPrompt, studyPinTarget } from "./pins";

interface StudyPresentationOptions {
  active: boolean;
  /** Supply only the session currently being shown, not a saved background session. */
  session?: StudySession;
  preview?: StudySettings;
  settings: StudySettings;
  review?: StudyAnswer;
  regions: RegionFeature[];
  neutral: Record<string, VisualState>;
}

/** Study's declarative globe state; camera orchestration and player input are separate. */
export function useStudyPresentation({
  active,
  session: savedSession,
  preview,
  settings,
  review,
  regions,
  neutral,
}: StudyPresentationOptions) {
  const session = active ? savedSession : undefined;
  const display = active ? (session?.settings ?? preview) : undefined;
  const ids = useMemo(
    () => new Set(display ? studyPool(display) : []),
    [display],
  );
  const regionIds = useMemo(() => [...ids], [ids]);
  const capitalReveal =
    session?.phase === "feedback" && session.prompt.topic === "capitals"
      ? capitalOf(session.prompt.targetId)
      : undefined;

  const states = useMemo<Record<string, VisualState> | undefined>(() => {
    if (!active) return undefined;
    if (session)
      return {
        ...neutral,
        ...studyStates(session),
        ...(session.phase === "summary" && review
          ? {
              [review.prompt.place?.regionId ?? review.prompt.targetId]:
                "answer",
              ...(review.selectedId &&
              review.selectedId !== review.prompt.targetId
                ? { [review.selectedId]: "incorrect" }
                : {}),
            }
          : {}),
      };
    if (display)
      return {
        ...neutral,
        ...Object.fromEntries(
          regionIds.map((id) => [
            id,
            display.scope === "custom" ? "selected" : "selectable",
          ]),
        ),
      };
    return neutral;
  }, [active, session, review, display, regionIds, neutral]);

  const shownPrompt =
    session?.phase === "summary" ? review?.prompt : session?.prompt;
  const placeSession =
    session && shownPrompt && isStudyPinPrompt(shownPrompt)
      ? session
      : undefined;
  const places = useMemo<PlaceFeature[] | undefined>(() => {
    if (!display) return undefined;
    if (placeSession) {
      const session = placeSession;
      const answer =
        session.phase === "summary" ? review : session.history.at(-1);
      const targetPrompt =
        session.phase === "summary" ? review?.prompt : session.prompt;
      const target = targetPrompt && studyPinTarget(targetPrompt, regions);
      return [
        ...(session.phase === "playing" && session.pin
          ? [
              {
                id: "study:guess",
                name: "Your pin",
                kind: "pin" as const,
                sourceId: "study",
                ...session.pin,
                visualState: "selected" as const,
                labelHidden: true,
                priority: 1000,
              },
            ]
          : []),
        ...(session.phase !== "playing" && target
          ? [
              {
                id: "study:target",
                name: target.name,
                kind: "pin" as const,
                sourceId: "study",
                lat: target.lat,
                lng: target.lng,
                visualState: answer?.correct
                  ? ("correct" as const)
                  : ("answer" as const),
                priority: 1000,
              },
            ]
          : []),
        ...(session.phase !== "playing" && answer?.pin
          ? [
              {
                id: "study:guess",
                name: "Your pin",
                kind: "pin" as const,
                sourceId: "study",
                ...answer.pin,
                visualState: answer.correct
                  ? ("correct" as const)
                  : ("incorrect" as const),
                labelHidden: true,
                priority: 1000,
              },
            ]
          : []),
      ];
    }
    return [
      ...(display.capitalMarkers || display.capitalNames || capitalReveal
        ? DISPLAY_CAPITALS.filter(
            (c) =>
              c.id === capitalReveal?.id ||
              ((display.capitalMarkers || display.capitalNames) &&
                ids.has(c.countryId)),
          ).map((c) => ({
            ...c,
            name: c.id === capitalReveal?.id ? capitalReveal.name : c.name,
            markerHidden: !display.capitalMarkers && c.id !== capitalReveal?.id,
            labelHidden: !display.capitalNames && c.id !== capitalReveal?.id,
            priority: c.id === capitalReveal?.id ? 1000 : undefined,
          }))
        : []),
      ...(display.countryNames
        ? regions
            .filter((r) => ids.has(r.id))
            .map(
              (r): PlaceFeature => ({
                id: `study-country:${r.id}`,
                name: r.name,
                kind: "landform",
                parentId: r.id,
                lat: r.focus.lat,
                lng: r.focus.lng,
                sourceId: "study:names",
                markerHidden: true,
              }),
            )
        : []),
    ];
  }, [
    display,
    ids,
    capitalReveal,
    regions,
    placeSession,
    placeSession ? review : undefined,
  ]);

  // Map answers have no country focus: framing their target would disclose it.
  const clueFocus =
    session &&
    session.phase !== "summary" &&
    session.prompt.style !== "map" &&
    !isStudyPinPrompt(session.prompt)
      ? regions.find((r) => r.id === session.prompt.targetId)?.focus
      : undefined;
  const revealRegionId =
    session?.placeReview && session.phase !== "playing"
      ? (review?.prompt.place ?? session.prompt.place)?.regionId
      : undefined;
  const mapRegions = useMemo(() => {
    const state = US_STATES.find((r) => r.id === revealRegionId);
    return state ? [...regions, state] : regions;
  }, [regions, revealRegionId]);
  return {
    regions: mapRegions,
    display,
    states,
    places,
    borders: display?.borders ?? (active ? settings.borders : undefined),
    regionNames: display
      ? display.countryNames
        ? ("committed" as const)
        : ("none" as const)
      : undefined,
    borderRegionIds: display
      ? display.borders
        ? session?.placeReview
          ? regions.map((r) => r.id)
          : regionIds
        : []
      : undefined,
    namedRegionIds: display ? regionIds : undefined,
    placeMarkers: display
      ? !!placeSession || display.capitalMarkers || !!capitalReveal
      : true,
    placeLabels: display
      ? !!placeSession ||
        display.capitalNames ||
        display.countryNames ||
        !!capitalReveal
      : true,
    highlight: session?.prompt.topic === "countries" ? clueFocus : undefined,
    capitalFocus: session?.prompt.topic === "capitals" ? clueFocus : undefined,
  };
}
