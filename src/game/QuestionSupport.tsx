import type { Question } from "./questionContracts";
import { mechanicFor } from "./mechanics";

function accuracy(question: Question) {
  const rule = question.rule;
  if (rule.type === "pin-distance")
    return {
      unit: "km",
      limit: rule.radiusKm,
      bands: rule.tiers?.map((tier) => tier.radiusKm) ?? [],
    };
  if (rule.type === "numeric-range")
    return {
      unit: rule.unit,
      limit: rule.tolerance,
      bands: rule.tiers?.map((tier) => tier.tolerance) ?? [],
    };
  return undefined;
}
const distance = (value: number, unit: string) =>
  `${value.toLocaleString("en-US")} ${unit}`;

/** One owner for authored exceptions, control guidance and commitment copy. */
export function QuestionSupport({
  question,
  webgl = true,
}: {
  question: Question;
  webgl?: boolean;
}) {
  const control = mechanicFor(question).control;
  if (control === "pin" && !webgl) return null;
  const precision = accuracy(question);
  const parts = [question.instruction];
  if (precision)
    parts.push(
      precision.bands.length
        ? `Aim for the bullseye (within ${distance(precision.bands[0], precision.unit)})!`
        : `Aim within ${distance(precision.limit, precision.unit)}.`,
    );
  if (control === "cards") {
    const matching = question.mode === "choice-match";
    const spare = (question.choices?.length ?? 0) - question.count;
    parts.push(
      question.orderInitial
        ? "Drag to swap, or select two cards."
        : `Drag cards or choose a card, then a ${matching ? "role" : "slot"}.${spare > 0 ? ` Leave ${spare === 1 ? "one card" : `${spare} cards`} aside.` : ""}`,
    );
  }
  const instruction = parts.filter(Boolean).join(" ");
  const notice =
    question.commitment !== "immediate"
      ? ""
      : question.failure === "end-game"
        ? "Each answer is final; one wrong answer ends this Journey."
        : question.count > 1
          ? "Each answer is final."
          : "Your first answer is final.";
  if (!instruction && !notice) return null;
  return (
    <p className="question-support">
      {instruction && (
        <span className="question-support-instruction">{instruction}</span>
      )}
      {instruction && notice && " "}
      {notice && <span className="question-support-commitment">{notice}</span>}
    </p>
  );
}

/** Full acceptance bands stay available through the free question-information menu. */
export function QuestionAccuracy({ question }: { question: Question }) {
  const precision = accuracy(question);
  if (!precision) return null;
  return (
    <details className="question-help-sources">
      <summary>Accuracy</summary>
      <div className="question-accuracy">
        <p>Within {distance(precision.limit, precision.unit)} counts.</p>
        {precision.bands.length > 0 && (
          <ul>
            {precision.bands.map((radius, index) => (
              <li key={radius}>
                {index === 0
                  ? "Bullseye"
                  : index === precision.bands.length - 1
                    ? "In range"
                    : "Close"}
                : within {distance(radius, precision.unit)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
