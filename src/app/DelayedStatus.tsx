import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/** Fast loads stay quiet; slower loads still announce their progress. */
export function DelayedStatus({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 150);
    return () => clearTimeout(timer);
  }, []);
  return visible ? <span role="status">{children}</span> : null;
}
