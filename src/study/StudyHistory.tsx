import { studyComplete, studyReplayTargets } from "./engine";
import type { StudyRecord, StudySettings, StudyReviewTarget } from "./engine";
import { ActionIcon } from "../app/ActionIcon";
import { studyDescription } from "./StudySetup";
export function StudyHistory({
  records,
  onBack,
  onView,
  onStart,
}: {
  records: StudyRecord[];
  onBack(): void;
  onView(record: StudyRecord): void;
  onStart(settings: StudySettings, targets?: StudyReviewTarget[]): void;
}) {
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <section className="info-view study-history">
      <button
        className="quiet-button tertiary-action study-back"
        aria-label="Back to Study"
        onClick={onBack}
      >
        <span aria-hidden="true">←</span> Back to Study
      </button>
      <h1 className="editorial-heading">
        Past <em>sessions.</em>
      </h1>
      {!records.length && <p className="muted">No past sessions yet.</p>}
      <ul className="study-history-list">
        {[...records]
          .sort((a, b) => b.finishedAt - a.finishedAt)
          .map((record) => {
            const right = record.session.history.filter(
              (a) => a.correct,
            ).length;
            const count = record.session.history.length;
            const status = studyComplete(record.session)
              ? "Completed"
              : record.session.settings.length === "continuous"
                ? "Ended"
                : "Ended early";
            const date = dateFormat.format(record.finishedAt);
            return (
              <li key={record.id}>
                <button
                  className="study-history-view"
                  aria-label={`View results: ${studyDescription(record.session.settings)}, ${date}`}
                  onClick={() => onView(record)}
                >
                  <span className="study-history-score">
                    <strong>
                      {right} / {count} correct
                    </strong>
                    <small>{status}</small>
                  </span>
                  <span className="study-history-description">
                    {studyDescription(record.session.settings)}
                  </span>
                  <time dateTime={new Date(record.finishedAt).toISOString()}>
                    {date}
                  </time>
                </button>
                <div className="study-history-actions">
                  <button
                    className="quiet-button tertiary-action"
                    onClick={() => onView(record)}
                  >
                    View results
                  </button>
                  <button
                    className="quiet-button tertiary-action"
                    aria-label={`Replay session from ${date}`}
                    onClick={() =>
                      onStart(
                        record.session.settings,
                        studyReplayTargets(record.session),
                      )
                    }
                  >
                    <ActionIcon name="repeat" /> Replay
                  </button>
                </div>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
