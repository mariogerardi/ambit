import { Color, DoubleSide, MeshLambertMaterial } from "three";
import { outlineColor } from "./outlines";

export interface RegionReveal {
  key: string;
  ids: string[];
  clueIds: string[];
  durationMs: number;
  stepMs?: number;
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
  waiting: boolean;
  delay: number;
};

/** A rewind/replay clears prior answers; entering feedback within a question does not. */
export class RegionScene {
  private key?: string;
  private phase?: string;
  private epoch = 0;
  scope(key?: string, phase?: string) {
    if (key !== this.key || (phase === "playing" && this.phase !== phase))
      this.epoch++;
    this.key = key;
    this.phase = phase;
    return key === undefined ? undefined : `${key}:${this.epoch}`;
  }
}

/** Country fills blend on the render clock, without rebuilding geography or React state. */
export class RegionFades {
  private entries = new Map<string, Entry>();
  private visibilityCheckPending = false;
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
    delay = 0,
    waitForVisibility = false,
  ) {
    const entry: Entry = this.entries.get(id) ?? {
      key,
      material: new MeshLambertMaterial({ side: DoubleSide }),
      from,
      to,
      start: 0,
      duration,
      pending: false,
      waiting: false,
      delay: 0,
    };
    Object.assign(entry, {
      key,
      scope,
      from,
      to,
      start:
        waitForVisibility && duration > 0
          ? Infinity
          : performance.now() + delay,
      duration,
      waiting: waitForVisibility && duration > 0,
      delay,
    });
    this.entries.set(id, entry);
    if (entry.waiting) this.visibilityCheckPending = true;
    this.sample(entry, performance.now());
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
    delay = 0,
    waitForVisibility = false,
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
      return this.begin(
        id,
        key,
        fill(from),
        target,
        duration,
        scope,
        delay,
        waitForVisibility,
      );
    if (duration === 0 && entry.pending) {
      entry.duration = 0;
      entry.waiting = false;
      this.sample(entry, performance.now());
    }
    return entry.material;
  }
  /** Ordinary state changes start from the current rendered color, including interrupted fades. */
  transition(
    id: string,
    to: string,
    duration: number,
    scope?: string,
    waitForVisibility = false,
  ) {
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
        entry.waiting = false;
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
      0,
      waitForVisibility,
    );
  }
  view(visible: (id: string) => boolean = () => true) {
    this.visibilityCheckPending = false;
    const now = performance.now();
    for (const [id, entry] of this.entries) {
      if (entry.waiting && visible(id)) {
        entry.waiting = false;
        entry.start = now + entry.delay;
      }
      if (entry.pending) this.sample(entry, now);
    }
  }
  needsRefresh() {
    return (
      this.visibilityCheckPending ||
      [...this.entries.values()].some((e) => e.pending && !e.waiting)
    );
  }
  dispose() {
    for (const e of this.entries.values()) e.material.dispose();
    this.entries.clear();
  }
}
