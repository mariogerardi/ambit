import { StudyNavigation } from "./StudyNavigation";
import { CAPITAL_DISTRACTORS } from "./distractors";
import { useContext, useEffect, useId, useRef, useState } from "react";
import { normalizeAnswer, countryIdForName } from "../game/answerNames";
import {
  COUNTRIES,
  defaultSettings,
  TOPICS,
  settingsError,
  studyPool,
  usesPerTopicMethods,
  studyStyle,
} from "./engine";
import type { StudySettings, StudyStyle, StudyTopic } from "./engine";
import { StudyPreferences } from "./StudyPreferences";
import type { ReactNode } from "react";
import { PanelActive } from "../app/ModePanels";
import {
  STUDY_CONTINENTS as continents,
  continentCountryIds,
  selectedContinents,
} from "./areas";
import { ActionIcon } from "../app/ActionIcon";

const topicNames = {
  countries: "Countries",
  capitals: "Capitals",
  flags: "Flags",
  cities: "Major Cities",
  landmarks: "Landmarks",
};
const methods: Record<StudyStyle, string> = {
  map: "Select on globe",
  pin: "Place a pin",
  typing: "Type",
  choices: "Multiple choice",
  mixed: "Mixed",
};
const summaryMethods: Record<StudyStyle, string> = {
  map: "Select on globe",
  pin: "Place a pin",
  typing: "Type answers",
  choices: "Multiple choice",
  mixed: "Mixed",
};
const advancedDefaults = {
  borders: defaultSettings.borders,
  countryNames: defaultSettings.countryNames,
  capitalMarkers: defaultSettings.capitalMarkers,
  capitalNames: defaultSettings.capitalNames,
  autoAdvance: defaultSettings.autoAdvance,
  revisitMissed: defaultSettings.revisitMissed ?? false,
  choiceCount: defaultSettings.choiceCount ?? 6,
  capitalDistractors: defaultSettings.capitalDistractors ?? "study",
};

type BuilderSection = "topics" | "area" | "method" | "length" | "advanced";
function ConfigurationSection({
  section,
  title,
  summary,
  active,
  onSelect,
  children,
  className = "",
}: {
  section: BuilderSection;
  title: string;
  summary: ReactNode;
  active?: BuilderSection;
  onSelect(section: BuilderSection | undefined): void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`study-builder-section ${className}`}
      open={active === section}
    >
      <summary
        onClick={(event) => {
          event.preventDefault();
          onSelect(active === section ? undefined : section);
        }}
      >
        <span className="study-section-title">{title}</span>
        <span
          className={`study-section-summary${section === "advanced" ? " study-advanced-summary" : ""}`}
          title={typeof summary === "string" ? summary : undefined}
        >
          {summary}
        </span>
        <svg
          className="study-section-chevron"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </summary>
      <div className="study-section-content">{children}</div>
    </details>
  );
}

