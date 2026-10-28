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
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T16:00:00Z"));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
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
  vi.useRealTimers();
  vi.restoreAllMocks();
});
async function mount(props: Partial<Parameters<typeof FriendsPanel>[0]> = {}) {
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
        {...props}
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
  expect(host.querySelector(".friend-card")?.textContent).toContain("@bob");
  expect(
    host.querySelector(".friend-card")?.getAttribute("data-dd-action-name"),
  ).toBe("Friends Open Card");
  expect(host.querySelector(".friend-standings")).toBeNull();
  expect(host.querySelector(".friend-today")).toBeNull();
  expect(host.querySelector(".friend-add input")).not.toBeNull();
  expect(
    host.querySelector(".friends-grid-column .friend-card"),
  ).not.toBeNull();
  expect(host.querySelector('[aria-label="Refresh friends"]')).toBeNull();
  expect(host.textContent).not.toContain("Find your people.");
  expect(host.textContent).not.toContain("Friendships start when");
  await click("View Bob’s profile");
  expect(host.querySelector(".friend-stats")?.textContent).toContain("75%");
  expect(host.textContent).toContain(
    "Finish the same Journey to reveal their score",
  );
  expect(host.textContent).not.toContain("12/15");
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
  page.you.journeys = [
    { ...score, correct: 3, help: { hints: 1, assists: 0, status: "hinted" } },
  ];
  page.friends[0].today = {
    date: score.date,
    status: "completed",
    scoreLocked: false,
    score,
  };
  page.friends[0].journeys = [
    { ...score, help: { hints: 2, assists: 1, status: "assisted" } },
  ];
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
  ).toContain("9/15");
  expect(
    host.querySelector(".account-comparison tbody")?.textContent,
  ).toContain("12/15");
  expect(
    host.querySelector(".account-comparison tbody")?.textContent,
  ).toContain("Hinted");
  expect(
    host.querySelector(".account-comparison tbody")?.textContent,
  ).toContain("Assisted");
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
  await click("Load more activity →");
  expect(host.querySelectorAll(".friend-card")).toHaveLength(2);
  request.mockRejectedValue(new Error("Offline"));
  await act(async () => dispatchEvent(new Event("focus")));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Offline",
  );
});

it("shows all accepted friends before their paged activity arrives", async () => {
  page.cursor = "next";
  const cathy = { ...bob, id: "c", displayName: "Cathy", handle: "cathy" };
  friends.push({ id: "c", status: "accepted", player: cathy });
  await mount();
  expect(
    host.querySelectorAll(".friends-grid-column .friend-card"),
  ).toHaveLength(2);
  expect(
    host.querySelector('[aria-label="View Cathy’s profile"]')?.textContent,
  ).toContain("@cathy");
  expect(
    host.querySelector('[aria-label="View Cathy’s profile"]')?.textContent,
  ).not.toContain("Not started");
});

it("shares the initial activity response with the comparison and reuses it after visiting a profile", async () => {
  await mount();
  expect(
    request.mock.calls.filter(([path]) => path.startsWith("friends/activity?")),
  ).toHaveLength(1);
  await click("View Bob’s profile");
  expect(host.querySelector(".friend-detail-today")).not.toBeNull();
  expect(host.querySelector(".friend-detail-results")).not.toBeNull();
  await click("← Back to friends");
  expect(host.textContent).not.toContain("Loading activity");
  expect(host.textContent).not.toContain("Waiting for synced comparison");
  expect(
    request.mock.calls.filter(([path]) => path.startsWith("friends/activity?")),
  ).toHaveLength(1);
});

it("retains settled permitted scores while refreshing, without transient loading or sync copy", async () => {
  page.you.journeys = [score];
  page.friends[0].journeys = [score];
  page.friends[0].today = {
    date: score.date,
    status: "completed",
    scoreLocked: false,
    score,
  };
  const settled = structuredClone(page);
  let finish!: (page: FriendActivityPage) => void;
  const pending = new Promise<FriendActivityPage>((resolve) => {
    finish = resolve;
  });
  request.mockImplementation(async () => pending);
  const api = { request } as CommunityClient;
  await mount({
    api,
    initialActivity: settled,
    defaultComparison: {
      date: score.date,
      journeyId: score.journeyId,
      version: 1,
    },
    sync: { status: "syncing", retry: vi.fn() },
  });
  const row = host.querySelector(".comparison-you .friend-comparison-row");
  expect(row?.textContent).toContain("12/15");
  expect(host.textContent).not.toContain("Loading activity");
  expect(host.textContent).not.toContain("Waiting for synced comparison");
  expect(host.textContent).not.toContain("Syncing your result");
  await act(async () => finish(settled));
  expect(host.querySelector(".comparison-you .friend-comparison-row")).toBe(
    row,
  );
  expect(row?.textContent).toContain("12/15");
  expect(
    request.mock.calls.filter(([path]) => path.startsWith("friends/activity?")),
  ).toHaveLength(1);
});

