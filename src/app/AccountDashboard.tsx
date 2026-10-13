import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { CommunityError, createCommunityClient } from "../services/community";
import { AVATARS, FLAG_AVATARS, ProfileAvatar } from "./ProfileAvatar";
import {
  cachedProfile,
  loadPlayerProfile,
  publishProfile,
} from "../services/playerProfileCache";
import type {
  AccountProfile,
  CommunityClient,
  Friendship,
  PlayerProfile,
} from "../services/community";
import { useAccount } from "../services/accounts";
import { emptyDaily } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import { emptyStudy } from "../study/engine";
import type { StudySave } from "../study/engine";
import { accountProgress } from "./accountProgress";
import { useHandleAvailability } from "../services/useHandleAvailability";
import { FriendsPanel } from "./FriendsPanel";
import { accountIntent } from "./accountNavigation";
import type { AccountIntent, ComparisonTarget } from "./accountNavigation";
import "./account.css";

const newProfile = (id: string): AccountProfile => ({
  id,
  displayName: "",
  handle: "",
  avatar: "globe",
  favoriteRegion: "",
  bio: "",
  shareJourneyScores: true,
  presets: [],
  revision: 0,
});
function Avatar({
  player,
}: {
  player: Pick<PlayerProfile, "avatar" | "displayName">;
}) {
  return (
    <ProfileAvatar
      avatar={player.avatar}
      label={`${player.displayName || "Your"} avatar`}
    />
  );
}
export function AccountDashboard({
  subject,
  email,
  daily = emptyDaily,
  study = emptyStudy,
  client: suppliedClient,
  sync,
  onSignOut,
  busy = false,
  intent: suppliedIntent,
  defaultComparison,
}: {
  defaultComparison?: ComparisonTarget | null;
  intent?: AccountIntent;
  subject: string;
  email?: string;
  daily?: DailyProgress;
  study?: StudySave;
  client?: CommunityClient;
  sync?: { status: string; message: string; retry(): void };
  onSignOut?(): void;
  busy?: boolean;
}) {
  const intent = useMemo(
    () => suppliedIntent ?? accountIntent(location.pathname + location.search),
    [suppliedIntent],
  );
  const account = useAccount(),
    token = useRef(account.accessToken);
  token.current = account.accessToken;
  const api = useMemo(
    () => suppliedClient ?? createCommunityClient(() => token.current()),
    [suppliedClient],
  );
  const initialProfile = !suppliedClient ? cachedProfile(subject) : undefined;
  const [profile, setProfile] = useState<AccountProfile | null>(
    () => initialProfile?.profile ?? null,
  );
  const [draft, setDraft] = useState(
    () => initialProfile?.profile ?? newProfile(subject),
  );
  const [editingProfile, setEditingProfile] = useState(false);
  const dirty = useRef(false);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [comparisonFocus, setComparisonFocus] = useState(!!intent.comparison);
  const consumeComparisonFocus = useCallback(
    () => setComparisonFocus(false),
    [],
  );
  const [relationshipsLoaded, setRelationshipsLoaded] = useState(false);
  const [friendsError, setFriendsError] = useState("");
  const [tab, setTab] = useState(() => intent.tab ?? "dashboard"),
    [loading, setLoading] = useState(!initialProfile),
    [working, setWorking] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [available, setAvailable] = useState(!!initialProfile);
  const [handleCollision, setHandleCollision] = useState<{
    handle: string;
    suggestions: string[];
  }>();
  const controller = useRef<AbortController | undefined>(undefined);
  const metrics = accountProgress(daily, study);
  useEffect(() => {
    setTab(intent.tab ?? "dashboard");
    setComparisonFocus(!!intent.comparison);
  }, [intent]);
  async function load(signal?: AbortSignal, force = true) {
    const value = suppliedClient
      ? await api.request<AccountProfile | null>(
          "profile",
          "GET",
          undefined,
          signal,
        )
      : await loadPlayerProfile(subject, api, force);
    if (signal?.aborted) return;
    setProfile(value);
    if (!dirty.current) setDraft(value ?? newProfile(subject));
    setAvailable(true);
    setFriendsError("");
    // A social-service failure must not prevent editing a profile.
    try {
      const relationships = await api.request<Friendship[]>(
        "friends",
        "GET",
        undefined,
        signal,
      );
      if (!signal?.aborted) setFriends(relationships);
    } catch {
      if (!signal?.aborted)
        setFriendsError(
          "Couldn’t load your friends. Please refresh your account.",
        );
    } finally {
      if (!signal?.aborted) setRelationshipsLoaded(true);
    }
  }
  useEffect(() => {
    const abort = new AbortController();
    controller.current = abort;
    const cached = !suppliedClient ? cachedProfile(subject) : undefined;
    setLoading(!cached);
    setAvailable(!!cached);
    setError("");
    void load(abort.signal, false)
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Couldn’t load your account.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
    // A dashboard owns its requests until the account or client changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, api]);
  async function perform(
    action: () => Promise<unknown>,
    message: string,
    reload = true,
  ) {
    if (working) return false;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (controller.current?.signal.aborted) return false;
      if (reload) await load(controller.current?.signal);
      setNotice(message);
      return true;
    } catch (e) {
      if (!controller.current?.signal.aborted)
        setError(e instanceof Error ? e.message : "Please try again.");
      return false;
    } finally {
      setWorking(false);
    }
  }
  const friendAction = (id: string, action: string) =>
    perform(
      () =>
        api.request(`friends/${encodeURIComponent(id)}`, "PATCH", { action }),
      "Your friends list is updated.",
    );
  const saveProfile = (value: AccountProfile) =>
    api.request<AccountProfile>("profile", "PATCH", value);
  const submitProfile = (e: FormEvent) => {
    e.preventDefault();
    void perform(
      async () => {
        let saved: AccountProfile;
        try {
          saved = await saveProfile(draft);
        } catch (error) {
          if (error instanceof CommunityError && error.field === "handle")
            setHandleCollision({
              handle: draft.handle,
              suggestions: error.suggestions,
            });
          throw error;
        }
        if (controller.current?.signal.aborted) return;
        setProfile(saved);
        setDraft(saved);
        dirty.current = false;
        if (!suppliedClient) publishProfile(subject, saved);
        setEditingProfile(false);
        if (intent.friend) setTab("friends");
      },
      "Your profile is saved.",
      false,
    );
  };
  const disabled = working || loading || busy || !available;
  const handleAvailability = useHandleAvailability(
    api,
    draft.handle,
    profile?.handle,
    tab === "profile" && (!profile || editingProfile) && available,
  );
  const takenHandle =
    handleCollision?.handle === draft.handle
      ? handleCollision
      : handleAvailability?.state === "taken"
        ? handleAvailability
        : undefined;
  return (
    <section
      className="info-view account-dashboard"
      aria-label="Account dashboard"
    >
      <div className="account-heading">
        <Avatar player={profile ?? draft} />
        <div>
          <span className="overline">YOUR CORNER OF THE WORLD</span>
          <h1 className="editorial-heading">
            {profile ? (
              <>
                Hello, <em>{profile.displayName}.</em>
              </>
            ) : loading ? (
              <>
                Opening your <em>account.</em>
              </>
            ) : (
              <>
                Make yourself <em>at home.</em>
              </>
            )}
          </h1>
          {profile && <p className="account-handle">@{profile.handle}</p>}
        </div>
      </div>
      <nav className="account-tabs" aria-label="Account sections">
        {["dashboard", "profile", "friends"].map((value) => (
          <button
            key={value}
            className={tab === value ? "selected" : ""}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              setComparisonFocus(false);
              setTab(value);
              if (available) setError("");
              setNotice("");
            }}
          >
            {value[0].toUpperCase() + value.slice(1)}
            {value === "friends" && friends.some((f) => f.status === "incoming")
              ? " · New"
              : ""}
          </button>
        ))}
      </nav>
      {loading && <p role="status">Opening your account…</p>}
      {error && (
        <div className="account-message" role="alert">
          <p>{error}</p>
          <button
            className="quiet-button tertiary-action"
            disabled={working}
            onClick={() =>
              void perform(
                () => load(controller.current?.signal),
                "Account refreshed.",
                false,
              )
            }
          >
            Refresh account
          </button>
        </div>
      )}
      {notice && (
        <p className="account-message" role="status">
          {notice}
        </p>
      )}
      {!loading && available && !profile && tab !== "profile" && (
        <div className="account-callout">
          <p>
            Choose a name and handle to make your profile and connect with
            friends.
          </p>
          <button
            className="quiet-button tertiary-action"
            onClick={() => setTab("profile")}
          >
            Create your profile →
          </button>
        </div>
      )}
      {tab === "dashboard" && (
        <>
          <dl className="account-stats">
            <div>
              <dt>Journey streak</dt>
              <dd>
                {metrics.streak}
                <small> days</small>
              </dd>
            </div>
            <div>
              <dt>Journeys finished</dt>
              <dd>{metrics.journeys.length}</dd>
            </div>
            <div>
              <dt>Study sessions completed</dt>
              <dd>{metrics.sessions}</dd>
            </div>
            <div>
              <dt>Study accuracy</dt>
              <dd>
                {metrics.accuracy === undefined ? "—" : `${metrics.accuracy}%`}
                <small>{metrics.questions} answers</small>
              </dd>
            </div>
          </dl>
        </>
      )}
      {tab === "profile" && (
        <div
          className={`account-profile-layout${editingProfile || !profile ? " is-editing" : ""}`}
        >
          {!profile && loading ? (
            <p className="muted">Opening your profile…</p>
          ) : profile && !editingProfile ? (
            <article className="profile-card" aria-label="Your profile">
              <header>
                <Avatar player={profile} />
                <div>
                  <span className="overline">EXPLORER</span>
                  <h2>{profile.displayName}</h2>
                  <p className="account-handle">@{profile.handle}</p>
                </div>
                <button
                  className="quiet-button profile-edit-button"
                  aria-label="Edit profile"
                  title="Edit profile"
                  onClick={() => {
                    dirty.current = false;
                    setDraft(profile);
                    setEditingProfile(true);
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-4-4L4 15Z" />
                  </svg>
                </button>
              </header>
              <p className="profile-bio">
                {profile.bio || "A curious mind. A world to explore."}
              </p>
              <dl className="profile-card-details">
                <div>
                  <dt>Favorite place</dt>
                  <dd>{profile.favoriteRegion || "Still exploring"}</dd>
                </div>
                <div>
                  <dt>Journeys finished</dt>
                  <dd>{metrics.journeys.length}</dd>
                </div>
              </dl>
            </article>
          ) : (
            <form
              className="profile-form"
              onSubmit={submitProfile}
              onChange={() => {
                dirty.current = true;
              }}
            >
              <header className="profile-form-heading">
                <h2>Make it yours.</h2>
                <p className="muted">Choose how you appear around Ambit.</p>
                {profile && (
                  <button
                    type="button"
                    className="quiet-button profile-edit-cancel"
                    onClick={() => {
                      setDraft(profile);
                      dirty.current = false;
                      setEditingProfile(false);
                    }}
                  >
                    ← Back to profile
                  </button>
                )}
              </header>
              <div className="profile-fields">
                <label className="field">
                  <span>Display name</span>
                  <input
                    autoComplete="nickname"
                    maxLength={40}
                    required
                    value={draft.displayName}
                    onChange={(e) =>
                      setDraft({ ...draft, displayName: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Handle</span>
                  <input
                    aria-label="Handle"
                    aria-describedby="handle-help handle-availability"
                    aria-invalid={!!takenHandle}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}"
                    maxLength={24}
                    required
                    value={draft.handle}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        handle: e.target.value.toLowerCase(),
                      })
                    }
                  />
                  <small id="handle-help">
                    3–24 letters, numbers or underscores. Friends can find you
                    by this handle.
                  </small>
                  <div
                    id="handle-availability"
                    className="handle-availability"
                    role="status"
                    aria-live="polite"
                  >
                    {takenHandle ? (
                      <>
                        <span>That handle is already in use.</span>
                        <div className="handle-suggestions">
                          {takenHandle.suggestions.map((suggestion) => (
                            <button
                              type="button"
                              key={suggestion}
                              onClick={() =>
                                setDraft({ ...draft, handle: suggestion })
                              }
                            >
                              @{suggestion}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : handleAvailability?.state === "checking" ? (
                      "Checking availability…"
                    ) : handleAvailability?.state === "available" ? (
                      "This handle is available."
                    ) : handleAvailability?.state === "offline" ? (
                      "Availability couldn’t be checked. Saving will check again."
                    ) : null}
                  </div>
                </label>
              </div>
              <fieldset className="avatar-picker">
                <legend>Choose your avatar</legend>
                <div className="avatar-options">
                  {Object.entries(AVATARS)
                    .filter(([, preset]) => !preset.hidden)
                    .map(([value, preset]) => (
                      <label
                        key={value}
                        className={`${draft.avatar === value ? "chosen" : ""} ${preset.image && !__AVATAR_IMAGES__.includes(preset.image) ? "avatar-pending" : ""}`}
                      >
                        <input
                          type="radio"
                          name="avatar"
                          value={value}
                          checked={draft.avatar === value}
                          disabled={
                            !!preset.image &&
                            !__AVATAR_IMAGES__.includes(preset.image)
                          }
                          onChange={() =>
                            setDraft({
                              ...draft,
                              avatar: value as AccountProfile["avatar"],
                            })
                          }
                        />
                        {preset.image &&
                        !__AVATAR_IMAGES__.includes(preset.image) ? (
                          <span className="avatar-slot" aria-hidden="true">
                            {value.slice(-2)}
                          </span>
                        ) : (
                          <ProfileAvatar
                            avatar={value as AccountProfile["avatar"]}
                            label={preset.label}
                          />
                        )}
                        <small>{preset.label}</small>
                      </label>
                    ))}
                </div>
                {!__AVATAR_IMAGES__.length && (
                  <p className="muted avatar-coming-soon">
                    More avatars are coming soon. Choose a flag below.
                  </p>
                )}
                <label className="field flag-avatar-choice">
                  <span>Or use a country flag</span>
                  <div className="flag-avatar-select">
                    <ProfileAvatar avatar={draft.avatar} />
                    <select
                      aria-label="Country flag avatar"
                      value={
                        draft.avatar.startsWith("flag:") ? draft.avatar : ""
                      }
                      onChange={(event) => {
                        if (event.target.value)
                          setDraft({
                            ...draft,
                            avatar: event.target
                              .value as AccountProfile["avatar"],
                          });
                      }}
                    >
                      <option value="">Choose a country</option>
                      {FLAG_AVATARS.map((country) => (
                        <option key={country.id} value={`flag:${country.id}`}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </fieldset>
              <label className="field">
                <span>
                  Favorite place or region <small>Optional</small>
                </span>
                <input
                  maxLength={60}
                  value={draft.favoriteRegion}
                  onChange={(e) =>
                    setDraft({ ...draft, favoriteRegion: e.target.value })
                  }
                  placeholder="The Mediterranean"
                />
              </label>
              <label className="field">
                <span>
                  A little about you <small>Optional · 160 characters</small>
                </span>
                <textarea
                  maxLength={160}
                  rows={3}
                  value={draft.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  placeholder="What sparks your curiosity?"
                />
              </label>
              <button
                className="primary-button"
                disabled={disabled || !!takenHandle}
              >
                Save profile
              </button>
            </form>
          )}
          <aside className="account-profile-aside" aria-label="Account details">
            <section className="account-login-details">
              <h2>Your account</h2>
              {email && (
                <p className="account-email">
                  {email}
                  <small>Only you can see your email.</small>
                </p>
              )}
              {onSignOut && (
                <button
                  className="quiet-button tertiary-action"
                  disabled={busy}
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              )}
            </section>
          </aside>
        </div>
      )}
      {tab === "friends" && (
        <FriendsPanel
          defaultComparison={defaultComparison}
          intent={intent}
          focusComparison={comparisonFocus}
          onComparisonFocused={consumeComparisonFocus}
          daily={daily}
          sync={sync}
          api={api}
          friends={friends}
          relationshipsLoaded={relationshipsLoaded}
          player={profile}
          disabled={disabled}
          error={friendsError}
          onAction={friendAction}
          onRefresh={async () => {
            try {
              const value = await api.request<Friendship[]>(
                "friends",
                "GET",
                undefined,
                controller.current?.signal,
              );
              if (!controller.current?.signal.aborted) {
                setFriends(value);
                setFriendsError("");
              }
            } catch (error) {
              if (!controller.current?.signal.aborted)
                setFriendsError(
                  "Couldn’t load your friends. Please refresh your account.",
                );
              throw error;
            }
          }}
          onRequest={(handle) =>
            perform(
              () => api.request("friends", "POST", { handle }),
              "Friend request sent.",
            )
          }
        />
      )}
      {sync && (sync.status === "offline" || sync.status === "error") && (
        <div className="account-message" role="status">
          <p role="status" className="muted">
            {sync.message}
          </p>
          <button className="quiet-button tertiary-action" onClick={sync.retry}>
            Retry sync
          </button>
        </div>
      )}
    </section>
  );
}
