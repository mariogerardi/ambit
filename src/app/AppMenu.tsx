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
  caption,
  onNavigate,
  theme,
  onTheme,
}: {
  admin?: boolean;
  onJourney?(): void;
  journeyReady?: boolean;
  onFeedback?(): void;
  path: string;
  caption?: string;
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
          <span className="app-menu-heading">Explore Ambit</span>
          {caption && <p className="app-menu-caption">{caption}</p>}
          <div className="app-menu-primary">
            <button
              aria-current={path === "/" ? "page" : undefined}
              onClick={() => navigate("/")}
            >
              <ActionIcon name="home" />
              <span>Home</span>
            </button>
            <button
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
              aria-current={path === "/explore" ? "page" : undefined}
              onClick={() => navigate("/explore")}
            >
              <ActionIcon name="explore" />
              <span>Explore</span>
            </button>
            <button
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
                aria-current={path === "/admin" ? "page" : undefined}
                onClick={() => navigate("/admin")}
              >
                Admin
              </button>
            )}
            <details className="app-menu-credits">
              <summary>World credits</summary>
              <p>
                Decorative geography: Natural Earth (public domain). Capitals,
                cities &amp; continent membership: GeoNames (CC BY 4.0). Flags:
                public-domain SVGs from Wikimedia Commons. Regional boundaries:
                geoBoundaries / U.S. Census Bureau (CC BY 4.0). Map and clue
                assets are served locally. Question sources appear after
                answering.
              </p>
              <a href="/NOTICE.txt" target="_blank" rel="noreferrer">
                Full source and license notices
              </a>
            </details>
          </div>
          <ThemePicker value={theme} onChange={onTheme} />
        </nav>
      )}
    </div>
  );
}
