import { useEffect, useState } from "react";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { useAccount } from "../services/accounts";
import type { useJourneySchedule } from "../services/journeySchedule";
import { dailyJourney, dateOrdinal } from "./dailyProgress";

export function AdminPanel({
  date,
  schedule,
}: {
  date: string;
  schedule: ReturnType<typeof useJourneySchedule>;
}) {
  const account = useAccount();
  const [day, setDay] = useState(date);
  const assignments = schedule.schedule?.assignments ?? {};
  const saved = assignments[day] ?? "";
  const [selection, setSelection] = useState(saved);
  const [message, setMessage] = useState("");
  useEffect(() => {
    setSelection(saved);
  }, [day, saved]);
  useEffect(() => setMessage(""), [day]);
  const current = dailyJourney(
    day || date,
    undefined,
    JOURNEY_INDEX,
    assignments,
  );
  const upcoming = Array.from({ length: 14 }, (_, i) =>
    new Date((dateOrdinal(date) + i) * 86400000).toISOString().slice(0, 10),
  );
  return (
    <section className="info-view admin-panel" aria-label="Admin menu">
      <span className="overline">ADMIN · {date}</span>
      <h1 className="editorial-heading">
        A clearer <em>world view.</em>
      </h1>
      <p className="muted">
        Schedule daily Journeys and review player feedback.
      </p>
      <div className="admin-journey-card">
        <h2>Journey calendar</h2>
        <p className="muted">
          Assign a Journey to a date for everyone. Unassigned dates follow the
          automatic rotation.
        </p>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            try {
              const token = await account.accessToken();
              if (!token) {
                setMessage("Sign in again to save the schedule.");
                return;
              }
              if (await schedule.save(day, selection || undefined, token))
                setMessage(`Saved ${day} for everyone.`);
            } catch {
              setMessage("Couldn’t save the schedule. Please try again.");
            }
          }}
        >
          <div className="journey-schedule-fields">
            <label className="field">
              <span>Journey date</span>
              <input
                type="date"
                required
                value={day}
                onChange={(event) => {
                  if (event.target.value) setDay(event.target.value);
                }}
              />
            </label>
            <label className="field">
              <span>Playable Journey</span>
              <select
                value={selection}
                onChange={(event) => setSelection(event.target.value)}
              >
                <option value="">Automatic rotation</option>
                {JOURNEY_INDEX.map((journey) => (
                  <option key={journey.id} value={journey.id}>
                    {journey.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="muted">
            {day || date}: <strong>{current.title}</strong>
            {saved ? " · Assigned" : " · Rotation"}
          </p>
          <button
            className="primary-button"
            type="submit"
            disabled={!schedule.ready || schedule.busy}
          >
            {schedule.busy ? "Saving…" : "Save date assignment"}
            <span>→</span>
          </button>
        </form>
        <p role="status">{message}</p>
        {schedule.error && <p role="alert">{schedule.error}</p>}
        <button
          className="quiet-button tertiary-action"
          onClick={() => void schedule.refresh()}
          disabled={schedule.busy}
        >
          Refresh schedule
        </button>
        <small>
          Dates turn over at each player’s local midnight. Started Journeys keep
          their original edition and progress.
        </small>
      </div>
      <div className="admin-journey-card">
        <h2>Next two weeks</h2>
        <div className="journey-calendar">
          {upcoming.map((calendarDay) => (
            <button
              className="journey-calendar-day"
              key={calendarDay}
              onClick={() => setDay(calendarDay)}
              aria-pressed={calendarDay === day}
            >
              <time dateTime={calendarDay}>
                {new Date(`${calendarDay}T12:00:00`).toLocaleDateString(
                  undefined,
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </time>
              <strong>
                {
                  dailyJourney(
                    calendarDay,
                    undefined,
                    JOURNEY_INDEX,
                    assignments,
                  ).title
                }
              </strong>
              <small>
                {assignments[calendarDay] ? "Assigned" : "Rotation"}
              </small>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
