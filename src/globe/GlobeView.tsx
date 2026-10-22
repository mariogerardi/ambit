import {
  automaticConstructionNavigation,
  currentConstruction,
  dragConstructionCircle,
  inConstructionArea,
  startsConstruction,
  constructionCursor,
} from "../game/constructionInteraction";
import {
  brushSize,
  constructionRule,
  snapToBoundary,
} from "../game/construction";
import type { GeoPoint } from "../game/geodesic";
import { geoDistance, geoInterpolate } from "d3-geo";
import { editConstruction, simplifyTrace } from "../game/constructionEditing";
import { constructionHandleEntries } from "../game/constructionScene";
import type { Construction } from "../game/constructionTypes";
import type { Question } from "../game/questionContracts";
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
import { MAP_ANNOTATION_ALTITUDE } from "./surface";
import { canPickRegion, raisedSurfacePoint } from "./interaction";
import { ClueLocators } from "./clueLocators";
import type { ClueLocator } from "./clueLocators";
import { MapOverlays, isOverlayLayer } from "./overlays";
import {
  CameraTravel,
  CameraFlyover,
  ViewportResize,
  CameraScale,
  viewportProjection,
  worldAltitude,
  cameraNearPlane,
  localZoomFloor,
  focusAltitude,
} from "./camera";
import { pinBandColor } from "../theme/playColors";
import { themedRegionStyle, playStateColor } from "./themes";
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
  flyover(stops: Focus[], loop?: boolean): void;
  cancelFlyover(): void;
  pulseIslands(): void;
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
  clueLocators?: ClueLocator[];
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
  onFlyoverStep?(index: number): void;
  constructionInput?: {
    question: Question;
    value?: Construction;
    brushRadiusKm?: number;
    tool: "draw" | "move" | "erase";
    onChange(value: Construction | undefined): void;
  };
  placeInteraction?: boolean;
  placeLabels?: boolean;
  placeMarkers?: boolean;
  placeContextual?: boolean;
  placeDensity?: "study";
  selectDisabled?: boolean;
  selectableRegionIds?: readonly string[];
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
    const constructionPanning = useRef(false);
    const constructionGesture = useRef<
      | {
          pointerId: number;
          value?: Construction;
          before?: Construction;
          handle?: number;
          last: number;
          grab: GeoPoint;
          gap: boolean;
        }
      | undefined
    >(undefined);
    useEffect(() => {
      constructionGesture.current = undefined;
      constructionPanning.current = false;
      if (host.current) {
        if (props.constructionInput)
          host.current.dataset.constructionCursor = "grab";
        else delete host.current.dataset.constructionCursor;
      }
      const controls = globe.current?.controls();
      if (controls) controls.enableRotate = true;
    }, [props.constructionInput?.tool, props.constructionInput?.question.id]);
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
    const mapOverlays = useMemo(() => new MapOverlays(), []);
    const brushHover = useRef<GeoPoint | undefined>(undefined);
    useEffect(() => {
      brushHover.current = undefined;
      mapOverlays.previewBrush();
    }, [
      mapOverlays,
      props.constructionInput?.tool,
      props.constructionInput?.question.id,
    ]);
    useEffect(() => {
      const input = props.constructionInput;
      const rule = input && constructionRule(input.question);
      if (rule?.type === "raster-overlap")
        mapOverlays.previewBrush(
          brushHover.current,
          brushSize(rule, input?.brushRadiusKm),
          globe.current?.getGlobeRadius() ?? 100,
          props.palette,
        );
    }, [mapOverlays, props.constructionInput?.brushRadiusKm, props.palette]);
    const clueLocators = useMemo(() => new ClueLocators(), []);
    useEffect(() => {
      host.current?.append(clueLocators.element);
      return () => clueLocators.dispose();
    }, [clueLocators]);
    useEffect(
      () => mapOverlays.setPalette(props.palette ?? "atlas"),
      [mapOverlays, props.palette],
    );
    useEffect(() => () => mapOverlays.dispose(), [mapOverlays]);
    const labelFrame = useRef(0);
    const countryPoints = useRef<
      (PlaceFeature & { __threeObjPoint?: Object3D })[]
    >([]);
    const refreshLabels = useCallback(() => {
      const g = globe.current;
      if (!g) return;
      const rendererSize = g.renderer().getSize(new Vector2());
      const camera = g.camera() as PerspectiveCamera;
      const near =
        cameraNearPlane(g.pointOfView().altitude) * g.getGlobeRadius();
      if (Math.abs(camera.near - near) > 0.000001) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }
      // Geographic context gets first claim on space; city names then avoid it.
      physical.view(camera, rendererSize.x, rendererSize.y);
      mapOverlays.view(camera, rendererSize.x, rendererSize.y);
      const panel = document
        .querySelector(".question-card")
        ?.getBoundingClientRect();
      const canvas = host.current?.getBoundingClientRect();
      const panelBoxes =
        panel?.width && canvas
          ? [
              {
                left: panel.left - canvas.left,
                right: panel.right - canvas.left,
                top: panel.top - canvas.top,
                bottom: panel.bottom - canvas.top,
              },
            ]
          : [];
      const clueBoxes = clueLocators.view(
        camera,
        rendererSize.x,
        rendererSize.y,
        g.getGlobeRadius(),
        [...physical.labelBoxes(), ...panelBoxes],
        !travel.current.active && !flyover.current.active,
      );
      placeLabels.view(camera, rendererSize.x, rendererSize.y, [
        ...physical.labelBoxes(),
        ...clueBoxes,
      ]);
      if (
        (placeLabels.needsRefresh() ||
          physical.needsRefresh() ||
          clueLocators.needsRefresh()) &&
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
    }, [placeLabels, physical, clueLocators, mapOverlays]);
    useEffect(() => {
      clueLocators.update(
        props.active === false ? [] : (props.clueLocators ?? []),
        props.palette,
        props.reduced,
      );
      refreshLabels();
    }, [
      props.clueLocators,
      props.palette,
      props.reduced,
      props.active,
      ready,
      clueLocators,
      refreshLabels,
    ]);
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
      c.minDistance = g.getGlobeRadius() * 1.005;
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
      camera.near =
        cameraNearPlane(g.pointOfView().altitude) * g.getGlobeRadius();
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
          const setZoomFloor = () => {
            if (!globe.current) return;
            const floor = localZoomFloor({
              ...target,
              altitude: fitAltitude(),
            });
            globe.current.controls().minDistance =
              globe.current.getGlobeRadius() *
              (1 + Math.min(floor, globe.current.pointOfView().altitude));
          };
          setZoomFloor();
          travel.current.move(
            globe.current,
            target,
            current.current.reduced,
            () => {
              setZoomFloor();
              resumeRotation();
            },
            fitAltitude,
          );
        },
        flyover(stops, loop = true) {
          clearInspection();
          if (!globe.current) return;
          stop();
          resizing.current.cancel();
          travel.current.cancel();
          globe.current.controls().minDistance =
            globe.current.getGlobeRadius() * 1.005;
          fidget.current.cancel();
          const ratio = Math.min(1, size.width / size.frameHeight);
          flyover.current.start(
            globe.current,
            stops.map((stop) => ({
              ...stop,
              altitude: (stop.altitude ?? 0.65) / ratio,
            })),
            current.current.reduced,
            loop,
            (index) => current.current.onFlyoverStep?.(index),
          );
        },
        pulseIslands() {
          clueLocators.pulse();
          refreshLabels();
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
        if (canPickRegion(p.region, props)) props.onSelect(p.region);
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
        palette: props.palette,
      }),
      [],
    );
    // Keep the custom-layer binding stable while its cached content/preferences change.
    labelLayer.places = props.places;
    labelLayer.visible = props.placeLabels !== false;
    labelLayer.markers = props.placeMarkers !== false;
    labelLayer.contextual = !!props.placeContextual;
    labelLayer.density = props.placeDensity;
    labelLayer.palette = props.palette;
    useEffect(() => {
      placeLabels.update(labelLayer, globe.current?.getGlobeRadius() ?? 100);
      refreshLabels();
    }, [
      props.places,
      props.placeLabels,
      props.placeMarkers,
      props.placeContextual,
      props.placeDensity,
      props.palette,
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
        palette: props.palette,
      }),
      [],
    );
    physicalLayer.features = props.physicalFeatures ?? NO_FEATURES;
    physicalLayer.palette = props.palette;
    useEffect(() => {
      physical.update(physicalLayer, globe.current?.getGlobeRadius() ?? 100);
      refreshLabels();
    }, [
      props.physicalFeatures,
      props.palette,
      ready,
      physical,
      physicalLayer,
      refreshLabels,
    ]);
    const overlayLayer = useMemo(
      () => ({
        id: "map:overlays",
        kind: "map-overlays" as const,
        overlays: props.overlays ?? [],
        palette: props.palette,
      }),
      [],
    );
    overlayLayer.overlays = props.overlays ?? [];
    overlayLayer.palette = props.palette;
    useEffect(() => {
      mapOverlays.update(overlayLayer, globe.current?.getGlobeRadius() ?? 100);
    }, [props.overlays, props.palette, ready, overlayLayer, mapOverlays]);
    const customData = useMemo(
      () => [
        ...renderRegions,
        labelLayer,
        physicalLayer,
        ...(props.surfaceRoutes ? props.routes : []),
        overlayLayer,
      ],
      [
        renderRegions,
        labelLayer,
        physicalLayer,
        props.routes,
        props.surfaceRoutes,
        overlayLayer,
      ],
    );
    const capColor = useCallback(
      (obj: object) =>
        themedRegionStyle(
          props.theme ?? "natural",
          region(obj).id,
          props.states[region(obj).id],
          props.hovered === region(obj).id &&
            canPickRegion(region(obj), props) &&
            !props.onCoordinateTap,
          props.palette,
        ).fill,
      [
        props.theme,
        props.palette,
        props.states,
        props.hovered,
        props.selectableRegionIds,
        props.regionInteraction,
        props.selectDisabled,
        props.onCoordinateTap,
      ],
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
        if (isOverlayLayer(obj)) {
          mapOverlays.update(obj, globe.current?.getGlobeRadius() ?? 100);
          refreshLabels();
          return;
        }
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
              p.hovered === r.id && canPickRegion(r, p) && !p.onCoordinateTap,
              p.palette,
            ).fill,
          );
        // Keep the parent's exterior boundary wherever detailed coverage falls
        // short. Its surface is non-interactive, but its outline remains useful.
        line.visible = "from" in obj || regionBorderVisible(r, p);
        if ("from" in obj) {
          line.material.color.set(
            route(obj).accuracyBand
              ? pinBandColor(
                  route(obj).accuracyBand!.index,
                  route(obj).accuracyBand!.count,
                  p.palette,
                )
              : (playStateColor(
                  route(obj).visualState ?? "hinted",
                  p.palette,
                ) ?? "#efd18f"),
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
            p.hovered === r.id && canPickRegion(r, p) && !p.onCoordinateTap,
            p.palette,
          ).stroke,
        );
        line.material.color.set(color);
        line.material.opacity = opacity;
        const emphasis = outlineEmphasis(
          p.states[r.id],
          p.hovered === r.id && canPickRegion(r, p) && !p.onCoordinateTap,
          r.level === "ADM0" && (!!r.displayGeometry || !!r.parentId),
        );
        line.material.linewidth = emphasis.width;
        line.renderOrder = emphasis.order;
        line.scale.setScalar(
          (r.level !== "ADM0" ? 1 : (globe.current?.getGlobeRadius() ?? 100)) *
            (1 + emphasis.lift),
        );
      },
      [placeLabels, physical, refreshLabels, regionalSurfaces, mapOverlays],
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
        if (isOverlayLayer(obj)) {
          mapOverlays.update(obj, globe.current?.getGlobeRadius() ?? 100);
          refreshLabels();
          return mapOverlays.group;
        }
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
      [
        updateOutline,
        placeLabels,
        physical,
        refreshLabels,
        regionalSurfaces,
        mapOverlays,
      ],
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
        if (canPickRegion(r, current.current) && gesture.current.consume())
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
    const constructionPointer = (
      event: React.PointerEvent<HTMLDivElement>,
      phase: "start" | "move" | "end" | "cancel",
    ) => {
      const input = current.current.constructionInput,
        g = globe.current;
      if (
        !input ||
        !g ||
        !host.current ||
        (input.tool === "move" &&
          !automaticConstructionNavigation(input.question))
      )
        return false;
      const gesture = constructionGesture.current;
      if (
        phase !== "start" &&
        (!gesture || gesture.pointerId !== event.pointerId)
      )
        return false;
      if (phase === "start" && (event.button !== 0 || gesture)) return false;
      const box = host.current.getBoundingClientRect(),
        x = event.clientX - box.left,
        y = event.clientY - box.top;
      const circleRule = constructionRule(input.question);
      const localCircle =
        (circleRule?.type === "point-coverage-max" ||
          circleRule?.type === "island-coverage-max") &&
        circleRule.radiusKm <= 100;
      const onShell = localCircle
        ? raisedSurfacePoint(
            g.camera(),
            x,
            y,
            box.width,
            box.height,
            g.getGlobeRadius() * (1 + MAP_ANNOTATION_ALTITUDE),
          )
        : null;
      const point = localCircle
        ? onShell
          ? g.toGeoCoords(onShell)
          : null
        : g.toGlobeCoords(x, y);
      const value = currentConstruction(input.question, {
          construction: input.value,
        }),
        handles = constructionHandleEntries(value);
      const handle = point
        ? handles.findIndex(({ point: p }) => {
            const screen = g.getScreenCoords(p.lat, p.lng);
            return (
              Math.hypot(screen.x - x, screen.y - y) < 22 &&
              geoDistance([p.lng, p.lat], [point.lng, point.lat]) < 0.06
            );
          })
        : -1;
      if (
        phase === "start" &&
        (!point ||
          (handle < 0 && !startsConstruction(input.question, value, point)))
      ) {
        g.controls().enableRotate = true;
        return false;
      }
      event.preventDefault();
      event.stopPropagation();
      const handleIndex = handle < 0 ? undefined : handles[handle].index;
      if (phase === "start") {
        stop();
        clearInspection();
        g.controls().enableRotate = false;
        const edited =
          value?.kind === "circle"
            ? value
            : editConstruction(
                input.question,
                value,
                point!,
                true,
                handleIndex,
                input.tool === "erase",
                input.brushRadiusKm,
              );
        constructionGesture.current = {
          pointerId: event.pointerId,
          before: input.value,
          value: edited,
          handle: handleIndex,
          last: performance.now(),
          grab: point!,
          gap: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        input.onChange(edited);
        return true;
      }
      if (phase === "cancel") input.onChange(gesture!.before);
      else if (
        point &&
        gesture &&
        (phase === "end" || performance.now() - gesture.last > 30)
      ) {
        let next = gesture.value;
        if (next?.kind === "circle")
          next = dragConstructionCircle(next, gesture.grab, point);
        else if (inConstructionArea(input.question, point))
          next = editConstruction(
            input.question,
            next,
            point,
            gesture.gap && next?.kind === "brush",
            gesture.handle,
            input.tool === "erase",
            input.brushRadiusKm,
          );
        else if (
          (next?.kind === "polygon" || next?.kind === "cut") &&
          input.question.constructionArea
        ) {
          const geometry = input.question.constructionArea.geometry,
            rings =
              geometry.type === "Polygon"
                ? [geometry.coordinates[0]]
                : geometry.coordinates.map((p) => p[0]);
          const candidates = rings.map((r) =>
            snapToBoundary(
              point,
              r.map(([lng, lat]) => ({ lng, lat })),
            ),
          );
          const snapped = candidates.sort(
            (a, b) =>
              geoDistance([a.lng, a.lat], [point.lng, point.lat]) -
              geoDistance([b.lng, b.lat], [point.lng, point.lat]),
          )[0];
          // Numerical edge membership can differ at the last bit; inset toward the last inside location.
          const interpolate = geoInterpolate(
              [snapped.lng, snapped.lat],
              [gesture.grab.lng, gesture.grab.lat],
            ),
            [lng, lat] = interpolate(0.00001);
          next = editConstruction(
            input.question,
            next,
            { lng, lat },
            false,
            gesture.handle,
            input.tool === "erase",
            input.brushRadiusKm,
          );
        }
        gesture.gap = !inConstructionArea(input.question, point);
        gesture.value = next;
        if (
          next?.kind === "circle" ||
          inConstructionArea(input.question, point)
        )
          gesture.grab = point;
        gesture.last = performance.now();
        input.onChange(next);
      }
      if (phase === "end" && gesture?.value?.kind === "trace")
        input.onChange(simplifyTrace(gesture.value));
      if (phase === "end" || phase === "cancel") {
        constructionGesture.current = undefined;
        g.controls().enableRotate = true;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }
      return true;
    };
    const updateConstructionCursor = (
      event: React.PointerEvent<HTMLDivElement>,
    ) => {
      const input = current.current.constructionInput,
        g = globe.current,
        element = host.current;
      if (!input || !g || !element) return;
      const active = !!constructionGesture.current,
        box = element.getBoundingClientRect(),
        point = g.toGlobeCoords(
          event.clientX - box.left,
          event.clientY - box.top,
        );
      const rule = constructionRule(input.question);
      brushHover.current =
        rule?.type === "raster-overlap" &&
        input.tool !== "move" &&
        event.pointerType === "mouse" &&
        !constructionPanning.current &&
        point &&
        inConstructionArea(input.question, point)
          ? point
          : undefined;
      mapOverlays.previewBrush(
        brushHover.current,
        rule?.type === "raster-overlap"
          ? brushSize(rule, input.brushRadiusKm)
          : undefined,
        g.getGlobeRadius(),
        current.current.palette,
      );
      element.dataset.constructionCursor = constructionCursor(
        input.question,
        currentConstruction(input.question, { construction: input.value }),
        point ?? undefined,
        input.tool,
        active,
        constructionPanning.current,
      );
    };
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
        data-pin-input={!!props.onCoordinateTap || undefined}
        data-construction-input={props.constructionInput?.tool}
        data-scene-instance={sceneId}
        ref={host}
        onPointerDownCapture={(event) => {
          if (constructionPointer(event, "start")) {
            updateConstructionCursor(event);
            return;
          }
          constructionPanning.current = true;
          updateConstructionCursor(event);
          inspection.current.pointer(event.pointerType);
          if (event.pointerType !== "mouse") clearInspection();
          gesture.current.down(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerMoveCapture={(event) => {
          updateConstructionCursor(event);
          if (constructionPointer(event, "move")) return;
          inspection.current.pointer(event.pointerType);
          gesture.current.move(event.pointerId, event.clientX, event.clientY);
        }}
        onPointerUpCapture={(event) => {
          constructionPanning.current = false;
          if (constructionPointer(event, "end")) {
            updateConstructionCursor(event);
            return;
          }
          updateConstructionCursor(event);
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
        onPointerCancelCapture={(event) => {
          constructionPanning.current = false;
          if (constructionPointer(event, "cancel")) {
            updateConstructionCursor(event);
            return;
          }
          if (host.current) host.current.dataset.constructionCursor = "grab";
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
          brushHover.current = undefined;
          mapOverlays.previewBrush();
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
            !!props.constructionInput ||
            props.placeInteraction
          }
          showPointerCursor={(_type, obj) => {
            const p = current.current;
            if (p.onCoordinateTap || p.constructionInput) return false;
            if ("level" in obj) return canPickRegion(obj as RegionFeature, p);
            if ("region" in obj && obj.region)
              return canPickRegion(obj.region as RegionFeature, p);
            return (
              isPlaceLabels(obj) &&
              !!p.placeInteraction &&
              p.places.some(
                (place) => place.id === hoverPlaceId && place.answerTarget,
              )
            );
          }}
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
