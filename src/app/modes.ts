import { JOURNEY_INDEX } from "../game/journeyRegistry";
export type AppMode =
  | "admin"
  | "home"
  | "daily"
  | "explore"
  | "study"
  | "playground"
  | "practice";
export function modeForPath(path: string): AppMode {
  return path === "/admin"
    ? "admin"
    : path === "/daily"
      ? "daily"
      : path === "/explore"
        ? "explore"
        : path === "/study"
          ? "study"
          : path === "/playground"
            ? "playground"
            : JOURNEY_INDEX.some((j) => j.path === path)
              ? "practice"
              : "home";
}
