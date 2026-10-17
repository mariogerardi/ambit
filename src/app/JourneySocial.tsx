import { useCallback, useMemo, useState } from "react";
import type { DailyAttempt } from "./dailyProgress";
import type { Journey } from "../game/questionContracts";
import { useAccount } from "../services/accounts";
import { comparisonLink } from "./accountNavigation";
import { SyncComparisonNote } from "./FriendComparison";
import { sharedJourneyResult } from "./journeySharing";
import { JourneyShareDialog } from "./JourneyShareDialog";

export function JourneySocial({
  journey,
  attempt,
  sync,
  onNavigate,
}: {
  journey: Journey;
  attempt: DailyAttempt;
  sync: { status: string; retry(): void };
  onNavigate(url: string): void;
}) {
  const account = useAccount();
  const [sharing, setSharing] = useState(false);
  const close = useCallback(() => setSharing(false), []);
  const result = useMemo(
    () =>
      sharedJourneyResult(journey, attempt.game, attempt.date, location.origin),
    [journey, attempt.game, attempt.date],
  );
  const target = {
    date: attempt.date,
    journeyId: attempt.journeyId,
    version: attempt.scheduleVersion,
  };
  const compare = comparisonLink(target);
  return (
    <section
      className="journey-social"
      aria-label="Share and compare your Journey"
    >
      <div
        className="journey-completion-actions"
        role="group"
        aria-label="Journey actions"
      >
        <div className="journey-social-actions finish-actions result-actions">
          <button
            className="primary-button"
            data-dd-action-name="Journey Share Result"
            onClick={() => setSharing(true)}
          >
            Share result
          </button>
          <button
            className="study-repeat-button"
            data-dd-action-name="Journey Compare Friends"
            onClick={() => onNavigate(compare)}
          >
            {account.user
              ? "Compare with friends →"
              : "Sign in to compare with friends →"}
          </button>
        </div>
      </div>
      {account.user && (
        <SyncComparisonNote status={sync.status} onRetry={sync.retry} />
      )}
      {sharing && <JourneyShareDialog result={result} onClose={close} />}
    </section>
  );
}
