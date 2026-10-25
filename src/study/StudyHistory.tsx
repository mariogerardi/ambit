import { StudyBack } from "./StudyBack";
import type { StudyPlaceTarget } from "./placeReview";
import { studyComplete, studyReplayTargets } from "./engine";
import type { StudyRecord, StudySettings, StudyReviewTarget } from "./engine";
import { ActionIcon } from "../app/ActionIcon";
import { studyDescription } from "./StudySetup";
export function StudyHistory({
  records,
  onBack,
  onView,
  onStart,
  onStartPlaces,
}: {
  records: StudyRecord[];
  onBack(): void;
  onView(record: StudyRecord): void;
  onStart(settings: StudySettings, targets?: StudyReviewTarget[]): void;
  onStartPlaces?(targets: StudyPlaceTarget[]): void;
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
      <StudyBack label="Back to Study" onClick={onBack} />
      <h1 className="editorial-heading">
        Past <em>sessions.</em>
      </h1>
      {!records.length && (
        <p className="muted">
          Your Study sessions will appear here, including sessions ended early.
        </p>
      )}
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
            const description = record.session.placeReview
              ? `Map review · ${record.session.placeReview.length} places`
              : studyDescription(record.session.settings);
            return (
              <li key={record.id}>
                <button
                  className="study-history-view"
                  aria-label={`View results: ${description}, ${date}`}
                  onClick={() => onView(record)}
                >
                  <span className="study-history-score">
                    <strong>
                      {right} / {count} correct
                    </strong>
                    <small>{status}</small>
                  </span>
                  <span className="study-history-description">
                    {description}
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
                      record.session.placeReview
                        ? onStartPlaces?.(record.session.placeReview)
                        : onStart(
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
