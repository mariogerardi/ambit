import { startTransition, useEffect, useRef, useState } from "react";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { GameState } from "../game/state";
import { answerPoints } from "../game/points";
import { pinDistanceTier } from "../game/answerTargets";
import { estimateTier } from "../game/numericEstimate";
import { reviewedBearing } from "../game/compassBearing";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { adminJourneyLink } from "./accountNavigation";
import { isReviewStage, reviewOutcomes, reviewState } from "./journeyReview";
import type { JourneyReviewSource, ReviewStage } from "./journeyReview";
export { reviewRound } from "./journeyReview";

export function currentReviewStage(
  game: GameState,
  journey: Journey,
): ReviewStage {
  if (game.phase === "finished")
    return game.answers.every((answer) => answer.correct)
      ? "completion"
      : "completion-mixed";
  const question = journey.rounds[game.roundIndex];
  if (game.phase === "playing") {
    const help = game.help?.[question.id];
    return help === "assisted" ? "assist" : help === "hinted" ? "hint" : "play";
  }
  const rule = question.rule;
  const tier =
    rule.type === "pin-distance"
      ? rule.tiers?.indexOf(pinDistanceTier(question, game)!)
      : rule.type === "numeric-range"
        ? rule.tiers?.indexOf(estimateTier(question, game)!)
        : rule.type === "bearing-angle"
          ? reviewedBearing(question, game)?.tier
          : undefined;
  if (tier !== undefined && tier !== null && tier > 0) return `tier-${tier}`;
  const answer = game.answers.at(-1);
  if (answer?.partialCredit) return "partial";
  return answer?.correct ? "correct" : "missed";
}

