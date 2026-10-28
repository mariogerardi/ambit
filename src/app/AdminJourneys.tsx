import { useEffect, useState } from "react";
import { JOURNEY_INDEX, loadJourney } from "../game/journeyRegistry";
import type { Journey } from "../game/questionContracts";
import type { DayRecord } from "../services/journeySchedule";
import { journeyReviewLink } from "./accountNavigation";

export function AdminJourneys({
  selectedId,
  onSelect,
  onSchedule,
  onNavigate,
  date,
  today = date ?? "",
  records = {},
  picking = false,
}: {
  selectedId?: string;
  onSelect(id: string): void;
  onSchedule(id: string): void;
  onNavigate?(url: string): void;
  date?: string;
  today?: string;
  records?: Record<string, DayRecord>;
  picking?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState<string>();
  const [loaded, setLoaded] = useState<Journey>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const selected = JOURNEY_INDEX.find((entry) => entry.id === expandedId);
  const journey = loaded?.id === expandedId ? loaded : undefined;
  useEffect(() => {
    if (!expandedId) return;
    let live = true;
    setError("");
    void loadJourney(expandedId)
      .then((value) => {
        if (live) setLoaded(value);
      })
      .catch(() => {
        if (live) setError("Couldn’t load this Journey. Please try again.");
      });
    return () => {
      live = false;
    };
  }, [expandedId, retry]);
  const dates = (id: string) =>
    Object.values(records)
      .filter(
        (record) => record.journeyId === id && record.source !== "provisional",
      )
      .map((record) => record.day)
      .sort();
  const entries = JOURNEY_INDEX.filter((entry) =>
    `${entry.title} ${entry.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  ).sort((a, b) => {
    if (sort === "newest")
      return (
        b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title)
      );
    if (sort === "last")
      return (
        (
          dates(b.id)
            .filter((day) => day <= today)
            .at(-1) ?? ""
        ).localeCompare(
          dates(a.id)
            .filter((day) => day <= today)
            .at(-1) ?? "",
        ) || a.title.localeCompare(b.title)
      );
    if (sort === "never")
      return (
        Number(dates(a.id).length > 0) - Number(dates(b.id).length > 0) ||
        a.title.localeCompare(b.title)
      );
    return a.title.localeCompare(b.title);
  });
  const shortDate = (day?: string) =>
    day
      ? new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—";
  function reviewLink(path: string, label: string) {
    const href = journeyReviewLink(path, date);
    return (
      <a
        className="tertiary-action"
        href={href}
        onClick={(event) => {
          if (onNavigate) {
            event.preventDefault();
            onNavigate(href);
          }
        }}
      >
        {label} <span aria-hidden="true">→</span>
      </a>
    );
  }
  return (
    <div className={`admin-journey-library${picking ? " is-picking" : ""}`}>
      {!picking && (
        <header>
          <h2>Journeys</h2>
          <p className="muted">Review the questions, then choose a day.</p>
        </header>
      )}
      <div className="admin-library-controls">
        <label className="field">
          <span className="sr-only">Search Journeys</span>
          <input
            type="search"
            placeholder="Find a Journey…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="sr-only">Sort Journeys</span>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="title">Title A–Z</option>
            <option value="last">Last scheduled</option>
            <option value="never">Unscheduled first</option>
          </select>
        </label>
      </div>
      <ul
        className={`admin-library-list${picking ? " journey-catalog-list" : ""}`}
        aria-label={picking ? "Available Journeys" : "Journey library"}
      >
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="admin-library-row"
            data-selected={entry.id === selectedId}
          >
            <div className="admin-library-row-main">
              <button
                type="button"
                className="admin-library-title"
                aria-expanded={expandedId === entry.id}
                onClick={() => {
                  onSelect(entry.id);
                  setExpandedId(expandedId === entry.id ? undefined : entry.id);
                }}
              >
                <strong>{entry.title}</strong>
                <span aria-hidden="true">
                  {expandedId === entry.id ? "−" : "+"}
                </span>
              </button>
              <p className="admin-library-description">{entry.description}</p>
              <p
                className="admin-library-history"
                title="Scheduling dates from loaded history"
              >
                Last{" "}
                {shortDate(
                  dates(entry.id)
                    .filter((day) => day <= today)
                    .at(-1),
                )}{" "}
                <span aria-hidden="true">·</span> Next{" "}
                {shortDate(dates(entry.id).find((day) => day > today))}
              </p>
            </div>
            <div className="admin-library-row-actions">
              {reviewLink(entry.path, "Review")}
              <button
                type="button"
                className="quiet-button admin-schedule-action"
                data-journey-id={entry.id}
                aria-pressed={picking ? entry.id === selectedId : undefined}
                onClick={() => onSchedule(entry.id)}
              >
                {picking ? "Choose" : "Schedule"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
            {expandedId === entry.id && selected && (
              <section
                className="admin-journey-outline"
                aria-label={`${entry.title} outline`}
              >
                <header>
                  <h3>Five stops</h3>
                  <div className="admin-library-actions">
                    {reviewLink(entry.path, "Review Journey")}
                    <button
                      type="button"
                      className="quiet-button tertiary-action"
                      onClick={() => onSchedule(entry.id)}
                    >
                      {picking
                        ? "Choose this Journey"
                        : "Schedule this Journey"}
                    </button>
                  </div>
                </header>
                {error ? (
                  <div role="alert">
                    <p>{error}</p>
                    <button
                      type="button"
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
              </section>
            )}
          </li>
        ))}
      </ul>
      {!entries.length && (
        <p className="admin-empty">
          No Journeys match “{search}”. Try a different title.
        </p>
      )}
    </div>
  );
}
