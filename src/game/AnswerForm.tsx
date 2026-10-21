import { ConstructionAnswer } from "./ConstructionAnswer";
import { answerItems } from "./answerPresentation";
import { mechanicFor } from "./mechanics";
import { pointAnswerNoun, answerPlace } from "./answerTargets";
import type { Dispatch, ReactNode } from "react";
import { useMemo } from "react";
import type { Action, GameState } from "./state";
import type { Question, QuestionContext } from "./questionContracts";
import { canSubmit } from "./questionEvaluation";
import { responseCount, selectableIds } from "./questionPreparation";
import { AnswerInput } from "./AnswerInput";
import { AnswerCounter } from "./AnswerCounter";
import { EstimateSlider } from "./EstimateSlider";
import { StationBearings } from "./StationBearings";
import { CompassAnswer, CompassEntry } from "./CompassAnswer";
import { QuestionActions } from "./QuestionActions";
import {
  candidateAvailable,
  lockedSelectionIds,
  withAssistanceLocks,
} from "./guidance";
import { OrderAnswer } from "./OrderAnswer";
import { isSlotAnswer } from "./ordering";
import { QuestionSupport } from "./QuestionSupport";

type AnswerFormProps = {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch: Dispatch<Action>;
  webgl: boolean;
  mapKey?: ReactNode;
};
export function AnswerForm(props: AnswerFormProps) {
  return (
    <>
      <QuestionSupport question={props.question} webgl={props.webgl} />
      <AnswerControls {...props} />
    </>
  );
}

