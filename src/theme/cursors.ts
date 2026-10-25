import type { playColors } from "./playColors";

/** SVG cursor images cannot inherit document CSS variables. Bake the live ink in. */
export function themeCursors(
  colors: ReturnType<typeof playColors>,
  paper: string,
) {
  const svg = (
    body: string,
    width: number,
    height: number,
    viewBox: string,
    x: number,
    y: number,
  ) =>
    `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${body}</svg>`)}") ${x} ${y}, crosshair`;
  const outline = colors.outline;
  return {
    paint: svg(
      `<path d="M10 21 24 4Q27 1 29 5L15 24Z" fill="${colors.selected}" stroke="${outline}" stroke-width="2"/><path d="M4 28Q3 20 10 20L15 24Q12 30 4 28Z" fill="${paper}" stroke="${outline}" stroke-width="2"/>`,
      32,
      32,
      "0 0 32 32",
      4,
      28,
    ),
    erase: svg(
      `<path d="m4 20 15-16q2-2 4 0l6 6q2 2 0 4L15 28H10Z" fill="${colors.incorrect}" stroke="${outline}" stroke-width="2"/><path d="m4 20 8-8 11 10-8 6H10Z" fill="${paper}" stroke="${outline}" stroke-width="2"/>`,
      32,
      32,
      "0 0 32 32",
      4,
      24,
    ),
    pin: svg(
      `<path d="M20 53C17 43 5 30 5 19a15 15 0 0 1 30 0c0 11-12 24-15 34Z" fill="${colors.selected}" stroke="${outline}" stroke-width="2"/><circle cx="20" cy="19" r="5" fill="${outline}"/>`,
      32,
      40,
      "0 0 40 56",
      16,
      38,
    ),
  };
}
