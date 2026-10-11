// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FriendsPanel } from "../src/app/FriendsPanel";
import type {
  CommunityClient,
  FriendActivityPage,
  Friendship,
  PlayerProfile,
} from "../src/services/community";

const alice: PlayerProfile = {
  id: "a",
  displayName: "Alice",
  handle: "alice",
  avatar: "globe",
  bio: "",
  favoriteRegion: "",
};
const bob: PlayerProfile = {
  ...alice,
  id: "b",
  displayName: "Bob",
  handle: "bob",
};
const stats = {
  journeyStreak: 3,
  journeysCompleted: 10,
  studySessions: 4,
  studyQuestions: 40,
  studyAccuracy: 75,
};
const score = {
  date: "2026-10-10",
  journeyId: "one",
  gameId: "journey",
  gameVersion: 1,
  correct: 4,
  total: 5,
};
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
let page: FriendActivityPage, friends: Friendship[];
let request: ReturnType<typeof vi.fn<(path: string) => Promise<unknown>>>;
let onAction: ReturnType<
  typeof vi.fn<(id: string, action: string) => Promise<boolean>>
>;
let onRequest: ReturnType<typeof vi.fn<(handle: string) => Promise<boolean>>>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  history.replaceState(null, "", "/account");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  friends = [{ id: "b", status: "accepted", player: bob }];
  page = {
    date: score.date,
    you: {
      stats,
      today: { date: score.date, status: "in_progress", scoreLocked: false },
      journeys: [],
    },
    friends: [
      {
        player: bob,
        stats,
        today: { date: score.date, status: "completed", scoreLocked: true },
        journeys: [],
      },
    ],
  };
  request = vi.fn(async (path: string) =>
    path.startsWith("friends/activity?")
      ? structuredClone(page)
      : path.startsWith("friends/b/profile?")
        ? structuredClone(page.friends[0])
        : bob,
  );
  onAction = vi.fn(async () => true);
  onRequest = vi.fn(async () => true);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount() {
  await act(async () =>
    root.render(
      <FriendsPanel
        api={{ request } as CommunityClient}
        friends={friends}
        player={alice}
        disabled={false}
        error=""
        onAction={onAction}
        onRequest={onRequest}
      />,
    ),
  );
}
async function click(label: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) =>
      item.textContent?.trim() === label ||
      item.getAttribute("aria-label") === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
it("shows completion without leaking a locked daily score and opens a friend’s stats", async () => {
  await mount();
  expect(host.querySelector(".friend-card")?.textContent).toContain(
    "Completed",
  );
  expect(host.querySelector(".friend-standings")).toBeNull();
  expect(host.querySelector(".friend-today")).toBeNull();
  expect(host.textContent).toContain("Find a player, then send a request");
  await click("View Bob’s profile");
  expect(host.querySelector(".friend-stats")?.textContent).toContain("75%");
  expect(host.textContent).toContain(
    "Finish the same Journey to reveal their score",
  );
  expect(host.textContent).not.toContain("4/5");
  await click("Block");
  expect(onAction).toHaveBeenCalledWith("b", "block");
});
it("keeps the directory focused on friends and shows comparisons inside their profile", async () => {
  page.you.today = {
    date: score.date,
    status: "completed",
    scoreLocked: false,
    score: { ...score, correct: 3 },
  };
  page.you.journeys = [{ ...score, correct: 3 }];
  page.friends[0].today = {
    date: score.date,
    status: "completed",
    scoreLocked: false,
    score,
  };
  page.friends[0].journeys = [score];
  const other = { ...bob, id: "c", displayName: "Cathy", handle: "cathy" };
  friends.push({ id: "c", status: "accepted", player: other });
  page.friends.push({
    player: other,
    stats,
    today: {
      date: score.date,
      status: "completed",
      scoreLocked: false,
      score: { ...score, journeyId: "different", correct: 5 },
    },
    journeys: [],
  });
  await mount();
  expect(host.querySelector(".friend-standings")).toBeNull();
  expect(host.querySelectorAll(".friend-card")).toHaveLength(2);
  await click("View Bob’s profile");
  expect(
    host.querySelector(".account-comparison tbody")?.textContent,
  ).toContain("3/5");
  expect(
    host.querySelector(".account-comparison tbody")?.textContent,
  ).toContain("4/5");
});
it("finds a handle before sending a request and supports cancel, decline, and unblock", async () => {
  friends = [
    { id: "c", status: "incoming", player: { ...bob, id: "c" } },
    { id: "d", status: "outgoing", player: { ...bob, id: "d" } },
    { id: "e", status: "blocked", player: { ...bob, id: "e" } },
  ];
  page.friends = [];
  await mount();
  const input = host.querySelector<HTMLInputElement>(
    ".friend-find-form input",
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "@Bob");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(request).toHaveBeenCalledWith(
    "players/bob",
    "GET",
    undefined,
    expect.any(AbortSignal),
  );
  expect(onRequest).not.toHaveBeenCalled();
  await click("Send request");
  expect(onRequest).toHaveBeenCalledWith("bob");
  await click("Decline");
  expect(onAction).toHaveBeenCalledWith("c", "decline");
  await click("Cancel request");
  expect(onAction).toHaveBeenCalledWith("d", "cancel");
  await click("Unblock");
  expect(onAction).toHaveBeenCalledWith("e", "unblock");
});
it("loads another page without duplicating friend cards and keeps request errors visible", async () => {
  page.cursor = "b";
  const second = {
    ...page.friends[0],
    player: { ...bob, id: "c", displayName: "Cathy" },
  };
  friends.push({ id: "c", status: "accepted", player: second.player });
  request.mockImplementation(async (path: string) =>
    path.includes("cursor=")
      ? { ...page, cursor: undefined, friends: [page.friends[0], second] }
      : page,
  );
  await mount();
  await click("Load more friends →");
  expect(host.querySelectorAll(".friend-card")).toHaveLength(2);
  request.mockRejectedValue(new Error("Offline"));
  await click("Refresh");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Offline",
  );
});
