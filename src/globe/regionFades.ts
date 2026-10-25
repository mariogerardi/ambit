import { Color, DoubleSide, MeshLambertMaterial } from "three";

export interface RegionReveal {
  key: string;
  ids: string[];
  clueIds: string[];
  durationMs: number;
}

/** Country fills blend on the render clock, without rebuilding geography or React state. */
export class RegionFades {
  private entries = new Map<
    string,
    {
      key: string;
      material: MeshLambertMaterial;
      from: Color;
      to: Color;
      start: number;
      duration: number;
      pending: boolean;
    }
  >();
  get(id: string, key: string, from: string, to: string, duration: number) {
    let entry = this.entries.get(id);
    if (!entry) {
      entry = {
        key: "",
        material: new MeshLambertMaterial({ side: DoubleSide }),
        from: new Color(),
        to: new Color(),
        start: 0,
        duration: 0,
        pending: false,
      };
      this.entries.set(id, entry);
    }
    if (entry.key !== key || !entry.to.equals(new Color(to))) {
      entry.key = key;
      entry.from.set(from);
      entry.to.set(to);
      entry.material.color.copy(entry.from);
      entry.start = performance.now();
      entry.duration = duration;
      entry.pending = true;
    }
    return entry.material;
  }
  view() {
    const now = performance.now();
    for (const entry of this.entries.values())
      if (entry.pending) {
        const t = Math.min(
          1,
          (now - entry.start) / Math.max(1, entry.duration),
        );
        const eased = t * t * (3 - 2 * t);
        if (t === 1) entry.material.color.copy(entry.to);
        else entry.material.color.copy(entry.from).lerp(entry.to, eased);
        entry.pending = t < 1;
      }
  }
  needsRefresh() {
    return [...this.entries.values()].some((e) => e.pending);
  }
  dispose() {
    for (const e of this.entries.values()) e.material.dispose();
    this.entries.clear();
  }
}
