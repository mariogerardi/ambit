import { ActionIcon } from "../app/ActionIcon";
import type { Question } from "./questionContracts";
import type { HelpStage } from "./guidance";

/** Shared footer; help is authored per question and never changes submission rules. */
export function QuestionActions({
  disabled = false,
  label = "Submit answer",
  submitType = "button",
  onSubmit,
  showSubmit = true,
  guidance,
}: {
  disabled?: boolean;
  label?: string;
  submitType?: "button" | "submit";
  onSubmit?(): void;
  showSubmit?: boolean;
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
      <div className="question-answer-actions">
        <button
          type="button"
          data-dd-action-name={assist ? "Answer Assist" : "Answer Hint"}
          className={`primary-button answer-hint-button${assist ? " answer-assist-button" : ""}`}
          disabled={!guidance || exhausted}
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
