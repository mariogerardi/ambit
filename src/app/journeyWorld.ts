import { answerPlace } from "../game/answerTargets";
import type { RegionFeature, RouteFeature } from "../geography/types";
import type { GameState } from "../game/state";
import type { Journey, QuestionContext } from "../game/questions";
import { solutionIds } from "../game/questions";
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
  const result = additions.length
    ? questionRegions(
        regions,
        {
          ...journey.rounds[0],
          importedRegions: additions,
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
  const correct = !!game.answers.at(-1)?.correct;
  const map = questionMapPresentation(round, game.phase, correct);
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
  const selected = catalog.get(game.selectedIds.at(-1) ?? "");
  const focus =
    game.phase === "feedback" && round.feedbackFocus
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
            : round.focus;
  return {
    regions:
      game.phase === "finished"
        ? allRegions(regions, journey)
        : questionRegions(regions, round, game.phase),
    states:
      game.phase === "finished"
        ? journeyVisitedStates(journey, context, game.answers)
        : questionVisualStates(round, context, game),
    places: questionPlaces(
      round,
      context,
      game.phase,
      game.text,
      correct,
      game,
    ),
    routes,
    overlays:
      game.phase === "playing" || game.phase === "feedback"
        ? [
            ...(round.overlays ?? []),
            ...(game.phase === "feedback"
              ? (round.feedbackOverlays ?? [])
              : []),
            ...(game.phase === "feedback" &&
            round.rule.type === "pin-distance" &&
            answerPlace(round, round.rule.targetId)
              ? [
                  {
                    id: `pin-tolerance:${round.id}`,
                    type: "circle" as const,
                    center: answerPlace(round, round.rule.targetId)!,
                    radiusKm: round.rule.radiusKm,
                    shade: false,
                  },
                ]
              : []),
          ]
        : undefined,
    showBorders: map.borders,
    borderRegionIds:
      game.phase === "home" || game.phase === "finished"
        ? undefined
        : round.map?.borderIds,
    regionInteraction: round.mode.startsWith("city-") ? false : map.hover,
    // Neutral land is still eligible for blind map picks; the engine validates IDs.
    selectDisabled:
      game.phase === "playing" &&
      map.hover &&
      round.map?.candidates === "neutral",
    regionNames:
      round.mode.startsWith("city-") || !map.hover
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
