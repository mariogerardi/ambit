import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { RegionFeature } from "../geography/types";
import { DISPLAY_CAPITALS, MAJOR_CITIES } from "../geography/places";
import { FLAGS, COUNTRIES } from "../study/engine";
import info from "../geography/data/country-info.v1.json";
import { languageName } from "../geography/languages";
import { OFFICIAL_LANGUAGES, LANGUAGES } from "../game/quizData";
import { REGIONAL_LAYERS } from "../geography/regions";
import { PanelActive } from "./ModePanels";
import { InfoTooltip } from "./InfoTooltip";
import { normalizeAnswer, countryIdForName } from "../game/questions";
import { SettingsIcon } from "./SettingsIcon";
export type { GlobeLayers as ExploreSettings } from "./worldPreferences";
import type { GlobeLayers as ExploreSettings } from "./worldPreferences";
export function ExplorePanel({
  regions,
  selected,
  selectedRegion,
  settings,
  onSelect,
  onSettings,
  onFocus,
  search,
  onSearch,
  breakdown,
  onBreakdown,
  regionalStatus,
  onSaveView,
  onResetView,
  defaultViewStatus,
  onContentHeight,
}: {
  onContentHeight?(height: number): void;
  search: string;
  onSearch(value: string): void;
  regions: RegionFeature[];
  selected?: string;
  selectedRegion?: RegionFeature;
  settings: ExploreSettings;
  onSelect(id?: string): void;
  onSettings(settings: ExploreSettings): void;
  onFocus(region: RegionFeature): void;
  breakdown?: string;
  onBreakdown(id?: string): void;
  regionalStatus: string;
  onSaveView(): void;
  onResetView(): void;
  defaultViewStatus: string;
}) {
  const card = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!onContentHeight || !card.current) return;
    const element = card.current;
    const measure = () =>
      onContentHeight(Math.ceil(element.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [onContentHeight]);
  const active = useContext(PanelActive),
    input = useRef<HTMLInputElement>(null),
    searchButton = useRef<HTMLButtonElement>(null),
    settingsButton = useRef<HTMLButtonElement>(null),
    restoreSearchFocus = useRef(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => setSettingsOpen(false), [selected, active]);
  const [anchor, setAnchor] = useState({
      left: 0,
      top: 0,
      width: 0,
      maxHeight: 220,
      transform: "none",
    }),
    [open, setOpen] = useState(false);
  const closeSearch = useCallback(
    (restoreFocus = false) => {
      input.current?.blur();
      setOpen(false);
      onSearch("");
      restoreSearchFocus.current = restoreFocus;
    },
    [onSearch],
  );
  useEffect(() => {
    if (!open && active && restoreSearchFocus.current) {
      restoreSearchFocus.current = false;
      searchButton.current?.focus();
    }
  }, [open, active, selected]);
  useEffect(() => {
    if (open && active) input.current?.focus();
    else if (open) closeSearch();
  }, [open, active, closeSearch]);
  const country =
    COUNTRIES.find((c) => c.id === selected) ??
    regions.find((r) => r.id === selected);
  const capital = DISPLAY_CAPITALS.find((c) => c.countryId === selected),
    region = regions.find((r) => r.id === selected);
  const profile = info.countries[selected as keyof typeof info.countries];
  const results = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          normalizeAnswer(c.name).includes(normalizeAnswer(search)) ||
          c.id ===
            countryIdForName(
              {
                names: new Map(
                  COUNTRIES.map((country) => [country.id, country.name]),
                ),
              },
              search,
            ),
      )
    : [];
  const layer = REGIONAL_LAYERS.find((l) => l.parentId === selected),
    childLayer = REGIONAL_LAYERS.find((l) => l.parentId === selectedRegion?.id);
  const languageIds = selected ? OFFICIAL_LANGUAGES[selected] : undefined;
  const cities = useMemo(
    () =>
      MAJOR_CITIES.filter((c) => c.parentId === selected)
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .slice(0, 3),
    [selected],
  );
  useEffect(() => {
    if (!open || !search.trim() || !active) return;
    const position = () => {
      const r = input.current?.getBoundingClientRect();
      if (r) {
        const visual = window.visualViewport;
        const bottom =
          (visual?.offsetTop ?? 0) + (visual?.height ?? innerHeight);
        const below = bottom - r.bottom - 14;
        const above = r.top - (visual?.offsetTop ?? 0) - 14;
        const flip = below < 100 && above > below;
        const maxHeight = Math.max(44, Math.min(220, flip ? above : below));
        setAnchor({
          left: r.left,
          top: flip ? r.top - 6 : r.bottom + 6,
          width: r.width,
          maxHeight,
          transform: flip ? "translateY(-100%)" : "none",
        });
      }
    };
    position();
    addEventListener("resize", position);
    addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    // Reposition once after the panel's entrance animation.
    const timer = setTimeout(position, 230);
    return () => {
      clearTimeout(timer);
      removeEventListener("resize", position);
      removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [search, active, open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (
        !(e.target as Element)?.closest?.(
          ".explore-search-popup, .explore-search-field, .explore-search-toggle",
        )
      )
        closeSearch();
    };
    addEventListener("pointerdown", dismiss);
    return () => removeEventListener("pointerdown", dismiss);
  }, [open, closeSearch]);
  const tools = (
    <div className="explore-heading-tools">
      <button
        ref={searchButton}
        className="quiet-button explore-search-toggle"
        aria-label="Search"
        title="Search countries"
        aria-expanded={open && active}
        aria-controls="explore-search"
        onClick={() => {
          setSettingsOpen(false);
          if (open) closeSearch(true);
          else setOpen(true);
        }}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </svg>
      </button>
      <button
        ref={settingsButton}
        className="settings-button"
        aria-label="Globe settings"
        title="Globe settings"
        aria-expanded={settingsOpen && active}
        aria-controls="explore-settings"
        onClick={() => {
          closeSearch();
          setSettingsOpen((value) => !value);
        }}
      >
        <SettingsIcon />
      </button>
    </div>
  );
  const searchField = open && (
    <div id="explore-search" className="explore-search-field">
      <label className="field">
        <span className="sr-only">Find a country</span>
        <input
          ref={input}
          type="search"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={search}
          placeholder="Country name…"
          aria-expanded={!!search.trim() && active}
          aria-controls="explore-search-results"
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      <button
        className="explore-search-close"
        aria-label="Close search"
        title="Close search"
        onClick={() => closeSearch(true)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
  const settingsControls = settingsOpen && active && (
    <div
      id="explore-settings"
      className="explore-controls"
      aria-label="Globe settings"
    >
      <fieldset className="display-settings">
        <legend>On your globe</legend>
        {(
          [
            "borders",
            "names",
            "capitals",
            "cities",
            "rivers",
            "mountains",
            "landforms",
            "oceans",
          ] as const
        ).map((key) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(e) =>
                onSettings({ ...settings, [key]: e.target.checked })
              }
            />
            {
              {
                borders: "Country borders",
                names: "Country names",
                capitals: "Capital markers & names",
                cities: "Major cities",
                rivers: "Rivers",
                mountains: "Mountain ranges",
                landforms: "Deserts & other landforms",
                oceans: "Ocean & sea names",
              }[key]
            }
          </label>
        ))}
      </fieldset>
      <div className="explore-default-view">
        <button className="quiet-button tertiary-action" onClick={onSaveView}>
          Make this my default view
        </button>
        <button className="quiet-button tertiary-action" onClick={onResetView}>
          Reset default view
        </button>
        {defaultViewStatus && <small role="status">{defaultViewStatus}</small>}
      </div>
    </div>
  );
  return (
    <section
      ref={card}
      className="info-view explore-card"
      aria-label="Countries and capitals explorer"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          closeSearch(true);
        } else if (settingsOpen && event.key === "Escape") {
          event.preventDefault();
          setSettingsOpen(false);
          settingsButton.current?.focus();
        }
      }}
    >
      <header className="explore-heading">
        <div className="explore-title">
          {country && <div className="overline">COUNTRY</div>}
          <h1 className={country ? undefined : "editorial-heading"}>
            {country ? (
              country.name
            ) : (
              <>
                Explore the <em>world.</em>
              </>
            )}
          </h1>
        </div>
        {country && (
          <div className="explore-heading-actions">
            {FLAGS.has(country.id) && (
              <img
                className="detail-flag"
                src={FLAGS.get(country.id)}
                alt={`Flag of ${country.name}`}
              />
            )}
          </div>
        )}
      </header>
      {!country && (
        <>
          <p className="muted explore-introduction">
            Tap a country to see its flag, capital, and more. Or search by name.
          </p>
          {tools}
          {searchField}
          {settingsControls}
        </>
      )}
      {!!search.trim() &&
        open &&
        active &&
        createPortal(
          <div
            id="explore-search-results"
            className="country-search explore-search-popup"
            style={anchor}
            aria-label="Country search results"
          >
            {results.length ? (
              results.map((c) => (
                <button
                  key={c.id}
                  className={selected === c.id ? "chosen" : ""}
                  onClick={() => {
                    onSelect(c.id);
                    closeSearch(true);
                  }}
                >
                  {c.name}
                  <span>→</span>
                </button>
              ))
            ) : (
              <p>No matching countries. Try another spelling.</p>
            )}
          </div>,
          document.body,
        )}
      {country && (
        <div className="country-detail">
          <dl className="country-facts">
            <dt>Capital</dt>
            <dd>{capital?.name ?? "—"}</dd>
            {profile && (
              <>
                <dt>Region</dt>
                <dd>{profile.subregion || profile.continent}</dd>
                <dt>Area</dt>
                <dd>{profile.areaKm2.toLocaleString()} km²</dd>
                <dt className="population-label">
                  Population{" "}
                  <InfoTooltip label="Data notes" compact>
                    <p>
                      Population estimates and language listings are from
                      GeoNames, downloaded in October 2026. The download date is
                      not a population census date.
                    </p>
                    <p>
                      {languageIds?.length
                        ? "Official languages are a curated list for the country or its regions."
                        : "Language listings cover languages spoken in the country and may include languages without official status."}
                    </p>
                    <a
                      href="https://www.geonames.org/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GeoNames ↗
                    </a>
                  </InfoTooltip>
                </dt>
                <dd>{profile.population.toLocaleString()}</dd>
                <dt>Currency</dt>
                <dd>
                  {profile.currencyName} · {profile.currencyCode}
                </dd>
              </>
            )}
            {!!languageIds?.length && (
              <>
                <dt>Official languages</dt>
                <dd>
                  {languageIds
                    .map(
                      (id) => LANGUAGES.find((l) => l.id === id)?.label ?? id,
                    )
                    .join(", ")}
                </dd>
              </>
            )}
            {!!profile?.languages.length && !languageIds?.length && (
              <>
                <dt>Languages</dt>
                <dd>{profile.languages.map(languageName).join(", ")}</dd>
              </>
            )}
            {!!cities.length && (
              <>
                <dt>Major cities</dt>
                <dd>{cities.map((c) => c.name).join(", ")}</dd>
              </>
            )}
          </dl>
          <div className="inline-actions explore-country-actions">
            {tools}
            <button
              className="quiet-button tertiary-action"
              disabled={!region}
              onClick={() => region && onFocus(region)}
            >
              ◎ Zoom to country
            </button>
            <button
              className="quiet-button tertiary-action"
              onClick={() => onSelect()}
            >
              Clear selection
            </button>
          </div>
          {searchField}
          {settingsControls}
          {layer && (
            <label className="regional-toggle">
              <input
                type="checkbox"
                checked={!!breakdown}
                onChange={(e) =>
                  onBreakdown(e.target.checked ? selected : undefined)
                }
              />
              {layer.label}
            </label>
          )}
          {selectedRegion && (
            <div className="region-detail">
              <div className="overline">
                {selectedRegion.localType ?? selectedRegion.level}
              </div>
              <h3>{selectedRegion.name}</h3>
              <div className="inline-actions">
                <button
                  className="quiet-button tertiary-action"
                  onClick={() => onFocus(selectedRegion)}
                >
                  ◎ Zoom to region
                </button>
                {childLayer && (
                  <button
                    className="quiet-button tertiary-action"
                    onClick={() => onBreakdown(selectedRegion.id)}
                  >
                    Show {childLayer.label.toLowerCase()} →
                  </button>
                )}
                {breakdown !== selected && (
                  <button
                    className="quiet-button tertiary-action"
                    onClick={() => onBreakdown(selected)}
                  >
                    Back to {layer?.label.toLowerCase()}
                  </button>
                )}
              </div>
            </div>
          )}
          {regionalStatus && (
            <p role="status" className="source-note">
              {regionalStatus}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
