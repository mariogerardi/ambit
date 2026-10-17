import { ActionIcon } from "./ActionIcon";
import { useEffect, useRef, useState } from "react";
import { ThemePicker } from "../theme/ThemePicker";
import type { ThemeId } from "../theme/themes";

export function AppMenu({
  admin = false,
  onJourney,
  journeyReady = true,
  onFeedback,
  path,
  onNavigate,
  theme,
  onTheme,
}: {
  admin?: boolean;
  onJourney?(): void;
  journeyReady?: boolean;
  onFeedback?(): void;
  path: string;
  onNavigate(path: string): void;
  theme: ThemeId;
  onTheme(theme: ThemeId): void;
}) {
  const [open, setOpen] = useState(false);
  const shell = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!shell.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    addEventListener("pointerdown", outside);
    // Labels and Safari button presses can blur without a focus destination.
    // Dismiss only when focus actually arrives outside, so activation survives.
    addEventListener("focusin", outside);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", outside);
      removeEventListener("focusin", outside);
      removeEventListener("keydown", escape);
    };
  }, [open]);
  const navigate = (destination: string) => {
    setOpen(false);
    onNavigate(destination);
    trigger.current?.focus();
  };
  return (
    <div className="app-menu" ref={shell}>
      <button
        ref={trigger}
        className="app-menu-toggle"
        data-dd-action-name="Menu Toggle"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="app-navigation"
        onClick={() => setOpen((value) => !value)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          {open ? (
            <path d="m6 6 12 12M18 6 6 18" />
          ) : (
            <path d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>
      {open && (
        <nav
          id="app-navigation"
          className="app-menu-content"
          aria-label="App navigation"
        >
          <span className="app-menu-heading">Ambit</span>
          <div className="app-menu-primary">
            <button
              data-dd-action-name="Menu Home"
              aria-current={path === "/" ? "page" : undefined}
              onClick={() => navigate("/")}
            >
              <ActionIcon name="home" />
              <span>Home</span>
            </button>
            <button
              data-dd-action-name="Menu Journey"
              aria-current={path === "/daily" ? "page" : undefined}
              disabled={!journeyReady}
              onClick={() => {
                setOpen(false);
                onJourney ? onJourney() : navigate("/daily");
              }}
            >
              <ActionIcon name="journey" />
              <span>Journey</span>
            </button>
            <button
              data-dd-action-name="Menu Explore"
              aria-current={path === "/explore" ? "page" : undefined}
              onClick={() => navigate("/explore")}
            >
              <ActionIcon name="explore" />
              <span>Explore</span>
            </button>
            <button
              data-dd-action-name="Menu Study"
              aria-current={path === "/study" ? "page" : undefined}
              onClick={() => navigate("/study")}
            >
              <ActionIcon name="study" />
              <span>Study</span>
            </button>
          </div>
          <div className="app-menu-secondary">
            {onFeedback && (
              <button
                data-dd-action-name="Menu Send Feedback"
                onClick={() => {
                  setOpen(false);
                  trigger.current?.focus();
                  onFeedback();
                }}
              >
                Send feedback
              </button>
            )}
            {admin && (
              <button
                data-dd-action-name="Menu Admin"
                aria-current={path === "/admin" ? "page" : undefined}
                onClick={() => navigate("/admin")}
              >
                Admin
              </button>
            )}
            <details className="app-menu-credits">
              <summary data-dd-action-name="Menu World Credits">
                World credits
              </summary>
              <p>
                Decorative geography: Natural Earth (public domain). Capitals,
                cities &amp; continent membership: GeoNames (CC BY 4.0). Flags:
                public-domain SVGs from Wikimedia Commons. Regional boundaries:
                geoBoundaries / U.S. Census Bureau (CC BY 4.0). Map and clue
                assets are served locally. Danube route: OpenStreetMap
                contributors (ODbL). Question sources appear after answering.
              </p>
              <a
                data-dd-action-name="Menu Source Notices"
                href="/NOTICE.txt"
                target="_blank"
                rel="noreferrer"
              >
                Full source and license notices
              </a>
              <a
                data-dd-action-name="Menu Danube Data"
                href="/geography/danube-context.v1.json"
                target="_blank"
                rel="noreferrer"
              >
                Danube map data (ODbL)
              </a>
            </details>
          </div>
          <ThemePicker value={theme} onChange={onTheme} />
        </nav>
      )}
    </div>
  );
}
