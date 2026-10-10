import type { Focus } from "../geography/types";
export interface GlobeLayers {
  borders: boolean;
  names: boolean;
  capitals: boolean;
  cities: boolean;
  rivers: boolean;
  mountains: boolean;
  landforms: boolean;
  oceans: boolean;
}
export const DEFAULT_LAYERS: GlobeLayers = {
  borders: true,
  names: true,
  capitals: true,
  cities: true,
  rivers: false,
  mountains: false,
  landforms: false,
  oceans: false,
};
export interface DefaultView {
  version: 1;
  focus: Focus;
  layers?: GlobeLayers;
}
function validLayers(value: unknown): value is GlobeLayers {
  return (
    !!value &&
    typeof value === "object" &&
    Object.keys(DEFAULT_LAYERS).every(
      (key) =>
        (key === "landforms" &&
          (value as Record<string, unknown>)[key] === undefined) ||
        typeof (value as Record<string, unknown>)[key] === "boolean",
    )
  );
}
export const DEFAULT_VIEW_KEY = "wurl.default-view.v1";
export function validDefaultView(value: unknown): value is DefaultView {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DefaultView>,
    f = v.focus;
  return (
    v.version === 1 &&
    !!f &&
    Number.isFinite(f.lat) &&
    Math.abs(f.lat) <= 90 &&
    Number.isFinite(f.lng) &&
    Math.abs(f.lng) <= 180 &&
    Number.isFinite(f.altitude) &&
    f.altitude! >= 0.012 &&
    f.altitude! <= 6.5 &&
    (v.layers === undefined || validLayers(v.layers))
  );
}
export function readDefaultView(): Focus | undefined {
  return readDefaultPreferences()?.focus;
}
export function readDefaultPreferences(): DefaultView | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(DEFAULT_VIEW_KEY) ?? "null");
    return validDefaultView(value)
      ? {
          ...value,
          ...(value.layers
            ? { layers: { ...DEFAULT_LAYERS, ...value.layers } }
            : {}),
        }
      : undefined;
  } catch {
    return undefined;
  }
}
export function saveDefaultView(focus?: Focus, layers?: GlobeLayers): boolean {
  try {
    if (focus) {
      const value = {
        version: 1,
        focus: { ...focus },
        ...(layers ? { layers: { ...layers } } : {}),
      };
      if (!validDefaultView(value)) return false;
      localStorage.setItem(DEFAULT_VIEW_KEY, JSON.stringify(value));
    } else localStorage.removeItem(DEFAULT_VIEW_KEY);
    return true;
  } catch {
    return false;
  }
}
