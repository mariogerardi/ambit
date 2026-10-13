import { dateOrdinal } from "./dailyProgress";

export interface ComparisonTarget {
  date: string;
  journeyId: string;
  version: number;
}
export interface AccountIntent {
  tab?: "friends";
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
