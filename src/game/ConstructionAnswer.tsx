import {
  automaticConstructionNavigation,
  currentConstruction,
} from "./constructionInteraction";
import type { Question, QuestionContext } from "./questionContracts";
import type { Action, GameState } from "./state";
import {
  constructionRule,
  constructionReady,
  reviewedConstruction,
  brushSize,
  brushSizeRange,
} from "./construction";
import { undoConstruction } from "./constructionEditing";
import { QuestionActions } from "./QuestionActions";
import { ActionIcon } from "../app/ActionIcon";
export function ConstructionAnswer({
  question: q,
  game,
  dispatch,
  webgl,
  mapKey,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch: (a: Action) => void;
  webgl: boolean;
  mapKey?: React.ReactNode;
}) {
  const rule = constructionRule(q);
  if (!rule) return null;
  const automatic = automaticConstructionNavigation(q),
    tool =
      automatic && game.constructionTool === "move"
        ? "draw"
        : (game.constructionTool ?? "draw"),
    c = currentConstruction(q, game),
    points = c && "points" in c ? c.points : [];
  const guidance = q.guidance
    ? {
        content: q.guidance,
        stage: game.help?.[q.id],
        onHint: () => dispatch({ type: "request-hint" }),
        onAssist: () => dispatch({ type: "request-assist" }),
      }
    : undefined;
  const undo = (
    <button
      type="button"
      className="quiet-button construction-icon-button"
      aria-label={c?.kind === "brush" ? "Undo stroke" : "Remove last point"}
      title={c?.kind === "brush" ? "Undo stroke" : "Remove last point"}
      disabled={!c}
      onClick={() =>
        dispatch({ type: "construction", value: undoConstruction(c) })
      }
    >
      <ActionIcon name="undo" />
    </button>
  );
  const reset = (
    <button
      type="button"
      className="quiet-button construction-icon-button"
      aria-label="Reset shape"
      title="Reset shape"
      disabled={!c}
      onClick={() => dispatch({ type: "clear" })}
    >
      <ActionIcon name="repeat" />
    </button>
  );
  return (
    <div className="construction-answer">
      {rule.type === "raster-overlap" ? (
        <div
          className="construction-toolbar construction-brush-row"
          role="group"
          aria-label="Painting controls"
        >
          <button
            type="button"
            aria-pressed={tool !== "erase"}
            onClick={() =>
              dispatch({ type: "construction-tool", value: "draw" })
            }
          >
            <ActionIcon name="paint" />
            Paint
          </button>
          <button
            type="button"
            aria-pressed={tool === "erase"}
            onClick={() =>
              dispatch({ type: "construction-tool", value: "erase" })
            }
          >
            <ActionIcon name="erase" />
            Erase
          </button>
          <label className="construction-brush-size">
            <span>
              Radius{" "}
              <output htmlFor={`brush-size-${q.id}`}>
                {brushSize(rule, game.brushRadiusKm)} km
              </output>
            </span>
            <input
              id={`brush-size-${q.id}`}
              type="range"
              aria-label="Brush size"
              min={brushSizeRange(rule).min}
              max={brushSizeRange(rule).max}
              step={brushSizeRange(rule).step}
              value={brushSize(rule, game.brushRadiusKm)}
              onChange={(e) =>
                dispatch({ type: "brush-size", value: Number(e.target.value) })
              }
            />
          </label>
          {undo}
          {reset}
        </div>
      ) : (
        <div
          className="construction-edit-actions"
          role="group"
          aria-label="Shape controls"
        >
          {!automatic && (
            <button
              type="button"
              className="quiet-button"
              onClick={() =>
                dispatch({
                  type: "construction-tool",
                  value: tool === "move" ? "draw" : "move",
                })
              }
            >
              {tool === "move" ? "Draw / edit" : "Move globe"}
            </button>
          )}
          {!(q.constructionInitial && c?.kind === "circle") && undo}
          {reset}
          {q.mode === "geo-polygon" && (
            <span className="construction-dimension">
              {points.length}/
              {rule.type === "population-coverage-area-budget"
                ? rule.maxVertices
                : 8}{" "}
              corners
            </span>
          )}
        </div>
      )}
      <p className="construction-tool-help">
        {!webgl
          ? "The globe is unavailable."
          : q.mode === "geo-circle"
            ? "Drag the circle; drag elsewhere to turn the globe."
            : q.mode === "geo-brush"
              ? "Paint inside the outline; drag outside it to turn the globe."
              : q.mode === "geo-polygon"
                ? "Tap to add corners; drag a corner to reshape. Drag outside the outline to turn the globe."
                : q.mode === "geo-trace"
                  ? "Follow the river in one stroke. Drag outside Egypt to turn the globe."
                  : "Place two ends, then slide them along the border. Drag outside Algeria to turn the globe."}
      </p>
      {c?.kind === "polygon" &&
        points.length >= 4 &&
        !constructionReady(q, game) && (
          <p role="status">Keep a simple outline: edges must not cross.</p>
        )}
      <QuestionActions
        guidance={guidance}
        mapKey={mapKey}
        pointScoring
        label="Submit shape"
        disabled={!constructionReady(q, game)}
        onSubmit={() => dispatch({ type: "submit" })}
      />
    </div>
  );
}
export function ConstructionReview({
  question,
  response,
}: {
  question: Question;
  response: GameState;
}) {
  const result = reviewedConstruction(question, response);
  if (!result) return null;
  return (
    <section
      className="construction-review"
      aria-label="Your construction result"
    >
      <dl>
        {result.metrics.map((m) => (
          <div key={m.label}>
            <dt>
              {m.label
                .replace("Modeled residents enclosed", "Population enclosed")
                .replace("modeled residents", "people")}
            </dt>
            <dd>
              {m.value.toLocaleString("en-US", {
                maximumFractionDigits: m.unit.startsWith("of") ? 0 : 1,
              })}
              {m.unit === "%" ? "%" : ` ${m.unit}`}
            </dd>
          </div>
        ))}
      </dl>
      {result.kind === "cut" && (
        <div
          className="construction-share-bars"
          aria-label="Population and land comparison"
        >
          {[0, 2].map((i) => (
            <div key={i}>
              <span>{i === 0 ? "People" : "Land"}</span>
              <div>
                <i style={{ width: `${result.metrics[i].value}%` }} />
                <b style={{ width: `${100 - result.metrics[i].value}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
