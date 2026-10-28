import { useEffect, useState } from "react";

const REVEAL_FIRST_MS = 160;
const REVEAL_INTERVAL_MS = 110;
export function revealSequenceStep(elapsed: number, total: number) {
  return elapsed < REVEAL_FIRST_MS
    ? 0
    : Math.min(
        total,
        1 + Math.floor((elapsed - REVEAL_FIRST_MS) / REVEAL_INTERVAL_MS),
      );
}

/** Reveal steps belong to the view, never the saved answer or score. */
export function useRevealSequence(
  key: string | undefined,
  total: number,
  active: boolean,
) {
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [progress, setProgress] = useState({ key, step: 0 });
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!key || !active || reduced) return;
    setProgress({ key, step: 0 });
    let step = 0;
    const advance = () => {
      setProgress({ key, step: ++step });
      if (step < total) timer = setTimeout(advance, REVEAL_INTERVAL_MS);
    };
    let timer = setTimeout(advance, REVEAL_FIRST_MS);
    return () => clearTimeout(timer);
  }, [key, total, active, reduced]);
  return {
    reduced,
    step: !active || reduced ? total : progress.key === key ? progress.step : 0,
  };
}
