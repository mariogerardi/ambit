import { StudyBack } from "./StudyBack";
import { CAPITAL_DISTRACTORS } from "./distractors";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { normalizeAnswer, countryIdForName } from "../game/questions";
import {
  COUNTRIES,
  TOPICS,
  settingsError,
  studyPool,
  usesPerTopicMethods,
} from "./engine";
import type { StudySettings, StudyStyle, StudyTopic } from "./engine";
import { STUDY_PATHS } from "./paths";
import { StudyPreferences } from "./StudyPreferences";

const topicNames = {
  countries: "Countries",
  capitals: "Capitals",
  flags: "Flags",
};
const methods: Record<StudyStyle, string> = {
  map: "Tap globe",
  typing: "Type",
  choices: "Multiple choice",
  mixed: "Mixed",
};
const summaryMethods: Record<StudyStyle, string> = {
  map: "Tap globe",
  typing: "Type answers",
  choices: "Multiple choice",
  mixed: "Mixed",
};
const continents: Record<string, string> = {
  AF: "Africa",
  AS: "Asia",
  EU: "Europe",
  NA: "North America",
  SA: "South America",
  OC: "Oceania",
};

export function StudyEditor({
  settings,
  onSettings,
  onStart,
  onResume,
  resumeLabel,
  onBack,
}: {
  settings: StudySettings;
  onSettings(settings: StudySettings): void;
  onStart(settings: StudySettings): void;
  onResume?(): void;
  resumeLabel?: string;
  onBack?(): void;
}) {
  const id = useId();
  const view = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const scroller = view.current?.closest<HTMLElement>(".mode-layer");
    if (scroller) scroller.scrollTop = 0;
    view.current
      ?.querySelector<HTMLButtonElement>(".study-back")
      ?.focus({ preventScroll: true });
  }, []);
  const [search, setSearch] = useState("");
  const update = (patch: Partial<StudySettings>) =>
    onSettings({ ...settings, ...patch });
  const perTopic = usesPerTopicMethods(settings);
  const method = settings.styles[settings.topics[0] ?? "countries"];
  const setMethod = (value: StudyStyle) =>
    update({ styles: { countries: value, capitals: value, flags: value } });
  const pool = studyPool(settings);
  const error = settingsError(settings);
  const summary = studyDescription(settings);
  const choices = settings.topics.some((topic) =>
    ["choices", "mixed"].includes(settings.styles[topic]),
  );
  const toggleTopic = (topic: StudyTopic) => {
    const adding = !settings.topics.includes(topic);
    update({
      topics: adding
        ? TOPICS.filter(
            (value) => settings.topics.includes(value) || value === topic,
          )
        : settings.topics.filter((value) => value !== topic),
      styles:
        adding && !perTopic
          ? { ...settings.styles, [topic]: method }
          : settings.styles,
    });
  };
  return (
    <section
      ref={view}
      className="info-view study-setup study-editor"
      aria-label="Study setup"
    >
      <div className="study-editor-scroll">
        {onBack && <StudyBack label="Back to paths" onClick={onBack} />}
        <h1 className="editorial-heading">
          Build a <em>session.</em>
        </h1>
        <div className="study-config">
          <div className="study-config-row">
            <label htmlFor={`${id}-where`}>Where</label>
            <div className="study-where-controls">
              <select
                id={`${id}-where`}
                value={settings.scope}
                onChange={(event) =>
                  update({
                    scope: event.target.value as StudySettings["scope"],
                  })
                }
              >
                <option value="all">Worldwide</option>
                <option value="continent">One continent</option>
                <option value="custom">Choose countries</option>
              </select>
              {settings.scope === "continent" && (
                <select
                  aria-label="Continent"
                  value={settings.continent}
                  onChange={(event) =>
                    update({ continent: event.target.value })
                  }
                >
                  {Object.entries(continents).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
              {settings.scope === "custom" && (
                <details className="study-country-picker" open>
                  <summary>{pool.length} selected · Edit countries</summary>
                  <p className="muted study-country-help">
                    Select countries on the globe or by name.
                  </p>
                  <input
                    type="search"
                    aria-label="Find countries to include"
                    placeholder="Find a country…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <div className="custom-pool">
                    {COUNTRIES.filter(
                      (country) =>
                        normalizeAnswer(country.name).includes(
                          normalizeAnswer(search),
                        ) ||
                        country.id ===
                          countryIdForName(
                            {
                              names: new Map(
                                COUNTRIES.map((c) => [c.id, c.name]),
                              ),
                            },
                            search,
                          ),
                    ).map((country) => (
                      <label key={country.id}>
                        <input
                          type="checkbox"
                          checked={settings.countryIds.includes(country.id)}
                          onChange={(event) =>
                            update({
                              countryIds: event.target.checked
                                ? [...settings.countryIds, country.id]
                                : settings.countryIds.filter(
                                    (value) => value !== country.id,
                                  ),
                            })
                          }
                        />
                        {country.name}
                      </label>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
          <div
            className="study-config-row"
            role="group"
            aria-labelledby={`${id}-topics`}
          >
            <span id={`${id}-topics`}>What to practice</span>
            <div className="study-topic-picks">
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  aria-pressed={settings.topics.includes(topic)}
                  onClick={() => toggleTopic(topic)}
                >
                  {topicNames[topic]}
                </button>
              ))}
            </div>
          </div>
          {!perTopic && (
            <div className="study-config-row">
              <label htmlFor={`${id}-method`}>Answer method</label>
              <select
                id={`${id}-method`}
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as StudyStyle)
                }
              >
                {Object.entries(methods).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <label className="study-method-toggle">
            <input
              type="checkbox"
              checked={perTopic}
              onChange={(event) =>
                update({
                  perTopicMethods: event.target.checked,
                  ...(!event.target.checked
                    ? {
                        styles: {
                          countries: method,
                          capitals: method,
                          flags: method,
                        },
                      }
                    : {}),
                })
              }
            />
            Use different methods by topic
          </label>
          {perTopic && (
            <div className="study-method-details">
              {settings.topics.map((topic) => (
                <label key={topic} className="study-config-row">
                  <span>{topicNames[topic]}</span>
                  <select
                    aria-label={`${topicNames[topic]} answer method`}
                    value={settings.styles[topic]}
                    onChange={(event) =>
                      update({
                        styles: {
                          ...settings.styles,
                          [topic]: event.target.value as StudyStyle,
                        },
                      })
                    }
                  >
                    {Object.entries(methods).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          )}
          {settings.topics.includes("capitals") &&
            ["choices", "mixed"].includes(settings.styles.capitals) && (
              <>
                <label className="study-config-row">
                  <span>Capital distractors</span>
                  <select
                    aria-label="Capital distractors"
                    value={settings.capitalDistractors ?? "study"}
                    onChange={(event) =>
                      update({
                        capitalDistractors: event.target
                          .value as StudySettings["capitalDistractors"],
                      })
                    }
                  >
                    {Object.entries(CAPITAL_DISTRACTORS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                {settings.capitalDistractors === "countryCities" && (
                  <p className="muted study-distractor-note">
                    Uses the bundled major-city catalog. Countries without
                    another city are excluded from this session when capitals
                    use multiple choice; mixed practice uses map or typing
                    there. Fewer options appear when fewer distinct cities are
                    available.
                  </p>
                )}
              </>
            )}
          {choices && (
            <label className="study-config-row">
              <span>Number of options</span>
              <select
                aria-label="Number of options"
                value={settings.choiceCount ?? 6}
                onChange={(event) =>
                  update({
                    choiceCount: Number(
                      event.target.value,
                    ) as StudySettings["choiceCount"],
                  })
                }
              >
                {[2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>
                    {value} options
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="study-config-row">
            <label htmlFor={`${id}-length`}>Session length</label>
            <select
              id={`${id}-length`}
              value={settings.length}
              onChange={(event) =>
                update({
                  length: ["continuous", "all"].includes(event.target.value)
                    ? (event.target.value as "continuous" | "all")
                    : (Number(event.target.value) as 10 | 20 | 50),
                })
              }
            >
              {[10, 20, 50, "all", "continuous"].map((value) => (
                <option key={value} value={value}>
                  {value === "continuous"
                    ? "Keep going"
                    : value === "all"
                      ? "Cover everything once"
                      : `${value} questions`}
                </option>
              ))}
            </select>
          </div>
          {settings.length === "all" && (
            <p className="muted study-coverage-note">
              Finishes after every selected country and topic.
              {settings.revisitMissed &&
                " Missed answers can repeat during the session."}
            </p>
          )}
        </div>
        <details className="study-advanced">
          <summary>Hints &amp; pacing</summary>
          <StudyPreferences settings={settings} onSettings={onSettings} />
        </details>
      </div>
      <div className="study-start">
        <div className="study-session-review">
          <h2>Your session</h2>
          <p
            className="study-session-description"
            aria-live="polite"
            aria-atomic="true"
          >
            {summary}
          </p>
        </div>
        {error && (
          <p className="input-error" role="status">
            {error}
          </p>
        )}
        <button
          className="primary-button"
          disabled={!!error}
          onClick={() => onStart(settings)}
        >
          {onResume ? "Start new session" : "Start studying"} <span>→</span>
        </button>
        {onResume && (
          <aside className="study-replacement-note">
            <p>Starting a new session replaces your current session.</p>
            <button className="quiet-button tertiary-action" onClick={onResume}>
              {resumeLabel ?? "Resume session"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </aside>
        )}
      </div>
    </section>
  );
}

export function StudySetup(props: {
  settings: StudySettings;
  onPreview?(settings?: StudySettings): void;
  onSettings(settings: StudySettings): void;
  onStart(settings: StudySettings): void;
  onResume?(): void;
  resumeLabel?: string;
  initialEditor?: boolean;
  onHistory?(): void;
  onEditorChange?(editing: boolean): void;
}) {
  const [editing, setEditing] = useState(!!props.initialEditor);
  useEffect(() => {
    props.onEditorChange?.(editing);
    return () => props.onEditorChange?.(false);
  }, [editing, props.onEditorChange]);
  useEffect(() => {
    props.onPreview?.(editing ? props.settings : undefined);
    return () => props.onPreview?.(undefined);
  }, [editing, props.settings, props.onPreview]);
  const view = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!editing) {
      const scroller = view.current?.closest<HTMLElement>(".mode-layer");
      if (scroller) scroller.scrollTop = 0;
    }
  }, [editing]);
  if (editing)
    return <StudyEditor {...props} onBack={() => setEditing(false)} />;
  return (
    <section
      ref={view}
      className="info-view study-setup study-landing"
      aria-label="Study setup"
    >
      <h1 className="editorial-heading">
        Make the world <em>familiar.</em>
      </h1>
      <p className="muted study-introduction">
        Practice countries, capitals and flags. Choose a path or build your own
        session.
      </p>
      {props.onResume && (
        <button
          className="primary-button study-resume-button"
          onClick={props.onResume}
        >
          {props.resumeLabel ?? "Resume session"}{" "}
          <span aria-hidden="true">→</span>
        </button>
      )}
      <div className="study-paths">
        {STUDY_PATHS.map((path) => (
          <article className="study-path" key={path.id}>
            <button
              className="study-path-start"
              aria-label={`Start ${path.title}`}
              onClick={() => props.onStart(structuredClone(path.settings))}
            >
              <span aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 12h16m-7-7 7 7-7 7" />
                </svg>
              </span>
            </button>
            <h3>{path.title}</h3>
            <p>{path.description}</p>
            <small>{path.detail}</small>
            <div className="inline-actions">
              <button
                className="quiet-button study-path-customize"
                aria-label={`Customize ${path.title}`}
                onClick={() => {
                  props.onSettings(structuredClone(path.settings));
                  setEditing(true);
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  aria-hidden="true"
                >
                  <path d="m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-4-4L4 15Z" />
                </svg>
                <span>Customize</span>
              </button>
            </div>
          </article>
        ))}
        <button
          className="study-path study-path-build"
          aria-label="Custom"
          onClick={() => setEditing(true)}
        >
          <span className="study-path-build-heading">
            <strong>Custom</strong>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 4v16M4 12h16" />
            </svg>
          </span>
          <span>Choose your places, topics, and pace.</span>
        </button>
      </div>
      {props.onHistory && (
        <button
          className="quiet-button tertiary-action study-history-link"
          onClick={props.onHistory}
        >
          Past study sessions
        </button>
      )}
    </section>
  );
}

export function studyDescription(settings: StudySettings) {
  const area =
    settings.scope === "all"
      ? "Worldwide"
      : settings.scope === "continent"
        ? continents[settings.continent]
        : `${studyPool(settings).length} chosen countries`;
  return [
    settings.topics.map((topic) => topicNames[topic]).join(" + ") ||
      "Choose topics",
    usesPerTopicMethods(settings)
      ? "Per-topic methods"
      : summaryMethods[settings.styles[settings.topics[0] ?? "countries"]],
    area,
    settings.length === "continuous"
      ? "Keep going"
      : settings.length === "all"
        ? "One complete pass"
        : `${settings.length} questions`,
  ].join(" · ");
}
