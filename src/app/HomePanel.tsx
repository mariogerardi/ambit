import { useLayoutEffect, useRef } from "react";
import type { JourneySummary } from "../game/journeyRegistry";
import { unfinished } from "./dailyProgress";
import type { DailyAttempt } from "./dailyProgress";
import { answerPoints, QUESTION_POINTS } from "../game/points";
import { ActionIcon } from "./ActionIcon";

export function HomePanel({
  journey,
  attempt,
  ready,
  scheduleError,
  onPlay,
  onArchive,
  onRetrySchedule,
  onMinigames,
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
  onMinigames(): void;
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
  const stages = Array.from({ length: 5 }, (_, index) => {
    const answer = attempt?.game.answers[index];
    return {
      answer,
      points: answerPoints(
        answer,
        answer ? attempt?.game.help?.[answer.roundId] : undefined,
      ),
    };
  });
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
        <div
          className="daily-levels"
          role="img"
          aria-label={`${attempt?.game.answers.length ?? 0} of 5 Journey questions completed. Points by stage: ${stages.map((stage) => `${stage.points}/${QUESTION_POINTS}`).join(", ")}.`}
        >
          <svg
            viewBox="0 0 440 48"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((index) => {
              const x = 12 + index * 104;
              return (
                <path
                  key={index}
                  className={stages[index + 1].answer ? "completed" : undefined}
                  d={`M ${x} 20 H ${x + 104}`}
                />
              );
            })}
          </svg>
          {stages.map(({ answer, points }, index) => {
            const completed = !!answer;
            return (
              <span
                key={index}
                className="daily-trail-stop"
                data-complete={completed}
                title={`Question ${index + 1}: ${points}/${QUESTION_POINTS} points · ${completed ? "completed" : "not completed"}`}
                aria-hidden="true"
                style={{
                  left: `${((12 + index * 104) / 440) * 100}%`,
                  top: 14,
                }}
              >
                <span className="daily-stage-points">
                  {Array.from({ length: QUESTION_POINTS }, (_, point) => (
                    <i key={point} data-filled={point < points} />
                  ))}
                </span>
                <i />
                <small>{String(index + 1).padStart(2, "0")}</small>
              </span>
            );
          })}
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
        <button
          className="home-minigames"
          data-dd-action-name="Home Minigames"
          onClick={onMinigames}
        >
          <strong>
            <ActionIcon name="minigames" />
            <span className="menu-secondary-label">Minigames</span>
            <span className="menu-new-badge">NEW!</span>
            <span className="menu-secondary-arrow" aria-hidden="true">
              →
            </span>
          </strong>
          <small>More ways to play.</small>
        </button>
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
