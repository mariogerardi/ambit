import { geoContains } from "d3-geo";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import type { QuestionContext } from "../game/questionContracts";
import type { GameState } from "../game/state";
export function submittedMinigameRegion(
  game: GameState,
  context: QuestionContext,
) {
  if (game.selectedIds.length) return context.targets.get(game.selectedIds[0]);
  if (!game.pin) return undefined;
  return context.regions.find(
    (r) =>
      r.level === "ADM0" &&
      geoContains(sphericalGeometry(r.geometry), [
        game.pin!.lng,
        game.pin!.lat,
      ]),
  );
}
