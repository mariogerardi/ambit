import { DEFAULT_THEME } from "../theme/themes";
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
import type { ThemeId } from "../theme/themes";
import { pinBandColor } from "../theme/playColors";
import { playStateColor } from "./themes";
import { playColors } from "../theme/playColors";
import { MAP_ANNOTATION_ALTITUDE } from "./surface";
import { areaSymbolSize } from "./areaSymbols";
export interface PlaceLabelLayer {
  id: string;
  kind: "place-labels";
  places: PlaceFeature[];
  visible: boolean;
  markers?: boolean;
  /** Broad context layers reveal smaller places with zoom; authored clues stay explicit. */
  contextual?: boolean;
  density?: "physical" | "study";
  palette?: ThemeId;
}
export const isPlaceLabels = (value: object): value is PlaceLabelLayer =>
  "kind" in value && value.kind === "place-labels";
export function placeStyle(
  kind: PlaceFeature["kind"],
  palette: ThemeId = DEFAULT_THEME,
) {
  const survey = palette === "survey";
  if (palette === "paper")
    return {
      shape: kind === "pin" ? "pin" : kind === "capital" ? "star" : "circle",
      marker: kind === "pin" ? playColors(palette).selected : "#d7dfc9",
      text: kind === "river" || kind === "ocean" ? "#c5dfd0" : "#f0eddf",
      font: "500 26px Manrope, sans-serif",
      textHeight: kind === "capital" ? 26 : 24,
    };
  if (palette === "dusk")
    return {
      shape: kind === "pin" ? "pin" : kind === "capital" ? "star" : "circle",
      marker: kind === "pin" ? playColors(palette).selected : "#e0d3f4",
      text: kind === "river" || kind === "ocean" ? "#b6f2f4" : "#f2edf9",
      font: "500 26px Manrope, sans-serif",
      textHeight: kind === "capital" ? 26 : 24,
    };
  if (["river", "mountain", "landform", "ocean"].includes(kind))
    return {
      shape: "circle",
      marker: survey ? "#d4d4d4" : "#101010",
      text: survey
        ? "#d4d4d4"
        : kind === "river"
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
      marker: survey ? playColors(palette).selected : "#ffd665",
      text: survey ? "#ececec" : "#f4f8ff",
      font: "500 26px Manrope, sans-serif",
      textHeight: 24,
    };
  return kind === "capital"
    ? {
        shape: "star",
        marker: survey ? "#e4e4e4" : "#e4e8df",
        text: survey ? "#ececec" : "#f4f8ff",
        font: "500 26px Manrope, sans-serif",
        textHeight: 26,
      }
    : {
        shape: "circle",
        marker: survey ? "#d4d4d4" : "#101010",
        text: survey ? "#ececec" : "#f4f8ff",
        font: "500 26px Manrope, sans-serif",
        textHeight: 24,
      };
}
/** Authored clues stay legible; dense contextual city layers scale by population. */
export function placeMarkerSize(place: PlaceFeature, contextual = false) {
  if (place.markerSize !== undefined) return place.markerSize;
  if (place.kind === "pin") return 36;
  if (place.answerTarget) return place.visualState === "selected" ? 34 : 30;
  if (!contextual) return 30;
  return place.kind === "capital"
    ? 14
    : (place.population ?? 0) >= 2_000_000
      ? 13
      : 10;
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
  if (place.inspectionSelected) return true;
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
export const placeLabelStyle = (
  place: PlaceFeature,
  palette: ThemeId = DEFAULT_THEME,
) => {
  const base = placeStyle(place.answerTarget ? "city" : place.kind, palette);
  const style =
    place.labelTypography === "numeric"
      ? {
          ...base,
          font: "500 22px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          text: palette === "survey" ? "#c4c4c4" : "#b4cbd0",
          textHeight: 18,
        }
      : base;
  return { ...style, textHeight: style.textHeight * (place.labelScale ?? 1) };
};

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
function markerColor(place: PlaceFeature, palette: ThemeId) {
  return place.accuracyBand
    ? pinBandColor(place.accuracyBand.index, place.accuracyBand.count, palette)
    : place.visualState
      ? (playStateColor(place.visualState, palette) ??
        (place.visualState === "hover" ? "#ffe391" : "#849899"))
      : placeStyle(place.kind, palette).marker;
}
function pinMarkerBox(x: number, y: number, size: number): LabelBox {
  return {
    left: x - size * 0.35,
    right: x + size * 0.35,
    top: y - size * 0.9,
    bottom: y + size * 0.1,
  };
}
interface Entry {
  place: PlaceFeature;
  position: Vector3;
  label?: Sprite;
  marker?: Sprite;
  pulse?: Sprite;
  pulseStarted?: number;
}
/** Cached screen-sized place symbols/text, drawn above land but culled at Earth's horizon. */
export class PlaceLabels {
  readonly group = new Group();
  private sprites = new Map<string, Sprite>();
  private markers = new Map<string, Sprite>();
  private pulseTexture?: CanvasTexture;
  private markerMaterials = new Map<string, SpriteMaterial>();
  private active: Entry[] = [];
  private data?: PlaceFeature[];
  private showLabels = false;
  private showMarkers = false;
  private radius = 100;
  private contextual = false;
  private density?: PlaceLabelLayer["density"];
  private palette: ThemeId = DEFAULT_THEME;
  private drawnBoxes: LabelBox[] = [];
  private pendingLabels = false;
  needsRefresh() {
    return this.pendingLabels;
  }
  /** Pins and flags take priority over DOM island rings on the same frame. */
  priorityMarkerBoxes(
    camera: PerspectiveCamera,
    width: number,
    height: number,
  ): LabelBox[] {
    return this.active.flatMap(({ place, position }) => {
      if (
        ((place.kind !== "pin" || place.markerRole === "target") &&
          !["start", "finish"].includes(place.markerRole ?? "")) ||
        !this.showMarkers ||
        position.clone().normalize().dot(camera.position.clone().normalize()) <=
          this.radius / camera.position.length()
      )
        return [];
      const p = position.clone().project(camera);
      const x = ((p.x + 1) * width) / 2,
        y = ((1 - p.y) * height) / 2;
      const size = placeMarkerSize(place, this.contextual);
      if (place.kind === "pin" && place.markerRole !== "target")
        return [pinMarkerBox(x, y, size)];
      return [
        {
          left: x - size * 0.25,
          right: x + size * 0.75,
          top: y - size,
          bottom: y + size * 0.1,
        },
      ];
    });
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
    const style = placeLabelStyle(place, this.palette);
    let sprite = this.sprites.get(place.id);
    if (
      sprite &&
      sprite.userData.labelName === place.name &&
      sprite.userData.labelKind === labelKind &&
      sprite.userData.labelTypography === place.labelTypography &&
      sprite.userData.labelColor === style.text
    )
      return sprite;
    if (sprite) {
      sprite.removeFromParent();
      sprite.material.map?.dispose();
      sprite.material.dispose();
      this.sprites.delete(place.id);
    }
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
    context.lineWidth =
      place.labelTypography === "numeric"
        ? 2.5
        : labelKind === "capital"
          ? 4
          : 6;
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
    sprite.renderOrder = 22;
    sprite.center.set(0.5, -0.32);
    sprite.userData.aspect = canvas.width / canvas.height;
    sprite.userData.placeId = place.id;
    sprite.userData.role = "label";
    sprite.userData.labelName = place.name;
    sprite.userData.labelKind = labelKind;
    sprite.userData.labelTypography = place.labelTypography;
    sprite.userData.labelColor = style.text;
    sprite.raycast = () => {}; // Text never intercepts map answers.
    this.sprites.set(place.id, sprite);
    return sprite;
  }
  private marker(place: PlaceFeature) {
    let sprite = this.markers.get(place.id);
    const style = place.answerTarget
      ? { ...placeStyle(place.kind, this.palette), shape: "circle" }
      : placeStyle(place.kind, this.palette);
    const color = markerColor(place, this.palette);
    const badge =
      place.markerBadge ??
      (place.visualState === "correct"
        ? "✓"
        : place.visualState === "incorrect"
          ? "×"
          : place.visualState === "answer"
            ? "◎"
            : "");
    const key = `${place.fadeInMs || place.dropInMs ? place.id : ""}:${style.shape}:${color}:${!!place.answerTarget}:${place.markerRole}:${badge}:${this.contextual}:${place.visualState}`;
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
            radius = i % 2 ? 8 : this.contextual ? 18 : 22;
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
      } else
        ctx.arc(
          32,
          32,
          !this.contextual && place.markerRole !== "annotation"
            ? 20
            : place.answerTarget || place.markerBadge
              ? 15
              : 10,
          0,
          Math.PI * 2,
        );
      ctx.lineJoin = "round";
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#071524";
      ctx.fillStyle = color;
      ctx.fill();
      // Context dots can share their country’s fill; a dark outline keeps them visible.
      ctx.stroke();
      if (place.markerRole === "annotation") {
        // Area status is a bare symbol, never a city dot or a circled badge.
        ctx.clearRect(0, 0, 64, 64);
        ctx.strokeStyle =
          place.visualState === "selected"
            ? playColors(this.palette)["on-selected"]
            : playColors(this.palette)["on-feedback"];
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        if (badge === "✓") {
          ctx.moveTo(12, 32);
          ctx.lineTo(26, 46);
          ctx.lineTo(52, 17);
        } else if (badge === "×") {
          ctx.moveTo(18, 18);
          ctx.lineTo(46, 46);
          ctx.moveTo(46, 18);
          ctx.lineTo(18, 46);
        } else {
          ctx.arc(32, 32, 20, 0, Math.PI * 2);
          ctx.moveTo(41, 32);
          ctx.arc(32, 32, 9, 0, Math.PI * 2);
        }
        ctx.stroke();
      } else if (
        place.markerRole === "start" ||
        place.markerRole === "finish"
      ) {
        ctx.clearRect(0, 0, 64, 64);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#071524";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(16, 58);
        ctx.lineTo(16, 8);
        ctx.lineTo(53, 14);
        ctx.lineTo(45, 35);
        ctx.lineTo(16, 29);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(16, 29);
        ctx.lineTo(16, 58);
        ctx.stroke();
        if (place.markerRole === "finish") {
          // A regular checkerboard follows the flag's skew instead of floating
          // rectangular spots inside it. The silhouette and pole stay unchanged.
          const point = (u: number, v: number) => [
            (1 - v) * (16 + 37 * u) + v * (16 + 29 * u),
            (1 - v) * (8 + 6 * u) + v * (29 + 6 * u),
          ];
          for (let y = 0; y < 3; y++)
            for (let x = 0; x < 4; x++) {
              ctx.fillStyle = (x + y) % 2 ? "#fff0cd" : "#15313b";
              ctx.beginPath();
              [
                [x / 4, y / 3],
                [(x + 1) / 4, y / 3],
                [(x + 1) / 4, (y + 1) / 3],
                [x / 4, (y + 1) / 3],
              ].forEach(([u, v], i) => {
                const [px, py] = point(u, v);
                if (i) ctx.lineTo(px, py);
                else ctx.moveTo(px, py);
              });
              ctx.closePath();
              ctx.fill();
            }
          ctx.beginPath();
          ctx.moveTo(16, 8);
          ctx.lineTo(53, 14);
          ctx.lineTo(45, 35);
          ctx.lineTo(16, 29);
          ctx.closePath();
          ctx.stroke();
        }
      } else if (place.markerRole === "target") {
        ctx.clearRect(0, 0, 64, 64);
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(32, 32, 16, 0, Math.PI * 2);
        ctx.moveTo(32, 7);
        ctx.lineTo(32, 23);
        ctx.moveTo(32, 41);
        ctx.lineTo(32, 57);
        ctx.moveTo(7, 32);
        ctx.lineTo(23, 32);
        ctx.moveTo(41, 32);
        ctx.lineTo(57, 32);
        ctx.strokeStyle = "#071524";
        ctx.lineWidth = 9;
        ctx.stroke();
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.stroke();
      } else if (badge) {
        ctx.fillStyle =
          ["correct", "answer", "incorrect"].includes(
            place.visualState ?? "",
          ) &&
          (!place.accuracyBand || place.accuracyBand.index === 0)
            ? playColors(this.palette)["on-feedback"]
            : playColors(this.palette)["on-selected"];
        ctx.font = "400 22px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(badge, 32, style.shape === "pin" ? 24 : 32);
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
    sprite.center.set(
      place.markerRole === "start" || place.markerRole === "finish"
        ? 0.25
        : 0.5,
      place.markerRole === "start" || place.markerRole === "finish"
        ? 6 / 64
        : style.shape === "pin" && place.markerRole !== "target"
          ? 6 / 64
          : 0.5,
    );
    sprite.renderOrder =
      place.kind === "pin" && place.markerRole !== "target" ? 21 : 20;
    sprite.userData.placeId = place.id;
    sprite.userData.role = "marker";
    const group = this.group;
    sprite.raycast = function (raycaster, intersections) {
      if (this.visible && group.visible && place.markerRole !== "annotation")
        Sprite.prototype.raycast.call(this, raycaster, intersections);
    };
    this.markers.set(place.id, sprite);
    return sprite;
  }
  private pulse() {
    if (!this.pulseTexture) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.beginPath();
      ctx.arc(32, 32, 25, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      this.pulseTexture = placeTexture(canvas);
    }
    const pulse = new Sprite(
      new SpriteMaterial({
        map: this.pulseTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      }),
    );
    pulse.renderOrder = 19;
    pulse.userData.role = "placement-pulse";
    pulse.raycast = () => {};
    return pulse;
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
      this.density === layer.density &&
      this.palette === (layer.palette ?? DEFAULT_THEME)
    )
      return;
    const previousEntries = new Map(this.active.map((e) => [e.place.id, e]));
    const previousIds = new Set(previousEntries.keys());
    this.data = layer.places;
    this.radius = radius;
    this.showLabels = layer.visible;
    this.showMarkers = markers;
    this.contextual = !!layer.contextual;
    this.density = layer.density;
    this.palette = layer.palette ?? DEFAULT_THEME;
    this.active = layer.places.map((place) => {
      const lat = (place.lat * Math.PI) / 180,
        lng = (place.lng * Math.PI) / 180;
      const position = new Vector3(
        Math.cos(lat) * Math.sin(lng),
        Math.sin(lat),
        Math.cos(lat) * Math.cos(lng),
      ).multiplyScalar(
        radius * (1 + (place.surfaceAligned ? MAP_ANNOTATION_ALTITUDE : 0.002)),
      );
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
      if (marker && place.dropInMs) {
        const previous = this.active.find(
          (entry) => entry.place.id === place.id,
        )?.marker;
        marker.userData.dropStarted =
          previous?.userData.dropStarted ?? performance.now();
      }
      if (marker && place.fadeInMs && !previousIds.has(place.id)) {
        marker.userData.fadeStarted = performance.now();
        marker.material.opacity = 0;
      }
      const previous = previousEntries.get(place.id);
      const pulse =
        place.placementPulse && marker
          ? (previous?.pulse ?? this.pulse())
          : undefined;
      const pulseStarted = pulse
        ? previous?.place.lat === place.lat && previous?.place.lng === place.lng
          ? (previous.pulseStarted ?? performance.now())
          : performance.now()
        : undefined;
      return { place, position, label, marker, pulse, pulseStarted };
    });
    this.group.clear();
    for (const previous of previousEntries.values()) {
      if (
        previous.pulse &&
        !this.active.some((e) => e.pulse === previous.pulse)
      )
        previous.pulse.material.dispose();
    }
    for (const { label, marker, pulse } of this.active) {
      if (label) this.group.add(label);
      if (marker) this.group.add(marker);
      if (pulse) this.group.add(pulse);
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
            box:
              entry.place.kind === "pin" && entry.place.markerRole !== "target"
                ? pinMarkerBox(
                    x,
                    y,
                    placeMarkerSize(entry.place, this.contextual),
                  )
                : { left: x - 8, right: x + 8, top: y - 8, bottom: y + 8 },
          }))
      : [];
    const hasPins =
      this.showMarkers &&
      candidates.some(
        ({ entry }) =>
          entry.place.kind === "pin" &&
          entry.place.markerRole !== "target" &&
          !entry.place.markerHidden,
      );
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
        const size =
          place.markerRole === "annotation" &&
          place.annotationRadius !== undefined
            ? areaSymbolSize(
                position,
                place.annotationRadius,
                camera,
                width,
                height,
                place.markerSize,
              )
            : placeMarkerSize(place, this.contextual);
        if (entry.pulse && entry.pulseStarted !== undefined) {
          const t = Math.min(
            1,
            (performance.now() - entry.pulseStarted) / 1200,
          );
          entry.pulse.position.copy(position);
          entry.pulse.scale.setScalar(scale * size * (0.8 + 1.8 * t));
          entry.pulse.material.color.set(markerColor(place, this.palette));
          entry.pulse.material.opacity = 0.65 * (1 - t) ** 2;
          entry.pulse.visible = t < 1;
          if (t < 1) this.pendingLabels = true;
        }
        marker.scale.set(scale * size, scale * size, 1);
        marker.visible = size > 0;
        if (place.dropInMs && marker.userData.dropStarted !== undefined) {
          const t = Math.min(
            1,
            (performance.now() - marker.userData.dropStarted) / place.dropInMs,
          );
          // Camera-up keeps the drop vertical on screen while the Earth turns beneath it.
          const lift = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
          marker.position.addScaledVector(lift, scale * 32 * (1 - t) ** 3);
          marker.material.opacity = Math.min(1, t * 4);
          if (t < 1) this.pendingLabels = true;
        }
        if (place.fadeInMs && marker.userData.fadeStarted !== undefined) {
          const t = Math.min(
            1,
            (performance.now() - marker.userData.fadeStarted) / place.fadeInMs,
          );
          marker.material.opacity = t * t * (3 - 2 * t);
          if (t < 1) this.pendingLabels = true;
        }
        if (place.markerRole !== "annotation")
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
      const h = placeLabelStyle(place, this.palette).textHeight,
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
                place.kind === "pin" ||
                place.answerTarget ||
                place.labelFlexible,
            )
            .map((marker) => marker.box),
        ],
        !!place.answerTarget ||
          !!place.labelFlexible ||
          (!this.contextual && hasPins),
        !!place.surfaceAligned,
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
    for (const entry of this.active) entry.pulse?.material.dispose();
    this.pulseTexture?.dispose();
    this.sprites.clear();
    this.markers.clear();
    this.markerMaterials.clear();
    this.active = [];
    this.targets = [];
    this.group.clear();
    this.data = undefined;
  }
}
