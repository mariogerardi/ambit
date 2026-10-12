import { QuestionSources } from "./QuestionSources";
import { QuestionHelp } from "../app/QuestionHelp";
import { ActionIcon } from "../app/ActionIcon";
import { pinDistance, pinDistanceTier } from "./answerTargets";
import { useLayoutEffect, useRef } from "react";
import type { RegionFeature, Focus } from "../geography/types";
import type { FlagDisplay, Journey, QuestionContext } from "./questions";
import { explanation, questionPrompt, committedNameVisible } from "./questions";
import { journeyScore } from "./state";
import { helpSummary, helpCountCopy } from "./guidance";
import type { GameState, Action } from "./state";
import { questionMapPresentation } from "./presentation";
import { PLAY_FEEDBACK, PLAY_HIGHLIGHTS } from "../globe/themes";
import { AnswerForm } from "./AnswerForm";
import {
  correctAnswerCopy,
  correctAnswerSummary,
  feedbackLegend,
  roundIdentity,
  resolvedRoundIdentity,
} from "./copy";
function FlagComparison({
  flags,
  label = "Revealed national flags",
}: {
  flags: FlagDisplay[];
  label?: string;
}) {
  return (
    <div
      className={`flag-comparison${flags.length === 1 ? " flag-comparison-single" : flags.length > 2 ? " flag-collection" : ""}`}
      role="group"
      aria-label={label}
    >
      {flags.map((flag) => (
        <figure key={flag.src}>
          <div className="flag-media">
            {flag.detail && (
              <img
                className="flag-detail"
                src={flag.detail.src}
                alt={flag.detail.alt}
              />
            )}
            <img className="flag-full" src={flag.src} alt={flag.alt} />
          </div>
          {flags.length > 1 && (
            <figcaption>
              <strong>{flag.label}</strong>
              {flag.caption && <span>{flag.caption}</span>}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
export function GameShell({
  journey,
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
  compact?: boolean;
  context: QuestionContext;
  game: GameState;
  dispatch(action: Action): void;
  hover?: RegionFeature;
  webgl: boolean;
  frame(focus: Focus): void;
  onHome(): void;
  onStudy(): void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const round = journey.rounds[game.roundIndex];
  useLayoutEffect(() => {
    if (game.phase !== "playing") return;
    // Desktop scrolls the card; mobile scrolls its containing tray.
    const card = heading.current?.closest<HTMLElement>(".question-card");
    if (!card || card.closest("[inert]")) return;
    card.scrollTop = 0;
    const tray = card?.closest<HTMLElement>(".mode-layer");
    if (tray) tray.scrollTop = 0;
    heading.current?.focus({ preventScroll: true });
  }, [round.id, game.phase]);
  const inGame = game.phase === "playing" || game.phase === "feedback";
  const ended = game.phase === "finished" || game.phase === "failed";
  const helpCounts = helpCountCopy(helpSummary(game));
  const feedback = game.answers.at(-1),
    correct = feedback?.correct;
  const mapPresentation = questionMapPresentation(round, game.phase, !!correct);
  const mapCaption =
    game.phase === "finished"
      ? (journey.completion?.mapCaption ??
        round.feedbackMapCaption ??
        round.mapCaption)
      : game.phase === "feedback"
        ? (round.feedbackMapCaption ?? round.mapCaption)
        : round.mapCaption;
  const mapAttribution =
    game.phase === "finished"
      ? (journey.completion?.mapAttribution ?? journey.mapAttribution)
      : journey.mapAttribution;
  const visibleHover =
    hover &&
    mapPresentation.hover &&
    (game.phase !== "playing" ||
      committedNameVisible(round, game.selectedIds, hover.id))
      ? hover.name
      : undefined;
  const distance = pinDistance(round, game);
  const distanceTier = pinDistanceTier(round, game);
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
      {inGame && context && (
        <section
          className="question-card"
          aria-label="Current round"
          data-question-id={round.id}
        >
          <div className="round-overline">
            <span
              className="round-number journey-step"
              aria-label={`Round ${game.roundIndex + 1}`}
            >
              {game.roundIndex + 1}
            </span>
            <span className="overline">{round.label.toUpperCase()}</span>
            <QuestionHelp
              sourcesLocked={game.phase === "playing"}
              key={round.id}
              onReport={onReport ? () => onReport(round.id) : undefined}
              sources={<QuestionSources question={round} />}
            />
          </div>
          <h1 className="journey-question-copy" ref={heading} tabIndex={-1}>
            {round.leadIn && (
              <>
                <span className="journey-lead-in">{round.leadIn}</span>{" "}
              </>
            )}
            <span className="journey-prompt">
              {questionPrompt(round, context)}
            </span>
          </h1>
          {round.image &&
            (game.phase === "playing" || !round.feedbackFlags?.length) && (
              <figure
                className={`flag-clue${round.image.context ? " flag-clue-with-context" : ""}`}
              >
                <img
                  src={round.image.src}
                  alt={
                    game.phase === "playing"
                      ? round.image.alt
                      : round.image.feedbackAlt
                  }
                />
                {round.image.context && (
                  <div className="flag-context">
                    <img
                      src={round.image.context.src}
                      alt={round.image.context.alt}
                    />
                  </div>
                )}
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
                {correct
                  ? (distanceTier?.feedback ?? correctAnswerCopy(round))
                  : "Not quite."}
              </div>
              <p className="study-response study-correction journey-correct-answer">
                <span>{correctAnswer.label}: </span>
                <strong>{correctAnswer.value}</strong>
              </p>
              {feedbackText && (
                <p className="journey-explanation">{feedbackText}</p>
              )}
              {!!round.feedbackFlags?.length && (
                <FlagComparison flags={round.feedbackFlags} />
              )}
              {round.feedbackImage && (
                <figure className="journey-feedback-image">
                  <img
                    src={round.feedbackImage.src}
                    alt={round.feedbackImage.alt}
                  />
                  <figcaption>
                    {round.feedbackImage.caption}{" "}
                    <a
                      href={round.feedbackImage.credit.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {round.feedbackImage.credit.name}
                    </a>
                    {" · "}
                    <a
                      href={round.feedbackImage.credit.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {round.feedbackImage.credit.license}
                    </a>
                  </figcaption>
                </figure>
              )}
              {round.feedbackDiagram?.type === "river-banks" && (
                <figure className="river-banks-diagram">
                  <svg
                    viewBox="0 0 320 108"
                    role="img"
                    aria-label={`Schematic: ${round.feedbackDiagram.westBank} on the west bank, ${round.feedbackDiagram.eastBank} on the east bank of the ${round.feedbackDiagram.river}`}
                  >
                    <path d="M164 0 C133 28 181 50 157 76 S153 100 154 108" />
                    <text x="68" y="43">
                      {round.feedbackDiagram.westBank}
                    </text>
                    <text x="252" y="43">
                      {round.feedbackDiagram.eastBank}
                    </text>
                    <text className="bank-direction" x="68" y="66">
                      West bank
                    </text>
                    <text className="bank-direction" x="252" y="66">
                      East bank
                    </text>
                  </svg>
                </figure>
              )}
              {round.feedbackDiagram?.type === "earth-shape" && (
                <figure className="earth-shape-diagram">
                  <svg
                    viewBox="0 0 360 190"
                    role="img"
                    aria-label="Schematic: Earth bulges at the Equator. Chimborazo is farther from the center; Everest is higher above sea level."
                  >
                    <ellipse cx="150" cy="105" rx="98" ry="60" />
                    <path className="earth-equator" d="M40 105 H265" />
                    <path
                      className="earth-radius"
                      d="M150 105 L213 37 M150 105 H263"
                    />
                    <path
                      className="earth-peak"
                      d="M201 57 L213 37 L219 66 M244 98 L263 105 L244 112"
                    />
                    <circle cx="150" cy="105" r="3" />
                    <text x="214" y="22">
                      Everest
                    </text>
                    <text x="273" y="110">
                      Chimborazo
                    </text>
                    <text className="earth-detail" x="112" y="124">
                      Center
                    </text>
                    <text className="earth-detail" x="40" y="94">
                      Equator
                    </text>
                  </svg>
                  <figcaption>
                    Schematic · shape and heights exaggerated.
                  </figcaption>
                </figure>
              )}
              {pinFeedback && (
                <p className="journey-pin-distance">{pinFeedback}</p>
              )}
              {round.rule.type === "pin-distance" && round.rule.tiers && (
                <p className="journey-pin-tiers">
                  Target rings:{" "}
                  {round.rule.tiers
                    .map((tier) => `${tier.radiusKm} km`)
                    .join(" · ")}
                  . All rings count as correct.
                </p>
              )}
              {legend.length > 0 && (
                <div className="feedback-map-key" aria-label="Map color key">
                  {legend.map(({ key, label }) => (
                    <span key={key}>
                      <i
                        className={`key-${key}`}
                        style={{
                          background:
                            key === "hint"
                              ? PLAY_HIGHLIGHTS.context
                              : PLAY_FEEDBACK[
                                  key as keyof typeof PLAY_FEEDBACK
                                ],
                        }}
                      />
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
          {game.phase === "failed" && (
            <div className="round-overline">
              <span className="overline">ONE WRONG TURN</span>
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
          {helpCounts && <p className="journey-help-summary">{helpCounts}</p>}
          {game.phase === "failed" && <p>{feedbackText}</p>}

          <ol className="journey-receipt">
            {journey.rounds.map((question, i) => {
              const answer = game.answers.find(
                (answer) => answer.roundId === question.id,
              );
              const help = game.help?.[question.id];
              return (
                <li key={question.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <strong>
                    {answer
                      ? (answer.receiptLabel ?? resolvedRoundIdentity(question))
                      : roundIdentity(question)}
                  </strong>
                  <span className="journey-round-result">
                    {help && (
                      <span
                        className="journey-row-help"
                        data-help={help}
                        role="img"
                        aria-label={
                          help === "assisted" ? "Assist used" : "Hint used"
                        }
                        title={
                          help === "assisted" ? "Assist used" : "Hint used"
                        }
                      >
                        <ActionIcon
                          name={help === "assisted" ? "assist" : "hint"}
                        />
                      </span>
                    )}
                    <span
                      className={
                        answer && !answer.correct
                          ? "journey-incorrect"
                          : undefined
                      }
                    >
                      {answer ? (answer.correct ? "✓" : "×") : "Not reached"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          {game.phase === "finished" && !!journey.completion?.flags?.length && (
            <FlagComparison
              flags={journey.completion.flags}
              label="Journey flag comparison"
            />
          )}
          {game.phase === "finished" && journey.completion?.caption && (
            <p className="journey-route-caption">
              {journey.completion.caption}
            </p>
          )}
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
      {(mapAttribution || mapCaption) && (
        <aside className="journey-map-notes" aria-label="Map notes">
          {mapCaption && <span>{mapCaption}</span>}
          {mapAttribution && (
            <a href={mapAttribution.url} target="_blank" rel="noreferrer">
              {mapAttribution.label}
            </a>
          )}
        </aside>
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
