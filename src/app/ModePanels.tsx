import { createContext, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
export const PanelActive = createContext(true);
export function ModePanels({
  mode,
  reduced,
  children,
  hidden = false,
  scrollKey,
}: {
  mode: string;
  reduced: boolean;
  children: ReactNode;
  hidden?: boolean;
  scrollKey?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [mode, scrollKey]);
  const previous = useRef({ mode, children });
  const [outgoing, setOutgoing] = useState<ReactNode>();
  useLayoutEffect(() => {
    if (previous.current.mode !== mode && !reduced)
      setOutgoing(previous.current.children);
    previous.current = { mode, children };
  }, [mode, children, reduced]);
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
        key={mode}
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
