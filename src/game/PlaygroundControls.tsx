import { useState } from "react";
import type { Dispatch } from "react";
import type { Action } from "./state";
import type { AnswerMode, Journey } from "./questions";
import { ANSWER_TYPES, RULE_TYPES } from "./questionTypes";

export function PlaygroundControls({
  journey,
  index,
  dispatch,
}: {
  journey: Journey;
  index: number;
  dispatch: Dispatch<Action>;
}) {
  const [filter, setFilter] = useState<AnswerMode | "all">("all");
  const round = journey.rounds[index];
  const visibleFilter = filter;
  const indices = journey.rounds.flatMap((q, i) =>
    filter === "all" || q.mode === filter ? [i] : [],
  );
  const position = indices.indexOf(index);
  return (
    <nav className="playground-toolbar" aria-label="Question playground">
      <label>
        Answer type
        <select
          value={visibleFilter}
          onChange={(event) => {
            const mode = event.target.value as AnswerMode | "all";
            setFilter(mode);
            if (mode !== "all")
              dispatch({
                type: "jump",
                index: journey.rounds.findIndex((q) => q.mode === mode),
              });
          }}
        >
          <option value="all">All answer types</option>
          {Object.entries(ANSWER_TYPES).map(([mode, label]) => (
            <option key={mode} value={mode}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Question example
        <select
          value={index}
          onChange={(event) =>
            dispatch({ type: "jump", index: Number(event.target.value) })
          }
        >
          {journey.rounds.map((q, i) =>
            visibleFilter === "all" || q.mode === visibleFilter ? (
              <option key={q.id} value={i}>
                {String(i + 1).padStart(2, "0")} · {q.title}
              </option>
            ) : null,
          )}
        </select>
      </label>
      <div className="playground-navigation">
        <button
          aria-label="Previous example"
          disabled={position <= 0}
          onClick={() =>
            dispatch({ type: "jump", index: indices[position - 1] })
          }
        >
          ←
        </button>
        <button onClick={() => dispatch({ type: "jump", index })}>Retry</button>
        <button
          aria-label="Next example"
          disabled={position < 0 || position === indices.length - 1}
          onClick={() =>
            dispatch({ type: "jump", index: indices[position + 1] })
          }
        >
          →
        </button>
      </div>
      <details className="question-type-details">
        <summary>About this type</summary>
        <div>
          <strong>{ANSWER_TYPES[round.mode]}</strong>
          <p>
            {RULE_TYPES[round.rule.type]} · {round.topic}
          </p>
          <p>
            {round.commitment === "immediate"
              ? "A pick commits immediately."
              : "Selections stay editable until submitted."}{" "}
            {round.failure === "end-game"
              ? "A wrong answer ends the path."
              : "A wrong answer leads to feedback."}
          </p>
          <p>
            {round.map?.borders === false
              ? "Borders hidden. "
              : "Borders visible. "}
            {round.disclosure.hoverNames
              ? "Hover names visible."
              : round.disclosure.committedNames
                ? "Names appear only after committing a pick."
                : "Hover names hidden."}
          </p>
          <small>
            {journey.rounds.length} examples ·{" "}
            {Object.keys(ANSWER_TYPES).length} answer types. Jumping starts a
            fresh attempt.
          </small>
        </div>
      </details>
    </nav>
  );
}
