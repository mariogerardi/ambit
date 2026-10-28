import { Color, DoubleSide, MeshLambertMaterial } from "three";
import { outlineColor } from "./outlines";

export interface RegionReveal {
  key: string;
  ids: string[];
  clueIds: string[];
  durationMs: number;
}
type Fill = { color: Color; opacity: number };
const fill = (value: string): Fill => {
  const parsed = outlineColor(value);
  return { color: new Color(parsed.color), opacity: parsed.opacity };
};
type Entry = {
  key: string;
  scope?: string;
  material: MeshLambertMaterial;
  from: Fill;
  to: Fill;
  start: number;
  duration: number;
  pending: boolean;
};

/** Country fills blend on the render clock, without rebuilding geography or React state. */
export class RegionFades {
  private entries = new Map<string, Entry>();
  private sample(entry: Entry, now: number) {
    const t =
      entry.duration <= 0
        ? 1
        : Math.min(1, Math.max(0, (now - entry.start) / entry.duration));
    const eased = t * t * (3 - 2 * t);
    if (t === 1) entry.material.color.copy(entry.to.color);
    else
      entry.material.color.copy(entry.from.color).lerp(entry.to.color, eased);
    entry.material.opacity =
      entry.from.opacity + (entry.to.opacity - entry.from.opacity) * eased;
    entry.material.transparent =
      entry.material.opacity < 1 || entry.to.opacity < 1;
    entry.material.depthWrite = !entry.material.transparent;
    entry.pending = t < 1;
  }
  private begin(
    id: string,
    key: string,
    from: Fill,
    to: Fill,
    duration: number,
    scope?: string,
  ) {
    const entry: Entry = this.entries.get(id) ?? {
      key,
      material: new MeshLambertMaterial({ side: DoubleSide }),
      from,
      to,
      start: 0,
      duration,
      pending: false,
    };
    Object.assign(entry, {
      key,
      scope,
      from,
      to,
      start: performance.now(),
      duration,
    });
    this.entries.set(id, entry);
    this.sample(entry, entry.start);
    return entry.material;
  }
  /** Explicit route reveals may deliberately restart from their clue color. */
  get(
    id: string,
    key: string,
    from: string,
    to: string,
    duration: number,
    scope?: string,
  ) {
    const entry = this.entries.get(id),
      target = fill(to);
    if (
      !entry ||
      entry.scope !== scope ||
      entry.key !== key ||
      !entry.to.color.equals(target.color) ||
      entry.to.opacity !== target.opacity
    )
      return this.begin(id, key, fill(from), target, duration, scope);
    return entry.material;
  }
  /** Ordinary state changes start from the current rendered color, including interrupted fades. */
  transition(id: string, to: string, duration: number, scope?: string) {
    const entry = this.entries.get(id),
      target = fill(to);
    // A new puzzle must not briefly disclose the previous puzzle's answer colors.
    if (!entry || entry.scope !== scope)
      return this.begin(id, "state", target, target, 0, scope);
    if (
      entry.to.color.equals(target.color) &&
      entry.to.opacity === target.opacity
    ) {
      if (duration === 0 && entry.pending) {
        entry.duration = 0;
        this.sample(entry, performance.now());
      }
      return entry.material;
    }
    this.sample(entry, performance.now());
    return this.begin(
      id,
      "state",
      { color: entry.material.color.clone(), opacity: entry.material.opacity },
      target,
      duration,
      scope,
    );
  }
  view() {
    const now = performance.now();
    for (const entry of this.entries.values())
      if (entry.pending) this.sample(entry, now);
  }
  needsRefresh() {
    return [...this.entries.values()].some((e) => e.pending);
  }
  dispose() {
    for (const e of this.entries.values()) e.material.dispose();
    this.entries.clear();
  }
}
