import type { JourneySummary } from "../game/journeyRegistry";
import { unfinished } from "./dailyProgress";
import type { DailyAttempt } from "./dailyProgress";
import { ActionIcon } from "./ActionIcon";

export function HomePanel({
  journey,
  attempt,
  ready,
  scheduleError,
  onPlay,
  onArchive,
  onRetrySchedule,
  onExplore,
  onStudy,
}: {
  journey: JourneySummary;
  attempt?: DailyAttempt;
  ready: boolean;
  scheduleError?: string;
  onPlay(): void;
  onArchive?(): void;
  onRetrySchedule(): void;
  onExplore(): void;
  onStudy(): void;
}) {
  const label = !attempt
    ? "Play"
    : unfinished(attempt)
      ? "Resume"
      : "View result";
  return (
    <section className="home-story home-menu">
      <h1>
        A world of&nbsp;
        <em>wonders.</em>
      </h1>
      <div className="daily-menu">
        <span className="overline daily-menu-eyebrow">TODAY’S JOURNEY</span>
        <h2>{journey.title}</h2>
        <p className="daily-menu-description">{journey.description}</p>
        <div className="daily-levels" aria-label="Five rounds">
          {[1, 2, 3, 4, 5].map((level) => (
            <span
              key={level}
              className={
                attempt?.game.answers[level - 1]
                  ? `answered${attempt.game.answers[level - 1].correct ? "" : " journey-incorrect"}`
                  : ""
              }
            >
              {attempt?.game.answers[level - 1]
                ? attempt.game.answers[level - 1].correct
                  ? "✓"
                  : "×"
                : String(level).padStart(2, "0")}
            </span>
          ))}
        </div>
        <div className="daily-menu-actions">
          <button
            className="primary-button daily-menu-action"
            data-dd-action-name="Home Journey"
            disabled={!ready}
            onClick={onPlay}
          >
            <ActionIcon name="journey" />
            <span className="daily-menu-action-label">{label}</span>
            <span className="daily-menu-action-arrow" aria-hidden="true">
              →
            </span>
          </button>
          {onArchive && (
            <button
              className="daily-menu-action home-archive-link"
              data-dd-action-name="Home Archive"
              onClick={onArchive}
            >
              <ActionIcon name="archive" />
              <span className="daily-menu-action-label">Journey archive</span>
              <span className="daily-menu-action-arrow" aria-hidden="true">
                →
              </span>
            </button>
          )}
        </div>
      </div>
      {scheduleError && (
        <p role="alert">
          {scheduleError}{" "}
          <button
            className="quiet-button"
            data-dd-action-name="Home Retry Schedule"
            onClick={onRetrySchedule}
          >
            Retry schedule
          </button>
        </p>
      )}
      <div className="menu-secondary">
        <button data-dd-action-name="Home Explore" onClick={onExplore}>
          <strong>
            <ActionIcon name="explore" />
            <span className="menu-secondary-label">Explore</span>
            <span className="menu-secondary-arrow" aria-hidden="true">
              →
            </span>
          </strong>
          <small>Follow your curiosity.</small>
        </button>
        <button data-dd-action-name="Home Study" onClick={onStudy}>
          <strong>
            <ActionIcon name="study" />
            <span className="menu-secondary-label">Study</span>
            <span className="menu-secondary-arrow" aria-hidden="true">
              →
            </span>
          </strong>
          <small>Practice at your pace.</small>
        </button>
      </div>
      <p className="globe-invitation">Or explore directly on the globe.</p>
    </section>
  );
}
