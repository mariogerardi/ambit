import type { ClueLocator } from "../globe/clueLocators";
import { constructionScene } from "../game/constructionScene";
import { intersectionOverlays } from "../game/bearingIntersection";
import { geoDistance } from "d3-geo";
import { isRegionAnswer } from "../game/questionBuilder";
import { answerPlace } from "../game/answerTargets";
import { pinBands, pinReviewViews } from "../game/pinPresentation";
import { withAssistanceLocks } from "../game/guidance";
import type {
  MapOverlay,
  RegionFeature,
  RouteFeature,
} from "../geography/types";
import type { GameState } from "../game/state";
import type {
  Journey,
  Question,
  QuestionContext,
} from "../game/questionContracts";
import { solutionIds, selectableIds } from "../game/questionPreparation";
import { candidateAvailable } from "../game/guidance";
import { presentJourneyPlace } from "../game/authoredPlaces";
import { greatCircleArc, pointAlongBearing } from "../game/geodesic";
import { reviewedBearing } from "../game/compassBearing";
import {
  journeyVisitedStates,
  questionMapPresentation,
  questionPlaces,
  questionRegionMarkers,
  questionRegions,
  questionVisualStates,
  journeyDiscoveryPlaces,
  highlightedPartId,
} from "../game/presentation";
const recapRegions = new WeakMap<
  Journey,
  WeakMap<RegionFeature[], Map<string, RegionFeature[]>>
>();
const travelRegions = new WeakMap<
  Journey,
  WeakMap<RegionFeature[], Map<number, RegionFeature[]>>
