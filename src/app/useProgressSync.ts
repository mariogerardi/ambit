import { useEffect, useRef, useState } from "react";
import { ProgressSync } from "../services/progressSync";
import type { SyncStatus, SyncStore } from "../services/progressSync";

export function useProgressSync(
  subject: string | undefined,
  daily: SyncStore | undefined,
  study: SyncStore,
  accessToken: () => Promise<string | undefined>,
) {
  const token = useRef(accessToken);
  token.current = accessToken;
  const sync = useRef<ProgressSync | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<{ status: SyncStatus; message: string }>({
    status: "syncing",
    message: "Preparing to sync your progress…",
  });
  useEffect(() => {
    if (!subject || !daily) return;
    const client = new ProgressSync(
      { daily, study },
      () => token.current(),
      (status, message) => setState({ status, message }),
      undefined,
      () => setHydrated(true),
    );
    sync.current = client;
    client.start();
    return () => {
      client.stop();
      sync.current = undefined;
    };
  }, [subject, daily, study]);
  return {
    ...state,
    hydrated: !subject || hydrated,
    ready: !subject || hydrated || state.status !== "syncing",
    retry: () => sync.current?.schedule(0),
  };
}
