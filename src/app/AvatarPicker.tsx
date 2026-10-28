import { useEffect, useRef, useState } from "react";
import { AVATARS, FLAG_AVATARS, ProfileAvatar } from "./ProfileAvatar";
import type { AvatarId } from "./ProfileAvatar";

export function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId;
  onChange(value: AvatarId): void;
}) {
  const [open, setOpen] = useState(false);
  const [above, setAbove] = useState(false);
  const presets = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => {
      if (!presets.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    };
    addEventListener("pointerdown", outside);
    addEventListener("focusin", outside);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", outside);
      removeEventListener("focusin", outside);
      removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <fieldset className="avatar-picker">
      <legend>Choose your avatar</legend>
      <div className="avatar-picker-row">
        <div className="avatar-preset-picker" ref={presets}>
          <span className="avatar-picker-label">Preset avatar</span>
          <button
            type="button"
            className="avatar-picker-trigger"
            ref={trigger}
            aria-expanded={open}
            aria-controls="avatar-preset-options"
            onClick={() => {
              if (!open) {
                const bounds = trigger.current?.getBoundingClientRect();
                setAbove(
                  !!bounds &&
                    innerHeight - bounds.bottom < 320 &&
                    bounds.top > 320,
                );
              }
              setOpen((value) => !value);
            }}
          >
            <ProfileAvatar
              avatar={value.startsWith("flag:") ? "avatar-01" : value}
            />
            <span>
              {value.startsWith("flag:")
                ? "Choose a preset"
                : (AVATARS[value]?.label ?? "Choose a preset")}
            </span>
            <span aria-hidden="true">⌄</span>
          </button>
          <div
            id="avatar-preset-options"
            className={`avatar-options${above ? " avatar-options-above" : ""}`}
            hidden={!open}
            role="group"
            aria-label="Preset avatars"
          >
            {Object.entries(AVATARS)
              .filter(([, preset]) => !preset.hidden)
              .map(([id, preset]) => (
                <label
                  key={id}
                  title={preset.label}
                  className={`${value === id ? "chosen" : ""} ${preset.image && !__AVATAR_IMAGES__.includes(preset.image) ? "avatar-pending" : ""}`}
                >
                  <input
                    type="radio"
                    name="avatar"
                    value={id}
                    aria-label={preset.label}
                    data-dd-action-name="Account Choose Avatar"
                    checked={value === id}
                    disabled={
                      !!preset.image &&
                      !__AVATAR_IMAGES__.includes(preset.image)
                    }
                    onChange={() => {
                      onChange(id as AvatarId);
                      setOpen(false);
                      trigger.current?.focus();
                    }}
                  />
                  <ProfileAvatar avatar={id as AvatarId} label={preset.label} />
                </label>
              ))}
          </div>
        </div>
        <label className="field flag-avatar-choice">
          <span>Or choose a flag</span>
          <div className="flag-avatar-select">
            {value.startsWith("flag:") && <ProfileAvatar avatar={value} />}
            <select
              aria-label="Country flag avatar"
              data-dd-action-name="Account Choose Flag Avatar"
              value={value.startsWith("flag:") ? value : ""}
              onChange={(event) => {
                if (event.target.value)
                  onChange(event.target.value as AvatarId);
              }}
            >
              <option value="">Choose a country</option>
              {FLAG_AVATARS.map((country) => (
                <option key={country.id} value={`flag:${country.id}`}>
                  {country.name}
                </option>
              ))}
            </select>
          </div>
        </label>
      </div>
    </fieldset>
  );
}
