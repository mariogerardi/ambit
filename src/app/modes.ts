import { JOURNEY_INDEX } from "../game/journeyRegistry";
export type AppMode =
  | "account"
  | "admin"
  | "home"
  | "daily"
  | "explore"
  | "study"
  | "practice";
export function modeForPath(path: string): AppMode {
  path = path.split(/[?#]/)[0];
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
            : JOURNEY_INDEX.some((j) => j.path === path)
              ? "practice"
              : "home";
}
