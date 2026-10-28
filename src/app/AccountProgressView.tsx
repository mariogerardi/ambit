import { JOURNEY_INDEX } from "../game/journeyRegistry";
import type { StudySave } from "../study/engine";
import { dailyJourney, localDateKey } from "./dailyProgress";
import type { DailyProgress } from "./dailyProgress";
import type { ComparisonTarget } from "./accountNavigation";
import { accountProgress } from "./accountProgress";
import { ActionIcon } from "./ActionIcon";

const titleFor = (id: string) =>
  JOURNEY_INDEX.find((journey) => journey.id === id)?.title ?? "Journey";
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export function AccountProgressView({
  daily,
  study,
  comparison,
  journeyReady,
  onJourney,
  onStudy,
  onNavigate,
}: {
  daily: DailyProgress;
  study: StudySave;
  comparison?: ComparisonTarget | null;
  journeyReady?: boolean;
  onJourney?(): void;
  onStudy?(): void;
  onNavigate?(url: string): void;
}) {
  const metrics = accountProgress(daily, study);
  const today = comparison?.date ?? localDateKey();
  const attempt = daily.attempts[today];
  const complete =
    !!attempt && ["finished", "failed"].includes(attempt.game.phase);
  const journeyId =
    attempt?.journeyId ??
    comparison?.journeyId ??
    (comparison !== null ? dailyJourney(today, daily).id : undefined);
  const session =
    study.session?.phase !== "summary" ? study.session : undefined;
  const recent = [
    ...metrics.journeys.map((journey) => ({
      id: `${journey.date}/${journey.journeyId}`,
      date: journey.date,
      title: titleFor(journey.journeyId),
      kind: "Journey",
      result: `${journey.correct} of ${journey.total} correct`,
    })),
    ...metrics.records.map((record) => ({
      id: record.id,
      date: localDateKey(new Date(record.finishedAt)),
      title: record.session.placeReview
        ? "Places to revisit"
        : record.session.settings.topics
            .map((topic) => topic[0].toUpperCase() + topic.slice(1))
            .join(" · "),
      kind: "Study",
      result: `${record.session.history.filter((answer) => answer.correct).length} of ${record.session.history.length} correct`,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  return (
    <div className="account-progress-view">
      <div className="account-continuations">
        <section
          className="account-continue-card account-journey-card"
          aria-label="Today’s Journey"
        >
          <span className="overline">
            <ActionIcon name="journey" /> Today’s Journey
          </span>
          <h2>
            {journeyId ? titleFor(journeyId) : "Opening today’s Journey…"}
          </h2>
          <p>
            {complete
              ? "Complete · Your result is saved."
              : attempt
                ? `${attempt.game.answers.length} of 5 stops complete`
                : "Five stops. A new way to see the world."}
          </p>
          <button
            className="primary-button"
            disabled={journeyReady === false || comparison === null}
            onClick={onJourney}
          >
            {complete
              ? "View result"
              : attempt
                ? "Resume Journey"
                : "Play today’s Journey"}
            <span aria-hidden="true">→</span>
          </button>
        </section>
        <section
          className="account-continue-card"
          aria-label="Study continuation"
        >
          <span className="overline">
            <ActionIcon name="study" /> Study
          </span>
          <h2>
            {session
              ? "Pick up where you left off."
              : "Keep your world growing."}
          </h2>
          <p>
            {session
              ? `${session.history.length} ${session.history.length === 1 ? "answer" : "answers"} saved · ${session.placeReview ? "Places to revisit" : session.settings.topics.map((topic) => topic[0].toUpperCase() + topic.slice(1)).join(" · ")}`
              : "Countries, capitals, and flags. At your pace."}
          </p>
          <button
            className="quiet-button account-secondary-button"
            onClick={onStudy}
          >
            {session ? "Resume Study" : "Open Study"}
            <span aria-hidden="true">→</span>
          </button>
        </section>
      </div>
      <dl className="account-stats" aria-label="Your progress">
        <div>
          <dt>Journey streak</dt>
          <dd>
            {metrics.streak}
            <small>days</small>
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
      <section className="account-recent" aria-label="Recent activity">
        <header>
          <h2>Recent activity</h2>
          <button
            className="quiet-button tertiary-action"
            onClick={() => onNavigate?.("/archive")}
          >
            Browse Journeys →
          </button>
        </header>
        {recent.length ? (
          <ul>
            {recent.map((item) => (
              <li key={item.id}>
                <ActionIcon
                  name={item.kind === "Journey" ? "journey" : "study"}
                />
                <span>
                  <strong>{item.title}</strong>
                  <small>
                    {item.kind} · {dateLabel(item.date)}
                  </small>
                </span>
                <span className="account-recent-result">{item.result}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            Your finished Journeys and Study sessions will appear here.
          </p>
        )}
      </section>
    </div>
  );
}
