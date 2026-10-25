import { JOURNEY_INDEX } from "../game/journeyRegistry";
export type AppMode =
  | "account"
  | "home"
  | "daily"
  | "archive"
  | "explore"
  | "minigames"
  | "study"
  | "practice";
export function modeForPath(path: string): AppMode {
  path = path.split(/[?#]/)[0];
  return path === "/account" || path === "/admin" || path === "/auth/callback"
    ? "account"
    : path === "/archive"
      ? "archive"
      : path === "/daily" || path.startsWith("/archive/")
        ? "daily"
        : path === "/explore"
          ? "explore"
          : path === "/minigames" || path.startsWith("/minigames/")
            ? "minigames"
            : path === "/study"
              ? "study"
              : JOURNEY_INDEX.some((j) => j.path === path)
                ? "practice"
                : "home";
}
