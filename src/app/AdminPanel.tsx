import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { useAccount } from "../services/accounts";
import type { useJourneySchedule } from "../services/journeySchedule";
import { dailyJourney, dateOrdinal } from "./dailyProgress";
import type { AdminSection } from "./accountNavigation";
import type { DailyAttempt } from "./dailyProgress";
import { ARCHIVE_START_DATE } from "./archiveDates";

type JourneySort = "alphabetical" | "newest" | "last" | "never";
type JourneyFilter = "all" | "pool" | "unlisted";
const ADMIN_SECTIONS = ["schedule", "feedback", "tools"] as const;
const DRAFT_KEY = "ambit.admin.schedule-draft";
type ScheduleDraft = { day: string; value: string; saved: string };
function readDraft(): ScheduleDraft | undefined {
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? "null");
    if (
      draft &&
      typeof draft.day === "string" &&
      Number.isFinite(dateOrdinal(draft.day)) &&
      draft.day >= ARCHIVE_START_DATE &&
      typeof draft.saved === "string" &&
      (draft.value === "" ||
        JOURNEY_INDEX.some((journey) => journey.id === draft.value))
    )
      return draft;
  } catch {
    /* An unpublished selection is optional local state. */
  }
}
function storedChoice<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    if (allowed.includes(value as T)) return value as T;
  } catch {
    /* Display preferences remain optional. */
  }
  return fallback;
}

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
  feedback,
  embedded = false,
  section: suppliedSection,
  onSectionChange,
}: {
  date: string;
  schedule: ReturnType<typeof useJourneySchedule>;
  attempt?: DailyAttempt;
  resetReady?: boolean;
  onResetAttempt?: () => boolean;
  feedback?: ReactNode;
  embedded?: boolean;
  section?: AdminSection;
  onSectionChange?(section: AdminSection): void;
}) {
  const account = useAccount();
  const records = schedule.schedule?.records ?? {};
  const initialDay = date < ARCHIVE_START_DATE ? ARCHIVE_START_DATE : date;
  const [draft, setDraft] = useState<ScheduleDraft>(
    () =>
      readDraft() ?? {
        day: initialDay,
        value:
          records[initialDay]?.source === "assigned"
            ? (records[initialDay].journeyId ?? "")
            : "",
        saved:
          records[initialDay]?.source === "assigned"
            ? (records[initialDay].journeyId ?? "")
            : "",
      },
  );
  const [day, setDay] = useState(draft.day);
  const [month, setMonth] = useState(draft.day.slice(0, 7));
  const [localSection, setLocalSection] = useState<AdminSection>("schedule");
  const section = suppliedSection ?? localSection;
  function selectSection(next: AdminSection) {
    if (onSectionChange) onSectionChange(next);
    else setLocalSection(next);
    setPickerOpen(false);
  }
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const picker = useRef<HTMLDivElement>(null);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const editorVisit = useRef(false);
  useLayoutEffect(() => {
    if (!editorVisit.current) return;
    editorVisit.current = false;
    editorHeading.current?.focus({ preventScroll: true });
    editorHeading.current?.scrollIntoView?.({ block: "start" });
  }, [day]);
  useEffect(() => {
    void schedule.refresh(month);
  }, [month]);
  useEffect(() => {
    void account.accessToken().then((token) => {
      if (token) void schedule.refreshAll(token);
    });
  }, [schedule.refreshAll]);
  const assignments = schedule.schedule?.assignments ?? {};
  const resolve = (selectedDay: string, choices: Record<string, string>) => {
    if (selectedDay < ARCHIVE_START_DATE) return undefined;
    try {
      return dailyJourney(selectedDay, undefined, JOURNEY_INDEX, choices);
    } catch (error) {
      if (error instanceof Error && error.message === "Journey unavailable")
        return undefined;
      throw error;
    }
  };
  const current = resolve(day, assignments);
  const unavailableRecord =
    !!records[day]?.journeyId &&
    !JOURNEY_INDEX.some(
      (journey) =>
        journey.id === records[day].journeyId ||
        journey.supersedes === records[day].journeyId,
    );
  const saved =
    records[day]?.source === "assigned" ? (records[day].journeyId ?? "") : "";
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [sort, setSort] = useState<JourneySort>(() =>
    storedChoice(
      "ambit.admin.journey-sort",
      ["alphabetical", "newest", "last", "never"],
      "alphabetical",
    ),
  );
  const [filter, setFilter] = useState<JourneyFilter>(() =>
    storedChoice(
      "ambit.admin.journey-filter",
      ["all", "pool", "unlisted"],
      "all",
    ),
  );
  useEffect(() => {
    try {
      localStorage.setItem("ambit.admin.journey-sort", sort);
      localStorage.setItem("ambit.admin.journey-filter", filter);
    } catch {
      /* Display preferences remain optional. */
    }
  }, [sort, filter]);
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
  const automaticChoices = { ...assignments };
  delete automaticChoices[day];
  if (records[day]?.autoJourneyId)
    automaticChoices[day] = records[day].autoJourneyId;
  const preview =
    JOURNEY_INDEX.find((journey) => journey.id === selection) ??
    resolve(day, automaticChoices);
  const dirty = selection !== saved;
  const busy = submitting || schedule.busy;
  useEffect(() => {
    try {
      if (dirty) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      else sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* Keep the in-memory selection when browser storage is unavailable. */
    }
  }, [dirty, draft]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!pickerOpen) return;
    searchInput.current?.focus();
    const outside = (event: PointerEvent) => {
      if (!picker.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pickerOpen]);
  const scheduledDates = (id: string) =>
    Object.entries(records)
      .filter(
        ([, record]) =>
          record.day >= ARCHIVE_START_DATE &&
          record.journeyId === id &&
          record.source !== "provisional",
      )
      .map(([scheduled]) => scheduled)
      .sort();
  const displayedJourneys = JOURNEY_INDEX.filter(
    (journey) =>
      (filter === "all" || journey.availability === filter) &&
      journey.title
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
  ).sort((a, b) => {
    if (sort === "newest")
      return b.addedAt.localeCompare(a.addedAt) || a.id.localeCompare(b.id);
    if (sort === "last")
      return (
        (
          scheduledDates(b.id)
            .filter((item) => item <= date)
            .at(-1) ?? ""
        ).localeCompare(
          scheduledDates(a.id)
            .filter((item) => item <= date)
            .at(-1) ?? "",
        ) || a.title.localeCompare(b.title)
      );
    if (sort === "never")
      return (
        Number(scheduledDates(a.id).length > 0) -
          Number(scheduledDates(b.id).length > 0) ||
        a.title.localeCompare(b.title)
      );
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
  function chooseDay(next: string) {
    if (next < ARCHIVE_START_DATE) return;
    if (
      next !== day &&
      dirty &&
      !window.confirm(`Discard the unpublished change for ${formatDay(day)}?`)
    )
      return;
    setDay(next);
    setMonth(next.slice(0, 7));
    setPickerOpen(false);
    if (window.matchMedia?.("(max-width: 800px)").matches) {
      if (next !== day) editorVisit.current = true;
      else {
        editorHeading.current?.focus({ preventScroll: true });
        editorHeading.current?.scrollIntoView?.({ block: "start" });
      }
    }
  }
  function changeMonth(offset: number) {
    const next = monthStart(month, offset);
    const target = next === date.slice(0, 7) ? date : `${next}-01`;
    chooseDay(target < ARCHIVE_START_DATE ? ARCHIVE_START_DATE : target);
  }
  function chooseJourney(value: string) {
    setDraft({ day, value, saved });
    setMessage("");
    setPickerOpen(false);
    setSearch("");
    pickerButton.current?.focus();
  }
  return (
    <section
      className={`admin-panel${embedded ? " admin-embedded" : " info-view"}`}
      aria-label="Admin menu"
    >
      {!embedded && (
        <>
          <span className="overline">ADMIN</span>
          <h1 className="editorial-heading">
            A Journey for <em>every day.</em>
          </h1>
          <p className="muted">
            Choose what players discover next, and review their feedback.
          </p>
        </>
      )}
      <div
        className="admin-tabs"
        role="tablist"
        aria-label="Admin sections"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const index = ADMIN_SECTIONS.indexOf(section);
          const next =
            ADMIN_SECTIONS[
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? ADMIN_SECTIONS.length - 1
                  : (index +
                      (event.key === "ArrowLeft" ? -1 : 1) +
                      ADMIN_SECTIONS.length) %
                    ADMIN_SECTIONS.length
            ];
          selectSection(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`#admin-tab-${next}`)
            ?.focus();
        }}
      >
        {ADMIN_SECTIONS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`admin-tab-${tab}`}
            aria-selected={section === tab}
            aria-controls={`admin-${tab}`}
            tabIndex={section === tab ? 0 : -1}
            onClick={() => {
              selectSection(tab);
            }}
          >
            {tab === "schedule"
              ? "Schedule"
              : tab === "feedback"
                ? "Feedback"
                : "Tools"}
          </button>
        ))}
      </div>
      <div
        id="admin-schedule"
        className="admin-tab-panel"
        role="tabpanel"
        aria-labelledby="admin-tab-schedule"
        hidden={section !== "schedule"}
      >
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
          {unavailableRecord && (
            <p role="alert" className="schedule-notice">
              This date references a Journey no longer in the catalog.{" "}
              {day < date
                ? "Its history stays fixed."
                : "Choose another Journey or restore the automatic choice."}
            </p>
          )}
          {!schedule.ready && !schedule.error && (
            <p role="status">Opening the schedule…</p>
          )}
          <div className="journey-scheduler">
            <section className="journey-month" aria-label="Journey calendar">
              <header className="journey-month-heading">
                <div className="journey-month-navigation">
                  <button
                    className="quiet-button scheduler-icon"
                    aria-label="Previous month"
                    title="Previous month"
                    onClick={() => changeMonth(-1)}
                    disabled={busy || month <= ARCHIVE_START_DATE.slice(0, 7)}
                  >
                    ‹
                  </button>
                  <h3>
                    {new Date(`${month}-01T12:00:00`).toLocaleDateString(
                      undefined,
                      { month: "long", year: "numeric" },
                    )}
                  </h3>
                  <button
                    className="quiet-button scheduler-icon"
                    aria-label="Next month"
                    title="Next month"
                    onClick={() => changeMonth(1)}
                    disabled={busy}
                  >
                    ›
                  </button>
                </div>
                <button
                  className="quiet-button scheduler-today"
                  title="Jump to today"
                  onClick={() => chooseDay(initialDay)}
                  disabled={busy}
                >
                  Today
                </button>
              </header>
              <div className="journey-calendar-weekdays" aria-hidden="true">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (name) => (
                    <span key={name}>{name}</span>
                  ),
                )}
              </div>
              <div className="journey-calendar">
                {calendarDays(month).map((calendarDay) => {
                  const available = calendarDay >= ARCHIVE_START_DATE;
                  const journey = resolve(calendarDay, assignments);
                  const source = records[calendarDay]?.source ?? "provisional";
                  const assigned = source === "assigned";
                  const status = assigned
                    ? "Scheduled"
                    : source === "auto"
                      ? "Auto (locked)"
                      : "Auto (provisional)";
                  return (
                    <button
                      className={`journey-calendar-day${calendarDay.slice(0, 7) !== month ? " is-outside-month" : ""}${calendarDay === date ? " is-today" : ""}`}
                      key={calendarDay}
                      onClick={() => chooseDay(calendarDay)}
                      disabled={busy || !available}
                      aria-pressed={calendarDay === day}
                      aria-current={calendarDay === date ? "date" : undefined}
                      aria-label={formatDay(calendarDay)}
                      aria-describedby={`${calendarDay}-journey ${calendarDay}-status`}
                      title={
                        available
                          ? `${formatDay(calendarDay, true)} · ${journey?.title ?? "Journey unavailable"} · ${status}`
                          : "Journeys begin October 11, 2026"
                      }
                    >
                      <span className="journey-calendar-date">
                        <time dateTime={calendarDay}>
                          {Number(calendarDay.slice(-2))}
                        </time>
                        {available && (
                          <span
                            className={`schedule-dot${assigned ? " is-assigned" : source === "auto" ? " is-locked" : " is-provisional"}`}
                            aria-label={status}
                          />
                        )}
                      </span>
                      <strong id={`${calendarDay}-journey`}>
                        {available
                          ? (journey?.title ?? "Journey unavailable")
                          : ""}
                      </strong>
                      <span id={`${calendarDay}-status`} className="sr-only">
                        {available ? status : "Before the first Journey"}
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
                  <i className="schedule-dot is-locked" /> Automatic · locked
                </span>
                <span>
                  <i className="schedule-dot is-provisional" /> Automatic ·
                  provisional
                </span>
              </p>
            </section>
            <form
              className="journey-date-editor"
              aria-label="Schedule selected date"
              onSubmit={async (event) => {
                event.preventDefault();
                if (
                  day < ARCHIVE_START_DATE ||
                  pickerOpen ||
                  !dirty ||
                  busy ||
                  !schedule.ready
                )
                  return;
                if (
                  day < date &&
                  !window.confirm(
                    `Rewrite the Journey for ${formatDay(day, true)}? This changes the permanent Archive record. Players who already started keep their own Journey.`,
                  )
                )
                  return;
                setMessage("");
                setSubmitting(true);
                try {
                  const token = await account.accessToken();
                  if (!token) {
                    setMessage("Sign in again to save the schedule.");
                    return;
                  }
                  const savedChange =
                    day < date
                      ? await schedule.save(
                          day,
                          selection || undefined,
                          token,
                          true,
                        )
                      : await schedule.save(day, selection || undefined, token);
                  if (savedChange)
                    setMessage(
                      selection
                        ? `Published ${preview?.title ?? "Journey"} for ${formatDay(day)}.`
                        : `Restored automatic selection for ${formatDay(day)}.`,
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
                <h3 ref={editorHeading} tabIndex={-1}>
                  {formatDay(day, true)}
                </h3>
              </header>
              <label className="field">
                <span>Journey date</span>
                <input
                  type="date"
                  min={ARCHIVE_START_DATE}
                  required
                  value={day}
                  disabled={busy}
                  onChange={(event) => {
                    if (event.target.value) chooseDay(event.target.value);
                  }}
                />
              </label>
              <p className="schedule-current">
                Current assignment:{" "}
                <strong>{current?.title ?? "Journey unavailable"}</strong>
                <span>
                  {saved
                    ? "Manual assignment"
                    : records[day]?.source === "auto"
                      ? "Automatic · locked"
                      : "Automatic · provisional"}
                </span>
              </p>
              <div
                className="journey-picker"
                ref={picker}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && pickerOpen) {
                    event.preventDefault();
                    setPickerOpen(false);
                    pickerButton.current?.focus();
                  }
                }}
              >
                <button
                  ref={pickerButton}
                  className="journey-picker-trigger"
                  type="button"
                  aria-label="Choose a Journey"
                  aria-expanded={pickerOpen}
                  aria-controls="admin-journey-picker"
                  aria-haspopup="dialog"
                  disabled={busy || !schedule.ready}
                  onClick={() => setPickerOpen((open) => !open)}
                >
                  <span>Choose a Journey</span>
                  <span aria-hidden="true">⌄</span>
                </button>
                {pickerOpen && (
                  <div
                    id="admin-journey-picker"
                    className="journey-picker-popover"
                    role="dialog"
                    aria-label="Choose a Journey"
                  >
                    <div className="journey-picker-search">
                      <label className="field">
                        <span>Search Journeys</span>
                        <input
                          ref={searchInput}
                          type="search"
                          value={search}
                          placeholder="Search by title"
                          onChange={(event) => setSearch(event.target.value)}
                        />
                      </label>
                      <button
                        type="button"
                        className="quiet-button"
                        aria-label="Close Journey picker"
                        onClick={() => {
                          setPickerOpen(false);
                          pickerButton.current?.focus();
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="journey-list-controls">
                      <label className="field">
                        <span>Sort Journeys</span>
                        <select
                          value={sort}
                          onChange={(event) =>
                            setSort(event.target.value as JourneySort)
                          }
                        >
                          <option value="alphabetical">Alphabetical</option>
                          <option value="newest">Newest first</option>
                          <option value="last">Last scheduled</option>
                          <option value="never">Never scheduled</option>
                        </select>
                      </label>
                      <label className="field">
                        <span>Show Journeys</span>
                        <select
                          value={filter}
                          onChange={(event) =>
                            setFilter(event.target.value as JourneyFilter)
                          }
                        >
                          <option value="all">All</option>
                          <option value="pool">In pool</option>
                          <option value="unlisted">Unlisted</option>
                        </select>
                      </label>
                    </div>

                    <ul
                      className="journey-catalog-list"
                      aria-label="Available Journeys"
                    >
                      <li>
                        <button
                          type="button"
                          aria-pressed={selection === ""}
                          onClick={() => chooseJourney("")}
                        >
                          <strong>Automatic selection</strong>
                          <span className="muted">
                            Use the shared daily rotation.
                          </span>
                        </button>
                      </li>
                      {displayedJourneys.map((journey) => {
                        const dates = scheduledDates(journey.id);
                        const nextAssigned = Object.entries(records)
                          .filter(
                            ([scheduled, record]) =>
                              scheduled > date &&
                              record.source === "assigned" &&
                              record.journeyId === journey.id,
                          )
                          .map(([scheduled]) => scheduled)
                          .sort()[0];
                        return (
                          <li key={journey.id}>
                            <button
                              type="button"
                              aria-pressed={selection === journey.id}
                              data-journey-id={journey.id}
                              onClick={() => chooseJourney(journey.id)}
                            >
                              <strong>{journey.title}</strong>
                              <span className="muted">
                                {journey.availability === "pool"
                                  ? "In pool"
                                  : "Unlisted"}{" "}
                                · Last:{" "}
                                {dates.filter((item) => item <= date).at(-1) ??
                                  "Never"}{" "}
                                · Next: {nextAssigned ?? "None"}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    {!displayedJourneys.length && (
                      <p className="schedule-notice" role="status">
                        No Journeys match your search and filters.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <article
                className={`scheduled-journey-preview${dirty ? " is-draft" : ""}`}
                aria-label="Journey preview"
              >
                <span className="schedule-preview-label">
                  {dirty
                    ? "Unpublished change"
                    : saved
                      ? "Scheduled"
                      : records[day]?.source === "auto"
                        ? "Auto (locked)"
                        : "Auto (provisional)"}
                </span>
                <h4>{preview?.title ?? "Journey unavailable"}</h4>
                {preview ? (
                  <>
                    <p>{preview.description}</p>
                    <a
                      href={preview.path}
                      target="_blank"
                      rel="noreferrer"
                      className="tertiary-action"
                    >
                      Preview five questions <span aria-hidden="true">↗</span>
                    </a>
                  </>
                ) : (
                  <p>This saved Journey is no longer in the catalog.</p>
                )}
              </article>
              <div className="journey-assignment-actions">
                <button
                  className="primary-button"
                  type="submit"
                  disabled={!schedule.ready || busy || !dirty}
                >
                  {busy
                    ? "Publishing…"
                    : !dirty
                      ? "Assignment up to date"
                      : selection
                        ? `Assign for ${formatDay(day).replace(/^[^,]+, /, "")}`
                        : "Restore automatic selection"}
                  <span aria-hidden="true">→</span>
                </button>
                {saved && selection && (
                  <button
                    type="button"
                    className="quiet-button tertiary-action schedule-restore"
                    disabled={busy}
                    onClick={() => chooseJourney("")}
                  >
                    Use automatic selection instead
                  </button>
                )}
                {dirty && (
                  <button
                    type="button"
                    className="quiet-button schedule-discard"
                    disabled={busy}
                    onClick={() => {
                      setDraft({ day, value: saved, saved });
                      setMessage("");
                    }}
                  >
                    Discard change
                  </button>
                )}
                {message && (
                  <p className="schedule-notice" role="status">
                    {message}
                  </p>
                )}
              </div>
            </form>
          </div>
          <p className="schedule-footnote">
            Unassigned days use a shared automatic choice. Today and future
            dates are editable. Rewriting a past day requires confirmation;
            players who already started keep their Journey.
          </p>
        </div>
      </div>
      <div
        id="admin-feedback"
        className="admin-tab-panel"
        role="tabpanel"
        aria-labelledby="admin-tab-feedback"
        hidden={section !== "feedback"}
      >
        {feedback}
      </div>
      <div
        id="admin-tools"
        className="admin-tab-panel admin-tools"
        role="tabpanel"
        aria-labelledby="admin-tab-tools"
        hidden={section !== "tools"}
      >
        <section className="admin-reset" aria-label="Your Journey attempt">
          <div>
            <h2>Reset today’s run</h2>
            <p className="muted">
              {attempt
                ? `${JOURNEY_INDEX.find((journey) => journey.id === attempt.journeyId)?.title ?? "Today's Journey"} · ${attempt.game.answers.length} of 5 answered.`
                : "You have no Journey attempt for today."}
            </p>
          </div>
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
      </div>
    </section>
  );
}
