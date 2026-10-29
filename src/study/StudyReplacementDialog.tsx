import { useEffect, useId, useRef } from "react";
export function StudyReplacementDialog({
  answered,
  onConfirm,
  onCancel,
}: {
  answered: number;
  onConfirm(): void;
  onCancel(): void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    if (element.showModal) element.showModal();
    else element.setAttribute("open", "");
    cancel.current?.focus();
    return () => {
      if (element.open && element.close) element.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="study-replacement-dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-message`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id={`${id}-title`}>Start a new Study session?</h2>
      <p id={`${id}-message`}>
        {answered
          ? `Your current session has ${answered} ${answered === 1 ? "answer" : "answers"}. It will be saved in History before the new session starts.`
          : "Your current unanswered session will be replaced."}
      </p>
      <div>
        <button
          type="button"
          className="quiet-button"
          ref={cancel}
          onClick={onCancel}
        >
          Keep current session
        </button>
        <button type="button" className="primary-button" onClick={onConfirm}>
          Start new session
        </button>
      </div>
    </dialog>
  );
}
