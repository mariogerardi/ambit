import { AVAILABLE_JOURNEY_INDEX } from "../game/journeyRegistry";
export type AppMode =
  | "account"
  | "admin"
  | "home"
  | "daily"
  | "explore"
  | "study"
  | "playground"
  | "practice";
export function modeForPath(path: string): AppMode {
  return path === "/account" || path === "/auth/callback"
    ? "account"
    : path === "/admin"
      ? "admin"
      : path === "/daily"
        ? "daily"
        : path === "/explore"
          ? "explore"
          : path === "/study"
            ? "study"
            : path === "/playground"
              ? "playground"
              : AVAILABLE_JOURNEY_INDEX.some((j) => j.path === path)
                ? "practice"
                : "home";
}
