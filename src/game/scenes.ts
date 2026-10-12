import type {
  Focus,
  MapOverlay,
  PhysicalFeature,
  PlaceFeature,
} from "../geography/types";
import type { Question } from "./questions";

export interface PlayScene {
  focus?: Focus;
  contextIds?: string[];
  places?: PlaceFeature[];
  overlays?: MapOverlay[];
  physicalFeatures?: PhysicalFeature[];
  map?: Partial<NonNullable<Question["map"]>>;
}
export interface AssistScene {
  places?: PlaceFeature[];
  overlays?: MapOverlay[];
}
export interface RevealScene {
  focus?: Focus;
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
  const focus = play?.focus ?? question.focus;
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
  assign("contextIds", play?.contextIds);
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
        ...(assist.places !== undefined ? { places: assist.places } : {}),
        ...(assist.overlays !== undefined ? { overlays: assist.overlays } : {}),
      },
    };
  }
  return compiled;
}
