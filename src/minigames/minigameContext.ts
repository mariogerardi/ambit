import type { RegionFeature } from "../geography/types";
import { createQuestionContext } from "../game/questionPreparation";
import { neighborJourneyBase } from "./sharedNeighbors";

const bases = new WeakMap<
  RegionFeature[],
  ReturnType<typeof createQuestionContext>
>();
export function minigameBase(regions: RegionFeature[]) {
  let base = bases.get(regions);
  if (!base) {
    base = createQuestionContext(regions, [], neighborJourneyBase);
    bases.set(regions, base);
  }
  return base;
}
