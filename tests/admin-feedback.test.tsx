// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { FeedbackReview } from "../src/app/FeedbackReview";
import { ToastProvider } from "../src/app/Toast";

vi.mock("../src/services/accounts", () => ({
  useAccount: () => ({
    admin: true,
    accessToken: async () => "admin-token",
  }),
}));

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

it("links feedback to its question and offers direct status actions", async () => {
  const journey = JOURNEY_INDEX[0];
  const questionId = "reported-question";
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "feedback-1",
              kind: "question",
              category: "unclear",
              message: "I could not tell what the clue meant.",
              status: "new",
              createdAt: `${Math.floor(Date.now() / 1000)}#0001`,
              context: {
                view: "journey",
                journeyId: journey.id,
                questionId,
              },
            },
          ],
        }),
      ),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true })));
  vi.stubGlobal("fetch", fetch);

  await act(async () =>
    root.render(
      <ToastProvider>
        <FeedbackReview />
      </ToastProvider>,
    ),
  );
  await vi.waitFor(() => {
    expect(host.textContent).toContain("I could not tell what the clue meant.");
  });

  expect(host.textContent).toContain(journey.title);
  expect(
    host.querySelector<HTMLAnchorElement>(".admin-feedback-journey a")?.href,
  ).toContain(`question=${questionId}`);
  expect(host.querySelector(".admin-feedback-status")?.textContent).toBe("new");

  await act(async () => {
    [...host.querySelectorAll("button")]
      .find((button) => button.textContent?.trim() === "Mark reviewed")!
      .click();
  });
  await vi.waitFor(() => {
    expect(host.querySelector(".admin-feedback-status")?.textContent).toBe(
      "reviewed",
    );
  });
  expect(fetch).toHaveBeenLastCalledWith(
    expect.stringContaining("/admin/feedback/feedback-1"),
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ status: "reviewed" }),
    }),
  );
});
