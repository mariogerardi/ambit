import { useProgressSync } from "./app/useProgressSync";
import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ErrorInfo, ReactNode } from "react";
import { LayerLoader } from "./geography/loadLayer";
import type {
  BoundaryLayerManifest,
  Focus,
  RegionFeature,
  VisualState,
  PlaceFeature,
} from "./geography/types";
import type { GlobeHandle } from "./globe/GlobeView";
import {
  createDefaultViewCycle,
  normalWorldView,
  studyCameraTarget,
} from "./globe/defaultViews";
import {
  PHYSICAL_REVISION,
  validatePhysicalSnapshot,
} from "./geography/physical";
import type { PhysicalSnapshot } from "./geography/physical";
import {
  DEFAULT_LAYERS,
  DEFAULT_VIEW_KEY,
  readDefaultPreferences,
  saveDefaultView,
} from "./app/worldPreferences";
import { worldAltitude } from "./globe/camera";
import { useAccount } from "./services/accounts";
import { appRelease } from "./services/config";
import {
  trackView,
  reportFailure,
  reportReactFailure,
} from "./services/monitoring";
import type { FeedbackRequest } from "./services/feedback";
import { AccountPanel, AdminAccess } from "./app/AccountPanel";
import { FeedbackDialog } from "./app/FeedbackDialog";
import { FeedbackReview } from "./app/FeedbackReview";
import { AppMenu } from "./app/AppMenu";
import { GlobeControls } from "./app/GlobeControls";
import { journeyStops } from "./game/journeyStops";
import { AmbitLogo } from "./app/AmbitLogo";
import { applyTheme, readTheme, saveTheme, THEME_KEY } from "./theme/themes";
import type { ThemeId } from "./theme/themes";
const GameShell = lazy(() =>
  import("./game/GameShell").then((m) => ({ default: m.GameShell })),
);
import { JOURNEY_INDEX, loadJourney } from "./game/journeyRegistry";
import type { Journey, QuestionContext } from "./game/questions";
import { COUNTRY_FACTS } from "./game/countryFacts";
import {
  createQuestionContext,
  canSelect,
  questionPrompt,
  responseCount,
} from "./game/questions";
import { gameReducer, initialGame } from "./game/state";
import type { Action, GameState } from "./game/state";
import { DISPLAY_CAPITALS, MAJOR_CITIES } from "./geography/places";
import { modeForPath } from "./app/modes";
import { ModePanels } from "./app/ModePanels";
import { useMobileLayout } from "./app/useMobileLayout";
const AdminPanel = lazy(() =>
  import("./app/AdminPanel").then((m) => ({ default: m.AdminPanel })),
);
const ExplorePanel = lazy(() =>
  import("./app/ExplorePanel").then((m) => ({ default: m.ExplorePanel })),
);
import type { ExploreSettings } from "./app/ExplorePanel";
import {
  DAILY_KEY,
  dailyJourney,
  emptyDaily,
  localDateKey,
  millisecondsToMidnight,
  openDaily,
  setDailyPuzzle,
  unfinished,
  validDaily,
} from "./app/dailyProgress";
import { usePublishedPuzzles } from "./app/publishedPuzzles";
import { readSave } from "./app/storage";
import {
  createDailySave,
  createStudySave,
  progressKey,
} from "./app/progressSaves";
import {
  COUNTRIES,
  archiveStudy,
  leaveStudy,
  startStudy,
  studyReducer,
  studyStates,
  studyPool,
  studyPrompt,
  capitalOf,
} from "./study/engine";
import type {
  StudyAction,
  StudySettings,
  StudyReviewTarget,
  StudyAnswer,
  StudyRecord,
} from "./study/engine";
import { studyScopeFocus } from "./study/scopeFocus";
const StudyPanel = lazy(() =>
  import("./study/StudyPanel").then((m) => ({ default: m.StudyPanel })),
);
const GlobeView = lazy(() =>
  import("./globe/GlobeView").then((m) => ({ default: m.GlobeView })),
);
const emptyJourney: Journey = {
  id: "",
  title: "",
  description: "",
  rounds: [],
};
type GameRuntime = typeof import("./game/runtime");
type RegionalRuntime = typeof import("./geography/regions");
const emptyRoutes: [] = [];
const noAction = () => {};
class BoardBoundary extends Component<
  { children: ReactNode; onError(): void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportReactFailure(error, info);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
class PanelBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown, info: ErrorInfo) {
    reportReactFailure(error, info);
  }
  render() {
    return this.state.failed ? (
      <section className="info-view" role="alert">
        <p>This screen could not be loaded.</p>
        <button onClick={() => location.reload()}>Reload ↻</button>
      </section>
    ) : (
      this.props.children
    );
  }
}
export function PlayerWorkspace() {
  const account = useAccount();
  if (account.loading) return <p role="status">Checking your account…</p>;
  return <App key={account.user?.profile.sub ?? "guest"} />;
}
export function App() {
  const account = useAccount();
  const subject = account.user?.profile.sub;
  const [feedback, setFeedback] = useState<FeedbackRequest>();
  const closeFeedback = useCallback(() => setFeedback(undefined), []);
  const mobile = useMobileLayout();
  const [globeExpanded, setGlobeExpanded] = useState(false);
  const expanded = mobile.enabled && globeExpanded && !mobile.keyboard;
  const published = usePublishedPuzzles();
  const allJourneys = useMemo(
    () => [...JOURNEY_INDEX, ...published.items.map((p) => p.journey)],
    [published.items],
  );
  const dailyStore = useRef<ReturnType<typeof createDailySave> | undefined>(
    undefined,
  );
  const [dailyLoaded, setDailyLoaded] = useState(false);
  const [path, setPath] = useState(location.pathname);
  const mode = modeForPath(path);
  useEffect(() => {
    if (!account.loading) trackView(mode);
  }, [mode, account.loading]);
  const [theme, setTheme] = useState(readTheme);
  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    const update = (event: StorageEvent) => {
      if (event.key === THEME_KEY || event.key === null) setTheme(readTheme());
    };
    addEventListener("storage", update);
    return () => removeEventListener("storage", update);
  }, []);
  const changeTheme = (value: ThemeId) => {
    setTheme(value);
    saveTheme(value);
  };
  const [initialDefault] = useState(readDefaultPreferences);
  const defaultView = useRef(initialDefault?.focus);
  const [defaultLayers, setDefaultLayers] = useState(initialDefault?.layers);
  const [nextDefaultView] = useState(() => {
    const cycle = createDefaultViewCycle();
    return (altitude: number) =>
      defaultView.current
        ? { ...defaultView.current, altitude }
        : cycle(altitude);
  });
  const [initialFocus] = useState(() =>
    createDefaultViewCycle()(worldAltitude(innerWidth, innerHeight)),
  );
  const [defaultViewStatus, setDefaultViewStatus] = useState("");
  const [boundaryLoader, setBoundaryLoader] = useState<LayerLoader>();
  const [regional, setRegional] = useState<RegionalRuntime>();
  const [loaded, setLoaded] = useState<{
    journey: Journey;
    runtime: GameRuntime;
  }>();
  const [journeyError, setJourneyError] = useState("");
  const [breakdown, setBreakdown] = useState<string>();
  const [selectedRegion, setSelectedRegion] = useState<RegionFeature>();
  const [branches, setBranches] = useState<RegionFeature[][]>([]);
  const [regionalStatus, setRegionalStatus] = useState("");
  const [physicalData, setPhysicalData] = useState<PhysicalSnapshot>();
  const [physicalError, setPhysicalError] = useState("");
  const [regions, setRegions] = useState<RegionFeature[]>([]),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (error) reportFailure("geography loading");
  }, [error]);
  const [dailyRead] = useState(() =>
    readSave(progressKey(DAILY_KEY, subject), emptyDaily, validDaily),
  );
  const [studyStore] = useState(() => createStudySave(subject));
  const [daily, setDaily] = useState(dailyRead.value),
    [study, setStudy] = useState(() => studyStore.load());
  const [dailySaveOk, setDailySaveOk] = useState(dailyRead.available),
    [studySaveOk, setStudySaveOk] = useState(studyStore.writable);
  const [saveRecovered, setSaveRecovered] = useState(studyStore.recovered);
  const cloudSave = useProgressSync(
    subject,
    dailyLoaded ? dailyStore.current : undefined,
    studyStore,
    account.accessToken,
  );
  const dailyReady =
    dailyLoaded &&
    (cloudSave.hydrated || Object.keys(daily.attempts).length > 0);
  const canSave = dailySaveOk && studySaveOk;
  useEffect(() => {
    if (!canSave) reportFailure("local save");
  }, [canSave]);
  const [today, setToday] = useState(localDateKey),
    [studySetup, setStudySetup] = useState(true);
  const [studyBuilder, setStudyBuilder] = useState(false);
  const [studyBrowsingHistory, setStudyBrowsingHistory] = useState(false);
  const [practice, setPractice] = useState<Record<string, GameState>>({});
  const [hover, setHover] = useState<RegionFeature>(),
    [selected, setSelected] = useState<string>();
  const pendingExploreFocus = useRef<string | undefined>(undefined);
  const [exploreSearch, setExploreSearch] = useState("");
  const [explore, setExplore] = useState<ExploreSettings>(
    initialDefault?.layers ?? DEFAULT_LAYERS,
  );
  const unrestricted =
    mode === "home" ||
    mode === "admin" ||
    (mode === "study" && (studySetup || !study.session));
  const displayLayers =
    mode === "explore" ? explore : unrestricted ? defaultLayers : undefined;
  const [motion, setMotion] = useState(mode === "home"),
    [ready, setReady] = useState(false),
    [webgl, setWebgl] = useState(true);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [globeInteracted, setGlobeInteracted] = useState(false);
  const globe = useRef<GlobeHandle>(null),
    scene = useRef<HTMLDivElement>(null);
  const views = useRef(new Map<string, Focus>()),
    previous = useRef<string | undefined>(undefined);
  const namedRegions = useMemo(
    () =>
      regions.map((r) => ({
        ...r,
        name: COUNTRIES.find((c) => c.id === r.id)?.name ?? r.name,
      })),
    [regions],
  );
  const exploreRegions = useMemo(
    () => regional?.exploreBoundaries(namedRegions, branches) ?? namedRegions,
    [namedRegions, branches, regional],
  );
  const physicalFeatures = useMemo(
    () =>
      displayLayers
        ? (physicalData?.revision === PHYSICAL_REVISION
            ? physicalData.features
            : []
          ).filter((f) =>
            f.kind === "river"
              ? displayLayers.rivers
              : f.kind === "mountain"
                ? displayLayers.mountains
                : f.kind === "landform"
                  ? displayLayers.landforms
                  : displayLayers.oceans,
          )
        : undefined,
    [
      displayLayers,
      physicalData,
      PHYSICAL_REVISION,
      explore.rivers,
      explore.mountains,
      explore.oceans,
    ],
  );
  useEffect(() => {
    if (
      !displayLayers ||
      physicalData?.revision === PHYSICAL_REVISION ||
      !(
        displayLayers.rivers ||
        displayLayers.mountains ||
        displayLayers.landforms ||
        displayLayers.oceans
      )
    )
      return;
    const controller = new AbortController();
    void fetch(`/geography/physical.v1.json?v=${PHYSICAL_REVISION}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw Error("Geographic layers could not be loaded.");
        const data = validatePhysicalSnapshot(await response.json());
        if (!controller.signal.aborted) {
          setPhysicalData(data);
          setPhysicalError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setPhysicalError(
            "Map details couldn’t load. Try reloading the page.",
          );
      });
    return () => controller.abort();
  }, [
    displayLayers,
    physicalData,
    PHYSICAL_REVISION,
    explore.rivers,
    explore.mountains,
    explore.oceans,
  ]);
  useEffect(() => {
    if (!breakdown) {
      setBranches([]);
      setRegionalStatus("");
      return;
    }
    if (mode !== "explore" || !boundaryLoader || !regional) return;
    let live = true;
    setRegionalStatus("Loading regional boundaries…");
    void (async () => {
      const loaded: RegionFeature[][] = [];
      for (const layer of regional.regionalChain(breakdown)) {
        const rows = await boundaryLoader.loadBoundaryLayer(layer.key);
        if (!live) return;
        loaded.push(regional.catalogRegions(rows));
      }
      if (live) {
        setBranches(loaded);
        setRegionalStatus("");
      }
    })().catch((e) => {
      if (live && e.name !== "AbortError") {
        setBranches([]);
        setRegionalStatus(
          "Regional boundaries could not be loaded. Turn the layer off and on to retry.",
        );
      }
    });
    return () => {
      live = false;
      boundaryLoader.cancel();
    };
  }, [breakdown, boundaryLoader, mode, regional]);
  const neutral = useMemo<Record<string, VisualState>>(
    () => Object.fromEntries(namedRegions.map((r) => [r.id, "disabled"])),
    [namedRegions],
  );
  const activeAttempt = daily.activeDate
    ? daily.attempts[daily.activeDate]
    : undefined;
  const cameraKey =
    mode === "daily"
      ? `${path}:${activeAttempt?.date ?? today}:${activeAttempt?.journeyId ?? dailyJourney(today, daily, allJourneys).id}`
      : mode === "study"
        ? `${path}:${studyBrowsingHistory ? "history" : studySetup || !study.session ? "setup" : `session:${study.session.id ?? study.session.seed}`}`
        : path;
  const wantsJourney =
    mode === "daily" || mode === "practice" || mode === "playground";
  const journeyId =
    mode === "playground"
      ? "question-playground-v1"
      : mode === "daily"
        ? (activeAttempt?.journeyId ??
          dailyJourney(today, daily, allJourneys).id)
        : JOURNEY_INDEX.find((j) => j.path === path)?.id;
  const journey =
    loaded && loaded.journey.id === journeyId ? loaded.journey : emptyJourney;
  const isJourney = wantsJourney && journey !== emptyJourney;
  useEffect(() => {
    if (!wantsJourney || !journeyId) return;
    let live = true;
    setJourneyError("");
    const local = published.items.find((p) => p.id === journeyId)?.journey;
    const content = local
      ? Promise.resolve(local)
      : mode === "playground"
        ? import("./game/questionCatalog").then((m) => m.PLAYGROUND_JOURNEY)
        : loadJourney(journeyId);
    void Promise.all([content, import("./game/runtime")])
      .then(([journey, runtime]) => {
        if (live) setLoaded({ journey, runtime });
      })
      .catch(() => {
        if (live) setJourneyError("The Journey could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, [wantsJourney, journeyId, mode, published.items, retry]);
  useEffect(() => {
    if (mode !== "explore") return;
    let live = true;
    void import("./geography/regions")
      .then((module) => {
        if (live) setRegional(module);
      })
      .catch(() => {
        if (live) setRegionalStatus("Regional boundaries could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, [mode, retry]);
  const contexts = useMemo(
    () => ({
      journeys: new WeakMap<Journey, QuestionContext>(),
      base: undefined as QuestionContext | undefined,
    }),
    [regions],
  );
  const contextResult = useMemo(() => {
    if (!regions.length || !isJourney) return {};
    try {
      let context = contexts.journeys.get(journey);
      if (!context) {
        context = createQuestionContext(
          regions,
          COUNTRY_FACTS,
          journey,
          contexts.base,
        );
        contexts.journeys.set(journey, context);
        contexts.base ??= context;
      }
      return { context };
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "The world could not be prepared.",
      };
    }
  }, [regions, isJourney, journey, contexts]);
  const context = contextResult.context;
  useEffect(() => {
    if (mode !== "home" || !ready || !regions.length) return;
    let live = true;
    // Only warm the Journey the Home screen offers, after Earth is ready.
    // Its geometry, runtime and question context otherwise wait until navigation.
    const warm = () => {
      const id =
        activeAttempt?.journeyId ?? dailyJourney(today, daily, allJourneys).id;
      const local = published.items.find((p) => p.id === id)?.journey;
      void Promise.all([
        local ? Promise.resolve(local) : loadJourney(id),
        import("./game/runtime"),
        import("./game/GameShell"),
      ])
        .then(([journey, runtime]) => {
          if (!live) return;
          if (!contexts.journeys.has(journey)) {
            const context = createQuestionContext(
              regions,
              COUNTRY_FACTS,
              journey,
              contexts.base,
            );
            contexts.journeys.set(journey, context);
            contexts.base ??= context;
          }
          setLoaded({ journey, runtime });
        })
        .catch(() => {}); // Navigation retains the normal retry/error UI.
    };
    const idle = window.requestIdleCallback?.(warm, { timeout: 1500 });
    const timer = idle === undefined ? window.setTimeout(warm, 200) : undefined;
    return () => {
      live = false;
      if (idle !== undefined) window.cancelIdleCallback(idle);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [
    mode,
    ready,
    regions,
    contexts,
    activeAttempt?.journeyId,
    today,
    daily,
    allJourneys,
    published.items,
  ]);
  const game =
    mode === "daily"
      ? (activeAttempt?.game ?? { ...initialGame, phase: "playing" as const })
      : (practice[journey.id] ?? { ...initialGame, phase: "playing" as const });
  const world = useMemo(
    () =>
      isJourney && context && loaded
        ? loaded.runtime.journeyWorld(namedRegions, journey, game, context)
        : undefined,
    [isJourney, context, namedRegions, journey, game, loaded],
  );
  const warmRegions = useMemo(
    () =>
      loaded
        ? [
            ...new Map(
              loaded.journey.rounds
                .flatMap((q) => q.importedRegions ?? [])
                .map((r) => [r.id, r]),
            ).values(),
          ]
        : undefined,
    [loaded?.journey],
  );
  const session = study.session;
  const [studyReview, setStudyReview] = useState<StudyAnswer>();
  const [studyEditing, setStudyEditing] = useState(false);
  const [studyPreview, setStudyPreview] = useState<StudySettings>();
  const studying =
    mode === "study" && !studyBrowsingHistory && !studySetup && !!session;
  const studyDisplay =
    mode === "study"
      ? studying
        ? session!.settings
        : studyPreview
      : undefined;
  const studyCapitalReveal =
    studying &&
    session!.phase === "feedback" &&
    session!.prompt.topic === "capitals"
      ? capitalOf(session!.prompt.targetId)
      : undefined;
  const studyDisplayIds = useMemo(
    () => new Set(studyDisplay ? studyPool(studyDisplay) : []),
    [studyDisplay],
  );
  const studyDisplayRegionIds = useMemo(
    () => [...studyDisplayIds],
    [studyDisplayIds],
  );
  const mobileStep = `${path}:${isJourney ? `${journey.id}:${game.roundIndex}:${game.phase}` : studying ? `${session!.prompt.ordinal}:${session!.phase}` : mode === "explore" ? `${selected}:${selectedRegion?.id}` : "setup"}`;
  useEffect(() => {
    setGlobeExpanded(false);
    if (mobile.enabled && document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  }, [mobileStep, mobile.enabled]);
  const studyHighlight =
    studying &&
    session!.phase !== "summary" &&
    session!.prompt.topic === "countries" &&
    session!.prompt.style !== "map"
      ? namedRegions.find((r) => r.id === session!.prompt.targetId)?.focus
      : undefined;
  const studyCapitalFocus =
    studying &&
    session!.phase !== "summary" &&
    session!.prompt.topic === "capitals" &&
    session!.prompt.style !== "map"
      ? namedRegions.find((r) => r.id === session!.prompt.targetId)?.focus
      : undefined;
  const studyArea = useMemo(
    () =>
      session
        ? studyScopeFocus(
            session.settings,
            namedRegions,
            worldAltitude(
              scene.current?.clientWidth || innerWidth,
              scene.current?.clientHeight || innerHeight,
              mobile.enabled,
            ),
          )
        : undefined,
    [session?.settings, namedRegions, mobile.enabled],
  );
  const studyDestination = (entering = false) =>
    studyCapitalFocus ??
    (studyArea && !studyHighlight
      ? entering || !normalWorldView(globe.current?.view(), studyArea.altitude!)
        ? studyArea
        : undefined
      : studyCameraTarget(
          globe.current?.view(),
          worldAltitude(
            scene.current?.clientWidth || innerWidth,
            scene.current?.clientHeight || innerHeight,
            mobile.enabled,
          ),
          nextDefaultView,
          studyHighlight,
        ));
  const states = useMemo<Record<string, VisualState>>(
    () =>
      world?.states ??
      (studying
        ? {
            ...neutral,
            ...studyStates(session!),
            ...(session!.phase === "summary" && studyReview
              ? {
                  [studyReview.prompt.targetId]: "answer",
                  ...(studyReview.selectedId &&
                  studyReview.selectedId !== studyReview.prompt.targetId
                    ? { [studyReview.selectedId]: "incorrect" }
                    : {}),
                }
              : {}),
          }
        : mode === "explore" && selected
          ? {
              ...neutral,
              ...Object.fromEntries(
                exploreRegions.map((r) => [
                  r.id,
                  r.id === selectedRegion?.id ||
                  (!selectedRegion &&
                    (regional?.regionalRoot(r.id) ?? r.id) === selected)
                    ? "selected"
                    : "disabled",
                ]),
              ),
              // Once a subdivision is active, the country is coverage only.
              // Its backing surface and exterior outline must stay neutral.
              [selected]: selectedRegion ? "disabled" : "selected",
            }
          : mode === "study"
            ? studyPreview
              ? {
                  ...neutral,
                  ...Object.fromEntries(
                    studyPool(studyPreview).map((id) => [
                      id,
                      studyPreview.scope === "custom"
                        ? "selected"
                        : "selectable",
                    ]),
                  ),
                }
              : neutral
            : {}),
    [
      world,
      studying,
      session,
      studyReview,
      studyPreview,
      neutral,
      mode,
      selected,
      selectedRegion,
      exploreRegions,
      regional,
    ],
  );
  const places: PlaceFeature[] = useMemo(
    () =>
      world?.places ??
      (studyDisplay
        ? [
            ...(studyDisplay.capitalMarkers ||
            studyDisplay.capitalNames ||
            studyCapitalReveal
              ? DISPLAY_CAPITALS.filter(
                  (c) =>
                    c.id === studyCapitalReveal?.id ||
                    ((studyDisplay.capitalMarkers ||
                      studyDisplay.capitalNames) &&
                      studyDisplayIds.has(c.countryId)),
                ).map((c) => ({
                  ...c,
                  name:
                    c.id === studyCapitalReveal?.id
                      ? studyCapitalReveal.name
                      : c.name,
                  markerHidden:
                    !studyDisplay.capitalMarkers &&
                    c.id !== studyCapitalReveal?.id,
                  labelHidden:
                    !studyDisplay.capitalNames &&
                    c.id !== studyCapitalReveal?.id,
                  priority: c.id === studyCapitalReveal?.id ? 1000 : undefined,
                }))
              : []),
            ...(studyDisplay.countryNames
              ? namedRegions
                  .filter((r) => studyDisplayIds.has(r.id))
                  .map(
                    (r): PlaceFeature => ({
                      id: `study-country:${r.id}`,
                      name: r.name,
                      kind: "landform",
                      parentId: r.id,
                      lat: r.focus.lat,
                      lng: r.focus.lng,
                      sourceId: "study:names",
                      markerHidden: true,
                    }),
                  )
              : []),
          ]
        : displayLayers
          ? [
              ...(displayLayers.capitals ? DISPLAY_CAPITALS : []),
              ...(displayLayers.cities ? MAJOR_CITIES : []),
            ]
          : []),
    [
      world?.places,
      studyDisplay,
      studyDisplayIds,
      studyCapitalReveal,
      namedRegions,
      displayLayers,
      explore.capitals,
      explore.cities,
      studying,
      session?.pool,
      session?.settings.capitalMarkers,
      session?.settings.capitalNames,
    ],
  );
  const borders =
    world?.showBorders ??
    (studyDisplay
      ? studyDisplay.borders
      : displayLayers
        ? displayLayers.borders
        : mode === "study"
          ? studying
            ? session!.settings.borders
            : study.settings.borders
          : true);
  const names =
    world?.regionNames ??
    (studyDisplay
      ? studyDisplay.countryNames
        ? "committed"
        : "none"
      : displayLayers?.names
        ? "all"
        : "none");
  const frame = useCallback(
    (focus: Focus) => {
      const box = scene.current?.getBoundingClientRect();
      globe.current?.focus(
        (focus.altitude ?? 0) >= 1.65
          ? {
              ...focus,
              altitude: Math.max(
                focus.altitude ?? 0,
                worldAltitude(
                  box?.width || innerWidth,
                  box?.height || innerHeight,
                  mobile.enabled,
                ),
              ),
            }
          : focus,
      );
    },
    [mobile.enabled],
  );
  const stop = useCallback(() => setMotion(false), []),
    fail = useCallback(() => {
      setWebgl(false);
      reportFailure("globe loading");
    }, []),
    onReady = useCallback(() => setReady(true), []);
  const selectExplore = useCallback(
    (id?: string) => {
      stop();
      setExploreSearch("");
      const regional = exploreRegions.find(
        (r) => r.id === id && r.level !== "ADM0",
      );
      if (regional) {
        setSelectedRegion(regional);
        frame(regional.focus);
        return;
      }
      setSelectedRegion(undefined);
      setSelected(id);
      if (id !== selected) {
        setBreakdown(undefined);
        setBranches([]);
      }
      const region = namedRegions.find((r) => r.id === id);
      if (region) frame(region.focus);
    },
    [stop, namedRegions, exploreRegions, selected, frame],
  );
  useEffect(() => {
    globe.current?.cancelFidget();
  }, [mode]);
  useEffect(() => {
    if (mode === "study") return;
    setStudySetup(true);
    setStudyBuilder(false);
    setStudyBrowsingHistory(false);
    setStudyReview(undefined);
  }, [mode]);
  function navigate(url: string) {
    if (url === path) return;
    if (url !== "/" && url !== "/explore") stop();
    setExploreSearch("");
    globe.current?.cancelFocus();
    history.pushState(null, "", url);
    setPath(url);
  }
  useEffect(() => {
    const change = () => setPath(location.pathname);
    addEventListener("popstate", change);
    return () => removeEventListener("popstate", change);
  }, []);
  useEffect(() => {
    const change = (event: StorageEvent) => {
      if (event.key !== DEFAULT_VIEW_KEY && event.key !== null) return;
      const saved = readDefaultPreferences();
      defaultView.current = saved?.focus;
      setDefaultLayers(saved?.layers);
      if (saved?.layers) setExplore(saved.layers);
      for (const key of ["/", "/admin", "/study:setup", "/playground:editor"])
        views.current.delete(key);
      if (unrestricted)
        globe.current?.focus(saved?.focus ?? initialFocus, false);
    };
    addEventListener("storage", change);
    return () => removeEventListener("storage", change);
  }, [unrestricted, initialFocus]);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      setToday(localDateKey());
      clearTimeout(timer);
      timer = setTimeout(update, millisecondsToMidnight() + 25);
    };
    update();
    addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearTimeout(timer);
      removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  useEffect(() => {
    if (!published.ready || dailyLoaded) return;
    const store = createDailySave(allJourneys, subject);
    dailyStore.current = store;
    setDaily(store.load());
    setDailySaveOk(store.writable);
    if (store.recovered) setSaveRecovered(true);
    setDailyLoaded(true);
  }, [published.ready, dailyLoaded, allJourneys, subject]);
  useEffect(() => {
    if (!dailyLoaded || !dailyStore.current) return;
    const saved = dailyStore.current.save(daily);
    setDailySaveOk(saved.ok);
    if (JSON.stringify(saved.value) !== JSON.stringify(daily))
      setDaily(saved.value);
  }, [daily, dailyLoaded]);
  useEffect(() => {
    const saved = studyStore.save(study);
    setStudySaveOk(saved.ok);
    if (JSON.stringify(saved.value) !== JSON.stringify(study))
      setStudy(saved.value);
  }, [study, studyStore]);
  useEffect(() => {
    const change = (event: Event) => {
      const key =
        event instanceof StorageEvent
          ? event.key
          : (event as CustomEvent<string>).detail;
      if (dailyStore.current?.matches(key)) {
        try {
          const merge = dailyStore.current.incoming();
          setDaily((current) => {
            const value = merge(current);
            return JSON.stringify(current) === JSON.stringify(value)
              ? current
              : value;
          });
        } catch {
          setDailySaveOk(false);
        }
      }
      if (studyStore.matches(key)) {
        try {
          const merge = studyStore.incoming();
          setStudy((current) => {
            const value = merge(current);
            return JSON.stringify(current) === JSON.stringify(value)
              ? current
              : value;
          });
        } catch {
          setStudySaveOk(false);
        }
      }
    };
    addEventListener("storage", change);
    addEventListener("ambit-progress-received", change);
    return () => {
      removeEventListener("storage", change);
      removeEventListener("ambit-progress-received", change);
    };
  }, [studyStore]);
  useEffect(() => {
    if (mode === "daily" && dailyReady && !activeAttempt)
      setDaily((p) => openDaily(p, today, false, allJourneys));
    document.title = `ambit — ${mode === "playground" ? "Question Playground" : mode === "home" ? "A world of wonders" : mode === "daily" || mode === "practice" ? "Journey" : mode[0].toUpperCase() + mode.slice(1)}`;
  }, [mode, activeAttempt, today, dailyReady, allJourneys]);
  useEffect(() => {
    const controller = new AbortController();
    let loader: LayerLoader | undefined;
    setError("");
    void (async () => {
      try {
        const worldUrl = "/geography/world.v1.json";
        const [response, worldResponse] = await Promise.all([
          fetch("/geography/manifest.json", { signal: controller.signal }),
          fetch(worldUrl, { signal: controller.signal }),
        ]);
        if (!response.ok) throw Error("The world could not be loaded.");
        loader = new LayerLoader(
          (await response.json()) as BoundaryLayerManifest[],
          undefined,
          (input, init) =>
            input === worldUrl
              ? Promise.resolve(worldResponse)
              : fetch(input, init),
        );
        const world = await loader.loadBoundaryLayer("WORLD/ADM0");
        if (!controller.signal.aborted) {
          setRegions(world);
          setBoundaryLoader(loader);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            "The world couldn’t load. Check your connection and try again.",
          );
      }
    })();
    return () => {
      controller.abort();
      loader?.cancel();
    };
  }, [retry]);
  // Save or restore camera positions only on mode/question transitions, never input updates.
  useEffect(() => {
    if (!ready) return;
    const old = previous.current;
    if (
      isJourney &&
      mode !== "playground" &&
      (game.phase === "finished" || game.phase === "failed")
    ) {
      if (old && old !== cameraKey) {
        const view = globe.current?.view();
        if (view) views.current.set(old, view);
      }
      previous.current = cameraKey;
      return;
    }
    if (old !== cameraKey) {
      if (old === undefined && mode === "home") {
        setMotion(true);
        previous.current = cameraKey;
        return;
      }
      const view = globe.current?.view();
      if (old && view) views.current.set(old, view);
      globe.current?.cancelFocus();
      setHover(undefined);
      if (mode !== "home" && mode !== "explore") setMotion(false);
      if (!(old === "/" && mode === "explore")) {
        const saved = views.current.get(cameraKey);
        const questionDestination =
          world?.focus ?? (studying ? studyDestination(true) : undefined);
        const destination =
          questionDestination ??
          (studying
            ? saved
            : mode === "home" && defaultView.current
              ? defaultView.current
              : (saved ?? defaultView.current ?? initialFocus));
        if (destination) {
          if (questionDestination) frame(destination);
          else
            globe.current?.focus(
              mobile.enabled &&
                normalWorldView(
                  destination,
                  worldAltitude(innerWidth, innerHeight),
                )
                ? {
                    ...destination,
                    altitude: worldAltitude(
                      scene.current?.clientWidth || innerWidth,
                      scene.current?.clientHeight || innerHeight,
                      mobile.enabled,
                    ),
                  }
                : destination,
              false,
            );
        }
      }
      // Request rotation now; the globe waits until its focus travel finishes.
      if (mode === "home") setMotion(true);
      previous.current = cameraKey;
      return;
    }
    if (isJourney && world) {
      setMotion(false);
      setHover(undefined);
      frame(world.focus);
    } else if (studying && session?.phase === "playing") {
      setMotion(false);
      setHover(undefined);
      const destination = studyDestination();
      if (destination) frame(destination);
    } else if (studying && session?.phase === "summary" && studyArea) {
      frame(studyArea);
    }
    // The current presentation supplies the destination; edits must not reset the orbit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    cameraKey,
    isJourney,
    !!world,
    namedRegions.length,
    game.phase,
    game.roundIndex,
    studying,
    session?.prompt.ordinal,
    session?.prompt.targetId,
    session?.prompt.topic,
    session?.prompt.style,
    session?.phase,
    frame,
  ]);
  useEffect(() => {
    if (
      !ready ||
      !isJourney ||
      !context ||
      (mode === "daily" && !dailyReady) ||
      mode === "playground" ||
      (game.phase !== "finished" && game.phase !== "failed")
    )
      return;
    stop();
    setHover(undefined);
    const stops = journeyStops(journey, context, game.answers);
    if (reduced && stops[0]) frame(stops[0]);
    else globe.current?.flyover(stops);
    return () => globe.current?.cancelFlyover();
  }, [
    ready,
    isJourney,
    journey,
    context,
    mode,
    game.phase,
    game.answers,
    dailyReady,
    reduced,
    frame,
    stop,
  ]);
  // Scope changes frame all eligible land; hint edits preserve the orbit.
  useEffect(() => {
    if (
      !ready ||
      mode !== "study" ||
      studying ||
      (!studyPreview && !studyBrowsingHistory)
    )
      return;
    const altitude = worldAltitude(
      scene.current?.clientWidth || innerWidth,
      scene.current?.clientHeight || innerHeight,
      mobile.enabled,
    );
    const focus = studyPreview
      ? studyScopeFocus(studyPreview, namedRegions, altitude)
      : undefined;
    // Worldwide, an empty custom set and history have no regional focus.
    frame(focus ?? { ...(defaultView.current ?? initialFocus), altitude });
  }, [
    ready,
    mode,
    studying,
    studyBrowsingHistory,
    studyPreview?.scope,
    studyPreview?.continent,
    studyPreview?.countryIds.join(","),
    namedRegions,
    mobile.enabled,
    frame,
  ]);
  // A home-country tap enters Explore first, then frames its new selection.
  useEffect(() => {
    if (!ready || mode !== "explore" || !pendingExploreFocus.current) return;
    const region = namedRegions.find(
      (r) => r.id === pendingExploreFocus.current,
    );
    if (!region) return;
    pendingExploreFocus.current = undefined;
    frame(region.focus);
  }, [ready, mode, namedRegions, frame]);
  const dispatch = useCallback(
    (action: Action) => {
      if (!context) return;
      if (mode === "daily")
        setDaily((p) => {
          const date = p.activeDate,
            attempt = date ? p.attempts[date] : undefined;
          if (!date || !attempt) return p;
          const selectedJourney =
            journey.id === attempt.journeyId ? journey : undefined;
          if (!selectedJourney) return p;
          return {
            ...p,
            attempts: {
              ...p.attempts,
              [date]: {
                ...attempt,
                game: gameReducer(
                  attempt.game,
                  action,
                  selectedJourney,
                  context,
                ),
              },
            },
          };
        });
      else
        setPractice((p) => ({
          ...p,
          [journey.id]: gameReducer(
            p[journey.id] ?? { ...initialGame, phase: "playing" },
            action,
            journey,
            context,
          ),
        }));
    },
    [context, mode, journey, allJourneys],
  );
  const studyAction = useCallback(
    (action: StudyAction) =>
      setStudy((p) =>
        p.session
          ? (() => {
              const updated = {
                ...p,
                session: studyReducer(p.session, action),
              };
              return updated.session.phase === "summary"
                ? archiveStudy(updated)
                : updated;
            })()
          : p,
      ),
    [],
  );
  const start = (settings: StudySettings, targets?: StudyReviewTarget[]) => {
    setStudyReview(undefined);
    setStudy((previous) => ({
      ...leaveStudy(previous),
      settings,
      session: {
        ...startStudy(settings, undefined, targets),
        id: crypto.randomUUID(),
      },
    }));
    setStudySetup(false);
    stop();
  };
  const choose = useCallback(
    (region: RegionFeature) => {
      stop();
      if (mode === "explore") selectExplore(region.id);
      else if (mode === "study" && studyPreview && !studying) {
        if (!studyPool({ ...studyPreview, scope: "all" }).includes(region.id))
          return;
        setStudy((p) => ({
          ...p,
          settings: {
            ...p.settings,
            scope: "custom",
            countryIds:
              p.settings.scope !== "custom"
                ? [region.id]
                : p.settings.countryIds.includes(region.id)
                  ? p.settings.countryIds.filter((id) => id !== region.id)
                  : [...p.settings.countryIds, region.id],
          },
        }));
      } else if (studying && !studyEditing)
        studyAction({ type: "pick", id: region.id });
      else if (isJourney && context && game.phase === "playing") {
        const question = journey.rounds[game.roundIndex];
        const id = loaded?.runtime.regionAnswerId(question, region);
        if (id && canSelect(question, context, id))
          dispatch({ type: "select", id });
      }
    },
    [
      mode,
      namedRegions,
      selectExplore,
      studying,
      studyPreview,
      studyEditing,
      studyAction,
      isJourney,
      context,
      game.phase,
      game.roundIndex,
      journey,
      dispatch,
      loaded,
    ],
  );
  function playDaily(date: string) {
    setDaily((p) => openDaily(p, date, false, allJourneys));
    stop();
    navigate("/daily");
  }
  const todayAttempt = daily.attempts[today];
  const todayJourney =
    allJourneys.find((j) => j.id === todayAttempt?.journeyId) ??
    dailyJourney(today, daily, allJourneys);
  const dailyLabel = !todayAttempt
    ? "Play"
    : unfinished(todayAttempt)
      ? "Resume"
      : "View result";
  const previousAttempts = Object.values(daily.attempts)
    .filter((a) => a.date !== today && unfinished(a))
    .sort((a, b) => b.date.localeCompare(a.date));
  const panels =
    mode === "home" ? (
      <section className="home-story home-menu">
        <h1>
          A world of&nbsp;
          <em>wonders.</em>
        </h1>
        <div className="daily-menu">
          <span className="overline daily-menu-eyebrow">TODAY’S JOURNEY</span>
          <h2>{todayJourney.title}</h2>
          <p className="daily-menu-description">{todayJourney.description}</p>
          <div className="daily-levels" aria-label="Five rounds">
            {[1, 2, 3, 4, 5].map((level) => (
              <span
                key={level}
                className={
                  todayAttempt?.game.answers[level - 1]
                    ? `answered${todayAttempt.game.answers[level - 1].correct ? "" : " journey-incorrect"}`
                    : ""
                }
              >
                {todayAttempt?.game.answers[level - 1]
                  ? todayAttempt.game.answers[level - 1].correct
                    ? "✓"
                    : "×"
                  : String(level).padStart(2, "0")}
              </span>
            ))}
          </div>
          <button
            className="primary-button"
            disabled={!regions.length || !dailyLoaded || !cloudSave.ready}
            onClick={() => playDaily(today)}
          >
            {dailyLabel}
            <span>→</span>
          </button>
        </div>
        {previousAttempts.map((a) => (
          <button
            key={a.date}
            className="previous-attempt"
            onClick={() => playDaily(a.date)}
          >
            Continue {a.date} · {a.game.roundIndex + 1} of 5 <span>→</span>
          </button>
        ))}
        <div className="menu-secondary">
          <button onClick={() => navigate("/explore")}>
            <strong>
              Explore <span>→</span>
            </strong>
            <small>Follow your curiosity.</small>
          </button>
          <button onClick={() => navigate("/study")}>
            <strong>
              Study <span>→</span>
            </strong>
            <small>Practice at your pace.</small>
          </button>
        </div>
        <p className="globe-invitation">Or explore directly on the globe.</p>
      </section>
    ) : mode === "account" ? (
      <AccountPanel
        sync={
          canSave
            ? cloudSave
            : {
                ...cloudSave,
                status: "error",
                message:
                  "Saving on this device failed. New progress has not synced. Free storage space and try again.",
                retry: () => {
                  const savedStudy = studyStore.save(study);
                  setStudySaveOk(savedStudy.ok);
                  if (dailyStore.current)
                    setDailySaveOk(dailyStore.current.save(daily).ok);
                  cloudSave.retry();
                },
              }
        }
      />
    ) : mode === "admin" ? (
      <AdminAccess onAccount={() => navigate("/account")}>
        <AdminPanel
          date={today}
          progress={daily}
          catalog={allJourneys}
          labels={Object.fromEntries(
            published.items.map((p, i) => [
              p.id,
              `Local Journey ${i + 1} · revision ${p.revision}`,
            ]),
          )}
          onSet={(id) =>
            setDaily((p) => setDailyPuzzle(p, today, id, allJourneys))
          }
        />
        <FeedbackReview />
      </AdminAccess>
    ) : mode === "explore" ? (
      <ExplorePanel
        regions={namedRegions}
        selected={selected}
        settings={explore}
        search={exploreSearch}
        onSearch={setExploreSearch}
        onSettings={setExplore}
        onSelect={selectExplore}
        onFocus={(r) => frame(r.focus)}
        selectedRegion={selectedRegion}
        breakdown={breakdown}
        onBreakdown={(id) => {
          setBreakdown(id);
          if (!id || id === selected) setSelectedRegion(undefined);
        }}
        regionalStatus={regionalStatus || physicalError}
        defaultViewStatus={defaultViewStatus}
        onSaveView={() => {
          const view = globe.current?.view();
          if (!view) return;
          if (saveDefaultView(view, explore)) {
            defaultView.current = { ...view };
            setDefaultLayers({ ...explore });
            for (const key of ["/", "/admin", "/study:setup"])
              views.current.delete(key);
            setDefaultViewStatus(
              "Your starting view and visible layers are saved for Home and other screens.",
            );
          } else setDefaultViewStatus("Could not save your default view.");
        }}
        onResetView={() => {
          if (!saveDefaultView()) {
            setDefaultViewStatus("Could not reset your default view.");
            return;
          }
          defaultView.current = undefined;
          setDefaultLayers(undefined);
          for (const key of ["/", "/admin", "/study:setup"])
            views.current.delete(key);
          setDefaultViewStatus("Default view reset.");
        }}
      />
    ) : mode === "study" ? (
      <StudyPanel
        paused={!!feedback}
        onReport={(prompt) =>
          setFeedback({
            kind: "question",
            context: {
              view: "study",
              questionId: `${prompt.topic}:${prompt.targetId}:${prompt.style}`,
              contentVersion: `study-v1:${appRelease}`,
              topic: prompt.topic,
              targetId: prompt.targetId,
              method: prompt.style,
            },
          })
        }
        onPreview={setStudyPreview}
        onHistoryChange={setStudyBrowsingHistory}
        compact={mobile.enabled}
        save={study}
        setup={studySetup}
        active={mode === "study"}
        webgl={webgl}
        onSettings={(settings) => setStudy((p) => ({ ...p, settings }))}
        builder={studyBuilder}
        onHome={() => navigate("/")}
        onViewRecord={(record: StudyRecord) => {
          setStudy((previous) => ({
            ...leaveStudy(previous),
            session: { ...record.session, id: record.id },
          }));
          setStudySetup(false);
          setStudyReview(undefined);
        }}
        onStart={start}
        onLocate={(answer) => {
          setStudyReview(answer);
          stop();
          const target = namedRegions.find(
            (r) => r.id === answer.prompt.targetId,
          );
          if (target) frame({ ...target.focus, altitude: 1.1 });
        }}
        onAction={studyAction}
        onEditingChange={setStudyEditing}
        onResume={() => setStudySetup(false)}
        onSetup={() => {
          setStudy((previous) => leaveStudy(previous));
          setStudyBuilder(true);
          setStudySetup(true);
        }}
      />
    ) : mode === "daily" && !dailyReady ? (
      <section className="info-view" role="status">
        <p>{cloudSave.message}</p>
        {cloudSave.ready && (
          <>
            <button
              className="quiet-button tertiary-action"
              onClick={cloudSave.retry}
            >
              Retry sync
            </button>
            <button className="primary-button" onClick={() => playDaily(today)}>
              Play on this device
            </button>
          </>
        )}
      </section>
    ) : context ? (
      <GameShell
        onReport={(questionId) =>
          setFeedback({
            kind: "question",
            context: {
              view: "journey",
              journeyId: journey.id,
              questionId,
              contentVersion:
                published.items
                  .find((item) => item.id === journey.id)
                  ?.revision.toString() ?? appRelease,
            },
          })
        }
        compact={mobile.enabled}
        journey={journey}
        playground={mode === "playground"}
        context={context}
        game={game}
        dispatch={dispatch}
        hover={hover}
        webgl={webgl}
        frame={frame}
        onHome={() => navigate("/")}
        onStudy={() => navigate("/study")}
        onPlayground={() => navigate("/playground")}
      />
    ) : wantsJourney ? (
      <section className="info-view" role="status">
        <p>{journeyError || "Loading your Journey…"}</p>
        {journeyError && (
          <button onClick={() => setRetry((v) => v + 1)}>Try again ↻</button>
        )}
      </section>
    ) : null;
  const phase = isJourney
    ? game.phase
    : mode === "home"
      ? "home"
      : studying
        ? session!.phase
        : "playing";
  const motionControls = (mode === "home" || mode === "explore") && (
    <GlobeControls
      compact={mobile.enabled}
      motion={motion}
      speed={rotationSpeed}
      reduced={reduced}
      ready={ready && webgl}
      onToggle={() => {
        globe.current?.cancelFidget();
        setMotion((value) => !value);
      }}
      onSpeed={setRotationSpeed}
      onFidget={() => {
        globe.current?.fidget();
      }}
    />
  );
  return (
    <main
      className={`experience mode-${mode} phase-${phase} ${mode === "playground" ? "is-playground" : ""} ${expanded ? "globe-expanded" : ""}`}
      style={mobile.enabled ? mobile.style : undefined}
      inert={!!feedback}
      data-keyboard-open={mobile.keyboard || undefined}
    >
      <div className="experience-glow" aria-hidden="true" />
      <div
        className="game-scene"
        id="mobile-map"
        ref={scene}
        onPointerDownCapture={() => setGlobeInteracted(true)}
        onWheelCapture={() => setGlobeInteracted(true)}
        onKeyDownCapture={() => setGlobeInteracted(true)}
      >
        {webgl && (
          <BoardBoundary onError={fail}>
            <Suspense
              fallback={
                <div className="world-loading">Unfolding your world…</div>
              }
            >
              <GlobeView
                ref={globe}
                initialFocus={defaultView.current ?? initialFocus}
                theme="play"
                palette={theme}
                layout="game"
                compact={mobile.enabled}
                expanded={expanded}
                regions={
                  world?.regions ??
                  (mode === "explore" ? exploreRegions : namedRegions)
                }
                warmRegions={warmRegions}
                physicalFeatures={physicalFeatures}
                states={states}
                places={places}
                placeContextual={!!displayLayers || !!studyDisplay}
                placeDensity={studyDisplay ? "study" : undefined}
                selectDisabled={
                  world?.selectDisabled || mode === "explore" || !!studyPreview
                }
                placeMarkers={
                  studyDisplay
                    ? studyDisplay.capitalMarkers || !!studyCapitalReveal
                    : true
                }
                placeLabels={
                  studyDisplay
                    ? studyDisplay.capitalNames ||
                      studyDisplay.countryNames ||
                      !!studyCapitalReveal
                    : true
                }
                routes={world?.routes ?? emptyRoutes}
                overlays={world?.overlays}
                showBorders={borders}
                borderRegionIds={
                  world?.borderRegionIds ??
                  (studyDisplay
                    ? studyDisplay.borders
                      ? studyDisplayRegionIds
                      : []
                    : undefined)
                }
                showRegionalBorders={mode === "explore" && !!breakdown}
                surfaceRoutes
                regionNames={names}
                regionInteraction={
                  !studyBrowsingHistory &&
                  !studyEditing &&
                  (world?.regionInteraction ?? true)
                }
                namedRegionIds={
                  world?.namedRegionIds ??
                  (studyDisplay ? studyDisplayRegionIds : undefined)
                }
                hovered={hover?.id}
                onHover={setHover}
                onSelect={choose}
                interactionLabel={
                  isJourney && journey.rounds[game.roundIndex].mode === "pin"
                    ? "Interactive Earth. Tap land or water to place a pin; drag to rotate, scroll or pinch to zoom. Coordinate entry is available in the answer panel."
                    : isJourney &&
                        journey.rounds[game.roundIndex].mode.startsWith("city-")
                      ? "Interactive Earth. Select a city marker to answer; drag to rotate, scroll or pinch to zoom."
                      : undefined
                }
                placeInteraction={
                  isJourney &&
                  journey.rounds[game.roundIndex].mode.startsWith("city-")
                }
                onCoordinateTap={
                  isJourney &&
                  game.phase === "playing" &&
                  journey.rounds[game.roundIndex].mode === "pin"
                    ? (point) => {
                        stop();
                        dispatch({
                          type: "drop-pin",
                          lat: point.lat,
                          lng: point.lng,
                        });
                      }
                    : undefined
                }
                onPlace={(place) => {
                  if (
                    isJourney &&
                    journey.rounds[game.roundIndex].mode.startsWith("city-")
                  ) {
                    stop();
                    dispatch({ type: "select", id: place.id });
                    return;
                  }
                  if (
                    isJourney &&
                    journey.rounds[game.roundIndex].mode === "pin"
                  )
                    return;
                  const region = namedRegions.find(
                    (r) => r.id === place.parentId,
                  );
                  if (region) choose(region);
                }}
                rotationSpeed={rotationSpeed}
                motion={motion}
                reduced={reduced}
                markers={
                  (studying && session!.prompt.style === "map") ||
                  (isJourney &&
                    journey.rounds[game.roundIndex].mode.startsWith("map-"))
                }
                onReady={onReady}
                onInteraction={stop}
                onFailure={fail}
                onTextureFallback={noAction}
                onSurfaceTap={
                  mode === "home"
                    ? (region) => {
                        setSelected(region?.id);
                        pendingExploreFocus.current = region?.id;
                        stop();
                        navigate("/explore");
                      }
                    : undefined
                }
              />
            </Suspense>
          </BoardBoundary>
        )}
      </div>
      <header className="experience-header">
        <button
          className="experience-logo"
          aria-label="ambit home"
          onClick={() => navigate("/")}
        >
          <AmbitLogo />
        </button>
        <AppMenu
          admin={account.admin}
          onJourney={() => playDaily(today)}
          journeyReady={!!regions.length && dailyLoaded && cloudSave.ready}
          onFeedback={() =>
            setFeedback({ kind: "experience", context: { view: mode } })
          }
          path={path}
          theme={theme}
          onTheme={changeTheme}
          caption={
            mode === "daily"
              ? `Journey · ${activeAttempt?.date ?? today}`
              : mode === "practice"
                ? "Practice"
                : undefined
          }
          onNavigate={navigate}
        />
      </header>
      {mobile.enabled && (
        <div className="mobile-map-tools" aria-label="Globe controls">
          <button
            disabled={!ready || !webgl}
            onClick={() => {
              stop();
              const destination =
                world?.focus ??
                (mode === "explore"
                  ? (
                      selectedRegion ??
                      namedRegions.find((r) => r.id === selected)
                    )?.focus
                  : studying
                    ? studyDestination()
                    : undefined);
              frame(
                destination ??
                  nextDefaultView(
                    worldAltitude(
                      scene.current?.clientWidth || innerWidth,
                      scene.current?.clientHeight || innerHeight,
                      mobile.enabled,
                    ),
                  ),
              );
            }}
          >
            ◎ Recenter
          </button>
          {motionControls}
          <button
            aria-expanded={expanded}
            aria-controls="mobile-map"
            disabled={!webgl}
            onClick={() => setGlobeExpanded((v) => !v)}
          >
            {expanded
              ? isJourney || studying
                ? "Show question ↓"
                : "Show details ↓"
              : "Enlarge globe"}
          </button>
        </div>
      )}
      <ModePanels
        mode={path}
        reduced={reduced || mobile.enabled}
        hidden={expanded}
        scrollKey={mobile.enabled ? mobileStep : undefined}
      >
        <PanelBoundary key={path}>
          <Suspense
            fallback={
              <section className="info-view" role="status">
                Loading…
              </section>
            }
          >
            {panels}
          </Suspense>
        </PanelBoundary>
      </ModePanels>
      {!mobile.enabled && motionControls}
      {mobile.enabled && (
        <>
          {!globeInteracted && (
            <p className="mobile-gesture-hint">
              Drag to rotate · pinch to zoom
            </p>
          )}
          {expanded && isJourney && game.phase === "playing" && context && (
            <details className="mobile-map-prompt">
              <summary>
                {journey.rounds[game.roundIndex].title}
                {journey.rounds[game.roundIndex].mode === "pin"
                  ? game.pin
                    ? " · Pin placed"
                    : " · Tap to place a pin"
                  : responseCount(journey.rounds[game.roundIndex], context) > 1
                    ? ` · ${game.selectedIds.length} of ${responseCount(journey.rounds[game.roundIndex], context)} chosen`
                    : ""}
              </summary>
              <p>{questionPrompt(journey.rounds[game.roundIndex], context)}</p>
            </details>
          )}
          {expanded && studying && session!.phase === "playing" && (
            <p className="mobile-map-prompt">{studyPrompt(session!.prompt)}</p>
          )}
        </>
      )}
      {!isJourney && (
        <footer className="experience-footer">
          <span className="footer-note">
            ONE WORLD. A DIFFERENT WAY TO SEE IT.
          </span>
        </footer>
      )}
      {(!regions.length || error || contextResult.error || !webgl) && (
        <div className="experience-status" role="status">
          <p>
            {error ||
              contextResult.error ||
              (!webgl
                ? "The globe is unavailable. You can still use the written answer controls."
                : "Gathering the world…")}
          </p>
          {error && (
            <button onClick={() => setRetry((v) => v + 1)}>Try again ↻</button>
          )}
        </div>
      )}
      {saveRecovered && canSave && (
        <div className="save-notice" role="status">
          Usable saved results were recovered. The original save was kept as a
          backup.
        </div>
      )}
      {!canSave && (
        <div className="save-notice" role="status">
          Some progress, preferences, or Study results won’t be saved after this
          visit.
        </div>
      )}
      {feedback && (
        <FeedbackDialog request={feedback} onClose={closeFeedback} />
      )}
    </main>
  );
}
