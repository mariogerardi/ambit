import {
  SHARED_VISUAL_RULES,
  auditVisualExceptions,
  auditVisualScene,
  type VisualException,
} from "./journeyVisualRules";
import type { RegionFeature, PlaceFeature } from "../geography/types";
import type {
  Journey,
  Question,
  QuestionContext,
  Response,
} from "./questionContracts";
import {
  createQuestionContext,
  solutionIds,
  selectableIds,
  responseCount,
} from "./questionPreparation";
import { COUNTRY_FACTS } from "./countryFacts";
import { mechanicFor } from "./mechanics";
import { initialGame, gameReducer } from "./state";
import type { GameState } from "./state";
import { journeyWorld } from "../app/journeyWorld";
import { withAssistanceLocks } from "./guidance";
import { placeLabelStyle, placeMarkerSize } from "../globe/placeLabels";
import { correctAnswerSummary } from "./copy";
import { answerPlace, responsePlaceForName } from "./answerTargets";
import { canSubmit, isCorrect } from "./questionEvaluation";
import { interiorAnchor } from "../geography/interiorAnchor";
import { acceptsAlternatives, responseIds } from "./answerPresentation";

/** Exercise real input actions; no empty response with a fabricated grade. */
function submitSample(
  journey: Journey,
  question: Question,
  context: QuestionContext,
  index: number,
  correct: boolean,
) {
  const mechanic = mechanicFor(question);
  const expected = solutionIds(question, context);
  const count = responseCount(question, context);
  const eligible = selectableIds(question, context);
  const response: Response = { ...initialGame };
  if (mechanic.response === "selected")
    response.selectedIds = correct
      ? expected.slice(0, count)
      : [
          eligible.find((id) => !expected.includes(id)),
          ...expected.slice(1, count),
        ].filter((id): id is string => !!id);
  if (mechanic.response === "ordered") {
    response.ordered = expected
      .slice(0, count)
      .map((id) =>
        question.mode === "typed-regions" ||
        question.mode === "ordered-countries"
          ? context.names.get(id)!
          : question.mode === "ordered-capitals"
            ? context.capitals.find((p) => p.countryId === id)!.name
            : id,
      );
    if (!correct)
      response.ordered =
        mechanic.control === "cards"
          ? [...response.ordered].reverse()
          : [
              context.regions.find((r) => !expected.includes(r.id))!.name,
              ...response.ordered.slice(1),
            ];
  }
  if (mechanic.response === "text") {
    response.text = correctAnswerSummary(question, context, initialGame).value;
    if (question.rule.type === "numeric-range") {
      const rule = question.rule;
      response.text = String(
        correct
          ? rule.min +
              Math.round((rule.value - rule.min) / rule.step) * rule.step
          : Math.abs(rule.min - rule.value) > rule.tolerance
            ? rule.min
            : rule.max,
      );
    }
    if (!correct && question.rule.type !== "numeric-range") {
      const names = [
        ...(question.guidance?.assist?.places ?? []),
        ...(question.feedbackPlaces ?? []),
        ...context.capitals,
      ]
        .filter((p) => ["city", "capital"].includes(p.kind))
        .map((p) => p.name);
      response.text =
        mechanic.control === "number"
          ? String(Number(response.text) + 1)
          : (names.find(
              (text) => !isCorrect(question, context, { ...response, text }),
            ) ?? "Unknown answer");
    }
  }
  if (mechanic.response === "pin") {
    const target =
      question.rule.type === "pin-distance"
        ? answerPlace(question, question.rule.targetId)
        : question.rule.type === "pin-inside"
          ? interiorAnchor(context.targets.get(question.rule.ids[0])!)
          : undefined;
    if (target)
      response.pin = correct
        ? { lat: target.lat, lng: target.lng }
        : { lat: 0, lng: -140 };
  }
  if (
    !canSubmit(question, context, response) ||
    isCorrect(question, context, response) !== correct
  )
    return undefined;
  let game: GameState = { ...initialGame, phase: "playing", roundIndex: index };
  const dispatch = (action: Parameters<typeof gameReducer>[1]) => {
    game = gameReducer(game, action, journey, context);
  };
  if (mechanic.response === "selected")
    for (const id of response.selectedIds) dispatch({ type: "select", id });
  if (mechanic.response === "ordered")
    for (const [index, value] of response.ordered.entries())
      dispatch(
        mechanic.control === "cards"
          ? { type: "order-card", index, id: value }
          : { type: "ordered", index, value },
      );
  if (mechanic.response === "text")
    dispatch({ type: "text", value: response.text });
  if (response.pin) dispatch({ type: "drop-pin", ...response.pin });
  if (game.phase === "playing") dispatch({ type: "submit" });
  return (game.phase === "feedback" || game.phase === "failed") &&
    game.answers.at(-1)?.correct === correct
    ? game
    : undefined;
}

