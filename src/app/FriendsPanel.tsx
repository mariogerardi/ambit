import { useEffect, useMemo, useRef, useState } from "react";
import type {
  CommunityClient,
  FriendActivity,
  FriendActivityPage,
  Friendship,
  PlayerProfile,
  JourneyScore,
} from "../services/community";
import { ProfileAvatar } from "./ProfileAvatar";
import { localDateKey } from "./dailyProgress";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { helpCountCopy } from "../game/guidance";
import type { AccountIntent, ComparisonTarget } from "./accountNavigation";
import { invitationLink } from "./accountNavigation";
import { copyShareText, shareCancelled } from "./journeySharing";
import { FriendJourneyComparison } from "./FriendJourneyComparison";
import { dailyJourney, DAILY_SCHEDULE } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import { helpSummary } from "../game/guidance";

function ScoreHelp({ score }: { score: JourneyScore }) {
  const status = score.help?.status ?? "unassisted";
  return (
    <small title={score.help ? helpCountCopy(score.help) : undefined}>
      {status === "assisted"
        ? "Assisted"
        : status === "hinted"
          ? "Hinted"
          : "Unassisted"}
    </small>
  );
}

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
  relationshipsLoaded = true,
  player,
  disabled,
  error,
  onAction,
  onRequest,
  onRefresh,
  intent,
  focusComparison,
  onComparisonFocused,
  daily,
  sync,
  defaultComparison,
}: {
  defaultComparison?: ComparisonTarget | null;
  intent?: AccountIntent;
  focusComparison?: boolean;
  onComparisonFocused?(): void;
  daily?: DailyProgress;
  sync?: { status: string; retry(): void };
  api: CommunityClient;
  friends: Friendship[];
  relationshipsLoaded?: boolean;
  player: PlayerProfile | null;
  disabled: boolean;
  error: string;
  onAction(id: string, action: string): Promise<unknown>;
  onRequest(handle: string): Promise<boolean>;
  onRefresh?(): Promise<void>;
}) {
  const [page, setPage] = useState<FriendActivityPage>();
  const [invitationActive, setInvitationActive] = useState(!!intent?.friend);
  const [selected, setSelected] = useState<FriendActivity>();
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState("");
  const [handle, setHandle] = useState(
    () =>
      intent?.friend ??
      new URLSearchParams(location.search).get("friend") ??
      "",
  );
  const [found, setFound] = useState<PlayerProfile>();
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [today, setToday] = useState(localDateKey);
  useEffect(() => {
    setToday(localDateKey());
  }, [defaultComparison?.date]);
  const refreshRelationships = useRef(onRefresh);
  refreshRelationships.current = onRefresh;
  const lifetime = useRef<AbortController | undefined>(undefined);
  const activityRequest = useRef(0);
  const profileRequest = useRef(0);
  const lookupRequest = useRef(0);
  const openedIntent = useRef<string | undefined>(undefined);
  const accepted = useMemo(
    () => friends.filter((friend) => friend.status === "accepted"),
    [friends],
  );
  useEffect(() => {
    setInvitationActive(!!intent?.friend);
    setSelected(undefined);
    setFound(undefined);
    setHandle(intent?.friend ?? "");
    setLookupError("");
    setLookupBusy(false);
    lookupRequest.current++;
    profileRequest.current++;
    openedIntent.current = undefined;
  }, [intent]);
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
    if (!intent?.friend || !invitationActive || disabled || error) return;
    setHandle(intent.friend);
    void lookup(intent.friend);
    // The invitation is resolved again after profile creation or account refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.friend, invitationActive, disabled, error, player]);
  useEffect(() => {
    if (
      !intent?.player ||
      disabled ||
      error ||
      openedIntent.current === intent.player
    )
      return;
    openedIntent.current = intent.player;
    if (accepted.some((friend) => friend.id === intent.player))
      void viewProfile(intent.player);
    else setFailure("This profile is available to accepted friends.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.player, disabled, error, accepted]);
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
  }, [api, friends, disabled, error, revision, today, sync?.status]);
  async function lookup(value: string) {
    const request = ++lookupRequest.current;
    setLookupBusy(true);
    setLookupError("");
    setFound(undefined);
    try {
      const valueFound = await api.request<PlayerProfile>(
        `players/${encodeURIComponent(value.trim().replace(/^@/, "").toLowerCase())}`,
        "GET",
        undefined,
        lifetime.current?.signal,
      );
      if (
        !lifetime.current?.signal.aborted &&
        request === lookupRequest.current
      )
        setFound(valueFound);
    } catch (error) {
      if (
        !lifetime.current?.signal.aborted &&
        request === lookupRequest.current
      )
        setLookupError(
          error instanceof Error ? error.message : "Couldn’t find this player.",
        );
    } finally {
      if (
        !lifetime.current?.signal.aborted &&
        request === lookupRequest.current
      )
        setLookupBusy(false);
    }
  }
  async function invite() {
    if (!player) return;
    const link = `${location.origin}${invitationLink(player.handle)}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Play Ambit with me",
          text: `Connect with @${player.handle} on Ambit.`,
          url: link,
        });
        return;
      } catch (error) {
        if (shareCancelled(error)) return;
      }
    }
    setNotice(
      (await copyShareText(link))
        ? "Your invitation link is copied."
        : `Your invitation link: ${link}`,
    );
  }
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
  const attempt = daily?.attempts[today];
  const target = (intent?.comparison?.date === today
    ? intent.comparison
    : undefined) ??
    defaultComparison ?? {
      date: today,
      journeyId: attempt?.journeyId ?? dailyJourney(today, daily).id,
      version: attempt?.scheduleVersion ?? DAILY_SCHEDULE.version,
    };
  const localScore =
    attempt &&
    attempt.date === target.date &&
    attempt.journeyId === target.journeyId &&
    attempt.scheduleVersion === target.version &&
    ["finished", "failed"].includes(attempt.game.phase)
      ? {
          date: attempt.date,
          journeyId: attempt.journeyId,
          gameVersion: attempt.scheduleVersion,
          correct: attempt.game.answers.filter((answer) => answer.correct)
            .length,
          total: 5,
          help: helpSummary(attempt.game),
        }
      : undefined;
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
                          {yours && <ScoreHelp score={yours} />}
                        </td>
                        <td>
                          {score.correct}/{score.total}
                          <ScoreHelp score={score} />
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
      {notices}
      <section className="friends-directory" aria-label="Friend directory">
        <div className="friends-workspace">
          <aside className="friends-search-column">
            <section className="friend-add" aria-label="Find a friend">
              {invitationActive && (
                <>
                  <h3>Connect with @{intent?.friend}</h3>
                  {lookupBusy && <p role="status">Opening the invitation…</p>}
                </>
              )}
              {!invitationActive && (
                <form
                  className="friend-find-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void lookup(handle);
                  }}
                >
                  <label className="field">
                    <span>Search players</span>
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
                      placeholder="Search by handle"
                    />
                  </label>
                  <button
                    className="friend-action-button friend-search-button"
                    aria-label="Find player"
                    title="Find player"
                    disabled={disabled || lookupBusy || !handle.trim()}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <circle cx="10.5" cy="10.5" r="6.5" />
                      <path d="m16 16 5 5" />
                    </svg>
                  </button>
                </form>
              )}
              {lookupError && <p role="alert">{lookupError}</p>}
              {found && (
                <div className="friend-found">
                  <Identity player={found} />
                  {invitationActive && found.bio && <p>{found.bio}</p>}
                  {found.id === player?.id ? (
                    <span className="muted">That’s you.</span>
                  ) : friends.find((friend) => friend.id === found.id)
                      ?.status === "accepted" ? (
                    <>
                      <span className="muted">Already friends</span>
                      <button
                        className="friend-action-button"
                        onClick={() => void viewProfile(found.id)}
                      >
                        View profile
                      </button>
                    </>
                  ) : friends.find((friend) => friend.id === found.id)
                      ?.status === "incoming" ? (
                    <button
                      className="friend-action-button"
                      disabled={disabled}
                      onClick={() => void onAction(found.id, "accept")}
                    >
                      Accept request
                    </button>
                  ) : friends.find((friend) => friend.id === found.id)
                      ?.status === "outgoing" ? (
                    <span className="muted">Request sent</span>
                  ) : friends.find((friend) => friend.id === found.id)
                      ?.status === "blocked" ? (
                    <span className="muted">This player is unavailable.</span>
                  ) : (
                    <button
                      className="friend-action-button"
                      disabled={disabled || !player}
                      onClick={() => {
                        void onRequest(found.handle).then((saved) => {
                          if (
                            saved &&
                            !lifetime.current?.signal.aborted &&
                            !intent?.friend
                          ) {
                            setFound(undefined);
                            setHandle("");
                          }
                        });
                      }}
                    >
                      {invitationActive ? "Add friend" : "Send request"}
                    </button>
                  )}
                </div>
              )}
              {invitationActive && (
                <button
                  className="quiet-button tertiary-action"
                  onClick={() => {
                    setInvitationActive(false);
                    setFound(undefined);
                    setLookupError("");
                    setHandle("");
                    lookupRequest.current++;
                  }}
                >
                  Search another player
                </button>
              )}
              {lookupError && invitationActive && (
                <button
                  className="quiet-button"
                  disabled={lookupBusy || disabled}
                  onClick={() => intent?.friend && void lookup(intent.friend)}
                >
                  Retry invitation
                </button>
              )}
              {!error && (
                <p className="muted">
                  Find a player by handle to start your circle, or{" "}
                  <button
                    className="quiet-button tertiary-action"
                    disabled={disabled || !player}
                    onClick={() => void invite()}
                  >
                    <em>invite them to play.</em>
                  </button>
                </p>
              )}
            </section>
            {!!friends.filter(
              (item) =>
                item.status === "incoming" || item.status === "outgoing",
            ).length && (
              <section className="friend-requests">
                <h3>Requests</h3>
                <ul className="account-list">
                  {friends
                    .filter(
                      (item) =>
                        item.status === "incoming" ||
                        item.status === "outgoing",
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
                                onClick={() =>
                                  void onAction(friend.id, "accept")
                                }
                              >
                                Accept
                              </button>
                              <button
                                disabled={disabled}
                                onClick={() =>
                                  void onAction(friend.id, "decline")
                                }
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="muted">Request sent</span>
                              <button
                                disabled={disabled}
                                onClick={() =>
                                  void onAction(friend.id, "cancel")
                                }
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
          </aside>
          <section className="friends-grid-column" aria-label="Your friends">
            <header className="friends-directory-heading">
              <h3>
                Your friends{" "}
                <span className="friend-count">{accepted.length}</span>
              </h3>
            </header>
            {loading && !page && accepted.length > 0 && (
              <p role="status" className="muted">
                Opening your friends…
              </p>
            )}
            <div className="friend-cards">
              {accepted.map((relationship) => {
                const friend = activity.find(
                  (item) => item.player.id === relationship.id,
                );
                const identity = friend?.player ?? relationship.player;
                if (!identity) return null;
                return (
                  <button
                    key={identity.id}
                    className="friend-card"
                    data-dd-action-name="Friends Open Card"
                    aria-label={`View ${identity.displayName}’s profile`}
                    onClick={() => void viewProfile(identity.id)}
                  >
                    <span className="friend-card-heading">
                      <Identity player={identity} />
                    </span>
                    {friend && friend.stats.journeyStreak > 0 && (
                      <span className="friend-directory-streak">
                        {friend.stats.journeyStreak} day streak
                      </span>
                    )}
                    <span className="friend-card-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                );
              })}
            </div>
            {page?.cursor && (
              <button
                className="quiet-button tertiary-action"
                disabled={loading}
                onClick={() => void more()}
              >
                Load more activity →
              </button>
            )}
          </section>
        </div>
      </section>
      {(defaultComparison !== null || intent?.comparison) && (
        <FriendJourneyComparison
          focus={focusComparison ?? !!intent?.comparison}
          onFocused={onComparisonFocused}
          focusReady={relationshipsLoaded && !loading && (!!page || !!failure)}
          api={api}
          target={target}
          friends={friends}
          player={player}
          localScore={localScore}
          sync={sync}
          disabled={disabled || !!error}
          onProfile={(id) => void viewProfile(id)}
          canInvite={!!player}
          onInvite={() => void invite()}
        />
      )}
    </div>
  );
}
