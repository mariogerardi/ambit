import { useEffect, useRef, useState } from "react";
import { JOURNEY_INDEX, loadJourney } from "../game/journeyRegistry";
import type { Journey } from "../game/questionContracts";
import type { DayRecord } from "../services/journeySchedule";
import { mechanicFor } from "../game/mechanics";
import { journeyReviewLink } from "./accountNavigation";

export type RotationFilter = "all" | "included" | "held";
export type CatalogSort = "title" | "newest" | "recent" | "never";

export function AdminJourneys({
  selectedId,
  onSelect,
  onSchedule,
  onDateSelect,
  onNavigate,
  date,
  today = date ?? "",
  records = {},
  search,
  onSearchChange,
  sort,
  onSortChange,
  rotation,
  onRotationChange,
}: {
  selectedId?: string;
  onSelect(id: string): void;
  onSchedule(id: string): void;
  onDateSelect?(date: string): void;
  onNavigate?(url: string): void;
  date?: string;
  today?: string;
  records?: Record<string, DayRecord>;
  search: string;
  onSearchChange(value: string): void;
  sort: CatalogSort;
  onSortChange(value: CatalogSort): void;
  rotation: RotationFilter;
  onRotationChange(value: RotationFilter): void;
}) {
  const [localSelectedId, setLocalSelectedId] = useState(
    selectedId ?? JOURNEY_INDEX[0]?.id,
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>();
  const [mobileDetail, setMobileDetail] = useState(false);
  const [loaded, setLoaded] = useState<Journey>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const activeId = selectedId ?? localSelectedId;
  const selected = JOURNEY_INDEX.find((entry) => entry.id === activeId);
  const journey = loaded?.id === activeId ? loaded : undefined;

  useEffect(() => {
    if (!activeId) return;
    let live = true;
    setError("");
    setSelectedQuestionId(undefined);
    void loadJourney(activeId)
      .then((value) => {
        if (live) setLoaded(value);
      })
      .catch(() => {
        if (live) setError("Couldn’t load this Journey. Please try again.");
      });
    return () => {
      live = false;
    };
  }, [activeId, retry]);

  useEffect(() => {
    if (!mobileDetail || !window.matchMedia?.("(max-width: 760px)").matches)
      return;
    inspectorHeading.current?.focus({ preventScroll: true });
    inspectorHeading.current?.scrollIntoView?.({ block: "start" });
  }, [mobileDetail]);

  const dates = (id: string) =>
    Object.values(records)
      .filter(
        (record) => record.journeyId === id && record.source !== "provisional",
      )
      .map((record) => record.day)
      .sort();
  const matches = JOURNEY_INDEX.filter((entry) => {
    const matchesSearch = `${entry.title} ${entry.description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesRotation =
      rotation === "all" ||
      (rotation === "held") === (entry.dailyEligible === false);
    return matchesSearch && matchesRotation;
  }).sort((a, b) => {
    if (sort === "newest")
      return (
        b.addedAt.localeCompare(a.addedAt) || a.title.localeCompare(b.title)
      );
    if (sort === "recent")
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

  const dateSummary = (id: string) => {
    const history = dates(id);
    if (!history.length) return "Never scheduled";
    const past = history.filter((day) => day <= today);
    const upcoming = history.find((day) => day > today);
    const shortDate = (day: string) =>
      new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    return [
      past.length ? `Last scheduled ${shortDate(past.at(-1)!)}` : "",
      upcoming ? `Next scheduled ${shortDate(upcoming)}` : "",
    ]
      .filter(Boolean)
      .join(" · ")
      .trim();
  };

  function chooseJourney(id: string) {
    setLocalSelectedId(id);
    onSelect(id);
    setMobileDetail(true);
  }

  const review = selected ? journeyReviewLink(selected.path, date) : undefined;
  const selectedQuestion = journey?.rounds.find(
    (question) => question.id === selectedQuestionId,
  );

  return (
    <div
      className={`admin-journey-library${mobileDetail ? " has-mobile-detail" : ""}`}
    >
      <h2 className="sr-only">Journeys</h2>
      <div className="admin-catalog-layout">
        <section
          className="admin-catalog-list-pane"
          aria-label="Journey catalog"
        >
          <div className="admin-library-controls">
            <label className="field admin-catalog-search">
              <span className="sr-only">Search Journeys</span>
              <input
                type="search"
                placeholder="Find a Journey…"
                aria-label="Search Journeys"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
              />
            </label>
            <div className="admin-catalog-filters">
              <label className="field">
                <span className="sr-only">Automatic rotation</span>
                <select
                  aria-label="Filter by automatic rotation"
                  value={rotation}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "all" ||
                      value === "included" ||
                      value === "held"
                    ) {
                      onRotationChange(value);
                    }
                  }}
                >
                  <option value="all">Rotation: all</option>
                  <option value="included">Rotation: included</option>
                  <option value="held">Rotation: held out</option>
                </select>
              </label>
              <label className="field">
                <span className="sr-only">Sort Journeys</span>
                <select
                  aria-label="Sort Journeys"
                  value={sort}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "title" ||
                      value === "newest" ||
                      value === "recent" ||
                      value === "never"
                    ) {
                      onSortChange(value);
                    }
                  }}
                >
                  <option value="title">Title A–Z</option>
                  <option value="newest">Recently added</option>
                  <option value="recent">Recently scheduled</option>
                  <option value="never">Never scheduled first</option>
                </select>
              </label>
            </div>
          </div>
          <div className="admin-catalog-summary">
            <span className="admin-result-count">
              {matches.length} Journeys
            </span>
          </div>
          <ul className="admin-library-list" aria-label="Journey results">
            {matches.map((entry) => {
              const isSelected = entry.id === activeId;
              return (
                <li key={entry.id} className="admin-library-row">
                  <button
                    type="button"
                    className="admin-library-title"
                    data-journey-id={entry.id}
                    aria-current={isSelected ? "true" : undefined}
                    aria-pressed={isSelected}
                    onClick={() => chooseJourney(entry.id)}
                  >
                    <span className="admin-library-title-text">
                      <strong>{entry.title}</strong>
                      <span>
                        {entry.dailyEligible === false
                          ? "Held out of daily rotation"
                          : dateSummary(entry.id)}
                      </span>
                    </span>
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!matches.length && (
            <p className="admin-empty">
              No Journeys match these filters. Adjust the search or rotation
              setting.
            </p>
          )}
        </section>

        <section
          className="admin-journey-inspector"
          aria-label="Selected Journey"
        >
          <button
            type="button"
            className="quiet-button admin-catalog-back"
            onClick={() => setMobileDetail(false)}
          >
            ← Journey catalog
          </button>
          {selected && !matches.some((entry) => entry.id === selected.id) && (
            <p className="admin-filter-selection-note" role="status">
              This Journey is outside the current search or rotation filter.{" "}
              <button
                type="button"
                className="quiet-button tertiary-action"
                onClick={() => {
                  onSearchChange("");
                  onRotationChange("all");
                }}
              >
                Clear filters
              </button>
            </p>
          )}
          {selected ? (
            <>
              <header className="admin-inspector-heading">
                <div>
                  <h3 ref={inspectorHeading} tabIndex={-1}>
                    {selected.title}
                  </h3>
                  <p>{selected.description}</p>
                </div>
              </header>
              <dl className="admin-inspector-facts">
                <div>
                  <dt>Daily rotation</dt>
                  <dd>
                    {selected.dailyEligible === false ? "Held out" : "Included"}
                  </dd>
                </div>
                <div>
                  <dt>Scheduling</dt>
                  <dd>{dateSummary(selected.id)}</dd>
                </div>
              </dl>
              <div className="admin-scheduled-dates">
                {dates(selected.id)
                  .filter((scheduled) => scheduled >= today)
                  .slice(0, 3)
                  .map((scheduled) => (
                    <button
                      type="button"
                      className="quiet-button tertiary-action"
                      key={scheduled}
                      onClick={() => onDateSelect?.(scheduled)}
                    >
                      {new Date(`${scheduled}T12:00:00`).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )}{" "}
                      →
                    </button>
                  ))}
              </div>
              <div className="admin-inspector-actions">
                {review && (
                  <a
                    className="quiet-button"
                    href={review}
                    onClick={(event) => {
                      if (onNavigate) {
                        event.preventDefault();
                        onNavigate(review);
                      }
                    }}
                  >
                    Review Journey <span aria-hidden="true">→</span>
                  </a>
                )}
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => onSchedule(selected.id)}
                >
                  Schedule this Journey <span aria-hidden="true">→</span>
                </button>
              </div>
              <section className="admin-inspector-outline">
                <header>
                  <h4>Questions</h4>
                </header>
                {error ? (
                  <div role="alert">
                    <p>{error}</p>
                    <button
                      type="button"
                      className="quiet-button"
                      onClick={() => setRetry((value) => value + 1)}
                    >
                      Retry
                    </button>
                  </div>
                ) : !journey ? (
                  <p role="status">Loading questions…</p>
                ) : (
                  <ol>
                    {journey.rounds.map((question, index) => {
                      const expanded = question.id === selectedQuestionId;
                      return (
                        <li key={question.id}>
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() =>
                              setSelectedQuestionId(
                                expanded ? undefined : question.id,
                              )
                            }
                          >
                            <span>{String(index + 1).padStart(2, "0")}</span>
                            <strong>
                              {question.progressLabel ?? question.label}
                            </strong>
                            <span aria-hidden="true">
                              <svg
                                viewBox="0 0 16 16"
                                width="16"
                                height="16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path
                                  d={expanded ? "M3 8h10" : "M3 8h10M8 3v10"}
                                />
                              </svg>
                            </span>
                          </button>
                          {expanded && selectedQuestion && (
                            <div className="admin-inspector-question-detail">
                              <span className="admin-question-mechanic">
                                {mechanicFor(selectedQuestion).label}
                              </span>
                              {selectedQuestion.leadIn && (
                                <p>{selectedQuestion.leadIn}</p>
                              )}
                              <p>{selectedQuestion.prompt}</p>
                              <a
                                className="tertiary-action"
                                href={journeyReviewLink(
                                  selected.path,
                                  date,
                                  selectedQuestion.id,
                                )}
                                onClick={(event) => {
                                  if (onNavigate) {
                                    event.preventDefault();
                                    onNavigate(
                                      journeyReviewLink(
                                        selected.path,
                                        date,
                                        selectedQuestion.id,
                                      ),
                                    );
                                  }
                                }}
                              >
                                Review this question →
                              </a>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            </>
          ) : (
            <p className="admin-empty">No Journey is selected.</p>
          )}
        </section>
      </div>
    </div>
  );
}
