import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { DailyProgress } from "./dailyProgress";
import type { JourneySummary } from "../game/journeyRegistry";
import type { useJourneySchedule } from "../services/journeySchedule";
import { journeyPoints } from "../game/points";
import {
  ARCHIVE_START_DATE,
  archiveDay,
  archiveDateLabel,
  isArchiveDate,
  shiftedDate,
} from "./archiveDates";

export function JourneyArchive({
  today,
  initialDate,
  progress,
  catalog,
  schedule,
  ready,
  onPlay,
  onToday,
  onContentHeight,
}: {
  today: string;
  initialDate?: string;
  progress: DailyProgress;
  catalog: JourneySummary[];
  schedule: ReturnType<typeof useJourneySchedule>;
  ready: boolean;
  onPlay(date: string): void;
  onToday(): void;
  onContentHeight?(height: number): void;
}) {
  const card = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!onContentHeight || !card.current) return;
    const element = card.current;
    const measure = () =>
      onContentHeight(Math.ceil(element.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onContentHeight]);
  const last = shiftedDate(today, -1);
  const initial =
    initialDate && isArchiveDate(initialDate, today) ? initialDate : last;
  const [month, setMonth] = useState(initial.slice(0, 7));
  const [selected, setSelected] = useState(initial);
  const first = `${month}-01`;
  const days = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const offset = new Date(`${first}T12:00:00Z`).getUTCDay();
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${first}T12:00:00Z`));
  const loaded = schedule.loadedMonths.includes(month);
  const selectedDay = archiveDay(
    selected,
    today,
    progress,
    catalog,
    schedule.schedule?.records ?? {},
  );
  useEffect(() => {
    void schedule.refresh(month);
  }, [month, schedule.refresh]);
  const changeMonth = (delta: number) => {
    const next = new Date(
      Date.UTC(
        Number(month.slice(0, 4)),
        Number(month.slice(5, 7)) - 1 + delta,
        1,
      ),
    )
      .toISOString()
      .slice(0, 7);
    setMonth(next);
    setSelected(
      next === ARCHIVE_START_DATE.slice(0, 7)
        ? ARCHIVE_START_DATE
        : `${next}-01`,
    );
  };
  const cells = Array.from(
    { length: Math.ceil((offset + days) / 7) * 7 },
    (_, i) => {
      const day = i - offset + 1;
      return day > 0 && day <= days
        ? `${month}-${String(day).padStart(2, "0")}`
        : undefined;
    },
  );
  return (
    <section ref={card} className="info-view journey-archive">
      <header className="explore-heading archive-heading">
        <div className="explore-title">
          <h1 className="editorial-heading">
            Journey <em>archive.</em>
          </h1>
        </div>
        <button className="quiet-button" onClick={onToday} disabled={!ready}>
          Today’s Journey →
        </button>
      </header>
      <div className="archive-month-navigation">
        <button
          aria-label="Previous month"
          onClick={() => changeMonth(-1)}
          disabled={month <= ARCHIVE_START_DATE.slice(0, 7)}
        >
          ←
        </button>
        <h2 aria-live="polite">{monthLabel}</h2>
        <button
          aria-label="Next month"
          onClick={() => changeMonth(1)}
          disabled={month >= last.slice(0, 7)}
        >
          →
        </button>
      </div>
      {schedule.error && (
        <p role="alert">
          {schedule.error}{" "}
          <button
            className="quiet-button"
            onClick={() => void schedule.refresh(month)}
          >
            Retry archive
          </button>
        </p>
      )}
      {!loaded && !schedule.error && (
        <p role="status">Loading this month’s Journeys…</p>
      )}
      <table
        className="archive-calendar"
        aria-label={monthLabel}
        aria-busy={!loaded && !schedule.error}
      >
        <thead>
          <tr>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <th key={d} scope="col">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <tr key={row}>
              {cells.slice(row * 7, row * 7 + 7).map((date, column) => {
                const entry =
                  date && loaded
                    ? archiveDay(
                        date,
                        today,
                        progress,
                        catalog,
                        schedule.schedule?.records ?? {},
                      )
                    : undefined;
                const points =
                  entry?.attempt && entry.status === "completed"
                    ? journeyPoints(entry.attempt.game)
                    : undefined;
                const status =
                  entry?.status === "completed"
                    ? `Completed · ${points}/15 points`
                    : entry?.status === "in-progress"
                      ? "In progress"
                      : entry?.status === "unplayed"
                        ? "Not played"
                        : "Unavailable";
                return (
                  <td key={column}>
                    {date && (
                      <button
                        disabled={!loaded || !isArchiveDate(date, today)}
                        aria-pressed={selected === date}
                        aria-label={`${archiveDateLabel(date)}${entry?.journey ? `: ${entry.journey.title}` : ""} · ${status}`}
                        onClick={() => setSelected(date)}
                        data-status={entry?.status}
                      >
                        <span className="archive-day-number">
                          {points !== undefined && (
                            <svg
                              className="archive-completed-icon"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="m5 12 4 4L19 6" />
                            </svg>
                          )}
                          {Number(date.slice(-2))}
                        </span>
                        <small>
                          {points !== undefined
                            ? `${points}/15`
                            : entry?.status === "in-progress"
                              ? "Resume"
                              : entry?.status === "unplayed"
                                ? "Play"
                                : "—"}
                        </small>
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {loaded && selectedDay && (
        <article className="archive-selected-day" aria-live="polite">
          <span className="overline">{archiveDateLabel(selected)}</span>
          <h2>{selectedDay.journey?.title ?? "Journey unavailable"}</h2>
          {selectedDay.journey ? (
            <>
              <p>{selectedDay.journey.description}</p>
              {selectedDay.status === "completed" && (
                <p>{journeyPoints(selectedDay.attempt!.game)}/15 points</p>
              )}
              <button
                className="primary-button"
                disabled={!ready}
                onClick={() => onPlay(selected)}
              >
                {selectedDay.status === "completed"
                  ? "View result"
                  : selectedDay.status === "in-progress"
                    ? "Resume Journey"
                    : "Play Journey"}
                <span aria-hidden="true">→</span>
              </button>
            </>
          ) : (
            <p>This day’s Journey isn’t available. Choose another date.</p>
          )}
        </article>
      )}
      {today <= ARCHIVE_START_DATE && (
        <p>The archive opens after the first Daily on October 11, 2026.</p>
      )}
      <p className="archive-streak-note">
        Past Journeys earn points and save your progress. They don’t add to your
        Daily streak.
      </p>
    </section>
  );
}
