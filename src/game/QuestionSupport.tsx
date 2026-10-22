import { constructionRule } from "./construction";
import type { Question } from "./questionContracts";
import { mechanicFor } from "./mechanics";

function accuracy(question: Question) {
  const rule = question.rule;
  if (rule.type === "bearing-angle")
    return {
      unit: "°",
      limit: rule.tiers.at(-1)!.degrees,
      bands: rule.tiers.map((tier) => tier.degrees),
    };
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
  `${value.toLocaleString("en-US")}${unit === "°" ? "" : " "}${unit}`;

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
      question.rule.type === "bearing-angle"
        ? `Aim for within ${distance(precision.bands[0], precision.unit)}!`
        : precision.bands.length
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
  const rule = constructionRule(question);
  if (rule)
    return (
      <details className="question-help-sources">
        <summary>Accuracy</summary>
        <div className="question-accuracy">
          {"grid" in rule && <p>{rule.grid.label}</p>}
          <ul>
            {rule.tiers.map((tier, i) => (
              <li key={i}>
                {3 - i} {i === 2 ? "point" : "points"}:{" "}
                {rule.type === "raster-overlap" && "f1" in tier
                  ? `overlap score at least ${tier.f1 * 100}%, with at least ${tier.precision * 100}% of scored paint on mapped dunes.`
                  : rule.type === "island-coverage-max" && "count" in tier
                    ? `enclose at least ${tier.count} entire islands, including every shore.`
                    : rule.type === "point-coverage-max" && "count" in tier
                      ? `enclose at least ${tier.count} of the marked ${rule.pointLabel ?? "capitals"}.`
                      : rule.type === "line-following" && "coverage" in tier
                        ? `follow at least ${tier.coverage * 100}% of the river within ${tier.referenceKm} km, with ${tier.coverage * 100}% of your stroke within ${tier.strokeKm} km of it.`
                        : rule.type === "population-coverage-area-budget" &&
                            "population" in tier
                          ? `capture at least ${tier.population}% of modeled residents in at most ${tier.area}% of country land.`
                          : "error" in tier
                            ? `each side contains ${50 - tier.error}% to ${50 + tier.error}% of modeled residents.`
                            : ""}
              </li>
            ))}
          </ul>
          <p>
            Boundary points count inside. Help caps the earned points; it does
            not change the task.
          </p>
          {rule.type === "line-following" && (
            <p>
              Keep the marked endpoints and follow the river in order. Shortcuts
              under 90% of the reference length and loops over 1.6 times its
              length do not qualify.
            </p>
          )}
        </div>
      </details>
    );
  const precision = accuracy(question);
  if (!precision) return null;
  return (
    <details className="question-help-sources">
      <summary>Accuracy</summary>
      <div className="question-accuracy">
        {question.bearingIntersection && (
          <p>
            Each station reports its initial great-circle bearing, clockwise
            from true north. Infer where both directions meet. The readings stay
            fixed as you rotate the globe.
          </p>
        )}
        {question.rule.type === "bearing-angle" && (
          <p>
            Initial great-circle direction, clockwise from true north at the
            origin. Accuracy uses the smaller angle between your heading and the
            answer; 0° and 360° are the same direction.
          </p>
        )}
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
