import { answerPlace } from "./answerTargets";
import type { Dispatch } from "react";
import type { Action, GameState } from "./state";
import type { Question, QuestionContext } from "./questions";
import { canSubmit, responseCount, selectableIds } from "./questions";
import { AnswerInput } from "./AnswerInput";
import { AnswerCounter } from "./AnswerCounter";

export function AnswerForm({
  question,
  context,
  game,
  dispatch,
  webgl,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch: Dispatch<Action>;
  webgl: boolean;
}) {
  const city = question.mode.startsWith("city-");
  const single =
    question.mode === "map-single" || question.mode === "city-single";
  const regional = question.rule.type === "region-ids";
  const count = responseCount(question, context);
  const unordered = question.mode === "typed-regions";
  const AnswerList = unordered ? "ul" : "ol";
  const name = (id: string) =>
    question.choices?.find((c) => c.id === id)?.label ??
    answerPlace(question, id)?.name ??
    context.names.get(id) ??
    context.choiceNames.get(id) ??
    id;
  if (question.mode === "pin")
    return (
      <div className="pin-answer">
        {game.pin && (
          <p className="commit-note" aria-live="polite">
            Pin placed. Tap another spot to move it.
          </p>
        )}
        <div className="pin-answer-actions">
          <button
            className="primary-button"
            disabled={!canSubmit(question, context, game)}
            onClick={() => dispatch({ type: "submit" })}
          >
            Submit pin <span>→</span>
          </button>
          {game.pin && (
            <button
              className="quiet-button tertiary-action"
              onClick={() => dispatch({ type: "clear" })}
            >
              Remove pin
            </button>
          )}
        </div>
        <details className="typed-country-guess" open={!webgl || undefined}>
          <summary>Enter coordinates</summary>
          <form
            autoComplete="off"
            key={question.id}
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const lat = String(data.get("lat") ?? ""),
                lng = String(data.get("lng") ?? "");
              if (lat.trim() && lng.trim())
                dispatch({
                  type: "drop-pin",
                  lat: Number(lat),
                  lng: Number(lng),
                });
            }}
          >
            <label htmlFor="pin-latitude">Latitude</label>
            <input
              id="pin-latitude"
              name="lat"
              type="number"
              inputMode="text"
              enterKeyHint="next"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  document.getElementById("pin-longitude")?.focus();
                }
              }}
              min={-90}
              max={90}
              step="any"
              required
              placeholder="−90 to 90"
            />
            <label htmlFor="pin-longitude">Longitude</label>
            <input
              id="pin-longitude"
              name="lng"
              type="number"
              inputMode="text"
              enterKeyHint="done"
              min={-180}
              max={180}
              step="any"
              required
              placeholder="−180 to 180"
            />
            <button className="primary-button">
              Place pin <span>→</span>
            </button>
          </form>
        </details>
      </div>
    );
  if (question.mode === "choice-single" || question.mode === "choice-multiple")
    return (
      <div className="choice-answer">
        {question.commitment === "immediate" && (
          <p className="commit-note">Your first answer is final.</p>
        )}
        <div className="candidate-grid" aria-label="Answer choices">
          {(question.choices ?? []).map((choice) => (
            <button
              key={choice.id}
              className={game.selectedIds.includes(choice.id) ? "chosen" : ""}
              aria-pressed={game.selectedIds.includes(choice.id)}
              onClick={() => dispatch({ type: "select", id: choice.id })}
            >
              <span>{choice.label}</span>
              <i>{game.selectedIds.includes(choice.id) ? "✓" : "·"}</i>
            </button>
          ))}
        </div>
        {question.commitment === "submit" && (
          <button
            className="primary-button"
            disabled={!canSubmit(question, context, game)}
            onClick={() => dispatch({ type: "submit" })}
          >
            Submit answer <span>→</span>
          </button>
        )}
      </div>
    );
  if (
    city ||
    question.mode === "map-single" ||
    question.mode === "map-multiple" ||
    question.mode === "land-path"
  )
    return (
      <>
        {question.disclosure.namedChoices && (!city || !webgl) && (
          <div className="candidate-grid" aria-label="Choose an answer">
            {selectableIds(question, context).map((id) => (
              <button
                key={id}
                onClick={() => dispatch({ type: "select", id })}
                aria-label={`${name(id)} — ${question.commitment === "immediate" ? "answer now" : "select answer"}`}
                aria-pressed={
                  question.commitment === "submit"
                    ? game.selectedIds.includes(id)
                    : undefined
                }
              >
                <span>{name(id)}</span>
                <i>{game.selectedIds.includes(id) ? "✓" : "→"}</i>
              </button>
            ))}
          </div>
        )}
        {!single && (
          <div className="committed-choices" aria-live="polite">
            <p>
              {game.selectedIds.length} of {count}{" "}
              {question.commitment === "immediate" ? "found" : "chosen"}
            </p>
            <ol>
              {Array.from({ length: count }, (_, i) => (
                <li key={i}>
                  <span>{i + 1}</span>
                  {game.selectedIds[i]
                    ? question.disclosure.committedNames
                      ? name(game.selectedIds[i])
                      : question.commitment === "immediate"
                        ? "Answer final"
                        : "Selected"
                    : city
                      ? "Your next city"
                      : regional
                        ? "Your next region"
                        : "Your next country"}
                  <i>
                    {game.selectedIds[i] && question.commitment === "immediate"
                      ? "✓"
                      : "·"}
                  </i>
                </li>
              ))}
            </ol>
          </div>
        )}
        {question.commitment === "immediate" ? (
          <p className="commit-note">
            {question.failure === "end-game"
              ? "Each answer is final; one wrong answer ends this Journey."
              : count > 1
                ? "Each answer is final."
                : "Your first answer is final."}
          </p>
        ) : (
          <button
            className="primary-button"
            disabled={!canSubmit(question, context, game)}
            onClick={() => dispatch({ type: "submit" })}
          >
            Submit answer <span>→</span>
          </button>
        )}
        {!question.disclosure.namedChoices &&
          (!city || question.allowTyping === true || !webgl) && (
            <details className="typed-country-guess" open={!webgl || undefined}>
              <summary>Answer by typing</summary>
              <form
                autoComplete="off"
                onSubmit={(event) => {
                  event.preventDefault();
                  dispatch({ type: "guess-country" });
                }}
              >
                <label htmlFor="country-guess">
                  {city
                    ? "City name"
                    : regional
                      ? "Region name"
                      : "Country name"}
                </label>
                <AnswerInput
                  id="country-guess"
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  value={game.text}
                  onChange={(event) =>
                    dispatch({ type: "text", value: event.target.value })
                  }
                  placeholder={
                    city
                      ? "Type a city’s name"
                      : regional
                        ? "Type a region’s name"
                        : "Type a country’s name"
                  }
                />
                <button className="primary-button" disabled={!game.text.trim()}>
                  {question.commitment === "immediate"
                    ? "Answer now"
                    : `Add ${city ? "city" : regional ? "region" : "country"}`}{" "}
                  <span>→</span>
                </button>
              </form>
            </details>
          )}
        {question.commitment === "submit" && game.selectedIds.length > 0 && (
          <button
            className="quiet-button tertiary-action"
            onClick={() => dispatch({ type: "clear" })}
          >
            Clear selection
          </button>
        )}
        {game.inputError && (
          <p className="input-error" role="alert">
            {game.inputError}
          </p>
        )}
      </>
    );
  return (
    <form
      autoComplete="off"
      className="answer-form"
      onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: "submit" });
      }}
    >
      {question.mode === "typed-regions" ||
      question.mode === "ordered-countries" ||
      question.mode === "ordered-capitals" ? (
        <AnswerList
          className={`ordered-answer${unordered ? " unordered-answer" : ""}`}
          aria-label={
            question.mode === "typed-regions"
              ? `${question.inputLabel ?? "Region"} names`
              : question.mode === "ordered-capitals"
                ? "Capitals along the route"
                : "Countries along the route"
          }
        >
          {Array.from({ length: count }, (_, i) => (
            <li key={i}>
              {!unordered && <span>{i + 1}</span>}
              <div>
                <label
                  className={unordered ? "sr-only" : undefined}
                  htmlFor={`route-country-${i}`}
                >
                  {question.mode === "typed-regions"
                    ? `${question.inputLabel ?? "Region"} ${i + 1}`
                    : question.rule.type === "capital-order"
                      ? context.names.get(question.rule.countryIds[i])
                      : i === 0
                        ? question.mode === "ordered-capitals"
                          ? "Starting capital"
                          : "Starting country"
                        : i === count - 1
                          ? question.mode === "ordered-capitals"
                            ? "Ending capital"
                            : "Ending country"
                          : `${question.mode === "ordered-capitals" ? "Capital" : "Country"} ${i + 1}`}
                </label>
                <AnswerInput
                  id={`route-country-${i}`}
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint={i === count - 1 ? "done" : "next"}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.nativeEvent.isComposing &&
                      i < count - 1
                    ) {
                      event.preventDefault();
                      document
                        .getElementById(`route-country-${i + 1}`)
                        ?.focus();
                    }
                  }}
                  placeholder="Your answer"
                  value={game.ordered[i] ?? ""}
                  onChange={(event) =>
                    dispatch({
                      type: "ordered",
                      index: i,
                      value: event.target.value,
                    })
                  }
                />
              </div>
            </li>
          ))}
        </AnswerList>
      ) : (
        <>
          <label htmlFor="written-answer">
            {question.inputLabel ?? "Your answer"}
          </label>
          {question.mode === "number" ? (
            <AnswerCounter
              value={game.text}
              onChange={(value) => dispatch({ type: "text", value })}
            />
          ) : (
            <AnswerInput
              id="written-answer"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              placeholder="Your answer"
              value={game.text}
              onChange={(event) =>
                dispatch({ type: "text", value: event.target.value })
              }
            />
          )}
        </>
      )}
      <button
        className="primary-button"
        disabled={!canSubmit(question, context, game)}
      >
        Submit answer <span>→</span>
      </button>
    </form>
  );
}
