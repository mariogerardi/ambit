// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminPanel } from "../src/app/AdminPanel";
import type { useJourneySchedule } from "../src/services/journeySchedule";

const token = vi.hoisted(() =>
  vi.fn(async (): Promise<string | undefined> => "test-admin"),
);
vi.mock("../src/services/accounts", () => ({
  useAccount: () => ({ accessToken: token }),
}));
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
let schedule: ReturnType<typeof useJourneySchedule>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  token.mockResolvedValue("test-admin");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  schedule = {
    schedule: { revision: 0, assignments: {} },
    ready: true,
    error: "",
    busy: false,
    refresh: vi.fn(async () => {}),
    save: vi.fn(async (day: string, id: string | undefined) => {
      const assignments = { ...schedule.schedule!.assignments };
      if (id) assignments[day] = id;
      else delete assignments[day];
      schedule = {
        ...schedule,
        schedule: { revision: schedule.schedule!.revision + 1, assignments },
      };
      root.render(<AdminPanel date="2026-10-11" schedule={schedule} />);
      return true;
    }),
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function render(date = "2026-10-11") {
  await act(async () =>
    root.render(<AdminPanel date={date} schedule={schedule} />),
  );
}
async function click(label: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) =>
      item.getAttribute("aria-label") === label ||
      item.textContent?.trim().replace(/→$/, "").trim() === label,
  );
  expect(button, label).toBeDefined();
  await act(async () => button!.click());
}
async function select(id: string) {
  await act(async () => {
    const input = host.querySelector("select")!;
    input.value = id;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it("navigates full months and selects calendar dates, including leap day", async () => {
  await render();
  expect(host.querySelectorAll(".journey-calendar-day")).toHaveLength(35);
  await click("Next month");
  expect(host.querySelector(".journey-month-heading h3")?.textContent).toBe(
    "November 2026",
  );
  await click("Mon, Nov 9");
  expect(host.querySelector("input")?.value).toBe("2026-11-09");
  expect(
    host
      .querySelector('.journey-calendar-day[aria-pressed="true"] time')
      ?.getAttribute("datetime"),
  ).toBe("2026-11-09");
  await click("Today");
  expect(host.querySelector("input")?.value).toBe("2026-10-11");
  await act(async () => {
    const input = host.querySelector("input")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "2028-02-29");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(host.querySelector(".journey-month-heading h3")?.textContent).toBe(
    "February 2028",
  );
  expect(
    host.querySelectorAll('.journey-calendar-day time[datetime="2028-02-29"]'),
  ).toHaveLength(1);
});
it("previews a draft before publishing and can explicitly restore automatic rotation", async () => {
  await render();
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(true);
  await click("Tue, Oct 13");
  await select("down-the-danube-v1");
  expect(host.querySelector(".scheduled-journey-preview h4")?.textContent).toBe(
    "Down the Danube",
  );
  expect(
    host.querySelector(".scheduled-journey-preview a")?.getAttribute("href"),
  ).toBe("/journey/down-the-danube");
  expect(host.querySelector(".schedule-current")?.textContent).toContain(
    "Around the Ring of Fire",
  );
  expect(schedule.schedule?.assignments).toEqual({});
  await click("Publish for Oct 13");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-13",
    "down-the-danube-v1",
    "test-admin",
  );
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    "Published Down the Danube",
  );
  expect(host.querySelector(".scheduled-journey-preview.is-draft")).toBeNull();
  await click("Use automatic rotation instead");
  expect(host.querySelector(".scheduled-journey-preview h4")?.textContent).toBe(
    "Around the Ring of Fire",
  );
  expect(schedule.schedule?.assignments).toEqual({
    "2026-10-13": "down-the-danube-v1",
  });
  await click("Restore automatic rotation");
  expect(schedule.save).toHaveBeenLastCalledWith(
    "2026-10-13",
    undefined,
    "test-admin",
  );
  expect(schedule.schedule?.assignments).toEqual({});
});
it("keeps an unsaved selection when a refreshed schedule changes in another session", async () => {
  schedule.schedule!.assignments["2026-10-11"] = "mediterranean-v1";
  await render();
  await select("chasing-the-sun-v2");
  schedule = {
    ...schedule,
    schedule: {
      revision: 1,
      assignments: { "2026-10-11": "along-the-andes-v1" },
    },
  };
  await render();
  expect(host.querySelector("select")?.value).toBe("chasing-the-sun-v2");
  expect(host.querySelector(".schedule-current")?.textContent).toContain(
    "Along the Andes",
  );
  await click("Mon, Oct 12");
  expect(host.querySelector("select")?.value).toBe("");
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(true);
});
it("blocks publication when the schedule is unavailable and preserves a draft after sign-in expiry", async () => {
  schedule = {
    ...schedule,
    ready: false,
    error: "Couldn’t load the schedule.",
  };
  await render();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Couldn’t load",
  );
  expect(host.querySelector<HTMLSelectElement>("select")?.disabled).toBe(true);
  await click("Refresh schedule");
  expect(schedule.refresh).toHaveBeenCalled();
  schedule = { ...schedule, ready: true, error: "" };
  await render();
  await select("chasing-the-sun-v2");
  token.mockResolvedValue(undefined);
  await click("Publish for Oct 11");
  expect(schedule.save).not.toHaveBeenCalled();
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    "Sign in again",
  );
  expect(host.querySelector("select")?.value).toBe("chasing-the-sun-v2");
});
