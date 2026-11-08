import { useEffect, useRef, useState } from "react";
import { accountTabLink } from "./accountNavigation";
import type { AdminSection } from "./accountNavigation";
import type { DailyAttempt } from "./dailyProgress";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { AdminConfirmation } from "./AdminConfirmation";
import { useToast } from "./Toast";

const sections = ["schedule", "journeys", "feedback"] as const;
const labels: Record<(typeof sections)[number], string> = {
  schedule: "Schedule",
  journeys: "Journeys",
  feedback: "Feedback",
};

export function AdminTopNavigation({
  active,
  date,
  today,
  onNavigate,
  attempt,
  resetReady = false,
  onResetAttempt,
}: {
  active: AdminSection;
  date?: string;
  today: string;
  onNavigate(url: string): void;
  attempt?: DailyAttempt;
  resetReady?: boolean;
  onResetAttempt?(): boolean;
}) {
  const utilityDialog = useRef<HTMLDialogElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const { notify } = useToast();
  const attemptDate = today;
  const attemptJourney = attempt
    ? JOURNEY_INDEX.find((journey) => journey.id === attempt.journeyId)?.title
    : undefined;
  function openUtilities() {
    const dialog = utilityDialog.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function closeUtilities() {
    const dialog = utilityDialog.current;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  useEffect(() => {
    if (active === "tools") openUtilities();
  }, [active]);

  async function resetAttempt() {
    if (!onResetAttempt) return;
    const cleared = onResetAttempt();
    const message = cleared
      ? "Attempt cleared. Start fresh from Home."
      : "Couldn’t clear the attempt. Please try again.";
    setResetMessage(message);
    notify(message, { tone: cleared ? "success" : "error" });
    setConfirmReset(false);
  }

  return (
    <div className="admin-top-navigation">
      <div className="admin-top-navigation-context">
        <strong>Admin</strong>
        <button
          type="button"
          className="admin-top-navigation-back"
          onClick={() => onNavigate(accountTabLink("dashboard"))}
        >
          ← Your progress
        </button>
      </div>
      <nav aria-label="Admin sections">
        {sections.map((section) => (
          <button
            key={section}
            id={`admin-tab-${section}`}
            type="button"
            aria-current={
              active === section || (active === "tools" && section === "schedule")
                ? "page"
                : undefined
            }
            onClick={() => onNavigate(accountTabLink("admin", section, date))}
          >
            {labels[section]}
          </button>
        ))}
      </nav>
      <button
        type="button"
        className="admin-utilities-trigger"
        aria-label="Admin utilities"
        aria-haspopup="dialog"
        onClick={openUtilities}
      >
        Utilities
      </button>
      <dialog
        ref={utilityDialog}
        className="admin-utility-dialog"
        aria-labelledby="admin-utility-title"
      >
        <header>
          <div>
            <p className="overline">ADMIN TOOLS</p>
            <h2 id="admin-utility-title">Daily attempt</h2>
          </div>
          <button
            type="button"
            className="quiet-button"
            aria-label="Close utilities"
            onClick={closeUtilities}
          >
            ×
          </button>
        </header>
        <p>
          {attempt
            ? `${attemptJourney ?? "Today's Journey"} · ${attempt.game.answers.length} of 5 answered.`
            : `No Journey attempt for ${attemptDate}.`}
        </p>
        {resetMessage && <p role="status">{resetMessage}</p>}
        <button
          type="button"
          className="quiet-button"
          disabled={!attempt || !resetReady || !onResetAttempt}
          onClick={() => setConfirmReset(true)}
        >
          Clear today’s attempt
        </button>
      </dialog>
      {confirmReset && (
        <AdminConfirmation
          title="Reset your saved Daily attempt?"
          message="Your answers, score and help use for today will be removed from your account. Other players and isolated review sessions are unaffected."
          confirmLabel="Reset my attempt"
          destructive
          onConfirm={() => void resetAttempt()}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
