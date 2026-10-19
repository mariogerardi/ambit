import type { VisualState } from "../geography/types";
export const stateStyles: Record<
  VisualState,
  { fill: string; stroke: string; label: string }
> = {
  surface: {
    fill: "rgba(190,201,197,0.35)",
    stroke: "rgba(191,219,211,0.34)",
    label: "Pin placement surface",
  },
  default: {
    fill: "rgba(157,190,175,0.015)",
    stroke: "rgba(191,219,211,0.34)",
    label: "Default",
  },
  hover: { fill: "rgba(222,247,235,0.15)", stroke: "#f4fff9", label: "Hover" },
  selectable: {
    fill: "rgba(157,217,211,0.17)",
    stroke: "#9bd9d3",
    label: "Selectable",
  },
  selected: {
    fill: "rgba(191,240,194,0.37)",
    stroke: "#d6ffcf",
    label: "Selected",
  },
  correct: {
    fill: "rgba(76,220,154,0.43)",
    stroke: "#58e4a1",
    label: "Correct",
  },
  answer: {
    fill: "rgba(61,166,115,0.36)",
    stroke: "#439d78",
    label: "Other correct answer",
  },
  incorrect: {
    fill: "rgba(238,118,112,0.43)",
    stroke: "#ff9792",
    label: "Incorrect",
  },
  visited: {
    fill: "rgba(171,152,223,0.28)",
    stroke: "#bba5f1",
    label: "Visited",
  },
  disabled: {
    fill: "rgba(90,112,121,0.23)",
    stroke: "rgba(150,166,169,0.23)",
    label: "Disabled",
  },
  hinted: {
    fill: "rgba(243,207,115,0.32)",
    stroke: "#f3cf73",
    label: "Hinted",
  },
  clue: {
    fill: "rgba(243,207,115,0.32)",
    stroke: "#f3cf73",
    label: "Clue territory",
  },
};
export function regionStyle(state: VisualState = "default", hovered = false) {
  const style = stateStyles[state];
  return hovered && state !== "disabled"
    ? {
        ...style,
        fill: state === "default" ? stateStyles.hover.fill : style.fill,
        stroke: stateStyles.hover.stroke,
      }
    : style;
}
