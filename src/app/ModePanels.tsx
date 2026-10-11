import { createContext, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
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
  const [outgoing, setOutgoing] = useState<ReactNode>();
  useLayoutEffect(() => {
    if (previous.current.mode !== mode)
      setOutgoing(
        !reduced &&
          !page &&
          !previous.current.page &&
          previous.current.animateExit
          ? previous.current.children
          : undefined,
      );
    previous.current = { mode, children, page, animateExit };
  }, [mode, children, reduced, page, animateExit]);
  useLayoutEffect(() => {
    if (!outgoing) return;
    const timer = setTimeout(() => setOutgoing(undefined), 220);
    return () => clearTimeout(timer);
  }, [outgoing]);
  return (
    <>
      {!reduced && outgoing && (
        <div className="mode-layer mode-outgoing" inert aria-hidden="true">
          <PanelActive value={false}>{outgoing}</PanelActive>
        </div>
      )}
      <div
        // Retain the mobile tray so CSS can interpolate its previous position.
        key={persistent ? "mobile-panel" : mode}
        ref={panel}
        className="mode-layer mode-incoming"
        inert={hidden}
        aria-hidden={hidden || undefined}
      >
        <PanelActive value={!hidden}>{children}</PanelActive>
      </div>
    </>
  );
}
