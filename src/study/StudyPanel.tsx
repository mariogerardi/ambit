import { useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  FLAGS,
  answerLabel,
  canTypeStudyAnswer,
  countryName,
  defaultSettings,
  studyPrompt,
  studyComplete,
} from "./engine";
import type {
  StudySave,
  StudySettings,
  StudyAction,
  StudyReviewTarget,
  StudyAnswer,
  StudyRecord,
  StudyPrompt,
} from "./engine";
import { PanelActive } from "../app/ModePanels";
import { QuestionHelp } from "../app/QuestionHelp";
import { QuestionActions } from "../game/QuestionActions";
import { capitalSource } from "../game/quizData";
import { SettingsIcon } from "../app/SettingsIcon";
import { StudyResults } from "./StudyResults";
import { StudySetup } from "./StudySetup";
import { StudySessionOptions } from "./StudySessionOptions";
import { AnswerInput } from "../game/AnswerInput";
import { StudyHistory } from "./StudyHistory";
import type { StudyPlaceTarget } from "./placeReview";
import {
  CAPITAL_PIN_RADIUS_KM,
  isStudyPinPrompt,
  studyPinFeedback,
} from "./pins";
export function StudyPanel({
  save,
  setup,
  active,
  onSettings,
  onStart,
  onStartPlaces,
  onAction,
  onSetup,
  onResume,
  webgl,
  onEditingChange,
  onPreview,
  onLocate,
  onHome,
  onViewRecord,
  onHistoryChange,
  onBuilderChange,
  onCustomizeChange,
  builder = false,
  paused = false,
  onReport,
  compact = false,
}: {
  paused?: boolean;
  onReport?(prompt: StudyPrompt): void;
  compact?: boolean;
  save: StudySave;
  setup: boolean;
  active: boolean;
  webgl: boolean;
  onSettings(settings: StudySettings): void;
  onStart(settings: StudySettings, targets?: StudyReviewTarget[]): void;
  onStartPlaces?(targets: StudyPlaceTarget[]): void;
  onLocate?(answer: StudyAnswer): void;
  onAction(action: StudyAction): void;
  onSetup(): void;
  onResume?(): void;
  onEditingChange?(editing: boolean): void;
  onPreview?(settings?: StudySettings): void;
  onHome?(): void;
  onViewRecord?(record: StudyRecord): void;
  onHistoryChange?(visible: boolean): void;
  builder?: boolean;
  onBuilderChange?(editing: boolean): void;
  onCustomizeChange?(editing: boolean): void;
}) {
  const panelActive = useContext(PanelActive);
  active = active && panelActive;
  const { settings, session } = save;
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (panelActive) onHistoryChange?.(showHistory);
  }, [panelActive, showHistory, onHistoryChange]);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const closeSettings = useCallback(() => setEditing(false), []);
  useEffect(() => {
    if (!active || setup) setEditing(false);
    onEditingChange?.(active && editing && !setup);
    return () => onEditingChange?.(false);
  }, [active, setup, editing, onEditingChange]);
  const correct = session?.history.at(-1)?.correct;
  useEffect(() => {
    if (
      !active ||
      setup ||
      editing ||
      paused ||
      session?.phase !== "feedback" ||
      !correct ||
      !session.settings.autoAdvance
    )
      return;
    const timer = setTimeout(
      () => onAction({ type: "next" }),
      compact ? 1800 : 650,
    );
    return () => clearTimeout(timer);
  }, [
    active,
    setup,
    editing,
    paused,
    session?.phase,
    session?.prompt.ordinal,
    session?.settings.autoAdvance,
    correct,
    compact,
    onAction,
  ]);
  useEffect(() => {
    if (
      !active ||
      setup ||
      editing ||
      paused ||
      !session ||
      session.phase !== "feedback"
    )
      return;
    const key = (event: KeyboardEvent) => {
      if (
        event.key === "Enter" &&
        !event.repeat &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault();
        onAction({ type: "next" });
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [active, setup, editing, paused, session?.phase, onAction, session]);
  if (showHistory)
    return (
      <StudyHistory
        onStartPlaces={(targets) => {
          setShowHistory(false);
          onStartPlaces?.(targets);
        }}
        records={save.history ?? []}
        onBack={() => setShowHistory(false)}
        onView={(record) => {
          setShowHistory(false);
          onViewRecord?.(record);
        }}
        onStart={(settings, targets) => {
          setShowHistory(false);
          onStart(settings, targets);
        }}
      />
    );
  if (!webgl && session?.phase !== "summary")
    return (
      <section className="info-view" role="status">
        <p>
          This activity requires the 3D globe. Try another browser or device.
        </p>
        {onHome && (
          <button className="quiet-button" onClick={onHome}>
            Home
          </button>
        )}
      </section>
    );
  if (setup || !session) {
    return (
      <StudySetup
        settings={settings}
        onPreview={active ? onPreview : undefined}
        onSettings={onSettings}
        onStart={onStart}
        initialEditor={builder}
        onEditorChange={active ? onBuilderChange : undefined}
        onHistory={() => setShowHistory(true)}
        onResume={session && session.phase !== "summary" ? onResume : undefined}
        resumeLabel="Resume session"
      />
    );
  }
  if (session.phase === "summary")
    return (
      <StudyResults
        onStartPlaces={onStartPlaces}
        session={session}
        onSetup={onSetup}
        onStart={onStart}
        onLocate={onLocate}
        onHome={onHome}
        onHistory={() => setShowHistory(true)}
      />
    );
  const prompt = session.prompt;
  return (
    <>
      {editing && active && (
        <StudySessionOptions
          settings={session.settings}
          locked={!!session.challengeId || !!session.placeReview}
          onPreferencesChange={onCustomizeChange}
          onPause={
            onHome
              ? () => {
                  closeSettings();
                  onHome();
                }
              : undefined
          }
          onFinish={() => {
            closeSettings();
            onAction({ type: "finish" });
          }}
          returnFocus={settingsButton}
          onClose={closeSettings}
          onApply={(draft) => {
            const value = {
              borders: draft.borders,
              countryNames: draft.countryNames,
              capitalMarkers: draft.capitalMarkers,
              capitalNames: draft.capitalNames,
              autoAdvance: draft.autoAdvance,
              revisitMissed: draft.revisitMissed,
            };
            onAction({ type: "preferences", value });
            onSettings({ ...settings, ...value });
            setEditing(false);
          }}
        />
      )}
      <section
        className="info-view study-question"
        aria-label="Study prompt"
        inert={editing}
      >
        <div className="round-overline">
          <span
            className="round-number journey-step"
            aria-label={`Question ${prompt.ordinal + 1}`}
          >
            {prompt.ordinal + 1}
          </span>
          <span className="overline">{prompt.topic.toUpperCase()}</span>
          <span className="round-of">
            {session.settings.length === "continuous"
              ? "KEEP GOING"
              : session.settings.length === "all"
                ? "ONE FULL PASS"
                : `OF ${session.settings.length}`}
          </span>
          <QuestionHelp
            key={`${prompt.ordinal}/${prompt.targetId}`}
            onReport={onReport ? () => onReport(prompt) : undefined}
            sources={
              prompt.place ? (
                <a
                  className="fact-source"
                  href={
                    prompt.place.sourceUrl ??
                    (prompt.place.regionId
                      ? "https://www.naturalearthdata.com/"
                      : "https://www.openstreetmap.org/")
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Map source ↗
                </a>
              ) : (
                <a
                  className="fact-source"
                  href={
                    prompt.topic === "capitals"
                      ? capitalSource.url
                      : prompt.topic === "flags"
                        ? "https://github.com/lipis/flag-icons/tree/c09927e63705529bbf59ca6684cd9b23225dddad"
                        : "https://www.un.org/en/about-us/member-states"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  {prompt.topic === "capitals"
                    ? capitalSource.name
                    : prompt.topic === "flags"
                      ? "flag-icons · pinned flag artwork"
                      : "United Nations · member states"}{" "}
                  ↗
                </a>
              )
            }
          />
          <button
            ref={settingsButton}
            data-dd-action-name="Study Open Session Settings"
            className="settings-button"
            aria-label="Session settings"
            title="Session settings"
            onClick={() => setEditing(true)}
          >
            <SettingsIcon />
          </button>
        </div>
        <h1>{studyPrompt(prompt)}</h1>
        {prompt.topic === "flags" && (
          <figure className="flag-clue">
            <img
              src={FLAGS.get(prompt.targetId)}
              alt={
                session.phase === "playing"
                  ? "Flag to identify"
                  : `Flag of ${countryName(prompt.targetId)}`
              }
            />
          </figure>
        )}
        {session.phase === "playing" ? (
          prompt.style === "map" || isStudyPinPrompt(prompt) ? (
            <div className="study-map-answer">
              <p className="study-map-instruction question-support">
                {webgl
                  ? isStudyPinPrompt(prompt)
                    ? session.pin
                      ? "Pin placed. Move it or submit your answer."
                      : prompt.style === "pin" && prompt.topic === "capitals"
                        ? `Place a pin within ${CAPITAL_PIN_RADIUS_KM} km of the capital, then submit.`
                        : prompt.place && !prompt.place.regionId
                          ? "Place a pin within about 1,042 km, then submit."
                          : "Tap land or water to place your pin, then submit."
                    : "Select your answer on the globe."
                  : isStudyPinPrompt(prompt)
                    ? "The globe isn’t available. Try another browser or device."
                    : canTypeStudyAnswer(prompt)
                      ? "The globe isn’t available. Answer by country name below."
                      : "The globe isn’t available. Open session settings to choose another answer method."}
              </p>
              {isStudyPinPrompt(prompt) ? (
                <QuestionActions
                  showSubmit
                  disabled={!session.pin}
                  onSubmit={() => onAction({ type: "submit" })}
                />
              ) : (
                <QuestionActions showSubmit={false} />
              )}
              {canTypeStudyAnswer(prompt) && (
                <details
                  className="typed-country-guess"
                  open={!webgl || undefined}
                >
                  <summary data-dd-action-name="Study Answer By Name">
                    Answer by name
                  </summary>
                  <form
                    autoComplete="off"
                    onSubmit={(event) => {
                      event.preventDefault();
                      onAction({ type: "submit" });
                    }}
                  >
                    <label className="field">
                      Country name
                      <AnswerInput
                        autoComplete="off"
                        spellCheck={false}
                        enterKeyHint="done"
                        value={session.text}
                        placeholder="Your answer…"
                        onChange={(event) =>
                          onAction({ type: "text", value: event.target.value })
                        }
                      />
                    </label>
                    <QuestionActions
                      submitType="submit"
                      disabled={!session.text.trim()}
                    />
                  </form>
                </details>
              )}
            </div>
          ) : (
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                onAction({ type: "submit" });
              }}
            >
              {prompt.style === "choices" ? (
                <div className="study-choices">
                  {prompt.choices.map((id) => (
                    <label
                      className={session.choiceId === id ? "chosen" : ""}
                      key={id}
                    >
                      <input
                        type="radio"
                        name="study-answer"
                        value={id}
                        checked={session.choiceId === id}
                        onChange={() => onAction({ type: "choice", id })}
                      />
                      {answerLabel(prompt, id)}
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <label className="field">
                    {prompt.topic === "capitals"
                      ? "Capital name"
                      : "Country name"}
                    <AnswerInput
                      autoComplete="off"
                      spellCheck={false}
                      enterKeyHint="done"
                      value={session.text}
                      onChange={(e) =>
                        onAction({ type: "text", value: e.target.value })
                      }
                      placeholder="Your answer…"
                    />
                  </label>
                </>
              )}
              <QuestionActions
                submitType="submit"
                disabled={
                  prompt.style === "choices"
                    ? !session.choiceId
                    : !session.text.trim()
                }
              />
            </form>
          )
        ) : (
          <div
            className={`round-feedback ${correct ? "answer-correct" : "answer-discovered"}`}
            role="status"
          >
            <div className="feedback-label">
              {correct
                ? `✓ ${isStudyPinPrompt(prompt) ? "Well placed." : prompt.style === "typing" ? "Nicely remembered." : "Well spotted."}`
                : "Not quite."}
            </div>
            {isStudyPinPrompt(prompt) ? (
              <p className="study-pin-feedback">
                {studyPinFeedback(session.history.at(-1)!, answerLabel(prompt))}
              </p>
            ) : (
              <p className="study-response">
                <span>Your answer: </span>
                <strong>{session.history.at(-1)?.response}</strong>
              </p>
            )}
            {!correct && (
              <p className="study-response study-correction">
                <span>
                  {isStudyPinPrompt(prompt)
                    ? "Correct location: "
                    : "Correct answer: "}
                </span>
                <strong>{answerLabel(prompt)}</strong>
              </p>
            )}
            <button
              className="primary-button"
              data-dd-action-name="Study Next Question"
              onClick={() => onAction({ type: "next" })}
            >
              {studyComplete(session) ? "See results" : "Next"} <span>→</span>
            </button>
          </div>
        )}
      </section>
    </>
  );
}
// Exported default remains the source of all fresh setups.
export { defaultSettings };