>();
/** Retain reached coastlines without revealing future maps, labels or answers. */
function reachedRegions(
  regions: RegionFeature[],
  journey: Journey,
  index: number,
) {
  if (!journey.retainMapDetails || index === 0) return regions;
  let worlds = travelRegions.get(journey);
  if (!worlds) travelRegions.set(journey, (worlds = new WeakMap()));
  let steps = worlds.get(regions);
  if (!steps) worlds.set(regions, (steps = new Map()));
  const cached = steps.get(index);
  if (cached) return cached;
  const previous = journey.rounds.slice(0, index);
  const result = questionRegions(
    regions,
    {
      ...journey.rounds[0],
      importedRegions: previous.flatMap((q) => q.importedRegions ?? []),
      displayGeometries: Object.assign(
        {},
        ...previous.map((q) => q.displayGeometries ?? {}),
      ),
      highlightParts: [],
    },
    "finished",
  );
  steps.set(index, result);
  return result;
}
function allRegions(
  regions: RegionFeature[],
  journey: Journey,
  answers: GameState["answers"],
) {
  let cache = recapRegions.get(journey);
  if (!cache) recapRegions.set(journey, (cache = new WeakMap()));
  let versions = cache.get(regions);
  if (!versions) cache.set(regions, (versions = new Map()));
  const answered = new Set(answers.map((a) => a.roundId));
  const key = [...answered].sort().join("|");
  const cached = versions.get(key);
  if (cached) return cached;
  const additions = [
    ...new Map(
      journey.rounds
        .flatMap((q) => q.importedRegions ?? [])
        .map((r) => [r.id, r]),
    ).values(),
  ];
  const displayGeometries = Object.assign(
    {},
    ...journey.rounds.map((q) => q.displayGeometries ?? {}),
  );
  const highlights = new Map<
    string,
    NonNullable<Question["highlightParts"]>[number]
  >();
  const polygons = (geometry: RegionFeature["geometry"]) =>
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const q of journey.rounds.filter((q) => answered.has(q.id)))
    for (const part of q.highlightParts ?? []) {
      if (!part.reveal) continue;
      const fragment = questionRegions(regions, q, "feedback").find(
        (r) => r.id === highlightedPartId(part.countryId),
      )!;
      const previous = highlights.get(part.countryId);
      const coordinates = [
        ...new Map(
          [
            ...(previous?.geometry ? polygons(previous.geometry) : []),
            ...polygons(fragment.geometry),
          ].map((polygon) => [JSON.stringify(polygon), polygon]),
        ).values(),
      ];
      highlights.set(part.countryId, {
        ...part,
        points: [...(previous?.points ?? []), ...(part.points ?? [part.point])],
        geometry: { type: "MultiPolygon", coordinates },
        name: [...new Set([previous?.name, part.name].filter(Boolean))].join(
          " / ",
        ),
      });
    }
  const result =
    additions.length || Object.keys(displayGeometries).length || highlights.size
      ? questionRegions(
          regions,
          {
            ...journey.rounds[0],
            importedRegions: additions,
            displayGeometries,
            highlightParts: [...highlights.values()],
          },
          "finished",
        )
      : regions;
  versions.set(key, result);
  return result;
}
export function journeyWorld(
  regions: RegionFeature[],
  journey: Journey,
  game: GameState,
  context: QuestionContext,
  constructionReviewIndex?: number,
) {
  const round = journey.rounds[game.roundIndex];
  const constructionCompletion =
    game.phase === "finished" && journey.completion?.constructionResults;
  const reviewingConstruction =
    constructionCompletion && constructionReviewIndex !== undefined;
  const completion = game.phase === "finished" ? journey.completion : undefined;
  const authoredMap = completion?.mapMode === "authored";
  const authoredOverview = authoredMap && !reviewingConstruction;
  const reviewIndex = Math.max(
    0,
    Math.min(
      journey.rounds.length - 1,
      constructionReviewIndex ?? journey.rounds.length - 1,
    ),
  );
  const constructionQuestion = reviewingConstruction
    ? journey.rounds[reviewIndex]
    : round;
  const constructionResponse = reviewingConstruction
    ? (game.answers.find((a) => a.roundId === constructionQuestion.id) ?? game)
    : game;
  const shapeScene =
    authoredOverview || (constructionCompletion && !reviewingConstruction)
      ? { overlays: [], places: [] }
      : constructionScene(
          constructionQuestion,
          constructionResponse,
          game.phase !== "playing",
          !!reviewingConstruction,
          !!game.showConstructionExample,
        );
  const retainedConstructions =
    game.phase === "finished" && !constructionCompletion && !authoredMap
      ? journey.rounds.flatMap((q) => {
          const answer = game.answers.find((a) => a.roundId === q.id);
          return answer?.construction
            ? [constructionScene(q, answer, true, true)]
            : [];
        })
      : [];
  const finalConstructionPlaces = retainedConstructions.flatMap(
      (s) => s.places,
    ),
    finalConstructionOverlays = retainedConstructions.flatMap(
      (s) => s.overlays,
    );
  game = withAssistanceLocks(round, game);
  const correct = !!game.answers.at(-1)?.correct;
  const map = questionMapPresentation(
    round,
    game.phase,
    correct,
    game.help?.[round.id],
  );
  const assist =
    game.phase === "playing" && game.help?.[round.id] === "assisted"
      ? round.guidance?.assist
      : undefined;
  const hintFocus =
    game.phase === "playing" && game.help?.[round.id]
      ? round.guidance?.hintMap?.focus
      : undefined;
  const catalog = new Map(
    [...regions, ...(round.importedRegions ?? [])].map((r) => [r.id, r]),
  );
  const routes: RouteFeature[] = [];
  if (map.borders && game.phase !== "home") {
    if (round.rule.type === "great-circle-order") {
      const { from, to } = round.rule;
      routes.push({
        id: `journey:${round.id}`,
        from: { lng: from[0], lat: from[1] },
        to: { lng: to[0], lat: to[1] },
      });
    }
  }
  if (
    (game.phase === "feedback" || game.phase === "failed") &&
    game.pin &&
    round.rule.type === "pin-distance"
  ) {
    const target = answerPlace(round, round.rule.targetId);
    if (target)
      routes.push({
        id: `pin-distance:${round.id}`,
        from: game.pin,
        to: target,
        visualState: correct ? "correct" : "incorrect",
        accuracyBand: correct
          ? pinBands(round, game).find((band) => band.achieved)
          : undefined,
      });
  }
  const destination = solutionIds(round, context).at(-1);
  const pinRule = round.rule.type === "pin-distance" ? round.rule : undefined;
  const pinTarget = pinRule && answerPlace(round, pinRule.targetId);
  const pinRings =
    game.phase === "feedback" && pinRule && pinTarget
      ? (pinRule.tiers ?? [{ radiusKm: pinRule.radiusKm }]).map(
          (tier, index, tiers) => ({
            id: `pin-tolerance:${round.id}${pinRule.tiers ? `:${tier.radiusKm}` : ""}`,
            type: "circle" as const,
            center: pinTarget,
            radiusKm: tier.radiusKm,
            shade: !!pinRule.tiers,
            accuracyBand: pinRule.tiers
              ? { index, count: tiers.length }
              : undefined,
            active: pinBands(round, game)[index]?.achieved ?? false,
          }),
        )
      : [];
  const compassArcs: Extract<MapOverlay, { type: "path" }>[] = (
    game.phase === "finished"
      ? journey.rounds.filter(
          (q) =>
            q.rule.type === "bearing-angle" &&
            game.answers.some((a) => a.roundId === q.id),
        )
      : (game.phase === "feedback" || game.phase === "failed") &&
          round.rule.type === "bearing-angle"
        ? [round]
        : []
  ).flatMap((q) => {
    const answer = game.answers.find((a) => a.roundId === q.id);
    const result = answer && reviewedBearing(q, answer);
    return result
      ? [
          {
            id: `bearing-route:${q.id}`,
            type: "path" as const,
            visualState:
              game.phase === "finished"
                ? ("visited" as const)
                : ("answer" as const),
            coordinates: greatCircleArc(result.origin, result.destination),
            label: game.phase === "finished" ? undefined : "Correct bearing",
            opacity: game.phase === "finished" ? 0.5 : 0.85,
          },
        ]
      : [];
  });
  if (
    (game.phase === "feedback" || game.phase === "failed") &&
    round.rule.type === "bearing-angle"
  ) {
    const result = reviewedBearing(round, game);
    if (result) {
      const length = Math.min(
        (12 * Math.PI) / 180,
        geoDistance(
          [result.origin.lng, result.origin.lat],
          [result.destination.lng, result.destination.lat],
        ),
      );
      compassArcs.push({
        id: `bearing-guess:${round.id}`,
        type: "path",
        arrowhead: true,
        label: "Your bearing",
        visualState: result.tier === null ? "incorrect" : "correct",
        coordinates: greatCircleArc(
          result.origin,
          pointAlongBearing(result.origin, result.chosen, length),
        ),
        opacity: 0.9,
      });
    }
  }
  const selected = catalog.get(game.selectedIds.at(-1) ?? "");
  const preferredFocus =
    completion?.focus ??
    (game.phase === "feedback" && round.feedbackFocus
      ? round.feedbackFocus
      : game.phase === "feedback" &&
          round.mode === "map-single" &&
          destination &&
          catalog.has(destination)
        ? { ...catalog.get(destination)!.focus, altitude: 1.1 }
        : game.phase === "failed" && selected
          ? { ...selected.focus, altitude: 1.3 }
          : game.phase === "finished"
            ? journey.rounds.at(-1)!.focus
            : (assist?.focus ?? hintFocus ?? round.focus));
  const focus =
    pinReviewViews(
      round,
      context,
      game,
      journey.completion?.photoResults && pinTarget
        ? { lat: pinTarget.lat, lng: pinTarget.lng, altitude: 0.4 }
        : preferredFocus,
    )?.overview ?? preferredFocus;
  const visited =
    game.phase === "finished"
      ? journeyVisitedStates(journey, context, game.answers)
      : undefined;
  const discoveries =
    game.phase === "finished"
      ? journeyDiscoveryPlaces(journey, context, game.answers)
      : [];
  const reviewedPointStates = new Map(
    discoveries.map((place) => [place.id, place.visualState]),
  );
  const states =
    game.phase === "finished"
      ? undefined
      : questionVisualStates(round, context, game);
  if (states && journey.retainMapDetails) {
    for (const q of journey.rounds.slice(0, game.roundIndex))
      for (const region of q.importedRegions ?? [])
        states[region.id] ??= "disabled";
  }
  // Reference and committed answer boundaries survive narrower authored border lists.
  const outlinedIds = Object.keys(states ?? {}).filter((id) =>
    ["hinted", "clue", "selected", "correct", "answer", "incorrect"].includes(
      states![id],
    ),
  );
  const borderRegionIds =
    round.map?.borderIds || !map.borders
      ? [...new Set([...(round.map?.borderIds ?? []), ...outlinedIds])]
      : undefined;
  const displayedRegions =
    game.phase === "finished"
      ? authoredMap
        ? reviewingConstruction
          ? questionRegions(regions, constructionQuestion, "feedback")
          : constructionCompletion
            ? regions
            : allRegions(regions, journey, game.answers)
        : allRegions(regions, journey, game.answers)
      : questionRegions(
          reachedRegions(regions, journey, game.roundIndex),
          round,
          game.phase,
          game.help?.[round.id],
        );
  const bearingOverlays = [
    ...(authoredMap ? [] : compassArcs),
    ...(game.phase === "playing" ||
    game.phase === "feedback" ||
    game.phase === "failed"
      ? intersectionOverlays(
          round,
          game.phase !== "playing",
          game.help?.[round.id] === "assisted",
        )
      : []),
  ];
  const authoredOverlays =
    completion?.overlays ??
    (game.phase === "playing" || game.phase === "feedback"
      ? [
          ...(round.overlays ?? []),
          ...(assist?.overlays ?? []),
          ...(game.phase === "feedback" ? (round.feedbackOverlays ?? []) : []),
          ...pinRings,
        ]
      : undefined);
  const islandStates =
    constructionQuestion.rule.type === "island-coverage-max" &&
    (game.phase === "feedback" || reviewingConstruction)
      ? (Object.fromEntries(
          constructionQuestion.rule.candidates.map((island) => [
            island.id,
            constructionResponse.constructionResult?.containedIds?.includes(
              island.id,
            )
              ? reviewingConstruction
                ? "visited"
                : "correct"
              : "hinted",
          ]),
        ) as Record<string, import("../geography/types").VisualState>)
      : {};
  return {
    regions: displayedRegions,
    clueLocators:
      game.phase === "playing"
        ? (round.clueLocators ?? []).flatMap<ClueLocator>((clue) => {
            const region = displayedRegions.find((r) => r.id === clue.regionId);
            return region
              ? [
                  {
                    id: `${journey.id}:${round.id}:${clue.regionId}`,
                    label: clue.label,
                    pulseOnly: clue.pulseOnly,
                    region,
                  },
                ]
              : [];
          })
        : [],
    states: {
      ...(game.phase === "finished"
        ? authoredMap && reviewingConstruction
          ? Object.fromEntries(
              Object.entries(
                questionVisualStates(constructionQuestion, context, {
                  ...game,
                  ...constructionResponse,
                  phase: "feedback",
                  roundIndex: reviewIndex,
                }),
              ).map(([id, state]) => [
                id,
                state === "correct" || state === "answer" ? "visited" : state,
              ]),
            )
          : Object.fromEntries(
              displayedRegions.map((region) => [
                region.id,
                authoredOverview
                  ? !constructionCompletion &&
                    visited?.[region.id] === "incorrect"
                    ? "incorrect"
                    : completion?.regionIds?.includes(region.id)
                      ? "visited"
                      : "disabled"
                  : visited?.[region.id] === "incorrect"
                    ? "incorrect"
                    : completion?.regionIds?.includes(region.id)
                      ? "visited"
                      : (visited?.[region.id] ?? "disabled"),
              ]),
            )
        : states!),
      ...islandStates,
    },
    places: reviewingConstruction
      ? [
          ...(constructionQuestion.places ?? []).filter(
            (p) =>
              p.displayRole === "reference" &&
              !shapeScene.places.some((existing) => existing.id === p.id),
          ),
          ...shapeScene.places,
          ...(constructionQuestion.feedbackPlaces ?? [])
            .filter(
              (p) =>
                !shapeScene.places.some((existing) => existing.id === p.id),
            )
            .map(presentJourneyPlace),
        ]
      : authoredOverview
        ? [
            ...(completion?.places ?? []).map((p) =>
              presentJourneyPlace({
                ...p,
                visualState:
                  !constructionCompletion &&
                  reviewedPointStates.get(p.id) === "incorrect"
                    ? "incorrect"
                    : (p.visualState ?? "visited"),
              }),
            ),
            // Without a separate saved-response review, an authored overview
            // must retain the player's actual mistakes alongside its discoveries.
            ...(!constructionCompletion
              ? discoveries.filter(
                  (p) =>
                    p.visualState === "incorrect" &&
                    !completion?.places.some(
                      (authored) => authored.id === p.id,
                    ),
                )
              : []),
          ]
        : game.phase === "finished"
          ? [
              ...new Map(
                [
                  ...finalConstructionPlaces,
                  ...(completion?.places ?? []).map((place) =>
                    presentJourneyPlace({
                      ...place,
                      displayRole: reviewedPointStates.has(place.id)
                        ? undefined
                        : place.displayRole,
                      // Authored references add context; they cannot demote a discovery
                      // or erase a mistake when the same city serves both roles.
                      visualState:
                        reviewedPointStates.get(place.id) ??
                        place.visualState ??
                        "visited",
                    }),
                  ),
                  ...discoveries.filter(
                    (place) =>
                      !completion?.places?.some(
                        (authored) => authored.id === place.id,
                      ),
                  ),
                ].map((place) => [place.id, place]),
              ).values(),
            ]
          : [
              ...shapeScene.places,
              ...questionPlaces(
                round,
                context,
                game.phase,
                game.text,
                correct,
                game,
              ).filter(
                (p) =>
                  !shapeScene.places.some((existing) => existing.id === p.id),
              ),
              ...questionRegionMarkers(round, context, game),
              ...(game.phase === "playing" &&
              game.help?.[round.id] === "assisted"
                ? (round.guidance?.assist?.places ?? []).map(
                    presentJourneyPlace,
                  )
                : []),
            ],
    routes: authoredOverview ? [] : routes,
    physicalFeatures:
      completion?.physicalFeatures ??
      (game.phase === "playing" || game.phase === "feedback"
        ? [
            ...new Map(
              [
                ...(round.physicalFeatures ?? []),
                ...(assist?.physicalFeatures ?? []),
                ...(game.phase === "feedback"
                  ? (round.feedbackPhysicalFeatures ?? [])
                  : []),
              ].map((feature) => [feature.id, feature]),
            ).values(),
          ]
        : []),
    overlays: reviewingConstruction
      ? [
          ...(constructionQuestion.overlays ?? []),
          ...(constructionQuestion.feedbackOverlays ?? []),
          ...shapeScene.overlays,
        ]
      : finalConstructionOverlays.length
        ? [...(authoredOverlays ?? []), ...finalConstructionOverlays]
        : shapeScene.overlays.length || bearingOverlays.length
          ? [
              ...bearingOverlays,
              ...(authoredOverlays ?? []),
              ...shapeScene.overlays,
            ]
          : authoredOverlays,
    showBorders: completion?.borders ?? map.borders,
    borderRegionIds:
      game.phase === "home" || game.phase === "finished"
        ? undefined
        : borderRegionIds,
    regionInteraction:
      isRegionAnswer(round) ||
      (game.phase === "feedback" &&
        !round.mode.startsWith("city-") &&
        map.hover),
    // Neutral land is still eligible for blind map picks; the engine validates IDs.
    selectDisabled: game.phase === "playing" && isRegionAnswer(round),
    selectableRegionIds:
      game.phase === "playing" && isRegionAnswer(round)
        ? selectableIds(round, context).filter((id) =>
            candidateAvailable(round, game, id),
          )
        : [],
    regionNames:
      round.mode === "country-recall"
        ? game.phase === "playing"
          ? ("committed" as const)
          : ("all" as const)
        : round.mode.startsWith("city-") ||
            (!isRegionAnswer(round) && !map.hover)
          ? ("none" as const)
          : game.phase !== "playing" || round.disclosure.hoverNames
            ? ("all" as const)
            : round.disclosure.committedNames
              ? ("committed" as const)
              : ("none" as const),
    namedRegionIds:
      round.mode === "country-recall"
        ? game.recall?.entries
            .filter((e) => e.result === "accepted")
            .map((e) => e.id)
        : game.selectedIds,
    focus,
  };
}
