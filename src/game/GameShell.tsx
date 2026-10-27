import { ConstructionReview, IslandScoring } from "./ConstructionAnswer";
import { CompletionMapViews } from "./CompletionMapViews";
import { constructionRule, reviewedConstruction } from "./construction";
import { QuestionSources } from "./QuestionSources";
import { QuestionHelp } from "../app/QuestionHelp";
import { ActionIcon } from "../app/ActionIcon";
import { pinDistance, pinDistanceTier } from "./answerTargets";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { RegionFeature, Focus } from "../geography/types";
import type {
  FlagDisplay,
  Journey,
  QuestionContext,
} from "./questionContracts";
import {
  explanation,
  questionPrompt,
  committedNameVisible,
} from "./questionText";
import { journeyScore } from "./state";
import {
  answerPoints,
  journeyPoints,
  legacyPointCredit,
  QUESTION_POINTS,
} from "./points";
import { PointOrbs } from "./PointOrbs";
import { helpSummary, helpCountCopy } from "./guidance";
import type { GameState, Action } from "./state";
import { questionMapPresentation } from "./presentation";

import { AnswerReview } from "./AnswerReview";
import { pinBands, pinReviewViews } from "./pinPresentation";
import { estimateTier } from "./numericEstimate";
import { reviewedBearing, bearingReceipt } from "./compassBearing";
import { AnswerForm } from "./AnswerForm";
import { QuestionAccuracy } from "./QuestionSupport";
import {
  correctAnswerCopy,
  correctAnswerSummary,
  feedbackLegend,
  roundIdentity,
  resolvedRoundIdentity,
  journeyResultCopy,
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
function MapKey({ entries }: { entries: ReturnType<typeof feedbackLegend> }) {
  return (
    entries.length > 0 && (
      <div className="feedback-map-key" aria-label="Map color key">
        {entries.map(({ key, label, colorRole }) => (
          <span key={key}>
            <i
              className={`key-${key}`}
              aria-hidden="true"
              style={{
                background: `var(--play-${colorRole ?? (key === "hint" ? "hinted" : key === "neutral" ? "disabled" : key)})`,
              }}
            >
              {["correct", "selected", "incorrect"].includes(key) && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d={
                      key === "incorrect"
                        ? "M7 7l10 10M17 7L7 17"
                        : "M5 12l5 5L20 7"
                    }
                  />
                </svg>
              )}
            </i>
            {label}
          </span>
        ))}
      </div>
    )
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
  onPulseIslands,
  onHome,
  onStudy,
  onReport,
  onReplay,
  canReplay = false,
  social,
  contextNavigation,
  constructionReviewIndex,
  onConstructionReview,
  reduced = false,
}: {
  reduced?: boolean;
  constructionReviewIndex?: number;
  onConstructionReview?(index?: number): void;
  social?: ReactNode;
  contextNavigation?: ReactNode;
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
  onPulseIslands?(): void;
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
  const inGame =
    (game.phase === "playing" && (webgl || !!constructionRule(round))) ||
    game.phase === "feedback";
  const ended = game.phase === "finished" || game.phase === "failed";
  const navigation = (
    <div className="finish-actions result-actions completion-navigation">
      <button
        className={social ? "study-repeat-button" : "primary-button"}
        data-dd-action-name="Journey Home"
        onClick={onHome}
      >
        <ActionIcon name="home" />
        <span>Home</span>
      </button>
      <button
        className="study-repeat-button"
        data-dd-action-name="Journey Study"
        onClick={onStudy}
      >
        <ActionIcon name="study" />
        <span>Study</span>
      </button>
    </div>
  );
  const helpCounts = helpCountCopy(helpSummary(game));
  const points = journeyPoints(game);
  const closing = journeyResultCopy(points);
  const constructed = !!constructionRule(round);
  const construction = reviewedConstruction(round, game);
  const constructionFeedback =
    round.mode === "country-recall"
      ? game.recall?.ended === "third-wrong"
        ? "Three incorrect entries."
        : game.recall?.ended === "all-found"
          ? (round.correctFeedback ?? "All countries found.")
          : (game.recall?.entries.filter((e) => e.result === "accepted")
                .length ?? 0) >= Math.ceil((round.count * 2) / 3)
            ? "Almost all found."
            : "Borders remembered."
      : construction?.tier !== null && construction?.tier !== undefined
        ? constructionRule(round)?.tiers[construction.tier].feedback
        : construction?.feedback;
  const feedback = game.answers.at(-1),
    correct = feedback?.correct;
  const mapPresentation = questionMapPresentation(round, game.phase, !!correct);
  const reviewedRound =
    game.phase === "finished" && constructionReviewIndex !== undefined
      ? journey.rounds[constructionReviewIndex]
      : round;
  const mapCaption =
    game.phase === "finished"
      ? (journey.completion?.mapCaption ??
        reviewedRound.feedbackMapCaption ??
        reviewedRound.mapCaption)
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
  const numericTier = estimateTier(round, game);
  const compass =
    round.rule.type === "bearing-angle"
      ? reviewedBearing(round, game)
      : undefined;
  const pinViews = pinReviewViews(round, context, game);
  const feedbackText = explanation(round, context, game.selectedIds, !!correct);
  const correctAnswer = correctAnswerSummary(round, context, game);
  const pinFeedback =
    round.rule.type === "pin-distance" && distance !== undefined
      ? `Your pin was ${distance < 1 ? "less than 1" : Math.round(distance).toLocaleString()} km away.`
      : "";
  const start = () => {
    if (!webgl) return;
    if (onReplay) onReplay();
    else dispatch({ type: "start" });
  };
  const legend =
    game.phase === "feedback" || game.phase === "playing"
      ? feedbackLegend(round, context, game)
      : [];
  const clueImage =
    round.image &&
    (game.phase === "playing" ||
      (!round.feedbackFlags?.length &&
        round.feedbackImage?.src !== round.image.src)) ? (
      <figure
        className={`flag-clue${round.image.context ? " flag-clue-with-context" : ""}${round.image.presentation === "photo" ? " journey-photo-clue" : ""}`}
      >
        <img
          src={round.image.src}
          alt={
            game.phase === "playing" ? round.image.alt : round.image.feedbackAlt
          }
        />
        {round.image.context && (
          <div className="flag-context">
            <img src={round.image.context.src} alt={round.image.context.alt} />
          </div>
        )}
      </figure>
    ) : null;
  return (
    <>
      {inGame && context && (
        <section
          className={`question-card${round.image?.presentation === "photo" ? " photo-question-card" : ""}`}
          aria-label="Current round"
          data-question-id={round.id}
        >
          {contextNavigation}
          <div className="round-overline">
            <span
              className="round-number journey-step"
              aria-label={`Round ${game.roundIndex + 1}`}
            >
              {game.roundIndex + 1}
            </span>
            <span className="overline">{round.label.toUpperCase()}</span>
            <QuestionHelp
              information={<QuestionAccuracy question={round} />}
              sourcesLocked={game.phase === "playing"}
              key={round.id}
              onReport={onReport ? () => onReport(round.id) : undefined}
              sources={<QuestionSources question={round} />}
            />
          </div>
          {round.image?.presentation === "photo" && clueImage}
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
          {round.image?.presentation !== "photo" && clueImage}
          {game.phase === "playing" ? (
            <>
              <AnswerForm
                question={round}
                context={context}
                game={game}
                dispatch={dispatch}
                webgl={webgl}
                onPulseIslands={onPulseIslands}
                onRecenter={() => frame(round.focus)}
                mapKey={
                  <MapKey
                    entries={legend.filter((entry) =>
                      ["hint", "selectable", "selected"].includes(entry.key),
                    )}
                  />
                }
              />
            </>
          ) : (
            <div
              className={`round-feedback ${correct ? "answer-correct" : "answer-discovered"}`}
              role="status"
            >
              {["slider", "compass-bearing"].includes(round.mode) && (
                <AnswerReview question={round} context={context} game={game} />
              )}
              <div className="feedback-point-summary">
                <div className="feedback-label">
                  <span>{correct ? "✳" : "◎"}</span>
                  {correct
                    ? (constructionFeedback ??
                      compass?.feedback ??
                      distanceTier?.feedback ??
                      numericTier?.feedback ??
                      correctAnswerCopy(round))
                    : (constructionFeedback ??
                      compass?.feedback ??
                      (feedback?.partialCredit
                        ? "One country found."
                        : "Not quite."))}
                </div>
                <PointOrbs
                  earned={answerPoints(feedback, game.help?.[round.id])}
                  key={round.id}
                  animate
                />
              </div>
              {constructed && (
                <>
                  <ConstructionReview question={round} response={game} />
                  <IslandScoring questions={[round]} help={game.help} />
                  {round.constructionExample && (
                    <button
                      type="button"
                      className="quiet-button construction-solution-link"
                      aria-expanded={!!game.showConstructionExample}
                      onClick={() =>
                        dispatch({ type: "show-construction-example" })
                      }
                    >
                      {game.showConstructionExample
                        ? "Hide solution"
                        : "Show solution"}{" "}
                      <span aria-hidden="true">
                        {game.showConstructionExample ? "↑" : "→"}
                      </span>
                    </button>
                  )}
                </>
              )}
              {!constructed &&
                !["slider", "compass-bearing"].includes(round.mode) && (
                  <>
                    <p className="study-response study-correction journey-correct-answer">
                      <span>{correctAnswer.label}: </span>
                      <strong>{correctAnswer.value}</strong>
                    </p>
                    <AnswerReview
                      question={round}
                      context={context}
                      game={game}
                    />
                  </>
                )}
              {feedbackText && (
                <p className="journey-explanation">{feedbackText}</p>
              )}
              {!!round.feedbackFlags?.length && (
                <FlagComparison flags={round.feedbackFlags} />
              )}
              {[round.feedbackImage, ...(round.feedbackImages ?? [])]
                .filter((image) => !!image)
                .map((image) => (
                  <figure className="journey-feedback-image" key={image.src}>
                    <img src={image.src} alt={image.alt} />
                    <figcaption>
                      {image.caption}{" "}
                      <a
                        href={image.credit.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {image.credit.name}
                      </a>
                      {" · "}
                      <a
                        href={image.credit.licenseUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {image.credit.license}
                      </a>
                    </figcaption>
                  </figure>
                ))}
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
              {webgl && !correct && pinViews && (
                <div
                  className="journey-map-review"
                  role="group"
                  aria-label="Review pin locations"
                >
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => frame(pinViews.guess)}
                  >
                    Show your pin
                  </button>
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => frame(pinViews.answer)}
                  >
                    Show answer
                  </button>
                </div>
              )}
              {pinBands(round, game).length > 0 && (
                <ol
                  className="pin-accuracy-bands"
                  aria-label="Pin accuracy bands"
                >
                  {pinBands(round, game).map((band) => (
                    <li
                      key={band.radiusKm}
                      data-achieved={band.achieved || undefined}
                      style={
                        {
                          "--band-color": `var(--play-${band.index === 0 ? "correct" : band.index === band.count - 1 ? "hinted" : "selected"})`,
                        } as import("react").CSSProperties
                      }
                    >
                      <span aria-hidden="true">
                        {band.achieved ? "✓" : "◎"}
                      </span>
                      <span>
                        <strong>{band.label}</strong>
                        <span>Within {band.radiusKm.toLocaleString()} km</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <MapKey entries={legend} />
              <button
                className="primary-button"
                data-dd-action-name="Journey Next Round"
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
          {contextNavigation}
          <h1 className="journey-result-heading" ref={heading} tabIndex={-1}>
            {game.phase === "failed" ? (
              <>
                This run <em>ends here.</em>
              </>
            ) : (
              <>
                {closing.lead}
                <em>{closing.emphasis}</em>
              </>
            )}
          </h1>
          <div className="journey-score">
            <strong>
              {points}
              <span>/{journey.rounds.length * QUESTION_POINTS}</span>
            </strong>
            <span>points</span>
          </div>
          <div className="journey-point-total">
            <PointOrbs
              earned={points}
              total={journey.rounds.length * QUESTION_POINTS}
              animate
            />
          </div>
          <p className="journey-result-summary">
            <span className="journey-correct-count">
              {journeyScore(game)}/{journey.rounds.length} correct answers
            </span>
            {helpCounts && (
              <span className="journey-help-summary">{helpCounts}</span>
            )}
          </p>
          {legacyPointCredit(game) && (
            <p className="journey-legacy-points">
              Earlier answers keep full credit under the previous scoring rules.
            </p>
          )}
          {game.phase === "failed" && <p>{feedbackText}</p>}

          {game.phase === "finished" &&
            reduced &&
            webgl &&
            constructionReviewIndex === undefined &&
            !!journey.completion?.views?.length && (
              <CompletionMapViews
                key={journey.id}
                overview={journey.completion.focus}
                views={journey.completion.views}
                frame={frame}
              />
            )}
          {journey.completion?.constructionResults &&
            game.phase === "finished" && (
              <>
                <div
                  className="construction-recap-controls"
                  aria-label="Review your constructions"
                >
                  <button
                    type="button"
                    className="quiet-button"
                    aria-pressed={constructionReviewIndex === undefined}
                    onClick={() => onConstructionReview?.()}
                  >
                    Overview
                  </button>
                  {journey.rounds.map((q, i) => (
                    <button
                      type="button"
                      className="quiet-button"
                      aria-pressed={constructionReviewIndex === i}
                      key={q.id}
                      onClick={() => onConstructionReview?.(i)}
                    >
                      {q.progressLabel ?? q.label}
                    </button>
                  ))}
                </div>
                {constructionReviewIndex !== undefined && (
                  <ConstructionReview
                    question={
                      journey.rounds[
                        constructionReviewIndex ?? journey.rounds.length - 1
                      ]
                    }
                    response={{
                      ...game,
                      ...game.answers.find(
                        (a) =>
                          a.roundId ===
                          journey.rounds[
                            constructionReviewIndex ?? journey.rounds.length - 1
                          ].id,
                      ),
                    }}
                  />
                )}
                {constructionReviewIndex !== undefined &&
                  journey.rounds[constructionReviewIndex].mode ===
                    "country-recall" && (
                    <AnswerReview
                      question={journey.rounds[constructionReviewIndex]}
                      context={context}
                      game={{
                        ...game,
                        ...game.answers.find(
                          (a) =>
                            a.roundId ===
                            journey.rounds[constructionReviewIndex].id,
                        ),
                        phase: "feedback",
                        roundIndex: constructionReviewIndex,
                      }}
                    />
                  )}
                {constructionReviewIndex !== undefined && (
                  <IslandScoring
                    questions={[journey.rounds[constructionReviewIndex]]}
                    help={game.help}
                  />
                )}
              </>
            )}
          <ol className="journey-receipt">
            {journey.rounds.map((question, i) => {
              const answer = game.answers.find(
                (answer) => answer.roundId === question.id,
              );
              const help = game.help?.[question.id];
              const recapDistance = answer && pinDistance(question, answer);
              const recapTier = answer && pinDistanceTier(question, answer);
              const reviewedGame = answer
                ? {
                    ...game,
                    ...answer,
                    phase: "feedback" as const,
                    roundIndex: i,
                    answers: [answer],
                  }
                : undefined;
              return (
                <li
                  key={question.id}
                  className={
                    journey.completion?.photoResults
                      ? "journey-photo-result"
                      : undefined
                  }
                >
                  {journey.completion?.photoResults &&
                    question.feedbackImage && (
                      <img
                        src={question.feedbackImage.src}
                        alt={question.feedbackImage.alt}
                        loading="lazy"
                      />
                    )}
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <div className="journey-receipt-detail">
                    <strong>
                      {answer
                        ? (answer.receiptLabel ??
                          resolvedRoundIdentity(question))
                        : roundIdentity(question)}
                    </strong>
                    {answer?.bearing && (
                      <span className="compass-receipt">
                        {bearingReceipt(answer.bearing)}
                      </span>
                    )}
                    {journey.completion?.photoResults &&
                      recapDistance !== undefined && (
                        <span>
                          {recapDistance < 1
                            ? "Less than 1"
                            : Math.round(recapDistance).toLocaleString()}{" "}
                          km away ·{" "}
                          {recapTier?.feedback ??
                            `Outside ${question.rule.type === "pin-distance" ? question.rule.radiusKm : 0} km`}
                        </span>
                      )}
                    {journey.completion?.photoResults &&
                      question.feedbackImage && (
                        <small>
                          Photo:{" "}
                          <a
                            href={question.feedbackImage.credit.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {question.feedbackImage.credit.name}
                          </a>
                          {" · "}
                          <a
                            href={question.feedbackImage.credit.licenseUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {question.feedbackImage.credit.license}
                          </a>
                        </small>
                      )}
                    {journey.completion?.answerReviews && reviewedGame && (
                      <details className="journey-answer-recap">
                        <summary>Review your answer</summary>
                        <p>
                          {
                            correctAnswerSummary(
                              question,
                              context,
                              reviewedGame,
                            ).value
                          }
                        </p>
                        {recapDistance !== undefined && (
                          <p>
                            Your pin was{" "}
                            {recapDistance < 1
                              ? "less than 1"
                              : Math.round(recapDistance).toLocaleString()}{" "}
                            km away.
                          </p>
                        )}
                        <AnswerReview
                          question={question}
                          context={context}
                          game={reviewedGame}
                        />
                      </details>
                    )}
                  </div>
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
                    <span className="journey-round-points">
                      <PointOrbs
                        earned={answerPoints(answer, help)}
                        label={`Question ${i + 1}: ${answerPoints(answer, help)} of 3 points`}
                      />
                      <span
                        className={`journey-round-outcome${answer && !answer.correct ? " journey-incorrect" : ""}`}
                        aria-label={answer ? undefined : "Not reached"}
                        title={answer ? undefined : "Not reached"}
                      >
                        {answer ? (answer.correct ? "✓" : "×") : "—"}
                      </span>
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
          {social ?? navigation}
          {canReplay && (
            <button
              className="quiet-button tertiary-action journey-replay"
              data-dd-action-name="Journey Play Again"
              disabled={!webgl}
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
            <a
              data-dd-action-name="Journey Map Source"
              href={mapAttribution.url}
              target="_blank"
              rel="noreferrer"
            >
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
            <button
              data-dd-action-name="Journey Recenter"
              onClick={() => frame(round.focus)}
            >
              ◎ Recenter
            </button>
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
