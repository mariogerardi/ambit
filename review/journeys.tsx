// Development-only entry point: actual App and globe, no credentials or API writes.
import { createRoot } from "react-dom/client";
import { PlayerWorkspace } from "../src/App";
import { AccountContext, type AccountAccess } from "../src/services/accounts";
import { applyTheme } from "../src/theme/themes";
import { registerStorage } from "../src/app/registerStorage";
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
// Protect the local review even if a visitor opens a feedback/admin form.
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
applyTheme("ocean");
const slug =
  new URLSearchParams(location.search).get("journey") ?? "down-the-danube";
history.replaceState(null, "", `/journey/${slug}`);
void registerStorage.initialize().then(() =>
  createRoot(document.getElementById("root")!).render(
    <AccountContext.Provider value={account}>
      <PlayerWorkspace />
    </AccountContext.Provider>,
  ),
);
