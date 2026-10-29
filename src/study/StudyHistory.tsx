import { StudyNavigation } from "./StudyNavigation";
import type { StudyPlaceTarget } from "./placeReview";
import { studyComplete, studyTargets } from "./engine";
import type {
  StudyRecord,
  StudySettings,
  StudyReviewTarget,
  StudySession,
} from "./engine";
import { ActionIcon } from "../app/ActionIcon";
import {
  sessionTitle,
  sessionMethod,
  sessionArea,
  sessionTopics,
} from "./sessionDescription";
export function StudyHistory({
  records,
  onView,
  onReview,
  session,
  onResume,
  onBuild,
  onPacks,
}: {
  records: StudyRecord[];
  onBack?(): void;
  onView(record: StudyRecord): void;
  onStart(settings: StudySettings, targets?: StudyReviewTarget[]): void;
  onStartPlaces?(targets: StudyPlaceTarget[]): void;
  onReview?(): void;
  session?: StudySession;
  onResume?(): void;
  onBuild?(): void;
  onPacks?(): void;
}) {
  const current = session && session.phase !== "summary" ? session : undefined;
  const answered = current?.history.length ?? 0;
  const correct =
    current?.history.filter((answer) => answer.correct).length ?? 0;
  const completePass =
    !!current && !current.learningReview && current.settings.length === "all";
  const total =
    !current || current.learningReview
      ? undefined
      : current.placeReview
        ? current.placeReview.length
        : typeof current.settings.length === "number"
          ? current.settings.length
          : completePass
            ? (current.coverage?.length ??
              studyTargets(current.settings).length)
            : undefined;
  const completed =
    completePass && current
      ? new Set(
          current.history.map(
            ({ prompt }) => `${prompt.targetId}/${prompt.topic}`,
          ),
        ).size
      : answered;
  const dateFormat = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <section className="info-view study-view study-history">
      <StudyNavigation />
      <h1 className="editorial-heading">
        Keep <em>exploring.</em>
      </h1>
      {current ? (
        <section
          className="study-current-card"
          aria-label="Current Study session"
        >
          <span className="overline">
            <ActionIcon name="study" />
            Current session
          </span>
          <h2>{sessionArea(current)}</h2>
          <p className="study-current-description">
            {!current.placeReview && !current.learningReview && (
              <>{sessionTopics(current)} · </>
            )}
            {sessionMethod(current)}
          </p>
          {!!answered && (
            <p className="study-current-stats">
              <span>
                {completed}
                {total !== undefined && ` of ${total}`}{" "}
                {completePass ? "covered" : "answered"}
              </span>
              <span>{correct} correct so far</span>
            </p>
          )}
          {total !== undefined && total > 0 && (
            <progress
              className="study-current-progress"
              aria-label="Session progress"
              value={Math.min(completed, total)}
              max={total}
            />
          )}
          <button className="primary-button" onClick={onResume}>
            Resume session <span aria-hidden="true">→</span>
          </button>
        </section>
      ) : (
        <section className="study-session-prompt">
          <div className="study-session-choices">
            <button
              className="study-session-destination study-session-packs"
              aria-label="Browse Study Packs"
              onClick={onPacks}
            >
              <strong>
                <ActionIcon name="study" />
                <span>Study Packs</span>
                <span className="study-destination-arrow" aria-hidden="true">
                  →
                </span>
              </strong>
              <small>Choose a ready-made challenge.</small>
            </button>
            <button
              className="study-session-destination"
              aria-label="Build a session"
              onClick={onBuild}
            >
              <strong>
                <ActionIcon name="custom" />
                <span>Build a session</span>
                <span className="study-destination-arrow" aria-hidden="true">
                  →
                </span>
              </strong>
              <small>Customize your study session.</small>
            </button>
            <button
              className="study-session-destination"
              aria-label="Go to Review"
              onClick={onReview}
            >
              <strong>
                <ActionIcon name="review" />
                <span>Review</span>
                <span className="study-destination-arrow" aria-hidden="true">
                  →
                </span>
              </strong>
              <small>Revisit what you’ve practiced.</small>
            </button>
          </div>
        </section>
      )}
      <h2>Past sessions</h2>
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
            const description = sessionTitle(record.session);
            return (
              <li key={record.id}>
                <button
                  className="study-history-view"
                  aria-label={`View results: ${description}, ${date}`}
                  onClick={() => onView(record)}
                >
                  <span className="study-history-description">
                    <strong>{description}</strong>
                    <small>
                      {sessionMethod(record.session)} ·{" "}
                      <time
                        dateTime={new Date(record.finishedAt).toISOString()}
                      >
                        {date}
                      </time>
                    </small>
                  </span>
                  <span className="study-history-score">
                    <strong>
                      {right} / {count} correct
                    </strong>
                    <small>{status}</small>
                  </span>
                  <span
                    className="study-history-results-cue"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </section>
  );
}
