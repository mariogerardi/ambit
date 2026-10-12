import {
  CanvasTexture,
  Group,
  Sprite,
  SpriteMaterial,
  Vector3,
  SRGBColorSpace,
} from "three";
import type { PerspectiveCamera } from "three";
import type { PlaceFeature } from "../geography/types";
import { PLAY_HIGHLIGHTS } from "./themes";
export interface PlaceLabelLayer {
  id: string;
  kind: "place-labels";
  places: PlaceFeature[];
  visible: boolean;
  markers?: boolean;
  /** Broad context layers reveal smaller places with zoom; authored clues stay explicit. */
  contextual?: boolean;
  density?: "physical" | "study";
}
export const isPlaceLabels = (value: object): value is PlaceLabelLayer =>
  "kind" in value && value.kind === "place-labels";
export function placeStyle(kind: PlaceFeature["kind"]) {
  if (["river", "mountain", "landform", "ocean"].includes(kind))
    return {
      shape: "circle",
      marker: "#101010",
      text:
        kind === "river"
          ? "#b0e5ef"
          : kind === "mountain" || kind === "landform"
            ? "#ede1ca"
            : "#bddde1",
      font: "500 24px Manrope, sans-serif",
      textHeight: 24,
    };
  if (kind === "pin")
    return {
      shape: "pin",
      marker: "#ffd665",
      text: "#f4f8ff",
      font: "500 26px Manrope, sans-serif",
      textHeight: 24,
    };
  return kind === "capital"
    ? {
        shape: "star",
        marker: "#e4e8df",
        text: "#f4f8ff",
        font: "500 26px Manrope, sans-serif",
        textHeight: 26,
      }
    : {
        shape: "circle",
        marker: "#101010",
        text: "#f4f8ff",
        font: "500 26px Manrope, sans-serif",
        textHeight: 24,
      };
}
/** Texture padding is included: city dots are ~4px, ~5.5px for large cities. */
export function placeMarkerSize(place: PlaceFeature) {
  if (place.markerSize !== undefined) return place.markerSize;
  if (place.kind === "pin") return 36;
  if (place.answerTarget) return place.visualState === "selected" ? 34 : 30;
  return place.kind === "capital"
    ? 18
    : (place.population ?? 0) >= 2_000_000
      ? 18
      : 13;
}
/** City quotas are per visible country; capitals do not consume them. */
export function countryCityLimit(altitude: number) {
  return altitude >= 1.2 ? 3 : altitude >= 0.4 ? 6 : 10;
}
/** Inset context places from the apparent horizon, independent of zoom. */
export function placeHorizonVisible(
  facing: number,
  horizon: number,
  kind: PlaceFeature["kind"],
  contextual: boolean,
) {
  return (
    facing > horizon &&
    (!contextual ||
      (facing - horizon) / (1 - horizon) > (kind === "capital" ? 0.12 : 0.28))
  );
}
export function physicalNameLimit(
  kind: PlaceFeature["kind"],
  altitude: number,
) {
  return kind === "river"
    ? altitude >= 1.2
      ? 2
      : altitude >= 0.4
        ? 4
        : 6
    : kind === "landform"
      ? altitude >= 1.2
        ? 1
        : altitude >= 0.4
          ? 2
          : 3
      : kind === "ocean"
        ? altitude >= 1.2
          ? 1
          : altitude >= 0.4
            ? 2
            : 3
        : kind === "mountain"
          ? altitude >= 1.2
            ? 2
            : 3
          : 3;
}
function placeTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace; // Canvas RGB colors must not be treated as linear data.
  return texture;
}
export function placeDetailVisible(place: PlaceFeature, altitude: number) {
  if (
    ["river", "mountain", "landform", "ocean"].includes(place.kind) ||
    altitude < 0.4
  )
    return true;
  const minimum =
    altitude >= 1.2
      ? place.kind === "capital"
        ? 1_000_000
        : 2_000_000
      : place.kind === "capital"
        ? 100_000
        : 500_000;
  return (place.population ?? 0) >= minimum;
}
export interface LabelBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
/** Answer cities share one style so a capital's typography cannot disclose it. */
export const placeLabelStyle = (place: PlaceFeature) =>
  placeStyle(place.answerTarget ? "city" : place.kind);

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
) {
  const centers = answerTarget
    ? [
        [0.5, -0.5],
        [0.5, 1.5],
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
interface Entry {
  place: PlaceFeature;
  position: Vector3;
  label?: Sprite;
  marker?: Sprite;
}
/** Cached screen-sized place symbols/text, drawn above land but culled at Earth's horizon. */
export class PlaceLabels {
  readonly group = new Group();
  private sprites = new Map<string, Sprite>();
  private markers = new Map<string, Sprite>();
  private markerMaterials = new Map<string, SpriteMaterial>();
  private active: Entry[] = [];
  private data?: PlaceFeature[];
  private showLabels = false;
  private showMarkers = false;
  private radius = 100;
  private contextual = false;
  private density?: PlaceLabelLayer["density"];
  private drawnBoxes: LabelBox[] = [];
  private pendingLabels = false;
  needsRefresh() {
    return this.pendingLabels;
  }
  /** Canvas textures must be redrawn after the locally hosted font loads. */
  refreshFont() {
    for (const sprite of this.sprites.values()) {
      sprite.removeFromParent();
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.sprites.clear();
    for (const entry of this.active) entry.label = undefined;
  }
  labelBoxes(): readonly LabelBox[] {
    return this.drawnBoxes;
  }
  private targets: { place: PlaceFeature; x: number; y: number }[] = [];
  private label(place: PlaceFeature) {
    const labelKind = place.answerTarget ? "city" : place.kind;
    let sprite = this.sprites.get(place.id);
    if (
      sprite &&
      sprite.userData.labelName === place.name &&
      sprite.userData.labelKind === labelKind
    )
      return sprite;
    if (sprite) {
      sprite.removeFromParent();
      sprite.material.map?.dispose();
      sprite.material.dispose();
      this.sprites.delete(place.id);
    }
    const style = placeLabelStyle(place);
    const canvas = document.createElement("canvas"),
      context = canvas.getContext("2d")!;
    context.font = style.font;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    const metrics = context.measureText(place.name);
    const ascent = Math.ceil(metrics.actualBoundingBoxAscent ?? 26),
      descent = Math.ceil(metrics.actualBoundingBoxDescent ?? 8),
      left = Math.max(0, metrics.actualBoundingBoxLeft ?? 0),
      right = metrics.actualBoundingBoxRight ?? metrics.width;
    canvas.width = Math.ceil(Math.max(metrics.width, left + right)) + 20;
    canvas.height = Math.max(44, ascent + descent + 10);
    // Resizing resets context state. Bounds include combining marks, accents and stroke.
    context.font = style.font;
    context.textBaseline = "alphabetic";
    context.textAlign = "left";
    context.lineJoin = "round";
    context.lineWidth = labelKind === "capital" ? 4 : 6;
    const x = 10 + left,
      y = (canvas.height + ascent - descent) / 2;
    context.strokeStyle = "#071217";
    context.strokeText(place.name, x, y);
    context.fillStyle = style.text;
    context.fillText(place.name, x, y);
    sprite = new Sprite(
      new SpriteMaterial({
        map: placeTexture(canvas),
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: 1,
      }),
    );
    sprite.renderOrder = 21;
    sprite.center.set(0.5, -0.32);
    sprite.userData.aspect = canvas.width / canvas.height;
    sprite.userData.placeId = place.id;
    sprite.userData.role = "label";
    sprite.userData.labelName = place.name;
    sprite.userData.labelKind = labelKind;
    sprite.raycast = () => {}; // Text never intercepts map answers.
    this.sprites.set(place.id, sprite);
    return sprite;
  }
  private marker(place: PlaceFeature) {
    let sprite = this.markers.get(place.id);
    const style = place.answerTarget
      ? { ...placeStyle(place.kind), shape: "circle" }
      : placeStyle(place.kind);
    const color = place.visualState
      ? {
          default: "#849899",
          hover: "#ffe391",
          selectable: PLAY_HIGHLIGHTS.selectable,
          selected: PLAY_HIGHLIGHTS.selected,
          correct: "#66c590",
          answer: "#a5d9ae",
          incorrect: "#ee776b",
          visited: "#b89de0",
          disabled: "#849899",
          hinted: PLAY_HIGHLIGHTS.context,
          clue: PLAY_HIGHLIGHTS.context,
        }[place.visualState]
      : style.marker;
    const key = `${style.shape}:${color}:${!!place.answerTarget}`;
    if (sprite && sprite.userData.markerStyle === key) return sprite;
    let material = this.markerMaterials.get(key);
    if (!material) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.beginPath();
      if (style.shape === "star") {
        for (let i = 0; i < 10; i++) {
          const angle = -Math.PI / 2 + (i * Math.PI) / 5,
            radius = i % 2 ? 8 : 18;
          const x = 32 + Math.cos(angle) * radius,
            y = 32 + Math.sin(angle) * radius;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
        ctx.closePath();
      } else if (style.shape === "pin") {
        ctx.moveTo(32, 58);
        ctx.bezierCurveTo(26, 43, 13, 33, 13, 23);
        ctx.arc(32, 23, 19, Math.PI, 0);
        ctx.bezierCurveTo(51, 33, 38, 43, 32, 58);
        ctx.closePath();
      } else ctx.arc(32, 32, place.answerTarget ? 15 : 10, 0, Math.PI * 2);
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#071524";
      ctx.fillStyle = color;
      ctx.fill();
      // Context dots can share their country’s fill; a dark outline keeps them visible.
      ctx.stroke();
      if (style.shape === "pin") {
        ctx.beginPath();
        ctx.arc(32, 23, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#071524";
        ctx.fill();
      }
      material = new SpriteMaterial({
        map: placeTexture(canvas),
        depthTest: false,
        depthWrite: false,
        transparent: true,
        opacity: style.shape === "star" ? 0.9 : 1,
      });
      this.markerMaterials.set(key, material);
    }
    if (sprite) sprite.material = material;
    else sprite = new Sprite(material);
    sprite.userData.markerStyle = key;
    sprite.center.set(0.5, style.shape === "pin" ? 6 / 64 : 0.5);
    sprite.renderOrder = 20;
    sprite.userData.placeId = place.id;
    sprite.userData.role = "marker";
    const group = this.group;
    sprite.raycast = function (raycaster, intersections) {
      if (this.visible && group.visible)
        Sprite.prototype.raycast.call(this, raycaster, intersections);
    };
    this.markers.set(place.id, sprite);
    return sprite;
  }
  update(layer: PlaceLabelLayer, radius: number) {
    const markers = !!layer.markers;
    this.group.visible = layer.visible || markers;
    if (!this.group.visible) {
      this.targets = [];
      return;
    }
    if (
      this.data === layer.places &&
      this.radius === radius &&
      this.showLabels === layer.visible &&
      this.showMarkers === markers &&
      this.contextual === !!layer.contextual &&
      this.density === layer.density
    )
      return;
    this.data = layer.places;
    this.radius = radius;
    this.showLabels = layer.visible;
    this.showMarkers = markers;
    this.contextual = !!layer.contextual;
    this.density = layer.density;
    this.active = layer.places.map((place) => {
      const lat = (place.lat * Math.PI) / 180,
        lng = (place.lng * Math.PI) / 180;
      const position = new Vector3(
        Math.cos(lat) * Math.sin(lng),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lng),
      ).multiplyScalar(radius * 1.002);
      const label =
          layer.visible && !place.labelHidden && place.name && !this.contextual
            ? this.label(place)
            : undefined,
        marker =
          markers && !place.markerHidden && !this.contextual
            ? this.marker(place)
            : undefined;
      label?.position.copy(position);
      marker?.position.copy(position);
      return { place, position, label, marker };
    });
    this.group.clear();
    for (const { label, marker } of this.active) {
      if (label) this.group.add(label);
      if (marker) this.group.add(marker);
    }
  }
  view(
    camera: PerspectiveCamera,
    width: number,
    height: number,
    reserved: readonly LabelBox[] = [],
  ) {
    this.targets = [];
    this.drawnBoxes = [];
    this.pendingLabels = false;
    let newLabelBudget = 4;
    if (!this.group.visible || !height || !width) return;
    const distance = camera.position.length(),
      altitude = distance / this.radius - 1;
    const direction = camera.position.clone().normalize();
    const pixelScale = (2 * Math.tan((camera.fov * Math.PI) / 360)) / height;
    const projected = new Vector3(),
      cameraPoint = new Vector3();
    // Context sprites are created only when visible, never for the entire city pool.
    for (const child of this.group.children) child.visible = false;
    const mixedGeography = this.density === "study";
    const candidates = this.active
      .filter(
        ({ place }) =>
          !this.contextual ||
          this.density === "study" ||
          placeDetailVisible(place, altitude),
      )
      .map((entry) => {
        const { position } = entry;
        projected.copy(position).project(camera);
        cameraPoint.copy(position).applyMatrix4(camera.matrixWorldInverse);
        return {
          entry,
          front: placeHorizonVisible(
            position.dot(direction) / position.length(),
            this.radius / distance,
            entry.place.kind,
            this.contextual,
          ),
          x: ((projected.x + 1) * width) / 2,
          y: ((1 - projected.y) * height) / 2,
          depth: projected.z,
          scale: -cameraPoint.z * pixelScale,
        };
      })
      .filter(
        (p) =>
          p.front &&
          p.depth >= -1 &&
          p.depth <= 1 &&
          p.x >= 0 &&
          p.x <= width &&
          p.y >= 0 &&
          p.y <= height,
      )
      .sort(
        (a, b) =>
          (b.entry.place.priority ?? 0) - (a.entry.place.priority ?? 0) ||
          (this.contextual && !mixedGeography
            ? (b.entry.place.priority ?? b.entry.place.population ?? 0) -
              (a.entry.place.priority ?? a.entry.place.population ?? 0)
            : 0) ||
          (!mixedGeography
            ? Number(
                b.entry.place.kind === "capital" && !b.entry.place.answerTarget,
              ) -
              Number(
                a.entry.place.kind === "capital" && !a.entry.place.answerTarget,
              )
            : 0) ||
          Math.hypot(a.x - width / 2, a.y - height / 2) -
            Math.hypot(b.x - width / 2, b.y - height / 2),
      );
    const wide = altitude >= 1.2,
      regional = altitude >= 0.4;
    const markerBudget =
      this.density === "physical"
        ? Infinity
        : this.contextual
          ? wide
            ? 28
            : regional
              ? 64
              : 120
          : Infinity;
    const nameBudget =
      this.density === "physical"
        ? wide
          ? 7
          : regional
            ? 10
            : 14
        : this.contextual
          ? wide
            ? 18
            : regional
              ? 30
              : 50
          : Infinity;
    const separation = wide ? 26 : regional ? 18 : 12;
    const shown: { x: number; y: number }[] = [];
    const countryCities = new Map<string, number>();
    // Authored reference dots need the same protection as playable city targets.
    // Otherwise a moved label can cover a neighbor’s dot and appear to name it.
    const markerBoxes = this.showMarkers
      ? candidates
          .filter(
            ({ entry }) =>
              !entry.place.markerHidden &&
              (entry.place.answerTarget || !this.contextual),
          )
          .map(({ entry, x, y }) => ({
            id: entry.place.id,
            box: { left: x - 8, right: x + 8, top: y - 8, bottom: y + 8 },
          }))
      : [];
    const occupied: LabelBox[] = [...reserved];
    const named = new Set<string>();
    const nameCounts = new Map<string, number>();
    for (const { entry, x, y, scale } of candidates) {
      const { place, position } = entry;
      if (shown.length >= markerBudget) break;
      const cityCountry =
        this.contextual && place.kind === "city" ? place.parentId : undefined;
      if (
        cityCountry &&
        (countryCities.get(cityCountry) ?? 0) >= countryCityLimit(altitude)
      )
        continue;
      if (
        this.contextual &&
        shown.some((p) => Math.hypot(x - p.x, y - p.y) < separation)
      )
        continue;
      if (this.density !== "physical") shown.push({ x, y });
      if (cityCountry)
        countryCities.set(
          cityCountry,
          (countryCities.get(cityCountry) ?? 0) + 1,
        );
      if (this.showMarkers && !place.markerHidden) {
        const marker = entry.marker ?? (entry.marker = this.marker(place));
        if (marker.parent !== this.group) this.group.add(marker);
        marker.position.copy(position);
        const size = placeMarkerSize(place);
        marker.scale.set(scale * size, scale * size, 1);
        marker.visible = true;
        this.targets.push({ place, x, y });
      }
      if (
        !this.showLabels ||
        place.labelHidden ||
        !place.name ||
        this.drawnBoxes.length >= nameBudget
      )
        continue;
      const nameKey = `${place.kind}:${place.name.toLocaleLowerCase("en")}`;
      if (
        this.density === "physical" &&
        (named.has(nameKey) ||
          (nameCounts.get(place.kind) ?? 0) >=
            physicalNameLimit(place.kind, altitude))
      )
        continue;
      // Creating canvas textures for every newly visible city at once blocks
      // the first camera frames. Spread that work over a few animation frames.
      if (!entry.label && !this.sprites.has(place.id)) {
        if (newLabelBudget <= 0) {
          this.pendingLabels = true;
          continue;
        }
        newLabelBudget--;
      }
      const label = entry.label ?? (entry.label = this.label(place));
      if (label.parent !== this.group) this.group.add(label);
      label.position.copy(position);
      label.visible = false;
      const h = placeLabelStyle(place).textHeight,
        w = h * label.userData.aspect;
      const placement = placeLabelPlacement(
        x,
        y,
        w,
        h,
        width,
        height,
        [
          ...occupied,
          ...markerBoxes
            .filter(
              (marker) =>
                marker.id !== place.id ||
                place.answerTarget ||
                place.labelFlexible,
            )
            .map((marker) => marker.box),
        ],
        !!place.answerTarget || !!place.labelFlexible,
      );
      if (!placement) continue;
      const { box } = placement;
      label.center.set(placement.cx, placement.cy);
      label.scale.set(scale * w, scale * h, 1);
      label.visible = true;
      if (this.density === "physical") shown.push({ x, y });
      occupied.push(box);
      this.drawnBoxes.push(box);
      named.add(nameKey);
      nameCounts.set(place.kind, (nameCounts.get(place.kind) ?? 0) + 1);
    }
  }
  pick(x: number, y: number, touchRadius?: number): PlaceFeature | undefined {
    return this.targets
      .map((target) => ({
        ...target,
        distance: Math.hypot(x - target.x, y - target.y),
      }))
      .filter(
        (t) => t.distance <= (touchRadius ?? (t.place.answerTarget ? 15 : 9)),
      )
      .sort((a, b) => a.distance - b.distance)[0]?.place;
  }
  dispose() {
    for (const sprite of this.sprites.values()) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    for (const material of this.markerMaterials.values()) {
      material.map?.dispose();
      material.dispose();
    }
    this.sprites.clear();
    this.markers.clear();
    this.markerMaterials.clear();
    this.active = [];
    this.targets = [];
    this.group.clear();
    this.data = undefined;
  }
}
