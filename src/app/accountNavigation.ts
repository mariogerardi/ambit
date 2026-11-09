import { dateOrdinal } from "./dailyProgress";

export interface ComparisonTarget {
  date: string;
  journeyId: string;
  version: number;
}
export type AdminSection = "journeys" | "schedule" | "feedback" | "utilities";
export type AccountSection = "dashboard" | "profile" | "friends" | "appearance";
export interface AccountIntent {
  tab?: AccountSection;
  friend?: string;
  player?: string;
  comparison?: ComparisonTarget;
}
export function accountIntent(url: string): AccountIntent {
  const parsed = new URL(url, "https://ambit.invalid");
  if (parsed.pathname !== "/account") return {};
  const params = parsed.searchParams;
  const friend = params.get("friend");
  if (friend && /^[a-zA-Z][a-zA-Z0-9_]{2,23}$/.test(friend))
    return { tab: "friends", friend: friend.toLowerCase() };
  if (params.get("tab") === "appearance") return { tab: "appearance" };
  if (params.get("tab") === "profile") return { tab: "profile" };
  if (params.get("tab") === "dashboard") return { tab: "dashboard" };
  if (params.get("tab") !== "friends") return {};
  const player = params.get("player");
  if (player && player.length <= 200) return { tab: "friends", player };
  if (params.get("view") === "compare") {
    const date = params.get("date") ?? "";
    const journeyId = params.get("journey") ?? "";
    const version = Number(params.get("version"));
    try {
      dateOrdinal(date);
      if (
        /^[a-zA-Z0-9:_-]{1,200}$/.test(journeyId) &&
        Number.isSafeInteger(version) &&
        version > 0
      )
        return { tab: "friends", comparison: { date, journeyId, version } };
    } catch {
      /* Invalid comparison links fall back to the directory. */
    }
  }
  return { tab: "friends" };
}
export function comparisonLink(target: ComparisonTarget) {
  return `/account?${new URLSearchParams({ tab: "friends", view: "compare", date: target.date, journey: target.journeyId, version: String(target.version) })}#journey-comparison`;
}
export function friendProfileLink(id: string) {
  return `/account?${new URLSearchParams({ tab: "friends", player: id })}`;
}
export function invitationLink(handle: string) {
  return `/account?friend=${encodeURIComponent(handle)}`;
}

export function accountTabLink(tab: AccountSection) {
  return `/account?${new URLSearchParams({ tab })}`;
}

export function adminIntent(url: string) {
  const parsed = new URL(url, "https://ambit.invalid");
  const params = parsed.searchParams;
  const requested = params.get("section");
  const section: AdminSection =
    requested === "journeys" ||
    requested === "feedback" ||
    requested === "utilities"
      ? requested
      : "schedule";
  const journeyId = params.get("journey") ?? undefined;
  return {
    section,
    date: adminDate(params.get("date")),
    journeyId:
      journeyId && /^[a-zA-Z0-9:_-]{1,200}$/.test(journeyId)
        ? journeyId
        : undefined,
  };
}

export function adminLink(section: AdminSection = "schedule", date?: string) {
  const params = new URLSearchParams({ section });
  if (adminDate(date)) params.set("date", date!);
  return `/admin?${params}`;
}

export function adminJourneyLink(
  journeyId: string,
  section: "journeys" | "schedule" = "journeys",
  date?: string,
) {
  return `${adminLink(section, date)}&journey=${encodeURIComponent(journeyId)}`;
}

export function adminDate(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    dateOrdinal(value);
    if (value >= "2026-10-11") return value;
  } catch {
    /* Ignore invalid review context. */
  }
}
export function journeyReviewLink(
  path: string,
  date?: string,
  questionId?: string,
) {
  const params = new URLSearchParams({ review: "1" });
  if (adminDate(date)) params.set("date", date!);
  if (questionId) params.set("question", questionId);
  return `${path}?${params}`;
}
