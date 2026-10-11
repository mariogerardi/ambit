import { useRef, useState } from "react";
import type { Dispatch, PointerEvent } from "react";
import type { Action, GameState } from "./state";
import type { Question, QuestionContext } from "./questions";
import { canSubmit } from "./questions";
import { lockedOrderSlots } from "./guidance";
import { QuestionActions } from "./QuestionActions";

/** Drag on mouse/touch, or choose a card and then a slot with ordinary buttons. */
export function OrderAnswer({
  question,
  context,
  game,
  dispatch,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch: Dispatch<Action>;
}) {
  const [picked, setPicked] = useState<string>();
  const [dragging, setDragging] = useState<string>();
  const [over, setOver] = useState<number>();
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>();
  const drag = useRef<
    { id: string; x: number; y: number; moved: boolean } | undefined
  >(undefined);
  const skipClick = useRef(false);
  const fixed = lockedOrderSlots(question, game);
  const spareCount = (question.choices?.length ?? 0) - question.count;
  const spareCopy = spareCount === 1 ? "one card" : `${spareCount} cards`;
  const name = (id: string) =>
    question.choices?.find((choice) => choice.id === id)?.label ?? id;
  const place = (id: string, index: number) => {
    dispatch({ type: "order-card", id, index });
    setPicked(undefined);
  };
  const dropIndex = (event: PointerEvent) => {
    const target = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>("[data-order-slot]");
    return target ? Number(target.dataset.orderSlot) : undefined;
  };
  const pointer = (id: string) => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      skipClick.current = false;
      drag.current = { id, x: event.clientX, y: event.clientY, moved: false };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current;
      if (!current) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8)
        current.moved = true;
      if (current.moved) {
        setDragging(id);
        setDragPosition({ x: event.clientX, y: event.clientY });
        setOver(dropIndex(event));
      }
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (drag.current?.moved) {
        const index = dropIndex(event);
        if (index !== undefined) place(id, index);
        skipClick.current = true;
      }
      drag.current = undefined;
      setDragging(undefined);
      setOver(undefined);
    },
    onPointerCancel: () => {
      drag.current = undefined;
      setDragging(undefined);
      setOver(undefined);
    },
  });
  const choose = (id: string) => {
    if (skipClick.current) {
      skipClick.current = false;
      return;
    }
    setPicked((current) => (current === id ? undefined : id));
  };
  const guided = question.guidance
    ? {
        content: question.guidance,
        stage: game.help?.[question.id],
        onHint: () => dispatch({ type: "request-hint" }),
        onAssist: () => {
          setPicked(undefined);
          dispatch({ type: "request-assist" });
        },
      }
    : undefined;
  return (
    <div className="order-puzzle">
      <p className="order-instructions">
        Drag cards into the slots, or choose a card and then a slot.
        {spareCount > 0 ? ` Leave ${spareCopy} aside.` : ""}
      </p>
      <ol className="order-slots" aria-label="Ordered answer slots">
        {Array.from({ length: question.count }, (_, index) => {
          const id = game.ordered[index];
          const locked = fixed.some((slot) => slot.index === index);
          const label = question.orderLabels?.[index] ?? `Slot ${index + 1}`;
          return (
            <li
              key={index}
              data-order-slot={index}
              className={over === index ? "drop-target" : ""}
            >
              <span className="order-position">{label}</span>
              <button
                type="button"
                className={`order-card${picked === id && id ? " chosen" : ""}${dragging === id && id ? " dragging" : ""}`}
                disabled={locked}
                aria-pressed={!locked && !!id ? picked === id : undefined}
                aria-label={`${label}: ${id ? name(id) : "empty"}${locked ? ", locked by assist" : ""}`}
                {...(id && !locked ? pointer(id) : {})}
                onClick={() => {
                  if (skipClick.current) {
                    skipClick.current = false;
                    return;
                  }
                  if (picked) {
                    if (picked === id) setPicked(undefined);
                    else place(picked, index);
                  } else if (id) choose(id);
                }}
              >
                <span>{id ? name(id) : "Place a country"}</span>
                <i aria-hidden="true">{locked ? "✓" : "⠿"}</i>
              </button>
              {!!id && !locked && (
                <button
                  type="button"
                  className="order-remove"
                  aria-label={`Return ${name(id)} to spare cards`}
                  onClick={() => place(id, -1)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ol>
      <div
        className={`order-bank${over === -1 ? " drop-target" : ""}`}
        data-order-slot={-1}
      >
        <span className="order-position">Spare cards</span>
        <div className="order-spares">
          {(question.choices ?? [])
            .filter((choice) => !game.ordered.includes(choice.id))
            .map((choice) => (
              <button
                type="button"
                key={choice.id}
                {...pointer(choice.id)}
                className={`order-card${picked === choice.id ? " chosen" : ""}${dragging === choice.id ? " dragging" : ""}`}
                aria-pressed={picked === choice.id}
                onClick={() => choose(choice.id)}
              >
                <span>{choice.label}</span>
                <i aria-hidden="true">⠿</i>
              </button>
            ))}
          {picked && game.ordered.includes(picked) && (
            <button
              type="button"
              className="quiet-button"
              onClick={() => place(picked, -1)}
            >
              Leave {name(picked)} aside
            </button>
          )}
        </div>
      </div>
      <p className="sr-only" role="status">
        {picked
          ? `${name(picked)} selected. Choose a slot.`
          : game.ordered.filter(Boolean).length === question.count
            ? `All slots filled.${spareCount > 0 ? ` Leave ${spareCopy} aside.` : ""}`
            : "Fill each slot before submitting."}
      </p>
      <QuestionActions
        guidance={guided}
        disabled={!canSubmit(question, context, game)}
        onSubmit={() => dispatch({ type: "submit" })}
      />
      {dragging && dragPosition && (
        <div
          className="order-drag-preview"
          style={{ left: dragPosition.x, top: dragPosition.y }}
          aria-hidden="true"
        >
          {name(dragging)}
        </div>
      )}
    </div>
  );
}
