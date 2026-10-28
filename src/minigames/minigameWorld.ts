import { submittedMinigameRegion } from "./minigameAnswer";
import { regionalPinpointBands } from "./pinpointSearch";
import { interiorAnchor } from "../geography/interiorAnchor";
import type { RegionFeature } from "../geography/types";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { GameState } from "../game/state";
import type { RegionReveal } from "../globe/regionFades";
import { journeyWorld } from "../app/journeyWorld";
import { pointAlongBearing } from "../game/geodesic";
import { borderRunCrossings } from "./borderRunPath";
import { PINPOINT_BANDS } from "./extraGames";
import type { RoutePair, PinpointPair } from "./extraGames";
import type { BorderMinigame, NeighborPair } from "./sharedNeighbors";

export type MinigameWorld = ReturnType<typeof journeyWorld> & {
  regionReveal?: RegionReveal;
  borderOmissions?: Record<string, number[][][]>;
  regionTransitionKey?: string;
};

/** Shared presentation for real play and isolated menu examples. No saves. */
export function minigameWorld({
  regions,
  journey,
  context,
  game,
  kind,
  pair,
  showBorders = false,
  revealStep = 0,
  reduced = false,
  overview = false,
  revealKey,
  regionalPinpoint = false,
}: {
  regions: RegionFeature[];
  journey: Journey;
  context: QuestionContext;
  game: GameState;
  kind: BorderMinigame;
  pair: NeighborPair;
  showBorders?: boolean;
  revealStep?: number;
  reduced?: boolean;
  overview?: boolean;
  revealKey?: string;
  regionalPinpoint?: boolean;
}): MinigameWorld {
  const view: MinigameWorld = journeyWorld(regions, journey, game, context);
  if (kind === "missing-borders")
    view.regionTransitionKey = revealKey ?? journey.rounds[0].id;
  if (kind === "border-run" && game.phase === "playing" && !showBorders)
    view.borderRegionIds = [];
  if (kind === "border-run" && !overview)
    for (const id of pair.countries) view.states[id] = "clue";
  if (kind === "border-run" && game.phase !== "playing" && !overview) {
    const route = pair as RoutePair;
    // Reveal the route through countries and border portals, without a center-to-center line.
    route.route.forEach((id, index) => {
      view.states[id] =
        index <= Math.floor(revealStep / 2)
          ? "correct"
          : route.countries.includes(id)
            ? "clue"
            : "disabled";
    });
    view.places = view.places.filter(
      (place) =>
        !place.id.startsWith("border-run:crossing:") ||
        Number(place.markerBadge) <= Math.ceil(revealStep / 2),
    );
    if (!reduced) {
      view.regionReveal = {
        key: revealKey ?? journey.rounds[0].id,
        ids: route.route.slice(0, Math.floor(revealStep / 2) + 1),
        clueIds: route.countries,
        durationMs: 180,
      };
      view.places = view.places.map((p) =>
        p.id.startsWith("border-run:crossing:") ? { ...p, fadeInMs: 180 } : p,
      );
    }
    if (revealStep >= (route.route.length - 1) * 2 - 1) {
      const [lng, lat] = borderRunCrossings(route).at(-1)!;
      view.clueLocators.push({
        id: `border-run:${route.id}:finish`,
        label: "",
        pulseOnly: true,
        repeat: true,
        appearance: "completion",
        region: route.components.at(-1)!.region,
        anchor: { lng, lat },
      });
    }
  }
  if (kind === "missing-borders" && game.phase !== "playing" && !overview) {
    const segments =
      journey.rounds[0].feedbackOverlays?.flatMap((o) =>
        o.type === "path" ? [o.coordinates] : [],
      ) ?? [];
    view.borderOmissions = Object.fromEntries(
      pair!.countries.map((id) => [id, segments]),
    );
  }
  if (kind === "missing-borders" && reduced)
    view.overlays = view.overlays?.map((o) =>
      o.type === "path" ? { ...o, reveal: undefined } : o,
    );
  if (
    kind === "pinpoint" &&
    game.phase !== "playing" &&
    !overview &&
    (pair as PinpointPair).place
  ) {
    const target = (pair as PinpointPair).place!;
    const connectors = view.routes.filter((r) =>
      r.id.startsWith("pin-distance:"),
    );
    view.routes = view.routes.filter((r) => !r.id.startsWith("pin-distance:"));
    view.overlays = [
      ...(view.overlays ?? []),
      ...connectors.map((r) => ({
        id: r.id,
        type: "path" as const,
        coordinates: [
          [r.from.lng, r.from.lat],
          [r.to.lng, r.to.lat],
        ],
        dashed: true,
        surfaceAligned: true,
        visualState: r.visualState as "correct" | "incorrect",
        accuracyBand: r.accuracyBand,
      })),
    ];
    view.focus = journey.rounds[0].feedbackFocus!;
    view.places = view.places.map((place) =>
      place.id === target.id
        ? {
            ...place,
            priority: 1000,
            markerSize: 34,
            labelHidden: false,
            labelFlexible: true,
          }
        : place,
    );

    const visibleBands = (
      regionalPinpoint && (pair as PinpointPair).searchArea
        ? regionalPinpointBands(
            (pair as PinpointPair).searchContext ??
              (pair as PinpointPair).searchArea!,
          )
        : PINPOINT_BANDS
    ).filter((b) => [1000, 500, 100].includes(b.points));
    view.overlays = view.overlays
      ?.filter(
        (o) =>
          o.type !== "circle" ||
          visibleBands.some((b) => b.radiusKm === o.radiusKm),
      )
      .map((o) =>
        o.type === "circle" && o.id.startsWith("pin-tolerance:")
          ? {
              ...o,
              shade: false,
              active: false,
              accuracyBand: {
                index: visibleBands.findIndex((b) => b.radiusKm === o.radiusKm),
                count: visibleBands.length,
              },
            }
          : o,
      );
    view.places.push(
      ...visibleBands.map((b) => {
        const { lng, lat } = pointAlongBearing(
          target,
          115,
          b.radiusKm / 6371.0088,
        );
        return {
          id: `pinpoint:band:${b.points}`,
          name: String(b.points),
          kind: "other" as const,
          lat,
          lng,
          sourceId: "pinpoint-score-band",
          markerHidden: true,
          labelTypography: "numeric" as const,
          labelScale: 1.35,
          labelFlexible: false,
          visualState: "hinted" as const,
          priority: 90,
        };
      }),
    );
  }
  const responseRegion = submittedMinigameRegion(game, context);
  if (
    ["shared-neighbors", "missing-borders"].includes(kind) &&
    game.phase === "feedback"
  ) {
    const correct = game.answers[0]?.correct;
    if (!correct && responseRegion) {
      view.states[responseRegion.id] = "incorrect";
      if (view.borderRegionIds)
        view.borderRegionIds = [
          ...new Set([...view.borderRegionIds, responseRegion.id]),
        ];
    }
    const answers = kind === "missing-borders" ? pair.countries : [pair.answer];
    for (const id of [
      ...answers,
      ...(!correct && responseRegion ? [responseRegion.id] : []),
    ]) {
      const region = context.targets.get(id);
      if (!region || view.places.some((p) => p.id === `territory-label:${id}`))
        continue;
      view.places.push({
        id: `minigame-answer:${id}`,
        name: region.name,
        kind: "other",
        sourceId: region.sourceId,
        ...interiorAnchor(region),
        markerHidden: true,
        labelFlexible: true,
        visualState:
          !correct && id === responseRegion?.id
            ? "incorrect"
            : correct
              ? "correct"
              : "answer",
        priority: 500,
      });
    }
  }
  if (!reduced && !overview)
    view.places = view.places.map((p) =>
      p.kind === "pin" && p.markerRole !== "target"
        ? { ...p, placementPulse: true }
        : p,
    );
  return view;
}
