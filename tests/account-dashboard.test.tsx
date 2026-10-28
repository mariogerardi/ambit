// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountDashboard } from "../src/app/AccountDashboard";
import { ToastProvider } from "../src/app/Toast";
import {
  accountProgress,
  openStudyChallenge,
} from "../src/app/accountProgress";
import { emptyDaily } from "../src/app/dailyProgress";
import { CommunityError, challengeSettings } from "../src/services/community";
import type {
  AccountProfile,
  Challenge,
  CommunityClient,
  Friendship,
} from "../src/services/community";
import {
  defaultSettings,
  startStudy,
  studyReducer,
  studyComplete,
  archiveStudy,
} from "../src/study/engine";
import { studySaveCodec } from "../src/app/progressSaves";

let root: Root, host: HTMLDivElement;
let profile: AccountProfile, friends: Friendship[], challenges: Challenge[];
let request: ReturnType<typeof vi.fn>;
const player = {
  id: "b",
  displayName: "Bob",
  handle: "bob",
  avatar: "compass" as const,
  favoriteRegion: "Oceania",
  bio: "Curious",
};
const sharedSettings = challengeSettings(
  {
    ...defaultSettings,
    styles: { ...defaultSettings.styles, countries: "choices" },
  },
  10,
);
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  history.replaceState(null, "", "/account");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  profile = {
    id: "a",
    displayName: "Alice",
    handle: "alice",
    avatar: "globe",
    favoriteRegion: "",
    bio: "",
    shareJourneyScores: false,
    presets: [],
    revision: 1,
  };
  friends = [{ id: "b", status: "incoming", player }];
  challenges = [
    {
      id: "e550e0b1-6337-49de-8587-0f4c27834ee8",
      title: "Capital curiosity",
      owner: "a",
      opponent: "b",
      player,
      seed: 42,
      settings: sharedSettings,
      status: "active",
      createdAt: 1,
      results: {},
    },
  ];
  request = vi.fn(async (path: string, method = "GET", body?: unknown) => {
    if (path === "profile") {
      if (method === "PATCH")
        profile = {
          ...(body as AccountProfile),
          revision: profile.revision + 1,
        };
      return structuredClone(profile);
    }
    if (path === "friends") return structuredClone(friends);
    if (path.startsWith("friends/activity?"))
      return {
        date: "2026-10-10",
        you: {
          today: {
            date: "2026-10-10",
            status: "not_started",
            scoreLocked: false,
          },
          journeys: [],
          stats: {
            journeyStreak: 0,
            journeysCompleted: 0,
            studySessions: 0,
            studyQuestions: 0,
            studyAccuracy: null,
          },
        },
        friends: friends
          .filter((item) => item.status === "accepted")
          .map((item) => ({
            player: item.player,
            today: {
              date: "2026-10-10",
              status: "completed",
              scoreLocked: true,
            },
            journeys: [],
            stats: {
              journeyStreak: 2,
              journeysCompleted: 5,
              studySessions: 2,
              studyQuestions: 20,
              studyAccuracy: 75,
            },
          })),
      };
    if (path.startsWith("handles/"))
      return { handle: path.slice(8), available: true, suggestions: [] };
    if (path === "challenges") return structuredClone(challenges);
    if (path === "friends/b" && method === "PATCH") {
      friends[0].status = "accepted";
      return { saved: true };
    }
    return {};
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount(
  props: Partial<Parameters<typeof AccountDashboard>[0]> = {},
  notifications = false,
) {
  const dashboard = (
    <AccountDashboard
      subject="a"
      email="alice@example.com"
      client={{ request } as CommunityClient}
      {...props}
    />
  );
  await act(async () =>
    root.render(
      notifications ? <ToastProvider>{dashboard}</ToastProvider> : dashboard,
    ),
  );
}
async function click(text: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) =>
      b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
  )!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
async function input(selector: string, value: string) {
  const field = host.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("loads private account data and accepts an incoming request for the displayed player", async () => {
  await mount();
  expect(host.textContent).toContain("Pick up your next stop.");
  expect(host.textContent).not.toContain("alice@example.com");
  await click("Friends · New");
  await click("Accept");
  expect(request).toHaveBeenCalledWith("friends/b", "PATCH", {
    action: "accept",
  });
  expect(host.textContent).toContain("@bob");
  expect(host.querySelector(".friend-card")?.textContent).toContain("@bob");
});
it("keeps private email, sync and sign-out in Settings, separate from Profile and Friends", async () => {
  const onSignOut = vi.fn();
  const retry = vi.fn();
  await mount({
    onSignOut,
    sync: {
      status: "synced",
      message:
        "Progress is saved to your account. Sign in on another device to continue.",
      retry,
    },
  });
  expect(host.textContent).not.toContain("alice@example.com");
  expect(host.textContent).not.toContain("Sign out");
  await click("Profile");
  expect(
    host.querySelector(".account-profile-layout > .profile-card"),
  ).not.toBeNull();
  expect(host.textContent).not.toContain("alice@example.com");
  expect(host.textContent).not.toContain("Sign out");
  await click("Settings");
  const side = host.querySelector('[aria-label="Private account details"]')!;
  expect(side.textContent).toContain("alice@example.com");
  expect(side.textContent).toContain("Only you can see your email.");
  expect(side.textContent).toContain("Account & sync");
  expect(side.textContent).toContain("Sign in on another device");
  await click("Sign out");
  expect(onSignOut).toHaveBeenCalledOnce();
  await click("Friends · New");
  expect(host.textContent).not.toContain("alice@example.com");
  expect(host.textContent).not.toContain("Sign out");
  expect(host.textContent).not.toContain("Sign in on another device");
});
it("retains an edited profile and shows a handle collision instead of silently losing changes", async () => {
  await mount();
  await click("Profile");
  await click("Edit profile");
  await input('input[autocomplete="nickname"]', "Updated Alice");
  request.mockImplementationOnce(async () => {
    throw new Error("That handle is taken.");
  });
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "That handle is taken",
  );
  expect(
    host.querySelector<HTMLInputElement>('input[autocomplete="nickname"]')!
      .value,
  ).toBe("Updated Alice");
  expect(profile.displayName).toBe("Alice");
});
it("checks handles without changing saved identity and offers available alternatives", async () => {
  vi.useFakeTimers();
  try {
    const original = request.getMockImplementation()! as (
      path: string,
      method?: string,
      body?: unknown,
    ) => Promise<unknown>;
    request.mockImplementation(
      async (path: string, method = "GET", body?: unknown) =>
        path === "handles/bob"
          ? { handle: "bob", available: false, suggestions: ["bob_world"] }
          : original(path, method, body),
    );
    await mount();
    await click("Profile");
    await click("Edit profile");
    await input('input[aria-label="Handle"]', "BOB");
    await act(async () => vi.advanceTimersByTimeAsync(400));
    expect(
      host.querySelector('[aria-label="Handle"]')?.getAttribute("aria-invalid"),
    ).toBe("true");
    expect(
      host.querySelector<HTMLButtonElement>(".profile-form .primary-button")
        ?.disabled,
    ).toBe(true);
    expect(profile.handle).toBe("alice");
    expect(
      request.mock.calls.some(
        ([path, method]) => path === "profile" && method === "PATCH",
      ),
    ).toBe(false);
    await click("@bob_world");
    await act(async () => vi.advanceTimersByTimeAsync(400));
    expect(host.textContent).toContain("This handle is available");
    await act(async () =>
      host
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    expect(profile.handle).toBe("bob_world");
  } finally {
    vi.useRealTimers();
  }
});
it("shows a save-time handle collision even if the availability check passed", async () => {
  await mount();
  await click("Profile");
  await click("Edit profile");
  await input('input[aria-label="Handle"]', "newhandle");
  request.mockImplementationOnce(async () => {
    throw new CommunityError("That handle is already in use.", 409, "handle", [
      "newhandle_world",
    ]);
  });
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(host.querySelector(".handle-availability")?.textContent).toContain(
    "@newhandle_world",
  );
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Handle"]')?.value,
  ).toBe("newhandle");
  expect(profile.handle).toBe("alice");
});
it("opens a saved profile card before editing and cancels unsaved edits", async () => {
  await mount();
  await click("Profile");
  expect(host.querySelector(".profile-card")?.textContent).toContain("Alice");
  expect(host.querySelector(".profile-card")?.textContent).not.toContain(
    "Journey scores",
  );
  expect(host.querySelector(".profile-form")).toBeNull();
  await click("Edit profile");
  expect(host.textContent).not.toContain("Share completed Journey scores");
  await input('input[autocomplete="nickname"]', "Unsaved Alice");
  expect(
    host.querySelectorAll('.avatar-options input[type="radio"]'),
  ).toHaveLength(24);
  expect(host.querySelectorAll(".avatar-options input:disabled")).toHaveLength(
    0,
  );
  expect(host.querySelectorAll(".avatar-options img")).toHaveLength(24);
  await click("← Back to profile");
  expect(host.querySelector(".profile-card")?.textContent).toContain("Alice");
  expect(host.textContent).not.toContain("Unsaved Alice");
  expect(profile.displayName).toBe("Alice");
});
it("saves a fixed theme avatar and renders the chosen local artwork", async () => {
  await mount({}, true);
  await click("Profile");
  await click("Edit profile");
  const choice = host.querySelector<HTMLInputElement>(
    '.avatar-options input[value="avatar-08"]',
  )!;
  expect(choice.disabled).toBe(false);
  await act(async () => choice.click());
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(profile.avatar).toBe("avatar-08");
  expect(
    host
      .querySelector(".profile-card .profile-avatar img")
      ?.getAttribute("src"),
  ).toBe("/avatars/avatar-08.svg");
  expect(host.textContent).toContain("Your profile is saved.");
  expect(host.querySelector('.toast [role="status"]')?.textContent).toBe(
    "Your profile is saved.",
  );
  expect(host.querySelector('.account-message[role="status"]')).toBeNull();
});
it("saves a country flag avatar and renders its local image", async () => {
  await mount();
  await click("Profile");
  await click("Edit profile");
  const flags = host.querySelector<HTMLSelectElement>(
    'select[aria-label="Country flag avatar"]',
  )!;
  await act(async () => {
    flags.value = "flag:wurl:CAN";
    flags.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(profile.avatar).toBe("flag:wurl:CAN");
  expect(
    host
      .querySelector(".profile-card .profile-avatar img")
      ?.getAttribute("src"),
  ).toMatch(/^\/flags\/study\//);
  expect(host.textContent).toContain("Your profile is saved.");
});
it("keeps profile editing available when only friends fail to load", async () => {
  const original = request.getMockImplementation()! as (
    path: string,
    method?: string,
    body?: unknown,
  ) => Promise<unknown>;
  request.mockImplementation(
    async (path: string, method = "GET", body?: unknown) => {
      if (path === "friends") throw new Error("Offline");
      return original(path, method, body);
    },
  );
  await mount();
  await click("Profile");
  await click("Edit profile");
  expect(
    host.querySelector<HTMLButtonElement>(".profile-form button.primary-button")
      ?.disabled,
  ).toBe(false);
  expect(host.querySelector('[role="alert"]')).toBeNull();
  await click("Friends");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn’t load your friends",
  );
  expect(host.textContent).not.toContain("No friends yet");
});
it("offers Study continuation and recent activity without requesting the removed challenges feature", async () => {
  const onStudy = vi.fn();
  const onJourney = vi.fn();
  const session = startStudy(sharedSettings, 42);
  await mount({
    onStudy,
    onJourney,
    study: {
      version: 1,
      settings: sharedSettings,
      session,
    },
  });
  for (const label of [
    "Your Journeys",
    "Past Study sessions",
    "Saved Study setups",
    "Challenges",
  ])
    expect(host.textContent).not.toContain(label);
  expect(host.textContent).toContain("Journey streak");
  expect(host.textContent).toContain("Resume Study");
  expect(host.querySelector('[aria-label="Recent activity"]')).not.toBeNull();
  await click("Resume Study→");
  await click("Play today’s Journey→");
  expect(onStudy).toHaveBeenCalledOnce();
  expect(onJourney).toHaveBeenCalledOnce();
  expect(session.history).toEqual([]);
  expect(
    request.mock.calls.some(
      ([, method]) => method === "PATCH" || method === "POST",
    ),
  ).toBe(false);
  expect(request.mock.calls.some(([path]) => path === "challenges")).toBe(
    false,
  );
});
it("preserves a failed account-load message when switching tabs and prevents unavailable profile writes", async () => {
  request.mockRejectedValue(new Error("Account services unavailable."));
  await mount();
  await click("Profile");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Account services unavailable.",
  );
  expect(
    host.querySelector<HTMLButtonElement>(".profile-form button.primary-button")
      ?.disabled,
  ).toBe(true);
});
it("keeps challenge questions identical despite different answers", () => {
  let a = startStudy(sharedSettings, 42),
    b = startStudy(sharedSettings, 42);
  while (a.phase !== "summary") {
    expect(a.prompt).toEqual(b.prompt);
    a = studyReducer(a, { type: "choice", id: a.prompt.targetId });
    b = studyReducer(b, {
      type: "choice",
      id: b.prompt.choices.find((id) => id !== b.prompt.targetId)!,
    });
    a = studyReducer(studyReducer(a, { type: "submit" }), { type: "next" });
    b = studyReducer(studyReducer(b, { type: "submit" }), { type: "next" });
  }
  expect(studyComplete(a)).toBe(true);
  expect(a.history.every((v) => v.correct)).toBe(true);
  expect(b.history.every((v) => !v.correct)).toBe(true);
});
it("resumes an active challenge and starts a distinct run after an ended attempt", () => {
  const save = openStudyChallenge(
    { version: 1, settings: defaultSettings },
    challenges[0],
  );
  expect(save.session?.id).not.toBe(challenges[0].id);
  expect(openStudyChallenge(save, challenges[0])).toBe(save);
  const answer = studyReducer(
    studyReducer(save.session!, {
      type: "choice",
      id: save.session!.prompt.targetId,
    }),
    { type: "submit" },
  );
  const ended = archiveStudy({
    ...save,
    session: studyReducer(answer, { type: "finish" }),
  });
  const next = openStudyChallenge(ended, challenges[0]);
  expect(next.session?.id).not.toBe(save.session?.id);
  expect(next.session?.challengeId).toBe(challenges[0].id);
  expect(next.history?.[0].id).toBe(save.session?.id);
  const records = studySaveCodec.encode(next);
  expect(records[`session.${next.session!.id}`]).toMatchObject({
    phase: "playing",
    history: [],
  });
  expect(records[`history.${save.session!.id}`]).toBeDefined();
});
it("counts a streak by calendar days and avoids duplicate Journey totals", () => {
  const attempt = (date: string) => ({
    date,
    journeyId: "test",
    scheduleVersion: 1,
    startedAt: 1,
    game: {
      phase: "finished" as const,
      roundIndex: 4,
      answers: [],
      text: "",
      choiceId: "",
      selectedIds: [],
      ordered: [],
    },
  });
  const metrics = accountProgress(
    {
      ...emptyDaily,
      attempts: {
        "2026-10-09": attempt("2026-10-09"),
        "2026-10-08": attempt("2026-10-08"),
      },
      archivedAttempts: { duplicate: attempt("2026-10-09") },
    },
    { version: 1, settings: defaultSettings },
    "2026-10-10",
  );
  expect(metrics.streak).toBe(2);
  expect(metrics.journeys).toHaveLength(2);
  expect(metrics.accuracy).toBeUndefined();
});

it("keeps an invitation through profile creation and returns to its actionable card", async () => {
  const baseRequest = request.getMockImplementation()! as (
    path: string,
    method?: string,
    body?: unknown,
    signal?: AbortSignal,
  ) => Promise<unknown>;
  let created = false;
  friends = [];
  request.mockImplementation(
    async (
      path: string,
      method = "GET",
      body?: unknown,
      signal?: AbortSignal,
    ) => {
      if (path === "profile" && method === "GET" && !created) return null;
      if (path === "profile" && method === "PATCH") created = true;
      if (path === "players/bob") return player;
      return baseRequest(path, method, body, signal);
    },
  );
  const client = { request } as CommunityClient;
  await mount({ client, intent: { tab: "friends", friend: "bob" } });
  expect(host.textContent).toContain("Connect with @bob");
  await click("Create your profile →");
  await input('input[autocomplete="nickname"]', "Alice");
  await input('input[aria-label="Handle"]', "alice");
  await act(async () =>
    host
      .querySelector("form.profile-form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(host.textContent).toContain("Connect with @bob");
  expect(
    [...host.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent === "Add friend",
    )?.disabled,
  ).toBe(false);
  expect(
    request.mock.calls.some(
      ([path, method]) => path === "friends" && method === "POST",
    ),
  ).toBe(false);
});
it("applies new navigation intent while Account remains mounted", async () => {
  const client = { request } as CommunityClient;
  await mount({ client });
  await click("Profile");
  await mount({
    client,
    intent: {
      tab: "friends",
      comparison: {
        date: "2026-10-10",
        journeyId: "beyond-the-maple-leaf-v1",
        version: 1,
      },
    },
  });
  expect(
    host.querySelector('[aria-label="Journey comparison"]'),
  ).not.toBeNull();
  await mount({ client, intent: {} });
  expect(host.querySelector(".account-stats")).not.toBeNull();
});

it("consumes comparison arrival so switching account tabs does not scroll there again", async () => {
  const scroll = vi.fn();
  const previous = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = scroll;
  friends = [{ id: "b", status: "accepted", player }];
  const client = { request } as CommunityClient;
  const intent = {
    tab: "friends" as const,
    comparison: {
      date: "2026-10-10",
      journeyId: "beyond-the-maple-leaf-v1",
      version: 1,
    },
  };
  try {
    await mount({ client, intent });
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(scroll).toHaveBeenCalledTimes(1);
    await click("Progress");
    await click("Friends");
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(scroll).toHaveBeenCalledTimes(1);
    await click("Profile");
    await click("Friends");
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(scroll).toHaveBeenCalledTimes(1);
    // A new external navigation remains actionable, even for the same Journey.
    await mount({ client, intent: { ...intent } });
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(scroll).toHaveBeenCalledTimes(2);
  } finally {
    HTMLElement.prototype.scrollIntoView = previous;
  }
});

it("retains a profile draft and mounted admin content while route intent changes", async () => {
  const client = { request } as CommunityClient;
  const onNavigate = vi.fn();
  const adminContent = (
    <input aria-label="Admin draft" defaultValue="October selection" />
  );
  const props = { client, onNavigate, adminContent };
  await mount({ ...props, intent: { tab: "profile" } });
  const heading = host.querySelector(".account-heading");
  await click("Edit profile");
  await input('input[autocomplete="nickname"]', "Alice traveling");
  await click("Progress");
  expect(onNavigate).toHaveBeenLastCalledWith("/account?tab=dashboard");
  await mount({ ...props, intent: { tab: "admin", section: "tools" } });
  const adminDraft = host.querySelector<HTMLInputElement>(
    '[aria-label="Admin draft"]',
  )!;
  adminDraft.value = "Unpublished selection";
  await mount({ ...props, intent: { tab: "profile" } });
  expect(host.querySelector(".account-heading")).toBe(heading);
  expect(
    host.querySelector<HTMLInputElement>('input[autocomplete="nickname"]')!
      .value,
  ).toBe("Alice traveling");
  await mount({ ...props, intent: { tab: "admin", section: "schedule" } });
  expect(host.querySelector('[aria-label="Admin draft"]')).toBe(adminDraft);
  expect(adminDraft.value).toBe("Unpublished selection");
  expect(
    request.mock.calls.filter(
      ([path, method]) => path === "profile" && (!method || method === "GET"),
    ),
  ).toHaveLength(1);
});
