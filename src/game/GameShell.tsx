import { InfoTooltip } from "../app/InfoTooltip";
import { ActionIcon } from "../app/ActionIcon";
import { answerPlace, pinDistance } from "./answerTargets";
import { useRef } from "react";
import type { RegionFeature, Focus } from "../geography/types";
import type { Journey, QuestionContext } from "./questions";
import { explanation, questionPrompt, committedNameVisible } from "./questions";
import { journeyScore } from "./state";
import type { GameState, Action } from "./state";
import { questionMapPresentation } from "./presentation";
import { AnswerForm } from "./AnswerForm";
import { PlaygroundControls } from "./PlaygroundControls";
import { correctAnswerCopy, feedbackLegend, roundIdentity } from "./copy";
export function GameShell({
  journey,
  playground = false,
  context,
  game,
  dispatch,
  hover,
  webgl,
  frame,
  onHome,
  onStudy,
}: {
  journey: Journey;
  playground?: boolean;
  compact?: boolean;
  context: QuestionContext;
  game: GameState;
  dispatch(action: Action): void;
  hover?: RegionFeature;
  webgl: boolean;
  frame(focus: Focus): void;
  onHome(): void;
  onStudy(): void;
  onPlayground(): void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const round = journey.rounds[game.roundIndex];
  const inGame = game.phase === "playing" || game.phase === "feedback";
  const ended = game.phase === "finished" || game.phase === "failed";
  const feedback = game.answers.at(-1),
    correct = feedback?.correct;
  const mapPresentation = questionMapPresentation(round, game.phase, !!correct);
  const name = (id: string) =>
    round.choices?.find((c) => c.id === id)?.label ??
    answerPlace(round, id)?.name ??
    context.names.get(id) ??
    context.choiceNames.get(id) ??
    id;
  const visibleHover =
    hover &&
    mapPresentation.hover &&
    (game.phase !== "playing" ||
      committedNameVisible(round, game.selectedIds, hover.id))
      ? hover.name
      : undefined;
  const distance = pinDistance(round, game);
  const pinFeedback =
    round.rule.type === "pin-distance" && distance !== undefined
      ? `${distance < 1 ? "Less than 1" : Math.round(distance).toLocaleString()} km from ${answerPlace(round, round.rule.targetId)?.name}. Within ${round.rule.radiusKm.toLocaleString()} km is correct.`
      : round.rule.type === "pin-inside"
        ? `Your pin landed ${correct ? "inside" : "outside"} ${round.rule.ids.map(name).join(" or ")}.`
        : "";
  const feedbackText = [
    pinFeedback,
    explanation(round, context, game.selectedIds, !!correct),
  ]
    .filter(Boolean)
    .join(" ");
  const submitted = feedback?.ordered.length
    ? feedback.ordered.join(round.mode === "typed-regions" ? ", " : " → ")
    : feedback?.text || feedback?.selectedIds.map(name).join(" → ");
  const start = () => dispatch({ type: "start" });
  const legend =
    game.phase === "feedback" ? feedbackLegend(round, context, game) : [];
  return (
    <>
      {playground && (
        <PlaygroundControls
          journey={journey}
          index={game.roundIndex}
          dispatch={dispatch}
        />
      )}
      {inGame && context && (
        <section className="question-card" aria-label="Current round">
          <div className="round-overline">
            <span
              className="round-number journey-step"
              aria-label={`Round ${game.roundIndex + 1}`}
            >
              {game.roundIndex + 1}
            </span>
            <span className="overline">{round.label.toUpperCase()}</span>
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {questionPrompt(round, context)}
          </h1>
          {round.image && (
            <figure className="flag-clue">
              <img
                src={round.image.src}
                alt={
                  game.phase === "playing"
                    ? round.image.alt
                    : round.image.feedbackAlt
                }
                width="1200"
                height="600"
              />
            </figure>
          )}
          {game.phase === "playing" ? (
            <>
              {round.instruction && (
                <p className="question-instruction">{round.instruction}</p>
              )}
              <AnswerForm
                question={round}
                context={context}
                game={game}
                dispatch={dispatch}
                webgl={webgl}
              />
            </>
          ) : (
            <div
              className={`round-feedback ${correct ? "answer-correct" : "answer-discovered"}`}
              role="status"
            >
              <div className="feedback-label">
                <span>{correct ? "✳" : "◎"}</span>
                {correct ? correctAnswerCopy(round) : "Not quite."}
              </div>
              {submitted && (
                <p className="submitted-answer">Your answer: {submitted}</p>
              )}
              <p>{feedbackText}</p>
              {legend.length > 0 && (
                <div className="feedback-map-key" aria-label="Map color key">
                  {legend.map(({ key, label }) => (
                    <span key={key}>
                      <i className={`key-${key}`} />
                      {label}
                    </span>
                  ))}
                </div>
              )}
              <button
                className="primary-button"
                onClick={() => dispatch({ type: "next" })}
              >
                {game.roundIndex === journey.rounds.length - 1
                  ? "See results"
                  : "Next"}
                <span>→</span>
              </button>
              <InfoTooltip key={round.id} label="Sources">
                {round.qualification && <p>{round.qualification}</p>}
                {[
                  ...new Map(
                    [round.source, ...(round.sources ?? [])]
                      .filter((s) => s.name.trim() || s.url)
                      .map((s) => [`${s.url}:${s.name}`, s]),
                  ).values(),
                ].map((source) =>
                  /^https?:\/\//i.test(source.url) ? (
                    <a
                      key={`${source.url}:${source.name}`}
                      className="fact-source"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.name.replace(/ · pinned /, " · ")} ↗
                    </a>
                  ) : (
                    <span
                      key={`${source.url}:${source.name}`}
                      className="fact-source"
                    >
                      {source.name}
                    </span>
                  ),
                )}
                {(round.importedRegions ?? [])
                  .filter((r) => r.attribution)
                  .map((r) => (
                    <p className="fact-source" key={r.id}>
                      {r.name} · {r.attribution}
                      {r.sourceUrl && /^https?:\/\//i.test(r.sourceUrl) && (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={r.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Source ↗
                          </a>
                        </>
                      )}
                    </p>
                  ))}
              </InfoTooltip>
            </div>
          )}
        </section>
      )}
      {ended && (
        <section className="finish-story">
          <div className="overline">
            {playground
              ? "QUESTION PLAYGROUND"
              : game.phase === "failed"
                ? "ONE WRONG TURN"
                : "JOURNEY COMPLETE"}
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {game.phase === "failed" ? (
              <>
                This is where
                <br />
                <em>we pause.</em>
              </>
            ) : (
              <>
                Look how far
                <br />
                <em>you wandered.</em>
              </>
            )}
          </h1>
          <div className="journey-score">
            <strong>
              {journeyScore(game)}
              <span>/{journey.rounds.length}</span>
            </strong>
            <span>correct answers</span>
          </div>
          {(playground || game.phase === "failed") && (
            <p>
              {playground
                ? "Use the type selector to revisit an example or try a fresh attempt."
                : feedbackText}
            </p>
          )}
          <ol className="journey-receipt">
            {journey.rounds.map((question, i) => {
              const answer = game.answers.find(
                (answer) => answer.roundId === question.id,
              );
              return (
                <li key={question.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <strong>{roundIdentity(question)}</strong>
                  <span
                    className={
                      answer && !answer.correct
                        ? "journey-incorrect"
                        : undefined
                    }
                  >
                    {answer ? (answer.correct ? "✓" : "×") : "Not reached"}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="finish-actions result-actions">
            <button className="primary-button" onClick={onHome}>
              <ActionIcon name="home" />
              <span>Home</span>
            </button>
            <button className="study-repeat-button" onClick={onStudy}>
              <ActionIcon name="study" />
              <span>Study</span>
            </button>
          </div>
          <button
            className="quiet-button tertiary-action journey-replay"
            onClick={start}
          >
            <ActionIcon name="repeat" /> Play again
          </button>
        </section>
      )}
      <div className="board-tools">
        {inGame && game.phase === "playing" && (
          <>
            <span className="hover-place" aria-live="polite">
              {visibleHover ?? "Drag to rotate"}
            </span>
            <button onClick={() => frame(round.focus)}>◎ Recenter</button>
          </>
        )}
      </div>
      <footer className="experience-footer">
        {inGame ? (
          <ol className="journey-progress" aria-label="Journey progress">
            {journey.rounds.map((question, index) => {
              const answer = game.answers.find(
                (answer) => answer.roundId === question.id,
              );
              const active = index === game.roundIndex;
              return (
                <li
                  key={question.id}
                  className={active ? "current" : answer ? "complete" : ""}
                  aria-current={active ? "step" : undefined}
                >
                  <i
                    className={`journey-step${answer && !answer.correct ? " journey-incorrect" : ""}`}
                  >
                    {answer ? (answer.correct ? "✓" : "×") : index + 1}
                  </i>
                  <span>
                    {active || answer ? roundIdentity(question) : "???"}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <span className="footer-note">
            ONE WORLD. A DIFFERENT WAY TO SEE IT.
          </span>
        )}
      </footer>
    </>
  );
}
