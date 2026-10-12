import type { JourneySummary } from "../game/journeyRegistry";
import { unfinished } from "./dailyProgress";
import type { DailyAttempt } from "./dailyProgress";

export function HomePanel({
  journey,
  attempt,
  ready,
  scheduleError,
  onPlay,
  onRetrySchedule,
  onExplore,
  onStudy,
}: {
  journey: JourneySummary;
  attempt?: DailyAttempt;
  ready: boolean;
  scheduleError?: string;
  onPlay(): void;
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
        <button className="primary-button" disabled={!ready} onClick={onPlay}>
          {label}
          <span>→</span>
        </button>
      </div>
      {scheduleError && (
        <p role="alert">
          {scheduleError}{" "}
          <button className="quiet-button" onClick={onRetrySchedule}>
            Retry schedule
          </button>
        </p>
      )}
      <div className="menu-secondary">
        <button onClick={onExplore}>
          <strong>
            Explore <span>→</span>
          </strong>
          <small>Follow your curiosity.</small>
        </button>
        <button onClick={onStudy}>
          <strong>
            Study <span>→</span>
          </strong>
          <small>Practice at your pace.</small>
        </button>
      </div>
      <p className="globe-invitation">Or explore directly on the globe.</p>
    </section>
  );
}