function AnswerControls({
  question,
  context,
  game,
  dispatch,
  webgl,
  mapKey,
}: AnswerFormProps) {
  const choices = useMemo(() => {
    const cards = [...(question.choices ?? [])];
    if (question.shuffleChoices)
      for (let index = cards.length - 1; index > 0; index--) {
        const other = Math.floor(Math.random() * (index + 1));
        [cards[index], cards[other]] = [cards[other], cards[index]];
      }
    return cards;
  }, [question.choices, question.shuffleChoices]);
  game = withAssistanceLocks(question, game);
  const locked = lockedSelectionIds(question, game);
  const items = answerItems(question, context, game);
  const definition = mechanicFor(question);
  if (definition.control === "construction")
    return (
      <ConstructionAnswer
        key={question.id}
        question={question}
        context={context}
        game={game}
        dispatch={dispatch}
        webgl={webgl}
        mapKey={mapKey}
      />
    );
  if (isSlotAnswer(question))
    return (
      <OrderAnswer
        key={question.id}
        question={question}
        context={context}
        game={game}
        dispatch={dispatch}
        mapKey={mapKey}
      />
    );
  const assistCandidates = question.guidance?.assist?.candidateIds;
  const guidance = question.guidance
    ? {
        content: question.guidance,
        stage: game.help?.[question.id],
        preservedSelection:
          !!assistCandidates &&
          game.selectedIds.some((id) => !assistCandidates.includes(id)),
        onHint: () => dispatch({ type: "request-hint" }),
        onAssist: () => dispatch({ type: "request-assist" }),
      }
    : undefined;
  const city = definition.mapSelection === "places";
  const pointNoun = pointAnswerNoun(question);
  const single = definition.single;
  const regional = question.rule.type === "region-ids";
  const count = responseCount(question, context);
  const canType =
    question.mode !== "merged-region-single" &&
    !question.disclosure.namedChoices &&
    ((!city && question.allowTyping !== false) ||
      question.allowTyping === true ||
      !webgl);
  const canClear =
    question.commitment === "submit" && game.selectedIds.length > 0;
  const unordered = question.mode === "typed-regions";
  const AnswerList = unordered ? "ul" : "ol";
  const name = (id: string) =>
    question.choices?.find((c) => c.id === id)?.label ??
    answerPlace(question, id)?.name ??
    context.names.get(id) ??
    context.choiceNames.get(id) ??
    id;
  if (definition.control === "compass")
    return (
      <form
        className="answer-form compass-answer-form"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch({ type: "submit" });
        }}
      >
        <CompassAnswer
          question={question}
          response={game}
          onChange={(value) => dispatch({ type: "text", value })}
        />
        <QuestionActions
          mapKey={mapKey}
          pointScoring
          guidance={guidance}
          label="Set bearing"
          submitType="submit"
          disabled={!canSubmit(question, context, game)}
        />
        <CompassEntry
          response={game}
          onChange={(value) => dispatch({ type: "text", value })}
        />
      </form>
    );
  if (definition.control === "pin" && !webgl)
    return (
      <p className="pin-unavailable" role="status">
        This Journey needs the 3D globe to place a pin. Try a browser or device
        with WebGL support.
      </p>
    );
  if (definition.control === "pin")
    return (
      <div className="pin-answer">
        <StationBearings question={question} />
        <span className="sr-only" role="status">
          {game.pin ? "Pin placed." : ""}
        </span>
        <div className="pin-answer-actions">
          <QuestionActions
            mapKey={mapKey}
            pointScoring
            guidance={guidance}
            label="Submit pin"
            disabled={!canSubmit(question, context, game)}
            onSubmit={() => dispatch({ type: "submit" })}
          />
          {game.pin && (
            <button
              className="quiet-button tertiary-action"
              data-dd-action-name="Answer Remove Pin"
              onClick={() => dispatch({ type: "clear" })}
            >
              Remove pin
            </button>
          )}
        </div>
      </div>
    );
  if (definition.control === "choice")
    return (
      <div className="choice-answer">
        <div className="candidate-grid" aria-label="Answer choices">
          {choices.map((choice) => (
            <button
              key={choice.id}
              data-dd-action-name="Answer Select Choice"
              className={game.selectedIds.includes(choice.id) ? "chosen" : ""}
              aria-pressed={game.selectedIds.includes(choice.id)}
              disabled={!candidateAvailable(question, game, choice.id)}
              onClick={() => dispatch({ type: "select", id: choice.id })}
            >
              <span>
                {choice.label}
                {items.some(
                  (item) =>
                    item.id === choice.id && item.selected && item.eliminated,
                ) && (
                  <small className="assist-conflict">
                    Removed by assist · select again to remove
                  </small>
                )}
              </span>
              <i>{game.selectedIds.includes(choice.id) ? "✓" : "·"}</i>
            </button>
          ))}
        </div>
        <QuestionActions
          mapKey={mapKey}
          pointScoring
          guidance={guidance}
          showSubmit={question.commitment === "submit"}
          disabled={!canSubmit(question, context, game)}
          onSubmit={() => dispatch({ type: "submit" })}
        />
      </div>
    );
  if (definition.control === "map")
    return (
      <>
        {question.disclosure.namedChoices && (!city || !webgl) && (
          <div className="candidate-grid" aria-label="Choose an answer">
            {selectableIds(question, context).map((id) => (
              <button
                key={id}
                data-dd-action-name="Answer Select Map Choice"
                className={game.selectedIds.includes(id) ? "chosen" : ""}
                onClick={() => dispatch({ type: "select", id })}
                disabled={!candidateAvailable(question, game, id)}
                aria-label={`${name(id)} — ${question.commitment === "immediate" ? "answer now" : "select answer"}`}
                aria-pressed={
                  question.commitment === "submit"
                    ? game.selectedIds.includes(id)
                    : undefined
                }
              >
                <span>
                  {name(id)}
                  {items.some(
                    (item) =>
                      item.id === id && item.selected && item.eliminated,
                  ) && (
                    <small className="assist-conflict">
                      Removed by assist · select again to remove
                    </small>
                  )}
                </span>
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
              {Array.from(
                { length: Math.max(count, game.selectedIds.length) },
                (_, i) => (
                  <li key={i}>
                    <span>{i + 1}</span>
                    {game.selectedIds[i]
                      ? question.disclosure.committedNames
                        ? name(game.selectedIds[i])
                        : question.commitment === "immediate"
                          ? "Answer final"
                          : "Selected"
                      : city
                        ? `Your next ${pointNoun}`
                        : regional
                          ? "Your next region"
                          : "Your next country"}
                    <i>
                      {locked.includes(game.selectedIds[i])
                        ? "Locked"
                        : game.selectedIds[i] &&
                            question.commitment === "immediate"
                          ? "✓"
                          : "·"}
                    </i>
                  </li>
                ),
              )}
            </ol>
          </div>
        )}
        {question.commitment !== "immediate" && (
          <QuestionActions
            mapKey={mapKey}
            pointScoring
            guidance={guidance}
            disabled={!canSubmit(question, context, game)}
            onSubmit={() => dispatch({ type: "submit" })}
          />
        )}
        {question.commitment === "immediate" && (
          <QuestionActions
            mapKey={mapKey}
            pointScoring
            guidance={guidance}
            showSubmit={false}
          />
        )}
        {(canType || canClear) && (
          <div className="answer-secondary-actions">
            {canType && (
              <details
                className="typed-country-guess"
                open={!webgl || undefined}
              >
                <summary
                  className="tertiary-action"
                  data-dd-action-name="Answer Type Instead"
                >
                  <span className="typing-disclosure-icon" aria-hidden="true">
                    ▸
                  </span>
                  Answer by typing
                </summary>
                <form
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault();
                    dispatch({ type: "guess-country" });
                  }}
                >
                  <label htmlFor="country-guess">
                    {city
                      ? `${pointNoun === "summit" ? "Summit" : "City"} name`
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
                        ? `Type a ${pointNoun}’s name`
                        : regional
                          ? "Type a region’s name"
                          : "Type a country’s name"
                    }
                  />
                  <button
                    className="primary-button"
                    data-dd-action-name="Answer Add Typed Choice"
                    disabled={!game.text.trim()}
                  >
                    {question.commitment === "immediate"
                      ? "Answer now"
                      : `Add ${city ? pointNoun : regional ? "region" : "country"}`}{" "}
                    <span>→</span>
                  </button>
                </form>
              </details>
            )}
            {canClear && (
              <button
                className="quiet-button tertiary-action answer-clear-selection"
                data-dd-action-name="Answer Clear Selection"
                onClick={() => dispatch({ type: "clear" })}
              >
                Clear selection
              </button>
            )}
          </div>
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
      {definition.control === "text-list" ? (
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
          <label
            htmlFor="written-answer"
            className={definition.control === "slider" ? "sr-only" : undefined}
          >
            {question.inputLabel ?? "Your answer"}
          </label>
          {definition.control === "slider" &&
          question.rule.type === "numeric-range" ? (
            <EstimateSlider
              rule={question.rule}
              value={game.text}
              onChange={(value) => dispatch({ type: "text", value })}
            />
          ) : question.mode === "number" ? (
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
      <QuestionActions
        mapKey={mapKey}
        pointScoring
        guidance={guidance}
        submitType="submit"
        disabled={!canSubmit(question, context, game)}
      />
    </form>
  );
}
