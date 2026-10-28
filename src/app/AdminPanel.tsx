import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { useAccount } from "../services/accounts";
import type { useJourneySchedule } from "../services/journeySchedule";
import { dailyJourney, dateOrdinal } from "./dailyProgress";
import type { AdminSection } from "./accountNavigation";
import type { DailyAttempt } from "./dailyProgress";
import { ARCHIVE_START_DATE } from "./archiveDates";
import { AdminJourneys } from "./AdminJourneys";
import { useToast } from "./Toast";
import { ActionIcon } from "./ActionIcon";
import { AdminConfirmation } from "./AdminConfirmation";
import { adminDate, journeyReviewLink } from "./accountNavigation";

const ADMIN_SECTIONS = ["schedule", "journeys", "feedback"] as const;
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
      draft.value !== draft.saved &&
      (draft.value === "" ||
        JOURNEY_INDEX.some((journey) => journey.id === draft.value))
    )
      return draft;
  } catch {
    /* An unpublished selection is optional local state. */
  }
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
  initialJourneyId,
  initialDate,
  onNavigate,
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
  initialJourneyId?: string;
  initialDate?: string;
  onNavigate?(url: string): void;
}) {
  const account = useAccount();
  const notifications = useToast();
  const records = schedule.schedule?.records ?? {};
  const initialDay =
    adminDate(initialDate) ??
    (date < ARCHIVE_START_DATE ? ARCHIVE_START_DATE : date);
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
  const requestedSection = suppliedSection ?? localSection;
  const section = requestedSection === "tools" ? "schedule" : requestedSection;
  const [libraryId, setLibraryId] = useState<string>();
  const [candidateId, setCandidateId] = useState<string>();
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
  }>();
  const pendingConfirmation = useRef<((accepted: boolean) => void) | undefined>(
    undefined,
  );
  const confirmChange = useCallback(
    (title: string, message: string, confirmLabel: string) =>
      new Promise<boolean>((resolve) => {
        pendingConfirmation.current?.(false);
        pendingConfirmation.current = resolve;
        setConfirmation({ title, message, confirmLabel });
      }),
    [],
  );
  function finishConfirmation(accepted: boolean) {
    pendingConfirmation.current?.(accepted);
    pendingConfirmation.current = undefined;
    setConfirmation(undefined);
  }
  useEffect(
    () => () => {
      pendingConfirmation.current?.(false);
    },
    [],
  );
  const incomingRequest = useRef("");
  useEffect(() => {
    if (!JOURNEY_INDEX.some((entry) => entry.id === initialJourneyId)) return;
    setLibraryId(initialJourneyId);
    const key = `${initialJourneyId}/${initialDate ?? ""}/${suppliedSection}`;
    if (suppliedSection === "schedule" && incomingRequest.current !== key) {
      incomingRequest.current = key;
      setCandidateId(initialJourneyId);
    }
  }, [initialJourneyId, initialDate, suppliedSection]);
  function selectSection(next: AdminSection) {
    if (onSectionChange) onSectionChange(next);
    else setLocalSection(next);
    setPickerOpen(false);
  }
  const [scheduleView, setScheduleView] = useState<"upcoming" | "month">(
    "upcoming",
  );
  const [agendaStart, setAgendaStart] = useState(initialDay);
  const [editingDate, setEditingDate] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const picker = useRef<HTMLDivElement>(null);
  const pickerButton = useRef<HTMLButtonElement>(null);
  const editorHeading = useRef<HTMLHeadingElement>(null);
  const editorVisit = useRef(false);
  useLayoutEffect(() => {
    if (!editorVisit.current) return;
    editorVisit.current = false;
    editorHeading.current?.focus({ preventScroll: true });
    editorHeading.current?.scrollIntoView?.({ block: "start" });
  }, [day]);
  useEffect(() => {
    void account.accessToken().then((token) => {
      if (token) void schedule.refreshAll(token);
    });
  }, [schedule.refreshAll]);
  useEffect(() => {
    if (!schedule.loadedMonths.includes(month)) {
      void schedule.refresh(month);
      return;
    }
    if (scheduleView !== "upcoming") return;
    const end = new Date((dateOrdinal(agendaStart) + 13) * 86400000)
      .toISOString()
      .slice(0, 7);
    if (end !== month && !schedule.loadedMonths.includes(end))
      void schedule.refresh(end);
  }, [agendaStart, scheduleView, month, schedule.loadedMonths]);
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
  const [messageSuccess, setMessageSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  useEffect(() => setResetMessage(""), [date]);
  const dayLoaded =
    !!records[day] || schedule.loadedMonths.includes(day.slice(0, 7));
  // A server refresh is not an edit. Preserve a restored edit's original
  // baseline until this date is loaded, including a choice to restore automatic.
  useEffect(() => {
    if (!schedule.ready) return;
    setDraft((current) => {
      if (
        current.day !== day ||
        current.value === current.saved ||
        (dayLoaded && current.value === saved)
      )
        return { day, value: saved, saved };
      return current;
    });
  }, [day, saved, dayLoaded, schedule.ready]);
  useEffect(() => setMessage(""), [day]);
  const edited = draft.day === day && draft.value !== draft.saved;
  const selection = edited ? draft.value : saved;
  const automaticChoices = { ...assignments };
  delete automaticChoices[day];
  if (records[day]?.autoJourneyId)
    automaticChoices[day] = records[day].autoJourneyId;
  const preview =
    JOURNEY_INDEX.find((journey) => journey.id === selection) ??
    resolve(day, automaticChoices);
  const dirty = edited && (!dayLoaded || selection !== saved);
  const busy = submitting || schedule.busy;
  useEffect(() => {
    if (candidateId === undefined || !dayLoaded) return;
    let live = true;
    async function stage() {
      if (
        dirty &&
        selection !== candidateId &&
        !(await confirmChange(
          "Replace this draft?",
          `The unpublished change for ${formatDay(day)} will be replaced. Nothing has been published.`,
          "Replace draft",
        ))
      ) {
        if (live) setCandidateId(undefined);
        return;
      }
      if (!live) return;
      setDraft({ day, value: candidateId!, saved });
      setCandidateId(undefined);
      setMessage("");
    }
    void stage();
    return () => {
      live = false;
    };
  }, [candidateId, dayLoaded, day, saved, dirty, selection, confirmChange]);

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
    picker.current
      ?.querySelector<HTMLInputElement>('input[type="search"]')
      ?.focus();
    const outside = (event: PointerEvent) => {
      if (!picker.current?.contains(event.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [pickerOpen]);
  async function chooseDay(next: string) {
    if (next < ARCHIVE_START_DATE) return false;
    if (
      next !== day &&
      dirty &&
      !(await confirmChange(
        "Leave this unpublished change?",
        `The draft for ${formatDay(day)} will be discarded. The published assignment will stay as it is.`,
        "Discard change",
      ))
    )
      return false;
    setDay(next);
    setMonth(next.slice(0, 7));
    if (next < agendaStart || dateOrdinal(next) > dateOrdinal(agendaStart) + 13)
      setAgendaStart(next);
    setEditingDate(false);
    setPickerOpen(false);
    if (window.matchMedia?.("(max-width: 800px)").matches) {
      if (next !== day) editorVisit.current = true;
      else {
        editorHeading.current?.focus({ preventScroll: true });
        editorHeading.current?.scrollIntoView?.({ block: "start" });
      }
    }
    return true;
  }
  useEffect(() => {
    const next = adminDate(initialDate);
    if (next && next !== day) void chooseDay(next);
  }, [initialDate]);
  function movePublishDate(next: string) {
    if (!adminDate(next) || next === day) return;
    if (!dirty) {
      void chooseDay(next);
      return;
    }
    const baseline =
      records[next]?.source === "assigned"
        ? (records[next].journeyId ?? "")
        : "";
    setDay(next);
    setMonth(next.slice(0, 7));
    setAgendaStart(next);
    setDraft({ day: next, value: selection, saved: baseline });
    setCandidateId(selection);
    setPickerOpen(false);
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
      <div className="admin-workbench">
        <div
          className="admin-tabs"
          role="tablist"
          aria-label="Admin sections"
          aria-orientation="horizontal"
          onKeyDown={(event) => {
            if (
              ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
              ].includes(event.key)
            )
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
                        (["ArrowLeft", "ArrowUp"].includes(event.key)
                          ? -1
                          : 1) +
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
              <ActionIcon
                name={
                  tab === "schedule"
                    ? "archive"
                    : tab === "journeys"
                      ? "journey"
                      : tab === "feedback"
                        ? "review"
                        : "settings"
                }
              />
              <span>
                {tab === "schedule"
                  ? "Schedule"
                  : tab === "journeys"
                    ? "Journeys"
                    : tab === "feedback"
                      ? "Feedback"
                      : "Tools"}
              </span>
            </button>
          ))}
        </div>
        <div className="admin-workbench-main">
          <div
            id="admin-journeys"
            className="admin-tab-panel"
            role="tabpanel"
            aria-labelledby="admin-tab-journeys"
            hidden={section !== "journeys"}
          >
            {section === "journeys" && (
              <AdminJourneys
                selectedId={libraryId}
                onSelect={setLibraryId}
                onNavigate={onNavigate}
                date={day}
                today={date}
                records={records}
                onSchedule={(id) => {
                  setCandidateId(id);
                  selectSection("schedule");
                }}
              />
            )}
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
                  <h2>Schedule</h2>
                </div>
                <button
                  className="quiet-button scheduler-icon"
                  aria-label="Refresh schedule"
                  title="Refresh schedule"
                  onClick={() => void schedule.refresh(month)}
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
                <div className="admin-schedule-browser">
                  <div
                    className="admin-view-switch"
                    role="group"
                    aria-label="Schedule view"
                  >
                    <button
                      type="button"
                      aria-pressed={scheduleView === "upcoming"}
                      onClick={() => setScheduleView("upcoming")}
                    >
                      Upcoming
                    </button>
                    <button
                      type="button"
                      aria-pressed={scheduleView === "month"}
                      onClick={() => setScheduleView("month")}
                    >
                      Month
                    </button>
                  </div>
                  {scheduleView === "upcoming" && (
                    <section
                      className="admin-agenda"
                      aria-label="Upcoming Journeys"
                    >
                      <header>
                        <div>
                          <span className="overline">Two-week schedule</span>
                          <h3>{formatDay(agendaStart)}</h3>
                        </div>
                        <div className="admin-agenda-navigation">
                          <button
                            type="button"
                            className="quiet-button scheduler-icon"
                            aria-label="Previous two weeks"
                            disabled={busy || agendaStart <= ARCHIVE_START_DATE}
                            onClick={() => {
                              const next = new Date(
                                (dateOrdinal(agendaStart) - 14) * 86400000,
                              )
                                .toISOString()
                                .slice(0, 10);
                              void chooseDay(
                                next < ARCHIVE_START_DATE
                                  ? ARCHIVE_START_DATE
                                  : next,
                              );
                            }}
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className="quiet-button"
                            disabled={busy}
                            onClick={() => {
                              const next =
                                date < ARCHIVE_START_DATE
                                  ? ARCHIVE_START_DATE
                                  : date;
                              void chooseDay(next).then((changed) => {
                                if (changed) setAgendaStart(next);
                              });
                            }}
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            className="quiet-button scheduler-icon"
                            aria-label="Next two weeks"
                            disabled={busy}
                            onClick={() => {
                              const next = new Date(
                                (dateOrdinal(agendaStart) + 14) * 86400000,
                              )
                                .toISOString()
                                .slice(0, 10);
                              void chooseDay(next);
                            }}
                          >
                            ›
                          </button>
                        </div>
                      </header>
                      <ol>
                        {Array.from({ length: 14 }, (_, index) =>
                          new Date(
                            (dateOrdinal(agendaStart) + index) * 86400000,
                          )
                            .toISOString()
                            .slice(0, 10),
                        ).map((agendaDay) => {
                          const journey = resolve(agendaDay, assignments);
                          const source = records[agendaDay]?.source;
                          const loaded =
                            !!records[agendaDay] ||
                            schedule.loadedMonths.includes(
                              agendaDay.slice(0, 7),
                            );
                          return (
                            <li key={agendaDay}>
                              <button
                                type="button"
                                aria-label={formatDay(agendaDay)}
                                aria-pressed={day === agendaDay}
                                disabled={busy}
                                onClick={() => void chooseDay(agendaDay)}
                              >
                                <time dateTime={agendaDay}>
                                  <strong>
                                    {new Date(
                                      `${agendaDay}T12:00:00`,
                                    ).toLocaleDateString(undefined, {
                                      day: "numeric",
                                    })}
                                  </strong>
                                  <span>
                                    {new Date(
                                      `${agendaDay}T12:00:00`,
                                    ).toLocaleDateString(undefined, {
                                      weekday: "short",
                                      month: "short",
                                    })}
                                  </span>
                                </time>
                                <span className="admin-agenda-journey">
                                  <strong>
                                    {journey?.title ?? "Journey unavailable"}
                                  </strong>
                                  <span>
                                    {agendaDay === date ? "Today · " : ""}
                                    {!loaded
                                      ? "Loading assignment…"
                                      : source === "assigned"
                                        ? "Scheduled"
                                        : source === "auto"
                                          ? "Published automatically"
                                          : "Automatic rotation"}
                                  </span>
                                </span>
                                <span aria-hidden="true">→</span>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  )}

                  <section
                    className="journey-month"
                    hidden={scheduleView !== "month"}
                    aria-label="Journey calendar"
                  >
                    <header className="journey-month-heading">
                      <div className="journey-month-navigation">
                        <button
                          className="quiet-button scheduler-icon"
                          aria-label="Previous month"
                          title="Previous month"
                          onClick={() => changeMonth(-1)}
                          disabled={
                            busy || month <= ARCHIVE_START_DATE.slice(0, 7)
                          }
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
                        onClick={() =>
                          chooseDay(
                            date < ARCHIVE_START_DATE
                              ? ARCHIVE_START_DATE
                              : date,
                          )
                        }
                        disabled={busy}
                      >
                        Today
                      </button>
                    </header>
                    <div
                      className="journey-calendar-weekdays"
                      aria-hidden="true"
                    >
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
                        const source =
                          records[calendarDay]?.source ?? "provisional";
                        const assigned = source === "assigned";
                        const status = assigned
                          ? "Scheduled"
                          : source === "auto"
                            ? "Published automatically"
                            : "Planned automatically";
                        return (
                          <button
                            className={`journey-calendar-day${calendarDay.slice(0, 7) !== month ? " is-outside-month" : ""}${calendarDay === date ? " is-today" : ""}`}
                            key={calendarDay}
                            onClick={() => chooseDay(calendarDay)}
                            disabled={busy || !available}
                            aria-pressed={calendarDay === day}
                            aria-current={
                              calendarDay === date ? "date" : undefined
                            }
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
                            <span
                              id={`${calendarDay}-status`}
                              className="sr-only"
                            >
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
                        <i className="schedule-dot is-locked" /> Published
                        automatically
                      </span>
                      <span>
                        <i className="schedule-dot is-provisional" /> Planned
                        automatically
                      </span>
                    </p>
                  </section>
                </div>
                <form
                  className="journey-date-editor"
                  data-dirty={dirty}
                  aria-label="Schedule selected date"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (
                      day < ARCHIVE_START_DATE ||
                      pickerOpen ||
                      !dirty ||
                      busy ||
                      !dayLoaded ||
                      candidateId !== undefined ||
                      !schedule.ready
                    )
                      return;
                    if (
                      day < date &&
                      !(await confirmChange(
                        "Rewrite this Archive day?",
                        `This changes the permanent assignment for ${formatDay(day, true)}. Players who already started keep their own Journey.`,
                        "Rewrite Archive day",
                      ))
                    )
                      return;
                    setMessage("");
                    setSubmitting(true);
                    try {
                      const token = await account.accessToken();
                      if (!token) {
                        setMessageSuccess(false);
                        setMessage("Sign in again to save the schedule.");
                        notifications.notify(
                          "Sign in again to save the schedule.",
                          { tone: "error" },
                        );
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
                          : await schedule.save(
                              day,
                              selection || undefined,
                              token,
                            );
                      if (savedChange) {
                        setMessageSuccess(true);
                        const confirmation = selection
                          ? `Published ${preview?.title ?? "Journey"} for ${formatDay(day)}.`
                          : `Restored automatic selection for ${formatDay(day)}.`;
                        setMessage(confirmation);
                        notifications.notify(confirmation);
                      } else
                        notifications.notify(
                          "Couldn’t save the schedule. Your selection is still a draft.",
                          { tone: "error" },
                        );
                    } catch {
                      setMessageSuccess(false);
                      setMessage(
                        "Couldn’t save the schedule. Please try again.",
                      );
                      notifications.notify(
                        "Couldn’t save the schedule. Please try again.",
                        { tone: "error" },
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                >
                  <header>
                    <span className="overline">
                      {dirty ? "Proposed assignment" : "Scheduled Journey"}
                    </span>
                    <h3 ref={editorHeading} tabIndex={-1}>
                      {formatDay(day, true)}
                    </h3>
                    <button
                      type="button"
                      className="quiet-button tertiary-action"
                      onClick={() => setEditingDate((open) => !open)}
                      aria-expanded={editingDate}
                      hidden={dirty}
                    >
                      Change date
                    </button>
                  </header>
                  <label className="field" hidden={!editingDate && !dirty}>
                    <span>Publish date</span>
                    <input
                      type="date"
                      min={ARCHIVE_START_DATE}
                      required
                      value={day}
                      disabled={busy}
                      onChange={(event) => {
                        if (event.target.value)
                          movePublishDate(event.target.value);
                      }}
                    />
                  </label>
                  <p className="schedule-current">
                    Current assignment:{" "}
                    <strong>{current?.title ?? "Journey unavailable"}</strong>
                    <span>
                      {saved
                        ? "Chosen by you"
                        : records[day]?.source === "auto"
                          ? "Published automatically"
                          : "Planned automatically"}
                    </span>
                  </p>
                  <article
                    className={`scheduled-journey-preview${dirty ? " is-draft" : ""}`}
                    aria-label="Journey preview"
                  >
                    <span className="schedule-preview-label">
                      {dirty
                        ? "Unpublished change"
                        : saved
                          ? "Current Journey"
                          : records[day]?.source === "auto"
                            ? "Published automatically"
                            : "Planned automatically"}
                    </span>
                    <h4>{preview?.title ?? "Journey unavailable"}</h4>
                    {preview ? (
                      <>
                        <p>{preview.description}</p>
                        <a
                          href={journeyReviewLink(preview.path, day)}
                          onClick={(event) => {
                            if (onNavigate) {
                              event.preventDefault();
                              onNavigate(journeyReviewLink(preview.path, day));
                            }
                          }}
                          className="tertiary-action"
                        >
                          Review Journey <span aria-hidden="true">→</span>
                        </a>
                      </>
                    ) : (
                      <p>This saved Journey is no longer in the catalog.</p>
                    )}
                  </article>
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
                      <span>
                        {preview ? "Change Journey" : "Choose a Journey"}
                      </span>
                      <span aria-hidden="true">⌄</span>
                    </button>
                    {pickerOpen && (
                      <div
                        id="admin-journey-picker"
                        className="journey-picker-popover"
                        role="dialog"
                        aria-label="Choose a Journey"
                      >
                        <header className="admin-picker-heading">
                          <h3>Choose a Journey</h3>
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
                        </header>
                        <AdminJourneys
                          selectedId={selection || undefined}
                          onSelect={setLibraryId}
                          onSchedule={chooseJourney}
                          onNavigate={onNavigate}
                          date={day}
                          today={date}
                          records={records}
                          picking
                        />
                        <button
                          type="button"
                          className="quiet-button tertiary-action"
                          onClick={() => chooseJourney("")}
                        >
                          Use automatic rotation
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="journey-assignment-actions" hidden={!dirty}>
                    <p className="admin-publish-scope">
                      {dirty
                        ? "Started attempts keep their Journey when you publish."
                        : "Choose a Journey to change this day. Browsing doesn’t publish."}
                    </p>
                    <button
                      className="primary-button"
                      type="submit"
                      disabled={
                        !schedule.ready ||
                        !dayLoaded ||
                        candidateId !== undefined ||
                        busy ||
                        !dirty
                      }
                    >
                      {busy
                        ? "Publishing…"
                        : !dirty
                          ? "Assignment up to date"
                          : selection
                            ? `Publish for ${formatDay(day).replace(/^[^,]+, /, "")}`
                            : "Restore automatic selection"}
                      <span aria-hidden="true">→</span>
                    </button>
                    {saved && selection && dirty && (
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
                  </div>
                  {message && (!notifications.enabled || !messageSuccess) && (
                    <p className="schedule-notice" role="status">
                      {message}
                    </p>
                  )}
                </form>
              </div>
              <details className="schedule-footnote">
                <summary>Automatic scheduling &amp; past dates</summary>
                <p>
                  Unassigned days use a shared automatic choice. Today and
                  future dates are editable. Rewriting a past day requires
                  confirmation; players who already started keep their Journey.
                </p>
              </details>
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
        </div>
      </div>
      <details
        className="admin-maintenance"
        open={requestedSection === "tools" || undefined}
      >
        <summary>Maintenance</summary>
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
            onClick={async () => {
              if (
                !(await confirmChange(
                  "Reset your saved Daily attempt?",
                  "Your answers, score and help use for today will be removed from your account. Other players and isolated review sessions are unaffected.",
                  "Reset my attempt",
                ))
              )
                return;
              const cleared = onResetAttempt?.() ?? false;
              const confirmation = cleared
                ? "Attempt cleared. Start fresh from Home."
                : "Couldn’t clear the attempt. Please try again.";
              setResetMessage(confirmation);
              notifications.notify(confirmation, {
                tone: cleared ? "success" : "error",
              });
            }}
          >
            Clear my Journey attempt
          </button>
          {resetMessage && !notifications.enabled && (
            <p role="status">{resetMessage}</p>
          )}
        </section>
      </details>
      {confirmation && (
        <AdminConfirmation
          {...confirmation}
          onConfirm={() => finishConfirmation(true)}
          onCancel={() => finishConfirmation(false)}
        />
      )}
    </section>
  );
}
