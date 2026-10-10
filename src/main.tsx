import { createRoot } from "react-dom/client";
import { modeForPath } from "./app/modes";
import { reportReactFailure, trackView } from "./services/monitoring";
import { AccountProvider } from "./services/accounts";
import { App } from "./App";
import { applyTheme, readTheme } from "./theme/themes";
import "./fonts.css";
import "./style.css";
import "./game/game.css";
import "./app/app.css";
import "./app/mobile.css";
import "./theme/themes.css";
applyTheme(readTheme());
trackView(modeForPath(location.pathname));
createRoot(document.getElementById("root")!, {
  onUncaughtError: reportReactFailure,
}).render(
  <AccountProvider>
    <App />
  </AccountProvider>,
);
