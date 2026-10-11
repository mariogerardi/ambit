import { QuestionSources } from "./QuestionSources";
import { QuestionHelp } from "../app/QuestionHelp";
import { ActionIcon } from "../app/ActionIcon";
import { pinDistance } from "./answerTargets";
import { useRef } from "react";
import type { RegionFeature, Focus } from "../geography/types";
import type { Journey, QuestionContext } from "./questions";
import { explanation, questionPrompt, committedNameVisible } from "./questions";
import { journeyScore } from "./state";
import type { GameState, Action } from "./state";
import { questionMapPresentation } from "./presentation";
import { AnswerForm } from "./AnswerForm";
import { PlaygroundControls } from "./PlaygroundControls";
import {
  correctAnswerCopy,
  correctAnswerSummary,
  feedbackLegend,
  roundIdentity,
} from "./copy";
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
  onReport,
  onReplay,
  canReplay = false,
}: {
  onReport?(questionId: string): void;
  onReplay?(): void;
  canReplay?: boolean;
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
  const visibleHover =
    hover &&
    mapPresentation.hover &&
    (game.phase !== "playing" ||
      committedNameVisible(round, game.selectedIds, hover.id))
      ? hover.name
      : undefined;
  const distance = pinDistance(round, game);
  const feedbackText = explanation(round, context, game.selectedIds, !!correct);
  const correctAnswer = correctAnswerSummary(round, context, game);
  const pinFeedback =
    round.rule.type === "pin-distance" && distance !== undefined
      ? `Your pin was ${distance < 1 ? "less than 1" : Math.round(distance).toLocaleString()} km away.`
      : "";
  const start = () => (onReplay ? onReplay() : dispatch({ type: "start" }));
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
            <QuestionHelp
              key={round.id}
              onReport={onReport ? () => onReport(round.id) : undefined}
              sources={<QuestionSources question={round} />}
            />
          </div>
          {round.leadIn && <p className="journey-context">{round.leadIn}</p>}
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
              <p className="study-response study-correction journey-correct-answer">
                <span>{correctAnswer.label}: </span>
                <strong>{correctAnswer.value}</strong>
              </p>
              {feedbackText && (
                <p className="journey-explanation">{feedbackText}</p>
              )}
              {pinFeedback && (
                <p className="journey-pin-distance">{pinFeedback}</p>
              )}
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
            </div>
          )}
        </section>
      )}
      {ended && (
        <section className="finish-story">
          {(playground || game.phase === "failed") && (
            <div className="round-overline">
              <span className="overline">
                {playground ? "QUESTION PLAYGROUND" : "ONE WRONG TURN"}
              </span>
              {game.phase === "failed" && (
                <QuestionHelp
                  key={round.id}
                  onReport={onReport ? () => onReport(round.id) : undefined}
                  sources={<QuestionSources question={round} />}
                />
              )}
            </div>
          )}
          <h1 className="journey-result-heading" ref={heading} tabIndex={-1}>
            {game.phase === "failed" ? (
              <>
                This is where <em>we pause.</em>
              </>
            ) : (
              <>
                Look how far <em>you wandered.</em>
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
          {canReplay && (
            <button
              className="quiet-button tertiary-action journey-replay"
              onClick={start}
            >
              <ActionIcon name="repeat" /> Play again
            </button>
          )}
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
