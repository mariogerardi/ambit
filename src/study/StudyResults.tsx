import { useState } from "react";
import { StudyNavigation } from "./StudyNavigation";
import type { StudyPlaceTarget } from "./placeReview";
import { isStudyPinPrompt, studyPinFeedback } from "./pins";
import { ActionIcon } from "../app/ActionIcon";
import {
  TOPICS,
  studyComplete,
  answerLabel,
  countryName,
  missedStudyAnswers,
  studyReplayTargets,
} from "./engine";
import type {
  StudyAnswer,
  StudyReviewTarget,
  StudySession,
  StudySettings,
} from "./engine";

export function beginStudyReview(
  session: StudySession,
  onStart: (settings: StudySettings, targets?: StudyReviewTarget[]) => void,
  onStartPlaces?: (targets: StudyPlaceTarget[]) => void,
) {
  const missed = missedStudyAnswers(session);
  const missedIds = [
    ...new Set(missed.map((answer) => answer.prompt.targetId)),
  ];
  if (session.placeReview) {
    onStartPlaces?.(
      missed.flatMap((a) => (a.prompt.place ? [a.prompt.place] : [])),
    );
    return;
  }
  const settings: StudySettings = {
    ...session.settings,
    scope: "custom",
    countryIds: [
      ...new Set(
        missed.map(
          (answer) => answer.prompt.place?.countryId ?? answer.prompt.targetId,
        ),
      ),
    ],
    topics: TOPICS.filter((topic) =>
      missed.some((a) => a.prompt.topic === topic),
    ),
    length: "all",
    revisitMissed: false,
    styles: { ...session.settings.styles },
  };
  // A single-country review cannot supply multiple-choice distractors.
  if (missedIds.length < 2)
    for (const topic of settings.topics)
      if (settings.styles[topic] === "choices")
        settings.styles[topic] = "typing";
  onStart(
    settings,
    missed.map((a) => a.prompt),
  );
}

export function StudyResults({
  session,
  onSetup,
  onStart,
  onStartPlaces,
  onLocate,
  onHome,
  onReview,
}: {
  session: StudySession;
  onSetup(): void;
  onStart(settings: StudySettings, targets?: StudyReviewTarget[]): void;
  onStartPlaces?(targets: StudyPlaceTarget[]): void;
  onLocate?(answer: StudyAnswer): void;
  onHome?(): void;
  onReview?(): void;
}) {
  const [opened, setOpened] = useState<string>();
  const missed = missedStudyAnswers(session);
  const missedIds = [...new Set(missed.map((a) => a.prompt.targetId))];
  const right = session.history.filter((a) => a.correct).length;
  const topics = {
    countries: "Country",
    capitals: "Capital",
    flags: "Flag",
    places: "Place",
    cities: "Major city",
    landmarks: "Landmark",
  };
  const review = () => beginStudyReview(session, onStart, onStartPlaces);
  return (
    <section className="info-view study-view study-summary">
      <StudyNavigation />
      <div className="info-heading">
        <h1 className="editorial-heading">
          {session.learningReview ? (
            <>
              Review <em>{studyComplete(session) ? "complete." : "saved."}</em>
            </>
          ) : (
            <>
              Session{" "}
              <em>{studyComplete(session) ? "complete." : "finished."}</em>
            </>
          )}
        </h1>
      </div>
      {session.history.length ? (
        <p className="study-result-score">
          <strong>
            {right}
            <span> / {session.history.length}</span>
          </strong>
          <span>
            correct · {Math.round((right / session.history.length) * 100)}%
          </span>
        </p>
      ) : (
        <p className="muted">No answers yet.</p>
      )}
      {missed.length > 0 ? (
        <>
          <h2>
            {missedIds.length} {missedIds.length === 1 ? "place" : "places"} to
            review
          </h2>
          <p className="study-review-instruction">
            Select a place to find it on the globe.
          </p>
          <ul className="study-review-list">
            {missed.map((answer) => {
              const key = `${answer.prompt.targetId}/${answer.prompt.topic}`;
              const expanded = opened === key;
              return (
                <li key={key}>
                  <button
                    className="study-review-place"
                    data-dd-action-name="Study Locate Missed Place"
                    aria-expanded={expanded}
                    aria-controls={`review-${key.replaceAll("/", "-")}`}
                    onClick={() => {
                      setOpened(expanded ? undefined : key);
                      onLocate?.(answer);
                    }}
                  >
                    <strong>
                      {answer.prompt.place?.name ??
                        countryName(answer.prompt.targetId)}
                    </strong>
                    <span>{topics[answer.prompt.topic]}</span>
                  </button>
                  {expanded && (
                    <div
                      className="study-review-detail"
                      id={`review-${key.replaceAll("/", "-")}`}
                    >
                      {isStudyPinPrompt(answer.prompt) ? (
                        <p>
                          {studyPinFeedback(answer, answerLabel(answer.prompt))}
                        </p>
                      ) : (
                        <p>
                          Your{" "}
                          {answer.prompt.style === "map" ? "pick" : "answer"}:{" "}
                          <strong>{answer.response}</strong>
                        </p>
                      )}
                      {answer.prompt.topic === "capitals" &&
                        answer.prompt.style !== "map" && (
                          <p>
                            Capital:{" "}
                            <strong>{answerLabel(answer.prompt)}</strong>
                          </p>
                        )}
                      {answer.prompt.topic === "flags" && (
                        <p>
                          The flag belongs to{" "}
                          {countryName(answer.prompt.targetId)}.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      ) : session.history.length > 0 ? (
        <p className="study-result-success">
          {right === session.history.length
            ? "A clean sweep."
            : "No places left to review."}
        </p>
      ) : null}
      <div
        className={`study-result-actions result-actions${missed.length ? "" : " study-result-actions-perfect"}`}
      >
        {missed.length > 0 && !session.learningReview && (
          <button
            className="primary-button"
            data-dd-action-name="Study Review Missed"
            onClick={onReview ?? review}
          >
            <ActionIcon name="review" />
            <span>
              {onReview ? (
                "Open Review"
              ) : (
                <>Review missed {missed.length === 1 ? "answer" : "answers"}</>
              )}
            </span>
          </button>
        )}
        <button
          className={
            missed.length && !session.learningReview
              ? "study-repeat-button"
              : "primary-button"
          }
          data-dd-action-name="Study Repeat Session"
          onClick={() =>
            session.learningReview
              ? onReview?.()
              : session.placeReview
                ? onStartPlaces?.(session.placeReview)
                : onStart(session.settings, studyReplayTargets(session))
          }
        >
          <ActionIcon name="repeat" />
          <span>
            {session.learningReview
              ? "Continue review"
              : session.settings.length === "all"
                ? "Repeat this session"
                : "Practice again"}
          </span>
        </button>
        <button
          className="study-repeat-button"
          data-dd-action-name="Study Build Custom Session"
          onClick={onSetup}
        >
          <ActionIcon name="custom" />
          <span>Build a custom session</span>
        </button>
        {onHome && (
          <button
            className="study-repeat-button"
            data-dd-action-name="Study Home"
            onClick={onHome}
          >
            <ActionIcon name="home" />
            <span>Home</span>
          </button>
        )}
      </div>
      {session.learningReview && (
        <p className="study-review-note">
          Progress is saved. Items that need more work will return in Review.
        </p>
      )}
    </section>
  );
}
