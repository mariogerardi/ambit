import type {
  Focus,
  MapOverlay,
  PhysicalFeature,
  PlaceFeature,
} from "../geography/types";
import type { Question } from "./questionContracts";

export interface PlayScene {
  focus?: Focus;
  /** Fit all eligible region outlines; an authored focus is optional. */
  framing?: "selection";
  /** Pull back from the current orientation to the whole globe, then rotate. */
  orbit?: boolean;
  /** One pass through broad orientation views, ending at the playable focus. */
  views?: Focus[];
  /** Scale this intro's travel time without changing other tours (0.25–2). */
  durationScale?: number;
  contextIds?: string[];
  candidateRegionIds?: string[];
  /** Labels for already supplied area clues; never infer a withheld name. */
  clueLocators?: { regionId: string; label: string }[];
  places?: PlaceFeature[];
  overlays?: MapOverlay[];
  physicalFeatures?: PhysicalFeature[];
  map?: Partial<NonNullable<Question["map"]>>;
}
export interface AssistScene {
  /** Replace play's background fills; an empty list clears them. */
  backgroundRegionIds?: string[];
  borders?: boolean;
  focus?: Focus;
  places?: PlaceFeature[];
  overlays?: MapOverlay[];
  physicalFeatures?: PhysicalFeature[];
}
export interface RevealScene {
  focus?: Focus;
  orbit?: boolean;
  returnToSelection?: boolean;
  network?: { regionIds: string[]; label: string };
  /** One pass through the revealed geography; interrupted by globe input. */
  views?: Focus[];
  /** Known geography retains context color; answered regions are separate. */
  contextIds?: string[];
  answerIds?: string[];
  places?: PlaceFeature[];
  overlays?: MapOverlay[];
  physicalFeatures?: PhysicalFeature[];
  borders?: boolean;
}
export interface QuestionScenes {
  play?: PlayScene;
  assist?: AssistScene;
  reveal?: RevealScene;
}
/** Compile authored scenes once; the renderer keeps its existing read model. */
export function compileQuestionScenes(
  question: Omit<Question, "focus"> & { focus?: Focus },
): Question {
  const { play, assist, reveal } = question.scenes ?? {};
  const focus =
    play?.focus ??
    question.focus ??
    (play?.framing === "selection"
      ? { lat: 0, lng: 0, altitude: 2.2 }
      : undefined);
  if (!focus)
    throw Error(`Question requires a playable focus: ${question.id}.`);
  if (!question.scenes) return question as Question;
  const compiled: Question = { ...question, focus };
  const assign = <K extends keyof Question>(
    key: K,
    value: Question[K] | undefined,
  ) => {
    if (value !== undefined) compiled[key] = value;
  };
  assign("playFraming", play?.framing);
  assign("playOrbit", play?.orbit);
  assign("contextIds", play?.contextIds);
  assign("introViews", play?.views);
  assign("introDurationScale", play?.durationScale);
  assign("candidateRegionIds", play?.candidateRegionIds);
  assign("clueLocators", play?.clueLocators);
  assign("places", play?.places);
  assign("overlays", play?.overlays);
  assign("physicalFeatures", play?.physicalFeatures);
  if (play?.map)
    compiled.map = {
      borders: true,
      hoverFeedback: true,
      muteOthers: false,
      ...question.map,
      ...play.map,
    };
  assign("feedbackFocus", reveal?.focus);
  const revealViews = reveal?.views;
  const lastView = revealViews?.at(-1);
  assign(
    "feedbackViews",
    reveal?.orbit &&
      reveal.focus &&
      (!lastView ||
        lastView.lat !== reveal.focus.lat ||
        lastView.lng !== reveal.focus.lng ||
        lastView.altitude !== reveal.focus.altitude)
      ? [...(revealViews ?? []), reveal.focus]
      : revealViews,
  );
  assign("feedbackOrbit", reveal?.orbit);
  assign("feedbackReturnToSelection", reveal?.returnToSelection);
  assign("feedbackNetwork", reveal?.network);
  // A single-country network tour returns to the player's choice unless overridden.
  if (
    compiled.mode === "map-single" &&
    compiled.feedbackNetwork &&
    compiled.feedbackReturnToSelection === undefined &&
    !compiled.feedbackOrbit
  )
    compiled.feedbackReturnToSelection = true;
  assign("feedbackHintIds", reveal?.contextIds);
  assign("feedbackContextIds", reveal?.answerIds);
  assign("feedbackPlaces", reveal?.places);
  assign("feedbackOverlays", reveal?.overlays);
  assign("feedbackPhysicalFeatures", reveal?.physicalFeatures);
  if (reveal?.borders !== undefined)
    compiled.map = {
      borders: true,
      hoverFeedback: true,
      muteOthers: false,
      ...compiled.map,
      feedbackBorders: reveal.borders,
    };
  if (assist) {
    if (!question.guidance?.assist)
      throw Error(
        `Assist scene requires authored assist copy: ${question.id}.`,
      );
    compiled.guidance = {
      ...question.guidance,
      assist: {
        ...question.guidance.assist,
        ...(assist.backgroundRegionIds !== undefined
          ? { backgroundRegionIds: assist.backgroundRegionIds }
          : {}),
        ...(assist.borders !== undefined ? { borders: assist.borders } : {}),
        ...(assist.places !== undefined ? { places: assist.places } : {}),
        ...(assist.overlays !== undefined ? { overlays: assist.overlays } : {}),
        ...(assist.focus !== undefined ? { focus: assist.focus } : {}),
        ...(assist.physicalFeatures !== undefined
          ? { physicalFeatures: assist.physicalFeatures }
          : {}),
      },
    };
  }
  return compiled;
}
