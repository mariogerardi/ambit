import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Focus } from "../geography/types";
import type { GlobeHandle } from "../globe/GlobeView";
import { supportsWebGL } from "../globe/support";

/** Recover only the renderer; sessions and saves belong to the mounted workspace. */
export function useGlobeRecovery(globe: RefObject<GlobeHandle | null>) {
  const [enabled, setEnabled] = useState(supportsWebGL);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [focus, setFocus] = useState<Focus>();
  const autoRetried = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const fail = useCallback(() => {
    clearTimeout(timer.current);
    try {
      const view = globe.current?.view();
      if (view) setFocus(view);
    } catch {
      // A failed renderer may no longer have a readable camera.
    }
    setReady(false);
    setEnabled(false);
    setFailed(true);
    setRecovering(false);
  }, [globe]);
  const start = useCallback(() => {
    clearTimeout(timer.current);
    const available = supportsWebGL();
    if (available) setGeneration((value) => value + 1);
    setRecovering(available);
    setEnabled(available);
  }, []);
  const contextLost = useCallback(() => {
    fail();
    if (autoRetried.current) return;
    autoRetried.current = true;
    setRecovering(true);
    timer.current = setTimeout(start, 500);
  }, [fail, start]);
  const retry = useCallback(() => {
    // A deliberate player action starts a new recovery attempt, not a loop.
    autoRetried.current = false;
    start();
  }, [start]);
  const onReady = useCallback(() => {
    setReady(true);
    setFailed(false);
    setRecovering(false);
  }, []);

  return {
    enabled,
    ready,
    failed,
    recovering,
    generation,
    focus,
    fail,
    contextLost,
    retry,
    onReady,
  };
}
