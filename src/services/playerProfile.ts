import { useEffect, useRef, useState } from "react";
import { createCommunityClient } from "./community";
import type { AccountProfile } from "./community";
import {
  cachedProfile,
  loadPlayerProfile,
  PROFILE_CHANGED,
} from "./playerProfileCache";
export { publishProfile } from "./playerProfileCache";

/** Header identity follows saved profiles, never unsaved form drafts. */
export function usePlayerProfile(
  subject: string | undefined,
  accessToken: () => Promise<string | undefined>,
) {
  const [profile, setProfile] = useState<AccountProfile | null>(() =>
    subject ? (cachedProfile(subject)?.profile ?? null) : null,
  );
  const token = useRef(accessToken);
  token.current = accessToken;
  useEffect(() => {
    setProfile(subject ? (cachedProfile(subject)?.profile ?? null) : null);
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
    void loadPlayerProfile(
      subject,
      createCommunityClient(() => token.current()),
    )
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
