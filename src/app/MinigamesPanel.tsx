import type { useMinigameTour } from "../minigames/useMinigameTour";
import { useCallback, useEffect, useRef, useState } from "react";
import { DiscardMinigameDialog } from "./DiscardMinigameDialog";
import type { BorderMinigame } from "../minigames/sharedNeighbors";
import { MinigameSettingsEditor } from "../minigames/MinigameSettingsEditor";
import type { useBorderMinigame } from "../minigames/useBorderMinigame";

export const games = [
  {
    slug: "shared-neighbors",
    title: "Shared Neighbors",
    description: "Two countries. One shared neighbor. Can you find it?",
    image: "/previews/shared-neighbors.svg",
    imageAlt:
      "Two highlighted countries and a location pin on a map of Europe.",
    controls: "Place a pin",
    instruction:
      "Two countries are highlighted. Place a pin inside a country that shares a land border with both. Borders appear after you answer. Three incorrect answers end the run, or you can finish early.",
    rules:
      "Use two highlighted countries as clues, then place a pin inside the country that shares a land border with both. Borders stay hidden until the reveal. Keep going until three wrong answers, or finish whenever you like.",
  },
  {
    slug: "missing-borders",
    title: "Missing Borders",
    description:
      "A border has vanished. Spot the countries hiding in one shape.",
    image: "/previews/missing-borders.svg",
    imageAlt: "Spain and Portugal shown as one continuous highlighted shape.",
    controls: "Select a territory",
    instruction:
      "One border has disappeared. Find the territory hiding two countries and select it to reveal their boundary. Three incorrect answers end the run, or you can finish early.",
    rules:
      "One border has disappeared. Search the region and select the territory hiding two countries to reveal their boundary. Three wrong answers end the game; you can also finish whenever you like.",
  },
  {
    slug: "border-run",
    title: "Border Run",
    description: "Two countries. How many borders must you cross?",
    image: "/previews/border-run.svg",
    imageAlt:
      "A map of Europe with highlighted route countries and four numbered border crossings.",
    controls: "Enter a number",
    instruction:
      "Two countries are marked with flags. Count the fewest land borders you would cross between them, then reveal one shortest route. Sea crossings and corner contacts don’t count. Three incorrect answers end the run.",
    rules:
      "Find the fewest shared land-border crossings between two countries. Enter your number, then see one shortest route. Routes follow connected land between countries; sea crossings and corner contacts don’t count. Borders are hidden unless you enable them. Three wrong answers end the game.",
  },
  {
    slug: "pinpoint",
    title: "Pinpoint",
    description: "Familiar places. One globe. How close can you get?",
    image: "/previews/pinpoint.svg",
    imageAlt: "A location pin and distance rings on a map of South America.",
    controls: "Place a pin",
    instruction:
      "Find cities and landmarks within a highlighted search region. Closer pins earn more, with distances scaled to the search area. Country and state rounds score for a pin inside their boundaries. Play ten rounds, up to 1,000 points each.",
    rules:
      "Cities and landmarks earn 1–1,000 points by distance. Large countries can stand alone; smaller countries and states get a surrounding search region with roughly six to eight plausible city locations. Scoring distances scale to the whole search region. Countries and U.S. states earn 1,000 points for a pin anywhere inside. Older world-search games keep their original scoring.",
  },
];

export function selectedMinigame(path: string): BorderMinigame {
  return (
    (games.find((game) => path === `/minigames/${game.slug}`)
      ?.slug as BorderMinigame) ?? "shared-neighbors"
  );
}

