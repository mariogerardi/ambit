interface BorderLine {
  visible: boolean;
  material: { opacity: number };
}
interface Fade {
  scope?: string;
  from: number;
  to: number;
  start: number;
  duration: number;
  pending: boolean;
  waiting: boolean;
}
/** Keep disappearing outlines mounted until their short opacity transition ends. */
export class BorderFades {
  private entries = new Map<BorderLine, Fade>();
  private visibilityCheckPending = false;
  private sample(line: BorderLine, fade: Fade, now: number) {
    const t = fade.duration
      ? Math.min(1, Math.max(0, (now - fade.start) / fade.duration))
      : 1;
    const ease = t * t * (3 - 2 * t);
    line.material.opacity =
      t === 1 ? fade.to : fade.from + (fade.to - fade.from) * ease;
    line.visible = line.material.opacity > 0 || fade.to > 0;
    fade.pending = t < 1;
  }
  update(
    line: BorderLine,
    opacity: number,
    reduced = false,
    scope?: string,
    waitForVisibility = false,
  ) {
    const now = performance.now(),
      previous = this.entries.get(line);
    if (previous) {
      this.sample(line, previous, now);
      if (previous.to === opacity && previous.scope === scope && !reduced)
        return;
    }
    const duration =
      reduced || previous?.scope !== scope ? 0 : GLOBE_MOTION.stateFadeMs;
    const fade = {
      scope,
      from: previous ? line.material.opacity : 0,
      to: opacity,
      start: waitForVisibility && duration > 0 ? Infinity : now,
      duration,
      pending: true,
      waiting: waitForVisibility && duration > 0,
    };
    this.entries.set(line, fade);
    if (fade.waiting) this.visibilityCheckPending = true;
    this.sample(line, fade, now);
  }
  view(visible: (line: BorderLine) => boolean = () => true) {
    this.visibilityCheckPending = false;
    const now = performance.now();
    for (const [line, fade] of this.entries) {
      if (fade.waiting && visible(line)) {
        fade.waiting = false;
        fade.start = now;
      }
      if (fade.pending) this.sample(line, fade, now);
    }
  }
  needsRefresh() {
    return (
      this.visibilityCheckPending ||
      [...this.entries.values()].some((fade) => fade.pending && !fade.waiting)
    );
  }
  forget(line: BorderLine) {
    this.entries.delete(line);
  }
  dispose() {
    this.entries.clear();
  }
}
import { GLOBE_MOTION } from "./motion";
