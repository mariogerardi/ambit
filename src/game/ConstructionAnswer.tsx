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
import { PointOrbs } from "./PointOrbs";
import { QuestionActions } from "./QuestionActions";
import { ActionIcon } from "../app/ActionIcon";
export function ConstructionAnswer({
  question: q,
  game,
  dispatch,
  webgl,
  mapKey,
  onPulseIslands,
  onRecenter,
}: {
  question: Question;
  context: QuestionContext;
  game: GameState;
  dispatch: (a: Action) => void;
  webgl: boolean;
  onPulseIslands?(): void;
  onRecenter?(): void;
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
  return (
    <div className="construction-answer">
      {rule.type === "island-coverage-max" ? (
        <div
          className="island-map-actions"
          role="group"
          aria-label="Island map controls"
        >
          <button
            type="button"
            className="quiet-button"
            disabled={!webgl || !onPulseIslands}
            onClick={onPulseIslands}
            title="Pulse every island once"
          >
            <span className="island-pulse-icon" aria-hidden="true">
              <i />
            </span>
            Pulse islands
          </button>
          <button
            type="button"
            className="quiet-button"
            disabled={!webgl || !onRecenter}
            onClick={onRecenter}
          >
            <span aria-hidden="true">◎</span> Recenter view
          </button>
        </div>
      ) : rule.type === "raster-overlap" ? (
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
          {q.mode !== "geo-cut" &&
            !(q.constructionInitial && c?.kind === "circle") &&
            undo}
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
                  ? `Follow the river in one stroke. Drag outside ${q.constructionArea?.name ?? "the outline"} to turn the globe.`
                  : `Place two ends, then slide them along the border. Drag outside ${q.constructionArea?.name ?? "the outline"} to turn the globe.`}
      </p>
      {c?.kind === "polygon" &&
        points.length >= 4 &&
        !constructionReady(q, game) && (
          <p role="status">Keep a simple outline: edges must not cross.</p>
        )}
      {rule.type === "island-coverage-max" && (
        <aside
          className="island-best"
          aria-label={`Best possible: ${rule.maximum} islands`}
        >
          <span>Best possible:</span>
          <strong>
            {rule.maximum} <small>islands</small>
          </strong>
        </aside>
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
  if (
    !result ||
    result.kind === "cut" ||
    constructionRule(question)?.type === "island-coverage-max"
  )
    return null;
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
    </section>
  );
}

/** Results-only reference; grades and help ceilings remain frozen in the save. */
export function IslandScoring({
  questions,
  help,
}: {
  questions: Question[];
  help: GameState["help"];
}) {
  const rows = questions.flatMap((question) => {
    const rule = constructionRule(question);
    return rule?.type === "island-coverage-max" ? [{ question, rule }] : [];
  });
  if (!rows.length) return null;
  return (
    <section className="island-scoring" aria-label="Island scoring">
      <table>
        <caption>Scoring for this island group</caption>
        <thead>
          <tr>
            <th scope="col">Islands</th>
            {rows[0].rule.tiers.map((tier, index) => {
              const upper = index
                ? rows[0].rule.tiers[index - 1].count - 1
                : tier.count;
              const low = rows[0].rule.maximum - upper,
                high = rows[0].rule.maximum - tier.count;
              return (
                <th scope="col" key={index}>
                  <PointOrbs
                    earned={3 - index}
                    label={`${3 - index} ${index === 2 ? "point" : "points"}`}
                  />
                  <small>
                    {index === 0
                      ? "Best fit"
                      : `${low === high ? low : `${low}–${high}`} fewer`}
                  </small>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ question, rule }) => (
            <tr key={question.id}>
              <th scope="row">
                {question.progressLabel ?? question.title}
                <small>
                  {help?.[question.id] === "assisted"
                    ? "Assist cap: 1 point"
                    : help?.[question.id] === "hinted"
                      ? "Hint cap: 2 points"
                      : ""}
                </small>
              </th>
              {rule.tiers.map((tier, index) => {
                const upper = index
                  ? rule.tiers[index - 1].count - 1
                  : tier.count;
                return (
                  <td key={index}>
                    {tier.count === upper
                      ? tier.count
                      : `${tier.count}–${upper}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
