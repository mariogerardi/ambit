import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Focus, PlaceFeature, RegionFeature } from "../geography/types";
import type { GlobeHandle } from "../globe/GlobeView";
import {
  createDefaultViewCycle,
  normalWorldView,
  studyCameraTarget,
} from "../globe/defaultViews";
import { worldAltitude } from "../globe/camera";
import { journeyStops } from "../game/journeyStops";
import type { Journey, QuestionContext } from "../game/questionContracts";
import type { GameState } from "../game/state";
import type { StudySession, StudySettings } from "../study/engine";
import { studyScopeFocus } from "../study/scopeFocus";
import type { AppMode } from "./modes";

interface CameraOptions {
  mode: AppMode;
  transitionKey: string;
  ready: boolean;
  mobile: boolean;
  globe: RefObject<GlobeHandle | null>;
  scene: RefObject<HTMLDivElement | null>;
  regions: RegionFeature[];
  clearHover(): void;
  journey: {
    active: boolean;
    definition: Journey;
    context?: QuestionContext;
    focus?: Focus;
    phase: GameState["phase"];
    roundIndex: number;
    answers: GameState["answers"];
    help?: GameState["help"];
    dailyReady: boolean;
  };
  study: {
    active: boolean;
    session?: StudySession;
    preview?: StudySettings;
    editorOpen: boolean;
    highlight?: Focus;
    capitalFocus?: Focus;
  };
}

