import {
  reviewQuestionCopy,
  supportsPartialPreview,
} from "../game/authoringReview";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { GameState } from "../game/state";
import { adminJourneyLink } from "./accountNavigation";
import {
  captureReview,
  REVIEW_STAGES,
  restoreReview,
  reviewRound,
  reviewState,
} from "./journeyReview";
import type { JourneyReviewSource, ReviewStage } from "./journeyReview";
export { reviewRound } from "./journeyReview";

const reviewStageLabels: Record<ReviewStage, string> = {
  play: "Question",
  hint: "Hint",
  assist: "Assist",
  correct: "Correct reveal",
  missed: "Missed reveal",
  partial: "Partial outcome",
  completion: "Sample completion",
  "completion-mixed": "Mixed completion",
};

function isReviewStage(value: string): value is ReviewStage {
  return REVIEW_STAGES.some((stage) => stage === value);
}

export function AdminJourneyReview({
  journey,
  context,
  game,
  onChange,
  onNavigate,
  date,
  source,
}: {
  journey: Journey;
  context: QuestionContext;
  game: GameState;
  onChange(game: GameState): void;
  onNavigate(url: string): void;
  date?: string;
  source?: JourneyReviewSource;
}) {
  const question = journey.rounds[game.roundIndex];
  const editorial = useMemo(
    () => reviewQuestionCopy(question, context),
    [question, context],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [activeStage, setActiveStage] = useState<ReviewStage>(
    source?.stage ?? "play",
  );
  const request = useRef(0);
  useEffect(() => {
    setInspecting(false);
    setActiveStage(source?.stage ?? "play");
  }, [journey.id]);
  useEffect(
    () => () => {
      request.current++;
    },
    [journey.id],
  );
  const reset = (index: number) => {
    request.current++;
    setBusy(false);
    setError("");
    setActiveStage("play");
    onChange(reviewRound(journey, index, source?.seed));
    source?.onInspect?.(index, "play");
  };
  async function sample(kind: ReviewStage, index = game.roundIndex) {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const result = await reviewState(
        journey,
        context,
        index,
        kind,
        source?.seed,
      );
      if (id !== request.current) return;
      onChange(result);
      setActiveStage(kind);
      source?.onInspect?.(index, kind);
    } catch (failure) {
      if (id === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Couldn’t open this review state.",
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  }
  const isCompletion =
    activeStage === "completion" || activeStage === "completion-mixed";
  const activeQuestion = isCompletion
    ? "Journey completion"
    : `${game.roundIndex + 1} of ${journey.rounds.length} · ${question.progressLabel ?? question.label}`;
  return (
    <section
      className="admin-review-toolbar"
      aria-label="Journey review"
      data-mode={inspecting ? "inspect" : "playtest"}
    >
      <div className="admin-review-heading">
        <div>
          <strong>{inspecting ? "Inspect" : "Playtest"}</strong>
          <span>
            {activeQuestion} · {reviewStageLabels[activeStage]}
          </span>
        </div>
        <button
          type="button"
          className="quiet-button admin-review-mode-toggle"
          aria-expanded={inspecting}
          onClick={() => setInspecting((value) => !value)}
        >
          {inspecting ? "Return to playtest" : "Inspect"}
        </button>
      </div>
      {source?.navigation}
      {inspecting && (
        <>
          <div className="admin-review-selectors">
            <label className="field">
              <span>Question</span>
              <select
                value={game.roundIndex}
                onChange={(event) => reset(Number(event.target.value))}
              >
                {journey.rounds.map((question, index) => (
                  <option key={question.id} value={index}>
                    {index + 1}. {question.progressLabel ?? question.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Preview state</span>
              <select
                value={activeStage}
                disabled={busy}
                onChange={(event) => {
                  const stage = event.target.value;
                  if (!isReviewStage(stage)) return;
                  if (stage === "play") reset(game.roundIndex);
                  else void sample(stage);
                }}
              >
                <option value="play">Question</option>
                {question.guidance && <option value="hint">Hint</option>}
                {question.guidance?.assist && (
                  <option value="assist">Assist</option>
                )}
                <option value="correct">Correct reveal</option>
                <option value="missed">Missed reveal</option>
                {supportsPartialPreview(question) && (
                  <option value="partial">Partial / lower tier</option>
                )}
                <option value="completion">Sample completion</option>
                <option value="completion-mixed">Mixed completion</option>
              </select>
            </label>
          </div>
          <details className="admin-review-editorial">
            <summary>Question copy and notes</summary>
            <p>What does the player learn after identifying the answer?</p>
            <div className="admin-review-copy-pair">
              <section aria-label="Before answering">
                <strong>Before answering</strong>
                {editorial.before.expression && (
                  <p>{editorial.before.expression}</p>
                )}
                {editorial.before.leadIn && <p>{editorial.before.leadIn}</p>}
                <p>{editorial.before.prompt}</p>
                {editorial.before.instruction && (
                  <p>{editorial.before.instruction}</p>
                )}
              </section>
              <section aria-label="After answering">
                <strong>After answering</strong>
                <p>
                  {editorial.after.heading} · {editorial.after.answer}
                </p>
                <p>{editorial.after.explanation}</p>
              </section>
            </div>
            {editorial.warnings.length > 0 && (
              <ul aria-label="Editorial notes">
                {editorial.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
          </details>
          <details className="admin-review-tools">
            <summary>Advanced review tools</summary>
            <div className="admin-review-control-panel">
              <div className="admin-library-actions">
                {!source && (
                  <>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() =>
                        onNavigate(
                          adminJourneyLink(journey.id, "journeys", date),
                        )
                      }
                    >
                      ← Journey library
                    </button>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() =>
                        onNavigate(
                          adminJourneyLink(journey.id, "schedule", date),
                        )
                      }
                    >
                      Schedule this Journey
                    </button>
                  </>
                )}
              </div>
              <div className="admin-library-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => reset(game.roundIndex)}
                >
                  Restart question
                </button>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => reset(0)}
                >
                  Restart Journey
                </button>
              </div>
              <details className="admin-review-captures">
                <summary>Capture and restore</summary>
                <div className="admin-review-states">
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob([captureReview(journey, game)], {
                          type: "application/json",
                        }),
                      );
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${journey.id}-review.json`;
                      link.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    Capture current state
                  </button>
                  <label className="field">
                    Restore captured state
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const id = ++request.current;
                        setBusy(true);
                        try {
                          const restored = restoreReview(
                            journey,
                            await file.text(),
                          );
                          if (id === request.current) {
                            onChange(restored);
                            setError("");
                          }
                        } catch (failure) {
                          if (id === request.current)
                            setError(
                              failure instanceof Error
                                ? failure.message
                                : "Couldn’t restore this capture.",
                            );
                        } finally {
                          if (id === request.current) setBusy(false);
                        }
                      }}
                    />
                  </label>
                </div>
              </details>
            </div>
          </details>
        </>
      )}
      {busy && <p role="status">Preparing example answers…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
