// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cachedProfile,
  clearProfileCache,
  loadPlayerProfile,
  publishProfile,
} from "../src/services/playerProfileCache";
import type {
  AccountProfile,
  CommunityClient,
} from "../src/services/community";

const alice: AccountProfile = {
  id: "a",
  displayName: "Alice",
  handle: "alice",
  avatar: "flag:wurl:CAN",
  favoriteRegion: "",
  bio: "",
  shareJourneyScores: false,
  presets: [],
  revision: 1,
};
beforeEach(() => clearProfileCache());
afterEach(() => {
  clearProfileCache();
  vi.useRealTimers();
});
function client(request: ReturnType<typeof vi.fn>) {
  return { request } as CommunityClient;
}

it("shares concurrent reads and reuses fresh profiles without crossing accounts", async () => {
  const request = vi.fn(async () => alice),
    api = client(request);
  const [header, dashboard] = await Promise.all([
    loadPlayerProfile("a", api),
    loadPlayerProfile("a", api),
  ]);
  expect(header).toEqual(dashboard);
  await loadPlayerProfile("a", api);
  expect(request).toHaveBeenCalledTimes(1);
  expect(cachedProfile("b")).toBeUndefined();
});
it("keeps a stale profile visible while a background refresh is pending", async () => {
  vi.useFakeTimers();
  publishProfile("a", alice);
  vi.advanceTimersByTime(6 * 60 * 1000);
  let resolve!: (value: AccountProfile) => void;
  const request = vi.fn(
    () =>
      new Promise<AccountProfile>((done) => {
        resolve = done;
      }),
  );
  const refresh = loadPlayerProfile("a", client(request));
  expect(cachedProfile("a")?.profile?.handle).toBe("alice");
  resolve({ ...alice, handle: "new_alice", revision: 2 });
  await refresh;
  expect(cachedProfile("a")?.profile?.handle).toBe("new_alice");
});
it("does not replace a newly saved profile with an older read", async () => {
  let resolve!: (value: AccountProfile) => void;
  const request = vi.fn(
    () =>
      new Promise<AccountProfile>((done) => {
        resolve = done;
      }),
  );
  const refresh = loadPlayerProfile("a", client(request));
  publishProfile("a", { ...alice, handle: "saved_alice", revision: 2 });
  resolve(alice);
  expect((await refresh)?.handle).toBe("saved_alice");
  expect(cachedProfile("a")?.profile?.handle).toBe("saved_alice");
});
it("clears stored identity on sign-out and ignores a late request", async () => {
  publishProfile("a", alice);
  let resolve!: (value: AccountProfile) => void;
  const request = vi.fn(
    () =>
      new Promise<AccountProfile>((done) => {
        resolve = done;
      }),
  );
  const refresh = loadPlayerProfile("a", client(request), true);
  clearProfileCache();
  resolve(alice);
  await refresh;
  expect(cachedProfile("a")).toBeUndefined();
  expect(sessionStorage.getItem("ambit:profile:v1:a")).toBeNull();
});
