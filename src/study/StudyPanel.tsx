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
import { SettingsIcon } from "../app/SettingsIcon";
import { StudyResults } from "./StudyResults";
import { StudySetup } from "./StudySetup";
import { StudySessionOptions } from "./StudySessionOptions";
import { AnswerInput } from "../game/AnswerInput";
import { StudyHistory } from "./StudyHistory";
export function StudyPanel({
  save,
  setup,
  active,
  onSettings,
  onStart,
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
          locked={!!session.challengeId}
          onPreferencesChange={onCustomizeChange}
          onPause={
            onHome
              ? () => {
                  closeSettings();
                  onHome();
                }
              : undefined
          }
          onReport={
            onReport
              ? () => {
                  closeSettings();
                  onReport(prompt);
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
          <button
            ref={settingsButton}
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
          prompt.style === "map" ? (
            <div className="study-map-answer">
              <p className="study-map-instruction muted">
                {webgl
                  ? "Tap your answer on the globe."
                  : canTypeStudyAnswer(prompt)
                    ? "The globe is unavailable. Answer by country name below."
                    : "The globe is unavailable. Open session settings to build a session with another answer method."}
              </p>
              {canTypeStudyAnswer(prompt) && (
                <details
                  className="typed-country-guess"
                  open={!webgl || undefined}
                >
                  <summary>Answer by name</summary>
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
                    <button
                      className="primary-button"
                      disabled={!session.text.trim()}
                    >
                      Submit answer <span>→</span>
                    </button>
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
              <button
                className="primary-button"
                disabled={
                  prompt.style === "choices"
                    ? !session.choiceId
                    : !session.text.trim()
                }
              >
                Submit answer <span>→</span>
              </button>
            </form>
          )
        ) : (
          <div
            className={`round-feedback ${correct ? "answer-correct" : "answer-discovered"}`}
            role="status"
          >
            <div className="feedback-label">
              {correct
                ? `✓ ${prompt.style === "typing" ? "Nicely remembered." : "Well spotted."}`
                : "Not quite."}
            </div>
            <p className="study-response">
              <span>Your answer: </span>
              <strong>{session.history.at(-1)?.response}</strong>
            </p>
            {!correct && (
              <p className="study-response study-correction">
                <span>Correct answer: </span>
                <strong>{answerLabel(prompt)}</strong>
              </p>
            )}
            <button
              className="primary-button"
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
