import { useContext, useLayoutEffect, useRef } from "react";
import { PanelActive } from "../app/ModePanels";
import type { useBorderMinigame } from "./useBorderMinigame";
import { AnswerCounter } from "../game/AnswerCounter";
import { correctAnswerCopy } from "../game/copy";
import { MinigameCountries } from "./MinigameCountries";
import type { PinpointPair } from "./extraGames";

export function BorderMinigamePanel({
  shared,
  webgl,
  onBack,
}: {
  shared: ReturnType<typeof useBorderMinigame>;
  webgl: boolean;
  onBack(): void;
}) {
  const missing = shared.kind === "missing-borders",
    pinpoint = shared.kind === "pinpoint",
    route = shared.kind === "border-run";
  const active = useContext(PanelActive),
    heading = useRef<HTMLHeadingElement>(null),
    next = useRef<HTMLButtonElement>(null),
    menu = useRef<HTMLDetailsElement>(null);
  const run = shared.run,
    ended = shared.ended,
    overview = shared.overview,
    feedback = run?.result !== undefined;
  useLayoutEffect(() => {
    if (!active) return;
    if (menu.current) menu.current.open = false;
    const scroller = heading.current?.closest(".mode-layer");
    if (scroller) scroller.scrollTop = 0;
    (feedback && !overview ? next.current : heading.current)?.focus({
      preventScroll: true,
    });
  }, [active, run?.index, run?.cycle, feedback, overview]);
  if (!webgl)
    return (
      <section className="info-view">
        <h1 className="editorial-heading">{shared.title}</h1>
        <p>The 3D globe is required to play on this device.</p>
        <button
          className="minigame-games-button"
          aria-label="All games"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span> All games
        </button>
      </section>
    );
  if (!run || !shared.pair || !shared.context)
    return (
      <section className="info-view" role="status">
        <p>
          {shared.ready ? (
            "No puzzles match your settings. Choose more places or exclude fewer countries."
          ) : (
            <>Loading {shared.title}…</>
          )}
        </p>
        <button
          className="minigame-games-button"
          aria-label="All games"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span> All games
        </button>
      </section>
    );
  const names = shared.pair.countries.map(
    (id) => shared.context!.names.get(id) ?? id,
  );
  const target = pinpoint ? (shared.pair as PinpointPair) : undefined;
  const answer = pinpoint
    ? target!.name
    : route
      ? `${shared.pair.answer} border crossings`
      : missing
        ? names.join(" + ")
        : shared.context.names.get(shared.pair.answer)!;
  const hasAnswerAction = feedback || !missing;
  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };
  const last = run.history?.at(-1),
    points = run.points ?? 0,
    strikes = run.answered - run.correct;
  return (
    <section
      className={`info-view shared-neighbors-game ${missing ? "missing-borders-game" : ""} ${overview ? "minigame-overview" : ""}`}
      aria-label={`${shared.title} game`}
    >
      <div className="shared-neighbors-heading">
        <h2 className="minigame-title">{shared.title}</h2>
        {!overview && (
          <details
            className="minigame-menu"
            ref={menu}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeMenu();
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Game menu">
              <span aria-hidden="true">•••</span>
            </summary>
            <div className="minigame-menu-options">
              <button
                onClick={() => {
                  closeMenu();
                  onBack();
                }}
              >
                All games
              </button>
              {!hasAnswerAction && !ended && (
                <button
                  onClick={() => {
                    closeMenu();
                    shared.action({ type: "finish" });
                  }}
                >
                  Finish game
                </button>
              )}
            </div>
          </details>
        )}
      </div>
      {overview && (
        <p className="minigame-complete-label">
          Game over ·{" "}
          {run.ended === "strikes"
            ? "Three strikes"
            : pinpoint && run.answered === 10
              ? "Ten rounds complete"
              : "Finished by you"}
        </p>
      )}
      <h1 className="editorial-heading" ref={heading} tabIndex={-1}>
        {overview ? (
          <>
            {pinpoint ? (
              <>
                Your eye for <em>distance.</em>
              </>
            ) : route ? (
              <>
                Your borders, <em>crossed.</em>
              </>
            ) : missing ? (
              <>
                Your borders, <em>uncovered.</em>
              </>
            ) : (
              <>
                Your neighbors, <em>found.</em>
              </>
            )}
          </>
        ) : pinpoint ? (
          <>
            Where is <em>{target!.name}?</em>
          </>
        ) : route ? (
          <>
            How many <em>borders?</em>
          </>
        ) : missing ? (
          <>
            Which territory hides <em>two countries?</em>
          </>
        ) : (
          <>
            Which country borders <em>both?</em>
          </>
        )}
      </h1>
      {overview ? (
        <>
          <dl
            className="shared-neighbors-results"
            aria-label="Final score"
            data-ranked={shared.ranked}
          >
            <div>
              <dt>
                {pinpoint
                  ? "Points / 10,000"
                  : route
                    ? "Routes solved"
                    : missing
                      ? "Borders found"
                      : "Neighbors found"}
              </dt>
              <dd>{pinpoint ? points.toLocaleString() : run.correct}</dd>
            </div>
            {shared.ranked && (
              <div>
                <dt>Personal best</dt>
                <dd>
                  {(
                    shared.best ?? (pinpoint ? points : run.correct)
                  ).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
          <div className="minigame-overview-note">
            {pinpoint && run.answered > 0 && (
              <p>
                <strong>
                  {Math.round(points / run.answered).toLocaleString()}
                </strong>{" "}
                points per place ·{" "}
                <strong>
                  {(run.history ?? []).filter((v) => v.points === 1000).length}
                </strong>{" "}
                perfect pins
              </p>
            )}
            {!shared.ranked && (
              <p className="muted">
                Custom rules · This run doesn’t count toward your personal best.
              </p>
            )}
            <p>
              {run.answered
                ? pinpoint
                  ? "Revisit your pins and the places you were aiming for."
                  : route
                    ? "Revisit the countries along your routes."
                    : missing
                      ? "See the countries behind your discoveries."
                      : "Revisit the neighbors you found."
                : "No answers submitted this time."}
            </p>
          </div>
          <div className="minigame-actions">
            <button className="primary-button" onClick={shared.restart}>
              Play again
            </button>
            <button className="quiet-button" onClick={onBack}>
              Choose another game
            </button>
          </div>
        </>
      ) : (
        <>
          {!pinpoint && !missing && (
            <MinigameCountries names={names} route={route} />
          )}
          {target?.photo && (
            <figure className="minigame-photo">
              <img src={target.photo.src} alt={target.name} />
              <figcaption>
                <a href={target.photo.url} target="_blank" rel="noreferrer">
                  {target.photo.author}
                </a>{" "}
                ·{" "}
                <a
                  href={target.photo.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {target.photo.license}
                </a>
              </figcaption>
            </figure>
          )}
          {feedback ? (
            <div
              className={`shared-neighbors-feedback round-feedback ${run.result ? "answer-correct" : "answer-discovered"}`}
              role="status"
              data-correct={run.result}
            >
              <div className="feedback-label">
                <span aria-hidden="true">{run.result ? "✳" : "◎"}</span>
                {run.result
                  ? route
                    ? "Beautifully reasoned."
                    : missing
                      ? "Well spotted."
                      : pinpoint && target?.place
                        ? (last?.points ?? 0) >= 900
                          ? "Very close."
                          : (last?.points ?? 0) >= 500
                            ? "Nicely placed."
                            : "On the map."
                        : correctAnswerCopy(shared.journey!.rounds[0])
                  : "Not quite."}
              </div>
              {pinpoint && (
                <p className="minigame-distance">
                  <strong>{(last?.points ?? 0).toLocaleString()} points</strong>
                  {last?.distanceKm !== undefined
                    ? ` · ${Math.round(last.distanceKm).toLocaleString()} km away`
                    : run.result
                      ? " · Inside the area"
                      : " · Outside the area"}
                </p>
              )}
              <h2>{answer}</h2>
              {!target?.region && (
                <p>{shared.journey!.rounds[0].explanation}</p>
              )}
              {ended && (
                <p className="minigame-ended-notice">
                  {run.ended === "strikes"
                    ? "That was your third strike."
                    : "That was your final round."}{" "}
                  Your run is complete.
                </p>
              )}
            </div>
          ) : (
            <div className="minigame-answer-area">
              {!route && !missing && run.pin ? (
                <p className="shared-neighbors-pin" role="status">
                  Pin placed. Move it or check your answer.
                </p>
              ) : (
                <p className="muted">
                  {pinpoint || missing || route
                    ? shared.journey!.rounds[0].instruction
                    : "Borders are hidden. Place your pin in the shared neighbor."}
                </p>
              )}
              {route && (
                <form
                  className="answer-form minigame-number"
                  onSubmit={(event) => {
                    event.preventDefault();
                    shared.action({ type: "submit" });
                  }}
                >
                  <label htmlFor="border-run-answer">Border crossings</label>
                  <AnswerCounter
                    id="border-run-answer"
                    value={run.text ?? ""}
                    onChange={(value) => shared.action({ type: "text", value })}
                  />
                </form>
              )}
            </div>
          )}
        </>
      )}
      {!overview && (
        <>
          {hasAnswerAction && (
            <div className={`minigame-action-row ${ended ? "is-ended" : ""}`}>
              {!ended && (
                <button
                  className="minigame-finish-button"
                  onClick={() => shared.action({ type: "finish" })}
                >
                  Finish game
                </button>
              )}
              {feedback ? (
                <button
                  className="primary-button"
                  ref={next}
                  onClick={() =>
                    shared.action({ type: ended ? "overview" : "next" })
                  }
                >
                  {ended
                    ? "See results →"
                    : missing
                      ? "Next map →"
                      : pinpoint
                        ? "Next place →"
                        : route
                          ? "Next route →"
                          : "Next pair →"}
                </button>
              ) : !missing ? (
                <button
                  className="primary-button"
                  disabled={route ? !/^\d+$/.test(run.text ?? "") : !run.pin}
                  onClick={() => shared.action({ type: "submit" })}
                >
                  Check answer
                </button>
              ) : null}
            </div>
          )}

          <div className="minigame-progress" aria-label="Game progress">
            <p className="shared-neighbors-score">
              <strong>
                {pinpoint ? points.toLocaleString() : run.correct}
              </strong>{" "}
              {pinpoint ? "points" : "correct"}
            </p>
            {pinpoint ? (
              <span className="minigame-round-progress">
                Round {Math.min(10, run.answered + Number(!feedback))} / 10
              </span>
            ) : (
              <div
                className="shared-neighbors-strikes"
                role="status"
                aria-label={`${strikes} of 3 strikes`}
              >
                <span>Strikes</span>
                <span className="minigame-strike-dots" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <i key={i} data-used={i < strikes} />
                  ))}
                </span>
              </div>
            )}
          </div>
        </>
      )}
      {!shared.saved && (
        <p className="muted" role="status">
          Progress couldn’t be saved on this device.
        </p>
      )}
    </section>
  );
}
