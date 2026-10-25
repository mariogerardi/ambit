// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JourneySocial } from "../src/app/JourneySocial";
import { JourneyShareDialog } from "../src/app/JourneyShareDialog";
import { CANADA_JOURNEY } from "../src/game/canadaJourney";
import { initialGame } from "../src/game/state";
import { sharedJourneyResult } from "../src/app/journeySharing";
const mocks = vi.hoisted(() => ({
  signedIn: false,
  image: vi.fn(),
  token: vi.fn(async () => "token"),
}));
vi.mock("../src/services/accounts", () => ({
  useAccount: () => ({
    user: mocks.signedIn ? { profile: { sub: "a" } } : null,
    accessToken: mocks.token,
  }),
}));
vi.mock("../src/app/journeySharing", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/app/journeySharing")>()),
  resultImage: mocks.image,
}));
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
const attempt = {
  date: "2026-10-13",
  journeyId: CANADA_JOURNEY.id,
  scheduleVersion: 1,
  game: {
    ...initialGame,
    phase: "finished" as const,
    answers: CANADA_JOURNEY.rounds.map((round, i) => ({
      ...initialGame,
      roundId: round.id,
      correct: i !== 1,
    })),
  },
};
const result = sharedJourneyResult(
  CANADA_JOURNEY,
  attempt.game,
  attempt.date,
  "https://playambit.com",
);
const navigate = vi.fn();
let fetcher: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.signedIn = false;
  mocks.image
    .mockReset()
    .mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  navigate.mockReset();
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: vi.fn(() => "blob:result"),
      revokeObjectURL: vi.fn(),
    }),
  );
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: undefined,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn(async () => {}) },
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function click(label: string) {
  const button = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find(
    (button) =>
      button.textContent?.trim() === label ||
      button.getAttribute("aria-label") === label,
  )!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
async function renderSocial(status = "saved") {
  await act(async () =>
    root.render(
      <JourneySocial
        journey={CANADA_JOURNEY}
        attempt={attempt}
        sync={{ status, retry: vi.fn() }}
        onNavigate={navigate}
      />,
    ),
  );
}
async function renderDialog() {
  await act(async () =>
    root.render(<JourneyShareDialog result={result} onClose={vi.fn()} />),
  );
}
it("shares a minigame card with its own image, filename and caption", async () => {
  const image = vi.fn(
    async () => new Blob(["minigame"], { type: "image/png" }),
  );
  const share = vi.fn(async () => {});
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: () => true,
  });
  await act(async () =>
    root.render(
      <JourneyShareDialog
        card={{
          heading: "Share Pinpoint",
          caption: "Play Pinpoint with me",
          description: "7,200 points",
          filename: "ambit-pinpoint.png",
          image,
        }}
        onClose={vi.fn()}
      />,
    ),
  );
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "Share Pinpoint",
  );
  expect(mocks.image).not.toHaveBeenCalled();
  await click("Share");
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({
      text: "Play Pinpoint with me",
      files: [expect.objectContaining({ name: "ambit-pinpoint.png" })],
    }),
  );
});
it("lets guests share without social requests and links comparison sign-in to the saved edition", async () => {
  await renderSocial();
  expect(fetcher).not.toHaveBeenCalled();
  await click("Sign in to compare with friends →");
  expect(navigate.mock.calls[0][0]).toContain("version=1");
  await click("Share result");
  await click("Share");
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    expect.stringContaining("Take today’s Journey with me"),
  );
  expect(document.querySelector('[role="dialog"]')).not.toBeNull();
});
it("keeps signed-in completion to share and compare without requesting a friends overview", async () => {
  mocks.signedIn = true;
  await renderSocial("syncing");
  expect(fetcher).not.toHaveBeenCalled();
  expect(host.querySelector(".journey-friend-preview")).toBeNull();
  expect(host.textContent).not.toContain("Opening friend activity");
  expect(host.textContent).toContain("Syncing your result");
  await click("Compare with friends →");
  expect(navigate.mock.calls[0][0]).toContain("#journey-comparison");
});
it("waits for the image and offers retry without a text-only share", async () => {
  mocks.image.mockRejectedValue(new Error("Canvas unavailable"));
  await renderDialog();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Please retry",
  );
  const shareButton = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find((button) => button.textContent === "Share")!;
  expect(shareButton.disabled).toBe(true);
  expect(
    [...document.querySelectorAll("button")].some((button) =>
      /Share text|Share image|Copy text/.test(button.textContent ?? ""),
    ),
  ).toBe(false);
  mocks.image.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
  await click("Retry image");
  expect(shareButton.disabled).toBe(false);
});
it("prepares a PNG before file sharing, keeps downloads available, and treats cancellation quietly", async () => {
  const share = vi.fn(async (_data: ShareData) => {
    throw new DOMException("Cancelled", "AbortError");
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: () => true,
  });
  await renderDialog();
  await click("Share");
  expect(share).toHaveBeenCalledWith(
    expect.objectContaining({
      files: [expect.any(File)],
      text: expect.stringContaining("Take today’s Journey with me"),
    }),
  );
  expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  expect(share.mock.calls[0][0]).not.toHaveProperty("url");
  expect(document.querySelector('[role="status"]')).toBeNull();
  expect(document.activeElement?.getAttribute("role")).toBe("dialog");
});
it("saves the image and copies its accompanying caption together when file sharing is unsupported", async () => {
  const share = vi.fn();
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: () => false,
  });
  await renderDialog();
  await click("Share");
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
    expect.stringContaining("https://playambit.com/daily"),
  );
  expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(
    expect.stringContaining("4/5"),
  );
  expect(share).not.toHaveBeenCalled();
  expect(document.querySelector('[role="status"]')?.textContent).toContain(
    "caption copied",
  );
});
it("retains both image and caption after native sharing fails or clipboard access is unavailable", async () => {
  const share = vi.fn(async (_data: ShareData) => {
    throw new Error("Unavailable");
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: () => true,
  });
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
  await renderDialog();
  await click("Share");
  expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  await click("Save image & copy caption");
  expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
  expect(
    document.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Caption to copy"]',
    )?.value,
  ).toContain("Take today’s Journey with me");
  expect(share).toHaveBeenCalledTimes(1);
});
it("keeps the completion screen clear of invitations when the player has no friends", async () => {
  mocks.signedIn = true;
  fetcher.mockImplementation(async () => ({
    ok: true,
    json: async () => ({ date: attempt.date, friends: [], you: {} }),
  }));
  await renderSocial();
  expect(host.textContent).not.toContain("Play together");
  expect(host.textContent).not.toContain("Invite a friend");
});
