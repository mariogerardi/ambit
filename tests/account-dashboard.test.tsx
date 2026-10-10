// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AccountDashboard } from "../src/app/AccountDashboard";
import {
  accountProgress,
  openStudyChallenge,
} from "../src/app/accountProgress";
import { emptyDaily } from "../src/app/dailyProgress";
import { challengeSettings } from "../src/services/community";
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
) {
  await act(async () =>
    root.render(
      <AccountDashboard
        subject="a"
        email="alice@example.com"
        client={{ request } as CommunityClient}
        {...props}
      />,
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
  expect(host.textContent).toContain("Hello, Alice.");
  expect(host.textContent).toContain("alice@example.com");
  await click("Friends · New");
  await click("Accept");
  expect(request).toHaveBeenCalledWith("friends/b", "PATCH", {
    action: "accept",
  });
  expect(host.textContent).toContain("@bob · Friend");
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
    24,
  );
  expect(host.querySelectorAll(".avatar-options img")).toHaveLength(0);
  await click("← Back to profile");
  expect(host.querySelector(".profile-card")?.textContent).toContain("Alice");
  expect(host.textContent).not.toContain("Unsaved Alice");
  expect(profile.displayName).toBe("Alice");
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
      .querySelector(".account-heading .profile-avatar img")
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
it("keeps the dashboard compact and never requests the removed challenges feature", async () => {
  await mount({
    study: {
      version: 1,
      settings: sharedSettings,
      session: startStudy(sharedSettings, 42),
    },
  });
  for (const label of [
    "Your Journeys",
    "Past Study sessions",
    "Saved Study setups",
    "Continue your Study session",
    "Challenges",
  ])
    expect(host.textContent).not.toContain(label);
  expect(host.textContent).toContain("Journey streak");
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
