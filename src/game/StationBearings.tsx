import type { Question } from "./questionContracts";
import { intersectionReadings } from "./bearingIntersection";
import { formatBearing } from "./compassBearing";
import { CompassFace } from "./CompassAnswer";

/** Given observations, not editable angle responses. Globe rotation does not turn them. */
export function StationBearings({ question }: { question: Question }) {
  if (!question.bearingIntersection) return null;
  return (
    <div className="bearing-observations" aria-label="Observation stations">
      {intersectionReadings(question).map(({ station, displayed }) => (
        <figure key={station.id}>
          <CompassFace chosen={displayed} />
          <figcaption>
            <strong>{station.name}</strong>
            <span>{formatBearing(displayed)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
