import { MAP_ANNOTATION_ALTITUDE } from "./surface";
import { Vector3 } from "three";
import type { PerspectiveCamera } from "three";
import type { Focus, RegionFeature } from "../geography/types";
import { interiorAnchor } from "../geography/interiorAnchor";
import { DEFAULT_THEME, THEMES } from "../theme/themes";
import type { ThemeId } from "../theme/themes";
import { playColors } from "../theme/playColors";
import type { LabelBox } from "./placeLabels";

export interface ClueLocator {
  id: string;
  label: string;
  /** A finite ripple at the island itself; no extra name or leader line. */
  pulseOnly?: boolean;
  /** Replay the pulse while this locator is displayed; reduced motion stays finite. */
  repeat?: boolean;
  /** Strong success ripple for the final Border Run crossing. */
  appearance?: "completion";
  region: RegionFeature;
  /** Fixed geographic anchor for a border crossing or other supplied point. */
  anchor?: Pick<Focus, "lat" | "lng">;
}
const svg = <K extends keyof SVGElementTagNameMap>(tag: K) =>
  document.createElementNS("http://www.w3.org/2000/svg", tag);
const position = (lng: number, lat: number) => {
  const phi = (lat * Math.PI) / 180,
    theta = (lng * Math.PI) / 180;
  return new Vector3(
    Math.cos(phi) * Math.sin(theta),
    Math.sin(phi),
    Math.cos(phi) * Math.cos(theta),
  );
};

