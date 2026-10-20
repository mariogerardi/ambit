// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminPanel } from "../src/app/AdminPanel";
import type { useJourneySchedule } from "../src/services/journeySchedule";
import { dailyJourney, emptyDaily, openDaily } from "../src/app/dailyProgress";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";

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
  localStorage.clear();
  sessionStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  schedule = {
    schedule: { today: "2026-10-11", records: {}, assignments: {} },
    ready: true,
    loadedMonths: [],
    error: "",
    busy: false,
    refresh: vi.fn(async () => {}),
    refreshAll: vi.fn(async () => {}),
    save: vi.fn(async (day: string, id: string | undefined) => {
      const assignments = { ...schedule.schedule!.assignments };
      const records = { ...schedule.schedule!.records };
      if (id) assignments[day] = id;
      else delete assignments[day];
      records[day] = {
        day,
        journeyId: id ?? null,
        source: id ? "assigned" : "provisional",
        revision: (records[day]?.revision ?? 0) + 1,
      };
      schedule = {
        ...schedule,
        schedule: { today: schedule.schedule!.today, records, assignments },
      };
      root.render(
        <AdminPanel date={schedule.schedule!.today} schedule={schedule} />,
      );
      return true;
    }),
  };
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
  await click("Choose a Journey");
  const button = host.querySelector<HTMLButtonElement>(
    `[data-journey-id="${id}"]`,
  )!;
  expect(button).not.toBeNull();
  await act(async () => button.click());
}

it("navigates full months and selects calendar dates, including leap day", async () => {
  await render();
  expect(host.querySelectorAll(".journey-calendar-day")).toHaveLength(35);
  const navigation = host.querySelector(".journey-month-navigation")!;
  expect([...navigation.children].map((element) => element.tagName)).toEqual([
    "BUTTON",
    "H3",
    "BUTTON",
  ]);
  expect(
    host.querySelector(".journey-month-heading > .scheduler-today")
      ?.textContent,
  ).toBe("Today");
  await click("Next month");
  expect(host.querySelector(".journey-month-heading h3")?.textContent).toBe(
    "November 2026",
  );
  expect(
    host.querySelector<HTMLInputElement>('input[type="date"]')?.value,
  ).toBe("2026-11-01");
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
it("blocks pre-opening dates, including stored history, typed dates and restored drafts", async () => {
  const earlier = "2026-10-10";
  schedule.schedule!.records[earlier] = {
    day: earlier,
    journeyId: "down-the-danube-v1",
    source: "assigned",
    revision: 1,
  };
  schedule.schedule!.assignments[earlier] = "down-the-danube-v1";
  sessionStorage.setItem(
    "ambit.admin.schedule-draft",
    JSON.stringify({ day: earlier, value: "down-the-danube-v1", saved: "" }),
  );
  await render(earlier);
  const input = host.querySelector<HTMLInputElement>('input[type="date"]')!;
  expect(input.min).toBe("2026-10-11");
  expect(input.value).toBe("2026-10-11");
  const cell = host.querySelector<HTMLButtonElement>(
    'button[aria-label="Sat, Oct 10"]',
  )!;
  expect(cell.disabled).toBe(true);
  expect(cell.querySelector("strong")?.textContent).toBe("");
  expect(cell.querySelector(".schedule-dot")).toBeNull();
  expect(
    host.querySelector<HTMLButtonElement>('button[aria-label="Previous month"]')
      ?.disabled,
  ).toBe(true);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, earlier);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    cell.click();
  });
  expect(input.value).toBe("2026-10-11");
  expect(host.querySelector(".scheduled-journey-preview.is-draft")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
  expect(schedule.schedule!.records[earlier].journeyId).toBe(
    "down-the-danube-v1",
  );
});

