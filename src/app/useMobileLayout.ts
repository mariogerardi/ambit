import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

// Includes iPhones in landscape, without changing the desktop/tablet layout.
export const MOBILE_LAYOUT_QUERY =
  "(max-width: 700px), (max-width: 1000px) and (max-height: 500px)";

export function useMobileLayout() {
  const [enabled, setEnabled] = useState(
    () => matchMedia(MOBILE_LAYOUT_QUERY).matches,
  );
  const [viewport, setViewport] = useState({
    height: 0,
    top: 0,
    keyboard: false,
  });
  useEffect(() => {
    const media = matchMedia(MOBILE_LAYOUT_QUERY);
    const visual = window.visualViewport;
    const update = () => {
      setEnabled(media.matches);
      // Leave browser page zoom alone. Dynamic viewport units are the fallback.
      const unzoomed = !visual || visual.scale === 1;
      const editable = document.activeElement?.matches(
        "input:not([type=checkbox], [type=radio], [type=range]), textarea, [contenteditable=true]",
      );
      const next = {
        height: unzoomed && visual ? visual.height : 0,
        top: unzoomed && visual ? visual.offsetTop : 0,
        keyboard: !!(
          unzoomed &&
          editable &&
          visual &&
          innerHeight - visual.height > 120
        ),
      };
      setViewport((previous) =>
        previous.height === next.height &&
        previous.top === next.top &&
        previous.keyboard === next.keyboard
          ? previous
          : next,
      );
    };
    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update);
    visual?.addEventListener("resize", update);
    visual?.addEventListener("scroll", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      visual?.removeEventListener("resize", update);
      visual?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  useEffect(() => {
    if (!enabled || !viewport.keyboard) return;
    const frame = requestAnimationFrame(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.scrollIntoView?.({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, viewport.keyboard]);
  const style = {
    "--app-height": viewport.height ? `${viewport.height}px` : "100dvh",
    "--visual-top": `${viewport.top}px`,
  } as CSSProperties;
  return { enabled, keyboard: enabled && viewport.keyboard, style };
}
