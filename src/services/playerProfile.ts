import { useEffect, useRef, useState } from "react";
import { createCommunityClient } from "./community";
import type { AccountProfile } from "./community";

const PROFILE_CHANGED = "ambit:profile-changed";
export function publishProfile(
  subject: string,
  profile: AccountProfile | null,
) {
  dispatchEvent(
    new CustomEvent(PROFILE_CHANGED, { detail: { subject, profile } }),
  );
}

/** Header identity follows saved profiles, never unsaved form drafts. */
export function usePlayerProfile(
  subject: string | undefined,
  accessToken: () => Promise<string | undefined>,
) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const token = useRef(accessToken);
  token.current = accessToken;
  useEffect(() => {
    setProfile(null);
    if (!subject) return;
    const abort = new AbortController();
    let updated = false;
    const change = (event: Event) => {
      const value = (
        event as CustomEvent<{
          subject: string;
          profile: AccountProfile | null;
        }>
      ).detail;
      if (value.subject === subject) {
        updated = true;
        setProfile(value.profile);
      }
    };
    addEventListener(PROFILE_CHANGED, change);
    void createCommunityClient(() => token.current())
      .request<AccountProfile | null>("profile", "GET", undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted && !updated) setProfile(value);
      })
      .catch(() => {
        /* Account provides the retry UI; header stays usable. */
      });
    return () => {
      abort.abort();
      removeEventListener(PROFILE_CHANGED, change);
    };
  }, [subject]);
  return profile;
}
