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
import { EXPLORE_CITIES, exploreCapital } from "../geography/places";
import type { ExploreCity } from "../geography/places";
import { FLAGS, COUNTRIES } from "../study/engine";
import { COUNTRY_PROFILES } from "../geography/countryProfiles";
import { languageName } from "../geography/languages";
import { OFFICIAL_LANGUAGES, LANGUAGES } from "../game/quizData";
import { PanelActive } from "./ModePanels";
import { InfoTooltip } from "./InfoTooltip";
import { normalizeAnswer, countryIdForName } from "../game/answerNames";
import { CityDetails } from "./CityDetails";
export type { GlobeLayers as ExploreSettings } from "./worldPreferences";
export function ExplorePanel({
  regions,
  selected,
  selectedRegion,
  selectedCity,
  onCity,
  onCityFocus,
  onSelect,
  onFocus,
  search,
  onSearch,
  breakdown,
  onBreakdown,
  regionalStatus,
  regionalLayers = [],
  onContentHeight,
}: {
  onContentHeight?(height: number): void;
  search: string;
  onSearch(value: string): void;
  regions: RegionFeature[];
  selected?: string;
  selectedRegion?: RegionFeature;
  selectedCity?: ExploreCity;
  onCity(city: ExploreCity): void;
  onCityFocus(city: ExploreCity): void;
  onSelect(id?: string): void;
  onFocus(region: RegionFeature): void;
  breakdown?: string;
  onBreakdown(id?: string): void;
  regionalStatus: string;
  regionalLayers?: readonly { parentId: string; key: string; label: string }[];
}) {
  const card = useRef<HTMLElement>(null);
  const previousCity = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedCity && previousCity.current) {
      const link = [
        ...(card.current?.querySelectorAll<HTMLButtonElement>(
          "[data-city-id]",
        ) ?? []),
      ].find((button) => button.dataset.cityId === previousCity.current);
      link?.focus({ preventScroll: true });
    }
    previousCity.current = selectedCity?.id;
  }, [selectedCity?.id]);
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
    restoreSearchFocus = useRef(false);
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
  const capital = exploreCapital(selected ?? ""),
    region = regions.find((r) => r.id === selected);
  const profile = COUNTRY_PROFILES[selected ?? ""];
  const exploreCountries = useMemo(
    () => regions.filter((r) => r.level === "ADM0"),
    [regions],
  );
  const rosterCountry = COUNTRIES.some((c) => c.id === selected);
  const center = capital?.name ?? profile?.listedCapital;
  const results = search.trim()
    ? exploreCountries.filter(
        (c) =>
          normalizeAnswer(c.name).includes(normalizeAnswer(search)) ||
          c.id ===
            countryIdForName(
              {
                names: new Map(
                  exploreCountries.map((country) => [country.id, country.name]),
                ),
              },
              search,
            ),
      )
    : [];
  const layer = regionalLayers.find((l) => l.parentId === selected),
    childLayer = regionalLayers.find((l) => l.parentId === selectedRegion?.id);
  const languageIds = selected ? OFFICIAL_LANGUAGES[selected] : undefined;
  const cities = useMemo(
    () =>
      EXPLORE_CITIES.filter(
        (c) => c.parentId === selected && c.id !== capital?.id,
      )
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .slice(0, 3),
    [selected, capital?.id],
  );
  useEffect(() => {
    if (selectedCity) closeSearch();
  }, [selectedCity?.id, closeSearch]);
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
    const dismiss = (e: Event) => {
      if (
        !(e.target as Element)?.closest?.(
          ".explore-search-popup, .explore-country-search, .explore-search-field, .explore-search-link, .explore-country-search-trigger",
        )
      )
        closeSearch();
    };
    addEventListener("pointerdown", dismiss);
    addEventListener("focusin", dismiss);
    return () => {
      removeEventListener("pointerdown", dismiss);
      removeEventListener("focusin", dismiss);
    };
  }, [open, closeSearch]);
  useEffect(() => {
    if (!open || !active) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeSearch(true);
      }
    };
    addEventListener("keydown", escape);
    return () => removeEventListener("keydown", escape);
  }, [open, active, closeSearch]);
  const searchField = open && (
    <div id="explore-search" className="explore-search-field">
      <label className="field">
        <span className="sr-only">Find a country</span>
        <input
          ref={input}
          data-dd-action-name="Explore Search Field"
          type="search"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          value={search}
          placeholder="Search countries and territories"
          aria-expanded={!!search.trim() && active}
          aria-controls="explore-search-results"
          onFocus={() => {
            setOpen(true);
          }}
          onChange={(event) => {
            setOpen(true);
            onSearch(event.target.value);
          }}
        />
      </label>
      <button
        className="explore-search-close"
        data-dd-action-name="Explore Close Search"
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
  if (selectedCity)
    return (
      <section
        ref={card}
        className="info-view explore-card"
        aria-label="City explorer"
      >
        <CityDetails
          city={selectedCity}
          regions={regions}
          onBack={() => onSelect(selectedCity.parentId)}
          onFocus={() => onCityFocus(selectedCity)}
        />
      </section>
    );
  return (
    <section
      ref={card}
      className="info-view explore-card"
      aria-label="Countries and capitals explorer"
    >
      <header className="explore-heading">
        <div className="explore-title">
          {country && <div className="overline">COUNTRY / TERRITORY</div>}
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
            Tap a country or territory to see its details. Small places have
            rings; zoom in to separate nearby targets.{" "}
            <button
              ref={searchButton}
              data-dd-action-name="Explore Open Search"
              className="explore-search-link"
              aria-label="Search countries"
              aria-expanded={open}
              aria-controls="explore-search"
              onClick={() => setOpen((value) => !value)}
            >
              Or search by name.
            </button>
          </p>
        </>
      )}
      {!country && searchField}
      {country &&
        open &&
        active &&
        createPortal(
          <div
            className="explore-country-search"
            role="dialog"
            aria-label="Search countries"
          >
            {searchField}
          </div>,
          document.body,
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
                  data-dd-action-name="Explore Select Country"
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
            {center && (
              <>
                <dt>{rosterCountry ? "Capital" : "Listed capital"}</dt>
                <dd>
                  {capital ? (
                    <button
                      className="explore-fact-link"
                      data-city-id={capital.id}
                      onClick={() => onCity(capital)}
                    >
                      {center}
                    </button>
                  ) : (
                    center
                  )}
                  {!rosterCountry && (
                    <>
                      {" "}
                      <InfoTooltip label="Capital notes" compact>
                        <p>
                          GeoNames lists this capital. Source conventions may
                          differ for disputed places and places with multiple
                          seats of government.
                        </p>
                        <a
                          href="https://www.geonames.org/"
                          target="_blank"
                          rel="noreferrer"
                        >
                          GeoNames ↗
                        </a>
                      </InfoTooltip>
                    </>
                  )}
                </dd>
              </>
            )}
            {profile && (
              <>
                <dt>Region</dt>
                <dd>{profile.subregion || profile.continent}</dd>
                {profile.areaKm2 != null && (
                  <>
                    <dt>Area</dt>
                    <dd>{profile.areaKm2.toLocaleString()} km²</dd>
                  </>
                )}
                {profile.population != null && (
                  <>
                    <dt className="population-label">
                      Population{" "}
                      <InfoTooltip label="Data notes" compact>
                        <p>
                          {profile.populationSource === "Natural Earth" ? (
                            `Population is a Natural Earth source estimate${profile.populationYear ? ` for ${profile.populationYear}` : ""}.`
                          ) : (
                            <>
                              Population estimates and language listings are
                              from GeoNames, downloaded in October 2026. The
                              download date is not a population census date.
                            </>
                          )}
                        </p>
                        {!!(
                          languageIds?.length || profile.languages.length
                        ) && (
                          <p>
                            {languageIds?.length
                              ? "Official languages are a curated list for the country or its regions."
                              : "Language listings cover languages spoken in the country and may include languages without official status."}
                          </p>
                        )}
                        <a
                          href={
                            profile.populationSource === "Natural Earth"
                              ? "https://www.naturalearthdata.com/"
                              : "https://www.geonames.org/"
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          {profile.populationSource ?? "GeoNames"} ↗
                        </a>
                      </InfoTooltip>
                    </dt>
                    <dd>{profile.population.toLocaleString()}</dd>
                  </>
                )}
                {!!profile.currencyCode && (
                  <>
                    <dt>Currency</dt>
                    <dd>
                      {profile.currencyName} · {profile.currencyCode}
                    </dd>
                  </>
                )}
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
                <dd className="explore-city-list">
                  {cities.map((city) => (
                    <button
                      key={city.id}
                      className="explore-fact-link"
                      data-city-id={city.id}
                      onClick={() => onCity(city)}
                    >
                      {city.name}
                    </button>
                  ))}
                </dd>
              </>
            )}
          </dl>
          <div className="explore-country-tools">
            <div
              className="inline-actions explore-country-actions"
              role="group"
              aria-label="Country actions"
            >
              <button
                className="quiet-button explore-tool-button"
                data-dd-action-name="Explore Zoom Country"
                aria-label="Zoom to country"
                title="Zoom to country"
                disabled={!region}
                onClick={() => region && onFocus(region)}
              >
                ◎ Zoom
              </button>
              <button
                ref={searchButton}
                data-dd-action-name="Explore Search Another Country"
                className="quiet-button explore-tool-button explore-country-search-trigger"
                aria-label="Search another country"
                title="Search another country"
                aria-expanded={open}
                aria-controls="explore-search"
                onClick={() => setOpen(true)}
              >
                Search
              </button>
              <button
                className="quiet-button explore-tool-button explore-clear-selection"
                data-dd-action-name="Explore Clear Selection"
                aria-label="Clear selection"
                title="Clear selection"
                onClick={() => onSelect()}
              >
                Clear
              </button>
            </div>
            {layer && (
              <label
                className="regional-toggle"
                data-dd-action-name="Explore Toggle Regions"
              >
                <input
                  type="checkbox"
                  data-dd-action-name="Explore Toggle Regions"
                  checked={!!breakdown}
                  onChange={(e) =>
                    onBreakdown(e.target.checked ? selected : undefined)
                  }
                />
                {layer.label}
              </label>
            )}
          </div>
          {selectedRegion && (
            <div className="region-detail">
              <div className="overline">
                {selectedRegion.localType ?? selectedRegion.level}
              </div>
              <h3>{selectedRegion.name}</h3>
              <div className="inline-actions">
                <button
                  className="quiet-button tertiary-action"
                  data-dd-action-name="Explore Zoom Region"
                  onClick={() => onFocus(selectedRegion)}
                >
                  ◎ Zoom to region
                </button>
                {childLayer && (
                  <button
                    className="quiet-button tertiary-action"
                    data-dd-action-name="Explore Show Subregions"
                    onClick={() => onBreakdown(selectedRegion.id)}
                  >
                    Show {childLayer.label.toLowerCase()} →
                  </button>
                )}
                {breakdown !== selected && (
                  <button
                    className="quiet-button tertiary-action"
                    data-dd-action-name="Explore Back To Regions"
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
