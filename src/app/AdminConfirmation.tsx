import { useEffect, useId, useRef } from "react";

export function AdminConfirmation({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm(): void;
  onCancel(): void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    if (typeof element.showModal === "function") element.showModal();
    else element.setAttribute("open", "");
    cancel.current?.focus();
    return () => {
      if (element.open && typeof element.close === "function") element.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="admin-confirmation"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onCancel();
      }}
    >
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{message}</p>
      <div className="admin-confirmation-actions">
        <button
          type="button"
          className={destructive ? "primary-button" : "quiet-button"}
          ref={cancel}
          onClick={onCancel}
        >
          Keep working
        </button>
        <button
          type="button"
          className={
            destructive
              ? "quiet-button admin-confirmation-destructive"
              : "primary-button"
          }
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
