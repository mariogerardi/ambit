import { isRegionAnswer } from "../game/questionBuilder";
import { geoDistance, geoInterpolate } from "d3-geo";
import { answerPlace } from "../game/answerTargets";
import { pinBands } from "../game/pinPresentation";
import { withAssistanceLocks } from "../game/guidance";
import type { Focus, RegionFeature, RouteFeature } from "../geography/types";
import type { GameState } from "../game/state";
import type { Journey, QuestionContext } from "../game/questionContracts";
import { solutionIds, selectableIds } from "../game/questionPreparation";
import { candidateAvailable } from "../game/guidance";
import { presentJourneyPlace } from "../game/authoredPlaces";
import {
  journeyVisitedStates,
  questionMapPresentation,
  questionPlaces,
  questionRegionMarkers,
  questionRegions,
  questionVisualStates,
  journeyDiscoveryPlaces,
} from "../game/presentation";
const recapRegions = new WeakMap<
  Journey,
  WeakMap<RegionFeature[], RegionFeature[]>
>();
function allRegions(regions: RegionFeature[], journey: Journey) {
  let cache = recapRegions.get(journey);
  if (!cache) recapRegions.set(journey, (cache = new WeakMap()));
  const cached = cache.get(regions);
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
  const result =
    additions.length || Object.keys(displayGeometries).length
      ? questionRegions(
          regions,
          {
            ...journey.rounds[0],
            importedRegions: additions,
            displayGeometries,
            highlightParts: [],
          },
          "finished",
        )
      : regions;
  cache.set(regions, result);
  return result;
}
export function journeyWorld(
  regions: RegionFeature[],
  journey: Journey,
  game: GameState,
  context: QuestionContext,
) {
  const round = journey.rounds[game.roundIndex];
  game = withAssistanceLocks(round, game);
  const correct = !!game.answers.at(-1)?.correct;
  const map = questionMapPresentation(round, game.phase, correct);
  const completion = game.phase === "finished" ? journey.completion : undefined;
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
  let photoRevealFocus: Focus | undefined;
  if (
    game.phase === "feedback" &&
    journey.completion?.photoResults &&
    pinRule &&
    pinTarget &&
    game.pin
  ) {
    const target: [number, number] = [pinTarget.lng, pinTarget.lat];
    const guess: [number, number] = [game.pin.lng, game.pin.lat];
    const distanceKm = geoDistance(target, guess) * 6371.0088;
    if (distanceKm <= pinRule.radiusKm)
      photoRevealFocus = {
        lat: pinTarget.lat,
        lng: pinTarget.lng,
        altitude: 0.4,
      };
    else {
      const [lng, lat] = geoInterpolate(target, guess)(0.5);
      photoRevealFocus = {
        lat,
        lng,
        altitude: Math.min(5.5, 0.4 + distanceKm / 4000),
      };
    }
  }
  const selected = catalog.get(game.selectedIds.at(-1) ?? "");
  const focus =
    completion?.focus ??
    photoRevealFocus ??
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
  const visited =
    game.phase === "finished"
      ? journeyVisitedStates(journey, context, game.answers)
      : undefined;
  const discoveries =
    game.phase === "finished"
      ? journeyDiscoveryPlaces(journey, context, game.answers)
      : [];
  const pointMistakes = new Set(
    discoveries
      .filter((place) => place.visualState === "incorrect")
      .map((place) => place.id),
  );
  return {
    regions:
      game.phase === "finished"
        ? allRegions(regions, journey)
        : questionRegions(regions, round, game.phase, game.help?.[round.id]),
    states:
      game.phase === "finished"
        ? Object.fromEntries(
            allRegions(regions, journey).map((region) => [
              region.id,
              visited?.[region.id] === "incorrect"
                ? "incorrect"
                : completion?.regionIds?.includes(region.id)
                  ? "visited"
                  : (visited?.[region.id] ?? "disabled"),
            ]),
          )
        : questionVisualStates(round, context, game),
    places:
      game.phase === "finished"
        ? [
            ...new Map(
              [
                ...(completion?.places ?? []).map((place) =>
                  presentJourneyPlace({
                    ...place,
                    visualState: pointMistakes.has(place.id)
                      ? "incorrect"
                      : (place.visualState ?? "visited"),
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
            ...questionPlaces(
              round,
              context,
              game.phase,
              game.text,
              correct,
              game,
            ),
            ...questionRegionMarkers(round, context, game),
            ...(game.phase === "playing" && game.help?.[round.id] === "assisted"
              ? (round.guidance?.assist?.places ?? []).map(presentJourneyPlace)
              : []),
          ],
    routes,
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
    overlays:
      completion?.overlays ??
      (game.phase === "playing" || game.phase === "feedback"
        ? [
            ...(round.overlays ?? []),
            ...(game.phase === "playing" && game.help?.[round.id] === "assisted"
              ? (round.guidance?.assist?.overlays ?? [])
              : []),
            ...(game.phase === "feedback"
              ? (round.feedbackOverlays ?? [])
              : []),
            ...pinRings,
          ]
        : undefined),
    showBorders: completion?.borders ?? map.borders,
    borderRegionIds:
      game.phase === "home" || game.phase === "finished"
        ? undefined
        : round.map?.borderIds,
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
      round.mode.startsWith("city-") || (!isRegionAnswer(round) && !map.hover)
        ? ("none" as const)
        : game.phase !== "playing" || round.disclosure.hoverNames
          ? ("all" as const)
          : round.disclosure.committedNames
            ? ("committed" as const)
            : ("none" as const),
    namedRegionIds: game.selectedIds,
    focus,
  };
}
