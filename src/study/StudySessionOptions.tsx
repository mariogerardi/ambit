import { StudyBack } from "./StudyBack";
import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import type { StudySettings } from "./engine";
import { StudyPreferences } from "./StudyPreferences";

export function StudySessionOptions({
  settings,
  returnFocus,
  onApply,
  onClose,
  onFinish,
  locked = false,
  onPause,
  onPreferencesChange,
}: {
  locked?: boolean;
  onPause?(): void;
  onPreferencesChange?(visible: boolean): void;
  settings: StudySettings;
  onFinish?(): void;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onApply(settings: StudySettings): void;
  onClose(): void;
}) {
  const [draft, setDraft] = useState(settings);
  const [preferences, setPreferences] = useState(false);
  useEffect(() => {
    onPreferencesChange?.(preferences);
    return () => onPreferencesChange?.(false);
  }, [preferences, onPreferencesChange]);
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = returnFocus.current;
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
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input, a[href]",
        ) ?? []),
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
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose, returnFocus]);
  return createPortal(
    <div
      className="study-options-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="study-options-dialog"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="study-options-heading">
          <h2 id={id}>
            Session <em>settings</em>
          </h2>
          <button
            className="study-options-close"
            aria-label="Close Session settings"
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {!preferences ? (
          <div className="study-options-actions">
            {!locked && (
              <button
                className="quiet-button"
                onClick={() => setPreferences(true)}
              >
                Edit this session
              </button>
            )}
            {locked && (
              <p className="muted">
                Challenge settings stay fixed so you and your friend get the
                same questions.
              </p>
            )}
            {locked && onPause && (
              <button className="quiet-button" onClick={onPause}>
                Pause challenge
              </button>
            )}
            {!locked && onFinish && (
              <button className="quiet-button" onClick={onFinish}>
                Finish this session
              </button>
            )}
          </div>
        ) : (
          <>
            <StudyBack
              label="Back to session actions"
              onClick={() => setPreferences(false)}
            />
            <StudyPreferences settings={draft} onSettings={setDraft} />
            <div className="study-options-actions">
              <button className="primary-button" onClick={() => onApply(draft)}>
                Apply &amp; resume
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