export interface JourneyAudit {
  id: string;
  errors: string[];
  warnings: string[];
  sharedRules: typeof SHARED_VISUAL_RULES;
  exceptions: VisualException[];
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
    sharedRules: SHARED_VISUAL_RULES,
    exceptions: [],
    assets: [
      ...new Set([
        ...journey.rounds.flatMap(mediaPaths),
        ...journey.rounds
          .flatMap((q) => [
            ...(q.overlays ?? []),
            ...(q.feedbackOverlays ?? []),
            ...(q.guidance?.assist?.overlays ?? []),
          ])
          .concat(journey.completion?.overlays ?? [])
          .flatMap((o) => (o.type === "texture" ? [o.assetUrl] : [])),
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
  const reviews: {
    question: Question;
    game: GameState;
    world: ReturnType<typeof journeyWorld>;
  }[] = [];
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
    const exceptions = auditVisualExceptions(question);
    report.errors.push(...exceptions.errors);
    report.exceptions.push(...exceptions.accepted);
    const definition = mechanicFor(question);
    const answers = solutionIds(question, context);
    const playing: GameState = {
      ...initialGame,
      phase: "playing",
      roundIndex: index,
    };
    // Anonymous geography must not become a name lookup through editable inputs.
    // Named matching markers are already disclosed and intentionally retain slot feedback.
    if (
      question.commitment === "submit" &&
      definition.mapSelection === "none" &&
      !question.disclosure.hoverNames
    ) {
      const helpStages = [
        undefined,
        ...(question.guidance ? ["hinted" as const] : []),
        ...(question.guidance?.assist ? ["assisted" as const] : []),
      ];
      for (const help of helpStages) {
        const base = withAssistanceLocks(question, {
          ...playing,
          help: help ? { [question.id]: help } : {},
        });
        const before = journeyWorld(regions, journey, base, context!);
        const beforePlaces = new Map(before.places.map((p) => [p.id, p]));
        for (const id of selectableIds(question, context!)) {
          let pending: GameState = { ...base, selectedIds: [id] };
          if (definition.response === "ordered") {
            const name =
              question.mode === "ordered-capitals"
                ? (context!.capitals.find((p) => p.countryId === id)?.name ??
                  id)
                : question.mode === "typed-regions" ||
                    question.mode === "ordered-countries"
                  ? (context!.names.get(id) ?? id)
                  : id;
            pending = { ...base, ordered: [name] };
          }
          const after = journeyWorld(regions, journey, pending, context!);
          const regionLeak = Object.keys(after.states).some(
            (id) => after.states[id] !== before.states[id],
          );
          const pointLeak = after.places.some((p) => {
            const prior = beforePlaces.get(p.id);
            if (!prior) return p.sourceId === "journey-response";
            return (
              (!prior.name || prior.labelHidden) &&
              (p.visualState !== prior.visualState ||
                p.name !== prior.name ||
                p.markerBadge !== prior.markerBadge)
            );
          });
          if (regionLeak || pointLeak) {
            report.errors.push(
              `Pending response reveals anonymous geography: ${question.id} / ${help ?? "play"} / ${id}`,
            );
            break;
          }
        }
      }
    }
    const samples = [true, false].flatMap((correct) => {
      const game = submitSample(journey, question, context!, index, correct);
      if (!game) {
        if (correct)
          report.errors.push(`Cannot submit canonical sample: ${question.id}`);
        else
          report.warnings.push(
            `No wrong response sample available: ${question.id}`,
          );
        return [];
      }
      const world = journeyWorld(regions, journey, game, context!);
      reviews.push({ question, game, world });
      if (
        !correct &&
        ["capital-name", "capital-coordinate"].includes(question.rule.type)
      )
        for (const name of game.ordered.length ? game.ordered : [game.text]) {
          const place = responsePlaceForName(question, context!, name);
          if (
            place &&
            !world.places.some(
              (p) => p.id === place.id && p.visualState === "incorrect",
            ) &&
            !isCorrect(question, context!, { ...game, text: name })
          )
            report.errors.push(
              `[review-retention] Known wrong city missing: ${question.id} / ${place.id}`,
            );
        }
      return [
        [correct ? "reveal:correct" : "reveal:miss", game] as [
          string,
          GameState,
        ],
      ];
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
      ...samples,
    ] as [string, GameState][];
    const states = stages.map(([stage, game]) => {
      const world = journeyWorld(regions, journey, game, context!);
      report.errors.push(
        ...auditVisualScene(question, context!, game, world).map(
          (error) => `${error} / ${stage}`,
        ),
      );
      const views = stage.startsWith("reveal:")
        ? question.feedbackViews
        : question.introViews;
      const focus = world.focus;
      for (const [viewIndex, cameraFocus] of [
        focus,
        ...(views ?? []),
      ].entries())
        if (
          !Number.isFinite(cameraFocus.lat) ||
          Math.abs(cameraFocus.lat) > 90 ||
          !Number.isFinite(cameraFocus.lng) ||
          Math.abs(cameraFocus.lng) > 180 ||
          (cameraFocus.altitude !== undefined &&
            (!Number.isFinite(cameraFocus.altitude) ||
              cameraFocus.altitude <= 0))
        )
          report.errors.push(
            `Invalid camera: ${question.id} / ${stage}${viewIndex ? ` / view ${viewIndex}` : ""}`,
          );
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
  for (const correct of [true, false]) {
    const outcomes = reviews.filter(
      (r) => r.game.answers.at(-1)?.correct === correct,
    );
    const answers = outcomes.flatMap((r) => r.game.answers);
    const completed = journeyWorld(
      regions,
      journey,
      {
        ...initialGame,
        phase: "finished",
        roundIndex: journey.rounds.length - 1,
        answers,
      },
      context,
    );
    for (const { question, game, world } of outcomes) {
      const example =
        acceptsAlternatives(question) && question.mode !== "number"
          ? new Set(
              correct
                ? responseIds(question, context, game)
                : solutionIds(question, context).slice(0, question.count),
            )
          : undefined;
      for (const [id, state] of Object.entries(world.states)) {
        if (!["correct", "answer", "incorrect"].includes(state)) continue;
        if (
          example &&
          state !== "incorrect" &&
          !example.has(id) &&
          !id.startsWith("clue-part:")
        )
          continue;
        if (
          !completed.regions.some((r) => r.id === id) ||
          !(state === "incorrect"
            ? completed.states[id] === "incorrect"
            : ["visited", "incorrect"].includes(completed.states[id]))
        )
          report.errors.push(
            `[review-retention] Revealed area missing at completion: ${question.id} / ${id}`,
          );
      }
      for (const place of world.places) {
        if (
          place.markerRole === "annotation" ||
          (place.sourceId === "player" && place.visualState !== "incorrect") ||
          !["correct", "answer", "incorrect"].includes(place.visualState ?? "")
        )
          continue;
        const final = completed.places.find((p) => p.id === place.id);
        if (
          !final ||
          (place.visualState === "incorrect"
            ? final.visualState !== "incorrect"
            : !["visited", "incorrect"].includes(final.visualState ?? ""))
        )
          report.errors.push(
            `[review-retention] Revealed point missing at completion: ${question.id} / ${place.id}`,
          );
      }
    }
  }
  if (!journey.completion)
    report.warnings.push(
      "No authored completion scene; generic recap will be used.",
    );
  return report;
}
