import { useContext, useLayoutEffect, useRef } from "react";
import { PanelActive } from "../app/ModePanels";
import type { useBorderMinigame } from "./useBorderMinigame";

export function BorderMinigamePanel({
  shared,
  webgl,
  onBack,
}: {
  shared: ReturnType<typeof useBorderMinigame>;
  webgl: boolean;
  onBack(): void;
}) {
  const missing = shared.kind === "missing-borders";
  const active = useContext(PanelActive);
  const heading = useRef<HTMLHeadingElement>(null);
  const next = useRef<HTMLButtonElement>(null);
  const run = shared.run;
  const ended = shared.ended;
  const feedback = run?.result !== undefined;
  useLayoutEffect(() => {
    if (!active) return;
    const scroller = heading.current?.closest(".mode-layer");
    if (scroller) scroller.scrollTop = 0;
    (feedback && !ended ? next.current : heading.current)?.focus({
      preventScroll: true,
    });
  }, [active, run?.index, run?.cycle, feedback, ended]);
  if (!webgl)
    return (
      <section className="info-view">
        <h1 className="editorial-heading">{shared.title}</h1>
        <p>The 3D globe is required to play on this device.</p>
        <button className="quiet-button" onClick={onBack}>
          Back to games
        </button>
      </section>
    );
  if (!run || !shared.pair || !shared.context)
    return (
      <section className="info-view" role="status">
        <p>Loading {shared.title}…</p>
        <button className="quiet-button" onClick={onBack}>
          Back to games
        </button>
      </section>
    );
  const names = shared.pair.countries.map(
    (id) => shared.context!.names.get(id)!,
  );
  const answer = missing
    ? names.join(" + ")
    : shared.context.names.get(shared.pair.answer)!;
  return (
    <section
      className={`info-view shared-neighbors-game ${missing ? "missing-borders-game" : ""}`}
      aria-label={`${shared.title} game`}
    >
      <div className="shared-neighbors-heading">
        <span className="overline">{shared.title}</span>
        <button className="quiet-button" onClick={onBack}>
          Back to games
        </button>
      </div>
      {!ended && (
        <p className="shared-neighbors-score">
          {run.correct} correct · {run.answered} answered
          <span className="shared-neighbors-strikes" role="status">
            {run.answered - run.correct} / 3 strikes
          </span>
        </p>
      )}
      <h1 className="editorial-heading" ref={heading} tabIndex={-1}>
        {ended ? (
          run.ended === "finished" ? (
            "Game finished."
          ) : (
            "Three strikes."
          )
        ) : (
          <>
            {missing ? (
              <>
                Which territory hides <em>two countries?</em>
              </>
            ) : (
              <>
                Which country borders <em>both?</em>
              </>
            )}
          </>
        )}
      </h1>
      {ended && (
        <dl className="shared-neighbors-results" aria-label="Final score">
          <div>
            <dt>Correct</dt>
            <dd>{run.correct}</dd>
          </div>
          <div>
            <dt>Answered</dt>
            <dd>{run.answered}</dd>
          </div>
          <div>
            <dt>Strikes</dt>
            <dd>{run.answered - run.correct}</dd>
          </div>
        </dl>
      )}
      {!ended && !missing && (
        <div className="shared-neighbors-clues" aria-label="Clue countries">
          <span>{names[0]}</span>
          <span aria-hidden="true">+</span>
          <span>{names[1]}</span>
        </div>
      )}
      {feedback && (!ended || run.ended !== "finished") && (
        <>
          <div className="shared-neighbors-feedback" role="status">
            <p className="overline">
              {run.result
                ? "Correct"
                : missing
                  ? "The missing border"
                  : "The shared neighbor"}
            </p>
            <h2>{answer}</h2>
            <p>{shared.journey!.rounds[0].explanation}</p>
          </div>
          {!ended && (
            <button
              className="primary-button"
              ref={next}
              onClick={() => shared.action({ type: "next" })}
            >
              {missing ? "Next map →" : "Next pair →"}
            </button>
          )}
        </>
      )}
      {!ended && !feedback && (
        <>
          <p className="muted">
            {missing
              ? "One land border has disappeared. Tap the territory hiding two countries."
              : "Borders are hidden. Tap the globe to place your pin."}
          </p>
          {!missing && run.pin && (
            <p className="shared-neighbors-pin" role="status">
              Pin placed. Move it on the globe or check your answer.
            </p>
          )}
          {!missing && (
            <button
              className="primary-button"
              disabled={!run.pin}
              onClick={() => shared.action({ type: "submit" })}
            >
              Check answer
            </button>
          )}
        </>
      )}
      {ended ? (
        <button className="primary-button" onClick={shared.restart}>
          Play again
        </button>
      ) : (
        <button
          className="quiet-button shared-neighbors-finish"
          onClick={() => shared.action({ type: "finish" })}
        >
          Finish game
        </button>
      )}
      {!shared.saved && (
        <p className="muted" role="status">
          Progress couldn’t be saved on this device.
        </p>
      )}
    </section>
  );
}
