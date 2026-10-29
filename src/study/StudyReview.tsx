import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, defaultSettings } from "./engine";
import type { StudySave, StudySettings } from "./engine";
import type { StudyPlaceTarget } from "./placeReview";
import { learningQueue, REVIEW_LENGTHS, shuffledReviewBatch } from "./learning";
import type { LearningTarget, ReviewQuestionCount } from "./learning";
import { StudyNavigation } from "./StudyNavigation";
const countryIds = new Set(COUNTRIES.map((country) => country.id));
export function StudyReview({
  save,
  onStart,
  onResume,
  onPreview,
}: {
  save: StudySave;
  onStart?(targets: LearningTarget[], questionCount: ReviewQuestionCount): void;
  onResume?(): void;
  onPreview?(
    settings?: StudySettings,
    places?: StudyPlaceTarget[],
    targets?: LearningTarget[],
  ): void;
}) {
  const [questionCount, setQuestionCount] = useState<ReviewQuestionCount>(10);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const items = useMemo(() => learningQueue(save, now), [save, now]);
  const due = items.filter((item) => item.dueAt <= now);
  const confident = items.filter((item) => item.confident).length;
  const batch = useMemo(
    () => shuffledReviewBatch(items, questionCount),
    [items, questionCount],
  );
  const tourTargets = useMemo(
    () =>
      [
        ...new Map(
          batch.map((item) => [
            `${item.targetId}/${item.topic === "capitals" ? "capital" : "country"}`,
            item,
          ]),
        ).values(),
      ].slice(0, 10),
    [batch],
  );
  const preview = useMemo<StudySettings>(
    () => ({
      ...defaultSettings,
      scope: "custom",
      countryIds: [
        ...new Set(
          tourTargets.flatMap((item) =>
            countryIds.has(item.targetId)
              ? [item.targetId]
              : (item.place?.countryId ?? item.place?.regionId) &&
                  countryIds.has(
                    (item.place?.countryId ?? item.place?.regionId)!,
                  )
                ? [(item.place?.countryId ?? item.place?.regionId)!]
                : [],
          ),
        ),
      ],
      countryNames: false,
      capitalNames: false,
      capitalMarkers: false,
    }),
    [tourTargets],
  );
  useEffect(() => {
    onPreview?.(preview, undefined, tourTargets);
    return () => onPreview?.(undefined);
  }, [preview, tourTargets, onPreview]);
  const next = items.find((item) => item.dueAt > now)?.dueAt;
  const current =
    save.session?.learningReview && save.session.phase !== "summary"
      ? save.session
      : undefined;
  return (
    <section className="info-view study-view study-mistakes">
      <StudyNavigation />
      <h1 className="editorial-heading">
        Keep it <em>familiar.</em>
      </h1>
      <p className="study-review-introduction">
        Revisit what you’ve learned, with extra practice for the things you
        miss.
      </p>
      {current && onResume && (
        <section className="study-current-card" aria-label="Review in progress">
          <span className="overline">In progress</span>
          <p>
            {current.history.length} answered ·{" "}
            {current.history.filter((answer) => answer.correct).length} correct
            so far
          </p>
          <button className="primary-button" onClick={onResume}>
            Resume review <span aria-hidden="true">→</span>
          </button>
        </section>
      )}
      {!items.length ? (
        <div className="study-empty">
          <h2>Your review starts with a session.</h2>
          <p>
            Answers you give in Study become a personal review queue, with extra
            attention to the things you miss.
          </p>
        </div>
      ) : (
        <>
          <div className="study-learning-summary">
            <div className="study-review-due">
              <strong>{due.length}</strong>
              <span>ready to review</span>
            </div>
            <div
              className="study-review-confidence"
              role="group"
              aria-label="Skill confidence"
            >
              <div>
                <strong>{items.length - confident}</strong>
                <span>building confidence</span>
              </div>
              <div>
                <strong>{confident}</strong>
                <span>confident</span>
              </div>
            </div>
          </div>
          <details className="study-review-help">
            <summary>How review works</summary>
            <p>
              Review remembers what you’ve practiced: finding countries,
              recognizing flags, and knowing capitals. The same country can
              appear more than once because these are different things to learn.
            </p>
            <p>
              Ready to review means it’s time to try those things again.
              Building confidence means you’re still learning them. Confident
              means you’ve remembered them on different days, without help. Even
              familiar answers become ready to review again.
            </p>
            <p>
              Miss something and you’ll see it again sooner. Remember it over
              several visits and it will come back less often. You’ll answer in
              different ways when possible, so recognizing a choice isn’t the
              only way to show what you know.
            </p>
          </details>
          {!due.length && (
            <p className="study-review-next">
              You’re caught up.
              {next
                ? ` Next checkup ${new Date(next).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
                : ""}
            </p>
          )}
          {!!batch.length && (
            <>
              <label className="study-review-length">
                <span>Questions</span>
                <select
                  value={questionCount}
                  onChange={(event) =>
                    setQuestionCount(
                      Number(event.target.value) as ReviewQuestionCount,
                    )
                  }
                >
                  {REVIEW_LENGTHS.map((count) => (
                    <option key={count} value={count}>
                      {count} questions
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary-button study-review-start"
                onClick={() => onStart?.(batch, questionCount)}
              >
                {due.length ? "Start review" : "Review ahead"}
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
          <p className="study-review-note">
            {questionCount} questions, with a mix of ways to answer. Things you
            miss get another turn; familiar answers return less often over time.
          </p>
        </>
      )}
    </section>
  );
}
