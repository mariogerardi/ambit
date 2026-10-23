import { useEffect, type ReactNode } from "react";
import type { Question, QuestionContext } from "./questionContracts";
import type { GameState, Action } from "./state";
import { recalledIds, recallMistakes, recallCeiling } from "./countryRecall";
import { pointCeiling } from "./points";
import { QuestionActions } from "./QuestionActions";

export function CountryRecallAnswer({
  question: q,
  context,
  game,
  dispatch,
  mapKey,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch(a: Action): void;
  mapKey?: ReactNode;
}) {
  const found = recalledIds(game.recall),
    errors = recallMistakes(game.recall);
  useEffect(() => {
    if (game.recall?.ended || found.length === q.count)
      dispatch({ type: "submit" });
  }, [game.recall?.ended, found.length, q.count, dispatch]);
  const maximum = Math.min(
    recallCeiling(game.recall),
    pointCeiling(game.help?.[q.id]),
  );
  const guidance = q.guidance
    ? {
        content: q.guidance,
        stage: game.help?.[q.id],
        onHint: () => dispatch({ type: "request-hint" }),
        onAssist: () => dispatch({ type: "request-assist" }),
      }
    : undefined;
  return (
    <div className="country-recall-answer">
      <div className="recall-status" role="status">
        <span>
          <strong>
            {found.length} / {q.count}
          </strong>{" "}
          found
        </span>
        <span>
          <strong>{errors.length} / 3</strong> incorrect
        </span>
        <span>
          <strong>{maximum} / 3</strong> max points
        </span>
      </div>
      {found.length > 0 && (
        <ul className="recall-chips" aria-label="Countries found">
          {found.map((id) => (
            <li key={id}>
              {context.names.get(id)}
              {game.recall?.assistedId === id ? " · supplied by assist" : ""}
            </li>
          ))}
        </ul>
      )}
      <form
        className="answer-form"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          dispatch({ type: "recall-country" });
        }}
      >
        <label htmlFor={`recall-${q.id}`}>{q.inputLabel}</label>
        <div className="answer-input-row">
          <input
            id={`recall-${q.id}`}
            type="text"
            maxLength={160}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={game.text}
            onChange={(e) => dispatch({ type: "text", value: e.target.value })}
          />
          <button
            type="submit"
            className="primary-button"
            disabled={!game.text.trim()}
          >
            Add country
          </button>
        </div>
      </form>
      {game.inputError && (
        <p role="status" className="input-error">
          {game.inputError}
        </p>
      )}
      {errors.length > 0 && (
        <p className="submitted-answer">
          Incorrect entries:{" "}
          {errors.map((id) => context.names.get(id)).join(", ")}
        </p>
      )}
      <QuestionActions
        guidance={guidance}
        mapKey={mapKey}
        pointScoring
        label="Finish"
        onSubmit={() => dispatch({ type: "submit" })}
      />
    </div>
  );
}
