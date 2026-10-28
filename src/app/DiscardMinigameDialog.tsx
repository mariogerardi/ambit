import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

export function DiscardMinigameDialog({
  title,
  score,
  returnFocus,
  onCancel,
  onDiscard,
}: {
  title: string;
  score: string;
  returnFocus: HTMLElement | null;
  onCancel(): void;
  onDiscard(): void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous =
      returnFocus ?? (document.activeElement as HTMLElement | null);
    const overflow = document.body.style.overflow;
    const workspace = document.querySelector("main.experience");
    const wasInert = workspace?.hasAttribute("inert");
    workspace?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    cancel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
      if (event.key !== "Tab") return;
      const controls =
        dialog.current?.querySelectorAll<HTMLButtonElement>("button");
      const first = controls?.[0],
        last = controls?.[1];
      const outside = !dialog.current?.contains(document.activeElement);
      if (event.shiftKey && (outside || document.activeElement === first)) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (outside || document.activeElement === last)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      if (!wasInert) workspace?.removeAttribute("inert");
      removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [onCancel, returnFocus]);
  return createPortal(
    <div
      className="study-options-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        className="study-options-dialog minigame-discard-dialog"
        ref={dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
      >
        <h2 id={`${id}-title`}>Start a new {title} game?</h2>
        <p id={`${id}-description`}>
          Your unfinished game and current score ({score}) will be discarded.
        </p>
        <div className="minigame-discard-actions">
          <button
            type="button"
            className="quiet-button"
            ref={cancel}
            onClick={onCancel}
          >
            Keep current game
          </button>
          <button type="button" className="primary-button" onClick={onDiscard}>
            Discard and start
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
