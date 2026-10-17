import { createRoot } from "react-dom/client";
import { modeForPath } from "./app/modes";
import { reportReactFailure, trackView } from "./services/monitoring";
import { AccountProvider } from "./services/accounts";
import { PlayerWorkspace } from "./App";
import { applyTheme, readTheme } from "./theme/themes";
import { waitForStyles } from "./app/waitForStyles";
import "./fonts.css";
import "./style.css";
import "./game/game.css";
import "./app/app.css";
import "./app/mobile.css";
import "./theme/themes.css";
void waitForStyles()
  .then(() => {
    applyTheme(readTheme());
    trackView(modeForPath(location.pathname));
    createRoot(document.getElementById("root")!, {
      onUncaughtError: reportReactFailure,
    }).render(
      <AccountProvider>
        <PlayerWorkspace />
      </AccountProvider>,
    );
  })
  .catch(() => {
    const message = document.querySelector(".ambit-loading-copy");
    if (message)
      message.textContent = "Couldn't load your world. Please reload.";
  });
