export function GlobeControls({
  compact = false,
  motion,
  speed,
  reduced,
  ready,
  onToggle,
  onSpeed,
  onFidget,
}: {
  compact?: boolean;
  motion: boolean;
  speed: number;
  reduced: boolean;
  ready: boolean;
  onToggle(): void;
  onSpeed(speed: number): void;
  onFidget(): void;
}) {
  const rotationLabel = reduced
    ? "Rotation disabled by reduced motion preference"
    : motion
      ? "Pause Earth"
      : "Rotate Earth";
  return (
    <div
      className="globe-controls"
      role="group"
      aria-label="Globe rotation controls"
    >
      <div className="globe-playback" role="group" aria-label="Earth rotation">
        <button
          aria-label={rotationLabel}
          title={compact ? undefined : rotationLabel}
          aria-pressed={motion && !reduced}
          disabled={reduced || !ready}
          onClick={onToggle}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            {motion && !reduced ? (
              <path d="M7 5h3v14H7zm7 0h3v14h-3z" />
            ) : (
              <path d="m8 5 11 7-11 7z" />
            )}
          </svg>
        </button>
        <label
          className="globe-speed"
          title={compact ? undefined : `Rotation speed: ${speed}×`}
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 18a9 9 0 1 1 16 0M12 12l4-4" />
            <circle cx="12" cy="12" r="1.5" />
          </svg>
          <select
            aria-label="Rotation speed"
            value={speed}
            disabled={reduced || !ready}
            onChange={(event) => onSpeed(Number(event.target.value))}
          >
            {[0.25, 0.5, 1, 2, 4, 8].map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <span className="globe-motion-divider" aria-hidden="true" />
      <button
        aria-label="Fidget"
        title={compact ? undefined : "Fidget"}
        disabled={reduced || !ready}
        onClick={onFidget}
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3 21 12 12 21 3 12Z" />
        </svg>
      </button>
    </div>
  );
}
