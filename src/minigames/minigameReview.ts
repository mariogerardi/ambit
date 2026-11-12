import type { NeighborRun, BorderMinigame } from "./sharedNeighbors";
import type { RegionFeature } from "../geography/types";
import type { StudyPlaceTarget } from "../study/placeReview";

export function minigameReviewTargets(
  kind: BorderMinigame,
  run: NeighborRun,
  regions: RegionFeature[],
): StudyPlaceTarget[] {
  // A language error is not evidence that the player cannot locate a country.
  if (kind === "say-where") return [];
  const visits = (run.review ?? run.history ?? []).filter((v) =>
    kind === "pinpoint"
      ? (v.points ?? (v.correct ? 1000 : 0)) < 500
      : !v.correct,
  );
  const targets = visits.flatMap((v) =>
    v.target
      ? [v.target]
      : v.ids.flatMap((id) => {
          const region = regions.find((r) => r.id === id);
          return region
            ? [
                {
                  id: region.id,
                  name: region.name,
                  ...region.focus,
                  regionId: region.id,
                },
              ]
            : [];
        }),
  );
  return [...new Map(targets.map((t) => [t.id, t])).values()];
}
