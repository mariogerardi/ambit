import { geoCircle } from "d3-geo";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  Mesh,
  ShaderMaterial,
  TextureLoader,
  Vector4,
} from "three";
import type { MapOverlay } from "../geography/types";
import type { ThemeId } from "../theme/themes";
import { playColors } from "../theme/playColors";
import { resample } from "../game/construction";
import { EARTH_KM } from "../game/spatial";
import { patchGeometry } from "./constructionOverlays";

type PaintOverlay = Extract<MapOverlay, { type: "paint" }>;

/** Display strokes in geographic space; scoring continues to use its frozen grid. */
export function drawPaint(
  ctx: CanvasRenderingContext2D,
  overlay: PaintOverlay,
  previous: PaintOverlay["strokes"] = [],
) {
  const [west, south, east, north] = overlay.bounds;
  let common = 0;
  while (
    common < previous.length &&
    previous[common] === overlay.strokes[common]
  )
    common++;
  let strokes = overlay.strokes.slice(common);
  const before = previous[common],
    after = strokes[0];
  if (common === previous.length) {
    // Only new strokes: retain the existing texture.
  } else if (
    common === previous.length - 1 &&
    after &&
    before.erase === after.erase &&
    before.radiusKm === after.radiusKm &&
    before.points.every((p, i) => p === after.points[i])
  ) {
    strokes = [
      {
        ...after,
        points: after.points.slice(Math.max(0, before.points.length - 1)),
      },
      ...strokes.slice(1),
    ];
  } else {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    strokes = overlay.strokes;
  }
  for (const stroke of strokes) {
    ctx.globalCompositeOperation = stroke.erase
      ? "destination-out"
      : "source-over";
    ctx.fillStyle = "white";
    for (const point of resample(
      stroke.points,
      Math.max(2, stroke.radiusKm / 4),
    )) {
      const ring = geoCircle()
        .center([point.lng, point.lat])
        .radius(((stroke.radiusKm / EARTH_KM) * 180) / Math.PI)
        .precision(4)().coordinates[0];
      ctx.beginPath();
      ring.forEach(([lng, lat], i) => {
        const x = ((lng - west) / (east - west)) * ctx.canvas.width,
          y = ((north - lat) / (north - south)) * ctx.canvas.height;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

export function makePaintOverlay(
  overlay: PaintOverlay,
  radius: number,
  palette: ThemeId,
) {
  const group = new Group();
  group.scale.setScalar(radius);
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = Math.round(
    (2048 * (overlay.bounds[3] - overlay.bounds[1])) /
      (overlay.bounds[2] - overlay.bounds[0]),
  );
  const ctx = canvas.getContext("2d")!;
  const paint = new CanvasTexture(canvas);
  paint.generateMipmaps = false;
  paint.minFilter = LinearFilter;
  const transform = (bounds: PaintOverlay["bounds"]) => {
    const [w, s, e, n] = overlay.bounds,
      [mw, ms, me, mn] = bounds;
    return new Vector4(
      (w - mw) / (me - mw),
      (s - ms) / (mn - ms),
      (e - w) / (me - mw),
      (n - s) / (mn - ms),
    );
  };
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      paint: { value: paint },
      land: { value: null },
      target: { value: null },
      landUV: { value: transform(overlay.mask.bounds) },
      targetUV: {
        value: transform(overlay.targetMask?.bounds ?? overlay.mask.bounds),
      },
      coverage: {
        value: ["paint", "inside", "outside", "missed"].indexOf(
          overlay.coverage,
        ),
      },
      opacity: { value: overlay.opacity },
      bandColor: { value: new Color(playColors(palette)[overlay.visualState]) },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D paint, land, target;
      uniform vec4 landUV, targetUV;
      uniform int coverage;
      uniform float opacity;
      uniform vec3 bandColor;
      varying vec2 vUv;
      float maskAt(sampler2D image, vec4 transform) {
        vec2 uv = transform.xy + vUv * transform.zw;
        if (any(lessThan(uv, vec2(0.0))) || any(greaterThan(uv, vec2(1.0)))) return 0.0;
        return texture2D(image, uv).g;
      }
      void main() {
        float p = texture2D(paint, vUv).a;
        float t = maskAt(target, targetUV);
        float a = maskAt(land, landUV);
        if (coverage == 0) a *= p;
        else if (coverage == 1) a *= p * t;
        else if (coverage == 2) a *= p * (1.0 - t);
        else a *= (1.0 - p) * t;
        if (a < 0.01) discard;
        gl_FragColor = vec4(bandColor, a * opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  // Finer tessellation also keeps patch chords above the land shell.
  const mesh = new Mesh(patchGeometry(overlay.bounds, 256, 224), material);
  mesh.geometry.scale(1.007 / 1.004, 1.007 / 1.004, 1.007 / 1.004);
  mesh.renderOrder = 5;
  mesh.raycast = () => {};
  mesh.visible = false;
  let disposed = false,
    loaded = 0;
  const ready = () => {
    if (!disposed && ++loaded === 2) mesh.visible = true;
  };
  const land = new TextureLoader().load(overlay.mask.assetUrl, ready);
  const target = new TextureLoader().load(
    overlay.targetMask?.assetUrl ?? overlay.mask.assetUrl,
    ready,
  );
  material.uniforms.land.value = land;
  material.uniforms.target.value = target;
  let previous: PaintOverlay["strokes"] = [];
  group.userData.updatePaint = (next: PaintOverlay) => {
    drawPaint(ctx, next, previous);
    previous = next.strokes;
    paint.needsUpdate = true;
  };
  group.userData.updatePaint(overlay);
  group.userData.dispose = () => {
    disposed = true;
    paint.dispose();
    land.dispose();
    target.dispose();
  };
  group.add(mesh);
  group.raycast = () => {};
  return group;
}
