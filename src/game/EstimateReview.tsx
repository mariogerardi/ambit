import type { CSSProperties } from "react";
import type { Question, Response } from "./questionContracts";
import {
  estimateBands,
  estimateError,
  estimateValue,
  formatEstimate,
} from "./numericEstimate";

/** A committed estimate stays on its original scale; this is display-only. */
export function EstimateReview({
  question,
  response,
}: {
  question: Question;
  response: Response;
}) {
  if (question.rule.type !== "numeric-range") return null;
  const rule = question.rule;
  const value = estimateValue(rule, response);
  const error = estimateError(question, response);
  if (value === undefined || error === undefined) return null;
  const position = (number: number) =>
    Math.max(
      0,
      Math.min(100, ((number - rule.min) / (rule.max - rule.min)) * 100),
    );
  const bands = estimateBands(question, response);
  const achieved = bands.find((band) => band.achieved);
  const bandRole = (index: number) =>
    index === 0
      ? "correct"
      : index === bands.length - 1
        ? "hinted"
        : "selected";
  const resultRole = achieved
    ? bandRole(achieved.index)
    : error <= rule.tolerance
      ? "correct"
      : "incorrect";
  const ranges = bands.length
    ? [...bands].reverse()
    : [{ tolerance: rule.tolerance, index: 0 }];
  return (
    <section
      className="estimate-review"
      aria-label="Estimate review"
      style={
        { "--estimate-color": `var(--play-${resultRole})` } as CSSProperties
      }
    >
      <p className="submitted-answer estimate-review-summary">
        <span className="sr-only">Your estimate: </span>
        <strong>{formatEstimate(value, rule.unit)}</strong>
        <span>{formatEstimate(error, rule.unit)} away</span>
      </p>
      <div className="estimate-review-scale" aria-hidden="true">
        <div className="estimate-review-track">
          {ranges.map((band) => (
            <span
              key={band.tolerance}
              className="estimate-review-band"
              style={{
                left: `${position(rule.value - band.tolerance)}%`,
                width: `${position(rule.value + band.tolerance) - position(rule.value - band.tolerance)}%`,
                background: `var(--play-${bandRole(band.index)})`,
              }}
            />
          ))}
        </div>
        <span
          className="estimate-review-target"
          style={{ left: `${position(rule.value)}%` }}
        />
        <span
          className="estimate-review-guess"
          style={{ left: `${position(value)}%` }}
        />
      </div>
      <div className="estimate-slider-limits" aria-hidden="true">
        <span>{formatEstimate(rule.min, rule.unit)}</span>
        <span>{formatEstimate(rule.max, rule.unit)}</span>
      </div>
      <p className="estimate-review-key">
        <span>
          <i className="estimate-review-guess-key" aria-hidden="true" />
          Your estimate
        </span>
        <span>
          <i className="estimate-review-target-key" aria-hidden="true" />
          Answer: {formatEstimate(rule.value, rule.unit)}
        </span>
      </p>
      <ol className="pin-accuracy-bands" aria-label="Estimate accuracy bands">
        {bands.map((band) => (
          <li
            key={band.tolerance}
            data-achieved={band.achieved || undefined}
            style={
              {
                "--band-color": `var(--play-${bandRole(band.index)})`,
              } as CSSProperties
            }
          >
            <span aria-hidden="true">{band.achieved ? "✓" : "◎"}</span>
            <span>
              <span className="sr-only">{band.label}: </span>
              <strong>±{formatEstimate(band.tolerance, rule.unit)}</strong>
            </span>
          </li>
        ))}
      </ol>
      <p className="sr-only">
        Scale: {formatEstimate(rule.min, rule.unit)} to{" "}
        {formatEstimate(rule.max, rule.unit)}. Accepted estimates:{" "}
        {formatEstimate(
          Math.max(rule.min, rule.value - rule.tolerance),
          rule.unit,
        )}{" "}
        to{" "}
        {formatEstimate(
          Math.min(rule.max, rule.value + rule.tolerance),
          rule.unit,
        )}
        .
      </p>
    </section>
  );
}
