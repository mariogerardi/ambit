/** CSS-pixel gesture guard, independent of OrbitControls' pointer-down events. */
export class SurfaceGesture {
  private pointers = new Map<number, { x: number; y: number }>();
  private navigated = false;
  private tapped = false;
  down(id: number, x: number, y: number) {
    if (!this.pointers.size) {
      this.navigated = false;
      this.tapped = false;
    }
    this.pointers.set(id, { x, y });
    if (this.pointers.size > 1) this.navigated = true;
  }
  move(id: number, x: number, y: number) {
    const origin = this.pointers.get(id);
    if (origin && Math.hypot(x - origin.x, y - origin.y) > 8)
      this.navigated = true;
  }
  up(id: number, x: number, y: number) {
    this.move(id, x, y);
    this.pointers.delete(id);
    this.tapped = !this.navigated && !this.pointers.size;
  }
  cancel() {
    this.navigated = true;
    this.tapped = false;
    this.pointers.clear();
  }
  consume() {
    const result = this.tapped;
    this.tapped = false;
    return result;
  }
}
