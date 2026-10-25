import { useLayoutEffect, useRef } from "react";

/** Keep the whole country pair together, measuring the loaded font at each width. */
export function MinigameCountries({
  names,
  route,
}: {
  names: string[];
  route: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = container.current;
    const text = row?.firstElementChild as HTMLElement | null;
    if (!row || !text) return;
    let active = true;
    const fit = () => {
      if (!active || !row.clientWidth) return;
      row.style.fontSize = "";
      let low = 0,
        high = parseFloat(getComputedStyle(row).fontSize);
      if (text.getBoundingClientRect().width <= row.clientWidth) return;
      while (high - low > 0.1) {
        const size = (low + high) / 2;
        row.style.fontSize = `${size}px`;
        if (text.getBoundingClientRect().width > row.clientWidth) high = size;
        else low = size;
      }
      row.style.fontSize = `${low}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(row);
    window.addEventListener("resize", fit);
    void document.fonts?.ready.then(fit);
    document.fonts?.addEventListener("loadingdone", fit);
    return () => {
      active = false;
      observer.disconnect();
      window.removeEventListener("resize", fit);
      document.fonts?.removeEventListener("loadingdone", fit);
    };
  }, [names[0], names[1], route]);
  return (
    <div
      ref={container}
      className="shared-neighbors-clues"
      aria-label={route ? "Route endpoints" : "Clue countries"}
    >
      <span>
        <span>{names[0]}</span>
        <span className="minigame-country-separator" aria-hidden="true">
          {route ? "→" : "+"}
        </span>
        <span>{names[1]}</span>
      </span>
    </div>
  );
}
