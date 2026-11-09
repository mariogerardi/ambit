import type { AdminSection } from "./accountNavigation";
import { ActionIcon } from "./ActionIcon";
const sections = ["schedule", "journeys", "feedback", "utilities"] as const;
const labels = {
  schedule: "Schedule",
  journeys: "Journeys",
  feedback: "Feedback",
  utilities: "Utilities",
};
export function AdminTopNavigation({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect(section: AdminSection): void;
}) {
  return (
    <header className="admin-top-navigation">
      <div className="admin-top-navigation-context">
        <h1>Admin</h1>
      </div>
      <nav
        className="admin-tabs section-navigation"
        role="tablist"
        aria-label="Admin sections"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const index = sections.indexOf(active);
          const next =
            sections[
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? sections.length - 1
                  : (index +
                      (event.key === "ArrowLeft" ? -1 : 1) +
                      sections.length) %
                    sections.length
            ];
          onSelect(next);
          event.currentTarget
            .querySelector<HTMLButtonElement>(`#admin-tab-${next}`)
            ?.focus();
        }}
      >
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            role="tab"
            id={`admin-tab-${section}`}
            aria-controls={`admin-${section}`}
            aria-selected={active === section}
            aria-current={active === section ? "page" : undefined}
            tabIndex={active === section ? 0 : -1}
            className={
              section === "utilities" ? "admin-utilities-tab" : undefined
            }
            onClick={() => onSelect(section)}
          >
            <ActionIcon
              name={
                section === "schedule"
                  ? "archive"
                  : section === "journeys"
                    ? "journey"
                    : section === "feedback"
                      ? "review"
                      : "settings"
              }
            />
            <span>{labels[section]}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
