import { useEffect, useRef, useState } from "react";
import { JOURNEY_INDEX, loadJourney } from "../game/journeyRegistry";
import type { Journey } from "../game/questionContracts";
import type { DayRecord } from "../services/journeySchedule";
import { journeyReviewLink } from "./accountNavigation";

type RotationFilter = "all" | "included" | "held";
type CatalogSort = "title" | "newest" | "recent" | "never";

export function AdminJourneys({
  selectedId,
  onSelect,
  onSchedule,
  onNavigate,
  date,
  today = date ?? "",
  records = {},
}: {
  selectedId?: string;
  onSelect(id: string): void;
  onSchedule(id: string): void;
  onNavigate?(url: string): void;
  date?: string;
  today?: string;
  records?: Record<string, DayRecord>;
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<CatalogSort>("title");
  const [rotation, setRotation] = useState<RotationFilter>("all");
  const [localSelectedId, setLocalSelectedId] = useState(
    selectedId ?? JOURNEY_INDEX[0]?.id,
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>();
  const [mobileDetail, setMobileDetail] = useState(false);
  const [loaded, setLoaded] = useState<Journey>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const inspectorHeading = useRef<HTMLHeadingElement>(null);
  const diagnosticsDialog = useRef<HTMLDialogElement>(null);
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
      <header className="admin-section-heading">
        <div>
          <h2>Journeys</h2>
          <p>Find a Journey, inspect its route, then review or schedule it.</p>
        </div>
        <button
          type="button"
          className="quiet-button admin-catalog-help-trigger"
          aria-haspopup="dialog"
          onClick={() => diagnosticsDialog.current?.showModal()}
        >
          Catalog status
        </button>
      </header>
      <dialog
        ref={diagnosticsDialog}
        className="admin-info-dialog"
        aria-labelledby="admin-catalog-info-title"
      >
        <header>
          <div>
            <p className="overline">JOURNEY CATALOG</p>
            <h2 id="admin-catalog-info-title">Catalog status</h2>
          </div>
          <button
            type="button"
            className="quiet-button"
            aria-label="Close catalog status"
            onClick={() => diagnosticsDialog.current?.close()}
          >
            ×
          </button>
        </header>
        <div className="admin-info-dialog-content">
          <p>
            This list reflects the frontend catalog only. Backend catalog
            deployment is not reported here; successful schedule publication
            confirms that the schedule service accepted the assignment.
          </p>
          <p>
            Automatic rotation eligibility is catalog metadata. It does not
            confirm backend activation for manual scheduling.
          </p>
          <a
            href="https://github.com/mariogerardi/ambit/blob/main/docs/HOSTING.md#journey-catalog-activation"
            target="_blank"
            rel="noreferrer"
          >
            Backend catalog activation steps
          </a>
          {import.meta.env.DEV && (
            <a href="/review/journeys.html">Open local Journey Workbench</a>
          )}
        </div>
      </dialog>

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
                onChange={(event) => setSearch(event.target.value)}
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
                    )
                      setRotation(value);
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
                    )
                      setSort(value);
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
                          : "In daily rotation"}
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
          {selected ? (
            <>
              <header className="admin-inspector-heading">
                <div>
                  <p className="admin-inspector-status">
                    {selected.dailyEligible === false
                      ? "Held out of daily rotation"
                      : "In daily rotation"}
                    <span aria-hidden="true"> · </span>
                    {dateSummary(selected.id)}
                  </p>
                  <h3 ref={inspectorHeading} tabIndex={-1}>
                    {selected.title}
                  </h3>
                  <p>{selected.description}</p>
                </div>
              </header>
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
                  <span>
                    {journey
                      ? journey.rounds.length
                      : "Loading"}
                  </span>
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
                              {expanded ? "−" : "+"}
                            </span>
                          </button>
                          {expanded && selectedQuestion && (
                            <div className="admin-inspector-question-detail">
                              {selectedQuestion.leadIn && (
                                <p>{selectedQuestion.leadIn}</p>
                              )}
                              <p>{selectedQuestion.prompt}</p>
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
