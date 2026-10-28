import { useEffect, useRef, useState } from "react";
import type { Journey, QuestionContext } from "../game/questionContracts";
import { gameReducer, initialGame } from "../game/state";
import type { GameState } from "../game/state";
import { adminJourneyLink } from "./accountNavigation";

export function reviewRound(journey: Journey, index: number): GameState {
  return {
    ...initialGame,
    phase: "playing",
    roundIndex: index,
    ordered: [...(journey.rounds[index].orderInitial ?? [])],
  };
}

export function AdminJourneyReview({
  journey,
  context,
  game,
  onChange,
  onNavigate,
}: {
  journey: Journey;
  context: QuestionContext;
  game: GameState;
  onChange(game: GameState): void;
  onNavigate(url: string): void;
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
    onChange(reviewRound(journey, index));
  };
  const help = (assist: boolean) => {
    let next = gameReducer(
      reviewRound(journey, game.roundIndex),
      { type: "request-hint" },
      journey,
      context,
    );
    if (assist)
      next = gameReducer(next, { type: "request-assist" }, journey, context);
    onChange(next);
    setError("");
  };
  async function sample(kind: "correct" | "missed" | "completion") {
    const id = ++request.current;
    setBusy(true);
    setError("");
    try {
      const { submitSample } = await import("../game/journeyAudit");
      if (id !== request.current) return;
      if (kind === "completion") {
        const answers: GameState["answers"] = [];
        let result: GameState | undefined;
        for (const [index, question] of journey.rounds.entries()) {
          result = submitSample(journey, question, context, index, true);
          if (!result)
            throw Error(
              "A sample completion isn’t available for this Journey. Play through the review instead.",
            );
          answers.push(...result.answers);
        }
        onChange({ ...result!, answers, phase: "finished" });
      } else {
        const result = submitSample(
          journey,
          journey.rounds[game.roundIndex],
          context,
          game.roundIndex,
          kind === "correct",
        );
        if (!result)
          throw Error(
            "An example answer isn’t available for this state. Try your own answer in the review.",
          );
        onChange(result);
      }
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
      <div className="admin-library-actions">
        <button
          type="button"
          className="quiet-button"
          onClick={() => onNavigate(adminJourneyLink(journey.id))}
        >
          ← Journey library
        </button>
        <button
          type="button"
          className="quiet-button"
          onClick={() => onNavigate(adminJourneyLink(journey.id, "schedule"))}
        >
          Schedule this Journey
        </button>
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
      <div className="admin-library-actions">
        <button
          type="button"
          className="quiet-button"
          onClick={() => reset(game.roundIndex)}
        >
          Restart question
        </button>
        <button type="button" className="quiet-button" onClick={() => reset(0)}>
          Restart Journey
        </button>
      </div>
      <details>
        <summary>Inspect help and sample reveals</summary>
        <p className="muted">
          Sample reveals use example answers. You can also answer normally to
          inspect a particular mistake.
        </p>
        <div className="admin-review-states">
          <button
            type="button"
            className="quiet-button"
            disabled={busy}
            onClick={() => help(false)}
          >
            Show hint
          </button>
          <button
            type="button"
            className="quiet-button"
            disabled={busy}
            onClick={() => help(true)}
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
        </div>
      </details>
      {busy && <p role="status">Preparing example answers…</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
