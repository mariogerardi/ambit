import { validateJourneyContracts } from "./questionBuilder";
import index from "./journeyIndex.json";
import type { Journey, Question } from "./questionContracts";

/** Enough to route, schedule and validate saves without loading clue geometry. */
export interface JourneySummary {
  addedAt?: string;
  saveRevision?: number;
  legacyRoundLabels?: Partial<Record<string, string>>;
  id: string;
  supersedes?: string;
  title: string;
  description: string;
  rounds: Pick<Question, "id" | "label" | "progressLabel" | "resolvedLabel">[];
}
export const JOURNEY_INDEX = index as (JourneySummary & {
  addedAt: string;
  path: string;
  module: string;
})[];
const modules = import.meta.glob<Record<string, unknown>>(["./*Journey.ts"]);
const pending = new Map<string, Promise<Journey>>();

export function loadJourney(id: string): Promise<Journey> {
  const cached = pending.get(id);
  if (cached) return cached;
  const entry = JOURNEY_INDEX.find((j) => j.id === id);
  const loader = entry && modules[entry.module];
  if (!loader) return Promise.reject(Error("Unknown Journey"));
  const promise = loader().then((module) => {
    const journey = Object.values(module).find(
      (value): value is Journey =>
        !!value &&
        typeof value === "object" &&
        "id" in value &&
        value.id === id,
    );
    if (!journey) throw Error("Couldn’t load this Journey. Please reload to try again.");
    validateJourneyContracts(journey);
    return journey;
  });
  pending.set(id, promise);
  void promise.catch(() => pending.delete(id));
  return promise;
}

export function journeyPath(id: string) {
  return JOURNEY_INDEX.find((j) => j.id === id)?.path ?? "/";
}