it("compares you first and friends alphabetically, excluding other Journey editions", async () => {
  const target = { date: score.date, journeyId: score.journeyId, version: 1 };
  page.you.journeys = [{ ...score, correct: 3 }];
  page.friends[0].journeys = [{ ...score, correct: 4 }];
  page.friends[0].today = {
    date: score.date,
    journeyId: score.journeyId,
    status: "completed",
    scoreLocked: false,
    score: { ...score, correct: 4 },
  };
  const amy = { ...bob, id: "c", displayName: "Amy", handle: "amy" };
  friends.push({ id: "c", status: "accepted", player: amy });
  page.friends.push({
    ...page.friends[0],
    player: amy,
    journeys: [{ ...score, gameVersion: 2, correct: 5 }],
    today: {
      ...page.friends[0].today,
      score: { ...score, gameVersion: 2, correct: 5 },
    },
  });
  await mount({ intent: { tab: "friends", comparison: target } });
  const rows = [...host.querySelectorAll(".friend-comparison-list li")];
  expect(rows.map((row) => row.querySelector("strong")?.textContent)).toEqual([
    "Alice",
    "Amy",
    "Bob",
  ]);
  expect(rows[0].textContent).toContain("9/15");
  expect(rows[1].textContent).toContain("Different Journey");
  expect(rows[1].textContent).not.toContain("15/15");
  expect(rows[2].textContent).toContain("12/15");
  expect(host.querySelector('[aria-label="Friends views"]')).toBeNull();
  expect(host.querySelectorAll(".friend-card")).toHaveLength(2);
});
it.each(["incoming", "outgoing", "accepted"] as const)(
  "opens an invitation automatically with the %s relationship action",
  async (status) => {
    friends[0].status = status;
    await mount({ intent: { tab: "friends", friend: "bob" } });
    expect(request).toHaveBeenCalledWith(
      "players/bob",
      "GET",
      undefined,
      expect.any(AbortSignal),
    );
    expect(host.querySelector(".friend-find-form")).toBeNull();
    expect(host.textContent).toContain("Connect with @bob");
    expect(onAction).not.toHaveBeenCalled();
    expect(onRequest).not.toHaveBeenCalled();
    if (status === "incoming") {
      await click("Accept request");
      expect(onAction).toHaveBeenCalledWith("b", "accept");
    }
    if (status === "outgoing")
      expect(host.textContent).toContain("Request sent");
    if (status === "accepted")
      expect(host.textContent).toContain("Already friends");
  },
);
it("requires an explicit click to add an invited player and identifies a self invitation", async () => {
  friends = [];
  await mount({ intent: { tab: "friends", friend: "bob" } });
  expect(onRequest).not.toHaveBeenCalled();
  await click("Add friend");
  expect(onRequest).toHaveBeenCalledWith("bob");
  request.mockImplementation(async (path: string) =>
    path.startsWith("players/") ? alice : page,
  );
  await mount({ intent: { tab: "friends", friend: "alice" } });
  expect(host.textContent).toContain("That’s you.");
  expect(
    [...host.querySelectorAll("button")].some(
      (button) => button.textContent === "Add friend",
    ),
  ).toBe(false);
});
it("handles an unavailable invitation with retry and returns to ordinary search", async () => {
  request.mockImplementation(async (path: string) => {
    if (path.startsWith("players/"))
      throw new Error("That player is unavailable.");
    return page;
  });
  await mount({ intent: { tab: "friends", friend: "bob" } });
  expect(host.textContent).toContain("That player is unavailable.");
  request.mockImplementation(async (path: string) =>
    path.startsWith("players/") ? bob : page,
  );
  await click("Retry invitation");
  expect(host.textContent).toContain("@bob");
  await click("Search another player");
  expect(host.querySelector(".friend-find-form")).not.toBeNull();
});
it("refreshes comparisons after a relationship is removed and clears private rows on errors", async () => {
  await mount({
    intent: {
      comparison: { date: score.date, journeyId: score.journeyId, version: 1 },
    },
  });
  expect(host.querySelectorAll(".friend-comparison-list li")).toHaveLength(2);
  friends = [];
  await mount({
    intent: {
      comparison: { date: score.date, journeyId: score.journeyId, version: 1 },
    },
  });
  expect(host.querySelectorAll(".friend-comparison-list li")).toHaveLength(1);
  request.mockRejectedValue(new Error("Offline"));
  await act(async () => dispatchEvent(new Event("focus")));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Offline",
  );
});

