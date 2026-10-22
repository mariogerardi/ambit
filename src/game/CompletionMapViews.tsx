import { useState } from "react";
import type { Focus } from "../geography/types";

/** Manual access to every flyover destination when automatic motion is disabled. */
export function CompletionMapViews({
  overview,
  views,
  frame,
}: {
  overview: Focus;
  views: Focus[];
  frame(focus: Focus): void;
}) {
  const [index, setIndex] = useState(-1);
  const show = (next: number) => {
    setIndex(next);
    frame(next < 0 ? overview : views[next]);
  };
  return (
    <div
      className="completion-map-views"
      role="group"
      aria-label="Completion map views"
    >
      <span role="status">
        {index < 0
          ? "Map overview"
          : `Map view ${index + 1} of ${views.length}`}
      </span>
      <button
        type="button"
        className="quiet-button"
        onClick={() => show(-1)}
        disabled={index < 0}
      >
        Overview
      </button>
      <button
        type="button"
        className="quiet-button"
        onClick={() => show(index - 1)}
        disabled={index < 0}
      >
        Previous view
      </button>
      <button
        type="button"
        className="quiet-button"
        onClick={() => show(index + 1)}
        disabled={index === views.length - 1}
      >
        Next view
      </button>
    </div>
  );
}
