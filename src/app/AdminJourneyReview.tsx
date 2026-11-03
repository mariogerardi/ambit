import { useEffect, useRef, useState } from "react";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { GameState } from "../game/state";
import { adminJourneyLink } from "./accountNavigation";
import {
  captureReview,
  restoreReview,
  reviewRound,
  reviewState,
} from "./journeyReview";
import type { JourneyReviewSource, ReviewStage } from "./journeyReview";
export { reviewRound } from "./journeyReview";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
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
  return (
    <section className="admin-review-toolbar" aria-label="Journey review">
      <div className="admin-review-heading">
        <strong>Journey review</strong>
        <span>Review progress isn’t saved.</span>
      </div>
      <label className="field">
        <span>Review question</span>
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
      <details className="admin-review-tools">
        <summary>Review controls</summary>
        <div className="admin-review-control-panel">
          <div className="admin-library-actions">
            {source ? (
              source.navigation
            ) : (
              <>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() =>
                    onNavigate(adminJourneyLink(journey.id, "journeys", date))
                  }
                >
                  ← Journey library
                </button>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() =>
                    onNavigate(adminJourneyLink(journey.id, "schedule", date))
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
          <fieldset className="admin-review-group">
            <legend>Preview an answer</legend>
            <div className="admin-review-states">
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => void sample("hint")}
              >
                Show hint
              </button>
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => void sample("assist")}
              >
                Show assist
              </button>
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => void sample("correct")}
              >
                Show correct reveal
              </button>
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => void sample("missed")}
              >
                Show missed reveal
              </button>
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => void sample("completion")}
              >
                Show sample completion
              </button>
              <button
                type="button"
                className="quiet-button"
                disabled={busy}
                onClick={() => void sample("completion-mixed")}
              >
                Show mixed completion
              </button>
            </div>
          </fieldset>
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
      {busy && <p role="status">Preparing example answers…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