it("shows every accepted friend with completed players first and unfinished progress visible", async () => {
  const statuses = [
    ["Aaron", "in_progress"],
    ["Zoe", "completed"],
    ["Amy", "not_started"],
  ] as const;
  for (const [name, status] of statuses) {
    const player = {
      ...bob,
      id: name,
      displayName: name,
      handle: name.toLowerCase(),
    };
    friends.push({ id: name, status: "accepted", player });
    page.friends.push({
      player,
      stats,
      journeys: [],
      today: {
        date: score.date,
        journeyId: score.journeyId,
        status,
        scoreLocked: status === "completed",
      },
    });
  }
  await mount({
    intent: {
      tab: "friends",
      comparison: { date: score.date, journeyId: score.journeyId, version: 1 },
    },
  });
  const rows = [...host.querySelectorAll(".friend-comparison-list li")];
  expect(rows.map((row) => row.querySelector("strong")?.textContent)).toEqual([
    "Alice",
    "Bob",
    "Zoe",
    "Aaron",
    "Amy",
  ]);
  expect(rows[3].textContent).toContain("In progress");
  expect(rows[4].textContent).toContain("Not started");
  expect(host.querySelector('[aria-label="Refresh friends"]')).toBeNull();
  expect(host.textContent).not.toContain("Refresh comparisons");
  const directory = host.querySelector(".friends-directory")!;
  const comparison = host.querySelector("#journey-comparison")!;
  expect(
    comparison.compareDocumentPosition(directory) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
it("focuses and scrolls to the comparison section when reached from a result link", async () => {
  const scroll = vi.fn();
  const previous = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  await mount({
    intent: {
      tab: "friends",
      comparison: { date: score.date, journeyId: score.journeyId, version: 1 },
    },
  });
  await act(
    async () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" });
  expect(document.activeElement).toBe(
    host.querySelector("#journey-comparison"),
  );
  const intent = {
    tab: "friends" as const,
    comparison: { date: score.date, journeyId: score.journeyId, version: 1 },
  };
  await mount({ intent, disabled: true });
  await mount({ intent, disabled: false });
  expect(scroll).toHaveBeenCalledTimes(1);
  HTMLElement.prototype.scrollIntoView = previous;
});

it("waits for the directory then scrolls the document to the comparison on the account page", async () => {
  host.classList.add("page-layout");
  const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const intent = {
    tab: "friends" as const,
    comparison: { date: score.date, journeyId: score.journeyId, version: 1 },
  };
  await mount({ intent, relationshipsLoaded: false });
  await act(
    async () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  expect(scroll).not.toHaveBeenCalled();
  const section = host.querySelector<HTMLElement>("#journey-comparison")!;
  vi.spyOn(section, "getBoundingClientRect").mockReturnValue({
    top: 640,
  } as DOMRect);
  await mount({ intent, relationshipsLoaded: true });
  await act(
    async () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  expect(scroll).toHaveBeenCalledWith({ top: 540, behavior: "auto" });
  expect(document.activeElement).toBe(section);
  scroll.mockRestore();
});
it("uses the same comparison row and avatar for you and friends, and puts search on the left", async () => {
  await mount();
  const self = host.querySelector(".comparison-you")!;
  expect(self.querySelector(".friend-comparison-row")).not.toBeNull();
  expect(self.querySelector(".profile-avatar")).not.toBeNull();
  expect(self.textContent).toContain("Alice");
  expect(self.querySelector(".comparison-you-label")?.textContent).toBe("You");
  expect(
    host.querySelector(".friends-search-column .friend-add"),
  ).not.toBeNull();
  expect(
    host.querySelector(".friends-grid-column .friend-cards"),
  ).not.toBeNull();
});

it("labels the comparison as today's Journey and follows today's date for an old link", async () => {
  await mount({
    intent: {
      comparison: {
        date: "2026-10-09",
        journeyId: score.journeyId,
        version: 1,
      },
    },
    defaultComparison: {
      date: score.date,
      journeyId: "exceptions-to-the-rule-v1",
      version: 1,
    },
  });
  const section = host.querySelector("#journey-comparison")!;
  expect(section.querySelector("h3")?.textContent).toContain(
    "Today’s Journey — Exceptions to the Rule",
  );
  expect(section.querySelector("h3 em")).not.toBeNull();
  expect(section.textContent).not.toContain("2026-10-10 ·");
  expect(request).toHaveBeenCalledWith(
    "friends/activity?date=2026-10-10",
    "GET",
    undefined,
    expect.any(AbortSignal),
  );
  expect(host.textContent).not.toContain("Invite a friend ↗");
  expect(host.textContent).toContain("invite them to play.");
});

it("keeps an archive comparison's date instead of redirecting to today's Journey", async () => {
  vi.setSystemTime(new Date("2026-10-19T16:00:00Z"));
  await mount({
    intent: {
      comparison: {
        date: "2026-10-11",
        journeyId: "along-the-andes-v1",
        version: 2,
      },
    },
    defaultComparison: {
      date: "2026-10-19",
      journeyId: "shared-neighbors-v1",
      version: 2,
    },
  });
  expect(host.querySelector("#journey-comparison h3")?.textContent).toContain(
    "October 11, 2026",
  );
  expect(host.querySelector("#journey-comparison h3")?.textContent).toContain(
    "Along the Andes",
  );
  expect(request).toHaveBeenCalledWith(
    "friends/activity?date=2026-10-11",
    "GET",
    undefined,
    expect.any(AbortSignal),
  );
});

it("drops yesterday's local score when today's comparison date changes", async () => {
  const day = score.date;
  const attempt = {
    date: day,
    journeyId: score.journeyId,
    scheduleVersion: 1,
    game: {
      phase: "finished" as const,
      roundIndex: 4,
      answers: [],
      selectedIds: [],
      ordered: [],
      text: "",
    },
  };
  const daily = { version: 1 as const, attempts: { [day]: attempt } };
  await mount({
    daily,
    defaultComparison: { date: day, journeyId: score.journeyId, version: 1 },
  });
  vi.setSystemTime(new Date("2026-10-11T16:00:00Z"));
  await mount({
    daily,
    defaultComparison: {
      date: "2026-10-11",
      journeyId: score.journeyId,
      version: 1,
    },
  });
  expect(host.querySelector(".comparison-you")?.textContent).not.toContain(
    "0/5",
  );
  expect(request).toHaveBeenCalledWith(
    "friends/activity?date=2026-10-11",
    "GET",
    undefined,
    expect.any(AbortSignal),
  );
});

it("shows unlocked help as icons with counts and accessible summaries while retaining score locks", async () => {
  page.friends[0].journeys = [
    { ...score, help: { hints: 3, assists: 2, status: "assisted" } },
  ];
  await mount({
    defaultComparison: {
      date: score.date,
      journeyId: score.journeyId,
      version: 1,
    },
  });
  const result = host.querySelector(".friend-comparison-list li:last-child")!;
  expect(result.querySelector(".comparison-score")?.textContent).toBe("12/15");
  const help = result.querySelector('.comparison-help[role="img"]')!;
  expect(help.getAttribute("aria-label")).toBe(
    "Assisted · 3 hints · 2 assists",
  );
  expect(help.querySelectorAll(".action-icon")).toHaveLength(2);
  expect(help.textContent).toBe("32");
  const summary = result.querySelector(".comparison-score-summary")!;
  expect(summary.lastElementChild?.classList.contains("comparison-score")).toBe(
    true,
  );
  expect(
    help.compareDocumentPosition(summary.lastElementChild!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  page.friends[0].journeys = [];
  await act(async () => dispatchEvent(new Event("focus")));
  expect(result.textContent).toContain("Score locked");
  expect(result.querySelector(".comparison-score")).toBeNull();
  expect(result.querySelector(".comparison-help")).toBeNull();
});
