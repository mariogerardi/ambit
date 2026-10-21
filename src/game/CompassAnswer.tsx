import { useId } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import type { Question, Response } from "./questionContracts";
import type { GameState } from "./state";
import { bearingValue, formatBearing, reviewedBearing } from "./compassBearing";
import { normalizeBearing } from "./geodesic";

const position = (degrees: number, radius: number) => {
  const angle = (degrees * Math.PI) / 180;
  return [100 + radius * Math.sin(angle), 100 - radius * Math.cos(angle)];
};
function sectorPath(start: number, end: number) {
  const a = position(start, 85),
    b = position(end, 85);
  return `M100 100 L${a.join(" ")} A85 85 0 ${normalizeBearing(end - start) > 180 ? 1 : 0} 1 ${b.join(" ")} Z`;
}
export function CompassFace({
  chosen,
  target,
  sector,
  incorrect = false,
}: {
  chosen?: number;
  target?: number;
  sector?: { start: number; end: number };
  incorrect?: boolean;
}) {
  return (
    <svg className="compass-face" viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="85" className="compass-rim" />
      {sector && (
        <path
          d={sectorPath(sector.start, sector.end)}
          className="compass-sector"
        />
      )}
      {Array.from({ length: 72 }, (_, i) => {
        const a = position(i * 5, i % 18 === 0 ? 65 : i % 9 === 0 ? 72 : 78),
          b = position(i * 5, 84);
        return (
          <line
            key={i}
            x1={a[0]}
            y1={a[1]}
            x2={b[0]}
            y2={b[1]}
            className="compass-tick"
          />
        );
      })}
      {[
        [0, "N"],
        [90, "E"],
        [180, "S"],
        [270, "W"],
      ].map(([angle, label]) => {
        const p = position(Number(angle), 56);
        return (
          <text key={label} x={p[0]} y={p[1]} className="compass-cardinal">
            {label}
          </text>
        );
      })}
      {target !== undefined && (
        <g transform={`rotate(${target} 100 100)`} className="compass-target">
          <path d="M100 29 L94 42 L106 42 Z" />
          <line x1="100" y1="39" x2="100" y2="100" />
        </g>
      )}
      {chosen !== undefined && (
        <g
          transform={`rotate(${chosen} 100 100)`}
          className={`compass-needle${incorrect ? " compass-miss" : ""}`}
        >
          <path d="M100 32 L106 100 L100 116 L94 100 Z" />
        </g>
      )}
      <circle cx="100" cy="100" r="4" className="compass-hub" />
    </svg>
  );
}

/** A fixed true-north dial: globe orientation never participates in input. */
export function CompassAnswer({
  question,
  response,
  onChange,
}: {
  question: Question;
  response: Response & Pick<GameState, "help">;
  onChange(value: string): void;
}) {
  const id = useId();
  if (question.rule.type !== "bearing-angle") return null;
  const value = bearingValue(response);
  const sector =
    response.help?.[question.id] === "assisted"
      ? question.guidance?.assist?.compassSector
      : undefined;
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - box.left - box.width / 2,
      dy = event.clientY - box.top - box.height / 2;
    if (Math.hypot(dx, dy) < 8) return;
    onChange(
      String(
        normalizeBearing(Math.round((Math.atan2(dx, -dy) * 180) / Math.PI)),
      ),
    );
  };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    if (!(event.key in delta) && event.key !== "Home" && event.key !== "End")
      return;
    event.preventDefault();
    onChange(
      String(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? 359
            : normalizeBearing(
                (value ?? 0) + delta[event.key] * (event.shiftKey ? 10 : 1),
              ),
      ),
    );
  };
  return (
    <div className="compass-answer">
      <div
        className="compass-dial"
        role="slider"
        tabIndex={0}
        aria-label="Compass bearing"
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={value ?? 0}
        aria-valuetext={
          value === undefined
            ? "No bearing selected"
            : `${formatBearing(value)} clockwise from true north`
        }
        aria-describedby={`${id}-help`}
        onKeyDown={keyboard}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event);
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            point(event);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            point(event);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <CompassFace chosen={value} sector={sector} />
      </div>
      <output aria-live="polite">
        {value === undefined ? "—°" : formatBearing(value)}
      </output>
      <p id={`${id}-help`} className="sr-only">
        Turn the needle or enter degrees clockwise from true north. Arrow keys
        adjust by 1°; Home chooses north.
      </p>
      {sector && (
        <p className="compass-guide">
          Guide: {formatBearing(sector.start)} clockwise to{" "}
          {formatBearing(sector.end)}. You can still choose any heading.
        </p>
      )}
    </div>
  );
}

export function CompassReview({
  question,
  response,
}: {
  question: Question;
  response: GameState;
}) {
  const result = reviewedBearing(question, response);
  if (!result) return null;
  return (
    <section className="compass-review" aria-label="Bearing review">
      <CompassFace
        chosen={result.chosen}
        target={result.target}
        incorrect={result.tier === null}
      />
      <p className="compass-review-key">
        <span>
          Your bearing: <strong>{formatBearing(result.chosen)}</strong>
        </span>
        <span>
          Correct: <strong>{formatBearing(result.target)}</strong>
        </span>
      </p>
    </section>
  );
}

/** An optional typing shortcut below the primary answer and help actions. */
export function CompassEntry({
  response,
  onChange,
}: {
  response: Response;
  onChange(value: string): void;
}) {
  const id = useId();
  return (
    <div className="answer-secondary-actions">
      <details className="typed-country-guess compass-manual-entry">
        <summary className="tertiary-action">
          <span className="typing-disclosure-icon" aria-hidden="true">
            ▸
          </span>
          Type my answer
        </summary>
        <label htmlFor={`${id}-degrees`}>Bearing in degrees</label>
        <input
          id={`${id}-degrees`}
          type="number"
          inputMode="numeric"
          min={0}
          max={360}
          step={1}
          value={response.text}
          placeholder="0–359"
          aria-describedby={`${id}-help`}
          onChange={(event) => onChange(event.target.value)}
        />
        <p id={`${id}-help`} className="sr-only">
          Enter degrees clockwise from true north. 360° is the same as 0°.
        </p>
      </details>
    </div>
  );
}
