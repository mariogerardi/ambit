import { useEffect, useState } from "react";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import type { JourneySummary } from "../game/journeyRegistry";
import { dailyJourney } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
export function AdminPanel({
  date,
  progress,
  onSet,
  catalog = JOURNEY_INDEX,
  labels = {},
}: {
  date: string;
  progress: DailyProgress;
  onSet(journeyId?: string): void;
  catalog?: JourneySummary[];
  labels?: Record<string, string>;
}) {
  const saved = progress.overrides?.[date] ?? "";
  const [selection, setSelection] = useState(saved);
  useEffect(() => setSelection(saved), [date, saved]);
  const current = dailyJourney(date, progress, catalog);
  return (
    <section className="info-view admin-panel" aria-label="Admin menu">
      <span className="overline">ADMIN · {date}</span>
      <h1 className="editorial-heading">
        A clearer <em>world view.</em>
      </h1>
      <p className="muted">
        Review player feedback and choose a Journey to play on this device.
      </p>
      <div className="admin-journey-card">
        <h2>Today’s Journey</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSet(selection || undefined);
          }}
        >
          <label className="field">
            <span>Playable Journey</span>
            <select
              value={selection}
              onChange={(event) => setSelection(event.target.value)}
            >
              <option value="">Automatic rotation</option>
              {catalog.map((journey, index) => (
                <option key={journey.id} value={journey.id}>
                  {`${index < JOURNEY_INDEX.length ? `Journey ${index + 1}` : (labels[journey.id] ?? `Local Journey ${index - JOURNEY_INDEX.length + 1}`)} · ${journey.rounds.map((q) => q.progressLabel ?? q.label).join(" / ")}`}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button" type="submit">
            Set today’s Journey <span>→</span>
          </button>
        </form>
        <p role="status">{`${catalog.indexOf(current) < JOURNEY_INDEX.length ? `Journey ${catalog.indexOf(current) + 1}` : (labels[current.id] ?? `Local Journey ${catalog.indexOf(current) - JOURNEY_INDEX.length + 1}`)} is active.`}</p>
        <small>
          Applies on this device until local midnight. Each Journey’s progress
          is kept.
        </small>
      </div>
    </section>
  );
}