it("navigates all three tabs with the keyboard and keeps reset in Tools", async () => {
  await render();
  const tabs = host.querySelector('[role="tablist"]')!;
  const press = async (key: string) =>
    act(async () =>
      tabs.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })),
    );
  await press("End");
  expect(document.activeElement?.id).toBe("admin-tab-tools");
  expect(host.querySelector<HTMLElement>("#admin-tools")!.hidden).toBe(false);
  expect(
    host.querySelector("#admin-tools .admin-reset button")?.textContent,
  ).toContain("Clear my Journey attempt");
  await press("ArrowRight");
  expect(document.activeElement?.id).toBe("admin-tab-schedule");
  expect(host.querySelector<HTMLElement>("#admin-tools")!.hidden).toBe(true);
  await press("ArrowLeft");
  expect(document.activeElement?.id).toBe("admin-tab-tools");
});
it("keeps today editable after its automatic lock and confirms a past rewrite", async () => {
  schedule.schedule!.records["2026-10-11"] = {
    day: "2026-10-11",
    journeyId: "removed-edition",
    source: "auto",
    revision: 1,
  };
  schedule.schedule!.assignments["2026-10-11"] = "removed-edition";
  schedule.schedule!.records["2026-10-12"] = {
    day: "2026-10-12",
    journeyId: "beyond-the-maple-leaf-v1",
    source: "auto",
    revision: 2,
  };
  schedule.schedule!.assignments["2026-10-12"] = "beyond-the-maple-leaf-v1";
  schedule.schedule!.today = "2026-10-12";
  await render("2026-10-12");
  expect(
    host.querySelector<HTMLButtonElement>(".journey-picker-trigger")?.disabled,
  ).toBe(false);
  await click("Sun, Oct 11");
  expect(host.textContent).toContain("Journey unavailable");
  expect(
    host.querySelector<HTMLButtonElement>(".journey-picker-trigger")?.disabled,
  ).toBe(false);
  await select("across-the-divide-v1");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await click("Assign for Oct 11");
  expect(schedule.save).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await click("Assign for Oct 11");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-11",
    "across-the-divide-v1",
    "test-admin",
    true,
  );
  await click("Today");
  await select("across-the-divide-v1");
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(false);
  confirm.mockRestore();
});
it("previews a draft before publishing and can explicitly restore the automatic choice", async () => {
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
  expect(
    host.querySelector(".scheduled-journey-preview a")?.getAttribute("target"),
  ).toBe("_blank");
  expect(host.querySelector(".schedule-current")?.textContent).toContain(
    dailyJourney("2026-10-13").title,
  );
  expect(schedule.schedule?.assignments).toEqual({});
  await click("Assign for Oct 13");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-13",
    "down-the-danube-v1",
    "test-admin",
  );
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    "Published Down the Danube",
  );
  expect(host.querySelector(".scheduled-journey-preview.is-draft")).toBeNull();
  await click("Use automatic selection instead");
  expect(host.querySelector(".scheduled-journey-preview h4")?.textContent).toBe(
    dailyJourney("2026-10-13").title,
  );
  expect(schedule.schedule?.assignments).toEqual({
    "2026-10-13": "down-the-danube-v1",
  });
  await click("Restore automatic selection");
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
      today: "2026-10-11",
      records: {
        "2026-10-11": {
          day: "2026-10-11",
          journeyId: "along-the-andes-v1",
          source: "assigned",
          revision: 1,
        },
      },
      assignments: { "2026-10-11": "along-the-andes-v1" },
    },
  };
  await render();
  expect(host.querySelector(".scheduled-journey-preview h4")?.textContent).toBe(
    "Chasing the sun",
  );
  expect(host.querySelector(".schedule-current")?.textContent).toContain(
    "Along the Andes",
  );
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await click("Next month");
  expect(host.querySelector(".journey-month-heading h3")?.textContent).toBe(
    "October 2026",
  );
  await click("Mon, Oct 12");
  expect(
    host.querySelector<HTMLInputElement>('input[type="date"]')?.value,
  ).toBe("2026-10-11");
  expect(
    host.querySelector(".scheduled-journey-preview.is-draft"),
  ).not.toBeNull();
  confirm.mockReturnValue(true);
  await click("Mon, Oct 12");
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(true);
});

