import { useEffect, useRef } from "react";
import type { ExploreCity } from "../geography/places";
import type { RegionFeature } from "../geography/types";
import { InfoTooltip } from "./InfoTooltip";

export function CityDetails({
  city,
  regions,
  onBack,
  onFocus,
}: {
  city: ExploreCity;
  regions: RegionFeature[];
  onBack(): void;
  onFocus(): void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), [city.id]);
  const parent = regions.find((region) => region.id === city.parentId);
  const capitalNames = city.capitalOf
    .map((id) => regions.find((region) => region.id === id)?.name)
    .filter(Boolean)
    .join(", ");
  const coordinate = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(3)}° ${value < 0 ? negative : positive}`;
  return (
    <>
      <header className="explore-heading">
        <div className="explore-title">
          <div className="overline">
            {city.sourceFeatureCode === "PPLX" ? "CITY DISTRICT" : "CITY"}
          </div>
          <h1 ref={heading} tabIndex={-1}>
            {city.name}
          </h1>
        </div>
      </header>
      <div className="country-detail city-detail">
        <dl className="country-facts">
          <dt>Country / territory</dt>
          <dd>
            <button className="explore-fact-link" onClick={onBack}>
              {parent?.name}
            </button>
          </dd>
          {capitalNames && (
            <>
              <dt>Listed capital of</dt>
              <dd>
                {capitalNames}{" "}
                <InfoTooltip label="Capital notes" compact>
                  <p>
                    Capital designations come from GeoNames and may differ for
                    disputed places or countries with multiple seats of government.
                  </p>
                </InfoTooltip>
              </dd>
            </>
          )}
          {!!city.population && (
            <>
              <dt>
                Population{" "}
                <InfoTooltip label="Population notes" compact>
                  <p>
                    This population estimate comes from GeoNames and refers to
                    the listed place, not necessarily its wider metropolitan area.
                    The data snapshot date is not a census date.
                  </p>
                </InfoTooltip>
              </dt>
              <dd>{city.population.toLocaleString()}</dd>
            </>
          )}
          <dt>Coordinates</dt>
          <dd>
            {coordinate(city.lat, "N", "S")}, {coordinate(city.lng, "E", "W")}
          </dd>
        </dl>
        {city.sourceCountryId !== city.parentId && (
          <p className="city-source-note">
            The map groups this city with {parent?.name}; GeoNames lists it
            under {city.sourceCountryName}.
          </p>
        )}
        <a
          className="explore-source-link"
          href={`https://www.geonames.org/${city.sourceId.slice(9)}/`}
          target="_blank"
          rel="noreferrer"
        >
          GeoNames · CC BY 4.0 ↗
        </a>
        <div className="explore-country-tools inline-actions explore-country-actions">
          <button className="quiet-button explore-tool-button" onClick={onBack}>
            ← Back to {parent?.name}
          </button>
          <button
            className="quiet-button explore-tool-button"
            onClick={onFocus}
          >
            ◎ Zoom to city
          </button>
        </div>
      </div>
    </>
  );
}