/** Project the supplied footprint, not its owner or grading geometry. */
export function prepareClueLocator(clue: ClueLocator) {
  const geometry = clue.region.displayGeometry ?? clue.region.geometry;
  const parts =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const anchor =
    clue.anchor ??
    (clue.pulseOnly ? clue.region.focus : interiorAnchor(clue.region));
  return {
    anchor: position(anchor.lng, anchor.lat),
    pulseOnly: !!clue.pulseOnly,
    altitude: clue.pulseOnly ? MAP_ANNOTATION_ALTITUDE : 0.002,
    polygons: (clue.pulseOnly ? [] : parts).map((rings) =>
      rings.map((ring) => ring.map(([lng, lat]) => position(lng, lat))),
    ),
  };
}
export function projectClueLocator(
  clue: ReturnType<typeof prepareClueLocator>,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  radius: number,
) {
  if (!width || !height || camera.position.length() <= radius) return;
  if (
    clue.anchor.dot(camera.position.clone().normalize()) <=
    radius / camera.position.length()
  )
    return;
  const screen = (point: Vector3) => {
    const p = point
      .clone()
      .multiplyScalar(radius * (1 + clue.altitude))
      .project(camera);
    return { x: ((p.x + 1) * width) / 2, y: ((1 - p.y) * height) / 2, z: p.z };
  };
  const anchor = screen(clue.anchor);
  if (
    anchor.z < -1 ||
    anchor.z > 1 ||
    anchor.x < 0 ||
    anchor.x > width ||
    anchor.y < 0 ||
    anchor.y > height
  )
    return;
  if (clue.pulseOnly) return { x: anchor.x, y: anchor.y };
  const area = clue.polygons.reduce(
    (sum, rings) =>
      sum +
      Math.max(
        0,
        rings.reduce((polygonArea, ring, index) => {
          const points = ring.map(screen);
          let twiceArea = 0;
          for (let i = 1; i < points.length; i++)
            twiceArea +=
              points[i - 1].x * points[i].y - points[i].x * points[i - 1].y;
          return polygonArea + Math.abs(twiceArea / 2) * (index === 0 ? 1 : -1);
        }, 0),
      ),
    0,
  );
  // Sparse archipelagos and narrow features need help even with long bounding boxes.
  if (!Number.isFinite(area) || area >= 1600) return;
  return { x: anchor.x, y: anchor.y };
}
function placement(
  x: number,
  y: number,
  label: string,
  width: number,
  height: number,
  occupied: readonly LabelBox[],
) {
  const w = label.length * 7 + 10,
    h = 22;
  for (const [dx, dy] of [
    [30, -28],
    [30, 14],
    [-w - 30, -28],
    [-w - 30, 14],
  ]) {
    const box = {
      left: x + dx,
      right: x + dx + w,
      top: y + dy,
      bottom: y + dy + h,
    };
    if (
      box.left < 8 ||
      box.right > width - 8 ||
      box.top < 8 ||
      box.bottom > height - 8
    )
      continue;
    if (
      occupied.some(
        (b) =>
          box.left < b.right + 6 &&
          box.right > b.left - 6 &&
          box.top < b.bottom + 4 &&
          box.bottom > b.top - 4,
      )
    )
      continue;
    return { box, dx, dy, endX: dx > 0 ? dx - 5 : dx + w + 5 };
  }
}
interface Entry {
  clue: ClueLocator;
  prepared: ReturnType<typeof prepareClueLocator>;
  group: SVGGElement;
  line: SVGPathElement;
  text: SVGTextElement;
  pulsed: boolean;
}
/** Noninteractive screen-space orientation: two pulses, then a persistent callout. */
export class ClueLocators {
  readonly element = svg("svg");
  private entries = new Map<string, Entry>();
  private reduced = false;
  private pendingPulses = false;
  needsRefresh() {
    return this.pendingPulses;
  }
  constructor() {
    this.element.classList.add("clue-locators");
    this.element.setAttribute("aria-hidden", "true");
  }
  update(
    clues: readonly ClueLocator[],
    palette: ThemeId = DEFAULT_THEME,
    reduced = false,
  ) {
    this.reduced = reduced;
    const colors = playColors(palette);
    this.element.style.color = colors.hinted;
    this.element.style.setProperty(
      "--clue-label-stroke",
      THEMES[palette].globe.ocean,
    );
    this.element.dataset.reduced = String(reduced);
    const active = new Set(clues.map((c) => c.id));
    for (const [id, entry] of this.entries)
      if (!active.has(id)) {
        entry.group.remove();
        this.entries.delete(id);
      }
    for (const clue of clues) {
      let entry = this.entries.get(clue.id);
      if (!entry) {
        const group = svg("g"),
          pulse = svg("circle"),
          line = svg("path"),
          text = svg("text");
        group.style.display = "none";
        group.classList.toggle("island-locator", !!clue.pulseOnly);
        pulse.setAttribute("r", clue.pulseOnly ? "12" : "18");
        pulse.classList.add("clue-locator-pulse");
        text.textContent = clue.pulseOnly ? "" : clue.label;
        group.append(pulse);
        if (!clue.pulseOnly) group.append(line, text);
        this.element.append(group);
        entry = {
          clue,
          prepared: prepareClueLocator(clue),
          group,
          line,
          text,
          pulsed: false,
        };
        this.entries.set(clue.id, entry);
      } else {
        if (
          (entry.clue.region.displayGeometry ?? entry.clue.region.geometry) !==
            (clue.region.displayGeometry ?? clue.region.geometry) ||
          entry.clue.anchor?.lat !== clue.anchor?.lat ||
          entry.clue.anchor?.lng !== clue.anchor?.lng
        )
          entry.prepared = prepareClueLocator(clue);
        entry.clue = clue;
        entry.text.textContent = clue.pulseOnly ? "" : clue.label;
      }
      entry.group.classList.toggle(
        "completion-pulse-group",
        clue.appearance === "completion",
      );
      const pulse = entry.group.querySelector(
        "circle:not(.completion-pulse-casing)",
      )!;
      if (clue.appearance === "completion") {
        pulse.classList.replace("clue-locator-pulse", "completion-pulse");
        pulse.setAttribute("r", "20");
        if (!entry.group.querySelector(".completion-pulse-casing")) {
          const casing = pulse.cloneNode() as SVGCircleElement;
          casing.classList.add("completion-pulse-casing");
          entry.group.insertBefore(casing, pulse);
        }
      } else {
        entry.group.querySelector(".completion-pulse-casing")?.remove();
        pulse.classList.replace("completion-pulse", "clue-locator-pulse");
        pulse.setAttribute("r", clue.pulseOnly ? "12" : "18");
      }
      entry.group.classList.toggle("is-repeating", !!clue.repeat);
      if (reduced && !clue.pulseOnly)
        entry.group.classList.remove("is-pulsing");
    }
  }
  /** Explicit replay never changes a circle, camera, help stage or score. */
  pulse() {
    for (const entry of this.entries.values())
      entry.group.classList.remove("is-pulsing");
    // Flush the finite CSS animation before replaying it, once per button press.
    this.element.getBoundingClientRect();
    for (const entry of this.entries.values()) entry.pulsed = false;
  }
  view(
    camera: PerspectiveCamera,
    width: number,
    height: number,
    radius: number,
    reserved: readonly LabelBox[] = [],
    settled = true,
  ): LabelBox[] {
    this.pendingPulses = false;
    this.element.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const occupied = [...reserved],
      boxes: LabelBox[] = [];
    for (const entry of this.entries.values()) {
      const point = projectClueLocator(
        entry.prepared,
        camera,
        width,
        height,
        radius,
      );
      if (entry.clue.pulseOnly) {
        const behindPanel =
          point &&
          reserved.some(
            (b) =>
              point.x >= b.left &&
              point.x <= b.right &&
              point.y >= b.top &&
              point.y <= b.bottom,
          );
        entry.group.style.display = point && !behindPanel ? "" : "none";
        if (point && !behindPanel) {
          entry.group.setAttribute(
            "transform",
            `translate(${point.x} ${point.y})`,
          );
          const canPulse = settled || entry.clue.appearance === "completion";
          if (!canPulse && !entry.pulsed) this.pendingPulses = true;
          if (canPulse && !entry.pulsed) {
            entry.group.classList.add("is-pulsing");
            entry.pulsed = true;
          }
        }
        continue;
      }
      const label =
        point &&
        placement(point.x, point.y, entry.clue.label, width, height, occupied);
      if (
        !point ||
        !label ||
        reserved.some(
          (b) =>
            point.x >= b.left &&
            point.x <= b.right &&
            point.y >= b.top &&
            point.y <= b.bottom,
        )
      ) {
        entry.group.style.display = "none";
        entry.group.classList.remove("is-pulsing");
        continue;
      }
      entry.group.style.display = "";
      entry.group.setAttribute("transform", `translate(${point.x} ${point.y})`);
      entry.line.setAttribute("d", `M0 0 L${label.endX} ${label.dy + 11}`);
      entry.text.setAttribute("x", String(label.dx));
      entry.text.setAttribute("y", String(label.dy + 15));
      if (!entry.pulsed) {
        if (!this.reduced) entry.group.classList.add("is-pulsing");
        entry.pulsed = true;
      }
      occupied.push(label.box);
      boxes.push(label.box);
    }
    return boxes;
  }
  dispose() {
    this.entries.clear();
    this.element.remove();
    this.element.replaceChildren();
  }
}
