import type { StudySettings } from "./engine";

export function StudyPreferences({
  settings,
  onSettings,
}: {
  settings: StudySettings;
  onSettings(settings: StudySettings): void;
}) {
  return (
    <div className="study-preferences">
      <fieldset className="display-settings study-hints">
        <legend>Globe hints</legend>
        {(
          ["borders", "countryNames", "capitalMarkers", "capitalNames"] as const
        ).map((key) => (
          <label key={key} data-dd-action-name="Study Toggle Globe Hint">
            <input
              type="checkbox"
              data-dd-action-name="Study Toggle Globe Hint"
              checked={settings[key]}
              onChange={(event) =>
                onSettings({ ...settings, [key]: event.target.checked })
              }
            />
            {
              {
                borders: "Country borders",
                countryNames: "Country names",
                capitalMarkers: "Capital markers",
                capitalNames: "Capital names",
              }[key]
            }
          </label>
        ))}
        <aside className="study-hint-note">
          <span aria-hidden="true">ⓘ</span> Names and markers can give away
          answers.
        </aside>
      </fieldset>
      <fieldset className="display-settings">
        <legend>Pacing</legend>
        <label data-dd-action-name="Study Toggle Auto Advance">
          <input
            type="checkbox"
            data-dd-action-name="Study Toggle Auto Advance"
            checked={settings.autoAdvance}
            onChange={(event) =>
              onSettings({ ...settings, autoAdvance: event.target.checked })
            }
          />
          Move on after a correct answer
        </label>
        <label data-dd-action-name="Study Toggle Missed Review">
          <input
            type="checkbox"
            data-dd-action-name="Study Toggle Missed Review"
            checked={settings.revisitMissed ?? false}
            onChange={(event) =>
              onSettings({ ...settings, revisitMissed: event.target.checked })
            }
          />
          Bring back missed answers
        </label>
      </fieldset>
    </div>
  );
}
