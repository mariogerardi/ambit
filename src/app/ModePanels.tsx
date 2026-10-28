import { createContext, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
type PanelSnapshot = {
  mode: string;
  children: ReactNode;
  page: boolean;
  animateExit: boolean;
};
export const PanelActive = createContext(true);
export function ModePanels({
  mode,
  reduced,
  children,
  hidden = false,
  scrollKey,
  persistent = false,
  page = false,
  animateExit = true,
}: {
  mode: string;
  reduced: boolean;
  children: ReactNode;
  hidden?: boolean;
  scrollKey?: string;
  persistent?: boolean;
  page?: boolean;
  animateExit?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [mode, scrollKey]);
  const previous = useRef({ mode, children, page, animateExit });
  const [outgoing, setOutgoing] = useState<PanelSnapshot>();
  const switching = previous.current.mode !== mode;
  const exitEligible =
    !reduced &&
    !page &&
    !previous.current.page &&
    previous.current.animateExit &&
    !!previous.current.children;
  // Include the first exit frame in reconciliation: the outgoing layer keeps
  // its existing key, DOM and component state instead of mounting a fresh copy.
  const exit =
    !reduced && !page
      ? (outgoing ?? (switching && exitEligible ? previous.current : undefined))
      : undefined;
  const returning = exit?.mode === mode;
  const leaving = returning ? undefined : exit;
  const waiting = !!leaving;
  useLayoutEffect(() => {
    const before = previous.current;
    if (reduced || page || returning) setOutgoing(undefined);
    else if (before.mode !== mode) {
      const snapshot =
        !before.page && before.animateExit && before.children
          ? before
          : undefined;
      // Keep the visible exit when navigation changes again; pending content
      // has never appeared and must not become a new outgoing panel.
      setOutgoing((current) => current ?? snapshot);
    }
    previous.current = { mode, children, page, animateExit };
  }, [mode, children, reduced, page, animateExit, returning]);
  useLayoutEffect(() => {
    if (!outgoing) return;
    // animationend owns normal sequencing. Recover if CSS is suppressed or the
    // event is lost, allowing a little grace beyond the 220 ms exit animation.
    const timer = setTimeout(() => setOutgoing(undefined), 320);
    return () => clearTimeout(timer);
  }, [outgoing]);
  return (
    <>
      {leaving && (
        <div
          key={persistent ? `outgoing-${leaving.mode}` : leaving.mode}
          className="mode-layer mode-outgoing"
          inert
          aria-hidden="true"
          onAnimationEnd={(event) => {
            if (
              event.target === event.currentTarget &&
              event.animationName === "mode-exit"
            )
              setOutgoing(undefined);
          }}
        >
          <PanelActive value={false}>{leaving.children}</PanelActive>
        </div>
      )}
      <div
        // Retain the mobile tray so CSS can interpolate its previous position.
        key={persistent ? "mobile-panel" : mode}
        ref={panel}
        className={`mode-layer mode-incoming${waiting ? " mode-waiting" : ""}`}
        inert={hidden || waiting}
        aria-hidden={hidden || waiting || undefined}
      >
        <PanelActive value={!hidden && !waiting}>{children}</PanelActive>
      </div>
    </>
  );
}
