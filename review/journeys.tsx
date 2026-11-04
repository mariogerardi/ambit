// Development-only entry point. Module discovery never enters the production App.
import { createRoot } from "react-dom/client";
import { JourneyWorkbench } from "./JourneyWorkbench";
import { PlayerWorkspace } from "../src/App";
import { AccountProvider } from "../src/services/accounts";
import { serviceConfig } from "../src/services/config";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { validateJourneyContracts } from "../src/game/questionBuilder";
import type { Journey } from "../src/game/questionContracts";
import { REVIEW_STAGES, type ReviewStage } from "../src/app/journeyReview";
import { applyTheme, isTheme } from "../src/theme/themes";
import "../src/fonts.css";
import "../src/style.css";
import "../src/game/game.css";
import "../src/app/app.css";
import "../src/app/mobile.css";
import "../src/theme/themes.css";
import "./journeys.css";

// Keep the original fetch across Vite hot updates; the review guard remains global.
const readOnlyFetch: typeof fetch =
  import.meta.hot?.data.fetch ?? window.fetch.bind(window);
if (import.meta.hot) import.meta.hot.data.fetch = readOnlyFetch;
window.fetch = (input, options) => {
  const method =
    options?.method ?? (input instanceof Request ? input.method : "GET");
  const url = new URL(
    input instanceof Request ? input.url : String(input),
    location.href,
  );
  const authOrigins = [
    serviceConfig.auth.authority,
    serviceConfig.auth.loginUrl,
  ].map((value) => new URL(value).origin);
  if (
    !["GET", "HEAD"].includes(method.toUpperCase()) &&
    !authOrigins.includes(url.origin)
  )
    return Promise.reject(
      new Error("API writes are disabled in Journey review."),
    );
  return readOnlyFetch(input, options);
};
const modules = import.meta.glob<Record<string, unknown>>(
  "../src/game/*Journey.ts",
);
const params = new URLSearchParams(location.search);
const registered = JOURNEY_INDEX.find(
  (j) => j.path === `/journey/${params.get("journey") ?? "down-the-danube"}`,
);
const recipeId = params.get("recipe") ?? undefined;
const filename =
  params.get("module") ?? registered?.module.replace(/^\.\//, "");
const modulePath = `../src/game/${filename?.replace(/\.ts$/, "")}.ts`;
const root = createRoot(document.getElementById("root")!);
async function open() {
  const { MECHANIC_RECIPES, PRESENTATION_RECIPES } = await import(
    "../src/game/recipes"
  );
  const { mechanicFor } = await import("../src/game/mechanics");
  const recipes = [...MECHANIC_RECIPES, ...PRESENTATION_RECIPES];
  let journey: Journey | undefined;
  if (recipeId) {
    const question = recipes.find(
      (question) => question.id === `recipe:${recipeId}`,
    );
    if (!question) throw Error("Unknown mechanic recipe.");
    const { recipeJourney } = await import("../src/game/authoringCapabilities");
    journey = recipeJourney(question);
  } else {
    const loader = modules[modulePath];
    if (!loader)
      throw Error("Choose a Journey source file from src/game/*Journey.ts.");
    const exports = await loader();
    journey = Object.values(exports).find(
      (value): value is Journey =>
        !!value &&
        typeof value === "object" &&
        "rounds" in value &&
        Array.isArray(value.rounds) &&
        "id" in value &&
        typeof value.id === "string" &&
        (!params.get("id") || value.id === params.get("id")),
    );
    if (!journey)
      throw Error("The module does not export the requested Journey.");
  }
  validateJourneyContracts(journey);
  if (
    params.get("question") &&
    !journey.rounds.some((q) => q.id === params.get("question"))
  )
    throw Error("Unknown review question.");
  const seed = Number(params.get("seed") ?? 1);
  if (!Number.isSafeInteger(seed))
    throw Error("The review seed must be an integer.");
  const stage = params.get("state") ?? "play";
  if (!REVIEW_STAGES.includes(stage as ReviewStage))
    throw Error("Unknown review state.");
  const theme = params.get("theme") ?? "ocean";
  if (!isTheme(theme)) throw Error("Unknown theme.");
  applyTheme(theme);
  root.render(
    <AccountProvider>
      <PlayerWorkspace
        reviewSource={{
          journey,
          seed,
          theme,
          stage: stage as ReviewStage,
          questionId: params.get("question") ?? undefined,
          navigation: (
            <JourneyWorkbench
              journey={journey}
              filename={filename!}
              recipes={recipes
                .filter((question) => !mechanicFor(question).deprecated)
                .map(({ id, title }) => ({ id, title }))}
              recipeId={recipeId}
              modules={Object.keys(modules)
                .map((path) => path.split("/").at(-1)!)
                .sort()}
              seed={seed}
              request={readOnlyFetch}
            />
          ),
          onExit(path) {
            location.assign(path);
          },
          onInspect(index, state) {
            const url = new URL(location.href);
            if (recipeId) url.searchParams.delete("module");
            else url.searchParams.set("module", filename!);
            url.searchParams.set("question", journey!.rounds[index].id);
            url.searchParams.set("state", state);
            url.searchParams.set("seed", String(seed));
            history.replaceState(null, "", url);
          },
        }}
      />
    </AccountProvider>,
  );
}
void open().catch((failure) =>
  root.render(
    <p role="alert">
      {failure instanceof Error
        ? failure.message
        : "Couldn’t open the Journey."}
    </p>,
  ),
);
