import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { RefObject } from "react";
import { geoDistance } from "d3-geo";
import type { RegionFeature, Focus } from "../geography/types";
import type { GlobeHandle } from "../globe/GlobeView";
import {
  motionDistance,
  motionFrameDelta,
  tourDuration,
} from "../globe/motion";
import type { BorderMinigame } from "./sharedNeighbors";
import {
  demoWorld,
  minigameExamples,
  tourFrame,
  smoothJoin,
} from "./minigameDemos";
import type { TourFrame } from "./minigameDemos";

export function useMinigameTour({
  active,
  kind,
  regions,
  blockedId,
  reduced,
  globe,
}: {
  active: boolean;
  kind: BorderMinigame;
  regions: RegionFeature[];
  blockedId?: string;
  reduced: boolean;
  globe: RefObject<GlobeHandle | null>;
}) {
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const [manualIndex, setManualIndex] = useState(0);
  const [answer, setAnswer] = useState(false);
  const [frame, setFrame] = useState<TourFrame>();
  const motion = useRef<
    { focus: Focus; velocity: Required<Focus> } | undefined
  >(undefined);
  type Join = {
    from: Focus;
    velocity: Required<Focus>;
    to: Focus;
    endVelocity: Required<Focus>;
    elapsed: number;
    duration: number;
  };
  const plan = useRef<{
    examples: ReturnType<typeof minigameExamples>[BorderMinigame];
    elapsed: number;
    offset: number;
    join?: Join;
    needsJoin: boolean;
  }>({ examples: [], elapsed: 0, offset: 0, needsJoin: true });
  const library = useMemo(() => {
    if (!active || !regions.length) return { examples: [], error: "" };
    try {
      const examples = minigameExamples(regions, kind)
        [kind].filter((example) => example.id !== blockedId)
        .sort((a, b) => b.focus.lng - a.focus.lng);
      const view = globe.current?.view();
      let nearest = 0;
      if (view)
        for (let i = 1; i < examples.length; i++)
          if (
            geoDistance(
              [view.lng, view.lat],
              [examples[i].focus.lng, examples[i].focus.lat],
            ) <
            geoDistance(
              [view.lng, view.lat],
              [examples[nearest].focus.lng, examples[nearest].focus.lat],
            )
          )
            nearest = i;
      return {
        examples: [...examples.slice(nearest), ...examples.slice(0, nearest)],
        error: "",
      };
    } catch {
      return {
        examples: [],
        error:
          "The globe example couldn’t load. You can still read the rules and play.",
      };
    }
  }, [active, kind, regions, blockedId, globe]);
  const examples = library.examples;
  const frameExamples = useRef(examples);
  useLayoutEffect(() => {
    frameExamples.current = examples;
    plan.current = { examples, elapsed: 0, offset: 0, needsJoin: true };
    setManualIndex(0);
    setAnswer(false);
    setFrame(
      examples.length
        ? {
            ...tourFrame(examples, 0),
            phase: paused || reduced ? "question" : "travel",
          }
        : undefined,
    );
  }, [examples]);
  useEffect(() => {
    const change = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", change);
    return () => document.removeEventListener("visibilitychange", change);
  }, []);
  const available = examples.length > 0;
  useEffect(() => {
    if (!active || !available || reduced || paused || hidden) return;
    let request = 0,
      last = performance.now();
    plan.current.needsJoin = true;
    motion.current = undefined;
    const tick = (now: number) => {
      const deltaTime = motionFrameDelta(now, last, !motion.current);
      last = now;
      const currentPlan = plan.current;
      if (!currentPlan.examples.length) return;
      if (currentPlan.needsJoin) {
        const target = tourFrame(
          currentPlan.examples,
          currentPlan.elapsed,
        ).focus;
        const after = tourFrame(
          currentPlan.examples,
          currentPlan.elapsed + 1,
        ).focus;
        const origin =
          motion.current?.focus ?? globe.current?.orbitView() ?? target;
        const velocity = motion.current?.velocity ?? {
          lat: 0,
          lng: 0,
          altitude: 0,
        };
        const delta =
          ((((target.lng - origin.lng + 180) % 360) + 360) % 360) - 180;
        currentPlan.offset = origin.lng + delta - target.lng;
        currentPlan.join = {
          from: origin,
          velocity,
          to: { ...target, lng: origin.lng + delta },
          endVelocity: {
            lat: after.lat - target.lat,
            lng: after.lng - target.lng,
            altitude: (after.altitude ?? 1.5) - (target.altitude ?? 1.5),
          },
          elapsed: 0,
          duration: tourDuration(motionDistance(origin, target)),
        };
        currentPlan.needsJoin = false;
      }
      const join = currentPlan.join;
      let next = tourFrame(currentPlan.examples, currentPlan.elapsed);
      let focus: Focus;
      if (join && join.elapsed < join.duration) {
        join.elapsed = Math.min(join.duration, join.elapsed + deltaTime);
        const time = join.elapsed;
        focus = {
          lat: smoothJoin(
            join.from.lat,
            join.to.lat,
            join.velocity.lat,
            join.endVelocity.lat,
            time,
            join.duration,
          ),
          lng: smoothJoin(
            join.from.lng,
            join.to.lng,
            join.velocity.lng,
            join.endVelocity.lng,
            time,
            join.duration,
          ),
          altitude: smoothJoin(
            join.from.altitude ?? 1.65,
            join.to.altitude ?? 1.5,
            join.velocity.altitude,
            join.endVelocity.altitude,
            time,
            join.duration,
          ),
        };
        next = {
          ...next,
          departed: next.phase === "reveal" || !!next.departed,
          phase: "travel",
          rings: 0,
        };
      } else {
        currentPlan.join = undefined;
        currentPlan.elapsed += deltaTime;
        next = tourFrame(currentPlan.examples, currentPlan.elapsed);
        next.focus.lng += currentPlan.offset;
        focus = next.focus;
      }
      const previous = motion.current;
      const dt = Math.max(1, deltaTime);
      const longitudeDelta = previous
        ? ((((focus.lng - previous.focus.lng + 180) % 360) + 360) % 360) - 180
        : 0;
      motion.current = {
        focus,
        velocity: previous
          ? {
              lat: (focus.lat - previous.focus.lat) / dt,
              lng: longitudeDelta / dt,
              altitude:
                ((focus.altitude ?? 1.65) - (previous.focus.altitude ?? 1.65)) /
                dt,
            }
          : { lat: 0, lng: 0, altitude: 0 },
      };
      globe.current?.orbitView(focus);
      setFrame((previousFrame) =>
        previousFrame &&
        previousFrame.index === next.index &&
        previousFrame.phase === next.phase &&
        previousFrame.step === next.step &&
        previousFrame.rings === next.rings &&
        previousFrame.departed === next.departed &&
        previousFrame.cycle === next.cycle
          ? previousFrame
          : next,
      );
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [active, available, reduced, paused, hidden, globe]);
  const manual = examples[manualIndex % Math.max(1, examples.length)];
  const current =
    reduced && manual
      ? {
          index: manualIndex % examples.length,
          phase: answer ? ("reveal" as const) : ("question" as const),
          cycle: 0,
          departed: false,
          step: manual.steps,
          rings: 3,
          focus: answer ? (manual.revealFocus ?? manual.focus) : manual.focus,
        }
      : frameExamples.current === examples
        ? frame
        : examples.length
          ? { ...tourFrame(examples, 0), phase: "travel" as const }
          : undefined;
  const example = current && examples[current.index];
  useEffect(() => {
    if (active && reduced && manual)
      globe.current?.orbitView(
        answer ? (manual.revealFocus ?? manual.focus) : manual.focus,
      );
  }, [active, reduced, manual, answer, globe]);
  const world = useMemo(
    () =>
      example && current
        ? demoWorld(
            regions,
            example,
            current.phase,
            current.step,
            reduced,
            current.cycle,
            current.rings,
            current.departed,
          )
        : undefined,
    [
      regions,
      example,
      current?.phase,
      current?.step,
      current?.cycle,
      current?.rings,
      current?.departed,
      reduced,
    ],
  );
  const pause = useCallback(() => setPaused(true), []);
  return {
    world,
    example,
    phase: current?.phase,
    count: examples.length,
    index: current?.index ?? 0,
    error: library.error,
    paused,
    reduced,
    pause,
    toggle: () => setPaused((value) => !value),
    answer,
    reveal: () => setAnswer((value) => !value),
    next: () => {
      setManualIndex((value) => (value + 1) % Math.max(1, examples.length));
      setAnswer(false);
    },
  };
}
