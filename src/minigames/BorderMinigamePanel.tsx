import { submittedMinigameRegion } from "./minigameAnswer";
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RegionFeature } from "../geography/types";
import type { StudyPlaceTarget } from "../study/placeReview";
import { minigameReviewTargets } from "./minigameReview";
import { minigameShareCard } from "./minigameSharing";
import { JourneyShareDialog } from "../app/JourneyShareDialog";
import { ActionIcon } from "../app/ActionIcon";
import { SettingsIcon } from "../app/SettingsIcon";
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
  onStudy,
  regions,
}: {
  shared: ReturnType<typeof useBorderMinigame>;
  webgl: boolean;
  onBack(): void;
  onStudy(targets: StudyPlaceTarget[]): void;
  regions: RegionFeature[];
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
  const [sharing, setSharing] = useState(false);
  const closeSharing = useCallback(() => setSharing(false), []);
  const reviewTargets = useMemo(
    () => (run ? minigameReviewTargets(shared.kind, run, regions) : []),
    [shared.kind, run, regions],
  );
  const shareCard = useMemo(
    () =>
      run ? minigameShareCard(shared.kind, run, shared.ranked) : undefined,
    [shared.kind, run, shared.ranked],
  );
  const singular = reviewTargets.length === 1;
  const reviewNoun = pinpoint
    ? singular
      ? "place"
      : "places"
    : route
      ? singular
        ? "country"
        : "countries"
      : missing
        ? singular
          ? "country"
          : "countries"
        : singular
          ? "neighbor"
          : "neighbors";
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
        <p>
          This activity requires the 3D globe. Try another browser or device.
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
  if (!run || !shared.pair || !shared.context)
    return (
      <section className="info-view" role="status">
        <p>
          {shared.ready ? (
            pinpoint ? (
              "No puzzles match your settings. Try more place categories, a broader area, or fewer exclusions."
            ) : (
              "No puzzles match your settings. Try a broader area or fewer exclusions."
            )
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
              <SettingsIcon />
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
              {!ended && (
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
      <h1 className="editorial-heading" ref={heading} tabIndex={-1}>
        {overview ? (
          <>
            {pinpoint ? (
              <>
                Your aim, <em>mapped.</em>
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
          {((pinpoint && run.answered > 0) || !shared.ranked) && (
            <div className="minigame-result-detail">
              {pinpoint && run.answered > 0 && (
                <p>
                  <strong>
                    {Math.round(points / run.answered).toLocaleString()}
                  </strong>{" "}
                  points per place ·{" "}
                  <strong>
                    {
                      (run.history ?? []).filter((v) => v.points === 1000)
                        .length
                    }
                  </strong>{" "}
                  perfect pins
                </p>
              )}
              {!shared.ranked && (
                <p className="muted">
                  Custom rules · This run doesn’t count toward your personal
                  best.
                </p>
              )}
            </div>
          )}
          <div
            className="minigame-session minigame-results-actions"
            aria-label="Game actions"
          >
            <div className="minigame-session-actions">
              <button
                className="primary-button"
                aria-label="Play again"
                onClick={shared.restart}
              >
                Play again <span aria-hidden="true">→</span>
              </button>
              <button className="secondary-button" onClick={onBack}>
                Choose another game
              </button>
            </div>
            <div className="minigame-result-actions">
              {reviewTargets.length > 0 && (
                <button
                  className="quiet-button"
                  onClick={() => onStudy(reviewTargets)}
                >
                  <ActionIcon name="study" />
                  <span>{`Study ${reviewTargets.length} missed ${reviewNoun}`}</span>
                </button>
              )}
              <button className="quiet-button" onClick={() => setSharing(true)}>
                <ActionIcon name="share" />
                <span>Share result</span>
              </button>
            </div>
          </div>
          {sharing && shareCard && (
            <JourneyShareDialog card={shareCard} onClose={closeSharing} />
          )}
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
                    ? "Well done."
                    : missing
                      ? "Well spotted."
                      : pinpoint && target?.place
                        ? (last?.points ?? 0) >= 900
                          ? "Very close."
                          : (last?.points ?? 0) >= 500
                            ? "Nicely placed."
                            : "Farther afield."
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
              {route ? (
                <h2>{answer}</h2>
              ) : !pinpoint ? (
                <>
                  <p className="study-response study-correction journey-correct-answer">
                    <span>{run.result ? "Answer" : "Correct answer"}: </span>
                    <strong>{answer}</strong>
                  </p>
                  {!run.result && (
                    <p className="submitted-answer minigame-incorrect-answer">
                      Your answer:{" "}
                      <strong>
                        {(shared.game &&
                          submittedMinigameRegion(shared.game, shared.context)
                            ?.name) ||
                          (missing ? "Selected territory" : "Open water")}
                      </strong>
                    </p>
                  )}
                </>
              ) : null}
              {!pinpoint && !missing && (
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
            <div className="minigame-action-row">
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
                  <span aria-hidden="true">→</span>
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
