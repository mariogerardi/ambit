import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export type ActivityPreview = {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  facts: { label: string; value: string }[];
  howToPlay: string;
  rules?: string;
};

type Action = { label: string; disabled?: boolean; onClick(): void };

export function ActivityPreviewDialog({
  preview,
  onClose,
  returnFocus,
  primary,
  customize,
  notice,
  content,
}: {
  preview: ActivityPreview;
  onClose(): void;
  returnFocus: HTMLElement | null;
  primary?: Action;
  customize?: Action;
  notice?: string;
  content?: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [!!content]);
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const update = () =>
      setScrollable(element.scrollHeight > element.clientHeight + 1);
    update();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(update);
    observer?.observe(element);
    if (body.current) observer?.observe(body.current);
    addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      removeEventListener("resize", update);
    };
  }, []);
  // Keep lifecycle independent of callbacks recreated by a parent render.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous =
      returnFocus ?? (document.activeElement as HTMLElement | null);
    const overflow = document.body.style.overflow;
    const workspace = document.querySelector("main.experience");
    const wasInert = workspace?.hasAttribute("inert");
    workspace?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
      }
      if (event.key !== "Tab") return;
      const controls = [
        ...(dialog.current?.querySelectorAll<HTMLElement>(
          ':is(button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, a[href], [tabindex="0"])',
        ) ?? []),
      ];
      const first = controls[0],
        last = controls.at(-1);
      const outside = !dialog.current?.contains(document.activeElement);
      if (
        event.shiftKey &&
        (outside ||
          document.activeElement === first ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (outside ||
          document.activeElement === last ||
          document.activeElement === dialog.current)
      ) {
        event.preventDefault();
        first?.focus();
      }
    };
    addEventListener("keydown", key);
    return () => {
      removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      if (!wasInert) workspace?.removeAttribute("inert");
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [returnFocus]);
  return createPortal(
    <div
      className="study-options-backdrop activity-preview-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="study-options-dialog activity-preview-dialog"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={content ? undefined : `${id}-description`}
      >
        <div className="study-options-heading activity-preview-heading">
          <h2 id={`${id}-title`}>{preview.title}</h2>
          <button
            className="study-options-close"
            aria-label="Close preview"
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
        <div
          className="activity-preview-content"
          ref={scroller}
          data-scrollable={scrollable}
          tabIndex={scrollable ? 0 : undefined}
          role={scrollable ? "region" : undefined}
          aria-label={scrollable ? "Preview details" : undefined}
        >
          <div ref={body} className="activity-preview-body">
            {content ?? (
              <>
                <img
                  className="activity-preview-image"
                  src={preview.image}
                  alt={preview.imageAlt}
                  width="960"
                  height="480"
                  decoding="async"
                />
                <p
                  className="activity-preview-description"
                  id={`${id}-description`}
                >
                  {preview.description}
                </p>
                <div className="activity-preview-details">
                  <div className="activity-preview-how">
                    <h3>How to play</h3>
                    <p>{preview.howToPlay}</p>
                    {preview.rules && (
                      <details className="minigame-rules">
                        <summary>Full rules</summary>
                        <p>{preview.rules}</p>
                      </details>
                    )}
                  </div>
                  <dl className="activity-preview-facts">
                    {preview.facts.map((fact) => (
                      <div key={fact.label}>
                        <dt>{fact.label}</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}
            {notice && <p className="activity-preview-notice">{notice}</p>}
          </div>
        </div>
        <div className="activity-preview-actions">
          {customize ? (
            <button
              className="activity-preview-customize"
              onClick={customize.onClick}
            >
              {customize.label}
            </button>
          ) : (
            <button className="activity-preview-customize" onClick={onClose}>
              Back to games
            </button>
          )}
          {primary && (
            <button
              className="primary-button"
              disabled={primary.disabled}
              onClick={primary.onClick}
            >
              {primary.label} →
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
