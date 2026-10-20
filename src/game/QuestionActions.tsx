import { ActionIcon } from "../app/ActionIcon";
import type { Question } from "./questionContracts";
import type { HelpStage } from "./guidance";
import { useId, type ReactNode } from "react";

/** Shared footer; help is authored per question and never changes submission rules. */
export function QuestionActions({
  disabled = false,
  label = "Submit answer",
  submitType = "button",
  onSubmit,
  showSubmit = true,
  guidance,
  pointScoring = false,
  mapKey,
}: {
  disabled?: boolean;
  label?: string;
  submitType?: "button" | "submit";
  onSubmit?(): void;
  showSubmit?: boolean;
  pointScoring?: boolean;
  mapKey?: ReactNode;
  guidance?: {
    content: NonNullable<Question["guidance"]>;
    stage?: HelpStage;
    preservedSelection?: boolean;
    onHint(): void;
    onAssist(): void;
  };
}) {
  const assist = !!guidance?.stage && !!guidance.content.assist;
  const exhausted =
    guidance?.stage === "assisted" ||
    (!!guidance?.stage && !guidance.content.assist);
  const ceilingId = useId();
  const ceiling = guidance?.stage === "assisted" || assist ? 1 : 2;
  return (
    <>
      {guidance?.stage && (
        <aside
          id="current-question-guidance"
          className="question-guidance"
          aria-label="Question help"
          aria-live="polite"
          aria-atomic="true"
        >
          <p>
            <strong>Hint</strong>
            {guidance.content.hint}
          </p>
          {guidance.stage === "assisted" && guidance.content.assist && (
            <>
              <p className="question-assist-copy">
                <strong>Assist</strong>
                {guidance.content.assist.text}
              </p>
              {guidance.preservedSelection && (
                <p className="assist-selection-note">
                  Your earlier selection is kept. You can remove it to leave
                  only the remaining candidates.
                </p>
              )}
            </>
          )}
        </aside>
      )}
      {mapKey}
      <div className="question-answer-actions">
        <button
          type="button"
          data-dd-action-name={assist ? "Answer Assist" : "Answer Hint"}
          className={`primary-button answer-hint-button${assist ? " answer-assist-button" : ""}`}
          disabled={!guidance || exhausted}
          aria-label={
            pointScoring
              ? assist
                ? "Need an assist?"
                : "Need a hint?"
              : undefined
          }
          aria-describedby={pointScoring && guidance ? ceilingId : undefined}
          title={
            !guidance
              ? "Hints are coming soon."
              : exhausted
                ? "All available help has been used."
                : undefined
          }
          aria-controls={
            guidance?.stage ? "current-question-guidance" : undefined
          }
          onClick={assist ? guidance?.onAssist : guidance?.onHint}
        >
          {assist ? "Need an assist?" : "Need a hint?"}{" "}
          <ActionIcon name={assist ? "assist" : "hint"} />
          {pointScoring && guidance && (
            <small id={ceilingId} className="help-point-ceiling">
              Play for up to {ceiling} {ceiling === 1 ? "point" : "points"}
            </small>
          )}
        </button>
        {showSubmit && (
          <button
            type={submitType}
            data-dd-action-name="Answer Submit"
            className="primary-button answer-submit-button"
            disabled={disabled}
            onClick={onSubmit}
          >
            {label} <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </>
  );
}
