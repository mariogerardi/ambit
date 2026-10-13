import { useEffect, useState } from "react";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { useAccount } from "../services/accounts";
import type { useJourneySchedule } from "../services/journeySchedule";
import { dailyJourney, dateOrdinal } from "./dailyProgress";
import type { DailyAttempt } from "./dailyProgress";

const formatDay = (date: string, long = false) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(
    undefined,
    long
      ? { weekday: "long", month: "long", day: "numeric", year: "numeric" }
      : { weekday: "short", month: "short", day: "numeric" },
  );
const monthStart = (month: string, offset = 0) => {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1 + offset, 1))
    .toISOString()
    .slice(0, 7);
};
function calendarDays(month: string) {
  const first = new Date(`${month}-01T00:00:00Z`);
  const start = dateOrdinal(`${month}-01`) - first.getUTCDay();
  const count =
    Math.ceil(
      (new Date(
        Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
      ).getUTCDate() +
        first.getUTCDay()) /
        7,
    ) * 7;
  return Array.from({ length: count }, (_, index) =>
    new Date((start + index) * 86400000).toISOString().slice(0, 10),
  );
}
function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" />
    </svg>
  );
}

export function AdminPanel({
  date,
  schedule,
  attempt,
  resetReady = false,
  onResetAttempt,
}: {
  date: string;
  schedule: ReturnType<typeof useJourneySchedule>;
  attempt?: DailyAttempt;
  resetReady?: boolean;
  onResetAttempt?: () => boolean;
}) {
  const account = useAccount();
  const [day, setDay] = useState(date);
  const [month, setMonth] = useState(date.slice(0, 7));
  const assignments = schedule.schedule?.assignments ?? {};
  const current = dailyJourney(day, undefined, JOURNEY_INDEX, assignments);
  const saved = assignments[day] ? current.id : "";
  const [draft, setDraft] = useState({ day, value: saved, saved });
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  useEffect(() => setResetMessage(""), [date]);
  // Refresh published dates without erasing a Journey the admin is still choosing.
  useEffect(() => {
    setDraft((current) =>
      current.day !== day || current.value === current.saved
        ? { day, value: saved, saved }
        : { ...current, saved },
    );
  }, [day, saved]);
  useEffect(() => setMessage(""), [day]);
  const selection = draft.day === day ? draft.value : saved;
  const preview =
    JOURNEY_INDEX.find((journey) => journey.id === selection) ??
    dailyJourney(day, undefined, JOURNEY_INDEX, {});
  const dirty = selection !== saved;
  const busy = submitting || schedule.busy;
  function chooseDay(next: string) {
    setDay(next);
    setMonth(next.slice(0, 7));
  }
  function chooseJourney(value: string) {
    setDraft({ day, value, saved });
    setMessage("");
  }
  return (
    <section className="info-view admin-panel" aria-label="Admin menu">
      <span className="overline">ADMIN</span>
      <h1 className="editorial-heading">
        A Journey for <em>every day.</em>
      </h1>
      <p className="muted">
        Choose what players discover next, and review their feedback.
      </p>
      <section className="admin-journey-card" aria-label="Your Journey attempt">
        <h2>Your current Journey attempt</h2>
        <p className="muted">
          {attempt
            ? `${JOURNEY_INDEX.find((journey) => journey.id === attempt.journeyId)?.title ?? "Today's Journey"} · ${attempt.game.answers.length} of 5 answered.`
            : "You have no Journey attempt for today."}
        </p>
        <p>Clear your answers, score, and help use for today to start fresh.</p>
        <button
          className="quiet-button tertiary-action"
          disabled={!attempt || !resetReady || !onResetAttempt}
          onClick={() => {
            if (
              !window.confirm(
                "Clear your current Journey attempt? Your answers, score, and help use for today will be removed from your account. You can then start fresh from Home.",
              )
            )
              return;
            setResetMessage(
              onResetAttempt?.()
                ? "Attempt cleared. Start fresh from Home."
                : "Couldn’t clear the attempt. Please try again.",
            );
          }}
        >
          Clear my Journey attempt
        </button>
        {resetMessage && <p role="status">{resetMessage}</p>}
      </section>
      <div className="admin-journey-card journey-scheduler-card">
        <header className="journey-scheduler-heading">
          <div>
            <h2>Daily Journey schedule</h2>
            <p className="muted">
              Choose a day, pick a Journey, then publish it for everyone.
            </p>
          </div>
          <button
            className="quiet-button scheduler-icon"
            aria-label="Refresh schedule"
            title="Refresh schedule"
            onClick={() => void schedule.refresh()}
            disabled={busy}
          >
            <RefreshIcon />
          </button>
        </header>
        {schedule.error && (
          <p role="alert" className="schedule-notice">
            {schedule.error}
          </p>
        )}
        {!schedule.ready && !schedule.error && (
          <p role="status">Opening the schedule…</p>
        )}
        <div className="journey-scheduler">
          <section className="journey-month" aria-label="Journey calendar">
            <header className="journey-month-heading">
              <h3>
                {new Date(`${month}-01T12:00:00`).toLocaleDateString(
                  undefined,
                  { month: "long", year: "numeric" },
                )}
              </h3>
              <div className="journey-month-actions">
                <button
                  className="quiet-button scheduler-today"
                  onClick={() => chooseDay(date)}
                  disabled={busy}
                >
                  Today
                </button>
                <button
                  className="quiet-button scheduler-icon"
                  aria-label="Previous month"
                  onClick={() => setMonth(monthStart(month, -1))}
                  disabled={busy}
                >
                  ‹
                </button>
                <button
                  className="quiet-button scheduler-icon"
                  aria-label="Next month"
                  onClick={() => setMonth(monthStart(month, 1))}
                  disabled={busy}
                >
                  ›
                </button>
              </div>
            </header>
            <div className="journey-calendar-weekdays" aria-hidden="true">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
            <div className="journey-calendar">
              {calendarDays(month).map((calendarDay) => {
                const journey = dailyJourney(
                  calendarDay,
                  undefined,
                  JOURNEY_INDEX,
                  assignments,
                );
                const assigned = !!assignments[calendarDay];
                return (
                  <button
                    className={`journey-calendar-day${calendarDay.slice(0, 7) !== month ? " is-outside-month" : ""}${calendarDay === date ? " is-today" : ""}`}
                    key={calendarDay}
                    onClick={() => chooseDay(calendarDay)}
                    disabled={busy}
                    aria-pressed={calendarDay === day}
                    aria-label={formatDay(calendarDay)}
                    aria-describedby={`${calendarDay}-journey ${calendarDay}-status`}
                    title={`${formatDay(calendarDay, true)} · ${journey.title} · ${assigned ? "Scheduled" : "Automatic"}`}
                  >
                    <span className="journey-calendar-date">
                      <time dateTime={calendarDay}>
                        {Number(calendarDay.slice(-2))}
                      </time>
                      <span
                        className={`schedule-dot${assigned ? " is-assigned" : ""}`}
                        aria-label={assigned ? "Scheduled" : "Automatic"}
                      />
                    </span>
                    <strong id={`${calendarDay}-journey`}>
                      {journey.title}
                    </strong>
                    <span id={`${calendarDay}-status`} className="sr-only">
                      {assigned ? "Scheduled" : "Automatic"}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="journey-calendar-legend">
              <span>
                <i className="schedule-dot is-assigned" /> Scheduled
              </span>
              <span>
                <i className="schedule-dot" /> Automatic rotation
              </span>
            </p>
          </section>
          <form
            className="journey-date-editor"
            aria-label="Schedule selected date"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!dirty || busy || !schedule.ready) return;
              setMessage("");
              setSubmitting(true);
              try {
                const token = await account.accessToken();
                if (!token) {
                  setMessage("Sign in again to save the schedule.");
                  return;
                }
                if (await schedule.save(day, selection || undefined, token))
                  setMessage(
                    selection
                      ? `Published ${preview.title} for ${formatDay(day)}.`
                      : `Restored automatic rotation for ${formatDay(day)}.`,
                  );
              } catch {
                setMessage("Couldn’t save the schedule. Please try again.");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <header>
              <span className="overline">SELECTED DAY</span>
              <h3>{formatDay(day, true)}</h3>
            </header>
            <label className="field">
              <span>Journey date</span>
              <input
                type="date"
                required
                value={day}
                disabled={busy}
                onChange={(event) => {
                  if (event.target.value) chooseDay(event.target.value);
                }}
              />
            </label>
            <label className="field">
              <span>Playable Journey</span>
              <select
                value={selection}
                disabled={busy || !schedule.ready}
                onChange={(event) => chooseJourney(event.target.value)}
              >
                <option value="">Automatic rotation</option>
                {JOURNEY_INDEX.map((journey) => (
                  <option key={journey.id} value={journey.id}>
                    {journey.title}
                  </option>
                ))}
              </select>
            </label>
            <article
              className={`scheduled-journey-preview${dirty ? " is-draft" : ""}`}
              aria-label="Journey preview"
            >
              <span className="schedule-preview-label">
                {dirty
                  ? "Ready to publish"
                  : saved
                    ? "Scheduled"
                    : "Automatic rotation"}
              </span>
              <h4>{preview.title}</h4>
              <p>{preview.description}</p>
              <a href={preview.path} className="tertiary-action">
                Preview five questions <span aria-hidden="true">↗</span>
              </a>
            </article>
            {dirty && (
              <p className="schedule-current">
                Currently published: <strong>{current.title}</strong>
                {saved ? " · Scheduled" : " · Automatic"}
              </p>
            )}
            <button
              className="primary-button"
              type="submit"
              disabled={!schedule.ready || busy || !dirty}
            >
              {busy
                ? "Publishing…"
                : !dirty
                  ? "No changes to publish"
                  : selection
                    ? `Publish for ${formatDay(day).replace(/^[^,]+, /, "")}`
                    : "Restore automatic rotation"}
              <span aria-hidden="true">→</span>
            </button>
            {saved && selection && (
              <button
                type="button"
                className="quiet-button tertiary-action schedule-restore"
                disabled={busy}
                onClick={() => chooseJourney("")}
              >
                Use automatic rotation instead
              </button>
            )}
            {message && (
              <p className="schedule-notice" role="status">
                {message}
              </p>
            )}
          </form>
        </div>
        <p className="schedule-footnote">
          Unassigned days use the automatic rotation. Dates change at midnight
          in New York; players who have started keep their Journey.
        </p>
      </div>
    </section>
  );
}