export function MinigamesPanel({
  path,
  onNavigate,
  shared,
  missing,
  borderRun,
  pinpoint,
  webgl,
  tour,
  customizing,
  onCustomize,
}: {
  path: string;
  onNavigate(path: string): void;
  shared: ReturnType<typeof useBorderMinigame>;
  missing: ReturnType<typeof useBorderMinigame>;
  borderRun: ReturnType<typeof useBorderMinigame>;
  pinpoint: ReturnType<typeof useBorderMinigame>;
  webgl: boolean;
  tour: ReturnType<typeof useMinigameTour>;
  customizing: boolean;
  onCustomize(value: boolean): void;
}) {
  const kind = selectedMinigame(path);
  const index = games.findIndex((game) => game.slug === kind);
  const selected = games[index];
  const game =
    kind === "missing-borders"
      ? missing
      : kind === "border-run"
        ? borderRun
        : kind === "pinpoint"
          ? pinpoint
          : shared;
  const [confirming, setConfirming] = useState(false);
  const startButton = useRef<HTMLButtonElement>(null);
  const cancelDiscard = useCallback(() => setConfirming(false), []);
  useEffect(() => setConfirming(false), [path, game.run?.id]);
  const startNew = () => {
    setConfirming(false);
    onCustomize(false);
    game.start(true);
    onNavigate(`/minigames/${kind}/play`);
  };
  const select = (next: number) => {
    onCustomize(false);
    onNavigate(
      `/minigames/${games[(next + games.length) % games.length].slug}`,
    );
  };
  const notice = !game.settingsSaved
    ? "Settings couldn’t be saved on this device."
    : game.ready && !game.count
      ? kind === "pinpoint"
        ? "No puzzles match your settings. Try more place categories, a broader area, or fewer exclusions."
        : "No puzzles match your settings. Try a broader area or fewer exclusions."
      : game.hasUnfinished && !game.canResume
        ? "Starting a new game replaces your current game."
        : undefined;
  const label = !webgl
    ? "Globe unavailable"
    : !game.ready
      ? "Loading…"
      : "Start new game";
  return (
    <section className="info-view minigames-carousel" aria-label="Minigames">
      <div
        className="minigame-game-names"
        role="tablist"
        aria-label="Choose a minigame"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? games.length - 1
                : (index +
                    (event.key === "ArrowLeft" ? -1 : 1) +
                    games.length) %
                  games.length;
          select(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(
              `[data-game="${games[next].slug}"]`,
            )
            ?.focus();
        }}
      >
        {games.map((item, i) => (
          <button
            key={item.slug}
            data-game={item.slug}
            type="button"
            aria-label={item.title}
            role="tab"
            id={`minigame-tab-${item.slug}`}
            aria-selected={i === index}
            aria-controls="minigame-card"
            tabIndex={i === index ? 0 : -1}
            onClick={() => select(i)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div className="minigame-carousel-heading">
        <div className="minigame-carousel-arrows">
          <button
            type="button"
            className="quiet-button"
            aria-label="Previous minigame"
            onClick={() => select(index - 1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m10 3-5 5 5 5" />
            </svg>
          </button>
          <h1 className="editorial-heading">{selected.title}</h1>
          <button
            type="button"
            className="quiet-button"
            aria-label="Next minigame"
            onClick={() => select(index + 1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
      <article
        id="minigame-card"
        className="minigame-carousel-card"
        role="tabpanel"
        aria-labelledby={`minigame-tab-${kind}`}
      >
        <p className="minigame-premise">{selected.description}</p>
        {tour.error && (
          <p className="minigame-tour-note" role="status">
            {tour.error}
          </p>
        )}
        <p className="minigame-instructions">{selected.instruction}</p>
        {notice && (
          <p className="minigame-menu-notice" role="status">
            {notice}
          </p>
        )}
        <div className="minigame-carousel-actions minigame-session">
          {game.hasUnfinished && game.run && (
            <dl className="minigame-session-progress">
              {kind === "pinpoint" && (
                <div>
                  <dt>Round</dt>
                  <dd>{Math.min(10, game.run.index + 1)} / 10</dd>
                </div>
              )}
              <div>
                <dt>{kind === "pinpoint" ? "Points" : "Correct so far"}</dt>
                <dd>
                  {kind === "pinpoint"
                    ? (game.run.points ?? 0).toLocaleString()
                    : game.run.correct}
                </dd>
              </div>
              {kind !== "pinpoint" && (
                <div>
                  <dt>Strikes</dt>
                  <dd>{game.run.answered - game.run.correct} / 3</dd>
                </div>
              )}
            </dl>
          )}
          <div className="minigame-high-score">
            <span>High score{!game.ranked ? " · default rules" : ""}</span>
            <strong>
              {game.best === undefined ? "—" : game.best.toLocaleString()}
              {kind === "pinpoint" && game.best !== undefined ? " pts" : ""}
            </strong>
          </div>
          <div className="minigame-session-actions">
            {game.hasUnfinished && (
              <button
                className="primary-button"
                disabled={!webgl || !game.ready}
                onClick={() => {
                  onCustomize(false);
                  onNavigate(`/minigames/${kind}/play`);
                }}
              >
                Resume game<span aria-hidden="true">→</span>
              </button>
            )}
            <button
              className={
                game.hasUnfinished
                  ? "secondary-button minigame-new-game"
                  : "primary-button minigame-new-game"
              }
              aria-label="Start new game"
              ref={startButton}
              disabled={!webgl || !game.ready || !game.count}
              onClick={() => {
                if (game.hasUnfinished) setConfirming(true);
                else startNew();
              }}
            >
              <span aria-hidden="true">+</span>
              {label}
            </button>
          </div>
        </div>
        <button
          className="minigame-customize-toggle"
          type="button"
          aria-expanded={customizing}
          aria-controls="minigame-customization"
          onClick={() => onCustomize(!customizing)}
        >
          {customizing ? "Close customization" : "Customize"}
        </button>
        {customizing && (
          <div id="minigame-customization">
            <MinigameSettingsEditor
              kind={game.kind}
              settings={game.settings}
              onChange={game.onSettings}
            />
          </div>
        )}
      </article>
      {confirming && (
        <DiscardMinigameDialog
          title={selected.title}
          returnFocus={startButton.current}
          score={
            kind === "pinpoint"
              ? `${(game.run?.points ?? 0).toLocaleString()} points`
              : `${game.run?.correct ?? 0} correct so far`
          }
          onCancel={cancelDiscard}
          onDiscard={startNew}
        />
      )}
    </section>
  );
}

/** A small caption belongs to the globe, rather than the game’s rules card. */
export function MinigameTourCaption({
  tour,
}: {
  tour: ReturnType<typeof useMinigameTour>;
}) {
  const prompt = !tour.example
    ? "Preparing the globe tour…"
    : tour.phase === "travel"
      ? tour.paused
        ? "Explore the globe. Play to continue the tour."
        : "Touring the globe. Next example coming up."
      : tour.example.kind === "missing-borders"
        ? "Which territory is hiding two countries?"
        : tour.example.journey.rounds[0].prompt;
  return (
    <section
      className={`minigame-globe-caption${tour.reduced ? " reduced" : ""}`}
      aria-label="Globe demonstration"
    >
      <div className="minigame-globe-prompt">
        <p>{prompt}</p>
        {tour.reduced ? (
          <>
            <button className="quiet-button" onClick={tour.reveal}>
              {tour.answer ? "Hide answer" : "Show answer"}
            </button>
            <button className="quiet-button" onClick={tour.next}>
              Next example
            </button>
          </>
        ) : tour.count > 0 ? (
          <span className="globe-playback minigame-tour-playback">
            <button
              onClick={tour.toggle}
              aria-label={
                tour.paused ? "Resume globe tour" : "Pause globe tour"
              }
              title={tour.paused ? "Resume globe tour" : "Pause globe tour"}
              aria-pressed={!tour.paused}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                <path
                  d={
                    tour.paused
                      ? "m8 5 11 7-11 7z"
                      : "M7 5h3v14H7zm7 0h3v14h-3z"
                  }
                />
              </svg>
            </button>
          </span>
        ) : null}
      </div>
    </section>
  );
}
