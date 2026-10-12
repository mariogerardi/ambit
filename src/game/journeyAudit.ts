import type { RegionFeature, PlaceFeature } from "../geography/types";
import type { Journey, Question } from "./questions";
import { createQuestionContext, solutionIds } from "./questions";
import { COUNTRY_FACTS } from "./countryFacts";
import { mechanicFor } from "./mechanics";
import { initialGame } from "./state";
import type { GameState } from "./state";
import { journeyWorld } from "../app/journeyWorld";
import { withAssistanceLocks } from "./guidance";
import { placeLabelStyle, placeMarkerSize } from "../globe/placeLabels";

export interface JourneyAudit {
  id: string;
  errors: string[];
  warnings: string[];
  assets: string[];
  questions: {
    id: string;
    mode: string;
    control: string;
    answers: string[];
    states: {
      stage: string;
      focus: unknown;
      context: string[];
      borders: boolean;
      places: {
        id: string;
        name: string;
        marker: string;
        size: number;
        state?: string;
      }[];
    }[];
  }[];
}
function mediaPaths(question: Question) {
  return [
    question.image?.src,
    question.image?.context?.src,
    question.feedbackImage?.src,
    ...(question.feedbackFlags ?? []).flatMap((flag) => [
      flag.src,
      flag.detail?.src,
    ]),
  ].filter((value): value is string => !!value);
}
const describePlace = (place: PlaceFeature) => ({
  id: place.id,
  name: place.labelHidden ? "" : place.name,
  marker: place.markerHidden ? "hidden" : placeLabelStyle(place).shape,
  size: placeMarkerSize(place),
  state: place.visualState,
});
/** Local structural/editorial review, not factual verification or browser rendering. */
export function auditJourney(
  journey: Journey,
  regions: RegionFeature[],
  assetExists?: (path: string) => boolean,
): JourneyAudit {
  const report: JourneyAudit = {
    id: journey.id,
    errors: [],
    warnings: [],
    assets: [
      ...new Set([
        ...journey.rounds.flatMap(mediaPaths),
        ...(journey.completion?.flags ?? [])
          .flatMap((flag) => [flag.src, flag.detail?.src])
          .filter((value): value is string => !!value),
      ]),
    ],
    questions: [],
  };
  for (const asset of report.assets) {
    if (asset.startsWith("/") && assetExists && !assetExists(asset))
      report.errors.push(`Missing local asset: ${asset}`);
    else if (!asset.startsWith("/"))
      report.warnings.push(`Review external media availability: ${asset}`);
  }
  let context;
  try {
    context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  } catch (error) {
    report.errors.push(error instanceof Error ? error.message : String(error));
    return report;
  }
  for (const [index, question] of journey.rounds.entries()) {
    for (const source of [question.source, ...(question.sources ?? [])]) {
      if (
        !source?.name?.trim() ||
        !/^https?:\/\//.test(source?.url ?? "") ||
        !/^\d{4}-\d{2}-\d{2}$/.test(source?.reviewedOn ?? "")
      )
        report.errors.push(`Incomplete source metadata: ${question.id}`);
    }
    const definition = mechanicFor(question);
    const answers = solutionIds(question, context);
    const playing: GameState = {
      ...initialGame,
      phase: "playing",
      roundIndex: index,
    };
    const answered = (correct: boolean): GameState => ({
      ...playing,
      phase: "feedback",
      selectedIds:
        definition.response === "selected" && correct
          ? answers.slice(0, question.count)
          : [],
      ordered: definition.control === "cards" && correct ? answers : [],
      answers: [{ ...initialGame, roundId: question.id, correct }],
    });
    const stages = [
      ["play", playing],
      ...(question.guidance
        ? [
            ["hint", { ...playing, help: { [question.id]: "hinted" } }],
            ...(question.guidance.assist
              ? [
                  [
                    "assist",
                    withAssistanceLocks(question, {
                      ...playing,
                      help: { [question.id]: "assisted" },
                    }),
                  ],
                ]
              : []),
          ]
        : []),
      ["reveal:correct", answered(true)],
      ["reveal:miss", answered(false)],
    ] as [string, GameState][];
    const states = stages.map(([stage, game]) => {
      const world = journeyWorld(regions, journey, game, context!);
      const focus = world.focus;
      if (
        !Number.isFinite(focus.lat) ||
        Math.abs(focus.lat) > 90 ||
        !Number.isFinite(focus.lng) ||
        Math.abs(focus.lng) > 180 ||
        (focus.altitude !== undefined &&
          (!Number.isFinite(focus.altitude) || focus.altitude <= 0))
      )
        report.errors.push(`Invalid camera: ${question.id} / ${stage}`);
      if (
        new Set(world.places.map((place) => place.id)).size !==
        world.places.length
      )
        report.errors.push(
          `Duplicate visible places: ${question.id} / ${stage}`,
        );
      if (
        stage === "play" &&
        definition.mapSelection === "places" &&
        !question.disclosure.namedChoices &&
        world.places.some(
          (place) =>
            answers.includes(place.id) && !!place.name && !place.labelHidden,
        )
      )
        report.errors.push(`Anonymous answer name disclosed: ${question.id}`);
      return {
        stage,
        focus,
        context: Object.keys(world.states).filter(
          (id) => world.states[id] === "hinted",
        ),
        borders: world.showBorders,
        places: world.places.map(describePlace),
      };
    });
    report.questions.push({
      id: question.id,
      mode: question.mode,
      control: definition.control,
      answers,
      states,
    });
  }
  if (!journey.completion)
    report.warnings.push(
      "No authored completion scene; generic recap will be used.",
    );
  return report;
}
