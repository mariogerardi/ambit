import type {
  CommunityClient,
  Friendship,
  JourneyScore,
  PlayerProfile,
  FriendActivityPage,
} from "../services/community";
import { useEffect, useRef } from "react";
import type { ComparisonTarget } from "./accountNavigation";
import {
  ComparisonStatus,
  comparisonScore,
  ScoreSummary,
  SyncComparisonNote,
} from "./FriendComparison";
import { useFriendActivity } from "./useFriendActivity";
import { ProfileAvatar } from "./ProfileAvatar";
import { JOURNEY_INDEX } from "../game/journeyRegistry";
import { localDateKey } from "./dailyProgress";
import { archiveDateLabel } from "./archiveDates";

export function FriendJourneyComparison({
  api,
  target,
  friends,
  localScore,
  player,
  sync,
  disabled,
  onProfile,
  onInvite,
  canInvite = true,
  focus = false,
  focusReady = true,
  onFocused,
  initialPage,
  waitingForPage = false,
  onRefresh,
}: {
  focus?: boolean;
  initialPage?: FriendActivityPage;
  waitingForPage?: boolean;
  onRefresh?(): void;
  focusReady?: boolean;
  onFocused?(): void;
  api: CommunityClient;
  target: ComparisonTarget;
  friends: Friendship[];
  localScore?: JourneyScore;
  player: PlayerProfile | null;
  sync?: { status: string; retry(): void };
  disabled: boolean;
  onProfile(id: string): void;
  onInvite(): void;
  canInvite?: boolean;
}) {
  const activity = useFriendActivity(
    api,
    target.date,
    !waitingForPage && !disabled,
    sync?.status,
    friends,
    initialPage,
  );
  const page = activity.page;
  const section = useRef<HTMLElement>(null);
  const focusedTarget = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!focus) {
      focusedTarget.current = undefined;
      return;
    }
    if (disabled || !focusReady) return;
    const key = `${target.date}/${target.journeyId}/${target.version}`;
    if (focusedTarget.current === key) return;
    // Wait for the page layout and its parent scroll reset to settle first.
    const frame = requestAnimationFrame(() => {
      const element = section.current;
      if (!element) return;
      focusedTarget.current = key;
      if (element.closest(".page-layout")) {
        // Account uses the document scrollbar. Nested info panels can otherwise
        // absorb scrollIntoView without moving the visible page.
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY + element.getBoundingClientRect().top - 100,
          ),
          behavior: "auto",
        });
      } else element.scrollIntoView?.({ block: "start", behavior: "auto" });
      element.focus({ preventScroll: true });
      onFocused?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    focus,
    focusReady,
    onFocused,
    disabled,
    target.date,
    target.journeyId,
    target.version,
  ]);
  const entries = friends
    .filter((friend) => friend.status === "accepted")
    .map((friend) => {
      const value = page?.friends.find(
        (activity) => activity.player.id === friend.id,
      );
      return {
        activity: value,
        player: value?.player ??
          friend.player ?? {
            id: friend.id,
            displayName: "Player",
            handle: "unavailable",
            avatar: "globe" as const,
            bio: "",
            favoriteRegion: "",
          },
      };
    })
    .sort(
      (a, b) =>
        Number(b.activity?.today.status === "completed") -
          Number(a.activity?.today.status === "completed") ||
        a.player.displayName.localeCompare(b.player.displayName) ||
        a.player.handle.localeCompare(b.player.handle),
    );
  const mine = page && comparisonScore(page.you, target);
  return (
    <section
      id="journey-comparison"
      ref={section}
      tabIndex={-1}
      className="friend-journey-comparison"
      aria-label="Journey comparison"
    >
      <header>
        <div>
          <h3>
            {target.date === localDateKey()
              ? "Today’s Journey"
              : archiveDateLabel(target.date)}{" "}
            —{" "}
            <em>
              {JOURNEY_INDEX.find((journey) => journey.id === target.journeyId)
                ?.title ?? "Explore the world"}
            </em>
          </h3>
          <p className="muted">
            Compare scores once you’ve both completed the same Journey.
          </p>
        </div>
      </header>
      {(sync?.status === "offline" || sync?.status === "error") && (
        <SyncComparisonNote status={sync.status} onRetry={sync.retry} />
      )}
      <ul
        className="friend-comparison-list"
        aria-busy={!page && !activity.failure}
      >
        <li className="comparison-you">
          <div className="friend-comparison-row">
            <span className="friend-comparison-identity">
              <ProfileAvatar
                avatar={player?.avatar ?? "globe"}
                label="Your avatar"
              />
              <span className="friend-comparison-name">
                <strong>{player?.displayName ?? "You"}</strong>
                <small className="comparison-you-label">You</small>
              </span>
            </span>
            <span className="friend-comparison-result">
              {mine || localScore ? (
                <ScoreSummary score={(mine ?? localScore)!} />
              ) : page ? (
                <ComparisonStatus activity={page.you} target={target} />
              ) : (
                <span
                  className="friend-value-placeholder"
                  aria-label="Opening your result"
                />
              )}
            </span>
          </div>
        </li>
        {!page &&
          !entries.length &&
          !activity.failure &&
          waitingForPage &&
          Array.from({ length: 5 }, (_, index) => (
            <li key={`pending-${index}`} aria-hidden="true">
              <div className="friend-comparison-row">
                <span className="friend-identity-placeholder" />
                <span className="friend-value-placeholder" />
              </div>
            </li>
          ))}
        {entries.map((friend) => (
          <li key={friend.player.id}>
            <button
              className="friend-comparison-row"
              onClick={() => onProfile(friend.player.id)}
              disabled={disabled}
            >
              <span className="friend-comparison-identity">
                <ProfileAvatar
                  avatar={friend.player.avatar}
                  label={`${friend.player.displayName} avatar`}
                />
                <strong>{friend.player.displayName}</strong>
              </span>
              <span className="friend-comparison-result">
                {friend.activity ? (
                  <ComparisonStatus
                    activity={friend.activity}
                    target={target}
                  />
                ) : activity.failure ? (
                  <span>Activity unavailable</span>
                ) : (
                  <span
                    className="friend-value-placeholder"
                    aria-label="Loading activity"
                  />
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {activity.failure && (
        <p role="alert">
          {activity.failure}{" "}
          <button
            className="quiet-button"
            onClick={onRefresh ?? activity.refresh}
          >
            Retry comparisons
          </button>
        </p>
      )}
      {page && !friends.some((friend) => friend.status === "accepted") && (
        <p>
          Invite someone to play alongside you.{" "}
          <button
            className="quiet-button"
            disabled={!canInvite || disabled}
            onClick={onInvite}
          >
            Invite a friend →
          </button>
        </p>
      )}
    </section>
  );
}
