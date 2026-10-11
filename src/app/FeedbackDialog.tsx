import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAccount } from "../services/accounts";
import { feedbackApi, feedbackContext } from "../services/feedback";
import type { FeedbackRequest } from "../services/feedback";
import { trackAction } from "../services/monitoring";

export function FeedbackDialog({
  request,
  onClose,
}: {
  request: FeedbackRequest;
  onClose(): void;
}) {
  const account = useAccount();
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState(
    request.kind === "question" ? "content" : "usability",
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  // Freeze identity and context across retries, even if the underlying question changes.
  const [identity] = useState(() => crypto.randomUUID());
  const [context] = useState(() => feedbackContext(request.context));
  const sending = useRef(false);
  const [controller] = useState(() => new AbortController());
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
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), select, textarea, a[href]",
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
    addEventListener("keydown", key);
    return () => {
      controller.abort();
      document.body.style.overflow = overflow;
      removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose, controller]);
  async function submit() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      // Reports remain available if an optional account session has expired.
      const token = await account.accessToken().catch(() => undefined);
      await feedbackApi(
        token ? "/account/feedback" : "/feedback",
        token,
        { id: identity, kind: request.kind, category, message, context },
        "POST",
        controller.signal,
      );
      if (controller.signal.aborted) return;
      setSaved(true);
      trackAction("feedback submitted", { kind: request.kind, category });
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Couldn’t send feedback. Please try again.",
        );
    } finally {
      sending.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return createPortal(
    <div
      className="study-options-backdrop feedback-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="study-options-dialog feedback-dialog"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        data-dd-privacy="mask"
      >
        <div className="study-options-heading">
          <h2 id={id}>
            {request.kind === "question"
              ? "Report this question"
              : "Send feedback"}
          </h2>
          <button
            className="study-options-close"
            aria-label="Close feedback"
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
        {saved ? (
          <>
            <p role="status">Thanks—your feedback was sent.</p>
            <button className="primary-button" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="field">
              Category
              <select
                value={category}
                disabled={busy}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="content">Question or content</option>
                <option value="answer">Answer or scoring</option>
                <option value="globe">Globe</option>
                <option value="usability">Usability</option>
                <option value="bug">Bug</option>
                <option value="idea">Idea</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="field">
              {request.kind === "question"
                ? "Comment (optional)"
                : "Your feedback"}
              <textarea
                rows={6}
                maxLength={500}
                aria-describedby={`${id}-count`}
                required={request.kind === "experience"}
                value={message}
                disabled={busy}
                onChange={(event) =>
                  setMessage(event.target.value.slice(0, 500))
                }
              />
              <small id={`${id}-count`} className="feedback-character-count">
                {message.length} / 500 characters
              </small>
            </label>
            <p className="muted">
              Includes the current screen, app version, and question details
              when applicable. Please leave out personal information.
            </p>
            {error && <p role="alert">{error}</p>}
            <button
              className="primary-button"
              disabled={
                busy || (request.kind === "experience" && !message.trim())
              }
            >
              <span>{busy ? "Sending…" : "Send feedback"}</span>
              <span aria-hidden="true">→</span>
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
