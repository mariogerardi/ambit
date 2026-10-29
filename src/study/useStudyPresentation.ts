import { useMemo } from "react";
import type {
  PlaceFeature,
  Focus,
  RegionFeature,
  VisualState,
} from "../geography/types";
import { DISPLAY_CAPITALS } from "../geography/places";
import { US_STATES } from "../geography/usStates";
import { capitalOf, studyPool, studyStates } from "./engine";
import type { StudyAnswer, StudySession, StudySettings } from "./engine";
import type { StudyPlaceTarget } from "./placeReview";
import type { LearningTarget } from "./learning";
import { isStudyPinPrompt, studyPinTarget } from "./pins";
import { isPlaceTopic, STUDY_PLACES } from "./placeTopics";

interface StudyPresentationOptions {
  active: boolean;
  /** Supply only the session currently being shown, not a saved background session. */
  session?: StudySession;
  preview?: StudySettings;
  previewPlaces?: StudyPlaceTarget[];
  previewReviewTargets?: LearningTarget[];
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
  previewPlaces,
  previewReviewTargets,
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
              [review.prompt.place?.regionId ??
              review.prompt.place?.countryId ??
              review.prompt.targetId]: "answer",
              ...(review.selectedId &&
              review.selectedId !==
                (review.prompt.place?.countryId ?? review.prompt.targetId)
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
  const previewTargets = session ? undefined : previewPlaces;
  const recognitionPlace =
    session &&
    shownPrompt &&
    isPlaceTopic(shownPrompt.topic) &&
    ["typing", "choices"].includes(shownPrompt.style)
      ? shownPrompt.place
      : undefined;
  const recognitionFocus = useMemo(
    () =>
      recognitionPlace
        ? {
            lat: recognitionPlace.lat,
            lng: recognitionPlace.lng,
            altitude: 0.65,
          }
        : undefined,
    [recognitionPlace],
  );
  const recognitionRevealed = session?.phase !== "playing";
  const reviewTourTargets =
    active && !session ? previewReviewTargets : undefined;
  const reviewTourPlaces = useMemo<PlaceFeature[]>(
    () =>
      !reviewTourTargets
        ? []
        : reviewTourTargets.flatMap((target) => {
            const region = regions.find(
              (region) =>
                region.id === (target.place?.countryId ?? target.targetId),
            );
            const capital =
              target.topic === "capitals"
                ? capitalOf(target.targetId)
                : undefined;
            const location = target.place ?? capital ?? region?.focus;
            if (!location) return [];
            return [
              {
                id: `study-review-preview:${target.key}`,
                name: "???",
                lat: location.lat,
                lng: location.lng,
                kind: capital ? "capital" : target.place ? "pin" : "landform",
                parentId: region?.id,
                sourceId: "study:review",
                visualState: "hinted",
                markerHidden: !capital && !target.place,
                priority: 1000,
              },
            ];
          }),
    [reviewTourTargets, regions],
  );
  const previewViews = useMemo<Focus[]>(
    () =>
      reviewTourPlaces.map((place) => ({
        lat: place.lat,
        lng: place.lng,
        altitude:
          place.kind === "capital" || place.kind === "pin"
            ? 0.55
            : (regions.find((region) => region.id === place.parentId)?.focus
                .altitude ?? 0.85),
      })),
    [reviewTourPlaces, regions],
  );
  const places = useMemo<PlaceFeature[] | undefined>(() => {
    if (!display) return undefined;
    if (recognitionPlace)
      return [
        {
          ...recognitionPlace,
          name: recognitionRevealed ? recognitionPlace.name : "?",
          kind: "pin",
          sourceId: "study:recognition",
          priority: 1000,
          visualState: recognitionRevealed ? "answer" : "hinted",
        },
      ];
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
      ...reviewTourPlaces,
      ...(!session
        ? STUDY_PLACES.filter(
            (place) =>
              display.topics.includes(place.topic) && ids.has(place.countryId),
          ).map(
            (place): PlaceFeature => ({
              id: place.id,
              name: place.name,
              lat: place.lat,
              lng: place.lng,
              parentId: place.countryId,
              kind: place.topic === "cities" ? "city" : "landmark",
              sourceId: place.sourceUrl!,
            }),
          )
        : []),
      ...(previewTargets ?? []).map(
        (target): PlaceFeature => ({
          ...target,
          id: `study-preview:${target.id}`,
          kind: "pin",
          sourceId: "study:review",
          visualState: "hinted",
          priority: 1000,
        }),
      ),
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
    previewTargets,
    reviewTourPlaces,
    !!session,
    recognitionPlace,
    recognitionRevealed,
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
    previewViews,
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
      ? !!placeSession ||
        !!recognitionPlace ||
        (!session && display.topics.some(isPlaceTopic)) ||
        !!previewPlaces?.length ||
        !!reviewTourPlaces.length ||
        display.capitalMarkers ||
        !!capitalReveal
      : true,
    placeLabels: display
      ? !!placeSession ||
        !!recognitionPlace ||
        (!session && display.topics.some(isPlaceTopic)) ||
        !!previewPlaces?.length ||
        !!reviewTourPlaces.length ||
        display.capitalNames ||
        display.countryNames ||
        !!capitalReveal
      : true,
    highlight: session?.prompt.topic === "countries" ? clueFocus : undefined,
    capitalFocus: recognitionFocus
      ? recognitionFocus
      : session?.prompt.topic === "capitals"
        ? clueFocus
        : undefined,
  };
}
