import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  copyShareText,
  resultImage,
  resultCaption,
  resultText,
  shareCancelled,
} from "./journeySharing";
import type { SharedJourneyResult } from "./journeySharing";

export function JourneyShareDialog({
  result,
  onClose,
}: {
  result: SharedJourneyResult;
  onClose(): void;
}) {
  const id = useId(),
    dialog = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<{ url: string; file: File }>();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [revision, setRevision] = useState(0);
  const text = resultCaption(result);
  const imageDescription = resultText(result);
  const [useDownload, setUseDownload] = useState(false);
  useEffect(() => {
    let alive = true,
      url: string | undefined;
    setImage(undefined);
    setError("");
    void resultImage(result)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setImage({
          url,
          file: new File([blob], `ambit-${result.date}.png`, {
            type: "image/png",
          }),
        });
      })
      .catch(() => {
        if (alive) setError("Couldn’t create your image. Please retry.");
      });
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [result, revision]);
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
          "button:not(:disabled), textarea, a[href]",
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
      document.body.style.overflow = overflow;
      removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [onClose]);
  async function save() {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = image.file.name;
    document.body.append(link);
    link.click();
    link.remove();
    if (await copyShareText(text))
      setNotice(
        "Image saved and caption copied. Attach the image and paste the caption to share.",
      );
    else {
      setFallback(true);
      setNotice(
        "Image saved. Copy the caption below to share it alongside your image.",
      );
    }
  }
  async function share() {
    if (!image) return;
    setBusy(true);
    setNotice("");
    // Called directly by the click; the PNG is already prepared to retain activation.
    try {
      if (!fileShare || useDownload) {
        await save();
        return;
      }
      await navigator.share({
        title: "Ambit · A different way to see the world",
        text,
        files: [image.file],
      });
    } catch (error) {
      if (!shareCancelled(error)) {
        setUseDownload(true);
        setNotice("Couldn’t open sharing. Save the image and copy its caption instead.");
      }
    } finally {
      setBusy(false);
    }
  }
  let fileShare = false;
  try {
    fileShare =
      !!image &&
      !!navigator.share &&
      !!navigator.canShare?.({
        files: [image.file],
        text,
        title: "Ambit · A different way to see the world",
      });
  } catch {
    /* Downloads remain available. */
  }
  return createPortal(
    <div
      className="study-options-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="study-options-dialog journey-share-dialog"
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <div className="study-options-heading">
          <h2 id={id}>Share your Journey</h2>
          <button
            data-dd-action-name="Journey Share Close"
            aria-label="Close sharing"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {image ? (
          <img
            className="journey-share-preview"
            src={image.url}
            alt={imageDescription}
          />
        ) : (
          !error && <p role="status">Preparing your image…</p>
        )}
        {error && (
          <p role="alert">
            {error}{" "}
            <button
              className="quiet-button"
              data-dd-action-name="Journey Share Retry Image"
              onClick={() => setRevision((value) => value + 1)}
            >
              Retry image
            </button>
          </p>
        )}
        <p className="journey-share-caption">{text}</p>
        <div className="journey-social-actions">
          <button
            className="primary-button"
            data-dd-action-name="Journey Share Submit"
            disabled={busy || !image}
            onClick={() => void share()}
          >
            {useDownload ? "Save image & copy caption" : "Share"}
          </button>
        </div>
        {image && !fileShare && (
          <p className="muted">
            Sharing will save the image and copy its caption on this device.
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {fallback && (
          <textarea
            aria-label="Caption to copy"
            readOnly
            value={text}
            onFocus={(event) => event.currentTarget.select()}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
