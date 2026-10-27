import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CSSProperties, Dispatch, PointerEvent, ReactNode } from "react";
import type { Action, GameState } from "./state";
import type { Question, QuestionContext } from "./questionContracts";
import { canSubmit } from "./questionEvaluation";
import { orderedCards } from "./ordering";
import { lockedOrderSlots } from "./guidance";
import { QuestionActions } from "./QuestionActions";

/** Drag on mouse/touch, or choose a card and then a slot with ordinary buttons. */
export function OrderAnswer({
  question,
  context,
  game,
  dispatch,
  mapKey,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch: Dispatch<Action>;
  mapKey?: ReactNode;
}) {
  const [picked, setPicked] = useState<string>();
  const [dragging, setDragging] = useState<string>();
  const [over, setOver] = useState<number>();
  const [dragPosition, setDragPosition] = useState<CSSProperties>();
  const drag = useRef<
    | {
        id: string;
        x: number;
        y: number;
        offsetX: number;
        offsetY: number;
        appearance: CSSProperties;
        moved: boolean;
      }
    | undefined
  >(undefined);
  const skipClick = useRef(false);
  const descriptionId = useId();
  const populated = !!question.orderInitial;
  const matching = question.mode === "choice-match";
  const ordered = orderedCards(question, game);
  const fixed = lockedOrderSlots(question, game);
  const spareCount = (question.choices?.length ?? 0) - question.count;
  const spareCopy = spareCount === 1 ? "one card" : `${spareCount} cards`;
  const name = (id: string) =>
    question.choices?.find((choice) => choice.id === id)?.label ?? id;
  const card = (id: string) => {
    const photo = question.choices?.find((choice) => choice.id === id)?.image;
    return (
      <span className="order-card-content">
        {photo && <img src={photo.src} alt={photo.alt} draggable={false} />}
        <span>{name(id)}</span>
      </span>
    );
  };
  const photos = [
    ...new Map(
      [
        ...(question.matchSlots ?? []).flatMap((slot) =>
          slot.image ? [slot.image] : [],
        ),
        ...(question.choices ?? []).flatMap((choice) =>
          choice.image ? [choice.image] : [],
        ),
      ].map((photo) => [photo.src, photo]),
    ).values(),
  ];
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
      const rect = event.currentTarget.getBoundingClientRect();
      const style = getComputedStyle(event.currentTarget);
      drag.current = {
        id,
        x: event.clientX,
        y: event.clientY,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top,
        appearance: {
          width: rect.width,
          height: rect.height,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          borderRadius: style.borderRadius,
          fontWeight: style.fontWeight,
          color: style.color,
          borderColor: style.borderColor,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
        },
        moved: false,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      const current = drag.current;
      if (!current) return;
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8)
        current.moved = true;
      if (current.moved) {
        setDragging(id);
        setDragPosition({
          ...current.appearance,
          left: event.clientX - current.offsetX,
          top: event.clientY - current.offsetY,
        });
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
  const slots = (
    <ol
      className="order-slots"
      aria-label={matching ? "Matching roles" : "Ordered answer slots"}
    >
      {Array.from({ length: question.count }, (_, index) => {
        const id = ordered[index];
        const locked = fixed.some((slot) => slot.index === index);
        const slot = question.matchSlots?.[index];
        const label =
          slot?.label ?? question.orderLabels?.[index] ?? `Slot ${index + 1}`;
        return (
          <li
            key={index}
            data-order-slot={index}
            className={over === index ? "drop-target" : ""}
          >
            <span className={matching ? "sr-only" : "order-position"}>
              {label}
              {slot?.description && (
                <small id={`${descriptionId}-${index}`}>
                  {slot.description}
                </small>
              )}
            </span>
            <button
              type="button"
              data-dd-action-name="Answer Select Order Slot"
              className={`order-card${matching ? ` match-slot${id ? "" : " empty"}` : ""}${picked === id && id ? " chosen" : ""}${dragging === id && id ? " dragging" : ""}`}
              disabled={locked}
              aria-pressed={!locked && !!id ? picked === id : undefined}
              aria-describedby={
                slot?.description ? `${descriptionId}-${index}` : undefined
              }
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
              <span className={matching ? "match-slot-copy" : undefined}>
                {slot?.image && (
                  <img
                    className="match-slot-photo"
                    src={slot.image.src}
                    alt={slot.image.alt}
                    draggable={false}
                  />
                )}
                {matching && id && <small>{label}</small>}
                {id ? card(id) : matching ? label : "Place a card"}
              </span>
              <i aria-hidden="true">
                {locked ? "✓" : id ? "⠿" : matching ? "+" : "⠿"}
              </i>
            </button>
            {!!id && !locked && !populated && (
              <button
                type="button"
                data-dd-action-name="Answer Remove Order Card"
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
  );
  const bank = (
    <div
      className={`order-bank${over === -1 ? " drop-target" : ""}`}
      data-order-slot={-1}
    >
      <span className="order-position">
        {populated
          ? (question.orderAsideLabel ?? "Distractor")
          : matching
            ? (question.orderAsideLabel ?? "Cities")
            : "Spare cards"}
      </span>
      <div className="order-spares">
        {(question.choices ?? [])
          .filter((choice) => !ordered.includes(choice.id))
          .map((choice) => (
            <button
              type="button"
              data-dd-action-name="Answer Select Order Card"
              key={choice.id}
              {...pointer(choice.id)}
              className={`order-card${picked === choice.id ? " chosen" : ""}${dragging === choice.id ? " dragging" : ""}`}
              aria-pressed={picked === choice.id}
              onClick={() => {
                if (skipClick.current) {
                  skipClick.current = false;
                  return;
                }
                if (populated && picked && picked !== choice.id)
                  place(picked, -1);
                else choose(choice.id);
              }}
            >
              {card(choice.id)}
              <i aria-hidden="true">⠿</i>
            </button>
          ))}
        {!populated && picked && ordered.includes(picked) && (
          <button
            type="button"
            data-dd-action-name="Answer Leave Card Aside"
            className="quiet-button"
            onClick={() => place(picked, -1)}
          >
            Leave {name(picked)} aside
          </button>
        )}
      </div>
    </div>
  );
  return (
    <div
      className={`order-puzzle${populated ? " order-populated" : ""}${matching ? " match-puzzle" : ""}`}
    >
      {populated && question.orderGroupLabel && (
        <p className="order-group-title">{question.orderGroupLabel}</p>
      )}
      <div className={matching ? "match-columns" : undefined}>
        {matching ? (
          <>
            {bank}
            {slots}
          </>
        ) : (
          <>
            {slots}
            {bank}
          </>
        )}
      </div>
      <p className="sr-only" role="status">
        {picked
          ? `${name(picked)} selected. Choose a slot.`
          : ordered.filter(Boolean).length === question.count
            ? `All slots filled.${spareCount > 0 ? ` Leave ${spareCopy} aside.` : ""}`
            : "Fill each slot before submitting."}
      </p>
      {!!photos.length && (
        <p className="card-photo-credits">
          Photos:{" "}
          {photos.map((photo, index) => (
            <span key={photo.src}>
              {index > 0 && "; "}
              <a href={photo.credit.url} target="_blank" rel="noreferrer">
                {photo.credit.name}
              </a>
              {" · "}
              <a
                href={photo.credit.licenseUrl}
                target="_blank"
                rel="noreferrer"
              >
                {photo.credit.license}
              </a>
            </span>
          ))}
        </p>
      )}
      <QuestionActions
        mapKey={mapKey}
        pointScoring
        guidance={guided}
        disabled={!canSubmit(question, context, game)}
        onSubmit={() => dispatch({ type: "submit" })}
      />
      {dragging &&
        dragPosition &&
        createPortal(
          <div
            className="order-card order-drag-preview"
            style={dragPosition}
            aria-hidden="true"
          >
            {card(dragging)}
            <i>⠿</i>
          </div>,
          document.body,
        )}
    </div>
  );
}
