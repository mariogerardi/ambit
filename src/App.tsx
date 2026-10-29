import { useGlobeRecovery } from "./app/useGlobeRecovery";
import { useJourneyContent } from "./app/useJourneyContent";
import { useWorldGeography } from "./app/useWorldGeography";
import { useCameraOrchestration } from "./app/useCameraOrchestration";
import { usePlayerProgress } from "./app/usePlayerProgress";
import { HomePanel } from "./app/HomePanel";
import {
  MinigamesPanel,
  MinigameTourCaption,
  selectedMinigame,
} from "./app/MinigamesPanel";
import { useMinigameTour } from "./minigames/useMinigameTour";
import { useSharedNeighbors } from "./minigames/useSharedNeighbors";
import { BorderMinigamePanel } from "./minigames/BorderMinigamePanel";
import { startPlaceStudy } from "./study/engine";
import type { StudyPlaceTarget } from "./study/placeReview";
import { isStudyPinPrompt, studyPinTarget } from "./study/pins";
import { useBorderMinigame } from "./minigames/useBorderMinigame";
import { JourneyArchive } from "./app/JourneyArchive";
import {
  archiveDay,
  archiveDateFromPath,
  archiveDateLabel,
  archivePath,
  isArchiveDate,
} from "./app/archiveDates";
import { LoadingScreen } from "./app/LoadingScreen";
import { JourneySocial } from "./app/JourneySocial";
import {
  accountIntent,
  accountTabLink,
  adminDate,
} from "./app/accountNavigation";
import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { BoardBoundary, PanelBoundary } from "./app/ErrorBoundaries";
import { clearGlobeChunkReload } from "./app/globeChunkRecovery";
import type {
  RegionFeature,
  Focus,
  VisualState,
  PlaceFeature,
} from "./geography/types";
import type { GlobeHandle } from "./globe/GlobeView";
import {
  DEFAULT_LAYERS,
  HOME_LAYERS,
  GLOBE_LAYERS_KEY,
  readGlobeLayers,
  saveGlobeLayers,
} from "./app/worldPreferences";
import { useAccount } from "./services/accounts";
import { usePlayerProfile } from "./services/playerProfile";
import { AccountMenu } from "./app/AccountMenu";
import { appRelease } from "./services/config";
import { trackAction, trackView, reportFailure } from "./services/monitoring";
import type { FeedbackRequest } from "./services/feedback";
import { AccountPanel, AdminAccess } from "./app/AccountPanel";
import { ToastProvider, useToast } from "./app/Toast";
import { FeedbackDialog } from "./app/FeedbackDialog";
import { FeedbackReview } from "./app/FeedbackReview";
import { AppearancePanel } from "./app/AppearancePanel";
import { WorldCreditsDialog } from "./app/WorldCreditsDialog";
import { AppMenu } from "./app/AppMenu";
import { GlobeControls } from "./app/GlobeControls";
import { AmbitLogo } from "./app/AmbitLogo";
import { applyTheme, readTheme, saveTheme, THEME_KEY } from "./theme/themes";
import type { ThemeId } from "./theme/themes";
import { ThemeContext } from "./theme/ThemedImage";
const GameShell = lazy(() =>
  import("./game/GameShell").then((m) => ({ default: m.GameShell })),
);
const AdminJourneyReview = lazy(() =>
  import("./app/AdminJourneyReview").then((module) => ({
    default: module.AdminJourneyReview,
  })),
);
import { JOURNEY_INDEX } from "./game/journeyRegistry";
import { canSelect, responseCount } from "./game/questionPreparation";
import { questionPrompt } from "./game/questionText";
import { gameReducer, initialGame } from "./game/state";
import type { Action, GameState } from "./game/state";
import {
  DISPLAY_CAPITALS,
  MAJOR_CITIES,
  EXPLORE_CAPITALS,
  EXPLORE_MAJOR_CITIES,
  EXPLORE_CITY_BY_ID,
} from "./geography/places";
import type { ExploreCity } from "./geography/places";
import { modeForPath } from "./app/modes";
import { ModePanels } from "./app/ModePanels";
import { useMobileLayout } from "./app/useMobileLayout";
const AdminPanel = lazy(() =>
  import("./app/AdminPanel").then((m) => ({ default: m.AdminPanel })),
);
import { ExplorePanel } from "./app/ExplorePanel";
import type { ExploreSettings } from "./app/ExplorePanel";
import {
  dailyJourney,
  SCHEDULE_VERSION,
  localDateKey,
  millisecondsToMidnight,
  openDaily,
  withDailyGame,
} from "./app/dailyProgress";
import { useJourneySchedule } from "./services/journeySchedule";
import { usePublishedPuzzles } from "./app/publishedPuzzles";
import {
  COUNTRIES,
  archiveStudy,
  leaveStudy,
  startStudy,
  studyReducer,
  studyPool,
  studyPrompt,
} from "./study/engine";
import type {
  StudyAction,
  StudySettings,
  StudyReviewTarget,
  StudyAnswer,
  StudyRecord,
} from "./study/engine";
import { useStudyPresentation } from "./study/useStudyPresentation";
import { StudyPanel } from "./study/StudyPanel";
import { studyIntent, studyLink } from "./study/StudyNavigation";
import { startLearningReview } from "./study/engine";
import type { LearningTarget } from "./study/learning";
import { StudyReplacementDialog } from "./study/StudyReplacementDialog";
const GlobeView = lazy(() =>
  import("./globe/GlobeView").then((m) => ({ default: m.GlobeView })),
);
const emptyRoutes: [] = [];
const emptyRegions: RegionFeature[] = [];
const noAction = () => {};
export function PlayerWorkspace() {
  const account = useAccount();
  return (
    <ToastProvider>
      {account.loading ? (
        <LoadingScreen />
      ) : (
        <App key={account.user?.profile.sub ?? "guest"} />
      )}
    </ToastProvider>
  );
}
export function App() {
  const account = useAccount();
  const { notify } = useToast();
  const subject = account.user?.profile.sub;
  const schedule = useJourneySchedule();
  const playerProfile = usePlayerProfile(subject, account.accessToken);
  const [feedback, setFeedback] = useState<FeedbackRequest>();
  const closeFeedback = useCallback(() => setFeedback(undefined), []);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const closeCredits = useCallback(() => setCreditsOpen(false), []);
  const mobile = useMobileLayout();
  const [globeExpanded, setGlobeExpanded] = useState(false);
  const [exploreContentHeight, setExploreContentHeight] = useState(220);
  const expanded = mobile.enabled && globeExpanded && !mobile.keyboard;
  const published = usePublishedPuzzles();
  const allJourneys = useMemo(
    () => [...JOURNEY_INDEX, ...published.items.map((p) => p.journey)],
    [published.items],
  );
  const {
    daily,
    setDaily,
    study,
    setStudy,
    dailyLoaded,
    canSave,
    saveRecovered,
    cloudSave,
    retrySaving,
    resetAttempt,
  } = usePlayerProgress({
    subject,
    accessToken: account.accessToken,
    catalog: allJourneys,
    catalogReady: published.ready,
  });
  const dailyReady =
    dailyLoaded &&
    schedule.ready &&
    (cloudSave.hydrated || Object.keys(daily.attempts).length > 0);
  const [path, setPath] = useState(location.pathname + location.search);
  const pathname = path.split(/[?#]/)[0];
  const accountNavigation = useMemo(() => accountIntent(path), [path]);
  useEffect(() => {
    if (pathname !== "/admin") return;
    const canonical =
      accountTabLink(
        "admin",
        accountNavigation.section,
        accountNavigation.date,
      ) +
      (accountNavigation.journeyId
        ? `&journey=${encodeURIComponent(accountNavigation.journeyId)}`
        : "");
    history.replaceState(null, "", canonical);
    setPath(canonical);
  }, [pathname, accountNavigation]);
  const requestedMode = modeForPath(path);
  const restricted = requestedMode === "practice" && !account.admin;
  const mode = restricted ? "home" : requestedMode;
  const reviewing =
    mode === "practice" &&
    new URLSearchParams(path.split("?")[1] ?? "").get("review") === "1";
  useEffect(() => {
    if (restricted && !account.loading) {
      history.replaceState(null, "", "/");
      setPath("/");
    }
  }, [restricted, account.loading]);
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
    if (saveTheme(value)) notify("Appearance saved on this device.");
    else
      notify("Appearance changed, but couldn’t be saved on this device.", {
        tone: "error",
      });
  };
  const [defaultLayers, setDefaultLayers] = useState(readGlobeLayers);
  const [breakdown, setBreakdown] = useState<string>();
  const [selectedRegion, setSelectedRegion] = useState<RegionFeature>();
  const [selectedCity, setSelectedCity] = useState<ExploreCity>();
  const [retry, setRetry] = useState(0);
  const [today, setToday] = useState(localDateKey);
  const studyRoute = studyIntent(path);
  const studySetup = !["session", "results"].includes(studyRoute.view);
  const studyBrowsingHistory =
    mode === "study" &&
    (studyRoute.view === "history" || studyRoute.view === "review");
  const studyRecord =
    studyRoute.view === "results"
      ? study.history?.find((record) => record.id === studyRoute.record)
      : undefined;
  const [studyReplacement, setStudyReplacement] = useState<() => void>();
  const requestStudyStart = (run: () => void) => {
    if (study.session && study.session.phase !== "summary")
      setStudyReplacement(() => run);
    else run();
  };
  const [practice, setPractice] = useState<Record<string, GameState>>({});
  const [demoCustomizing, setDemoCustomizing] = useState(false);
  const [reviews, setReviews] = useState<Record<string, GameState>>({});
  const [hover, setHover] = useState<RegionFeature>(),
    [selected, setSelected] = useState<string>();
  const [exploreSearch, setExploreSearch] = useState("");
  const [explore, setExplore] = useState<ExploreSettings>(
    defaultLayers ?? DEFAULT_LAYERS,
  );
  const sharedPlaying =
    mode === "minigames" && pathname === "/minigames/shared-neighbors/play";
  const missingPlaying =
    mode === "minigames" && pathname === "/minigames/missing-borders/play";
  const borderRunPlaying =
    mode === "minigames" && pathname === "/minigames/border-run/play";
  const pinpointPlaying =
    mode === "minigames" && pathname === "/minigames/pinpoint/play";
  const minigamePlaying =
    sharedPlaying || missingPlaying || borderRunPlaying || pinpointPlaying;
  const minigameLanding = mode === "minigames" && !minigamePlaying;
  const demoKind = selectedMinigame(pathname);
  const unrestricted =
    mode === "home" ||
    mode === "account" ||
    (mode === "study" && (studySetup || !study.session));
  const displayLayers =
    mode === "explore" || mode === "archive"
      ? explore
      : unrestricted
        ? defaultLayers
        : undefined;
  const {
    regions,
    error,
    regional,
    branches,
    clearBranches,
    regionalStatus,
    physicalFeatures,
    physicalError,
  } = useWorldGeography({ mode, retry, breakdown, layers: displayLayers });
  const globe = useRef<GlobeHandle>(null);
  const recovery = useGlobeRecovery(globe);
  const { ready, enabled: webgl, fail } = recovery;
  const [globePresented, setGlobePresented] = useState(false);
  useEffect(() => {
    if (!ready) {
      setGlobePresented(false);
      return;
    }
    if (!regions.length || globePresented) return;
    // Allow the populated scene to paint before revealing it. Keep the canvas
    // mounted and measurable throughout; mode changes never repeat the entrance.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setGlobePresented(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [ready, regions.length, globePresented]);
  const [rotationSpeed, setRotationSpeed] = useState(1);
  const [globeInteracted, setGlobeInteracted] = useState(false);
  const scene = useRef<HTMLDivElement>(null);
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
  const neutral = useMemo<Record<string, VisualState>>(
    () => Object.fromEntries(namedRegions.map((r) => [r.id, "disabled"])),
    [namedRegions],
  );
  const archiveDate = archiveDateFromPath(path);
  const playDate = archiveDate ?? today;
  const archiveEntry = archiveDate
    ? archiveDay(
        archiveDate,
        today,
        daily,
        allJourneys,
        schedule.schedule?.records ?? {},
      )
    : undefined;
  const activeAttempt = daily.attempts[playDate];
  const activeJourneyId = archiveDate
    ? archiveEntry?.journey?.id
    : (activeAttempt?.journeyId ??
      dailyJourney(
        today,
        daily,
        allJourneys,
        schedule.schedule?.assignments ?? {},
      ).id);
  const canOpenDate = !archiveDate || !!archiveEntry?.journey;
  useEffect(() => {
    if (archiveDate && isArchiveDate(archiveDate, today))
      void schedule.refresh(archiveDate.slice(0, 7));
  }, [archiveDate, today, schedule.refresh]);
  const cameraKey =
    mode === "daily"
      ? `${path}:${playDate}:${activeJourneyId ?? "unavailable"}`
      : mode === "study"
        ? `${path}:${studyBrowsingHistory ? "history" : studySetup || !study.session ? "setup" : `session:${study.session.id ?? study.session.seed}`}`
        : path;
  const journeyId =
    mode === "daily"
      ? activeJourneyId
      : JOURNEY_INDEX.find((j) => j.path === pathname)?.id;
  const {
    journey,
    loaded,
    isJourney,
    wantsJourney,
    context,
    contextError,
    journeyError,
    warmRegions,
  } = useJourneyContent({
    mode,
    journeyId,
    warmJourneyId:
      activeAttempt?.journeyId ??
      dailyJourney(
        today,
        daily,
        allJourneys,
        schedule.schedule?.assignments ?? {},
      ).id,
    ready,
    regions,
    published: published.items,
    retry,
  });
  const game =
    mode === "daily"
      ? (activeAttempt?.game ?? { ...initialGame, phase: "playing" as const })
      : ((reviewing ? reviews : practice)[journey.id] ?? {
          ...initialGame,
          phase: "playing" as const,
          ordered: [...(journey.rounds[0]?.orderInitial ?? [])],
        });
  const [constructionReviewIndex, setConstructionReviewIndex] = useState<
    number | undefined
  >(undefined);
  useEffect(() => {
    const id =
      game.phase === "finished"
        ? journey.completion?.initialConstructionRoundId
        : undefined;
    const index = journey.rounds.findIndex((q) => q.id === id);
    setConstructionReviewIndex(index >= 0 ? index : undefined);
  }, [journey.id, game.phase, journey.completion?.initialConstructionRoundId]);
  const sharedNeighbors = useSharedNeighbors(
    sharedPlaying || (minigameLanding && demoKind === "shared-neighbors")
      ? namedRegions
      : emptyRegions,
    subject,
  );
  const missingBorders = useBorderMinigame(
    missingPlaying || (minigameLanding && demoKind === "missing-borders")
      ? namedRegions
      : emptyRegions,
    subject,
    "missing-borders",
  );
  const borderRun = useBorderMinigame(
    borderRunPlaying || (minigameLanding && demoKind === "border-run")
      ? namedRegions
      : emptyRegions,
    subject,
    "border-run",
    undefined,
    borderRunPlaying,
  );
  const pinpoint = useBorderMinigame(
    pinpointPlaying || (minigameLanding && demoKind === "pinpoint")
      ? namedRegions
      : emptyRegions,
    subject,
    "pinpoint",
    () => globe.current?.view(),
  );
  const activeMinigame = missingPlaying
    ? missingBorders
    : borderRunPlaying
      ? borderRun
      : pinpointPlaying
        ? pinpoint
        : sharedNeighbors;
  useEffect(() => {
    if (minigamePlaying && webgl && activeMinigame.count && !activeMinigame.run)
      activeMinigame.start();
  }, [minigamePlaying, webgl, activeMinigame.count, !!activeMinigame.run]);
  const playWorld = useMemo(
    () =>
      minigamePlaying
        ? activeMinigame.world
        : isJourney && context && loaded
          ? loaded.runtime.journeyWorld(
              namedRegions,
              journey,
              game,
              context,
              constructionReviewIndex,
            )
          : undefined,
    [
      isJourney,
      context,
      namedRegions,
      journey,
      game,
      loaded,
      constructionReviewIndex,
      minigamePlaying,
      activeMinigame.world,
    ],
  );
  const session =
    studyRoute.view === "results" ? studyRecord?.session : study.session;
  const [studyReview, setStudyReview] = useState<StudyAnswer>();
  const [studyEditing, setStudyEditing] = useState(false);
  const [studyEditorOpen, setStudyEditorOpen] = useState(false);
  const [studyCustomizing, setStudyCustomizing] = useState(false);
  const panelOnly =
    mode === "account" ||
    (mobile.enabled && mode === "study" && studyCustomizing);
  const pageLayout = mode === "account";
  const studyPreviewVisit = useMemo(() => ({}), [path]);
  const [studyPreviewState, setStudyPreviewState] = useState<{
    settings: StudySettings;
    places?: StudyPlaceTarget[];
    targets?: LearningTarget[];
    visit: object;
  }>();
  const previewStudy = useCallback(
    (
      settings?: StudySettings,
      places?: StudyPlaceTarget[],
      targets?: LearningTarget[],
    ) => {
      // Keep the outgoing preview until the next visible panel supplies its
      // complete replacement. Unmount cleanup must not flash an empty globe.
      if (settings)
        setStudyPreviewState({
          settings,
          places,
          targets,
          visit: studyPreviewVisit,
        });
    },
    [studyPreviewVisit],
  );
  // Your Sessions previews only the declared exercise area, never its current answer.
  const historyPreview = useMemo(() => {
    const current = study.session;
    return current &&
      current.phase !== "summary" &&
      !current.placeReview &&
      !current.learningReview
      ? {
          ...current.settings,
          countryNames: true,
          capitalNames: false,
          capitalMarkers: false,
        }
      : undefined;
  }, [study.session]);
  // The route changes before the incoming panel becomes active. Keep the whole
  // outgoing scene (including its camera key) until a matching preview arrives.
  const nextStudyScene = {
    cameraKey,
    session:
      mode === "study" && !studyBrowsingHistory && !studySetup
        ? session
        : undefined,
    preview:
      mode === "study"
        ? studyRoute.view === "history"
          ? historyPreview
          : ["practice", "custom", "review"].includes(studyRoute.view)
            ? studyPreviewState?.settings
            : undefined
        : undefined,
    places:
      studyRoute.view !== "history" ? studyPreviewState?.places : undefined,
    targets:
      studyRoute.view !== "history" ? studyPreviewState?.targets : undefined,
    review: studyReview,
  };
  const lastStudyScene = useRef(nextStudyScene);
  const pendingStudyPreview =
    mode === "study" &&
    ["practice", "custom", "review"].includes(studyRoute.view) &&
    studyPreviewState?.visit !== studyPreviewVisit;
  const studyScene = pendingStudyPreview
    ? lastStudyScene.current
    : nextStudyScene;
  useEffect(() => {
    if (!pendingStudyPreview) lastStudyScene.current = nextStudyScene;
  });
  const studyPreview = studyScene.preview;
  const studying =
    mode === "study" && !studyBrowsingHistory && !studySetup && !!session;
  const studyPresentation = useStudyPresentation({
    active: mode === "study",
    session: studyScene.session,
    preview: studyPreview,
    previewPlaces: studyPreview ? studyScene.places : undefined,
    previewReviewTargets: studyPreview ? studyScene.targets : undefined,
    settings: study.settings,
    review: studyScene.review,
    regions: namedRegions,
    neutral,
  });
  const studyDisplay = studyPresentation.display;
  const clearHover = useCallback(() => setHover(undefined), []);
  const {
    motion,
    reduced,
    initialFocus,
    frame,
    stop,
    focusExplore,
    focusExploreCity,
    pendingExploreFocus,
    exploreEntryFromCountry,
    prepareNavigation,
    toggleMotion,
    fidget,
    locateStudyAnswer,
    recenter,
  } = useCameraOrchestration({
    mode,
    transitionKey: minigamePlaying
      ? `${cameraKey}:${activeMinigame.run?.id}:${activeMinigame.run?.cycle}:${activeMinigame.run?.index}`
      : mode === "study"
        ? studyScene.cameraKey
        : cameraKey,
    ready,
    mobile: mobile.enabled,
    globe,
    scene,
    regions: namedRegions,
    clearHover,
    externalCamera: minigameLanding,
    journey: {
      active: isJourney || (minigamePlaying && !!activeMinigame.world),
      definition:
        minigamePlaying && activeMinigame.journey
          ? activeMinigame.journey
          : journey,
      context: minigamePlaying ? activeMinigame.context : context,
      focus: playWorld?.focus,
      phase: minigamePlaying
        ? (activeMinigame.game?.phase ?? "playing")
        : game.phase,
      roundIndex: minigamePlaying ? 0 : game.roundIndex,
      answers: minigamePlaying
        ? (activeMinigame.game?.answers ?? [])
        : game.answers,
      help: minigamePlaying ? undefined : game.help,
      dailyReady: minigamePlaying || dailyReady,
    },
    study: {
      active: mode === "study" && !!studyScene.session,
      session: studyScene.session,
      preview: studyPreview,
      previewPlaces: studyPreview ? studyScene.places : undefined,
      previewViews: studyPreview ? studyPresentation.previewViews : undefined,
      editorOpen: studyEditorOpen,
      highlight: studyPresentation.highlight,
      capitalFocus: studyPresentation.capitalFocus,
    },
  });
  const demoController =
    demoKind === "missing-borders"
      ? missingBorders
      : demoKind === "border-run"
        ? borderRun
        : demoKind === "pinpoint"
          ? pinpoint
          : sharedNeighbors;
  const tour = useMinigameTour({
    active: minigameLanding && ready && webgl,
    kind: demoKind,
    regions: namedRegions,
    blockedId:
      demoController.hasUnfinished && demoController.game?.phase === "playing"
        ? demoController.journey?.rounds[0].id
        : undefined,
    reduced,
    globe,
  });
  const world = minigameLanding ? tour.world : playWorld;
  const mobileStep = `${path}:${minigamePlaying ? `${activeMinigame.run?.cycle}:${activeMinigame.run?.index}:${activeMinigame.run?.result ?? "playing"}:${activeMinigame.ended}` : isJourney ? `${journey.id}:${game.roundIndex}:${game.phase}` : studying ? `${session!.prompt.ordinal}:${session!.phase}` : mode === "explore" ? `${selected}:${selectedRegion?.id}:${selectedCity?.id}` : "setup"}`;
  useEffect(() => {
    setGlobeExpanded(false);
    // Dismiss the keyboard without undoing the next screen's focus management.
    if (
      mobile.enabled &&
      document.activeElement instanceof HTMLElement &&
      document.activeElement.matches(
        'input, textarea, [contenteditable="true"]',
      )
    )
      document.activeElement.blur();
  }, [mobileStep, mobile.enabled]);
  const states = useMemo<Record<string, VisualState>>(
    () =>
      world?.states ??
      studyPresentation.states ??
      (mode === "explore" && selected
        ? {
            ...neutral,
            ...Object.fromEntries(
              exploreRegions.map((r) => [
                r.id,
                r.id === selectedRegion?.id ||
                (!selectedRegion &&
                  (regional?.regionalRoot(r.id) ?? r.id) === selected)
                  ? selectedCity
                    ? "hinted"
                    : "selected"
                  : "disabled",
              ]),
            ),
            // Once a subdivision is active, the country is coverage only.
            // Its backing surface and exterior outline must stay neutral.
            [selected]: selectedRegion
              ? "disabled"
              : selectedCity
                ? "hinted"
                : "selected",
          }
        : {}),
    [
      world,
      studyPresentation.states,
      neutral,
      mode,
      selected,
      selectedRegion,
      selectedCity,
      exploreRegions,
      regional,
    ],
  );
  const places: PlaceFeature[] = useMemo(() => {
    if (world?.places) return world.places;
    if (studyPresentation.places) return studyPresentation.places;
    const visible = displayLayers
      ? [
          ...(displayLayers.capitals
            ? mode === "explore"
              ? EXPLORE_CAPITALS
              : DISPLAY_CAPITALS
            : []),
          ...(displayLayers.cities
            ? mode === "explore"
              ? EXPLORE_MAJOR_CITIES
              : MAJOR_CITIES
            : []),
        ]
      : [];
    if (mode !== "explore") return visible;
    const result: PlaceFeature[] = visible
      .filter((city) => city.id !== selectedCity?.id)
      .map((city) => ({ ...city, hoverName: city.name }));
    if (selectedCity)
      result.unshift({
        ...selectedCity,
        hoverName: selectedCity.name,
        inspectionSelected: true,
        visualState: "selected",
        priority: 1e9,
        markerSize: 24,
        labelFlexible: true,
      });
    return result;
  }, [
    world?.places,
    studyPresentation.places,
    displayLayers,
    mode,
    selectedCity,
  ]);
  const borders =
    world?.showBorders ??
    studyDisplay?.borders ??
    displayLayers?.borders ??
    studyPresentation.borders ??
    true;
  const names =
    world?.regionNames ??
    studyPresentation.regionNames ??
    (displayLayers?.names ? "all" : "none");
  const contextLost = useCallback(() => {
      recovery.contextLost();
      reportFailure("globe rendering", { failureType: "webglcontextlost" });
    }, [recovery.contextLost]),
    onReady = useCallback(() => {
      clearGlobeChunkReload();
      recovery.onReady();
    }, [recovery.onReady]);
  const selectExplore = useCallback(
    (id?: string) => {
      stop();
      setExploreSearch("");
      const subdivision = exploreRegions.find(
        (r) => r.id === id && r.level !== "ADM0",
      );
      if (subdivision) {
        // Ignore taps from a subdivision layer that is being replaced.
        if (regional?.regionalRoot(subdivision.id) !== selected) return;
        setSelectedCity(undefined);
        setSelectedRegion(subdivision);
        focusExplore(subdivision);
        return;
      }
      if (id && !namedRegions.some((region) => region.id === id)) return;
      setSelectedCity(undefined);
      setSelectedRegion(undefined);
      setSelected(id);
      if (id !== selected) {
        setBreakdown(undefined);
        clearBranches();
      }
      const region = namedRegions.find((r) => r.id === id);
      if (region) focusExplore(region);
    },
    [
      stop,
      namedRegions,
      exploreRegions,
      selected,
      focusExplore,
      regional,
      clearBranches,
    ],
  );
  const selectExploreCity = useCallback(
    (place: PlaceFeature) => {
      const city = EXPLORE_CITY_BY_ID.get(place.id);
      if (!city || !namedRegions.some((region) => region.id === city.parentId))
        return;
      stop();
      clearHover();
      setExploreSearch("");
      setSelectedRegion(undefined);
      setBreakdown(undefined);
      clearBranches();
      setSelected(city.parentId);
      setSelectedCity(city);
      focusExploreCity(city);
    },
    [namedRegions, stop, clearHover, clearBranches, focusExploreCity],
  );
  useEffect(() => {
    if (
      selectedRegion &&
      regional?.regionalRoot(selectedRegion.id) !== selected
    )
      setSelectedRegion(undefined);
    if (breakdown && regional?.regionalRoot(breakdown) !== selected) {
      setBreakdown(undefined);
      clearBranches();
    }
  }, [selected, selectedRegion, breakdown, regional, clearBranches]);
  useEffect(() => {
    // Entry intent is captured during render, before the camera consumes its request.
    if (mode !== "explore" || exploreEntryFromCountry) return;
    setSelected(undefined);
    setSelectedCity(undefined);
    setSelectedRegion(undefined);
    setBreakdown(undefined);
    clearBranches();
  }, [mode, clearBranches]);
  useEffect(() => {
    if (mode === "study") return;
    setStudyReview(undefined);
  }, [mode]);
  function navigate(url: string) {
    if (url === path) return;
    setExploreSearch("");
    prepareNavigation(url);
    history.pushState(null, "", url);
    setPath(url);
  }
  useEffect(() => {
    const change = () => setPath(location.pathname + location.search);
    addEventListener("popstate", change);
    return () => removeEventListener("popstate", change);
  }, []);
  useEffect(() => {
    const change = (event: StorageEvent) => {
      if (event.key !== GLOBE_LAYERS_KEY && event.key !== null) return;
      const layers = readGlobeLayers();
      setDefaultLayers(layers);
      setExplore(layers ?? DEFAULT_LAYERS);
    };
    addEventListener("storage", change);
    return () => removeEventListener("storage", change);
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
    if (
      mode === "daily" &&
      dailyReady &&
      canOpenDate &&
      (!archiveDate || cloudSave.hydrated) &&
      !activeAttempt
    )
      setDaily((p) =>
        openDaily(
          p,
          playDate,
          false,
          allJourneys,
          schedule.schedule?.assignments,
        ),
      );
    document.title = `Ambit — ${mode === "home" ? "a different way to see the world" : mode === "daily" || mode === "practice" ? "Journey" : mode[0].toUpperCase() + mode.slice(1)}`;
  }, [
    mode,
    activeAttempt,
    playDate,
    archiveDate,
    canOpenDate,
    dailyReady,
    cloudSave.hydrated,
    allJourneys,
    schedule.schedule,
  ]);
  const dispatch = useCallback(
    (action: Action) => {
      if (!context) return;
      if (mode === "daily")
        setDaily((p) => {
          const date = playDate,
            attempt = p.attempts[date];
          if (
            !attempt ||
            (archiveDate
              ? !isArchiveDate(date, localDateKey())
              : date !== localDateKey())
          )
            return p;
          const selectedJourney =
            journey.id === attempt.journeyId ? journey : undefined;
          if (!selectedJourney) return p;
          return {
            ...p,
            attempts: {
              ...p.attempts,
              [date]: withDailyGame(
                attempt,
                gameReducer(attempt.game, action, selectedJourney, context),
              ),
            },
          };
        });
      else
        (reviewing ? setReviews : setPractice)((p) => ({
          ...p,
          [journey.id]: gameReducer(
            p[journey.id] ?? { ...initialGame, phase: "playing" },
            action,
            journey,
            context,
          ),
        }));
    },
    [context, mode, reviewing, journey, allJourneys, playDate, archiveDate],
  );
  const studyAction = useCallback(
    (action: StudyAction) => {
      const emptyFinish =
        action.type === "finish" && !study.session?.history.length;
      setStudy((p) =>
        p.session
          ? (() => {
              const updated = {
                ...p,
                session: studyReducer(p.session, action, regions),
              };
              return updated.session.phase === "summary"
                ? updated.session.history.length
                  ? archiveStudy(updated)
                  : leaveStudy(updated)
                : updated;
            })()
          : p,
      );
      if (emptyFinish) navigate(studyLink());
    },
    [regions, study.session],
  );
  const start = (settings: StudySettings, targets?: StudyReviewTarget[]) =>
    requestStudyStart(() => {
      setStudyReview(undefined);
      setStudy((previous) => ({
        ...leaveStudy(previous),
        settings,
        session: {
          ...startStudy(settings, undefined, targets),
          id: crypto.randomUUID(),
        },
      }));
      navigate(studyLink("session"));
      stop();
    });
  const choose = useCallback(
    (region: RegionFeature, point?: Focus) => {
      stop();
      if (missingPlaying) {
        if (point && !activeMinigame.canSelectPoint(point)) return;
        if (!activeMinigame.ended && activeMinigame.run?.result === undefined)
          activeMinigame.action({ type: "select", id: region.id });
      } else if (mode === "explore") selectExplore(region.id);
      else if (
        mode === "study" &&
        studyPreview &&
        !studying &&
        studyEditorOpen
      ) {
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
      missingPlaying,
      activeMinigame.action,
      activeMinigame.canSelectPoint,
      activeMinigame.ended,
      activeMinigame.run?.result,
      studying,
      studyPreview,
      studyEditorOpen,
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
    if (!webgl || !dailyLoaded || !schedule.ready || !cloudSave.ready) return;
    if (
      date === today
        ? date !== localDateKey()
        : !cloudSave.hydrated ||
          !archiveDay(
            date,
            localDateKey(),
            daily,
            allJourneys,
            schedule.schedule?.records ?? {},
          )?.journey
    )
      return;
    setDaily((p) =>
      openDaily(p, date, false, allJourneys, schedule.schedule?.assignments),
    );
    stop();
    navigate(date === today ? "/daily" : archivePath(date));
  }
  const todayAttempt = daily.attempts[today];
  const startPlaces = (targets: StudyPlaceTarget[]) => {
    if (!targets.length) return;
    if (!webgl) {
      notify("Map review needs the globe. Try again once it is available.", {
        tone: "error",
      });
      return;
    }
    requestStudyStart(() => {
      setStudy((previous) => ({
        ...leaveStudy(previous),
        session: { ...startPlaceStudy(targets), id: crypto.randomUUID() },
      }));
      setStudyReview(undefined);
      stop();
      navigate(studyLink("session"));
    });
  };
  const todayJourney =
    allJourneys.find((j) => j.id === todayAttempt?.journeyId) ??
    dailyJourney(
      today,
      daily,
      allJourneys,
      schedule.schedule?.assignments ?? {},
    );
  const panels =
    mode === "home" ? (
      <HomePanel
        journey={todayJourney}
        attempt={todayAttempt}
        ready={
          !!regions.length &&
          dailyLoaded &&
          cloudSave.ready &&
          schedule.ready &&
          webgl
        }
        scheduleError={schedule.ready ? undefined : schedule.error}
        onPlay={() => playDaily(today)}
        onArchive={() => navigate("/archive")}
        onRetrySchedule={() => void schedule.refresh()}
        onMinigames={() => navigate("/minigames")}
        onExplore={() => navigate("/explore")}
        onStudy={() => navigate("/study")}
      />
    ) : minigamePlaying ? (
      <BorderMinigamePanel
        shared={activeMinigame}
        webgl={webgl}
        onBack={() => navigate("/minigames")}
        onStudy={startPlaces}
        regions={regions}
      />
    ) : mode === "minigames" ? (
      <MinigamesPanel
        path={pathname}
        onNavigate={navigate}
        shared={sharedNeighbors}
        missing={missingBorders}
        borderRun={borderRun}
        pinpoint={pinpoint}
        webgl={webgl}
        tour={tour}
        customizing={demoCustomizing}
        onCustomize={setDemoCustomizing}
      />
    ) : mode === "archive" ? (
      <JourneyArchive
        onContentHeight={mobile.enabled ? setExploreContentHeight : undefined}
        initialDate={
          new URLSearchParams(path.split("?")[1]).get("date") ?? undefined
        }
        today={schedule.schedule?.today ?? today}
        progress={daily}
        catalog={allJourneys}
        schedule={schedule}
        ready={
          !!regions.length &&
          dailyLoaded &&
          cloudSave.ready &&
          cloudSave.hydrated &&
          schedule.ready &&
          webgl
        }
        onPlay={playDaily}
        onToday={() => playDaily(today)}
      />
    ) : mode === "account" ? (
      <AccountPanel
        onJourney={() => playDaily(today)}
        journeyReady={
          !!regions.length &&
          dailyLoaded &&
          cloudSave.ready &&
          schedule.ready &&
          webgl
        }
        onStudy={() => {
          navigate(
            study.session && study.session.phase !== "summary"
              ? studyLink("session")
              : studyLink(),
          );
        }}
        appearanceContent={
          <AppearancePanel theme={theme} onTheme={changeTheme} />
        }
        onNavigate={navigate}
        adminContent={
          <AdminAccess onAccount={() => navigate("/account")}>
            <div className="admin-content">
              <Suspense fallback={<p role="status">Opening admin tools…</p>}>
                <AdminPanel
                  embedded
                  section={accountNavigation.section ?? "schedule"}
                  initialJourneyId={accountNavigation.journeyId}
                  initialDate={accountNavigation.date}
                  onNavigate={navigate}
                  onSectionChange={(section) =>
                    navigate(accountTabLink("admin", section))
                  }
                  date={today}
                  schedule={schedule}
                  attempt={daily.attempts[today]}
                  resetReady={
                    !!subject && dailyLoaded && cloudSave.hydrated && canSave
                  }
                  onResetAttempt={() => account.admin && resetAttempt(today)}
                  feedback={<FeedbackReview onNavigate={navigate} />}
                />
              </Suspense>
            </div>
          </AdminAccess>
        }
        defaultComparison={
          schedule.ready
            ? {
                date: today,
                journeyId:
                  daily.attempts[today]?.journeyId ??
                  dailyJourney(
                    today,
                    daily,
                    allJourneys,
                    schedule.schedule?.assignments ?? {},
                  ).id,
                version:
                  daily.attempts[today]?.scheduleVersion ?? SCHEDULE_VERSION,
              }
            : null
        }
        intent={accountNavigation}
        daily={daily}
        study={study}
        sync={
          canSave
            ? cloudSave
            : {
                ...cloudSave,
                status: "error",
                message:
                  "Couldn’t save your progress on this device. New progress has not synced. Check your browser’s storage settings or available space, then try again.",
                retry: retrySaving,
              }
        }
      />
    ) : mode === "explore" ? (
      <ExplorePanel
        onContentHeight={mobile.enabled ? setExploreContentHeight : undefined}
        regions={namedRegions}
        searchRegions={exploreRegions}
        selected={selected}
        search={exploreSearch}
        onSearch={setExploreSearch}
        onSelect={selectExplore}
        onFocus={focusExplore}
        selectedRegion={selectedRegion}
        selectedCity={selectedCity}
        onCity={selectExploreCity}
        onCityFocus={focusExploreCity}
        breakdown={breakdown}
        onBreakdown={(id) => {
          setBreakdown(id);
          if (!id || id === selected) setSelectedRegion(undefined);
        }}
        regionalStatus={regionalStatus || physicalError}
        regionalLayers={regional?.REGIONAL_LAYERS}
      />
    ) : mode === "study" ? (
      <StudyPanel
        paused={!!feedback || !!studyReplacement}
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
        onPreview={previewStudy}
        onBuilderChange={setStudyEditorOpen}
        onCustomizeChange={setStudyCustomizing}
        compact={mobile.enabled}
        save={study}
        setup={studySetup}
        active={mode === "study"}
        webgl={webgl}
        onSettings={(settings) => setStudy((p) => ({ ...p, settings }))}
        view={studyRoute.view}
        record={studyRecord}
        onNavigateView={(view) => {
          setStudyReview(undefined);
          navigate(studyLink(view));
        }}
        onHome={() => navigate("/")}
        onViewRecord={(record: StudyRecord) => {
          setStudyReview(undefined);
          navigate(studyLink("results", record.id));
        }}
        onStart={start}
        onStartReview={(targets, questionCount) =>
          requestStudyStart(() => {
            setStudyReview(undefined);
            setStudy((previous) => ({
              ...leaveStudy(previous),
              session: {
                ...startLearningReview(targets, undefined, questionCount),
                id: crypto.randomUUID(),
              },
            }));
            navigate(studyLink("session"));
            stop();
          })
        }
        onStartPlaces={startPlaces}
        onLocate={(answer) => {
          setStudyReview(answer);
          const pinTarget = studyPinTarget(answer.prompt, regions);
          if (pinTarget)
            frame({ ...pinTarget, altitude: pinTarget.regionId ? 0.7 : 0.3 });
          else locateStudyAnswer(answer.prompt.targetId);
        }}
        onAction={studyAction}
        onEditingChange={setStudyEditing}
        onResume={() => navigate(studyLink("session"))}
        onSetup={() => navigate(studyLink("custom"))}
      />
    ) : archiveDate && !canOpenDate ? (
      <section className="info-view" role="status">
        <h1>Journey archive</h1>
        <p>
          {!isArchiveDate(archiveDate, today)
            ? "Choose a past day from October 11, 2026 onward."
            : !schedule.loadedMonths.includes(archiveDate.slice(0, 7)) &&
                !schedule.error
              ? "Loading this day’s Journey…"
              : "This day’s Journey isn’t available."}
        </p>
        {schedule.error && (
          <p role="alert">
            {schedule.error}{" "}
            <button
              className="quiet-button"
              onClick={() => void schedule.refresh(archiveDate.slice(0, 7))}
            >
              Retry archive
            </button>
          </p>
        )}
        <button className="quiet-button" onClick={() => navigate("/archive")}>
          ← Journey archive
        </button>
      </section>
    ) : mode === "daily" &&
      (!dailyReady || (!!archiveDate && !cloudSave.hydrated)) ? (
      <section className="info-view" role="status">
        <p>{schedule.error || cloudSave.message}</p>
        {!schedule.ready && (
          <button
            className="quiet-button"
            onClick={() => void schedule.refresh()}
          >
            Retry schedule
          </button>
        )}
        {cloudSave.ready && schedule.ready && (
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
        constructionReviewIndex={constructionReviewIndex}
        onConstructionReview={(index) => {
          setConstructionReviewIndex(index);
          if (index === undefined) {
            if (journey.completion) {
              frame(journey.completion.focus);
              if (!reduced && journey.completion.views?.length) {
                if (journey.completion.loopViews === false)
                  globe.current?.flyover(journey.completion.views, false);
                else globe.current?.flyover(journey.completion.views);
              }
            }
          } else {
            const question = journey.rounds[index];
            if (question) frame(question.feedbackFocus ?? question.focus);
          }
        }}
        canReplay={mode === "practice"}
        contextNavigation={
          reviewing ? (
            <Suspense fallback={<p role="status">Opening review controls…</p>}>
              <AdminJourneyReview
                journey={journey}
                date={adminDate(
                  new URLSearchParams(path.split("?")[1]).get("date"),
                )}
                initialQuestionId={
                  new URLSearchParams(path.split("?")[1]).get("question") ??
                  undefined
                }
                context={context}
                game={game}
                onChange={(next) =>
                  setReviews((previous) => ({
                    ...previous,
                    [journey.id]: next,
                  }))
                }
                onNavigate={navigate}
              />
            </Suspense>
          ) : archiveDate ? (
            <div className="journey-archive-context">
              <button
                className="quiet-button"
                onClick={() => navigate(`/archive?date=${archiveDate}`)}
              >
                ← Journey archive
              </button>
              <span>{archiveDateLabel(archiveDate)}</span>
            </div>
          ) : undefined
        }
        onReplay={() => {
          if (mode === "practice") dispatch({ type: "start" });
        }}
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
        context={context}
        game={game}
        social={
          mode === "daily" && activeAttempt ? (
            <JourneySocial
              archive={!!archiveDate}
              journey={journey}
              attempt={activeAttempt}
              sync={
                canSave ? cloudSave : { status: "error", retry: retrySaving }
              }
              onNavigate={navigate}
            />
          ) : undefined
        }
        dispatch={dispatch}
        hover={hover}
        webgl={webgl}
        reduced={reduced}
        frame={frame}
        onPulseIslands={() => globe.current?.pulseIslands()}
        onHome={() => navigate("/")}
        onStudy={() => navigate("/study")}
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
    : minigamePlaying
      ? (activeMinigame.game?.phase ?? "playing")
      : mode === "home"
        ? "home"
        : studying
          ? session!.phase
          : "playing";
  const motionControls = (mode === "home" ||
    mode === "explore" ||
    mode === "archive" ||
    (mode === "study" &&
      unrestricted &&
      !studyEditorOpen &&
      !studyCustomizing)) && (
    <GlobeControls
      compact={mobile.enabled}
      scope={mode}
      layers={displayLayers ?? HOME_LAYERS}
      onLayers={(layers) => {
        setDefaultLayers(layers);
        setExplore(layers);
        if (!saveGlobeLayers(layers)) reportFailure("globe settings save");
      }}
      motion={motion}
      speed={rotationSpeed}
      reduced={reduced}
      ready={ready && webgl}
      onToggle={toggleMotion}
      onSpeed={setRotationSpeed}
      onFidget={fidget}
    />
  );
  const content = (
    <main
      className={`experience ${minigameLanding ? "minigame-touring" : ""} mode-${mode} phase-${phase} ${expanded ? "globe-expanded" : ""} ${panelOnly ? "panel-only" : ""} ${pageLayout ? "page-layout" : ""}`}
      style={
        mobile.enabled
          ? ({
              ...mobile.style,
              "--explore-content-height": `${exploreContentHeight}px`,
            } as CSSProperties)
          : undefined
      }
      inert={!!feedback || creditsOpen}
      data-keyboard-open={mobile.keyboard || undefined}
      data-panel-only={panelOnly || undefined}
    >
      {(!webgl || mode === "account") && (
        <div className="account-earth" aria-hidden="true" />
      )}
      <div
        className={`game-scene${globePresented ? " globe-presented" : ""}`}
        data-dd-action-name={
          mode === "explore" ? "Explore Select Region" : undefined
        }
        aria-busy={!globePresented && webgl && !error}
        id="mobile-map"
        inert={panelOnly}
        aria-hidden={panelOnly || undefined}
        ref={scene}
        onPointerDownCapture={() => setGlobeInteracted(true)}
        onWheelCapture={() => setGlobeInteracted(true)}
        onKeyDownCapture={() => setGlobeInteracted(true)}
      >
        {webgl && (
          <BoardBoundary key={recovery.generation} onError={fail}>
            <Suspense fallback={<LoadingScreen />}>
              <GlobeView
                active={!panelOnly}
                ref={globe}
                initialFocus={recovery.focus ?? initialFocus}
                theme="play"
                palette={theme}
                compact={mobile.enabled}
                expanded={expanded}
                visualScale={mobile.enabled && mode === "home" ? 1.2 : 1}
                regions={
                  world?.regions ??
                  (mode === "explore"
                    ? exploreRegions
                    : studyPresentation.regions)
                }
                warmRegions={warmRegions}
                physicalFeatures={world?.physicalFeatures ?? physicalFeatures}
                states={states}
                places={places}
                placeContextual={!!displayLayers || !!studyDisplay}
                placeDensity={studyDisplay ? "study" : undefined}
                selectDisabled={
                  minigameLanding ||
                  (minigamePlaying && activeMinigame.ended) ||
                  world?.selectDisabled ||
                  mode === "explore" ||
                  !!studyPreview
                }
                selectableRegionIds={world?.selectableRegionIds}
                placeMarkers={studyPresentation.placeMarkers}
                placeLabels={studyPresentation.placeLabels}
                routes={world?.routes ?? emptyRoutes}
                overlays={world?.overlays}
                clueLocators={world?.clueLocators}
                regionReveal={
                  minigameLanding
                    ? tour.world?.regionReveal
                    : minigamePlaying
                      ? activeMinigame.world?.regionReveal
                      : undefined
                }
                regionTransitionKey={
                  minigameLanding
                    ? tour.world?.regionTransitionKey
                    : minigamePlaying
                      ? activeMinigame.world?.regionTransitionKey
                      : undefined
                }
                borderOmissions={
                  minigameLanding
                    ? tour.world?.borderOmissions
                    : minigamePlaying
                      ? activeMinigame.world?.borderOmissions
                      : undefined
                }
                showBorders={borders}
                borderRegionIds={
                  world?.borderRegionIds ?? studyPresentation.borderRegionIds
                }
                showRegionalBorders={mode === "explore" && !!breakdown}
                surfaceRoutes
                regionNames={names}
                regionInteraction={
                  minigameLanding
                    ? false
                    : !studying || !session || !isStudyPinPrompt(session.prompt)
                      ? (!minigamePlaying ||
                          (!activeMinigame.ended &&
                            activeMinigame.run?.result === undefined)) &&
                        mode !== "archive" &&
                        !studyBrowsingHistory &&
                        !studyEditing &&
                        (world?.regionInteraction ?? true)
                      : false
                }
                namedRegionIds={
                  world?.namedRegionIds ?? studyPresentation.namedRegionIds
                }
                hovered={hover?.id}
                onHover={setHover}
                onSelect={choose}
                interactionLabel={
                  minigamePlaying && activeMinigame.game?.phase !== "playing"
                    ? "Interactive Earth. Drag to rotate, scroll or pinch to zoom."
                    : missingPlaying
                      ? "Interactive Earth. Tap the territory hiding two countries; drag to rotate, scroll or pinch to zoom."
                      : sharedPlaying || pinpointPlaying
                        ? "Interactive Earth. Tap land or water to place a pin; drag to rotate, scroll or pinch to zoom."
                        : isJourney &&
                            ["pin", "geo-multipin"].includes(
                              journey.rounds[game.roundIndex].mode,
                            )
                          ? "Interactive Earth. Tap land or water to place a pin; drag to rotate, scroll or pinch to zoom."
                          : isJourney &&
                              journey.rounds[game.roundIndex].mode.startsWith(
                                "city-",
                              )
                            ? "Interactive Earth. Select a city marker to answer; drag to rotate, scroll or pinch to zoom."
                            : undefined
                }
                placeInteraction={
                  mode === "explore" ||
                  (isJourney &&
                    (journey.rounds[game.roundIndex].mode.startsWith("city-") ||
                      (journey.rounds[game.roundIndex].mode ===
                        "geo-multipin" &&
                        !game.activePinSlot)))
                }
                pinHeld={
                  isJourney && game.phase === "playing" && !!game.activePinSlot
                }
                placeInspection={mode === "explore"}
                constructionInput={
                  isJourney &&
                  game.phase === "playing" &&
                  journey.rounds[game.roundIndex].mode !== "geo-multipin" &&
                  journey.rounds[game.roundIndex].mode.startsWith("geo-")
                    ? {
                        question: journey.rounds[game.roundIndex],
                        value: game.construction,
                        brushRadiusKm: game.brushRadiusKm,
                        tool: game.constructionTool ?? "draw",
                        onChange: (value) =>
                          dispatch({ type: "construction", value }),
                      }
                    : undefined
                }
                onCoordinateTap={
                  studying &&
                  session &&
                  isStudyPinPrompt(session.prompt) &&
                  !studyEditing &&
                  session.phase === "playing"
                    ? (point) => {
                        stop();
                        studyAction({ type: "pin", ...point });
                      }
                    : (sharedPlaying || pinpointPlaying) &&
                        !activeMinigame.ended &&
                        activeMinigame.run?.result === undefined
                      ? (point) => {
                          stop();
                          activeMinigame.action({ type: "pin", ...point });
                        }
                      : isJourney &&
                          game.phase === "playing" &&
                          ["pin", "geo-multipin"].includes(
                            journey.rounds[game.roundIndex].mode,
                          )
                        ? (point) => {
                            stop();
                            dispatch({
                              type:
                                journey.rounds[game.roundIndex].mode ===
                                "geo-multipin"
                                  ? "drop-labeled-pin"
                                  : "drop-pin",
                              lat: point.lat,
                              lng: point.lng,
                            });
                          }
                        : undefined
                }
                onPlace={(place) => {
                  if (
                    isJourney &&
                    game.phase === "playing" &&
                    journey.rounds[game.roundIndex].mode === "geo-multipin"
                  ) {
                    const prefix = `construction:${journey.rounds[game.roundIndex].id}:pin:`;
                    if (place.id.startsWith(prefix))
                      dispatch({
                        type: "pin-slot",
                        id: place.id.slice(prefix.length),
                      });
                    return;
                  }
                  if (mode === "explore") {
                    selectExploreCity(place);
                    return;
                  }
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
                motion={minigameLanding ? false : motion}
                reduced={reduced}
                onReady={onReady}
                onInteraction={minigameLanding ? tour.pause : stop}
                onFailure={contextLost}
                onTextureFallback={noAction}
                onSurfaceTap={
                  mode === "home"
                    ? (region) => {
                        trackAction("Globe Tap", { mode });
                        setSelectedRegion(undefined);
                        setBreakdown(undefined);
                        clearBranches();
                        setSelected(region?.id);
                        pendingExploreFocus.current = region?.id;
                        stop();
                        navigate("/explore");
                      }
                    : undefined
                }
              />
              <LoadingScreen active={!globePresented && !error} />
            </Suspense>
          </BoardBoundary>
        )}
      </div>
      {minigameLanding && webgl && <MinigameTourCaption tour={tour} />}
      <header className="experience-header">
        <button
          className="experience-logo"
          data-dd-action-name="Menu Home Logo"
          aria-label="ambit home"
          onClick={() => navigate("/")}
        >
          <AmbitLogo />
        </button>
        <div className="experience-header-right">
          <AccountMenu
            signedIn={!!account.user}
            player={playerProfile}
            admin={account.admin}
            path={path}
            onNavigate={navigate}
          />
          <AppMenu
            onJourney={() => playDaily(today)}
            journeyReady={
              !!regions.length &&
              dailyLoaded &&
              cloudSave.ready &&
              schedule.ready
            }
            onFeedback={() =>
              setFeedback({ kind: "experience", context: { view: mode } })
            }
            path={path}
            onCredits={() => setCreditsOpen(true)}
            onNavigate={navigate}
          />
        </div>
      </header>
      {mobile.enabled && (
        <div className="mobile-map-tools" aria-label="Globe controls">
          <button
            data-dd-action-name="Globe Recenter"
            aria-label="◎ Recenter"
            disabled={!ready || !webgl}
            onClick={() =>
              selectedCity && mode === "explore"
                ? focusExploreCity(selectedCity)
                : recenter(
                    selectedRegion ??
                      namedRegions.find((r) => r.id === selected),
                  )
            }
          >
            <span aria-hidden="true">◎</span>
            <span className="mobile-map-tool-label"> Recenter</span>
          </button>
          {motionControls}
          <button
            data-dd-action-name="Globe Toggle Size"
            aria-expanded={expanded}
            aria-controls="mobile-map"
            aria-label={
              expanded
                ? isJourney || studying
                  ? "Show question ↓"
                  : "Show details ↓"
                : "Enlarge globe"
            }
            disabled={!webgl}
            onClick={() => setGlobeExpanded((v) => !v)}
          >
            <svg
              className="mobile-map-size-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                d={
                  expanded
                    ? "m6 9 6 6 6-6"
                    : "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"
                }
              />
            </svg>
            <span className="mobile-map-tool-label">
              {expanded
                ? isJourney || studying
                  ? "Show question ↓"
                  : "Show details ↓"
                : "Enlarge globe"}
            </span>
          </button>
        </div>
      )}
      <ModePanels
        mode={
          mode === "account"
            ? "account"
            : minigameLanding
              ? "minigames-menu"
              : path
        }
        page={pageLayout}
        reduced={reduced || mobile.enabled}
        persistent={mobile.enabled}
        hidden={expanded}
        scrollKey={mobile.enabled ? mobileStep : undefined}
      >
        <PanelBoundary
          key={
            mode === "account"
              ? "account"
              : minigameLanding
                ? "minigames-menu"
                : path
          }
        >
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
          {expanded &&
            minigamePlaying &&
            activeMinigame.game?.phase === "playing" &&
            activeMinigame.journey &&
            activeMinigame.context && (
              <p className="mobile-map-prompt">
                {questionPrompt(
                  activeMinigame.journey.rounds[0],
                  activeMinigame.context,
                )}
              </p>
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
      {(error ||
        contextError ||
        recovery.failed ||
        (!webgl && mode !== "study")) && (
        <div className="experience-status" role="status">
          <p>
            {error ||
              contextError ||
              (recovery.failed
                ? recovery.recovering
                  ? canSave
                    ? "Restoring the globe… Your current session remains open."
                    : "Restoring the globe… Recent progress may not be saved."
                  : canSave
                    ? "The globe isn’t available. Your current session remains open."
                    : "The globe isn’t available. Recent progress may not be saved."
                : "The 3D globe isn’t available. Try another browser or device.")}
          </p>
          {error && (
            <button onClick={() => setRetry((v) => v + 1)}>Try again ↻</button>
          )}
          {recovery.failed && (
            <button onClick={recovery.retry} disabled={recovery.recovering}>
              Retry globe
            </button>
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
      {studyReplacement && (
        <StudyReplacementDialog
          answered={study.session?.history.length ?? 0}
          onCancel={() => setStudyReplacement(undefined)}
          onConfirm={() => {
            const run = studyReplacement;
            setStudyReplacement(undefined);
            run();
          }}
        />
      )}
      {feedback && (
        <FeedbackDialog request={feedback} onClose={closeFeedback} />
      )}
      {creditsOpen && <WorldCreditsDialog onClose={closeCredits} />}
    </main>
  );
  return <ThemeContext value={theme}>{content}</ThemeContext>;
}
