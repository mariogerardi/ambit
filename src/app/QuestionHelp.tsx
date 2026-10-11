import type { ReactNode } from "react";
import { InfoTooltip } from "./InfoTooltip";

export function QuestionHelp({
  sources,
  onReport,
  sourcesLocked = false,
}: {
  sources?: ReactNode;
  sourcesLocked?: boolean;
  onReport?(): void;
}) {
  return (
    <InfoTooltip
      label="Question information"
      className="question-help-button"
      icon={
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1.1-1.5 2.5M12 16.5h.01" />
        </svg>
      }
    >
      {(close) => (
        <div className="question-help-options">
          {sources && (
            <details className="question-help-sources">
              <summary>Sources</summary>
              <div>
                {sourcesLocked ? (
                  <p>Sources appear after you answer.</p>
                ) : (
                  sources
                )}
              </div>
            </details>
          )}
          {onReport && (
            <button
              type="button"
              onClick={() => {
                close();
                onReport();
              }}
            >
              Report this question
            </button>
          )}
        </div>
      )}
    </InfoTooltip>
  );
}
