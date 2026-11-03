// Development-only entry point. Module discovery never enters the production App.
import { createRoot } from "react-dom/client";
import { PlayerWorkspace } from "../src/App";
import { AccountContext, type AccountAccess } from "../src/services/accounts";
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

const account: AccountAccess = {
  user: null,
  admin: true,
  loading: false,
  busy: false,
  error: "",
  async signIn() {},
  async signOut() {},
  async accessToken() {
    return undefined;
  },
};
const readOnlyFetch = window.fetch.bind(window);
window.fetch = (input, options) => {
  const method =
    options?.method ?? (input instanceof Request ? input.method : "GET");
  if (!["GET", "HEAD"].includes(method.toUpperCase()))
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
const filename =
  params.get("module") ?? registered?.module.replace(/^\.\//, "");
const modulePath = `../src/game/${filename?.replace(/\.ts$/, "")}.ts`;
const root = createRoot(document.getElementById("root")!);
async function open() {
  const loader = modules[modulePath];
  if (!loader)
    throw Error("Choose a Journey source file from src/game/*Journey.ts.");
  const exports = await loader();
  const journey = Object.values(exports).find(
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
    <AccountContext.Provider value={account}>
      <PlayerWorkspace
        reviewSource={{
          journey,
          seed,
          theme,
          stage: stage as ReviewStage,
          questionId: params.get("question") ?? undefined,
          navigation: (
            <form action="/review/journeys.html">
              <label>
                Journey source{" "}
                <select name="module" defaultValue={filename}>
                  {Object.keys(modules)
                    .sort()
                    .map((path) => {
                      const name = path.split("/").at(-1)!;
                      return (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      );
                    })}
                </select>
              </label>{" "}
              <label>
                Seed{" "}
                <input
                  name="seed"
                  type="number"
                  defaultValue={seed}
                  style={{ width: "6em" }}
                />
              </label>{" "}
              <button type="submit" className="quiet-button">
                Open source
              </button>
            </form>
          ),
          onInspect(index, state) {
            const url = new URL(location.href);
            url.searchParams.set("module", filename!);
            url.searchParams.set("question", journey!.rounds[index].id);
            url.searchParams.set("state", state);
            url.searchParams.set("seed", String(seed));
            history.replaceState(null, "", url);
          },
        }}
      />
    </AccountContext.Provider>,
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
