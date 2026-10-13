import type {
  FriendActivity,
  JourneyScore,
  PlayerActivity,
} from "../services/community";
import type { ComparisonTarget } from "./accountNavigation";
import { ActionIcon } from "./ActionIcon";
import { helpCountCopy } from "../game/guidance";

export function alphabeticalFriends(friends: FriendActivity[]) {
  return [...friends].sort(
    (a, b) =>
      a.player.displayName.localeCompare(b.player.displayName) ||
      a.player.handle.localeCompare(b.player.handle),
  );
}
export function comparisonScore(
  activity: PlayerActivity,
  target: ComparisonTarget,
) {
  return (
    activity.journeys.find(
      (score) =>
        score.date === target.date &&
        score.journeyId === target.journeyId &&
        (score.gameVersion ?? 1) === target.version,
    ) ??
    (activity.today.score?.date === target.date &&
    activity.today.score.journeyId === target.journeyId &&
    (activity.today.score.gameVersion ?? 1) === target.version
      ? activity.today.score
      : undefined)
  );
}
export function ScoreSummary({ score }: { score: JourneyScore }) {
  const status = score.help?.status ?? "unassisted";
  const label =
    status === "assisted"
      ? "Assisted"
      : status === "hinted"
        ? "Hinted"
        : "Unassisted";
  const help = score.help;
  const description = help ? `${label} · ${helpCountCopy(help)}` : label;
  return (
    <span className="comparison-score-summary">
      {status === "unassisted" ? (
        <small className="comparison-unassisted">Unassisted</small>
      ) : (
        <span
          className="comparison-help"
          role="img"
          aria-label={description}
          title={description}
        >
          {!!help?.hints && (
            <span>
              <ActionIcon name="hint" />
              {help.hints}
            </span>
          )}
          {!!help?.assists && (
            <span>
              <ActionIcon name="assist" />
              {help.assists}
            </span>
          )}
        </span>
      )}
      <strong className="comparison-score">
        {score.correct}
        <span>/{score.total}</span>
      </strong>
    </span>
  );
}

export function ComparisonStatus({
  activity,
  target,
}: {
  activity: PlayerActivity;
  target: ComparisonTarget;
}) {
  const score = comparisonScore(activity, target);
  if (score) return <ScoreSummary score={score} />;
  const daily = activity.today;
  if (
    daily.journeyId &&
    (daily.journeyId !== target.journeyId ||
      (daily.score && (daily.score.gameVersion ?? 1) !== target.version))
  )
    return <span>Different Journey</span>;
  return (
    <span>
      {daily.status === "completed"
        ? "Completed · Score locked"
        : daily.status === "in_progress"
          ? "In progress"
          : "Not started"}
    </span>
  );
}
export function SyncComparisonNote({
  status,
  onRetry,
}: {
  status?: string;
  onRetry?(): void;
}) {
  if (!status || status === "saved") return null;
  return (
    <p className="muted" role="status">
      {status === "syncing"
        ? "Syncing your result. Friend scores unlock after syncing."
        : "Your result is saved on this device. Comparisons update when your progress syncs."}
      {status !== "syncing" && onRetry && (
        <>
          {" "}
          <button className="quiet-button" onClick={onRetry}>
            Retry sync
          </button>
        </>
      )}
    </p>
  );
}
