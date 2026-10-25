import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export function WorldCreditsDialog({ onClose }: { onClose(): void }) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(dialog.current?.querySelectorAll<HTMLElement>("button, a[href]") ??
          []),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose]);
  return createPortal(
    <div
      className="study-options-backdrop world-credits-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="study-options-dialog world-credits-dialog"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="study-options-heading">
          <h2 id={id}>World credits</h2>
          <button
            className="study-options-close"
            aria-label="Close world credits"
            data-dd-action-name="World Credits Close"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <dl>
          <div>
            <dt>Decorative geography</dt>
            <dd>Natural Earth (public domain).</dd>
          </div>
          <div>
            <dt>Capitals, cities &amp; continent membership</dt>
            <dd>GeoNames (CC BY 4.0).</dd>
          </div>
          <div>
            <dt>Pinpoint landmarks &amp; photographs</dt>
            <dd>
              Wikidata (CC0); Wikimedia Commons photographs under their
              individual licenses. Credits accompany each photograph.
            </dd>
          </div>
          <div>
            <dt>Flags</dt>
            <dd>Public-domain SVGs from Wikimedia Commons.</dd>
          </div>
          <div>
            <dt>Regional boundaries</dt>
            <dd>geoBoundaries / U.S. Census Bureau (CC BY 4.0).</dd>
          </div>
          <div>
            <dt>Danube route</dt>
            <dd>OpenStreetMap contributors (ODbL).</dd>
          </div>
        </dl>
        <p>
          Sources for individual Journey questions appear after you answer.
        </p>
        <div className="world-credits-links">
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
          <a
            href="/minigames/pinpoint/SOURCES.json"
            target="_blank"
            rel="noreferrer"
          >
            Pinpoint photo credits and location sources
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
