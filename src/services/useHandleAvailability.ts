import { useEffect, useState } from "react";
import type { CommunityClient, HandleAvailability } from "./community";

export function useHandleAvailability(
  api: CommunityClient,
  handle: string,
  current: string | undefined,
  enabled: boolean,
) {
  const [result, setResult] = useState<{
    handle: string;
    state: "checking" | "available" | "taken" | "offline";
    suggestions: string[];
  }>();
  useEffect(() => {
    setResult(undefined);
    if (
      !enabled ||
      !/^[a-z][a-z0-9_]{2,23}$/.test(handle) ||
      handle === current
    )
      return;
    const abort = new AbortController();
    setResult({ handle, state: "checking", suggestions: [] });
    const timer = setTimeout(() => {
      void api
        .request<HandleAvailability>(
          `handles/${encodeURIComponent(handle)}`,
          "GET",
          undefined,
          abort.signal,
        )
        .then((value) => {
          if (!abort.signal.aborted)
            setResult({
              handle,
              state: value.available ? "available" : "taken",
              suggestions: value.suggestions,
            });
        })
        .catch(() => {
          if (!abort.signal.aborted)
            setResult({ handle, state: "offline", suggestions: [] });
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [api, handle, current, enabled]);
  return result?.handle === handle ? result : undefined;
}
