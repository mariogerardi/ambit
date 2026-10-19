import type { CSSProperties } from "react";
import { QUESTION_POINTS } from "./points";

export function PointOrbs({
  earned,
  label,
  total = QUESTION_POINTS,
  animate = false,
}: {
  earned: number;
  label?: string;
  total?: number;
  animate?: boolean;
}) {
  return (
    <span
      className={`point-orbs${animate ? " point-orbs-animate" : ""}`}
      role="img"
      aria-label={label ?? `${earned} of ${total} points`}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className={`point-orb${index < earned ? " point-orb-earned" : ""}`}
          style={{ "--orb-index": index } as CSSProperties}
        >
          <svg viewBox="0 0 20 20" focusable="false">
            <path d="m10 2 2.3 4.8 5.3.8-3.8 3.7.9 5.3-4.7-2.5-4.7 2.5.9-5.3L2.4 7.6l5.3-.8Z" />
          </svg>
        </span>
      ))}
    </span>
  );
}
