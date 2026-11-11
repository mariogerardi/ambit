// This module is loaded only by the development build. Source discovery never ships.
import { JourneyWorkbench } from "./JourneyWorkbench";
import { JourneyCatalogControls } from "./JourneyCatalogControls";
import { JOURNEY_INDEX, newestJourney } from "../src/game/journeyRegistry";
import { validateJourneyContracts } from "../src/game/questionBuilder";
import type { Journey } from "../src/game/questionContracts";
import {
  isReviewStage,
  type JourneyReviewSource,
} from "../src/app/journeyReview";
import { isTheme } from "../src/theme/themes";

const modules = import.meta.glob<Record<string, unknown>>(
  "../src/game/*Journey.ts",
);
export async function loadReviewSource(
  path: string,
  navigate: (path: string) => void,
): Promise<JourneyReviewSource> {
  const params = new URLSearchParams(path.split("?")[1]);
  const registered = params.has("journey")
    ? JOURNEY_INDEX.find((j) => j.path === `/journey/${params.get("journey")}`)
    : newestJourney();
  const filename =
    params.get("module") ?? registered?.module.replace(/^\.\//, "");
  const recipeId = params.get("recipe") ?? undefined;
  let journey: Journey | undefined;
  if (recipeId) {
    const [{ MECHANIC_RECIPES, PRESENTATION_RECIPES }, { recipeJourney }] =
      await Promise.all([
        import("../src/game/recipes"),
        import("../src/game/authoringCapabilities"),
      ]);
    const question = [...MECHANIC_RECIPES, ...PRESENTATION_RECIPES].find(
      (q) => q.id === `recipe:${recipeId}`,
    );
    if (!question) throw Error("Unknown mechanic recipe.");
    journey = recipeJourney(question);
  } else {
    const loader = modules[`../src/game/${filename}`];
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
  const questionId = params.get("question") ?? undefined;
  if (questionId && !journey.rounds.some((q) => q.id === questionId))
    throw Error("Unknown review question.");
  const seed = Number(params.get("seed") ?? 1);
  if (!Number.isSafeInteger(seed))
    throw Error("The review seed must be an integer.");
  const stage = params.get("state") ?? "play";
  if (!isReviewStage(stage)) throw Error("Unknown review state.");
  const theme = params.get("theme") ?? undefined;
  if (theme && !isTheme(theme)) throw Error("Unknown theme.");
  await Promise.all([
    import("../src/game/runtime"),
    import("../src/game/GameShell"),
    import("../src/app/AdminJourneyReview"),
  ]);
  return {
    requestKey: path,
    journey,
    seed,
    stage,
    questionId,
    theme: theme && isTheme(theme) ? theme : undefined,
    navigation: (
      <JourneyWorkbench
        journey={journey}
        filename={filename ?? ""}
        modules={Object.keys(modules).map((path) => path.split("/").at(-1)!)}
        seed={seed}
        recipeId={recipeId}
        onNavigate={navigate}
      />
    ),
    catalog:
      !recipeId && filename ? (
        <JourneyCatalogControls key={filename} filename={filename} />
      ) : undefined,
    onInspect(index, state) {
      const url = new URL(location.href);
      if (recipeId) url.searchParams.delete("module");
      else url.searchParams.set("module", filename!);
      url.searchParams.set("question", journey.rounds[index].id);
      url.searchParams.set("state", state);
      url.searchParams.set("seed", String(seed));
      if (url.href !== location.href) history.replaceState(null, "", url);
    },
  };
}
