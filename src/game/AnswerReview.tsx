import type { Question, QuestionContext } from "./questionContracts";
import type { GameState } from "./state";
import { answerItems, responseIds } from "./answerPresentation";
import { answerPlace } from "./answerTargets";
import { solutionIds } from "./questionPreparation";
import { EstimateReview } from "./EstimateReview";

/** Keep response/slot identity visible instead of asking a map fill to explain everything. */
export function AnswerReview({
  question: q,
  context,
  game,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
}) {
  const name = (id: string) =>
    (q.mode === "ordered-capitals"
      ? context.capitals.find((c) => c.countryId === id)?.name
      : undefined) ??
    q.choices?.find((c) => c.id === id)?.label ??
    answerPlace(q, id)?.name ??
    context.names.get(id) ??
    id;
  const expected = solutionIds(q, context);
  const ordered = [
    "choice-match",
    "choice-order",
    "ordered-countries",
    "ordered-capitals",
  ].includes(q.mode);
  const picked = responseIds(q, context, game);
  const reviewItems = answerItems(q, context, game);
  if (q.rule.type === "numeric-range") {
    return <EstimateReview question={q} response={game} />;
  }
  if (q.mode === "land-path")
    return (
      <p className="submitted-answer">
        Your route: <strong>{picked.map(name).join(" → ")}</strong>
        <span>
          {" "}
          ·{" "}
          {game.answers.at(-1)?.correct
            ? "Accepted route"
            : "Route does not meet the connection rule"}
        </span>
      </p>
    );
  if (ordered)
    return (
      <ol className="answer-review" aria-label="Your assignments">
        {expected.map((id, index) => {
          const correct = picked[index] === id;
          return (
            <li
              key={q.matchSlots?.[index]?.id ?? index}
              data-result={correct ? "correct" : "incorrect"}
            >
              <span aria-hidden="true">{correct ? "✓" : "×"}</span>
              <div>
                <span>
                  {q.matchSlots?.[index]?.label ??
                    q.orderLabels?.[index] ??
                    `Position ${index + 1}`}
                </span>
                <strong>{name(picked[index]) || "No answer"}</strong>
                {!correct && <span>Correct: {name(id)}</span>}
                {reviewItems.some(
                  (item) => item.slot === index && item.supplied,
                ) && <span>Supplied by assist</span>}
              </div>
              <span className="sr-only">
                {correct ? "Correct assignment" : "Incorrect assignment"}
              </span>
            </li>
          );
        })}
      </ol>
    );
  if (q.mode === "number" || q.mode === "text")
    return !game.answers.at(-1)?.correct ? (
      <p className="submitted-answer">
        Your answer: <strong>{game.text}</strong>
      </p>
    ) : null;
  if (q.mode === "pin" || q.mode === "merged-region-single") return null;
  // The canonical answer is already shown above. Review only the submitted mistake,
  // rather than repeating correct answers and every unused distractor.
  if (game.answers.at(-1)?.correct) return null;
  const submitted =
    q.mode === "typed-regions" ? game.ordered : picked.map(name);
  return submitted.length ? (
    <p className="submitted-answer">
      {submitted.length > 1 ? "Your answers: " : "Your answer: "}
      <strong>{submitted.join(", ")}</strong>
    </p>
  ) : null;
}
