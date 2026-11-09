// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminPanel } from "../src/app/AdminPanel";
import type { useJourneySchedule } from "../src/services/journeySchedule";
import { dailyJourney, emptyDaily, openDaily } from "../src/app/dailyProgress";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { ToastProvider } from "../src/app/Toast";

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
    loadedMonths: ["2026-10"],
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

it("replaces a proposal and switches dates without a draft confirmation", async () => {
  await render();
  await select("down-the-danube-v1");
  await select("across-the-divide-v1");
  expect(host.querySelector("dialog.admin-confirmation[open]")).toBeNull();
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Across the Divide",
  );
  await click("Mon, Oct 12");
  expect(host.querySelector("dialog.admin-confirmation[open]")).toBeNull();
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 12");
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("preserves catalog controls across sections and explains a filtered selection", async () => {
  await render();
  await click("Journeys");
  await act(async () => {
    host
      .querySelector<HTMLButtonElement>(
        '[data-journey-id="down-the-danube-v1"]',
      )!
      .click();
    await vi.dynamicImportSettled();
  });
  const search = host.querySelector<HTMLInputElement>(
    'input[aria-label="Search Journeys"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search, "DANUBE");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const rotation = host.querySelector<HTMLSelectElement>(
    'select[aria-label="Filter by automatic rotation"]',
  )!;
  await act(async () => {
    rotation.value = "held";
    rotation.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const sort = host.querySelector<HTMLSelectElement>(
    'select[aria-label="Sort Journeys"]',
  )!;
  await act(async () => {
    sort.value = "never";
    sort.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    host.querySelector(".admin-filter-selection-note")?.textContent,
  ).toContain("This Journey is outside the current search or rotation filter.");

  await click("Schedule");
  await click("Journeys");
  expect(
    host.querySelector<HTMLInputElement>('input[aria-label="Search Journeys"]')
      ?.value,
  ).toBe("DANUBE");
  expect(
    host.querySelector<HTMLSelectElement>(
      'select[aria-label="Filter by automatic rotation"]',
    )?.value,
  ).toBe("held");
  expect(
    host.querySelector<HTMLSelectElement>('select[aria-label="Sort Journeys"]')
      ?.value,
  ).toBe("never");
  expect(host.querySelector(".admin-inspector-heading")?.textContent).toContain(
    "Down the Danube",
  );
  expect(host.querySelector(".admin-filter-selection-note")).not.toBeNull();
});
async function render(date = "2026-10-11") {
  await act(async () =>
    root.render(<AdminPanel date={date} schedule={schedule} />),
  );
}
async function click(label: string) {
  const scope =
    host.querySelector("dialog.admin-confirmation[open]") ??
    host.querySelector("dialog[open]") ??
    host;
  const button = [...scope.querySelectorAll<HTMLButtonElement>("button")].find(
    (item) =>
      item.getAttribute("aria-label") === label ||
      item.textContent?.trim().replace(/→$/, "").trim() === label,
  );
  expect(button, label).toBeDefined();
  await act(async () => button!.click());
}

async function select(id: string) {
  await click(
    host.querySelector(".journey-picker-trigger")!.getAttribute("aria-label")!,
  );
  const button = host.querySelector<HTMLButtonElement>(
    `[data-journey-id="${id}"]`,
  )!;
  expect(button).not.toBeNull();
  await act(async () => button.click());
}

it("navigates full months and selects calendar dates, including leap day", async () => {
  await render();
  await click("Month");
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
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 11");
  await click("Mon, Nov 9");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("November 9");
  expect(
    host
      .querySelector('.journey-calendar-day[aria-pressed="true"] time')
      ?.getAttribute("datetime"),
  ).toBe("2026-11-09");
  await click("Today");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 11");
});

it("selects leap day in the February 2028 calendar", async () => {
  await render("2028-02-29");
  await click("Month");
  expect(host.querySelector(".journey-month-heading h3")?.textContent).toBe(
    "February 2028",
  );
  await click("Tue, Feb 29");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("February 29");
  expect(
    host.querySelectorAll('.journey-calendar-day time[datetime="2028-02-29"]'),
  ).toHaveLength(1);
});
it("blocks pre-opening dates and ignores legacy schedule draft storage", async () => {
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
  await select("down-the-danube-v1");
  expect(host.querySelector('input[type="date"]')).toBeNull();
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 11");
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
    cell.click();
  });
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 11");
  expect(host.querySelector(".schedule-proposed")).not.toBeNull();
  await click("Discard change");
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
  expect(schedule.schedule!.records[earlier].journeyId).toBe(
    "down-the-danube-v1",
  );
});

it("provides four primary Admin sections with keyboard navigation", async () => {
  await render();
  const tabs = host.querySelector('[role="tablist"]')!;
  const press = async (key: string) =>
    act(async () =>
      tabs.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true })),
    );
  await press("End");
  expect(document.activeElement?.id).toBe("admin-tab-utilities");
  expect(host.querySelector<HTMLElement>("#admin-utilities")!.hidden).toBe(
    false,
  );
  expect(host.querySelectorAll('[role="tab"]')).toHaveLength(4);
  expect(host.querySelector(".admin-maintenance")).toBeNull();
  await press("ArrowRight");
  expect(document.activeElement?.id).toBe("admin-tab-schedule");
  expect(host.querySelector<HTMLElement>("#admin-feedback")!.hidden).toBe(true);
  await press("ArrowLeft");
  expect(document.activeElement?.id).toBe("admin-tab-utilities");
});
it("explains registration, date assignment, release, and rotation eligibility", async () => {
  await render();
  await click("Journeys");
  const held = host
    .querySelector('[data-journey-id="power-to-the-people-v1"]')
    ?.closest(".admin-library-row");
  expect(held?.textContent).toContain("Held out of daily rotation");
  await click("Utilities");
  expect(host.textContent).toContain("Deployment status isn’t available here");
  expect(
    host.querySelector('a[href*="HOSTING.md#journey-catalog-activation"]'),
  ).not.toBeNull();
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
  await click("Publish for Oct 11");
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Keep working");
  await click("Publish for Oct 11");
  await click("Rewrite Archive day");
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
});
it("previews a draft before publishing and can explicitly restore the automatic choice", async () => {
  await render();
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(true);
  await click("Tue, Oct 13");
  await select("down-the-danube-v1");
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
  expect(host.querySelector(".schedule-proposed a")?.getAttribute("href")).toBe(
    "/journey/down-the-danube?review=1&date=2026-10-13",
  );
  expect(
    host.querySelector(".schedule-proposed a")?.getAttribute("target"),
  ).toBeNull();
  expect(host.querySelector(".schedule-current")?.textContent).toContain(
    dailyJourney("2026-10-13").title,
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
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  await click("Change Journey");
  await click("Restore automatic rotation");
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
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

it("does not treat an arriving assignment as an unpublished edit", async () => {
  schedule = { ...schedule, schedule: undefined, ready: false };
  await render();
  const listen = vi.spyOn(window, "addEventListener");
  schedule = {
    ...schedule,
    ready: true,
    schedule: {
      today: "2026-10-11",
      assignments: { "2026-10-11": "down-the-danube-v1" },
      records: {
        "2026-10-11": {
          day: "2026-10-11",
          journeyId: "down-the-danube-v1",
          source: "assigned",
          revision: 1,
        },
      },
    },
  };
  await render();
  expect(host.querySelector(".schedule-current h4")?.textContent).toBe(
    "Down the Danube",
  );
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(listen.mock.calls.some(([event]) => event === "beforeunload")).toBe(
    false,
  );
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
});

it("keeps proposals in memory only without a leave-page warning", async () => {
  const listen = vi.spyOn(window, "addEventListener");
  await render();
  await select("down-the-danube-v1");
  expect(host.querySelector(".schedule-proposed")).not.toBeNull();
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
  expect(listen.mock.calls.some(([event]) => event === "beforeunload")).toBe(
    false,
  );
  await act(async () => {
    root.unmount();
    root = createRoot(host);
  });
  await render();
  expect(host.querySelector(".schedule-proposed")).toBeNull();
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
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Chasing the Sun",
  );
  expect(host.querySelector(".schedule-current")?.textContent).toContain(
    "Along the Andes",
  );
  await click("Mon, Oct 12");
  expect(host.querySelector("dialog.admin-confirmation[open]")).toBeNull();
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 12");
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(
    host.querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled,
  ).toBe(true);
});

it("searches every registered Journey and publishes only on explicit action", async () => {
  await render();
  await click("Change Journey");
  expect(document.activeElement).toBe(
    host.querySelector('input[type="search"]'),
  );
  expect(
    [...host.querySelectorAll<HTMLElement>("[data-journey-id]")]
      .map((el) => el.dataset.journeyId)
      .sort(),
  ).toEqual(JOURNEY_INDEX.map((journey) => journey.id).sort());
  expect(host.textContent).not.toContain("Show Journeys");
  await act(async () => {
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
  expect(host.querySelector(".schedule-proposed")?.textContent).toContain(
    "Proposed assignment",
  );
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Change Journey");
  await act(async () =>
    host
      .querySelector(".journey-date-editor")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Close Journey picker");
  await click("Publish for Oct 11");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-11",
    "down-the-danube-v1",
    "test-admin",
  );
});

it("keeps a proposal across Admin sections but not after unmounting", async () => {
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
        new KeyboardEvent("keydown", { key: "Home", bubbles: true }),
      ),
  );
  expect(host.querySelector<HTMLElement>("#admin-schedule")!.hidden).toBe(
    false,
  );
  expect(document.activeElement?.id).toBe("admin-tab-schedule");
  const leaving = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(leaving);
  expect(leaving.defaultPrevented).toBe(false);
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
  await act(async () => {
    root.unmount();
    root = createRoot(host);
  });
  await render();
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
});

it("inspects questions without editing, then stages the Journey for publication", async () => {
  schedule = { ...schedule, loadedMonths: ["2026-10"] };
  await render();
  await click("Journeys");
  const button = [
    ...host.querySelectorAll<HTMLButtonElement>(".admin-library-list button"),
  ].find(
    (item) => item.querySelector("strong")?.textContent === "Down the Danube",
  )!;
  await act(async () => {
    button.click();
    await vi.dynamicImportSettled();
  });
  expect(host.querySelectorAll(".admin-inspector-outline ol li")).toHaveLength(
    5,
  );
  expect(
    host.querySelector(".admin-inspector-actions a")?.getAttribute("href"),
  ).toBe("/journey/down-the-danube?review=1&date=2026-10-11");
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
  const leaving = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(leaving);
  expect(leaving.defaultPrevented).toBe(false);
  await click("Schedule this Journey");
  expect(
    host.querySelector('[aria-label="Schedule reviewed Journey"]'),
  ).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Publish for Oct 11");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-11",
    "down-the-danube-v1",
    "test-admin",
  );
});

it("opens a reviewed Journey directly as an unpublished proposal without publishing it", async () => {
  await act(async () =>
    root.render(
      <AdminPanel
        date="2026-10-11"
        schedule={schedule}
        section="schedule"
        initialJourneyId="down-the-danube-v1"
      />,
    ),
  );
  expect(
    host.querySelector('[aria-label="Schedule reviewed Journey"]'),
  ).toBeNull();
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
});

it("keeps a failed assignment unpublished and announces the failure", async () => {
  schedule.save = vi.fn(async () => false);
  await act(async () =>
    root.render(
      <ToastProvider>
        <AdminPanel date="2026-10-11" schedule={schedule} />
      </ToastProvider>,
    ),
  );
  await select("down-the-danube-v1");
  await click("Publish for Oct 11");
  expect(host.querySelector('.toast [role="alert"]')?.textContent).toContain(
    "Couldn’t save the schedule",
  );
  expect(host.querySelector(".schedule-proposed")).not.toBeNull();
  expect(sessionStorage.getItem("ambit.admin.schedule-draft")).toBeNull();
});

it("closes the picker with Escape and brings the selected date into view on mobile", async () => {
  await render();
  await click("Change Journey");
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
it("blocks publication when the schedule is unavailable and preserves an unpublished choice after sign-in expiry", async () => {
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
  expect(schedule.refreshAll).toHaveBeenCalled();
  schedule = { ...schedule, ready: true, error: "" };
  await render();
  await select("chasing-the-sun-v2");
  token.mockResolvedValue(undefined);
  await click("Publish for Oct 11");
  expect(schedule.save).not.toHaveBeenCalled();
  expect(host.querySelector('[role="status"]')?.textContent).toContain(
    "Sign in again",
  );
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Chasing the Sun",
  );
});

it("clears an attempt only after confirmation and reports save failures", async () => {
  const attempt = openDaily(emptyDaily, "2026-10-11").attempts["2026-10-11"];
  const reset = vi.fn(() => true);
  const renderReset = async (ready: boolean) =>
    act(async () =>
      root.render(
        <ToastProvider>
          <AdminPanel
            date="2026-10-11"
            schedule={schedule}
            section="utilities"
            attempt={attempt}
            resetReady={ready}
            onResetAttempt={reset}
          />
        </ToastProvider>,
      ),
    );
  await renderReset(false);
  expect(
    host.querySelector<HTMLButtonElement>(".admin-utility button")?.disabled,
  ).toBe(true);
  expect(host.querySelector("dialog.admin-confirmation[open]")).toBeNull();
  await renderReset(true);
  await act(async () => {
    const trigger = host.querySelector<HTMLButtonElement>(
      ".admin-utility button",
    )!;
    trigger.focus();
    trigger.click();
  });
  expect(host.querySelector("dialog.admin-confirmation[open]")).not.toBeNull();
  expect(reset).not.toHaveBeenCalled();
  expect(document.activeElement?.textContent?.trim()).toBe("Keep working");
  await click("Keep working");
  expect(document.activeElement).toBe(
    host.querySelector(".admin-utility button"),
  );
  await click("Clear today’s attempt");
  await click("Reset my attempt");
  expect(reset).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain("Attempt cleared. Start fresh from Home.");
  reset.mockReturnValue(false);
  await click("Clear today’s attempt");
  await click("Reset my attempt");
  expect(host.textContent).toContain("Couldn’t clear the attempt.");
});

it("browses months and returns to the selected date without moving its proposal", async () => {
  await render();
  await select("down-the-danube-v1");
  await click("Month");
  await click("Next month");
  expect(
    host.querySelector(".admin-calendar-selection-note")?.textContent,
  ).toContain("Sun, Oct 11");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 11");
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
  await click("Return to selected date");
  expect(host.querySelector(".journey-month-heading h3")?.textContent).toBe(
    "October 2026",
  );
  expect(host.querySelector(".admin-calendar-selection-note")).toBeNull();
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
  expect(schedule.save).not.toHaveBeenCalled();
  await click("Publish for Oct 11");
  expect(schedule.save).toHaveBeenCalledWith(
    "2026-10-11",
    "down-the-danube-v1",
    "test-admin",
  );
});

it("keeps the selected date and proposal while browsing weeks", async () => {
  await render();
  expect(host.querySelectorAll(".admin-agenda li")).toHaveLength(7);
  await select("down-the-danube-v1");
  await click("Next week");
  expect(
    host.querySelector(".admin-agenda-selection-note")?.textContent,
  ).toContain("The selected date, Sun, Oct 11, is outside this week.");
  expect(
    host.querySelector(".admin-agenda time")?.getAttribute("datetime"),
  ).toBe("2026-10-18");
  expect(
    host.querySelector(".schedule-assignment-heading h3")?.textContent,
  ).toContain("October 11");
  expect(host.querySelector(".schedule-proposed h4")?.textContent).toBe(
    "Down the Danube",
  );
  await click("Previous week");
  expect(host.querySelector(".admin-agenda-selection-note")).toBeNull();
  expect(
    host.querySelector(".admin-agenda time")?.getAttribute("datetime"),
  ).toBe("2026-10-11");
  await click("Today");
  await click("Discard change");
  expect(host.querySelector(".schedule-proposed")).toBeNull();
  expect(schedule.save).not.toHaveBeenCalled();
});

it("distinguishes a planned automatic assignment from a published one", async () => {
  await render();
  expect(
    host.querySelector(".schedule-publication-status")?.textContent,
  ).toContain("Planned");
  schedule.schedule!.records["2026-10-11"] = {
    day: "2026-10-11",
    journeyId: "down-the-danube-v1",
    source: "auto",
    revision: 1,
  };
  await render();
  expect(
    host.querySelector(".schedule-publication-status")?.textContent,
  ).toContain("Published · Automatic");
  await select("across-the-divide-v1");
  expect(host.querySelector(".schedule-publication-status")?.textContent).toBe(
    "Published · Automatic",
  );
  expect(host.querySelector(".schedule-proposed")?.textContent).toContain(
    "Proposed assignment · Not published",
  );
  expect(
    host.querySelector('.admin-agenda button[aria-pressed="true"]')
      ?.textContent,
  ).toContain("Change proposed");
  expect(schedule.save).not.toHaveBeenCalled();
});
