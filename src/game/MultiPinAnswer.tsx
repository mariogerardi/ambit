import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Construction } from "./constructionTypes";
import type { Question } from "./questionContracts";
import type { Action, GameState } from "./state";
import { constructionReady } from "./construction";
import { QuestionActions } from "./QuestionActions";

export function MultiPinAnswer({
  question: q,
  game,
  dispatch,
  mapKey,
}: {
  question: Question;
  game: GameState;
  dispatch(a: Action): void;
  mapKey?: ReactNode;
}) {
  const [history, setHistory] = useState<Construction[]>([]);
  const previous = useRef(game.construction);
  const undoing = useRef(false);
  useEffect(() => {
    if (previous.current === game.construction) return;
    if (!undoing.current) {
      const old = previous.current ?? {
        version: 1 as const,
        kind: "pins" as const,
        pins: {},
      };
      setHistory((h) => [...h.slice(-63), old]);
    }
    previous.current = game.construction;
    undoing.current = false;
  }, [game.construction]);
  if (q.rule.type !== "labeled-region-pin-set") return null;
  const active = q.rule.slots.find((s) => s.id === game.activePinSlot)?.id;
  const pins = game.construction?.kind === "pins" ? game.construction.pins : {};
  const guidance = q.guidance
    ? {
        content: q.guidance,
        stage: game.help?.[q.id],
        onHint: () => dispatch({ type: "request-hint" }),
        onAssist: () => dispatch({ type: "request-assist" }),
      }
    : undefined;
  return (
    <div className="multipin-answer">
      <div
        className="pin-tray"
        role="group"
        aria-label="Choose a landscape pin"
      >
        {q.rule.slots.map((slot) => (
          <button
            type="button"
            key={slot.id}
            aria-pressed={active === slot.id}
            className="landscape-pin"
            data-placed={!!pins[slot.id]}
            aria-label={`Pick up ${slot.label} pin`}
            onClick={() => dispatch({ type: "pin-slot", id: slot.id })}
          >
            <span className="pin-tray-well" aria-hidden="true">
              <svg viewBox="0 0 40 56" className="pin-indent">
                <path d="M20 53C17 43 5 30 5 19a15 15 0 0 1 30 0c0 11-12 24-15 34Z" />
                <circle cx="20" cy="19" r="5" />
              </svg>
              <svg viewBox="0 0 40 56" className="pin-token">
                <path d="M20 53C17 43 5 30 5 19a15 15 0 0 1 30 0c0 11-12 24-15 34Z" />
                <circle cx="20" cy="19" r="5" />
              </svg>
            </span>
            <span>{slot.label}</span>
            <small>
              {active === slot.id
                ? "In hand"
                : pins[slot.id]
                  ? "On the map"
                  : "Pick up"}
            </small>
          </button>
        ))}
      </div>
      <p className="construction-tool-help">
        {active
          ? `Tap the globe to place your ${q.rule.slots.find((s) => s.id === active)!.label} pin. Tap its slot again to put it back.`
          : "Pick up a pin, then tap the globe to place it. Pick it up again to move it. Drag to turn the globe."}
      </p>
      <div className="multipin-edit-actions">
        <button
          type="button"
          className="quiet-button tertiary-action"
          disabled={!active || !pins[active]}
          onClick={() => dispatch({ type: "remove-labeled-pin", id: active! })}
        >
          Remove selected pin
        </button>
        <button
          type="button"
          className="quiet-button tertiary-action"
          disabled={!history.length}
          onClick={() => {
            const value = history.at(-1);
            undoing.current = true;
            setHistory((h) => h.slice(0, -1));
            dispatch({ type: "construction", value });
          }}
        >
          Undo pin edit
        </button>
      </div>
      <QuestionActions
        guidance={guidance}
        mapKey={mapKey}
        pointScoring
        label="Submit pins"
        disabled={!!active || !constructionReady(q, game)}
        onSubmit={() => dispatch({ type: "submit" })}
      />
    </div>
  );
}
