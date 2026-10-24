import { useLayoutEffect, useRef } from "react";
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
  const title = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const heading = title.current;
    const text = heading?.firstElementChild as HTMLElement | null;
    if (!heading || !text) return;
    let active = true;
    const fit = () => {
      if (!active || !heading.clientWidth) return;
      heading.style.fontSize = "";
      let low = 0;
      let high = parseFloat(getComputedStyle(heading).fontSize);
      if (text.getBoundingClientRect().width <= heading.clientWidth) return;
      // Measure the actual font, including its fixed letter spacing.
      while (high - low > 0.1) {
        const size = (low + high) / 2;
        heading.style.fontSize = `${size}px`;
        if (text.getBoundingClientRect().width > heading.clientWidth)
          high = size;
        else low = size;
      }
      heading.style.fontSize = `${low}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(heading);
    window.addEventListener("resize", fit);
    void document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [journey.title]);
  const label = !attempt
    ? "Play"
    : unfinished(attempt)
      ? "Resume"
      : "View result";
  return (
    <section className="home-story home-menu">
      <div className="daily-menu">
        <span className="overline daily-menu-eyebrow">TODAY’S JOURNEY</span>
        <h2 ref={title}>
          <span>{journey.title}</span>
        </h2>
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
