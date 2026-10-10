/** A touch has a location, but no persistent hover cursor. */
export class SurfaceInspection {
  private mouse = false;
  pointer(type: string) {
    this.mouse = type === "mouse";
  }
  clear() {
    this.mouse = false;
  }
  get allowed() {
    return this.mouse;
  }
}
