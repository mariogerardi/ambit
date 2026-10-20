import type { NumericRange } from "./numericEstimate";
import { formatEstimate } from "./numericEstimate";

export function EstimateSlider({
  rule,
  value,
  onChange,
}: {
  rule: NumericRange;
  value: string;
  onChange(value: string): void;
}) {
  const selected = value.trim() !== "";
  const midpoint =
    rule.min + Math.round((rule.max - rule.min) / rule.step / 2) * rule.step;
  return (
    <div className="estimate-slider">
      <output
        htmlFor="written-answer"
        aria-live="polite"
        data-selected={selected || undefined}
      >
        {selected
          ? formatEstimate(Number(value), rule.unit)
          : "Choose an estimate"}
      </output>
      <input
        id="written-answer"
        type="range"
        min={rule.min}
        max={rule.max}
        step={rule.step}
        value={selected ? value : midpoint}
        aria-valuetext={
          selected
            ? formatEstimate(Number(value), rule.unit)
            : "No estimate selected"
        }
        aria-describedby="estimate-slider-help"
        onChange={(event) => onChange(event.target.value)}
        onPointerUp={(event) => onChange(event.currentTarget.value)}
        onKeyUp={(event) => {
          if (
            [
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "Home",
              "End",
              "PageUp",
              "PageDown",
            ].includes(event.key)
          )
            onChange(event.currentTarget.value);
        }}
      />
      <div className="estimate-slider-limits" aria-hidden="true">
        <span>{formatEstimate(rule.min, rule.unit)}</span>
        <span>{formatEstimate(rule.max, rule.unit)}</span>
      </div>
      <p id="estimate-slider-help">
        Drag to estimate, or use the arrow keys. Each step is{" "}
        {formatEstimate(rule.step, rule.unit)}.
      </p>
    </div>
  );
}
