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
  gameId?: string;
  gameVersion?: number;
  date: string;
  journeyId: string;
  correct: number;
  total: number;
  help?: {
    hints: number;
    assists: number;
    status: "unassisted" | "hinted" | "assisted";
  };
}
export interface HandleAvailability {
  handle: string;
  available: boolean;
  suggestions: string[];
}
export interface FriendStats {
  journeyStreak: number;
  journeysCompleted: number;
  studySessions: number;
  studyQuestions: number;
  studyAccuracy: number | null;
}
export interface DailyActivity {
  date: string;
  status: "not_started" | "in_progress" | "completed";
  journeyId?: string;
  scoreLocked: boolean;
  score?: JourneyScore;
}
export interface PlayerActivity {
  stats: FriendStats;
  today: DailyActivity;
  journeys: JourneyScore[];
}
export interface FriendActivity extends PlayerActivity {
  player: PlayerProfile;
}
export interface FriendActivityPage {
  date: string;
  you: PlayerActivity;
  friends: FriendActivity[];
  cursor?: string;
}
export class CommunityError extends Error {
  constructor(
    message: string,
    public status: number,
    public field?: string,
    public suggestions: string[] = [],
  ) {
    super(message);
  }
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
        if (!response.ok) {
          const details = data as {
            error?: string;
            field?: string;
            suggestions?: string[];
          } | null;
          throw new CommunityError(
            response.status === 401
              ? "Your session needs renewal. Try again or sign in again."
              : typeof details?.error === "string"
                ? details.error
                : "Couldn’t load your account. Please try again.",
            response.status,
            typeof details?.field === "string" ? details.field : undefined,
            Array.isArray(details?.suggestions)
              ? details.suggestions.filter((item) => typeof item === "string")
              : [],
          );
        }
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
