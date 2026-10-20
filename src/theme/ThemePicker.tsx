import { THEME_IDS, THEMES } from "./themes";
import type { ThemeId } from "./themes";

function ThemePreview({ theme }: { theme: ThemeId }) {
  const { ui, globe } = THEMES[theme];
  return (
    <svg
      className="theme-preview"
      viewBox="0 0 176 106"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="176" height="106" fill={ui.bg} />
      <circle cx="120" cy="62" r="47" fill={globe.ocean} />
      <g fill="none" stroke={ui.muted} strokeWidth="0.6" opacity="0.25">
        <ellipse cx="120" cy="62" rx="23" ry="47" />
        <ellipse cx="120" cy="62" rx="47" ry="18" />
        <path d="M73 62h94M120 15v94" />
      </g>
      <g stroke={globe.border} strokeWidth="0.8" strokeLinejoin="round">
        <path
          d="M98 23l12-4 15 3 7 8-4 9-12 4-5 12-8-4-2-11-10-5z"
          fill={globe.land[0]}
        />
        <path
          d="M114 54l12 1 7 10-2 12-8 15-6-8 1-13-7-9z"
          fill={globe.land[2]}
        />
        <path d="M144 32l10 5 6 11-6 4-11-5-5-9z" fill={globe.land[1]} />
      </g>
      <text
        x="12"
        y="28"
        fill={ui.text}
        fontFamily="var(--font-editorial)"
        fontSize="15"
      >
        Ambit
      </text>
      <g fill={ui.muted} opacity="0.65">
        <rect x="12" y="40" width="43" height="2" rx="1" />
        <rect x="12" y="47" width="32" height="2" rx="1" />
      </g>
      <rect x="12" y="64" width="32" height="10" rx="3" fill={ui.action} />
    </svg>
  );
}

export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange(value: ThemeId): void;
}) {
  return (
    <fieldset className="theme-picker">
      <legend className="sr-only">Theme</legend>
      <div className="theme-choices">
        {THEME_IDS.map((id) => (
          <label className="theme-choice" key={id}>
            <input
              type="radio"
              name="app-theme"
              value={id}
              checked={value === id}
              onChange={() => onChange(id)}
            />
            <ThemePreview theme={id} />
            <span className="theme-choice-caption">
              <span className="theme-choice-name">{THEMES[id].name}</span>
              <span className="theme-choice-scheme" aria-hidden="true">
                {THEMES[id].scheme === "light" ? "Light" : "Dark"}
              </span>
              <span className="theme-choice-check" aria-hidden="true">
                {value === id ? "✓" : ""}
              </span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
