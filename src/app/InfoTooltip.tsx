import { useContext, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { PanelActive } from "./ModePanels";

/** A tap-friendly source note, kept outside scrolling trays so it cannot be clipped. */
export function InfoTooltip({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: ReactNode;
  compact?: boolean;
}) {
  const id = useId();
  const active = useContext(PanelActive);
  const trigger = useRef<HTMLButtonElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 12,
    top: 12,
    width: 300,
    maxHeight: 300,
  });
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);
  useEffect(() => {
    if (!open || !active) return;
    const viewport = window.visualViewport;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 12;
      const topEdge = (viewport?.offsetTop ?? 0) + 12;
      const width = Math.min(330, (viewport?.width ?? innerWidth) - 24);
      const bottom =
        (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 12;
      const height = Math.min(
        note.current?.scrollHeight ?? 240,
        bottom - topEdge,
      );
      const top =
        rect.bottom + 8 + height <= bottom
          ? rect.bottom + 8
          : Math.max(topEdge, rect.top - height - 8);
      setPosition({
        left: Math.max(
          leftEdge,
          Math.min(
            rect.left,
            leftEdge + (viewport?.width ?? innerWidth) - width - 24,
          ),
        ),
        top,
        width,
        maxHeight: bottom - top,
      });
    };
    const dismiss = (event: PointerEvent) => {
      if (
        !trigger.current?.contains(event.target as Node) &&
        !note.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    place();
    note.current?.focus();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    addEventListener("pointerdown", dismiss);
    addEventListener("keydown", escape);
    viewport?.addEventListener("resize", place);
    viewport?.addEventListener("scroll", place);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
      removeEventListener("pointerdown", dismiss);
      removeEventListener("keydown", escape);
      viewport?.removeEventListener("resize", place);
      viewport?.removeEventListener("scroll", place);
    };
  }, [open, active]);
  return (
    <>
      <button
        ref={trigger}
        id={`${id}-label`}
        className={`info-note-button${compact ? " info-note-footnote" : " tertiary-action"}`}
        aria-label={compact ? label : undefined}
        title={compact ? label : undefined}
        aria-expanded={open && active}
        aria-controls={open && active ? id : undefined}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        {compact ? (
          <sup aria-hidden="true">1</sup>
        ) : (
          <>
            {label} <span aria-hidden="true">ⓘ</span>
          </>
        )}
      </button>
      {open &&
        active &&
        createPortal(
          <div
            ref={note}
            id={id}
            tabIndex={-1}
            role="dialog"
            aria-labelledby={`${id}-label`}
            className="info-note-tooltip"
            style={position}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
