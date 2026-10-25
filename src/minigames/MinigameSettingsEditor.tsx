import { useId, useLayoutEffect, useRef, useState } from "react";
import roster from "../game/data/un-members.v1.json";
import { normalizeAnswer } from "../game/answerNames";
import {
  defaultMinigameSettings,
  MINIGAME_REGIONS,
  PINPOINT_CATEGORIES,
  defaultCategories,
  usesDefaultMinigameRules,
} from "./minigameSettings";
import type { MinigameSettings } from "./minigameSettings";
import type { BorderMinigame } from "./sharedNeighbors";

export function MinigameSettingsEditor({
  kind,
  settings,
  onChange,
}: {
  kind: BorderMinigame;
  settings: MinigameSettings;
  onChange(settings: MinigameSettings): void;
}) {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const [search, setSearch] = useState("");
  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);
  const update = (patch: Partial<MinigameSettings>) =>
    onChange({ ...settings, ...patch });
  const include = (countryId: string) =>
    update({
      excludedCountries: settings.excludedCountries.filter(
        (value) => value !== countryId,
      ),
    });
  const missing = kind === "missing-borders";
  const pinpoint = kind === "pinpoint";
  const borderRun = kind === "border-run";
  const matches = roster.members.filter((country) =>
    normalizeAnswer(country.name).includes(normalizeAnswer(search)),
  );
  return (
    <div className="minigame-settings">
      <div className="minigame-settings-heading">
        <h3 ref={heading} tabIndex={-1}>
          Game options
        </h3>
      </div>
      <section className="minigame-setting-group" aria-labelledby={`${id}-map`}>
        <h4 id={`${id}-map`}>
          {pinpoint
            ? "Places in play"
            : missing
              ? "Map & search"
              : "Border rules"}
        </h4>
        {pinpoint ? (
          <>
            <p>
              Ten rounds. Point locations score by distance; areas score for a
              pin inside.
            </p>
            {Object.entries(PINPOINT_CATEGORIES).map(([value, label]) => (
              <label className="minigame-setting-row" key={value}>
                <span>
                  {label}
                  {value === "cities" && (
                    <small>
                      National capitals and cities with populations of at least
                      one million, according to the source data.
                    </small>
                  )}
                  {value === "landmarks" && (
                    <small>
                      60 landmarks in 60 countries, from historic sites and
                      monuments to natural wonders.
                    </small>
                  )}
                  {value === "regions" && (
                    <small>
                      The 50 U.S. states, using the app’s existing boundaries.
                    </small>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={(settings.categories ?? defaultCategories).includes(
                    value as keyof typeof PINPOINT_CATEGORIES,
                  )}
                  onChange={(event) =>
                    update({
                      categories: event.target.checked
                        ? [
                            ...(settings.categories ?? defaultCategories),
                            value as keyof typeof PINPOINT_CATEGORIES,
                          ]
                        : (settings.categories ?? defaultCategories).filter(
                            (c) => c !== value,
                          ),
                    })
                  }
                />
              </label>
            ))}
          </>
        ) : borderRun ? (
          <>
            <label className="minigame-setting-row">
              <span>
                Show borders
                <small>
                  Display country borders while choosing your answer.
                </small>
              </span>
              <input
                type="checkbox"
                checked={settings.showBorders ?? false}
                onChange={(e) => update({ showBorders: e.target.checked })}
              />
            </label>
            <p>
              Routes stay on connected land. Excluded countries are removed from
              every route.
            </p>
          </>
        ) : missing ? (
          <>
            <label className="minigame-setting-row" htmlFor={`${id}-region`}>
              <span>Rounds from</span>
              <select
                id={`${id}-region`}
                value={settings.region}
                onChange={(event) =>
                  update({
                    region: event.target.value as MinigameSettings["region"],
                  })
                }
              >
                {Object.entries(MINIGAME_REGIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="minigame-search-options">
              <legend>Search area</legend>
              <div className="minigame-search-choices">
                <button
                  type="button"
                  aria-pressed={settings.framing === "regional"}
                  onClick={() => update({ framing: "regional" })}
                >
                  Regional
                </button>
                <button
                  type="button"
                  aria-pressed={settings.framing === "wide"}
                  onClick={() => update({ framing: "wide" })}
                >
                  Continent-wide
                </button>
              </div>
              <p>
                Search a whole continent or narrow the hunt to a smaller region.
              </p>
            </fieldset>
            <label className="minigame-setting-row">
              <span>
                Exclude small countries
                <small>
                  Skip merged shapes containing a country smaller than 2,500
                  km²—roughly Luxembourg’s size.
                </small>
              </span>
              <input
                type="checkbox"
                checked={settings.excludeSmallCountries ?? true}
                onChange={(event) =>
                  update({ excludeSmallCountries: event.target.checked })
                }
              />
            </label>
          </>
        ) : (
          <>
            <label className="minigame-setting-row">
              <span>
                Include exclaves and overseas territories
                <small>
                  When off, overseas and exclave-only border relationships
                  aren’t used.
                </small>
              </span>
              <input
                type="checkbox"
                checked={settings.includeTerritories}
                onChange={(event) =>
                  update({ includeTerritories: event.target.checked })
                }
              />
            </label>
            <label className="minigame-setting-row">
              <span>Exclude countries that border each other</span>
              <input
                type="checkbox"
                checked={settings.excludeAdjacentClues}
                onChange={(event) =>
                  update({ excludeAdjacentClues: event.target.checked })
                }
              />
            </label>
          </>
        )}
      </section>
      {!pinpoint && (
        <section className="minigame-setting-group">
          <details className="minigame-country-picker">
            <summary>
              <span>Excluded countries</span>
              <span className="minigame-excluded-count">
                {settings.excludedCountries.length}
              </span>
              <svg
                viewBox="0 0 16 16"
                width="16"
                height="16"
                aria-hidden="true"
              >
                <path
                  d="m4 6 4 4 4-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
            </summary>
            <p>
              {missing
                ? "These countries won’t be part of a merged territory."
                : borderRun
                  ? "These countries won’t be endpoints or part of a route."
                  : "These countries won’t be clues or answers."}
            </p>
            <input
              type="search"
              aria-label="Find countries to exclude"
              placeholder="Find a country…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="minigame-country-list">
              {matches.map((country) => (
                <label key={country.id}>
                  <input
                    type="checkbox"
                    checked={settings.excludedCountries.includes(country.id)}
                    onChange={(event) =>
                      event.target.checked
                        ? update({
                            excludedCountries: [
                              ...settings.excludedCountries,
                              country.id,
                            ],
                          })
                        : include(country.id)
                    }
                  />
                  <span>{country.name}</span>
                </label>
              ))}
              {!matches.length && <p>No matching countries.</p>}
            </div>
          </details>
          {!!settings.excludedCountries.length && (
            <div
              className="minigame-excluded-chips"
              aria-label="Excluded countries"
            >
              {roster.members
                .filter((country) =>
                  settings.excludedCountries.includes(country.id),
                )
                .map((country) => (
                  <button
                    key={country.id}
                    aria-label={`Include ${country.name} again`}
                    onClick={() => include(country.id)}
                  >
                    {country.name}
                    <span aria-hidden="true">×</span>
                  </button>
                ))}
            </div>
          )}
        </section>
      )}
      <div className="minigame-settings-reset">
        <p className="minigame-score-eligibility" role="status">
          {usesDefaultMinigameRules(settings, kind)
            ? "Default rules · Personal bests are recorded."
            : "Custom rules · This run won’t count toward your personal best."}
        </p>
        <button
          className="quiet-button"
          onClick={() => {
            onChange(defaultMinigameSettings);
            setSearch("");
          }}
        >
          Reset settings
        </button>
      </div>
    </div>
  );
}