it("searches and filters the actionable picker, then assigns only after confirmation", async () => {
  await render();
  await click("Choose a Journey");
  expect(document.activeElement).toBe(
    host.querySelector('input[type="search"]'),
  );
  const filter = host.querySelectorAll<HTMLSelectElement>(
    ".journey-list-controls select",
  )[1];
  await act(async () => {
    filter.value = "unlisted";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    [...host.querySelectorAll<HTMLElement>("[data-journey-id]")]
      .map((el) => el.dataset.journeyId)
      .sort(),
  ).toEqual(
    JOURNEY_INDEX.filter((journey) => journey.availability === "unlisted")
      .map((journey) => journey.id)
      .sort(),
  );
  await act(async () => {
    filter.value = "all";
    filter.dispatchEvent(new Event("change", { bubbles: true }));
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "DANUBE");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(
    [...host.querySelectorAll<HTMLElement>("[data-journey-id]")].map(
      (el) => el.dataset.journeyId,
    ),
  ).toEqual(["down-the-danube-v1"]);
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>(
        '[data-journey-id="down-the-danube-v1"]',
      )!
      .click(),
  );
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(
    host.querySelector(".scheduled-journey-preview")?.textContent,
  ).toContain("Unpublished change");
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Choose a Journey");
  await act(async () =>
    host
      .querySelector(".journey-date-editor")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Close Journey picker");
  await click("Assign for Oct 11");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-11",
    "down-the-danube-v1",
    "test-admin",
  );
});

it("preserves a draft across Feedback and leaving Admin, and clears it on discard", async () => {
  await act(async () =>
    root.render(
      <AdminPanel
        date="2026-10-11"
        schedule={schedule}
        feedback={<p>Feedback inbox</p>}
      />,
    ),
  );
  await select("down-the-danube-v1");
  await click("Feedback");
  expect(host.querySelector<HTMLElement>("#admin-schedule")!.hidden).toBe(true);
  expect(host.querySelector<HTMLElement>("#admin-feedback")!.hidden).toBe(
    false,
  );
  expect(host.querySelector("#admin-feedback")?.textContent).toContain(
    "Feedback inbox",
  );
  await act(async () =>
    host
      .querySelector('[role="tablist"]')!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      ),
  );
  expect(host.querySelector<HTMLElement>("#admin-schedule")!.hidden).toBe(
    false,
  );
  expect(document.activeElement?.id).toBe("admin-tab-schedule");
  const leaving = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(leaving);
  expect(leaving.defaultPrevented).toBe(true);
  await act(async () => {
    root.unmount();
    root = createRoot(host);
  });
  await render();
  expect(
    host.querySelector(".scheduled-journey-preview.is-draft h4")?.textContent,
  ).toBe("Down the Danube");
  await click("Discard change");
  expect(host.querySelector(".scheduled-journey-preview.is-draft")).toBeNull();
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
});

it("closes the picker with Escape and brings the selected date into view on mobile", async () => {
  await render();
  await click("Choose a Journey");
  await act(async () =>
    host
      .querySelector('input[type="search"]')!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      ),
  );
  expect(host.querySelector('[role="dialog"]')).toBeNull();
  expect(document.activeElement).toBe(
    host.querySelector(".journey-picker-trigger"),
  );
  const heading = host.querySelector<HTMLHeadingElement>(
    ".journey-date-editor header h3",
  )!;
  heading.scrollIntoView = vi.fn();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  await click("Mon, Oct 12");
  expect(document.activeElement).toBe(heading);
  expect(heading.textContent).toContain("October 12");
  expect(heading.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
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
  expect(
    host.querySelector<HTMLButtonElement>(".journey-picker-trigger")?.disabled,
  ).toBe(true);
  await click("Refresh schedule");
  expect(schedule.refresh).toHaveBeenCalled();
  schedule = { ...schedule, ready: true, error: "" };
  await render();
  await select("chasing-the-sun-v2");
  token.mockResolvedValue(undefined);
  await click("Assign for Oct 11");
  expect(schedule.save).not.toHaveBeenCalled();
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    "Sign in again",
  );
  expect(host.querySelector(".scheduled-journey-preview h4")?.textContent).toBe(
    "Chasing the sun",
  );
});

it("clears an attempt only after confirmation and reports save failures", async () => {
  const attempt = openDaily(emptyDaily, "2026-10-11").attempts["2026-10-11"];
  const reset = vi.fn(() => true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const renderReset = async (ready: boolean) =>
    act(async () =>
      root.render(
        <AdminPanel
          date="2026-10-11"
          schedule={schedule}
          attempt={attempt}
          resetReady={ready}
          onResetAttempt={reset}
        />,
      ),
    );
  await renderReset(false);
  expect(host.querySelector<HTMLElement>("#admin-tools")!.hidden).toBe(true);
  await click("Tools");
  expect(host.querySelector<HTMLElement>("#admin-tools")!.hidden).toBe(false);
  await click("Clear my Journey attempt");
  expect(confirm).not.toHaveBeenCalled();
  await renderReset(true);
  await click("Clear my Journey attempt");
  expect(reset).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  await click("Clear my Journey attempt");
  expect(reset).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain("Attempt cleared. Start fresh from Home.");
  reset.mockReturnValue(false);
  await click("Clear my Journey attempt");
  expect(host.textContent).toContain("Couldn’t clear the attempt.");
  confirm.mockRestore();
});
