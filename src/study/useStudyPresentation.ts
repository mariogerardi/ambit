import { useMemo } from "react";
import type {
  PlaceFeature,
  RegionFeature,
  VisualState,
} from "../geography/types";
import { DISPLAY_CAPITALS } from "../geography/places";
import { capitalOf, studyPool, studyStates } from "./engine";
import type { StudyAnswer, StudySession, StudySettings } from "./engine";

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
              [review.prompt.targetId]: "answer",
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

  const places = useMemo<PlaceFeature[] | undefined>(() => {
    if (!display) return undefined;
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
  }, [display, ids, capitalReveal, regions]);

  // Map answers have no country focus: framing their target would disclose it.
  const clueFocus =
    session && session.phase !== "summary" && session.prompt.style !== "map"
      ? regions.find((r) => r.id === session.prompt.targetId)?.focus
      : undefined;
  return {
    display,
    states,
    places,
    borders: display?.borders ?? (active ? settings.borders : undefined),
    regionNames: display
      ? display.countryNames
        ? ("committed" as const)
        : ("none" as const)
      : undefined,
    borderRegionIds: display ? (display.borders ? regionIds : []) : undefined,
    namedRegionIds: display ? regionIds : undefined,
    placeMarkers: display ? display.capitalMarkers || !!capitalReveal : true,
    placeLabels: display
      ? display.capitalNames || display.countryNames || !!capitalReveal
      : true,
    highlight: session?.prompt.topic === "countries" ? clueFocus : undefined,
    capitalFocus: session?.prompt.topic === "capitals" ? clueFocus : undefined,
  };
}
