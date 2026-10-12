import { isRegionAnswer } from "../game/questionBuilder";
import { answerPlace } from "../game/answerTargets";
import { withAssistanceLocks } from "../game/guidance";
import type { RegionFeature, RouteFeature } from "../geography/types";
import type { GameState } from "../game/state";
import type { Journey, QuestionContext } from "../game/questionContracts";
import { solutionIds } from "../game/questionPreparation";
import {
  journeyVisitedStates,
  questionMapPresentation,
  questionPlaces,
  questionRegions,
  questionVisualStates,
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
  const catalog = new Map(
    [...regions, ...(round.importedRegions ?? [])].map((r) => [r.id, r]),
  );
  const routes: RouteFeature[] = [];
  if (map.borders && game.phase !== "home") {
    if (round.rule.type === "shortest-borders") {
      const path =
        round.mode === "land-path" && game.selectedIds.length
          ? game.selectedIds
          : game.phase === "feedback"
            ? (context.paths.get(round.id) ?? [])
            : [];
      for (let i = 1; i < path.length; i++) {
        const from = catalog.get(path[i - 1]),
          to = catalog.get(path[i]);
        if (from && to)
          routes.push({
            id: `journey:${round.id}-${i}`,
            from: from.focus,
            to: to.focus,
          });
      }
    }
    if (round.rule.type === "capital-order" && game.phase === "feedback") {
      const capitals = round.rule.countryIds.map(
        (id) => context.capitals.find((c) => c.countryId === id)!,
      );
      for (let i = 1; i < capitals.length; i++)
        routes.push({
          id: `capital-route:${round.id}:${i}`,
          from: capitals[i - 1],
          to: capitals[i],
        });
    }
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
      });
  }
  const destination = solutionIds(round, context).at(-1);
  const pinRule = round.rule.type === "pin-distance" ? round.rule : undefined;
  const pinTarget = pinRule && answerPlace(round, pinRule.targetId);
  const pinRings =
    game.phase === "feedback" && pinRule && pinTarget
      ? (pinRule.tiers ?? [{ radiusKm: pinRule.radiusKm }]).map((tier) => ({
          id: `pin-tolerance:${round.id}${pinRule.tiers ? `:${tier.radiusKm}` : ""}`,
          type: "circle" as const,
          center: pinTarget,
          radiusKm: tier.radiusKm,
          shade: !!pinRule.tiers,
        }))
      : [];
  const selected = catalog.get(game.selectedIds.at(-1) ?? "");
  const focus =
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
            : round.focus);
  return {
    regions:
      game.phase === "finished"
        ? allRegions(regions, journey)
        : questionRegions(regions, round, game.phase),
    states: completion
      ? Object.fromEntries(
          allRegions(regions, journey).map((r) => [
            r.id,
            completion.regionIds?.includes(r.id)
              ? ("visited" as const)
              : ("disabled" as const),
          ]),
        )
      : game.phase === "finished"
        ? journeyVisitedStates(journey, context, game.answers)
        : questionVisualStates(round, context, game),
    places: completion?.places ?? [
      ...questionPlaces(round, context, game.phase, game.text, correct, game),
      ...(game.phase === "playing" && game.help?.[round.id] === "assisted"
        ? (round.guidance?.assist?.places ?? [])
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
