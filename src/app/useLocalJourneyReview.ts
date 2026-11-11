import { startTransition, useEffect, useRef, useState } from "react";
import type { JourneyReviewSource } from "./journeyReview";

/** Local source loading feeds the same app and globe as registered Admin Review. */
export function useLocalJourneyReview(
  path: string,
  navigate: (path: string) => void,
) {
  const active =
    import.meta.env.DEV && path.split(/[?#]/)[0] === "/review/journeys.html";
  const navigation = useRef(navigate);
  navigation.current = navigate;
  const [loaded, setLoaded] = useState<{
    path: string;
    source: JourneyReviewSource;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    if (!active) return;
    let live = true;
    setError("");
    if (import.meta.env.DEV)
      void import("../../review/source")
        .then(({ loadReviewSource }) =>
          loadReviewSource(path, (url) => navigation.current(url)),
        )
        .then((source) => {
          if (live) startTransition(() => setLoaded({ path, source }));
        })
        .catch((failure) => {
          if (live)
            setError(
              failure instanceof Error
                ? failure.message
                : "Couldn’t open this Journey.",
            );
        });
    return () => {
      live = false;
    };
  }, [active, path]);
  return {
    active,
    source: active ? loaded?.source : undefined,
    pending: active && loaded?.path !== path && !error,
    error: active ? error : "",
  };
}
