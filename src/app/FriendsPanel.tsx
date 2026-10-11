import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CommunityClient,
  FriendActivity,
  FriendActivityPage,
  Friendship,
  PlayerProfile,
} from "../services/community";
import { ProfileAvatar } from "./ProfileAvatar";
import { localDateKey } from "./dailyProgress";
import { JOURNEY_INDEX } from "../game/journeyRegistry";

const statusLabel = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
};
const titleFor = (id: string) =>
  JOURNEY_INDEX.find((j) => j.id === id)?.title ?? "Journey";
function Identity({ player }: { player: PlayerProfile }) {
  return (
    <>
      <ProfileAvatar
        avatar={player.avatar}
        label={`${player.displayName} avatar`}
      />
      <span className="friend-identity">
        <strong>{player.displayName}</strong>
        <span>@{player.handle}</span>
      </span>
    </>
  );
}
function Stats({ value }: { value: FriendActivity["stats"] }) {
  return (
    <dl className="friend-stats">
      <div>
        <dt>Journey streak</dt>
        <dd>
          {value.journeyStreak}
          <span> days</span>
        </dd>
      </div>
      <div>
        <dt>Journeys finished</dt>
        <dd>{value.journeysCompleted}</dd>
      </div>
      <div>
        <dt>Study sessions</dt>
        <dd>{value.studySessions}</dd>
      </div>
      <div>
        <dt>Study accuracy</dt>
        <dd>
          {value.studyAccuracy === null ? "—" : `${value.studyAccuracy}%`}
        </dd>
      </div>
    </dl>
  );
}
export function FriendsPanel({
  api,
  friends,
  player,
  disabled,
  error,
  onAction,
  onRequest,
  onRefresh,
}: {
  api: CommunityClient;
  friends: Friendship[];
  player: PlayerProfile | null;
  disabled: boolean;
  error: string;
  onAction(id: string, action: string): Promise<unknown>;
  onRequest(handle: string): Promise<boolean>;
  onRefresh?(): Promise<void>;
}) {
  const [page, setPage] = useState<FriendActivityPage>();
  const [selected, setSelected] = useState<FriendActivity>();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [handle, setHandle] = useState(
    () => new URLSearchParams(location.search).get("friend") ?? "",
  );
  const [found, setFound] = useState<PlayerProfile>();
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [today, setToday] = useState(localDateKey);
  const refreshRelationships = useRef(onRefresh);
  refreshRelationships.current = onRefresh;
  const lifetime = useRef<AbortController | undefined>(undefined);
  const activityRequest = useRef(0);
  const profileRequest = useRef(0);
  const lookupRequest = useRef(0);
  const accepted = useMemo(
    () => friends.filter((friend) => friend.status === "accepted"),
    [friends],
  );
  useEffect(() => {
    const abort = new AbortController();
    lifetime.current = abort;
    const refresh = () => {
      setToday(localDateKey());
      if (refreshRelationships.current)
        void refreshRelationships.current().catch(() => {
          /* Parent keeps the friends retry message. */
        });
      else setRevision((v) => v + 1);
    };
    const visible = () => {
      if (!document.hidden) refresh();
    };
    addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    const timer = setInterval(visible, 60000);
    return () => {
      abort.abort();
      clearInterval(timer);
      removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, []);
  useEffect(() => {
    if (
      selected &&
      !accepted.some((friend) => friend.id === selected.player.id)
    ) {
      setSelected(undefined);
      profileRequest.current++;
    }
  }, [accepted, selected]);
  useEffect(() => {
    if (disabled || error) return;
    const abort = new AbortController();
    const request = ++activityRequest.current;
    setLoading(true);
    setFailure("");
    void api
      .request<FriendActivityPage>(
        `friends/activity?date=${today}`,
        "GET",
        undefined,
        abort.signal,
      )
      .then((value) => {
        if (!abort.signal.aborted && request === activityRequest.current) {
          setPage(value);
          setSelected((current) =>
            current
              ? (value.friends.find(
                  (item) => item.player.id === current.player.id,
                ) ?? current)
              : undefined,
          );
        }
      })
      .catch((e: unknown) => {
        if (!abort.signal.aborted)
          setFailure(
            e instanceof Error ? e.message : "Couldn’t load friend activity.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted && request === activityRequest.current)
          setLoading(false);
      });
    return () => abort.abort();
  }, [api, friends, disabled, error, revision, today]);
  async function viewProfile(id: string) {
    const request = ++profileRequest.current;
    setFailure("");
    const cached = page?.friends.find((item) => item.player.id === id);
    if (cached) setSelected(cached);
    try {
      const value = await api.request<FriendActivity>(
        `friends/${encodeURIComponent(id)}/profile?date=${today}`,
        "GET",
        undefined,
        lifetime.current?.signal,
      );
      if (
        !lifetime.current?.signal.aborted &&
        request === profileRequest.current
      )
        setSelected(value);
    } catch (e) {
      if (
        !lifetime.current?.signal.aborted &&
        request === profileRequest.current
      ) {
        setSelected(undefined);
        setFailure(
          e instanceof Error ? e.message : "Couldn’t open this profile.",
        );
      }
    }
  }
  async function more() {
    if (!page?.cursor || loading) return;
    const request = ++activityRequest.current;
    setLoading(true);
    setFailure("");
    try {
      const next = await api.request<FriendActivityPage>(
        `friends/activity?date=${today}&cursor=${encodeURIComponent(page.cursor)}`,
        "GET",
        undefined,
        lifetime.current?.signal,
      );
      if (
        !lifetime.current?.signal.aborted &&
        request === activityRequest.current
      )
        setPage((current) => ({
          ...next,
          friends: [
            ...new Map(
              [...(current?.friends ?? []), ...next.friends].map((item) => [
                item.player.id,
                item,
              ]),
            ).values(),
          ],
        }));
    } catch (e) {
      if (
        !lifetime.current?.signal.aborted &&
        request === activityRequest.current
      )
        setFailure(
          e instanceof Error ? e.message : "Couldn’t load more friends.",
        );
    } finally {
      if (request === activityRequest.current) setLoading(false);
    }
  }
  const activity = (page?.friends ?? []).filter((item) =>
    accepted.some((friend) => friend.id === item.player.id),
  );
  const notices = (
    <>
      {(error || failure) && (
        <p className="account-message" role="alert">
          {error || failure}
        </p>
      )}
      {notice && (
        <p role="status" className="account-message">
          {notice}
        </p>
      )}
    </>
  );
  if (selected)
    return (
      <div className="friends-panel">
        <button
          className="quiet-button tertiary-action"
          onClick={() => {
            profileRequest.current++;
            setSelected(undefined);
          }}
        >
          ← Back to friends
        </button>
        {notices}
        <article
          className="profile-card friend-profile"
          aria-label={`${selected.player.displayName}’s profile`}
        >
          <header>
            <Identity player={selected.player} />
            <details className="friend-manage">
              <summary>Manage friendship</summary>
              <div className="account-row-actions">
                <button
                  disabled={disabled}
                  onClick={() => void onAction(selected.player.id, "remove")}
                >
                  Remove friend
                </button>
                <button
                  disabled={disabled}
                  onClick={() => void onAction(selected.player.id, "block")}
                >
                  Block
                </button>
              </div>
            </details>
          </header>
          <p className="profile-bio">
            {selected.player.bio || "A curious mind. A world to explore."}
          </p>
          {selected.player.favoriteRegion && (
            <p className="muted">
              Favorite place · {selected.player.favoriteRegion}
            </p>
          )}
          <Stats value={selected.stats} />
          <p className={`friend-daily-status status-${selected.today.status}`}>
            Today’s Journey · {statusLabel[selected.today.status]}
            {selected.today.score &&
              ` · ${selected.today.score.correct}/${selected.today.score.total}`}
          </p>
          {selected.today.scoreLocked && (
            <p className="muted">
              Finish the same Journey to reveal their score.
            </p>
          )}
          <section
            className="account-comparison"
            aria-label="Shared Journey results"
          >
            <h3>Your shared Journeys</h3>
            <p className="muted">
              Only Journeys you’ve both finished. Answers stay private.
            </p>
            {selected.journeys.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Journey</th>
                    <th>You</th>
                    <th>{selected.player.displayName}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.journeys.map((score) => {
                    const yours = page?.you.journeys.find(
                      (item) =>
                        item.date === score.date &&
                        item.journeyId === score.journeyId &&
                        item.gameVersion === score.gameVersion,
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
            ) : (
              <p className="muted">
                Shared results will appear after you both finish a Journey.
              </p>
            )}
          </section>
          <p className="friend-data-note">
            Study sessions vary in difficulty, so these stats aren’t ranked.
            Progress updates after syncing.
          </p>
        </article>
      </div>
    );
  return (
    <div className="friends-panel">
      <header className="friends-heading">
        <div>
          <h2>Find your people.</h2>
          <p className="muted">
            Find a player by handle, manage requests, or open a friend’s
            profile.
          </p>
        </div>
        <button
          className="quiet-button friend-refresh"
          disabled={disabled || loading}
          onClick={() => {
            setToday(localDateKey());
            if (onRefresh)
              void onRefresh().catch(() => {
                /* Parent shows the retry message. */
              });
            else setRevision((v) => v + 1);
          }}
        >
          Refresh
        </button>
      </header>
      {notices}
      <section className="friend-add" aria-label="Find a friend">
        <h3>Find a friend</h3>
        <p className="muted">Find a player, then send a request to connect.</p>
        <form
          className="friend-find-form"
          onSubmit={(event) => {
            event.preventDefault();
            const request = ++lookupRequest.current;
            setLookupBusy(true);
            setLookupError("");
            setFound(undefined);
            void api
              .request<PlayerProfile>(
                `players/${encodeURIComponent(handle.trim().replace(/^@/, "").toLowerCase())}`,
                "GET",
                undefined,
                lifetime.current?.signal,
              )
              .then((value) => {
                if (
                  !lifetime.current?.signal.aborted &&
                  request === lookupRequest.current
                )
                  setFound(value);
              })
              .catch((e: unknown) => {
                if (
                  !lifetime.current?.signal.aborted &&
                  request === lookupRequest.current
                )
                  setLookupError(
                    e instanceof Error
                      ? e.message
                      : "Couldn’t find this player.",
                  );
              })
              .finally(() => {
                if (
                  !lifetime.current?.signal.aborted &&
                  request === lookupRequest.current
                )
                  setLookupBusy(false);
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
              onChange={(event) => {
                lookupRequest.current++;
                setLookupBusy(false);
                setHandle(event.target.value);
                setFound(undefined);
                setLookupError("");
              }}
              placeholder="@fellow_explorer"
            />
          </label>
          <button
            className="friend-action-button"
            disabled={disabled || lookupBusy || !handle.trim()}
          >
            Find player
          </button>
        </form>
        {lookupError && <p role="alert">{lookupError}</p>}
        {found && (
          <div className="friend-found">
            <Identity player={found} />
            {found.id === player?.id ? (
              <span className="muted">That’s you.</span>
            ) : friends.some((friend) => friend.id === found.id) ? (
              <span className="muted">
                {friends.find((friend) => friend.id === found.id)?.status ===
                "accepted"
                  ? "Already friends"
                  : "Request already pending"}
              </span>
            ) : (
              <button
                className="friend-action-button"
                disabled={disabled || !player}
                onClick={() => {
                  void onRequest(found.handle).then((saved) => {
                    if (saved && !lifetime.current?.signal.aborted) {
                      setFound(undefined);
                      setHandle("");
                    }
                  });
                }}
              >
                Send request
              </button>
            )}
          </div>
        )}
        {player && (
          <div className="friend-share">
            <button
              className="quiet-button tertiary-action"
              onClick={() => {
                const link = `${location.origin}/account?friend=${encodeURIComponent(player.handle)}`;
                if (!navigator.clipboard?.writeText) {
                  setNotice(`Your profile link: ${link}`);
                  return;
                }
                void navigator.clipboard
                  .writeText(link)
                  .then(() => {
                    if (!lifetime.current?.signal.aborted)
                      setNotice("Your profile link is copied.");
                  })
                  .catch(() => {
                    if (!lifetime.current?.signal.aborted)
                      setNotice(`Your profile link: ${link}`);
                  });
              }}
            >
              Copy your profile link ↗
            </button>
            <p className="muted">
              Friendships start when a request is accepted.
            </p>
          </div>
        )}
      </section>
      {!!friends.filter(
        (item) => item.status === "incoming" || item.status === "outgoing",
      ).length && (
        <section className="friend-requests">
          <h3>Requests</h3>
          <ul className="account-list">
            {friends
              .filter(
                (item) =>
                  item.status === "incoming" || item.status === "outgoing",
              )
              .map((friend) => (
                <li key={friend.id}>
                  <Identity
                    player={
                      friend.player ?? {
                        id: friend.id,
                        avatar: "globe",
                        displayName: "Player",
                        handle: "unavailable",
                        bio: "",
                        favoriteRegion: "",
                      }
                    }
                  />
                  <div className="account-row-actions">
                    {friend.status === "incoming" ? (
                      <>
                        <button
                          disabled={disabled}
                          onClick={() => void onAction(friend.id, "accept")}
                        >
                          Accept
                        </button>
                        <button
                          disabled={disabled}
                          onClick={() => void onAction(friend.id, "decline")}
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="muted">Request sent</span>
                        <button
                          disabled={disabled}
                          onClick={() => void onAction(friend.id, "cancel")}
                        >
                          Cancel request
                        </button>
                      </>
                    )}
                    <button
                      disabled={disabled}
                      onClick={() => void onAction(friend.id, "block")}
                    >
                      Block
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}
      <section aria-label="Your friends">
        <h3>
          Your friends <span className="friend-count">{accepted.length}</span>
        </h3>
        {loading && !page && accepted.length > 0 && (
          <p role="status" className="muted">
            Opening your friends…
          </p>
        )}
        <div className="friend-cards">
          {activity.map((friend) => (
            <button
              key={friend.player.id}
              className="friend-card"
              aria-label={`View ${friend.player.displayName}’s profile`}
              onClick={() => void viewProfile(friend.player.id)}
            >
              <span className="friend-card-heading">
                <Identity player={friend.player} />
                <span aria-hidden="true">→</span>
              </span>
              <span
                className={`friend-daily-status status-${friend.today.status}`}
              >
                {statusLabel[friend.today.status]}
                {friend.today.score &&
                  ` · ${friend.today.score.correct}/${friend.today.score.total}`}
              </span>
              <span className="friend-card-streak">
                {friend.stats.journeyStreak} day streak ·{" "}
                {friend.stats.journeysCompleted} Journeys finished
              </span>
            </button>
          ))}
        </div>
        {!accepted.length && !error && (
          <p className="muted">
            Your circle starts with one friend. Find someone by handle or share
            your profile link.
          </p>
        )}
        {page?.cursor && (
          <button
            className="quiet-button tertiary-action"
            disabled={loading}
            onClick={() => void more()}
          >
            Load more friends →
          </button>
        )}
      </section>
      {!!friends.filter((item) => item.status === "blocked").length && (
        <details className="friend-blocked">
          <summary>Blocked players</summary>
          <ul className="account-list">
            {friends
              .filter((item) => item.status === "blocked")
              .map((friend) => (
                <li key={friend.id}>
                  <span>{friend.player?.displayName ?? "Player"}</span>
                  <button
                    className="quiet-button tertiary-action"
                    disabled={disabled}
                    onClick={() => void onAction(friend.id, "unblock")}
                  >
                    Unblock
                  </button>
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}
