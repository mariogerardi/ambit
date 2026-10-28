// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "../src/app/Toast";

let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
function Actions() {
  const { notify } = useToast();
  return (
    <>
      <button onClick={() => notify("Profile saved.")}>Save</button>
      <button
        onClick={() => notify("Couldn’t save the schedule.", { tone: "error" })}
      >
        Fail
      </button>
    </>
  );
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root.render(
      <ToastProvider>
        <Actions />
      </ToastProvider>,
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("announces success, survives a panel change and pauses dismissal while focused", async () => {
  await act(async () =>
    host.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(host.querySelector('[role="status"]')?.textContent).toBe(
    "Profile saved.",
  );
  await act(async () =>
    root.render(
      <ToastProvider>
        <button>Another panel</button>
      </ToastProvider>,
    ),
  );
  expect(host.querySelector('[role="status"]')?.textContent).toBe(
    "Profile saved.",
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>(".toast button")!.focus(),
  );
  await act(async () => vi.advanceTimersByTime(10000));
  expect(host.querySelector(".toast")).not.toBeNull();
  await act(async () =>
    host.querySelector<HTMLButtonElement>("button")!.focus(),
  );
  await act(async () => vi.advanceTimersByTime(6000));
  expect(host.querySelector(".toast")).toBeNull();
});
it("keeps failures visible until dismissed and does not repeat identical notices", async () => {
  const fail = host.querySelectorAll<HTMLButtonElement>("button")[1];
  await act(async () => {
    fail.click();
    fail.click();
  });
  expect(host.querySelectorAll(".toast")).toHaveLength(1);
  await act(async () => vi.advanceTimersByTime(60000));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn’t save",
  );
  await act(async () =>
    host.querySelector<HTMLButtonElement>(".toast button")!.click(),
  );
  expect(host.querySelector(".toast")).toBeNull();
});
