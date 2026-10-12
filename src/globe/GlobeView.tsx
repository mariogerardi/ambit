import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import Globe from "react-globe.gl";
import type { GlobeMethods } from "react-globe.gl";
import {
  AmbientLight,
  DirectionalLight,
  MeshPhongMaterial,
  Vector2,
  Vector3,
} from "three";
import type { Object3D, PerspectiveCamera } from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import type {
  Focus,
  PlaceFeature,
  RegionFeature,
  RouteFeature,
  VisualState,
  MapOverlay,
  PhysicalFeature,
} from "../geography/types";
import { makeMapOverlay } from "./overlays";
import {
  CameraTravel,
  CameraFlyover,
  ViewportResize,
  CameraScale,
  viewportProjection,
  worldAltitude,
  focusAltitude,
} from "./camera";
import { themedRegionStyle, PLAY_FEEDBACK } from "./themes";
import type { GlobeTheme } from "./themes";
import { THEMES } from "../theme/themes";
import type { ThemeId } from "../theme/themes";
import {
  boundaryOutlinePositions,
  outlineColor,
  outlineEmphasis,
  regionBorderVisible,
  surfaceRoutePositions,
} from "./outlines";
import {
  createGlobeRegionPreparer,
  boundaryAltitude,
  boundaryResolution,
} from "./geometry";
import { PlaceLabels, isPlaceLabels } from "./placeLabels";
import { PhysicalFeatures, isPhysicalLayer } from "./physicalFeatures";
import { GlobeFidget } from "./fidget";
import { RegionSurfaces } from "./regionSurfaces";
import { SurfaceGesture } from "./gesture";
import { SurfaceInspection } from "./inspection";
import { normalWorldView } from "./defaultViews";
export interface GlobeHandle {
  focus(focus: Focus, fitToViewport?: boolean | "world"): void;
  cancelFocus(): void;
  flyover(stops: Focus[]): void;
  cancelFlyover(): void;
  fidget(): void;
  cancelFidget(): void;
  view(): Focus | undefined;
  measure(): Promise<{
    fps: number;
    frames: number;
    seconds: number;
    triangles: number;
  }>;
}
interface Props {
  active?: boolean;
  initialFocus?: Focus;
  physicalFeatures?: PhysicalFeature[];
  overlays?: MapOverlay[];
  surfaceRoutes?: boolean;
  showBorders?: boolean;
  borderRegionIds?: string[];
  showRegionalBorders?: boolean;
  regionInteraction?: boolean;
  regionNames?: "all" | "none" | "committed";
  namedRegionIds?: string[];
  interactionLabel?: string;
  theme?: GlobeTheme;
  palette?: ThemeId;
  compact?: boolean;
  expanded?: boolean;
  visualScale?: number;
  onInteraction?(): void;
  onSurfaceTap?(region?: RegionFeature): void;
  onCoordinateTap?(point: Focus): void;
  placeInteraction?: boolean;
  placeLabels?: boolean;
  placeMarkers?: boolean;
  placeContextual?: boolean;
  placeDensity?: "study";
  selectDisabled?: boolean;
  regions: RegionFeature[];
  warmRegions?: RegionFeature[];
  places: PlaceFeature[];
  routes: RouteFeature[];
  states: Record<string, VisualState>;
  hovered?: string;
  onHover(region?: RegionFeature): void;
  onSelect(region: RegionFeature, point?: Focus): void;
  onPlace(place: PlaceFeature): void;
  motion: boolean;
  rotationSpeed?: number;
  reduced: boolean;
  markers: boolean;
  onReady(): void;
  onTextureFallback(): void;
  onFailure(): void;
}
const NO_FEATURES: PhysicalFeature[] = [];
const NO_LABELS: object[] = [];
const pointRadius = 0.28;
const pointAltitude = 0.003;
export const GlobeView = forwardRef<GlobeHandle, Props>(
  function GlobeView(props, ref) {
    const globe = useRef<GlobeMethods | undefined>(undefined);
    const host = useRef<HTMLDivElement>(null),
      travel = useRef(new CameraTravel());
    const flyover = useRef(new CameraFlyover());
    const fidget = useRef(new GlobeFidget());
    const regionalSurfaces = useMemo(
      () => new RegionSurfaces(() => fidget.current.active),
      [],
    );
    const resizing = useRef(new ViewportResize());
    const projectionScale = useRef(new CameraScale(props.visualScale ?? 1));
    const previousExpanded = useRef(props.expanded);
    const [hoverPlaceId, setHoverPlaceId] = useState<string>();
    const tooltip = useRef<HTMLDivElement>(null);
    const gesture = useRef(new SurfaceGesture());
    const inspection = useRef(new SurfaceInspection());
    const clearInspection = useCallback(() => {
      inspection.current.clear();
      current.current.onHover(undefined);
      setHoverPlaceId(undefined);
    }, []);
    const previousViewport = useRef<
      { width: number; height: number } | undefined
    >(undefined);
    const [size, setSize] = useState({
      width: window.innerWidth,
      height: window.innerHeight,
      frameHeight: window.innerHeight,
      frameTop: 0,
    });
    const readViewport = useCallback(() => {
      const canvas = host.current?.getBoundingClientRect();
      if (!canvas?.width || !canvas.height) return;
      const frame = props.compact
        ? host.current?.closest(".game-scene")?.getBoundingClientRect()
        : undefined;
      return {
        width: canvas.width,
        height: canvas.height,
        frameHeight: frame?.height ?? canvas.height,
        frameTop: frame ? frame.top - canvas.top : 0,
      };
    }, [props.compact]);
    const [sceneId] = useState(() => crypto.randomUUID());
    const [ready, setReady] = useState(false),
      [texture, setTexture] = useState<string>();
    const current = useRef(props);
    current.current = props;
    const placeLabels = useMemo(() => new PlaceLabels(), []);
    const physical = useMemo(() => new PhysicalFeatures(), []);
    const labelFrame = useRef(0);
    const countryPoints = useRef<
      (PlaceFeature & { __threeObjPoint?: Object3D })[]
    >([]);
    const refreshLabels = useCallback(() => {
      const g = globe.current;
      if (!g) return;
      const rendererSize = g.renderer().getSize(new Vector2());
      const camera = g.camera() as PerspectiveCamera;
      // Geographic context gets first claim on space; city names then avoid it.
      physical.view(camera, rendererSize.x, rendererSize.y);
      placeLabels.view(
        camera,
        rendererSize.x,
        rendererSize.y,
        physical.labelBoxes(),
      );
      if (
        (placeLabels.needsRefresh() || physical.needsRefresh()) &&
        !labelFrame.current
      )
        labelFrame.current = requestAnimationFrame(() => {
          labelFrame.current = 0;
          refreshLabels();
        });
      // Tiny-country answer targets also stay small when the player zooms in.
      const pixelScale =
        (2 * Math.tan((camera.fov * Math.PI) / 360)) /
        Math.max(1, rendererSize.y);
      const position = new Vector3();
      for (const point of countryPoints.current) {
        const object = point.__threeObjPoint;
        if (!object) continue;
        object
          .getWorldPosition(position)
          .applyMatrix4(camera.matrixWorldInverse);
        if (position.z < 0)
          object.scale.x = object.scale.y = -position.z * pixelScale * 6;
      }
    }, [placeLabels, physical]);
    useEffect(() => {
      if (!document.fonts) return;
      let disposed = false;
      void document.fonts
        .load("500 26px Manrope", "AgÅŁ")
        .then(() => {
          if (disposed) return;
          placeLabels.refreshFont();
          physical.refreshFont();
          refreshLabels();
        })
        .catch(() => {});
      return () => {
        disposed = true;
      };
    }, [placeLabels, physical, refreshLabels]);
    const outlines = useRef(new Map<string, LineSegments2>());
    const measureFrame = useRef(0),
      cancelMeasure = useRef<(() => void) | undefined>(undefined);
    const material = useMemo(
      () =>
        new MeshPhongMaterial({
          color:
            props.theme === "play"
              ? THEMES[props.palette ?? "atlas"].globe.ocean
              : "#173f4d",
          shininess: props.theme === "play" ? 0 : 6,
        }),
      [props.theme, props.palette],
    );
    useEffect(() => () => material.dispose(), [material]);
    const stop = useCallback(() => {
      flyover.current.cancel();
      if (globe.current) globe.current.controls().autoRotate = false;
      current.current.onInteraction?.();
    }, []);
    const resumeRotation = () => {
      if (globe.current)
        globe.current.controls().autoRotate =
          current.current.motion &&
          !current.current.reduced &&
          !travel.current.active &&
          !fidget.current.active;
    };
    useEffect(() => {
      const image = new Image();
      image.onload = () => setTexture("/textures/earth-day.jpg");
      image.onerror = () => current.current.onTextureFallback();
      if (props.theme !== "play") image.src = "/textures/earth-day.jpg";
      const observer = new ResizeObserver(() => {
        const viewport = readViewport();
        if (viewport) setSize(viewport);
      });
      if (host.current) {
        observer.observe(host.current);
        if (props.compact && host.current.parentElement)
          observer.observe(host.current.parentElement);
      }
      return () => {
        observer.disconnect();
        image.onload = null;
        image.onerror = null;
      };
    }, [props.theme, props.compact, readViewport]);
    useEffect(() => {
      if (!globe.current) return;
      const g = globe.current,
        c = g.controls();
      c.enableDamping = true;
      c.dampingFactor = 0.065;
      c.rotateSpeed = 0.55;
      c.zoomSpeed = 0.7;
      c.minDistance = g.getGlobeRadius() * 1.012;
      c.maxDistance = g.getGlobeRadius() * 6.5;
      c.autoRotateSpeed = 0.24;
      c.enablePan = false;
      const start = () => {
        resizing.current.cancel();
        travel.current.cancel();
        fidget.current.cancel();
        stop();
      };
      const reportView = () => {
        if (!labelFrame.current)
          labelFrame.current = requestAnimationFrame(() => {
            labelFrame.current = 0;
            refreshLabels();
          });
        const pov = g.pointOfView();
        if (host.current) {
          host.current.dataset.cameraLat = pov.lat.toFixed(4);
          host.current.dataset.cameraLng = pov.lng.toFixed(4);
          host.current.dataset.cameraAltitude = pov.altitude.toFixed(4);
        }
      };
      c.addEventListener("start", start);
      c.addEventListener("change", reportView);
      const canvas = g.renderer().domElement;
      const failure = (event: Event) => {
        event.preventDefault();
        fidget.current.cancel();
        stop();
        current.current.onFailure();
      };
      canvas.addEventListener("webglcontextlost", failure);
      g.renderer().setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      // The renderer's sky-sized far plane wastes depth precision. Restrict the
      // frustum to our actual orbit range so small outline offsets survive at
      // the default world zoom, while still allowing close regional views.
      const camera = g.camera() as PerspectiveCamera;
      camera.near = g.getGlobeRadius() * 0.005;
      camera.far = g.getGlobeRadius() * 12;
      const viewport = readViewport() ?? size;
      camera.fov = viewportProjection(
        viewport.height,
        viewport.frameHeight,
        viewport.frameTop,
        projectionScale.current.value,
      ).fov;
      camera.updateProjectionMatrix();
      const keyLight = new DirectionalLight(0xe3f0ff, 1.0);
      keyLight.position.copy(g.camera().position);
      g.lights([new AmbientLight(0xffffff, 1.6), keyLight]);
      previousViewport.current = {
        width: viewport.width,
        height: viewport.frameHeight,
      };
      const initial = current.current.initialFocus;
      g.pointOfView(
        {
          ...(current.current.initialFocus ?? { lat: 14, lng: 24 }),
          altitude:
            current.current.compact &&
            normalWorldView(initial, worldAltitude(innerWidth, innerHeight))
              ? worldAltitude(viewport.width, viewport.frameHeight, true)
              : (initial?.altitude ??
                worldAltitude(
                  viewport.width,
                  viewport.frameHeight,
                  current.current.compact,
                )),
        },
        0,
      );
      setReady(true);
      current.current.onReady();
      const cameraTravel = travel.current;
      const globeFidget = fidget.current;
      return () => {
        c.removeEventListener("start", start);
        c.removeEventListener("change", reportView);
        canvas.removeEventListener("webglcontextlost", failure);
        cameraTravel.cancel();
        globeFidget.cancel();
        cancelAnimationFrame(labelFrame.current);
        placeLabels.dispose();
        physical.dispose();
        cancelAnimationFrame(measureFrame.current);
        cancelMeasure.current?.();
      };
      // Initialize exactly once: layers and responsive dimensions never remount Earth.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stop]);
    useEffect(() => {
      if (previousExpanded.current === props.expanded) return;
      previousExpanded.current = props.expanded;
      const previous = previousViewport.current;
      if (
        !props.compact ||
        props.reduced ||
        !ready ||
        !globe.current ||
        !previous ||
        travel.current.active ||
        flyover.current.active ||
        fidget.current.active
      )
        return;
      resizing.current.start(
        globe.current,
        previous,
        normalWorldView(
          globe.current.pointOfView(),
          worldAltitude(previous.width, previous.height, true),
        ),
        !!props.expanded,
      );
    }, [props.expanded, props.compact, props.reduced, ready]);
    useEffect(
      () => () => {
        resizing.current.cancel();
        flyover.current.cancel();
      },
      [],
    );
    useEffect(() => {
      if (!ready || !globe.current) return;
      const scale = projectionScale.current;
      scale.move(props.visualScale ?? 1, props.reduced, () => {
        const viewport = readViewport();
        if (
          !globe.current ||
          !viewport ||
          host.current?.closest('[data-keyboard-open="true"]')
        )
          return;
        const camera = globe.current.camera() as PerspectiveCamera;
        camera.fov = viewportProjection(
          viewport.height,
          viewport.frameHeight,
          viewport.frameTop,
          scale.value,
        ).fov;
        camera.updateProjectionMatrix();
        refreshLabels();
      });
      return () => scale.cancel();
    }, [ready, props.visualScale, props.reduced, readViewport, refreshLabels]);
    useEffect(() => {
      const previous = previousViewport.current;
      if (!ready || !globe.current || !previous || !size.width || !size.height)
        return;
      // Keyboard resizing must not change the player's orbit.
      if (
        host.current?.closest(
          '[data-keyboard-open="true"], [data-panel-only="true"]',
        )
      )
        return;
      const viewport = readViewport() ?? size;
      const camera = globe.current.camera() as PerspectiveCamera;
      camera.fov = viewportProjection(
        viewport.height,
        viewport.frameHeight,
        viewport.frameTop,
        projectionScale.current.value,
      ).fov;
      camera.updateProjectionMatrix();
      if (
        props.compact &&
        (previous.width !== viewport.width ||
          previous.height !== viewport.frameHeight)
      ) {
        resizing.current.adapt(
          globe.current,
          previous,
          { width: viewport.width, height: viewport.frameHeight },
          travel.current.active ||
            flyover.current.active ||
            fidget.current.active,
        );
      }
      previousViewport.current = {
        width: viewport.width,
        height: viewport.frameHeight,
      };
      refreshLabels();
    }, [size, ready, props.compact, props.active, readViewport, refreshLabels]);
    useEffect(() => {
      if (!ready || !globe.current) return;
      const syncRendering = () => {
        if (props.active === false || document.visibilityState === "hidden")
          globe.current?.pauseAnimation();
        else globe.current?.resumeAnimation();
      };
      syncRendering();
      document.addEventListener("visibilitychange", syncRendering);
      return () =>
        document.removeEventListener("visibilitychange", syncRendering);
    }, [ready, props.active]);
    useEffect(() => {
      if (ready && globe.current) {
        globe.current.controls().autoRotate =
          props.motion &&
          !props.reduced &&
          !travel.current.active &&
          !fidget.current.active;
        globe.current.controls().autoRotateSpeed =
          0.24 * (props.rotationSpeed ?? 1);
        if (props.reduced) {
          flyover.current.cancel();
          resizing.current.cancel();
          travel.current.settle();
          fidget.current.cancel();
        }
      }
    }, [props.motion, props.reduced, props.rotationSpeed, ready]);
    useImperativeHandle(
      ref,
      () => ({
        focus(target, fitToViewport = true) {
          clearInspection();
          resizing.current.cancel();
          if (!globe.current) return;
          flyover.current.cancel();
          travel.current.cancel();
          globe.current.controls().autoRotate = false;
          fidget.current.cancel();
          const altitude = target.altitude ?? 0.8;
          const fitAltitude = () =>
            focusAltitude(
              altitude,
              readViewport() ?? size,
              !!current.current.compact,
              fitToViewport,
            );
          travel.current.move(
            globe.current,
            target,
            current.current.reduced,
            resumeRotation,
            fitAltitude,
          );
        },
        flyover(stops) {
          clearInspection();
          if (!globe.current) return;
          stop();
          resizing.current.cancel();
          travel.current.cancel();
          fidget.current.cancel();
          const ratio = Math.min(1, size.width / size.frameHeight);
          flyover.current.start(
            globe.current,
            stops.map((stop) => ({
              ...stop,
              altitude: (stop.altitude ?? 0.65) / ratio,
            })),
            current.current.reduced,
          );
        },
        cancelFlyover() {
          flyover.current.cancel();
        },
        cancelFocus() {
          resizing.current.cancel();
          travel.current.cancel();
          flyover.current.cancel();
          resumeRotation();
        },
        fidget() {
          clearInspection();
          resizing.current.cancel();
          const g = globe.current;
          if (!g || current.current.reduced) return;
          flyover.current.cancel();
          travel.current.cancel();
          g.controls().autoRotate = false;
          fidget.current.play(
            g.scene(),
            g.getGlobeRadius(),
            false,
            undefined,
            g.renderer(),
            resumeRotation,
          );
        },
        cancelFidget() {
          fidget.current.cancel();
          resumeRotation();
        },
        view() {
          return globe.current?.pointOfView();
        },
        measure() {
          return new Promise((resolve, reject) => {
            if (!globe.current) {
              reject(Error("Globe is not ready"));
              return;
            }
            cancelMeasure.current?.();
            const start = performance.now(),
              initial = globe.current.renderer().info.render.frame;
            cancelMeasure.current = () =>
              reject(Error("Measurement cancelled"));
            const sample = (now: number) => {
              if (!globe.current) return;
              const elapsed = (now - start) / 1000;
              if (elapsed < 5)
                measureFrame.current = requestAnimationFrame(sample);
              else {
                const info = globe.current.renderer().info.render,
                  frames = info.frame - initial;
                cancelMeasure.current = undefined;
                resolve({
                  fps: Math.round(frames / elapsed),
                  frames,
                  seconds: +elapsed.toFixed(2),
                  triangles: info.triangles,
                });
              }
            };
            measureFrame.current = requestAnimationFrame(sample);
          });
        },
      }),
      [stop, size],
    );
    const pointData = useMemo(() => {
      const result: (PlaceFeature & { region?: RegionFeature })[] = [];
      if (props.markers)
        for (const region of props.regions)
          if (
            !region.displayBase &&
            [
              "Monaco",
              "San Marino",
              "Vatican",
              "Liechtenstein",
              "Nauru",
              "Tuvalu",
              "Singapore",
              "Andorra",
              "Malta",
              "Luxembourg",
            ].some((n) => region.name.includes(n))
          )
            result.push({
              id: `marker:${region.id}`,
              name: region.name,
              kind: "other",
              lat: region.focus.lat,
              lng: region.focus.lng,
              sourceId: region.sourceId,
              region,
            });
      return result;
    }, [props.markers, props.regions]);
    countryPoints.current = pointData;
    useEffect(() => {
      const frame = requestAnimationFrame(refreshLabels);
      return () => cancelAnimationFrame(frame);
    }, [pointData, refreshLabels]);
    const point = (obj: object) =>
      obj as PlaceFeature & { region?: RegionFeature };
    const region = (obj: object) => obj as RegionFeature;
    const route = (obj: object) => obj as RouteFeature;
    const pointColor = useCallback((obj: object) => {
      const r = point(obj).region,
        p = current.current;
      return r
        ? themedRegionStyle(
            p.theme ?? "natural",
            r.id,
            p.states[r.id],
            false,
            p.palette,
          ).fill
        : "#ffe1a0";
    }, []);
    const onPointHover = useCallback((obj: object | null) => {
      if (fidget.current.active || !inspection.current.allowed) return;
      current.current.onHover(obj ? point(obj).region : undefined);
    }, []);
    const onPointClick = useCallback((obj: object) => {
      if (!gesture.current.consume()) return;
      const p = point(obj),
        props = current.current;
      if (p.region) {
        if (
          props.regionInteraction !== false &&
          (props.selectDisabled || props.states[p.region.id] !== "disabled")
        )
          props.onSelect(p.region);
      } else props.onPlace(p);
    }, []);
    useEffect(() => {
      for (const item of pointData) {
        const object = (item as typeof item & { __threeObjPoint?: Object3D })
          .__threeObjPoint;
        if (object && "material" in object)
          (object.material as MeshPhongMaterial).color.set(pointColor(item));
      }
    }, [pointData, props.states, props.palette, pointColor]);
    const prepareRegions = useMemo(createGlobeRegionPreparer, []);
    const renderRegions = useMemo(
      () => prepareRegions(props.regions),
      [prepareRegions, props.regions],
    );
    const backgrounds = useMemo(
      () =>
        props.regions
          .filter((r) => r.level === "ADM0" && r.displayCovered)
          .map((r) => ({ ...r, displayCovered: false })),
      [props.regions],
    );
    const countryRegions = useMemo(
      () => [
        ...renderRegions.filter((r) => r.level === "ADM0"),
        ...prepareRegions(backgrounds),
      ],
      [renderRegions, backgrounds, prepareRegions],
    );
    useEffect(() => {
      if (props.warmRegions)
        regionalSurfaces.warm(prepareRegions(props.warmRegions));
    }, [props.warmRegions, regionalSurfaces, prepareRegions]);
    useEffect(() => () => regionalSurfaces.dispose(), [regionalSurfaces]);
    const labelLayer = useMemo(
      () => ({
        id: "places:labels",
        kind: "place-labels" as const,
        places: props.places,
        visible: props.placeLabels !== false,
        markers: props.placeMarkers !== false,
        contextual: !!props.placeContextual,
        density: props.placeDensity,
      }),
      [],
    );
    // Keep the custom-layer binding stable while its cached content/preferences change.
    labelLayer.places = props.places;
    labelLayer.visible = props.placeLabels !== false;
    labelLayer.markers = props.placeMarkers !== false;
    labelLayer.contextual = !!props.placeContextual;
    labelLayer.density = props.placeDensity;
    useEffect(() => {
      placeLabels.update(labelLayer, globe.current?.getGlobeRadius() ?? 100);
      refreshLabels();
    }, [
      props.places,
      props.placeLabels,
      props.placeMarkers,
      props.placeContextual,
      props.placeDensity,
      ready,
      placeLabels,
      labelLayer,
      refreshLabels,
    ]);
    useEffect(refreshLabels, [size.width, size.height, ready, refreshLabels]);
    const onPlaceMarkerClick = useCallback(
      (obj: object, event: MouseEvent) => {
        if (!isPlaceLabels(obj) || !host.current) return;
        const bounds = host.current.getBoundingClientRect();
        const place = placeLabels.pick(
          event.clientX - bounds.left,
          event.clientY - bounds.top,
        );
        if (place && gesture.current.consume()) {
          stop();
          current.current.onPlace(place);
        }
      },
      [placeLabels, stop],
    );
    const physicalLayer = useMemo(
      () => ({
        id: "physical:features",
        kind: "physical-features" as const,
        features: NO_FEATURES,
      }),
      [],
    );
    physicalLayer.features = props.physicalFeatures ?? NO_FEATURES;
    useEffect(() => {
      physical.update(physicalLayer, globe.current?.getGlobeRadius() ?? 100);
      refreshLabels();
    }, [props.physicalFeatures, ready, physical, physicalLayer, refreshLabels]);
    const customData = useMemo(
      () => [
        ...renderRegions,
        labelLayer,
        physicalLayer,
        ...(props.surfaceRoutes ? props.routes : []),
        ...(props.overlays ?? []),
      ],
      [
        renderRegions,
        labelLayer,
        physicalLayer,
        props.routes,
        props.surfaceRoutes,
        props.overlays,
      ],
    );
    const capColor = useCallback(
      (obj: object) =>
        themedRegionStyle(
          props.theme ?? "natural",
          region(obj).id,
          props.states[region(obj).id],
          props.hovered === region(obj).id,
          props.palette,
        ).fill,
      [props.theme, props.palette, props.states, props.hovered],
    );
    const updateOutline = useCallback(
      (object: Object3D, obj: object) => {
        if (isPhysicalLayer(obj)) {
          physical.update(obj, globe.current?.getGlobeRadius() ?? 100);
          refreshLabels();
          return;
        }
        if (isPlaceLabels(obj)) {
          placeLabels.update(obj, globe.current?.getGlobeRadius() ?? 100);
          refreshLabels();
          return;
        }
        if ("type" in obj) return;
        const r = region(obj),
          p = current.current;
        const line = (object.userData.outline ?? object) as LineSegments2;
        if (r.level !== "ADM0")
          regionalSurfaces.update(
            r,
            themedRegionStyle(
              p.theme ?? "natural",
              r.id,
              p.states[r.id],
              p.hovered === r.id,
              p.palette,
            ).fill,
          );
        // Keep the parent's exterior boundary wherever detailed coverage falls
        // short. Its surface is non-interactive, but its outline remains useful.
        line.visible = "from" in obj || regionBorderVisible(r, p);
        if ("from" in obj) {
          line.material.color.set(
            route(obj).visualState === "incorrect"
              ? PLAY_FEEDBACK.incorrect
              : route(obj).visualState === "correct"
                ? PLAY_FEEDBACK.correct
                : "#efd18f",
          );
          line.material.opacity = 1;
          line.material.linewidth = 2.2;
          line.renderOrder = 3;
          return;
        }
        const { color, opacity } = outlineColor(
          themedRegionStyle(
            p.theme ?? "natural",
            r.id,
            p.states[r.id],
            p.hovered === r.id,
            p.palette,
          ).stroke,
        );
        line.material.color.set(color);
        line.material.opacity = opacity;
        const emphasis = outlineEmphasis(p.states[r.id], p.hovered === r.id);
        line.material.linewidth = emphasis.width;
        line.renderOrder = emphasis.order;
        line.scale.setScalar(
          r.level !== "ADM0" ? 1 : (globe.current?.getGlobeRadius() ?? 100),
        );
      },
      [placeLabels, physical, refreshLabels, regionalSurfaces],
    );
    const makeOutline = useCallback(
      (obj: object) => {
        if (isPhysicalLayer(obj)) {
          physical.update(obj, globe.current?.getGlobeRadius() ?? 100);
          return physical.group;
        }
        if (isPlaceLabels(obj)) {
          placeLabels.update(obj, globe.current?.getGlobeRadius() ?? 100);
          refreshLabels();
          return placeLabels.group;
        }
        if ("type" in obj)
          return makeMapOverlay(
            obj as MapOverlay,
            globe.current?.getGlobeRadius() ?? 100,
          );
        const r = region(obj);
        const cap =
          !("from" in obj) && r.level !== "ADM0"
            ? regionalSurfaces.get(r, globe.current?.getGlobeRadius() ?? 100)
            : undefined;
        if (cap?.userData.outline) {
          outlines.current.set(r.id, cap.userData.outline);
          updateOutline(cap, r);
          return cap;
        }
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(
          "from" in obj
            ? surfaceRoutePositions(route(obj))
            : boundaryOutlinePositions(r),
        );
        const line = new LineSegments2(
          geometry,
          new LineMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,
            worldUnits: false,
            linewidth: 1.35,
            alphaToCoverage: true,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -4,
          }),
        );
        line.scale.setScalar(globe.current?.getGlobeRadius() ?? 100);
        // Country picking belongs to the filled polygon, including tiny regions.
        line.raycast = () => {};
        outlines.current.set(r.id, line);
        if (cap) {
          cap.userData.outline = line;
          cap.add(line);
        }
        updateOutline(cap ?? line, r);
        return cap ?? line;
      },
      [updateOutline, placeLabels, physical, refreshLabels, regionalSurfaces],
    );
    useEffect(() => {
      const activeObjects = new Map(customData.map((r) => [r.id, r]));
      for (const [id, line] of outlines.current) {
        const object = activeObjects.get(id);
        if (!object) outlines.current.delete(id);
        else updateOutline(line, object);
      }
    }, [
      customData,
      props.states,
      props.hovered,
      props.theme,
      props.palette,
      props.showBorders,
      props.borderRegionIds,
      props.showRegionalBorders,
      updateOutline,
    ]);
    const onPolygonHover = useCallback((obj: object | null) => {
      if (fidget.current.active || !inspection.current.allowed) return;
      current.current.onHover(
        obj &&
          !region(obj).displayBase &&
          current.current.regionInteraction !== false
          ? region(obj)
          : undefined,
      );
    }, []);
    const onPolygonClick = useCallback(
      (obj: object, _event: MouseEvent, point: Focus) => {
        if (current.current.onCoordinateTap) {
          if (gesture.current.consume()) {
            stop();
            current.current.onCoordinateTap(point);
          }
          return;
        }
        const r = region(obj);
        if (r.displayBase) return;
        if (current.current.onSurfaceTap) {
          if (gesture.current.consume()) current.current.onSurfaceTap(r);
          return;
        }
        if (
          current.current.regionInteraction !== false &&
          (current.current.selectDisabled ||
            current.current.states[r.id] !== "disabled") &&
          gesture.current.consume()
        )
          current.current.onSelect(r, point);
      },
      [],
    );
    const offset = useMemo<[number, number]>(
      () =>
        props.compact
          ? [
              0,
              viewportProjection(size.height, size.frameHeight, size.frameTop)
                .offsetY,
            ]
          : [size.width > 900 ? 155 : 0, size.width < 700 ? -55 : 0],
      [size, props.compact],
    );
    const hoveredRegion = props.regions.find((r) => r.id === props.hovered);
    const cityHover = props.placeInteraction
      ? props.places.find((p) => p.id === hoverPlaceId)?.hoverName
      : undefined;
    const hoverName =
      cityHover ??
      (props.regionInteraction !== false &&
      props.regionNames !== "none" &&
      (props.regionNames !== "committed" ||
        props.namedRegionIds?.includes(props.hovered ?? ""))
        ? hoveredRegion?.name
        : undefined);
    return (
      <div
        className="globe-canvas"
        data-scene-instance={sceneId}
        ref={host}
        onPointerDownCapture={(event) => {
          inspection.current.pointer(event.pointerType);
          if (event.pointerType !== "mouse") clearInspection();
          gesture.current.down(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerMoveCapture={(event) => {
          inspection.current.pointer(event.pointerType);
          gesture.current.move(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerUpCapture={(event) => {
          gesture.current.up(event.pointerId, event.clientX, event.clientY);
          // Fingers can hit a visible city within a 44px target, even when the
          // renderer's ray misses its small dot. Consume here to avoid double picks.
          if (
            event.pointerType === "touch" &&
            current.current.placeInteraction &&
            host.current
          ) {
            const box = host.current.getBoundingClientRect();
            const place = placeLabels.pick(
              event.clientX - box.left,
              event.clientY - box.top,
              22,
            );
            if (place && gesture.current.consume()) {
              stop();
              current.current.onPlace(place);
            }
          }
        }}
        onPointerCancelCapture={() => {
          gesture.current.cancel();
          clearInspection();
        }}
        onPointerMove={(event) => {
          if (!inspection.current.allowed) return;
          if (!tooltip.current || !host.current) return;
          const box = host.current.getBoundingClientRect();
          if (current.current.placeInteraction)
            setHoverPlaceId(
              placeLabels.pick(
                event.clientX - box.left,
                event.clientY - box.top,
              )?.id,
            );
          tooltip.current.style.left = `${Math.max(8, Math.min(event.clientX - box.left + 14, box.width - tooltip.current.offsetWidth - 8))}px`;
          tooltip.current.style.top = `${Math.max(8, Math.min(event.clientY - box.top + 14, box.height - 38))}px`;
        }}
        onPointerLeave={() => {
          clearInspection();
        }}
        aria-label={
          props.interactionLabel ??
          "Interactive Earth. Drag to rotate, scroll or pinch to zoom."
        }
      >
        <Globe
          ref={globe}
          width={size.width}
          height={size.height}
          globeOffset={offset}
          backgroundColor="#00000000"
          animateIn={false}
          waitForGlobeReady={false}
          enablePointerInteraction={
            props.regionInteraction !== false ||
            !!props.onCoordinateTap ||
            props.placeInteraction
          }
          globeMaterial={material}
          globeImageUrl={props.theme === "play" ? undefined : texture}
          atmosphereColor={THEMES[props.palette ?? "atlas"].globe.atmosphere}
          atmosphereAltitude={0.12}
          polygonsData={countryRegions}
          polygonGeoJsonGeometry="geometry"
          // Use the reactive tooltip below; cached library labels can disclose
          // a previous round's country name after the clue changes.
          polygonLabel={() => ""}
          polygonCapColor={capColor}
          polygonSideColor=""
          polygonStrokeColor=""
          polygonAltitude={boundaryAltitude}
          polygonCapCurvatureResolution={boundaryResolution}
          polygonsTransitionDuration={0}
          onPolygonHover={onPolygonHover}
          onPolygonClick={onPolygonClick}
          onGlobeClick={(point) => {
            if (!gesture.current.consume()) return;
            if (current.current.onCoordinateTap) {
              stop();
              current.current.onCoordinateTap(point);
            } else current.current.onSurfaceTap?.();
          }}
          customLayerData={customData}
          customThreeObject={makeOutline}
          customLayerLabel=""
          customThreeObjectUpdate={updateOutline}
          onCustomLayerClick={(obj, event, point) => {
            if ("level" in obj) onPolygonClick(obj, event, point);
            else onPlaceMarkerClick(obj, event);
          }}
          onCustomLayerHover={(obj) => {
            if (!fidget.current.active)
              onPolygonHover(obj && "level" in obj ? obj : null);
          }}
          pointsData={pointData}
          pointLabel=""
          pointColor={pointColor}
          pointRadius={pointRadius}
          pointAltitude={pointAltitude}
          pointResolution={8}
          pointsTransitionDuration={0}
          onPointHover={onPointHover}
          onPointClick={onPointClick}
          labelsData={NO_LABELS}
          arcsData={props.surfaceRoutes ? [] : props.routes}
          arcStartLat={(obj) => route(obj).from.lat}
          arcStartLng={(obj) => route(obj).from.lng}
          arcEndLat={(obj) => route(obj).to.lat}
          arcEndLng={(obj) => route(obj).to.lng}
          arcColor={() => ["#d2efbe", "#eacb93"]}
          arcAltitudeAutoScale={0.4}
          arcStroke={0.48}
          arcDashLength={props.reduced ? 1 : 0.4}
          arcDashGap={props.reduced ? 0 : 0.16}
          arcDashAnimateTime={props.reduced ? 0 : 2100}
          arcsTransitionDuration={props.reduced ? 0 : 700}
        />
        <div
          ref={tooltip}
          hidden={!hoverName}
          className="country-hover-tooltip"
          role="tooltip"
        >
          {hoverName}
        </div>
      </div>
    );
  },
);
