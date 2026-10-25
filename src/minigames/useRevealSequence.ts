import { useEffect, useState } from "react";

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
      if (step < total) timer = setTimeout(advance, 110);
    };
    let timer = setTimeout(advance, 160);
    return () => clearTimeout(timer);
  }, [key, total, active, reduced]);
  return {
    reduced,
    step: !active || reduced ? total : progress.key === key ? progress.step : 0,
  };
}
