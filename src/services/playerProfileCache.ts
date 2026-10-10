import type { AccountProfile, CommunityClient } from "./community";

const PREFIX = "ambit:profile:v1:";
const FRESH_FOR = 5 * 60 * 1000;
const cache = new Map<
  string,
  { profile: AccountProfile | null; updatedAt: number }
>();
const pending = new Map<string, Promise<AccountProfile | null>>();
const revisions = new Map<string, number>();
let epoch = 0;
export const PROFILE_CHANGED = "ambit:profile-changed";

export function cachedProfile(subject: string) {
  if (!cache.has(subject)) {
    try {
      const value = JSON.parse(
        sessionStorage.getItem(PREFIX + subject) ?? "null",
      );
      if (
        value &&
        typeof value.updatedAt === "number" &&
        (value.profile === null ||
          (value.profile.id === subject &&
            typeof value.profile.handle === "string" &&
            typeof value.profile.avatar === "string" &&
            Array.isArray(value.profile.presets)))
      )
        cache.set(subject, value);
    } catch {
      /* Storage is optional. */
    }
  }
  return cache.get(subject);
}

export function publishProfile(
  subject: string,
  profile: AccountProfile | null,
) {
  const value = { profile, updatedAt: Date.now() };
  cache.set(subject, value);
  revisions.set(subject, (revisions.get(subject) ?? 0) + 1);
  try {
    sessionStorage.setItem(PREFIX + subject, JSON.stringify(value));
  } catch {
    /* Keep the memory cache. */
  }
  dispatchEvent(
    new CustomEvent(PROFILE_CHANGED, { detail: { subject, profile } }),
  );
}

export function clearProfileCache() {
  epoch++;
  cache.clear();
  pending.clear();
  revisions.clear();
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(PREFIX)) sessionStorage.removeItem(key);
    }
  } catch {
    /* Storage is optional. */
  }
}

/** Share reads across the header and dashboard; preserve saved edits over late reads. */
export function loadPlayerProfile(
  subject: string,
  api: CommunityClient,
  force = false,
) {
  const value = cachedProfile(subject);
  if (!force && value && Date.now() - value.updatedAt < FRESH_FOR)
    return Promise.resolve(value.profile);
  if (pending.has(subject)) return pending.get(subject)!;
  const started = epoch,
    revision = revisions.get(subject) ?? 0;
  const request = api
    .request<AccountProfile | null>("profile")
    .then((profile) => {
      if (started !== epoch) return null;
      if ((revisions.get(subject) ?? 0) !== revision)
        return cachedProfile(subject)?.profile ?? null;
      publishProfile(subject, profile);
      return profile;
    })
    .finally(() => {
      if (pending.get(subject) === request) pending.delete(subject);
    });
  pending.set(subject, request);
  return request;
}
