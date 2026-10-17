import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SettingsIcon } from "./SettingsIcon";
import type { GlobeLayers } from "./worldPreferences";

export function GlobeDisplaySettings({
  settings,
  onSettings,
  scope,
  speed,
  onSpeed,
  motionDisabled,
}: {
  settings: GlobeLayers;
  onSettings(settings: GlobeLayers): void;
  scope: string;
  speed?: number;
  onSpeed(speed: number): void;
  motionDisabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const settingsPanel = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [scope]);
  const [settingsAnchor, setSettingsAnchor] = useState({
    left: 12,
    top: 12,
    width: 320,
    maxHeight: 540,
    transform: "none",
  });
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const bounds = settingsButton.current?.getBoundingClientRect();
      if (!bounds) return;
      const visual = window.visualViewport;
      const viewportTop = visual?.offsetTop ?? 0;
      const viewportLeft = visual?.offsetLeft ?? 0;
      const width = Math.min(360, (visual?.width ?? innerWidth) - 24);
      const bottom = viewportTop + (visual?.height ?? innerHeight);
      const upperAnchor = Math.min(bounds.top - 8, bottom - 12);
      const lowerAnchor = Math.max(bounds.bottom + 8, viewportTop + 12);
      const below = bottom - lowerAnchor - 12;
      const above = upperAnchor - viewportTop - 12;
      const flip = below < 300 && above > below;
      const maxHeight = Math.max(100, Math.min(540, flip ? above : below));
      setSettingsAnchor({
        left: Math.max(
          viewportLeft + 12,
          Math.min(
            bounds.right - width,
            viewportLeft + (visual?.width ?? innerWidth) - width - 12,
          ),
        ),
        top: flip ? upperAnchor : lowerAnchor,
        width,
        maxHeight,
        transform: flip ? "translateY(-100%)" : "none",
      });
    };
    position();
    addEventListener("resize", position);
    addEventListener("scroll", position, true);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);
    const timer = setTimeout(position, 230);
    return () => {
      clearTimeout(timer);
      removeEventListener("resize", position);
      removeEventListener("scroll", position, true);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    settingsPanel.current?.querySelector<HTMLInputElement>("input")?.focus();
    const dismiss = (event: Event) => {
      if (
        !settingsPanel.current?.contains(event.target as Node) &&
        !settingsButton.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      settingsButton.current?.focus();
    };
    addEventListener("pointerdown", dismiss);
    addEventListener("focusin", dismiss);
    addEventListener("keydown", escape);
    return () => {
      removeEventListener("pointerdown", dismiss);
      removeEventListener("focusin", dismiss);
      removeEventListener("keydown", escape);
    };
  }, [open]);
  const popover =
    open &&
    createPortal(
      <div
        id="explore-settings"
        ref={settingsPanel}
        className="explore-settings-popover"
        role="dialog"
        style={settingsAnchor}
        aria-label="Globe settings"
      >
        <div className="explore-settings-heading">
          <h2>Globe settings</h2>
          <button
            data-dd-action-name="Globe Close Settings"
            aria-label="Close globe settings"
            onClick={() => {
              setOpen(false);
              settingsButton.current?.focus();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
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
        <p id="globe-layer-caption" className="globe-layer-caption">
          On your globe
        </p>
        <div
          className="globe-layer-options"
          role="group"
          aria-labelledby="globe-layer-caption"
        >
          {(
            [
              "borders",
              "names",
              "capitals",
              "cities",
              "rivers",
              "mountains",
              "landforms",
              "oceans",
            ] as const
          ).map((key) => (
            <label key={key} data-dd-action-name="Globe Toggle Layer">
              <input
                type="checkbox"
                data-dd-action-name="Globe Toggle Layer"
                checked={settings[key]}
                onChange={(e) =>
                  onSettings({ ...settings, [key]: e.target.checked })
                }
              />
              {
                {
                  borders: "Country borders",
                  names: "Country names",
                  capitals: "Capital markers & names",
                  cities: "Major cities",
                  rivers: "Rivers",
                  mountains: "Mountain ranges",
                  landforms: "Deserts & other landforms",
                  oceans: "Ocean & sea names",
                }[key]
              }
            </label>
          ))}
        </div>
        {speed !== undefined && (
          <label className="globe-settings-speed">
            Rotation speed
            <select
              data-dd-action-name="Globe Rotation Speed"
              aria-label="Rotation speed"
              value={speed}
              disabled={motionDisabled}
              onChange={(event) => onSpeed(Number(event.target.value))}
            >
              {[0.25, 0.5, 1, 2, 4, 8].map((value) => (
                <option key={value} value={value}>
                  {value}×
                </option>
              ))}
            </select>
          </label>
        )}
      </div>,
      document.body,
    );
  return (
    <>
      <button
        ref={settingsButton}
        data-dd-action-name="Globe Open Settings"
        className="settings-button globe-display-settings"
        aria-label="Globe settings"
        title="Globe display settings"
        aria-expanded={open}
        aria-controls="explore-settings"
        onClick={() => setOpen((value) => !value)}
      >
        <SettingsIcon />
      </button>
      {popover}
    </>
  );
}
