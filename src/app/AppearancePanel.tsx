import { ThemePicker } from "../theme/ThemePicker";
import type { ThemeId } from "../theme/themes";

export function AppearancePanel({
  theme,
  onTheme,
}: {
  theme: ThemeId;
  onTheme(theme: ThemeId): void;
}) {
  return (
    <section className="account-appearance" aria-label="Appearance">
      <h2>Appearance</h2>
      <p>Choose a theme. Saved automatically on this device.</p>
      <ThemePicker value={theme} onChange={onTheme} />
    </section>
  );
}
