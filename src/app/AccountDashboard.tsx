import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createCommunityClient } from "../services/community";
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
  JourneyScore,
  PlayerProfile,
} from "../services/community";
import { useAccount } from "../services/accounts";
import { emptyDaily } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import { emptyStudy } from "../study/engine";
import type { StudySave } from "../study/engine";
import { accountProgress } from "./accountProgress";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import "./account.css";

const newProfile = (id: string): AccountProfile => ({
  id,
  displayName: "",
  handle: "",
  avatar: "globe",
  favoriteRegion: "",
  bio: "",
  shareJourneyScores: false,
  presets: [],
  revision: 0,
});
const titleFor = (id: string) =>
  JOURNEY_INDEX.find((j) => j.id === id)?.title ?? "Journey";
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
}: {
  subject: string;
  email?: string;
  daily?: DailyProgress;
  study?: StudySave;
  client?: CommunityClient;
  sync?: { status: string; message: string; retry(): void };
  onSignOut?(): void;
  busy?: boolean;
}) {
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
  const [friendsError, setFriendsError] = useState("");
  const [tab, setTab] = useState("dashboard"),
    [loading, setLoading] = useState(!initialProfile),
    [working, setWorking] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [handle, setHandle] = useState("");
  const [available, setAvailable] = useState(!!initialProfile);
  const [comparison, setComparison] = useState<{
    friend: Friendship;
    scores: JourneyScore[];
  }>();
  const controller = useRef<AbortController | undefined>(undefined);
  const metrics = accountProgress(daily, study);
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
        const saved = await saveProfile(draft);
        if (controller.current?.signal.aborted) return;
        setProfile(saved);
        setDraft(saved);
        dirty.current = false;
        if (!suppliedClient) publishProfile(subject, saved);
        setEditingProfile(false);
      },
      "Your profile is saved.",
      false,
    );
  };
  const disabled = working || loading || busy || !available;
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
      {tab === "profile" &&
        (!profile && loading ? (
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
                onClick={() => {
                  dirty.current = false;
                  setDraft(profile);
                  setEditingProfile(true);
                }}
              >
                Edit profile <span aria-hidden="true">→</span>
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
              <div>
                <dt>Journey scores</dt>
                <dd>
                  {profile.shareJourneyScores
                    ? "Shared with friends"
                    : "Only you"}
                </dd>
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
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  pattern="[a-zA-Z][a-zA-Z0-9_]{2,23}"
                  maxLength={24}
                  required
                  value={draft.handle}
                  onChange={(e) =>
                    setDraft({ ...draft, handle: e.target.value.toLowerCase() })
                  }
                />
                <small>
                  3–24 letters, numbers or underscores. Friends can find you by
                  this handle.
                </small>
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
                    value={draft.avatar.startsWith("flag:") ? draft.avatar : ""}
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
            <label className="profile-sharing">
              <input
                type="checkbox"
                checked={draft.shareJourneyScores}
                onChange={(e) =>
                  setDraft({ ...draft, shareJourneyScores: e.target.checked })
                }
              />
              <span>
                Share completed Journey scores with friends
                <small>
                  Only accepted friends can see score totals. Your answers and
                  email stay private.
                </small>
              </span>
            </label>
            <button className="primary-button" disabled={disabled}>
              Save profile
            </button>
          </form>
        ))}
      {tab === "friends" && (
        <>
          {friendsError && <p role="alert">{friendsError}</p>}
          <h2>A little company for the Journey.</h2>
          <p className="muted">
            Send a request using your friend’s exact handle.
          </p>
          <form
            className="account-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(
                () =>
                  api.request("friends", "POST", {
                    handle: handle.trim().replace(/^@/, "").toLowerCase(),
                  }),
                "Friend request sent.",
              ).then((ok) => {
                if (ok) setHandle("");
              });
            }}
          >
            <label className="field">
              Friend’s handle
              <input
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={25}
                required
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@fellow_explorer"
              />
            </label>
            <button
              className="primary-button"
              disabled={disabled || !profile || !handle.trim()}
            >
              Send request
            </button>
          </form>
          {!friends.length && !friendsError && (
            <p className="muted">
              No friends yet. Invite someone you know to make an Ambit profile.
            </p>
          )}
          <ul className="account-list friend-list">
            {friends.map((friend) => (
              <li key={friend.id}>
                <Avatar
                  player={
                    friend.player ?? { avatar: "globe", displayName: "Player" }
                  }
                />
                <div>
                  <strong>{friend.player?.displayName ?? "Player"}</strong>
                  <small>
                    @{friend.player?.handle ?? "unavailable"} ·{" "}
                    {friend.status === "accepted"
                      ? "Friend"
                      : friend.status === "incoming"
                        ? "Wants to be friends"
                        : friend.status === "outgoing"
                          ? "Request sent"
                          : "Blocked"}
                  </small>
                  {friend.player?.favoriteRegion && (
                    <small>{friend.player.favoriteRegion}</small>
                  )}
                  {friend.player?.bio && (
                    <p className="muted">{friend.player.bio}</p>
                  )}
                </div>
                <div className="account-row-actions">
                  {friend.status === "incoming" && (
                    <>
                      <button
                        disabled={disabled}
                        onClick={() => void friendAction(friend.id, "accept")}
                      >
                        Accept
                      </button>
                      <button
                        disabled={disabled}
                        onClick={() => void friendAction(friend.id, "decline")}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {friend.status === "outgoing" && (
                    <button
                      disabled={disabled}
                      onClick={() => void friendAction(friend.id, "cancel")}
                    >
                      Cancel request
                    </button>
                  )}
                  {friend.status === "accepted" && (
                    <>
                      <button
                        disabled={disabled}
                        onClick={() =>
                          void perform(
                            async () => {
                              const scores = await api.request<JourneyScore[]>(
                                `friends/${encodeURIComponent(friend.id)}/journeys`,
                              );
                              setComparison({ friend, scores });
                            },
                            "",
                            false,
                          )
                        }
                      >
                        Compare Journeys
                      </button>

                      <button
                        disabled={disabled}
                        onClick={() => void friendAction(friend.id, "remove")}
                      >
                        Remove
                      </button>
                    </>
                  )}
                  {friend.status !== "blocked" ? (
                    <button
                      disabled={disabled}
                      onClick={() => void friendAction(friend.id, "block")}
                    >
                      Block
                    </button>
                  ) : (
                    <button
                      disabled={disabled}
                      onClick={() => void friendAction(friend.id, "unblock")}
                    >
                      Unblock
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {comparison && (
            <div className="account-comparison">
              <h2>
                You and {comparison.friend.player?.displayName ?? "your friend"}
              </h2>
              <p className="muted">
                Completed Journey totals, without answer spoilers.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Journey</th>
                    <th>You</th>
                    <th>{comparison.friend.player?.displayName ?? "Friend"}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.scores.map((score) => {
                    const yours = metrics.journeys.find(
                      (j) =>
                        j.date === score.date &&
                        j.journeyId === score.journeyId,
                    );
                    return (
                      <tr key={`${score.date}/${score.journeyId}`}>
                        <td>
                          {titleFor(score.journeyId)}
                          <small>{score.date}</small>
                        </td>
                        <td>
                          {yours ? `${yours.correct}/${yours.total}` : "—"}
                        </td>
                        <td>
                          {score.correct}/{score.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!comparison.scores.length && (
                <p className="muted">
                  Your friend hasn’t completed a Journey yet.
                </p>
              )}
            </div>
          )}
        </>
      )}
      <footer className="account-footer">
        <p className="muted">
          {email} <span>· Only you can see your email.</span>
        </p>
        {sync && (
          <>
            <p role="status" className="muted">
              {sync.message}
            </p>
            {(sync.status === "offline" || sync.status === "error") && (
              <button
                className="quiet-button tertiary-action"
                onClick={sync.retry}
              >
                Retry sync
              </button>
            )}
          </>
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
      </footer>
    </section>
  );
}
