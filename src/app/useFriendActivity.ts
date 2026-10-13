import { useEffect, useRef, useState } from "react";
import type {
  CommunityClient,
  FriendActivityPage,
} from "../services/community";

/** Read each bounded page so alphabetical previews include the whole circle. */
export async function readFriendActivity(
  api: CommunityClient,
  date: string,
  signal: AbortSignal,
) {
  let page = await api.request<FriendActivityPage>(
    `friends/activity?date=${date}`,
    "GET",
    undefined,
    signal,
  );
  const seen = new Set<string>();
  while (page.cursor) {
    if (seen.has(page.cursor))
      throw new Error("Couldn’t load all friend activity. Please retry.");
    seen.add(page.cursor);
    const next = await api.request<FriendActivityPage>(
      `friends/activity?date=${date}&cursor=${encodeURIComponent(page.cursor)}`,
      "GET",
      undefined,
      signal,
    );
    page = {
      ...next,
      friends: [
        ...new Map(
          [...page.friends, ...next.friends].map((friend) => [
            friend.player.id,
            friend,
          ]),
        ).values(),
      ],
    };
  }
  return page;
}
export function useFriendActivity(
  api: CommunityClient,
  date: string,
  enabled: boolean,
  syncStatus?: string,
  refreshKey?: unknown,
) {
  const [page, setPage] = useState<FriendActivityPage>();
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    if (!enabled) {
      setPage(undefined);
      return;
    }
    const abort = new AbortController(),
      current = ++request.current;
    setLoading(true);
    setFailure("");
    void readFriendActivity(api, date, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted && current === request.current)
          setPage(value);
      })
      .catch((error) => {
        if (!abort.signal.aborted && current === request.current) {
          setPage(undefined);
          setFailure(
            error instanceof Error
              ? error.message
              : "Couldn’t load friend activity.",
          );
        }
      })
      .finally(() => {
        if (!abort.signal.aborted && current === request.current)
          setLoading(false);
      });
    return () => abort.abort();
  }, [api, date, enabled, syncStatus, refreshKey, revision]);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (!document.hidden) setRevision((value) => value + 1);
    };
    addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled]);
  return {
    page: enabled && page?.date === date ? page : undefined,
    failure,
    loading,
    refresh: () => setRevision((value) => value + 1),
  };
}