/** Owns when/where to travel; the mounted globe owns animation and viewport fitting. */
export function useCameraOrchestration({
  mode,
  transitionKey: cameraKey,
  ready,
  mobile,
  globe,
  scene,
  regions: namedRegions,
  clearHover,
  journey: journeyCamera,
  study,
}: CameraOptions) {
  const {
    active: isJourney,
    definition: journey,
    context,
    focus: journeyFocus,
    phase,
    roundIndex,
    answers,
    help,
    dailyReady,
  } = journeyCamera;
  const round = journey.rounds[roundIndex];
  const helpFraming =
    isJourney &&
    round &&
    phase === "playing" &&
    ((help?.[round.id] === "assisted" && !!round.guidance?.assist?.focus) ||
      (help?.[round.id] === "hinted" && !!round.guidance?.hintMap?.focus))
      ? help?.[round.id]
      : undefined;
  const {
    active: studying,
    session,
    preview: studyPreview,
    editorOpen: studyEditorOpen,
    highlight: studyHighlight,
    capitalFocus: studyCapitalFocus,
  } = study;
  const [motion, setMotion] = useState(mode === "home");
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [nextDefaultView] = useState(() => createDefaultViewCycle());
  const [initialFocus] = useState(() =>
    createDefaultViewCycle()(worldAltitude(innerWidth, innerHeight)),
  );
  const previous = useRef<string | undefined>(undefined);
  const pendingExploreFocus = useRef<string | undefined>(undefined);
  const frame = useCallback(
    (focus: Focus) => globe.current?.focus(focus),
    [globe],
  );
  const stop = useCallback(() => setMotion(false), []);
  const altitude = (compact = mobile) =>
    worldAltitude(
      scene.current?.clientWidth || innerWidth,
      scene.current?.clientHeight || innerHeight,
      compact,
    );

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const studyArea = useMemo(
    () =>
      session
        ? studyScopeFocus(session.settings, namedRegions, altitude())
        : undefined,
    [session?.settings, namedRegions, mobile],
  );
  const studyDestination = (entering = false) =>
    studyCapitalFocus ??
    (studyArea && !studyHighlight
      ? entering || !normalWorldView(globe.current?.view(), studyArea.altitude!)
        ? studyArea
        : undefined
      : studyCameraTarget(
          globe.current?.view(),
          altitude(),
          nextDefaultView,
          studyHighlight,
        ));
  const builderFocus = useMemo(
    () =>
      studyPreview
        ? studyScopeFocus(studyPreview, namedRegions, altitude(false))
        : undefined,
    // Hint and answer-method edits update layers without restarting the flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      studyPreview?.scope,
      studyPreview?.continent,
      studyPreview?.countryIds,
      namedRegions,
    ],
  );
  useEffect(() => {
    if (
      !ready ||
      mobile ||
      mode !== "study" ||
      !studyEditorOpen ||
      !studyPreview?.scope
    )
      return;
    if (builderFocus) {
      stop();
      frame(builderFocus);
    } else if (studyPreview.scope === "all") {
      const view = globe.current?.view();
      const worldZoom = altitude(false);
      if (view && !normalWorldView(view, worldZoom))
        globe.current?.focus({ ...view, altitude: worldZoom }, "world");
      setMotion(true);
    }
  }, [
    ready,
    mobile,
    mode,
    studyEditorOpen,
    builderFocus,
    studyPreview?.scope,
    stop,
    frame,
  ]);
  const focusExplore = useCallback(
    (region: RegionFeature) => {
      if (mobile)
        globe.current?.focus({
          ...region.focus,
          altitude: Math.max(0.012, (region.focus.altitude ?? 0.8) * 0.72),
        });
      else frame(region.focus);
    },
    [mobile, frame],
  );
  const focusExploreCity = useCallback(
    (city: Pick<PlaceFeature, "lat" | "lng">) => {
      stop();
      frame({ lat: city.lat, lng: city.lng, altitude: mobile ? 0.06 : 0.08 });
    },
    [frame, mobile, stop],
  );
  useEffect(() => {
    globe.current?.cancelFidget();
  }, [mode, globe]);
  // Frame questions on transitions; overview screens share the current orbit.
  useEffect(() => {
    if (!ready) return;
    const old = previous.current;
    if (isJourney && (phase === "finished" || phase === "failed")) {
      previous.current = cameraKey;
      return;
    }
    if (old !== cameraKey) {
      if (old === undefined && mode === "home") {
        setMotion(true);
        previous.current = cameraKey;
        return;
      }
      globe.current?.cancelFocus();
      clearHover();
      if (mode === "explore" && pendingExploreFocus.current) {
        stop();
        previous.current = cameraKey;
        return;
      }
      const questionDestination =
        journeyFocus ?? (studying ? studyDestination(true) : undefined);
      if (questionDestination) {
        stop();
        frame(questionDestination);
      } else if (
        mode === "home" ||
        mode === "explore" ||
        mode === "archive" ||
        mode === "study"
      ) {
        // Overview screens share one continuously moving globe, never a saved orbit.
        const view = globe.current?.view();
        const worldZoom = altitude();
        if (view && !normalWorldView(view, worldZoom))
          globe.current?.focus({ ...view, altitude: worldZoom }, "world");
        setMotion(true);
      } else setMotion(false);
      previous.current = cameraKey;
      return;
    }
    if (isJourney && journeyFocus) {
      setMotion(false);
      clearHover();
      frame(journeyFocus);
    } else if (studying && session?.phase === "playing") {
      setMotion(false);
      clearHover();
      const destination = studyDestination();
      if (destination) frame(destination);
    } else if (studying && session?.phase === "summary" && studyArea) {
      frame(studyArea);
    }
    // Authored help framing changes a stage; display and response edits keep the orbit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    cameraKey,
    isJourney,
    !!journeyFocus,
    helpFraming,
    namedRegions.length,
    phase,
    roundIndex,
    studying,
    session?.prompt.ordinal,
    session?.prompt.targetId,
    session?.prompt.topic,
    session?.prompt.style,
    session?.phase,
    frame,
  ]);
  const sceneViews =
    phase === "playing"
      ? round?.introViews
      : phase === "feedback" &&
          (round?.mode !== "pin" || answers.at(-1)?.correct)
        ? round?.feedbackViews
        : undefined;
  const sceneHelp = phase === "playing" ? help?.[round?.id] : undefined;
  useEffect(() => {
    if (
      !ready ||
      !isJourney ||
      !sceneViews?.length ||
      (mode === "daily" && !dailyReady)
    )
      return;
    stop();
    if (reduced || sceneHelp) frame(journeyFocus ?? sceneViews.at(-1)!);
    else globe.current?.flyover(sceneViews, false);
    return () => globe.current?.cancelFlyover();
    // Response edits leave the player's orbit alone. The transition/help stage
    // owns playback; reduced motion uses the current effective scene focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    isJourney,
    cameraKey,
    sceneViews,
    sceneHelp,
    reduced,
    mode,
    dailyReady,
    frame,
    stop,
  ]);
  useEffect(() => {
    if (
      !ready ||
      !isJourney ||
      !context ||
      (mode === "daily" && !dailyReady) ||
      (phase !== "finished" && phase !== "failed")
    )
      return;
    stop();
    clearHover();
    if (phase === "finished" && journey.completion) {
      if (!reduced && journey.completion.views?.length) {
        if (journey.completion.loopViews === false)
          globe.current?.flyover(journey.completion.views, false);
        else globe.current?.flyover(journey.completion.views);
      } else frame(journey.completion.focus);
      return () => globe.current?.cancelFlyover();
    }
    const stops = journeyStops(journey, context, answers);
    if (reduced && stops[0]) frame(stops[0]);
    else globe.current?.flyover(stops);
    return () => globe.current?.cancelFlyover();
  }, [
    ready,
    isJourney,
    journey,
    context,
    mode,
    phase,
    answers,
    dailyReady,
    reduced,
    frame,
    stop,
  ]);
  // A home-country tap enters Explore first, then frames its new selection.
  useEffect(() => {
    if (!ready || mode !== "explore" || !pendingExploreFocus.current) return;
    const region = namedRegions.find(
      (r) => r.id === pendingExploreFocus.current,
    );
    if (!region) return;
    pendingExploreFocus.current = undefined;
    stop();
    focusExplore(region);
  }, [ready, mode, namedRegions, focusExplore, stop]);

  const prepareNavigation = (url: string) => {
    if (url !== "/" && url !== "/explore" && url.split("?")[0] !== "/archive")
      stop();
    globe.current?.cancelFocus();
  };
  const toggleMotion = () => {
    globe.current?.cancelFidget();
    setMotion((value) => !value);
  };
  const fidget = () => globe.current?.fidget();
  const locateStudyAnswer = (targetId: string) => {
    stop();
    const target = namedRegions.find((r) => r.id === targetId);
    if (target) frame({ ...target.focus, altitude: 1.1 });
  };
  const recenter = (exploreRegion?: RegionFeature) => {
    stop();
    if (mode === "explore" && exploreRegion) {
      focusExplore(exploreRegion);
      return;
    }
    frame(
      journeyFocus ??
        (studying ? studyDestination() : undefined) ??
        nextDefaultView(altitude()),
    );
  };
  return {
    motion,
    reduced,
    initialFocus,
    frame,
    stop,
    focusExplore,
    focusExploreCity,
    pendingExploreFocus,
    // Keep entry intent independent of effect order: consuming the queued focus
    // must not make the shell clear a country selected by a Home tap.
    exploreEntryFromCountry: !!pendingExploreFocus.current,
    prepareNavigation,
    toggleMotion,
    fidget,
    locateStudyAnswer,
    recenter,
  };
}
