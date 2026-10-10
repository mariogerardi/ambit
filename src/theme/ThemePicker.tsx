import { THEME_IDS, THEMES } from "./themes";
import type { ThemeId } from "./themes";
export function ThemePicker({
  value,
  onChange,
}: {
  value: ThemeId;
  onChange(value: ThemeId): void;
}) {
  return (
    <fieldset className="theme-picker">
      <legend>Theme</legend>
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
            <span
              className="theme-swatch"
              aria-hidden="true"
              style={{
                background: `linear-gradient(135deg, ${THEMES[id].globe.ocean} 45%, ${THEMES[id].globe.land[0]} 45% 70%, ${THEMES[id].globe.land[2]} 70%)`,
              }}
            />
            <span>{THEMES[id].name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
