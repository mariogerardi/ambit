import { useEffect, useState } from "react";
import { JOURNEY_INDEX, loadJourney } from "../game/journeyRegistry";
import type { Journey } from "../game/questionContracts";

export function AdminJourneys({
  selectedId,
  onSelect,
  onSchedule,
  onNavigate,
}: {
  selectedId?: string;
  onSelect(id: string): void;
  onSchedule(id: string): void;
  onNavigate?(url: string): void;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("title");
  const [loaded, setLoaded] = useState<Journey>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const selected = JOURNEY_INDEX.find((entry) => entry.id === selectedId);
  const journey = loaded?.id === selectedId ? loaded : undefined;
  useEffect(() => {
    if (!selectedId) return;
    let live = true;
    setError("");
    void loadJourney(selectedId)
      .then((value) => {
        if (live) setLoaded(value);
      })
      .catch(() => {
        if (live) setError("Couldn’t load this Journey. Please try again.");
      });
    return () => {
      live = false;
    };
  }, [selectedId, retry]);
  const entries = JOURNEY_INDEX.filter((entry) =>
    `${entry.title} ${entry.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  ).sort((a, b) =>
    sort === "newest"
      ? b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title)
      : a.title.localeCompare(b.title),
  );
  return (
    <div className="admin-journey-library">
      <header>
        <h2>Journey library</h2>
        <p className="muted">
          Browse and review before choosing a date to publish.
        </p>
      </header>
      <div className="admin-library-controls">
        <label className="field">
          <span>Search Journeys</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Sort Journeys</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="title">Title</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>
      <div className="admin-library-columns">
        <nav aria-label="Journey library">
          <ul className="admin-library-list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  aria-current={entry.id === selectedId ? "true" : undefined}
                  onClick={() => onSelect(entry.id)}
                >
                  <strong>{entry.title}</strong>
                  <span>{entry.description}</span>
                </button>
              </li>
            ))}
          </ul>
          {!entries.length && <p>No Journeys match your search.</p>}
        </nav>
        <section className="admin-journey-outline" aria-label="Journey outline">
          {!selected ? (
            <p>Choose a Journey to read its five questions.</p>
          ) : (
            <>
              <h3>{selected.title}</h3>
              <p>{selected.description}</p>
              <div className="admin-library-actions">
                <a
                  className="primary-button"
                  href={`${selected.path}?review=1`}
                  onClick={(event) => {
                    if (onNavigate) {
                      event.preventDefault();
                      onNavigate(`${selected.path}?review=1`);
                    }
                  }}
                >
                  Review Journey
                </a>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => onSchedule(selected.id)}
                >
                  Schedule this Journey
                </button>
              </div>
              {error ? (
                <div role="alert">
                  <p>{error}</p>
                  <button
                    className="quiet-button"
                    onClick={() => setRetry((value) => value + 1)}
                  >
                    Retry outline
                  </button>
                </div>
              ) : !journey ? (
                <p role="status">Loading questions…</p>
              ) : (
                <ol>
                  {journey.rounds.map((question) => (
                    <li key={question.id}>
                      <h4>{question.progressLabel ?? question.label}</h4>
                      <p>
                        {question.leadIn && <>{question.leadIn} </>}
                        {question.prompt}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