export function AdminJourneyReview({
  journey,
  context,
  game,
  onChange,
  onNavigate,
  date,
  source,
  loadError,
}: {
  journey: Journey;
  context: QuestionContext;
  game: GameState;
  onChange(game: GameState): void;
  onNavigate(url: string): void;
  date?: string;
  source?: JourneyReviewSource;
  loadError?: string;
}) {
  const params = new URLSearchParams(location.search);
  const initialQuestion = source?.questionId ?? params.get("question");
  const initialIndex = Math.max(
    0,
    journey.rounds.findIndex((q) => q.id === initialQuestion),
  );
  const initialStage = source?.stage ?? params.get("state") ?? "play";
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [activeStage, setActiveStage] = useState<ReviewStage>(
    isReviewStage(initialStage) ? initialStage : "play",
  );
  const [origin, setOrigin] = useState<"preview" | "player">("preview");
  const [collapsed, setCollapsed] = useState(() => window.innerWidth <= 760);
  const [busy, setBusy] = useState(false);
  const [showPending, setShowPending] = useState(false);
  useEffect(() => {
    if (!busy) {
      setShowPending(false);
      return;
    }
    const timer = window.setTimeout(() => setShowPending(true), 200);
    return () => clearTimeout(timer);
  }, [busy]);
  const [error, setError] = useState("");
  const request = useRef(0);
  const requestedState = useRef<GameState | undefined>(undefined);
  const beforeCompletion = useRef<
    | { game: GameState; stage: ReviewStage; origin: "preview" | "player" }
    | undefined
  >(undefined);
  const previousGame = useRef(game);
  const question = journey.rounds[selectedIndex];
  const outcomes = reviewOutcomes(question);
  const completion =
    activeStage === "completion" || activeStage === "completion-mixed";
  const seed = source?.seed ?? 1;

  function syncLocation(index: number, stage: ReviewStage) {
    if (source?.onInspect) source.onInspect(index, stage);
    else {
      const url = new URL(location.href);
      url.searchParams.set("question", journey.rounds[index].id);
      url.searchParams.set("state", stage);
      if (url.href !== location.href) history.replaceState(null, "", url);
    }
  }

  async function open(index: number, stage: ReviewStage) {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const next = await reviewState(journey, context, index, stage, seed);
      if (id !== request.current) return;
      if (
        (stage === "completion" || stage === "completion-mixed") &&
        !completion
      )
        beforeCompletion.current = { game, stage: activeStage, origin };
      if (stage !== "completion" && stage !== "completion-mixed")
        beforeCompletion.current = undefined;
      startTransition(() => {
        requestedState.current = next;
        onChange(next);
        setSelectedIndex(index);
        setActiveStage(stage);
        setOrigin("preview");
      });
      syncLocation(index, stage);
    } catch (failure) {
      if (id === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Couldn’t open this preview.",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function returnToQuestion() {
    const saved = beforeCompletion.current;
    if (!saved || saved.game.roundIndex !== selectedIndex) {
      void open(selectedIndex, "play");
      return;
    }
    request.current++;
    requestedState.current = saved.game;
    onChange(saved.game);
    setActiveStage(saved.stage);
    setOrigin(saved.origin);
    setBusy(false);
    setError("");
    syncLocation(selectedIndex, saved.stage);
  }

  useEffect(() => {
    void open(
      initialIndex,
      isReviewStage(initialStage) ? initialStage : "play",
    );
    return () => {
      request.current++;
    };
  }, [journey.id]);

  useEffect(() => {
    if (previousGame.current === game) return;
    const previous = previousGame.current;
    previousGame.current = game;
    if (requestedState.current === game) {
      requestedState.current = undefined;
      return;
    }
    request.current++;
    setBusy(false);
    setError("");
    const stage = currentReviewStage(game, journey);
    if (game.phase === "finished" && previous.phase !== "finished")
      beforeCompletion.current = { game: previous, stage: activeStage, origin };
    const index = game.phase === "finished" ? selectedIndex : game.roundIndex;
    setSelectedIndex(index);
    setActiveStage(stage);
    setOrigin("player");
    syncLocation(index, stage);
  }, [game, journey]);

  function changeJourney(id: string) {
    const entry = JOURNEY_INDEX.find((entry) => entry.id === id);
    if (!entry || entry.id === journey.id) return;
    const query = new URLSearchParams({ review: "1" });
    if (date) query.set("date", date);
    onNavigate(`${entry.path}?${query}`);
  }

  const result = game.answers.at(-1);
  const status = completion
    ? "Journey completion"
    : game.phase === "feedback" || game.phase === "failed"
      ? `${answerPoints(result, game.help?.[question.id])}/3 points`
      : activeStage === "hint"
        ? "Hint shown"
        : activeStage === "assist"
          ? "Assist shown"
          : "Unanswered";
  return (
    <section
      className="admin-review-toolbar"
      aria-label="Journey review"
      data-collapsed={collapsed || undefined}
    >
      <header className="review-heading">
        <span className="review-eyebrow">Review</span>
        <button
          type="button"
          className="review-visibility"
          aria-expanded={!collapsed}
          aria-controls="review-controls"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "Show tools" : "Hide tools"}
        </button>
        <h2>{journey.title}</h2>
      </header>
      <div id="review-controls" className="review-controls" hidden={collapsed}>
        {loadError && (
          <p role="alert" className="review-error">
            {loadError}
          </p>
        )}
        <details className="review-journey-switch">
          <summary>Change Journey</summary>
          {source?.navigation ?? (
            <label className="field">
              <span>Journey</span>
              <select
                value={journey.id}
                onChange={(event) => changeJourney(event.target.value)}
              >
                {[...JOURNEY_INDEX]
                  .sort((a, b) => a.title.localeCompare(b.title))
                  .map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </details>
        {source?.catalog}
        <nav aria-label="Review questions" className="review-question-list">
          {journey.rounds.map((q, index) => (
            <button
              key={q.id}
              type="button"
              aria-current={
                !completion && selectedIndex === index ? "step" : undefined
              }
              onClick={() => void open(index, "play")}
            >
              <span className="review-question-number">{index + 1}</span>
              <span>{q.progressLabel ?? q.label}</span>
            </button>
          ))}
        </nav>
        <div className="review-question-controls">
          <div className="review-section-heading">
            <h3>Question {selectedIndex + 1}</h3>
            <button
              type="button"
              className="review-text-action"
              onClick={() =>
                completion
                  ? returnToQuestion()
                  : void open(selectedIndex, "play")
              }
            >
              {completion ? "Back to question" : "Reset"}
            </button>
          </div>
          <fieldset disabled={showPending} className="review-state-group">
            <legend>Before answering</legend>
            <div className="review-state-buttons">
              {(
                [
                  { stage: "play", label: "Question" },
                  ...(question.guidance
                    ? [{ stage: "hint", label: "Hint" }]
                    : []),
                  ...(question.guidance?.assist
                    ? [{ stage: "assist", label: "Assist" }]
                    : []),
                ] as { stage: ReviewStage; label: string }[]
              ).map(({ stage, label }) => (
                <button
                  key={stage}
                  type="button"
                  aria-pressed={activeStage === stage}
                  onClick={() => void open(selectedIndex, stage)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset disabled={showPending} className="review-state-group">
            <legend>After answering</legend>
            <div className="review-state-buttons review-outcome-buttons">
              {outcomes.map(({ stage, label }) => (
                <button
                  key={stage}
                  type="button"
                  aria-pressed={activeStage === stage}
                  onClick={() => void open(selectedIndex, stage)}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <p className="review-preview-status" aria-live="polite">
            {showPending
              ? "Preparing preview…"
              : `${origin === "preview" ? "Preview" : "Player view"} · ${status}`}
          </p>
          {error && (
            <p role="alert" className="review-error">
              {error}
            </p>
          )}
        </div>
        <details className="review-completion" open={completion || undefined}>
          <summary>Journey completion</summary>
          <div className="review-state-buttons">
            <button
              type="button"
              disabled={showPending}
              aria-pressed={activeStage === "completion"}
              onClick={() => void open(selectedIndex, "completion")}
            >
              All correct
            </button>
            <button
              type="button"
              disabled={showPending}
              aria-pressed={activeStage === "completion-mixed"}
              onClick={() => void open(selectedIndex, "completion-mixed")}
            >
              Mixed results
            </button>
          </div>
          <button
            type="button"
            className="review-text-action"
            onClick={() => void open(0, "play")}
          >
            Restart Journey
          </button>
        </details>
      </div>
      <footer className="review-navigation" hidden={collapsed}>
        <button
          type="button"
          className="review-text-action"
          onClick={() =>
            onNavigate(adminJourneyLink(journey.id, "journeys", date))
          }
        >
          ← Journeys
        </button>
        {JOURNEY_INDEX.some((entry) => entry.id === journey.id) && (
          <button
            type="button"
            className="review-text-action"
            onClick={() =>
              onNavigate(adminJourneyLink(journey.id, "schedule", date))
            }
          >
            Schedule Journey →
          </button>
        )}
      </footer>
    </section>
  );
}
