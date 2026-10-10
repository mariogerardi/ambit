import { serviceConfig } from "./config";
import { settingsError, validSettings } from "../study/engine";
import type { StudySettings } from "../study/engine";
import type { AvatarId } from "../app/ProfileAvatar";
export interface PlayerProfile {
  id: string;
  displayName: string;
  handle: string;
  avatar: AvatarId;
  favoriteRegion: string;
  bio: string;
}
export interface StudyPreset {
  id: string;
  name: string;
  settings: StudySettings;
}
export interface AccountProfile extends PlayerProfile {
  shareJourneyScores: boolean;
  presets: StudyPreset[];
  revision: number;
}
export interface Friendship {
  id: string;
  status: "incoming" | "outgoing" | "accepted" | "blocked";
  player: PlayerProfile | null;
}
export interface JourneyScore {
  date: string;
  journeyId: string;
  correct: number;
  total: number;
}
export interface Challenge {
  id: string;
  title: string;
  owner: string;
  opponent: string;
  settings: StudySettings;
  seed: number;
  createdAt: number;
  status: "pending" | "active" | "completed" | "declined" | "cancelled";
  results: Record<string, { correct: number; total: number }>;
  player: PlayerProfile | null;
}
export interface CommunityClient {
  request<T>(
    path: string,
    method?: "GET" | "POST" | "PATCH",
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T>;
}
export function createCommunityClient(
  accessToken: () => Promise<string | undefined>,
): CommunityClient {
  return {
    async request<T>(
      path: string,
      method = "GET",
      body?: unknown,
      signal?: AbortSignal,
    ): Promise<T> {
      const token = await accessToken();
      if (!token) throw new Error("Sign in to use your account.");
      const requestSignal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000);
      try {
        const response = await fetch(
          `${serviceConfig.apiUrl}/account/${path}`,
          {
            method,
            signal: requestSignal,
            headers: {
              Authorization: `Bearer ${token}`,
              ...(body ? { "Content-Type": "application/json" } : {}),
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        );
        const data: unknown = await response.json();
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? "Your session needs renewal. Try again or sign in again."
              : typeof data === "object" &&
                  data &&
                  "error" in data &&
                  typeof data.error === "string"
                ? data.error
                : "Couldn’t load your account. Please try again.",
          );
        return data as T;
      } catch (error) {
        if (error instanceof TypeError || error instanceof DOMException)
          throw new Error(
            "Couldn’t load your profile. Your progress is safe. Please try again.",
          );
        throw error;
      }
    },
  };
}
export function challengeSettings(
  settings: StudySettings,
  length: 10 | 20 | 50,
): StudySettings {
  const value = {
    ...structuredClone(settings),
    length,
    revisitMissed: false,
    perTopicMethods: settings.perTopicMethods ?? false,
    choiceCount: settings.choiceCount ?? 6,
    capitalDistractors: settings.capitalDistractors ?? "study",
  };
  if (!validSettings(value)) throw new Error("Choose a valid Study setup.");
  const error = settingsError(value);
  if (error) throw new Error(error);
  return value;
}
