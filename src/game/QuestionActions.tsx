import { ActionIcon } from "../app/ActionIcon";

/** Shared answer footer. Hints are a visible placeholder until their rules are authored. */
export function QuestionActions({
  disabled = false,
  label = "Submit answer",
  submitType = "button",
  onSubmit,
  showSubmit = true,
}: {
  disabled?: boolean;
  label?: string;
  submitType?: "button" | "submit";
  onSubmit?(): void;
  showSubmit?: boolean;
}) {
  return (
    <div className="question-answer-actions">
      <button
        type="button"
        className="primary-button answer-hint-button"
        disabled
        title="Hints are coming soon."
      >
        Need a hint? <ActionIcon name="hint" />
      </button>
      {showSubmit && (
        <button
          type={submitType}
          className="primary-button answer-submit-button"
          disabled={disabled}
          onClick={onSubmit}
        >
          {label} <span aria-hidden="true">→</span>
        </button>
      )}
    </div>
  );
}
