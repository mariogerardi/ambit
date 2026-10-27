// Development-only, direct-module review. State stays in memory; no account/API writes.
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { MADE_IN_CHINA_JOURNEY as journey } from "../src/game/madeInChinaJourney";
import { GameShell } from "../src/game/GameShell";
import {
  gameReducer,
  initialGame,
  type Action,
  type GameState,
} from "../src/game/state";
import { createQuestionContext } from "../src/game/questionPreparation";
import { journeyWorld } from "../src/app/journeyWorld";
import { GlobeView, type GlobeHandle } from "../src/globe/GlobeView";
import type { RegionFeature } from "../src/geography/types";
import { applyTheme } from "../src/theme/themes";
import "../src/fonts.css";
import "../src/style.css";
import "../src/game/game.css";
import "../src/app/app.css";
import "../src/app/mobile.css";
import "../src/theme/themes.css";
import "./made-in-china.css";

function Review({ regions }: { regions: RegionFeature[] }) {
  const context = useMemo(
    () => createQuestionContext(regions, [], journey),
    [regions],
  );
  const [game, dispatch] = useReducer(
    (
      state: GameState,
      action: Action | { type: "review-round"; index: number },
    ) =>
      action.type === "review-round"
        ? {
            ...initialGame,
            phase: "playing" as const,
            roundIndex: action.index,
          }
        : gameReducer(state, action, journey, context),
    { ...initialGame, phase: "playing" },
  );
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<RegionFeature>();
  const globe = useRef<GlobeHandle>(null);
  const panel = useRef<HTMLDivElement>(null);
  const world = journeyWorld(regions, journey, game, context);
  const round = journey.rounds[game.roundIndex];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const help = game.help?.[round.id];
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [round.id]);
  useEffect(() => {
    if (!ready) return;
    globe.current?.cancelFlyover();
    globe.current?.focus(world.focus);
    const views =
      game.phase === "finished"
        ? journey.completion?.views
        : game.phase === "feedback"
          ? round.feedbackViews
          : undefined;
    if (!reduced && views?.length) globe.current?.flyover(views, false);
    return () => globe.current?.cancelFlyover();
    // Answer edits preserve the player's map position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, game.phase, round.id, help, reduced]);
  return (
    <main className="experience china-review">
      <header className="china-review-toolbar">
        <strong>Made in China · Local review</strong>
        <label>
          Stop{" "}
          <select
            aria-label="Review stop"
            value={game.roundIndex}
            onChange={(event) =>
              dispatch({
                type: "review-round",
                index: Number(event.target.value),
              })
            }
          >
            {journey.rounds.map((q, index) => (
              <option key={q.id} value={index}>
                {index + 1}. {q.title}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => dispatch({ type: "start" })}>
          Restart
        </button>
        <button type="button" onClick={() => globe.current?.focus(world.focus)}>
          Recenter
        </button>
      </header>
      <div className="china-review-map">
        {failed ? (
          <p role="alert">The globe could not start. Reload to try again.</p>
        ) : (
          <GlobeView
            ref={globe}
            initialFocus={world.focus}
            regions={world.regions}
            states={world.states}
            places={world.places}
            routes={world.routes}
            overlays={world.overlays}
            physicalFeatures={world.physicalFeatures}
            clueLocators={world.clueLocators}
            theme="play"
            palette="ocean"
            showBorders={world.showBorders}
            borderRegionIds={world.borderRegionIds}
            regionInteraction={world.regionInteraction}
            regionNames={world.regionNames}
            namedRegionIds={world.namedRegionIds}
            selectableRegionIds={world.selectableRegionIds}
            selectDisabled={world.selectDisabled}
            surfaceRoutes
            placeLabels
            placeMarkers
            placeInteraction={
              game.phase === "playing" && round.mode.startsWith("city-")
            }
            hovered={hover?.id}
            onHover={setHover}
            onSelect={(region) => dispatch({ type: "select", id: region.id })}
            onPlace={(place) => dispatch({ type: "select", id: place.id })}
            onCoordinateTap={(point) => {
              if (round.mode === "pin" && game.phase === "playing")
                dispatch({ type: "drop-pin", lat: point.lat, lng: point.lng });
            }}
            motion={false}
            reduced={reduced}
            onReady={() => setReady(true)}
            onTextureFallback={() => {}}
            onFailure={() => setFailed(true)}
          />
        )}
      </div>
      <div className="china-review-panel" ref={panel}>
        <GameShell
          journey={journey}
          context={context}
          game={game}
          dispatch={dispatch}
          hover={hover}
          webgl={!failed}
          frame={(focus) => globe.current?.focus(focus)}
          reduced={reduced}
          onHome={() => dispatch({ type: "start" })}
          onStudy={() => location.assign("/study")}
        />
      </div>
    </main>
  );
}

applyTheme("ocean");
const root = createRoot(document.getElementById("root")!);
void fetch("/geography/world.v1.json")
  .then((response) => {
    if (!response.ok) throw new Error("World geography could not be loaded.");
    return response.json();
  })
  .then((regions: RegionFeature[]) => root.render(<Review regions={regions} />))
  .catch(() =>
    root.render(
      <p role="alert">
        World geography could not be loaded. Reload to try again.
      </p>,
    ),
  );