function StudyConfiguration({
  settings,
  onSettings,
  expanded,
}: {
  settings: StudySettings;
  onSettings(settings: StudySettings): void;
  expanded: boolean;
}) {
  const id = useId();
  const [search, setSearch] = useState("");
  const [section, setSection] = useState<BuilderSection | undefined>("topics");
  const [multipleAreas, setMultipleAreas] = useState(
    () =>
      settings.scope === "custom" && selectedContinents(settings).length > 0,
  );
  const selectedAreas = selectedContinents(settings);
  useEffect(() => {
    // A globe edit can turn whole continents into an individual-country selection.
    if (
      multipleAreas &&
      settings.scope === "custom" &&
      settings.countryIds.length &&
      !selectedAreas.length
    )
      setMultipleAreas(false);
  }, [
    multipleAreas,
    settings.scope,
    settings.countryIds,
    selectedAreas.length,
  ]);
  const update = (patch: Partial<StudySettings>) =>
    onSettings({ ...settings, ...patch });
  const multipleTopics = settings.topics.length > 1;
  const individualMethods = usesPerTopicMethods(settings);
  const perTopic = multipleTopics && individualMethods;
  const method = studyStyle(settings, settings.topics[0] ?? "countries");
  const sharedStyles = (value: StudyStyle) => ({
    ...settings.styles,
    countries: value,
    capitals: value,
    flags: value,
    ...Object.fromEntries(settings.topics.map((topic) => [topic, value])),
  });
  const setMethod = (value: StudyStyle) =>
    update({
      styles: sharedStyles(value),
    });
  const pool = studyPool(settings);
  const choices = settings.topics.some((topic) =>
    ["choices", "mixed"].includes(studyStyle(settings, topic)),
  );
  const advancedChanges = (
    [
      ["borders", settings.borders ? "Country borders" : "No country borders"],
      ["countryNames", "Country names"],
      ["capitalMarkers", "Capital markers"],
      ["capitalNames", "Capital names"],
      [
        "autoAdvance",
        settings.autoAdvance ? "Automatic advance" : "Manual advance",
      ],
      ["revisitMissed", "Revisit missed questions"],
    ] as const
  )
    .filter(
      ([key]) =>
        (settings[key] ?? advancedDefaults[key]) !== advancedDefaults[key],
    )
    .map(([, label]) => label as string);
  if (
    choices &&
    (settings.choiceCount ?? advancedDefaults.choiceCount) !==
      advancedDefaults.choiceCount
  )
    advancedChanges.push(`${settings.choiceCount} answer choices`);
  if (
    settings.topics.includes("capitals") &&
    ["choices", "mixed"].includes(studyStyle(settings, "capitals")) &&
    (settings.capitalDistractors ?? advancedDefaults.capitalDistractors) !==
      advancedDefaults.capitalDistractors
  )
    advancedChanges.push(CAPITAL_DISTRACTORS[settings.capitalDistractors!]);
  const toggleTopic = (topic: StudyTopic) => {
    const adding = !settings.topics.includes(topic);
    update({
      topics: expanded
        ? adding
          ? TOPICS.filter(
              (value) => settings.topics.includes(value) || value === topic,
            )
          : settings.topics.filter((value) => value !== topic)
        : [topic],
      styles:
        adding && !individualMethods
          ? { ...settings.styles, [topic]: method }
          : settings.styles,
    });
  };
  return (
    <div className="study-configuration">
      <ConfigurationSection
        section="topics"
        title="Topics"
        summary={
          settings.topics.map((topic) => topicNames[topic]).join(" · ") ||
          "Choose topics"
        }
        active={section}
        onSelect={setSection}
        className=""
      >
        <div
          className="study-practice-selector"
          role="group"
          aria-label="What to practice"
        >
          {TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              aria-pressed={settings.topics.includes(topic)}
              onClick={() => toggleTopic(topic)}
            >
              {topicNames[topic]}
            </button>
          ))}
        </div>
        <p className="study-multiple-note">Choose one or more topics.</p>
      </ConfigurationSection>
      <ConfigurationSection
        section="area"
        title="Area"
        summary={
          settings.scope === "all"
            ? "Worldwide"
            : settings.scope === "continent"
              ? continents[settings.continent]
              : selectedAreas.length
                ? selectedAreas.map((area) => continents[area]).join(" · ")
                : `${pool.length} countries`
        }
        active={section}
        onSelect={setSection}
        className=""
      >
        <p className="study-section-guidance">
          Choose an area, or combine several continents.
        </p>
        <div className="study-config study-inline-controls">
          {" "}
          <div className="study-config-row">
            <label className="sr-only" htmlFor={`${id}-area`}>
              Area
            </label>
            <select
              id={`${id}-area`}
              value={
                multipleAreas && settings.scope === "custom"
                  ? "multiple"
                  : settings.scope === "continent"
                    ? settings.continent
                    : settings.scope
              }
              onChange={(event) => {
                const multiple = event.target.value === "multiple";
                setMultipleAreas(multiple);
                update(
                  multiple
                    ? {
                        scope: "custom",
                        countryIds: continentCountryIds(selectedAreas),
                      }
                    : event.target.value === "all" ||
                        event.target.value === "custom"
                      ? { scope: event.target.value }
                      : { scope: "continent", continent: event.target.value },
                );
              }}
            >
              <option value="all">Worldwide</option>
              {Object.entries(continents).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
              <option value="multiple">Choose multiple continents</option>
              <option value="custom">Choose countries</option>
            </select>
          </div>
        </div>{" "}
        {multipleAreas && settings.scope === "custom" && (
          <div
            className="study-continent-picks"
            role="group"
            aria-label="Continents to study"
          >
            {Object.entries(continents).map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={selectedAreas.includes(value)}
                  onChange={(event) =>
                    update({
                      scope: "custom",
                      countryIds: continentCountryIds(
                        event.target.checked
                          ? [...selectedAreas, value]
                          : selectedAreas.filter((area) => area !== value),
                      ),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </div>
        )}
        <div className="study-country-selection">
          {settings.scope === "custom" && !multipleAreas && (
            <details className="study-country-picker" open>
              <summary data-dd-action-name="Study Edit Countries">
                {pool.length} selected · Edit countries
              </summary>
              <p className="muted study-country-help">
                Select countries on the globe or by name.
              </p>
              <input
                type="search"
                data-dd-action-name="Study Search Countries"
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
                          names: new Map(COUNTRIES.map((c) => [c.id, c.name])),
                        },
                        search,
                      ),
                ).map((country) => (
                  <label
                    key={country.id}
                    data-dd-action-name="Study Toggle Country"
                  >
                    <input
                      type="checkbox"
                      data-dd-action-name="Study Toggle Country"
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
      </ConfigurationSection>
      <ConfigurationSection
        section="method"
        title="Answer method"
        summary={perTopic ? "Individual topic methods" : methods[method]}
        active={section}
        onSelect={setSection}
        className=""
      >
        <p className="study-section-guidance">Choose how you’ll answer.</p>
        <div className="study-config study-inline-controls">
          {" "}
          <div
            className="study-config-row study-method-row"
            role="group"
            aria-labelledby={`${id}-method-heading`}
          >
            <span
              id={`${id}-method-heading`}
              className="study-method-heading sr-only"
            >
              Answer method
            </span>
            <div className="study-method-customization">
              <label
                className="study-method-toggle"
                data-disabled={!multipleTopics || undefined}
                data-dd-action-name="Study Toggle Topic Methods"
              >
                <input
                  type="checkbox"
                  data-dd-action-name="Study Toggle Topic Methods"
                  checked={perTopic}
                  disabled={!multipleTopics}
                  aria-describedby={
                    !multipleTopics ? `${id}-topic-method-help` : undefined
                  }
                  onChange={(event) =>
                    update({
                      perTopicMethods: event.target.checked,
                      ...(!event.target.checked
                        ? {
                            styles: sharedStyles(method),
                          }
                        : {}),
                    })
                  }
                />
                Choose a unique answer method for each topic
              </label>
              {!multipleTopics && (
                <p id={`${id}-topic-method-help`} className="study-method-help">
                  Available with two or more topics.
                </p>
              )}
              {!perTopic ? (
                <select
                  id={`${id}-method`}
                  aria-label="Answer method"
                  data-dd-action-name="Study Select Answer Method"
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
              ) : (
                <div className="study-method-details">
                  {settings.topics.map((topic) => (
                    <label key={topic} className="study-config-row">
                      <span>{topicNames[topic]}</span>
                      <select
                        aria-label={`${topicNames[topic]} answer method`}
                        data-dd-action-name={`Study Select ${topicNames[topic]} Method`}
                        value={studyStyle(settings, topic)}
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
            </div>
          </div>
        </div>
        {settings.topics.some(
          (topic) => topic === "cities" || topic === "landmarks",
        ) && (
          <p className="study-method-help study-place-method-help">
            {perTopic
              ? "City and landmark pins are correct within 50 km."
              : {
                  map: "Find the country containing each named city or landmark.",
                  pin: "Place your pin within 50 km of the named place.",
                  typing: "Name the place marked on the globe.",
                  choices: "Identify the marked place from the answer choices.",
                  mixed: "Questions vary between locating and naming places.",
                }[method]}
          </p>
        )}
      </ConfigurationSection>
      <ConfigurationSection
        section="length"
        title="Session length"
        summary={
          settings.length === "continuous"
            ? "Keep going"
            : settings.length === "all"
              ? "One complete pass"
              : `${settings.length} questions`
        }
        active={section}
        onSelect={setSection}
        className=""
      >
        <p className="study-section-guidance">
          Choose a question count, one complete pass, or keep going.
        </p>
        <div className="study-config study-inline-controls">
          {" "}
          <div className="study-config-row">
            <label className="sr-only" htmlFor={`${id}-length`}>
              Session length
            </label>
            <select
              id={`${id}-length`}
              aria-describedby={
                settings.length === "all" ? `${id}-coverage` : undefined
              }
              data-dd-action-name="Study Select Length"
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
                      ? "One complete pass"
                      : `${value} questions`}
                </option>
              ))}
            </select>
            {settings.length === "all" && (
              <p id={`${id}-coverage`} className="muted study-coverage-note">
                Finishes after every selected place and topic.
                {settings.revisitMissed &&
                  " Missed answers can repeat during the session."}
              </p>
            )}
          </div>
        </div>{" "}
      </ConfigurationSection>
      <ConfigurationSection
        section="advanced"
        title="Advanced options"
        summary={
          advancedChanges.length
            ? advancedChanges.map((change) => (
                <span key={change}>{change}</span>
              ))
            : "Default"
        }
        active={section}
        onSelect={setSection}
        className="study-extra-options study-advanced"
      >
        <p className="study-section-guidance">
          Adjust answer choices, globe hints, and pacing.
        </p>
        {settings.topics.includes("capitals") &&
          ["choices", "mixed"].includes(settings.styles.capitals) && (
            <>
              <label className="study-config-row">
                <span>Other answer choices</span>
                <select
                  aria-label="Other answer choices"
                  data-dd-action-name="Study Select Capital Distractors"
                  value={settings.capitalDistractors ?? "study"}
                  onChange={(event) =>
                    update({
                      capitalDistractors: event.target
                        .value as StudySettings["capitalDistractors"],
                    })
                  }
                >
                  {Object.entries(CAPITAL_DISTRACTORS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {settings.capitalDistractors === "countryCities" && (
                <p className="muted study-distractor-note">
                  Uses major cities included in Ambit. Countries without another
                  listed city are skipped in multiple-choice practice; mixed
                  practice uses map or typing instead. Some questions may have
                  fewer choices.
                </p>
              )}
            </>
          )}
        {choices && (
          <label className="study-config-row">
            <span>Number of options</span>
            <select
              aria-label="Number of options"
              data-dd-action-name="Study Select Option Count"
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

        <StudyPreferences settings={settings} onSettings={onSettings} />
        <button
          type="button"
          className="quiet-button study-advanced-reset"
          onClick={() => update(advancedDefaults)}
          disabled={!advancedChanges.length}
        >
          <ActionIcon name="undo" /> Reset advanced options
        </button>
      </ConfigurationSection>
    </div>
  );
}

export function StudySetup(props: {
  settings: StudySettings;
  onPreview?(settings?: StudySettings): void;
  onSettings(settings: StudySettings): void;
  onStart(settings: StudySettings): void;
  webgl?: boolean;
  onEditorChange?(editing: boolean): void;
}) {
  const { settings } = props;
  const panelActive = useContext(PanelActive);
  const onPreview = useRef(props.onPreview);
  onPreview.current = props.onPreview;
  useEffect(() => {
    if (panelActive) props.onPreview?.(settings);
  }, [panelActive, settings, props.onPreview]);
  useEffect(() => () => onPreview.current?.(undefined), []);
  useEffect(() => {
    if (panelActive) props.onEditorChange?.(true);
    return () => props.onEditorChange?.(false);
  }, [panelActive, props.onEditorChange]);
  const error = settingsError(settings);
  return (
    <section
      className="info-view study-view study-setup study-builder"
      aria-label="Study setup"
    >
      <StudyNavigation />
      <h1 className="editorial-heading">
        Set your own <em>course.</em>
      </h1>
      {props.webgl === false && (
        <p className="study-availability">
          The globe is unavailable. Typing and multiple choice still work.
        </p>
      )}
      <section
        className="study-practice-preview"
        aria-label="Session configuration"
      >
        <StudyConfiguration
          settings={settings}
          onSettings={props.onSettings}
          expanded
        />
        <p className="sr-only study-session-description" aria-live="polite">
          {studyDescription(settings)}
        </p>
        {error && (
          <p className="input-error" role="status">
            {error}
          </p>
        )}
        <div className="study-preview-actions study-start">
          <button
            type="button"
            className="primary-button"
            disabled={!!error}
            onClick={() => props.onStart(structuredClone(settings))}
          >
            Start session <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </section>
  );
}

export function studyDescription(settings: StudySettings) {
  const area =
    settings.scope === "all"
      ? "Worldwide"
      : settings.scope === "continent"
        ? continents[settings.continent]
        : selectedContinents(settings).length
          ? selectedContinents(settings)
              .map((area) => continents[area])
              .join(" · ")
          : `${studyPool(settings).length} chosen countries`;
  return [
    settings.topics.map((topic) => topicNames[topic]).join(" + ") ||
      "Choose topics",
    usesPerTopicMethods(settings)
      ? "Per-topic methods"
      : summaryMethods[studyStyle(settings, settings.topics[0] ?? "countries")],
    area,
    settings.length === "continuous"
      ? "Keep going"
      : settings.length === "all"
        ? "One complete pass"
        : `${settings.length} questions`,
  ].join(" · ");
}
