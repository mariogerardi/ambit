// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FeedbackDialog } from "../src/app/FeedbackDialog";
import { feedbackApi } from "../src/services/feedback";
import { SurfaceInspection } from "../src/globe/inspection";
import { StudyPanel } from "../src/study/StudyPanel";
import { defaultSettings, emptyStudy, startStudy } from "../src/study/engine";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("sends guest question context and preserves the report identity through a network retry", async () => {
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(new TypeError("offline"))
    .mockResolvedValueOnce(new Response(JSON.stringify({ saved: true })));
  vi.stubGlobal("fetch", fetch);
  await act(async () =>
    root.render(
      <FeedbackDialog
        request={{
          kind: "question",
          context: {
            view: "journey",
            questionId: "q1",
            journeyId: "j1",
            contentVersion: "v1",
          },
        }}
        onClose={() => {}}
      />,
    ),
  );
  async function send() {
    await act(async () =>
      document
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
  }
  const message = document.querySelector("textarea")!;
  expect(message.maxLength).toBe(500);
  expect(message.rows).toBe(6);
  expect(
    document.getElementById(message.getAttribute("aria-describedby")!)
      ?.textContent,
  ).toContain("0 / 500 characters");
  expect(
    document.querySelector(
      '.feedback-dialog button.primary-button span[aria-hidden="true"]',
    )?.textContent,
  ).toBe("→");
  await send();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain(
    "Check your connection",
  );
  await send();
  const first = JSON.parse(fetch.mock.calls[0][1].body),
    second = JSON.parse(fetch.mock.calls[1][1].body);
  expect(second).toEqual(first);
  expect(first.context).toMatchObject({
    view: "journey",
    questionId: "q1",
    device: "touch",
  });
  expect(first.context.release).toMatch(/^[a-f0-9]{40}$/);
  expect(fetch.mock.calls[0][0]).toMatch(/\/feedback$/);
  expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
    "your feedback was sent",
  );
});
it("explains expired credentials without exposing server response bodies", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("private backend details", { status: 401 }),
      ),
  );
  await expect(
    feedbackApi("/admin/feedback", "token", undefined, "GET"),
  ).rejects.toThrow("Please sign in again");
});
it("pauses Study auto-advance and Enter while a feedback dialog is open", async () => {
  vi.useFakeTimers();
  const save = {
    ...emptyStudy,
    session: startStudy({ ...defaultSettings, autoAdvance: true }),
  };
  save.session = {
    ...save.session!,
    phase: "feedback",
    history: [
      { prompt: save.session!.prompt, response: "answer", correct: true },
    ],
  };
  const action = vi.fn();
  await act(async () =>
    root.render(
      <StudyPanel
        paused
        save={save}
        setup={false}
        active
        webgl
        onSettings={() => {}}
        onStart={() => {}}
        onAction={action}
        onSetup={() => {}}
      />,
    ),
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
    dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  });
  expect(action).not.toHaveBeenCalled();
});
it("suppresses inspection after touch or camera movement until the mouse moves again", () => {
  const inspection = new SurfaceInspection();
  inspection.pointer("mouse");
  expect(inspection.allowed).toBe(true);
  inspection.clear();
  expect(inspection.allowed).toBe(false);
  inspection.pointer("touch");
  expect(inspection.allowed).toBe(false);
  inspection.pointer("pen");
  expect(inspection.allowed).toBe(false);
  inspection.pointer("mouse");
  expect(inspection.allowed).toBe(true);
});

it("times out slow requests with a retry message", async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    ),
  );
  const request = feedbackApi("/feedback", undefined, { message: "report" });
  const assertion = expect(request).rejects.toThrow("took too long");
  await vi.advanceTimersByTimeAsync(15000);
  await assertion;
});

it("reports safe HTTP and network diagnostics and ignores cancelled requests", async () => {
  const monitoring = await import("../src/services/monitoring");
  const report = vi.spyOn(monitoring, "reportFailure");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response("private response", { status: 429 })),
  );
  await expect(
    feedbackApi("/feedback?cursor=private-cursor", "private-token", {
      message: "private feedback",
    }),
  ).rejects.toThrow("several reports");
  expect(report).toHaveBeenLastCalledWith(
    "feedback request",
    expect.objectContaining({
      httpStatus: 429,
      errorType: "http",
      method: "POST",
      route: "/feedback",
      attemptCount: 1,
    }),
    expect.any(Error),
  );
  expect(JSON.stringify(report.mock.calls)).not.toContain("private");
  vi.mocked(fetch).mockRejectedValue(new TypeError("private error"));
  await expect(feedbackApi("/feedback")).rejects.toThrow("Couldn’t connect");
  expect(report).toHaveBeenLastCalledWith(
    "feedback request",
    expect.objectContaining({ httpStatus: 0, errorType: "network" }),
    undefined,
  );
  report.mockClear();
  const controller = new AbortController();
  controller.abort();
  await expect(
    feedbackApi("/feedback", undefined, undefined, "POST", controller.signal),
  ).rejects.toThrow();
  expect(report).not.toHaveBeenCalled();
  report.mockRestore();
});

it("keeps malformed response contents out of player-facing feedback errors", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("private invalid json")),
  );
  await expect(feedbackApi("/feedback")).rejects.toThrow(
    "Couldn’t complete the request",
  );
});
