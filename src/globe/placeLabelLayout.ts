export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Try nearby screen anchors before dropping an authored city's name. */
export function placeLabelPlacement(
  x: number,
  y: number,
  w: number,
  h: number,
  width: number,
  height: number,
  occupied: readonly LabelBox[],
  answerTarget = false,
  surfaceAligned = false,
) {
  const centers = surfaceAligned
    ? [[0.5, 0.5]]
    : answerTarget
      ? [
          [0.5, -Math.max(0.5, 12 / h)],
          [0.5, Math.max(1.5, 1 + 12 / h)],
          [-14 / w, 0.5],
          [1 + 14 / w, 0.5],
          [-14 / w, -0.5],
          [1 + 14 / w, -0.5],
        ]
      : [[0.5, -0.32]];
  for (const [cx, cy] of centers) {
    const box = {
      left: x - cx * w,
      right: x + (1 - cx) * w,
      top: y - (1 - cy) * h,
      bottom: y + cy * h,
    };
    if (
      box.left >= 0 &&
      box.right <= width &&
      box.top >= 0 &&
      box.bottom <= height &&
      !occupied.some(
        (p) =>
          box.left < p.right + 5 &&
          box.right > p.left - 5 &&
          box.top < p.bottom + 3 &&
          box.bottom > p.top - 3,
      )
    )
      return { box, cx, cy };
  }
}
