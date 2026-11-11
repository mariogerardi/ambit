import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import type { Journey } from "../src/game/questionContracts";

/** Source discovery is local-only; catalog maintenance has its own control. */
export function JourneyWorkbench({
  journey,
  filename,
  modules,
  seed,
  recipeId,
  onNavigate,
}: {
  journey?: Journey;
  filename: string;
  modules: string[];
  seed: number;
  recipeId?: string;
  onNavigate(path: string): void;
}) {
  const initial = !recipeId && modules.includes(filename) ? filename : "";
  const sources = modules
    .map((name) => ({
      name,
      title:
        name === filename && journey && !recipeId
          ? journey.title
          : (JOURNEY_INDEX.find((entry) => entry.module === `./${name}`)
              ?.title ??
            name
              .replace(/Journey\.ts$/, "")
              .replace(/([a-z])([A-Z])/g, "$1 $2")
              .replace(/^./, (letter) => letter.toUpperCase())),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="workbench-journey-select">
      <label className="field">
        <span>Journey</span>
        <select
          name="module"
          value={initial}
          onChange={(event) => {
            const url = new URL(location.href);
            url.searchParams.set("module", event.target.value);
            for (const key of ["recipe", "journey", "id", "question", "state"])
              url.searchParams.delete(key);
            url.searchParams.set("seed", String(seed));
            onNavigate(url.pathname + url.search);
          }}
        >
          <option value="" disabled>
            Choose a Journey
          </option>
          {sources.map(({ name, title }) => (
            <option key={name} value={name}>
              {title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
