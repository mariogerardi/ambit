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
  initialPage?: FriendActivityPage,
) {
  let page =
    initialPage?.date === date
      ? initialPage
      : await api.request<FriendActivityPage>(
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
  initialPage?: FriendActivityPage,
) {
  const [response, setResponse] = useState<{
    api: CommunityClient;
    page?: FriendActivityPage;
  }>(() => ({ api, page: initialPage?.cursor ? undefined : initialPage }));
  const page = response.api === api ? response.page : undefined;
  const [failure, setFailure] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const request = useRef(0);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const abort = new AbortController(),
      current = ++request.current;
    setLoading(true);
    setFailure("");
    void readFriendActivity(api, date, abort.signal, initialPage)
      .then((value) => {
        if (!abort.signal.aborted && current === request.current)
          setResponse({ api, page: value });
      })
      .catch((error) => {
        if (!abort.signal.aborted && current === request.current) {
          setResponse({ api });
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
  }, [
    api,
    date,
    enabled,
    initialPage ? undefined : syncStatus,
    refreshKey,
    revision,
    initialPage,
  ]);
  useEffect(() => {
    if (!enabled || initialPage) return;
    const refresh = () => {
      if (!document.hidden) setRevision((value) => value + 1);
    };
    addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [enabled, initialPage]);
  return {
    page: page?.date === date ? page : undefined,
    failure,
    loading,
    refresh: () => setRevision((value) => value + 1),
  };
}
