import { createContext, useContext } from "react";
import type { ReactNode } from "react";
export type StudyView =
  | "practice"
  | "session"
  | "review"
  | "history"
  | "custom"
  | "results";
export function studyLink(view: StudyView = "history", record?: string) {
  if (view === "history") return "/study";
  const params = new URLSearchParams({
    view: view === "practice" ? "packs" : view === "custom" ? "builder" : view,
  });
  if (view === "results" && record) params.set("record", record);
  return `/study?${params}`;
}
export function studyIntent(path: string): {
  view: StudyView;
  record?: string;
} {
  const params = new URLSearchParams(path.split("?")[1] ?? "");
  const value = params.get("view"),
    record = params.get("record");
  const view: StudyView =
    value === "packs" || value === "practice"
      ? "practice"
      : value === "builder" || value === "custom"
        ? "custom"
        : value === "session" || value === "review" || value === "results"
          ? value
          : "history";
  return {
    view,
    ...(view === "results" && record && record.length <= 200 ? { record } : {}),
  };
}
const Navigation = createContext<
  | { view: StudyView; reviewing?: boolean; onNavigate(view: StudyView): void }
  | undefined
>(undefined);
export function StudyWorkspace({
  view,
  reviewing,
  onNavigate,
  children,
}: {
  view: StudyView;
  reviewing?: boolean;
  onNavigate(view: StudyView): void;
  children: ReactNode;
}) {
  return (
    <Navigation.Provider value={{ view, reviewing, onNavigate }}>
      {children}
    </Navigation.Provider>
  );
}
export function StudyNavigation() {
  const context = useContext(Navigation);
  if (!context) return null;
  const selected = context.reviewing
    ? "review"
    : context.view === "results" || context.view === "session"
      ? "history"
      : context.view;
  return (
    <nav className="study-navigation" aria-label="Study sections">
      {(
        [
          ["history", "Your Sessions"],
          ["practice", "Study Packs"],
          ["custom", "Session Builder"],
          ["review", "Review"],
        ] as const
      ).map(([view, label]) => (
        <a
          key={view}
          href={studyLink(view)}
          aria-current={selected === view ? "page" : undefined}
          onClick={(event) => {
            if (
              !event.metaKey &&
              !event.ctrlKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              context.onNavigate(view);
            }
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
