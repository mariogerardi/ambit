import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { PanelActive } from "../app/ModePanels";
import type { StudySettings } from "./engine";
import { STUDY_PATHS } from "./paths";
import { StudyNavigation } from "./StudyNavigation";
import { ActionIcon } from "../app/ActionIcon";

export function StudyPacks({
  onStart,
  onBuild,
  onPreview,
}: {
  onStart(settings: StudySettings): void;
  onBuild(settings: StudySettings): void;
  onPreview?(settings?: StudySettings): void;
}) {
  const [index, setIndex] = useState(0);
  const pack = STUDY_PATHS[index];
  const cycle = (step: number) =>
    setIndex(
      (previous) => (previous + step + STUDY_PATHS.length) % STUDY_PATHS.length,
    );
  const active = useContext(PanelActive);
  const preview = useMemo(
    () => ({
      ...pack.settings,
      countryNames: true,
      capitalNames: pack.settings.topics.includes("capitals"),
      capitalMarkers: pack.settings.topics.includes("capitals"),
    }),
    [pack],
  );
  const previewRef = useRef(onPreview);
  previewRef.current = onPreview;
  useEffect(() => {
    if (active) onPreview?.(preview);
  }, [active, onPreview, preview]);
  useEffect(() => () => previewRef.current?.(undefined), []);
  return (
    <section className="info-view study-view study-packs">
      <StudyNavigation />
      <h1 className="editorial-heading">
        Your next challenge <em>awaits.</em>
      </h1>
      <div className="study-pack-navigation">
        <button
          type="button"
          className="quiet-button"
          aria-label="Previous study pack"
          onClick={() => cycle(-1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m10 3-5 5 5 5" />
          </svg>
        </button>
        <h2 id="study-pack-title" aria-live="polite">
          {pack.title}
        </h2>
        <button
          type="button"
          className="quiet-button"
          aria-label="Next study pack"
          onClick={() => cycle(1)}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m6 3 5 5-5 5" />
          </svg>
        </button>
      </div>
      <p className="study-pack-position">
        {index + 1} of {STUDY_PATHS.length}
      </p>
      <article
        className="study-pack-experience"
        aria-labelledby="study-pack-title"
      >
        <p className="study-pack-description">{pack.description}</p>
        <dl className="study-pack-facts">
          {pack.detail.split(" · ").map((value, index) => (
            <div key={value}>
              <dt>{["Area", "Answer method", "Session length"][index]}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="study-pack-actions">
          <button
            className="secondary-button"
            onClick={() => onBuild(structuredClone(pack.settings))}
          >
            <ActionIcon name="custom" /> Customize
          </button>
          <button
            className="primary-button"
            onClick={() => onStart(structuredClone(pack.settings))}
          >
            Start session <span aria-hidden="true">→</span>
          </button>
        </div>
      </article>
    </section>
  );
}
