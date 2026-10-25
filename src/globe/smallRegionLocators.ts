import { geoArea } from "d3-geo";
import { Vector3 } from "three";
import type { PerspectiveCamera } from "three";
import type { RegionFeature, VisualState } from "../geography/types";
import { interiorAnchor } from "../geography/interiorAnchor";
import { sphericalGeometry } from "../geography/sphericalGeometry.mjs";
import { canPickRegion } from "./interaction";
import { playRegionStyle } from "./themes";
import type { ThemeId } from "../theme/themes";
import type { LabelBox } from "./placeLabels";

type Settings = Parameters<typeof canPickRegion>[1] & {
  active?: boolean;
  onCoordinateTap?: unknown;
  constructionInput?: unknown;
  onSurfaceTap?: unknown;
  palette?: ThemeId;
  hovered?: string;
};
const emphasized: VisualState[] = [
  "selected",
  "correct",
  "answer",
  "incorrect",
  "visited",
  "clue",
  "hinted",
];
const prepared = new WeakMap<
  RegionFeature,
  { anchor: Vector3; area: number }
>();
export function prepareSmallRegion(region: RegionFeature) {
  let value = prepared.get(region);
  if (!value) {
    const { lat, lng } = interiorAnchor(region);
    const phi = (lat * Math.PI) / 180,
      theta = (lng * Math.PI) / 180;
    value = {
      anchor: new Vector3(
        Math.cos(phi) * Math.sin(theta),
        Math.sin(phi),
        Math.cos(phi) * Math.cos(theta),
      ),
      area: geoArea(
        sphericalGeometry(region.displayGeometry ?? region.geometry),
      ),
    };
    prepared.set(region, value);
  }
  return value;
}

/** Approximate projected land area, not bounding-box area: sparse islands need help too. */
export function projectSmallRegion(
  region: ReturnType<typeof prepareSmallRegion>,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  radius: number,
  minVisibleArea = 100,
) {
  if (!width || !height || region.anchor.dot(camera.position) <= radius) return;
  const world = region.anchor.clone().multiplyScalar(radius);
  const view = world.clone().applyMatrix4(camera.matrixWorldInverse);
  const screen = world.clone().project(camera);
  if (
    view.z >= 0 ||
    Math.abs(screen.x) > 1 ||
    Math.abs(screen.y) > 1 ||
    Math.abs(screen.z) > 1
  )
    return;
  const scale = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const facing = Math.max(
    0,
    region.anchor.dot(camera.position.clone().sub(world).normalize()),
  );
  // A broad country should not acquire a locator just from grazing the horizon.
  const area =
    region.area * ((radius * scale) / view.z) ** 2 * Math.max(0.35, facing);
  if (!Number.isFinite(area) || area >= minVisibleArea) return;
  return { x: ((screen.x + 1) * width) / 2, y: ((1 - screen.y) * height) / 2 };
}

const svg = <K extends keyof SVGElementTagNameMap>(tag: K) =>
  document.createElementNS("http://www.w3.org/2000/svg", tag);

/** Screen-space rings help locate and tap small map units without naming an answer. */
export class SmallRegionLocators {
  readonly element = svg("svg");
  private entries: {
    region: RegionFeature;
    group: SVGGElement;
    ring: SVGCircleElement;
    dot: SVGCircleElement;
    prominent: boolean;
    prepared: ReturnType<typeof prepareSmallRegion>;
  }[] = [];
  private targets: { region: RegionFeature; x: number; y: number }[] = [];
  private settings: Settings = { states: {} };
  constructor() {
    this.element.classList.add("small-region-locators");
    this.element.setAttribute("aria-hidden", "true");
  }
  update(regions: RegionFeature[], settings: Settings) {
    this.settings = settings;
    this.targets = [];
    const previous = new Map(this.entries.map((e) => [e.region, e]));
    this.entries = [];
    for (const region of regions) {
      const state = settings.states[region.id] ?? "default";
      if (
        settings.active === false ||
        settings.constructionInput ||
        (settings.onCoordinateTap && state !== "clue") ||
        region.displayBase ||
        region.displayCovered ||
        region.level !== "ADM0"
      )
        continue;
      if (
        !emphasized.includes(state) &&
        !canPickRegion(region, settings) &&
        !settings.onSurfaceTap
      )
        continue;
      if (state === "surface") continue;
      let entry = previous.get(region);
      if (!entry) {
        const group = svg("g"),
          ring = svg("circle"),
          dot = svg("circle");
        ring.setAttribute("fill", "none");
        group.append(ring, dot);
        group.style.display = "none";
        entry = {
          region,
          group,
          ring,
          dot,
          prominent: false,
          prepared: prepareSmallRegion(region),
        };
      }
      const style = playRegionStyle(
        region.id,
        state,
        settings.hovered === region.id && canPickRegion(region, settings),
        settings.palette,
      );
      entry.group.style.color = style.fill;
      entry.prominent =
        emphasized.includes(state) || settings.hovered === region.id;
      entry.group.style.opacity = entry.prominent ? "0.9" : "0.55";
      entry.ring.setAttribute("stroke-width", entry.prominent ? "1.4" : "1");
      this.entries.push(entry);
    }
    this.element.replaceChildren(...this.entries.map((e) => e.group));
  }
  view(
    camera: PerspectiveCamera,
    width: number,
    height: number,
    radius: number,
    reserved: readonly LabelBox[] = [],
  ) {
    this.element.setAttribute("viewBox", `0 0 ${width} ${height}`);
    this.targets = [];
    const zoom = Math.max(
      0,
      Math.min(
        1,
        (radius / Math.max(0.001, camera.position.length() - radius) - 0.25) /
          1.75,
      ),
    );
    for (const entry of this.entries) {
      const ringRadius = entry.prominent
        ? 4.5 + zoom * 2.5
        : 2.75 + zoom * 2.75;
      entry.ring.setAttribute("r", String(ringRadius));
      entry.dot.setAttribute("r", entry.prominent ? "1.3" : "0.8");
      const point = projectSmallRegion(
        entry.prepared,
        camera,
        width,
        height,
        radius,
        entry.prominent ? 625 : 225,
      );
      const visible =
        point &&
        !reserved.some(
          (b) =>
            point.x + ringRadius + 1 > b.left &&
            point.x - ringRadius - 1 < b.right &&
            point.y + ringRadius + 1 > b.top &&
            point.y - ringRadius - 1 < b.bottom,
        );
      entry.group.style.display = visible ? "" : "none";
      if (visible && point) {
        entry.group.setAttribute(
          "transform",
          `translate(${point.x} ${point.y})`,
        );
        if (
          !this.settings.onCoordinateTap &&
          (canPickRegion(entry.region, this.settings) ||
            this.settings.onSurfaceTap)
        )
          this.targets.push({ region: entry.region, ...point });
      }
    }
  }
  pick(x: number, y: number, radius = 14) {
    return this.targets
      .map((target) => ({
        ...target,
        distance: Math.hypot(x - target.x, y - target.y),
      }))
      .filter((target) => target.distance <= radius)
      .sort((a, b) => a.distance - b.distance)[0]?.region;
  }
  dispose() {
    this.element.remove();
    this.entries = [];
    this.targets = [];
  }
}
