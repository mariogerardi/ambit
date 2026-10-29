// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudySetup } from "../src/study/StudySetup";
import { STUDY_PATHS } from "../src/study/paths";
import { StudyPacks } from "../src/study/StudyPacks";
import { StudyReview } from "../src/study/StudyReview";
import { StudyHistory } from "../src/study/StudyHistory";
import { StudyWorkspace } from "../src/study/StudyNavigation";
import type { StudyView } from "../src/study/StudyNavigation";
import {
  defaultSettings,
  startStudy,
  studyReducer,
  studyPool,
  validStudy,
} from "../src/study/engine";
import { continentCountryIds } from "../src/study/areas";
import { sessionArea } from "../src/study/sessionDescription";
import type { StudySettings } from "../src/study/engine";

let host: HTMLDivElement, root: Root, current: StudySettings;
const start = vi.fn<(settings: StudySettings) => void>();
const preview = vi.fn<(settings?: StudySettings) => void>();
function Harness({
  initial,
  initialView = "custom",
}: {
  initial: StudySettings;
  initialView?: StudyView;
}) {
  const [settings, setSettings] = useState(initial);
  const [view, setView] = useState(initialView);
  current = settings;
  return (
    <StudyWorkspace view={view} onNavigate={setView}>
      {view === "practice" ? (
        <StudyPacks
          onPreview={preview}
          onStart={start}
          onBuild={(value) => {
            setSettings(value);
            setView("custom");
          }}
        />
      ) : (
        <StudySetup
          settings={settings}
          onSettings={setSettings}
          onStart={start}
          onPreview={preview}
        />
      )}
    </StudyWorkspace>
  );
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  start.mockClear();
  preview.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function mount(initial = defaultSettings, editor = true) {
  await act(async () =>
    root.render(
      <Harness
        initial={initial}
        initialView={editor ? "custom" : "practice"}
      />,
    ),
  );
}
async function click(name: string) {
  if (name.startsWith("Preview ")) {
    const title = name.slice(8);
    for (
      let i = 0;
      i < STUDY_PATHS.length &&
      host.querySelector("#study-pack-title")?.textContent !== title;
      i++
    )
      await click("Next study pack");
    expect(host.querySelector("#study-pack-title")?.textContent).toBe(title);
    return;
  }
  const scope = document.querySelector('[role="dialog"]') ?? host;
  const buttons = [...scope.querySelectorAll<HTMLButtonElement>("button, a")];
  const button =
    buttons.find(
      (value) =>
        value.textContent?.trim() === name ||
        value.getAttribute("aria-label") === name,
    ) ?? buttons.find((value) => value.textContent?.trim().startsWith(name))!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
function select(name: string) {
  const labelled = [...host.querySelectorAll<HTMLLabelElement>("label")].find(
    (label) => label.textContent?.trim() === name,
  );
  return (labelled?.control ??
    host.querySelector(`select[aria-label="${name}"]`)) as HTMLSelectElement;
}
async function change(name: string, value: string) {
  const control = select(name);
  expect(control).not.toBeNull();
  await act(async () => {
    control.value = value;
    control.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function openAdvanced() {
  await act(async () =>
    host.querySelector<HTMLElement>(".study-advanced > summary")!.click(),
  );
}
const summary = () =>
  host.querySelector(".study-session-description")!.textContent!;

describe("Study Session configuration", () => {
  it("allows every builder tray to close without changing the configuration", async () => {
    await mount();
    const sections = [
      ...host.querySelectorAll<HTMLDetailsElement>(".study-builder-section"),
    ];
    await act(async () =>
      sections[0].querySelector<HTMLElement>("summary")!.click(),
    );
    expect(sections.every((section) => !section.open)).toBe(true);
    await act(async () =>
      sections[1].querySelector<HTMLElement>("summary")!.click(),
    );
    expect(sections[1].open).toBe(true);
    await act(async () =>
      sections[1].querySelector<HTMLElement>("summary")!.click(),
    );
    expect(sections.every((section) => !section.open)).toBe(true);
    expect(current).toEqual(defaultSettings);
  });
  it("combines continents using persisted country IDs and restores their selection", async () => {
    await mount({ ...defaultSettings, scope: "continent", continent: "AS" });
    await change("Area", "multiple");
    const africa = [
      ...host.querySelectorAll<HTMLLabelElement>(
        ".study-continent-picks label",
      ),
    ]
      .find((label) => label.textContent?.trim() === "Africa")!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => africa.click());
    const ids = continentCountryIds(["AF", "AS"]);
    expect(current.scope).toBe("custom");
    expect(current.countryIds).toEqual(ids);
    expect(studyPool(current)).toEqual(ids);
    expect(preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ countryIds: ids }),
    );
    const session = startStudy(current, 42);
    expect(sessionArea(session)).toBe("Africa · Asia");
    const restored = JSON.parse(
      JSON.stringify({ version: 1, settings: current, session }),
    );
    expect(validStudy(restored)).toBe(true);
    await act(async () =>
      root.render(<Harness key="restored" initial={restored.settings} />),
    );
    expect(select("Area").value).toBe("multiple");
    expect(
      [
        ...host.querySelectorAll<HTMLInputElement>(
          ".study-continent-picks input",
        ),
      ].filter((input) => input.checked),
    ).toHaveLength(2);
    await change("Area", "custom");
    expect(host.querySelector(".study-country-picker")).not.toBeNull();
    expect(current.countryIds).toEqual(ids);
  });
  it("summarizes changed advanced options and resets only those options", async () => {
    const initial: StudySettings = {
      ...defaultSettings,
      scope: "continent",
      continent: "AS",
      topics: ["countries", "flags"],
      length: 50,
      perTopicMethods: true,
      styles: { countries: "pin", capitals: "map", flags: "typing" },
    };
    await mount(initial);
    const heading = () =>
      host.querySelector(".study-advanced .study-section-summary")!.textContent;
    expect(heading()).toBe("Default");
    await openAdvanced();
    for (const name of ["Country names", "Revisit missed questions"]) {
      const input = [
        ...host.querySelectorAll<HTMLLabelElement>(".study-advanced label"),
      ]
        .find((label) => label.textContent?.trim() === name)!
        .querySelector<HTMLInputElement>("input")!;
      await act(async () => input.click());
    }
    expect(heading()).toContain("Country names");
    expect(heading()).toContain("Revisit missed questions");
    expect(
      host.querySelectorAll(".study-advanced-summary > span"),
    ).toHaveLength(2);
    await click("Reset advanced options");
    expect(heading()).toBe("Default");
    expect(current).toEqual({
      ...initial,
      revisitMissed: false,
      capitalDistractors: "study",
      choiceCount: 6,
    });
  });
  it("opens one builder section at a time without advancing on selections or losing settings", async () => {
    await mount();
    const sections = [
      ...host.querySelectorAll<HTMLDetailsElement>(".study-builder-section"),
    ];
    expect(sections).toHaveLength(5);
    expect(sections.filter((section) => section.open)).toHaveLength(1);
    await click("Capitals");
    expect(sections[0].open).toBe(true);
    await act(async () =>
      sections[1].querySelector<HTMLElement>("summary")!.click(),
    );
    await change("Area", "AS");
    expect(sections.filter((section) => section.open)).toEqual([sections[1]]);
    await act(async () =>
      sections[2].querySelector<HTMLElement>("summary")!.click(),
    );
    expect(sections[2].open).toBe(true);
    expect(current.continent).toBe("AS");
    expect(current.topics).toEqual(["countries", "capitals"]);
    await openAdvanced();
    expect(sections.filter((section) => section.open)).toEqual([sections[4]]);
  });
  it("offers pin placement as a normal Study answer method", async () => {
    await mount();
    await change("Answer method", "pin");
    expect(summary()).toContain("Place a pin");
    await click("Start session");
    const settings = start.mock.calls[0][0];
    expect(settings.styles.countries).toBe("pin");
    expect(startStudy(settings, 42).prompt.style).toBe("pin");
  });
  it("uses the checkbox alone to switch between shared and individual methods, even when methods match", async () => {
    await mount();
    await click("Capitals");
    const toggle = host.querySelector<HTMLInputElement>(
      ".study-method-toggle input",
    )!;
    expect(toggle.checked).toBe(false);
    await act(async () => toggle.click());
    expect(current.perTopicMethods).toBe(true);
    expect(select("Answer method")).toBeNull();
    expect(select("Countries answer method").value).toBe("map");
    await change("Countries answer method", "mixed");
    await change("Capitals answer method", "mixed");
    expect(toggle.checked).toBe(true);
    expect(summary()).toContain("Per-topic methods");
    expect(host.textContent).not.toContain("Mixed methods");
    expect(host.querySelector(".study-method-help")).toBeNull();
    await act(async () => toggle.click());
    expect(select("Answer method").value).toBe("mixed");
    expect(current.styles.capitals).toBe("mixed");
    expect(summary()).toContain(" · Mixed · ");
  });
  it("disables per-topic methods for one topic without losing the saved methods when topics return", async () => {
    await mount({
      ...defaultSettings,
      topics: ["countries", "capitals"],
      perTopicMethods: true,
    });
    const toggle = host.querySelector<HTMLInputElement>(
      ".study-method-toggle input",
    )!;
    expect(toggle.disabled).toBe(false);
    await click("Capitals");
    expect(toggle.disabled).toBe(true);
    expect(toggle.checked).toBe(false);
    expect(current.perTopicMethods).toBe(true);
    expect(select("Answer method").value).toBe("map");
    expect(select("Capitals answer method")).toBeNull();
    await click("Capitals");
    expect(toggle.disabled).toBe(false);
    expect(select("Capitals answer method").value).toBe("typing");
  });
  it("opens historical results separately from starting that exercise again", async () => {
    const session = startStudy(
      {
        ...defaultSettings,
        topics: ["countries", "flags"],
      },
      42,
    );
    const record = { id: "past-session", finishedAt: 2000, session };
    const view = vi.fn();
    await act(async () =>
      root.render(
        <StudyHistory records={[record]} onView={view} onStart={start} />,
      ),
    );
    expect(
      host.querySelector(".study-history-description strong")?.textContent,
    ).toBe("Mixed topics · Worldwide");
    await act(async () =>
      host.querySelector<HTMLButtonElement>(".study-history-view")!.click(),
    );
    expect(view).toHaveBeenCalledExactlyOnceWith(record);
    expect(start).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain("Again");
    expect(start).not.toHaveBeenCalled();
    expect(view).toHaveBeenCalledTimes(1);
  });
  it("cycles one pack at a time in both directions and wraps without starting a session", async () => {
    await mount(defaultSettings, false);
    expect(host.querySelector("#study-pack-title")?.textContent).toBe(
      "Discover Asia",
    );
    await click("Previous study pack");
    expect(host.querySelector("#study-pack-title")?.textContent).toBe(
      STUDY_PATHS.at(-1)!.title,
    );
    expect(preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ topics: STUDY_PATHS.at(-1)!.settings.topics }),
    );
    await click("Next study pack");
    expect(host.querySelector("#study-pack-title")?.textContent).toBe(
      "Discover Asia",
    );
    expect(host.querySelectorAll(".study-pack-experience")).toHaveLength(1);
    expect(start).not.toHaveBeenCalled();
  });
  it("mentions missed-answer repeats only when revisits are enabled", async () => {
    await mount({ ...defaultSettings, length: "all" });
    expect(select("Session length").getAttribute("aria-describedby")).toBe(
      host.querySelector(".study-coverage-note")?.id,
    );
    expect(
      host.querySelector(".study-coverage-note")?.closest(".study-advanced"),
    ).toBeNull();
    expect(host.textContent).not.toContain("Missed answers can repeat");
    await openAdvanced();
    const checkbox = [...host.querySelectorAll<HTMLLabelElement>("label")]
      .find(
        (label) => label.textContent?.trim() === "Revisit missed questions",
      )!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => checkbox.click());
    expect(host.textContent).toContain(
      "Missed answers can repeat during the session.",
    );
    await act(async () => checkbox.click());
    expect(host.textContent).not.toContain("Missed answers can repeat");
  });
  it("offers four Review lengths, defaults to ten and previews only the next ten locations", async () => {
    let session = startStudy({ ...defaultSettings, autoAdvance: false }, 42);
    session = studyReducer(session, {
      type: "pick",
      id: session.pool.find((id) => id !== session.prompt.targetId)!,
    });
    session = studyReducer(session, { type: "finish" });
    const begin = vi.fn(),
      globePreview = vi.fn();
    await act(async () =>
      root.render(
        <StudyReview
          save={{
            version: 1,
            settings: defaultSettings,
            history: [{ id: "past", finishedAt: Date.now(), session }],
          }}
          onStart={begin}
          onPreview={globePreview}
        />,
      ),
    );
    const control = host.querySelector<HTMLSelectElement>(
      ".study-review-length select",
    )!;
    expect(control.value).toBe("10");
    expect([...control.options].map((option) => option.value)).toEqual([
      "10",
      "20",
      "50",
      "100",
    ]);
    expect(host.textContent).not.toContain("What’s in this review");
    await act(async () => {
      control.value = "100";
      control.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await click("Start review");
    expect(begin.mock.calls[0][1]).toBe(100);
    expect(globePreview.mock.calls.at(-1)?.[2].length).toBeLessThanOrEqual(10);
  });
  it("shows the current session above past sessions without empty progress counts", async () => {
    const resume = vi.fn();
    let session = startStudy(
      {
        ...defaultSettings,
        topics: ["countries", "capitals", "flags"],
        scope: "continent",
        continent: "AF",
        length: 10,
        styles: { countries: "map", capitals: "map", flags: "map" },
      },
      42,
    );
    for (let i = 0; i < 6; i++) {
      session = studyReducer(session, {
        type: "pick",
        id:
          i === 0
            ? session.pool.find((id) => id !== session.prompt.targetId)!
            : session.prompt.targetId,
      });
      if (i < 5) session = studyReducer(session, { type: "next" });
    }
    await act(async () =>
      root.render(
        <StudyHistory
          records={[]}
          session={session}
          onView={() => {}}
          onStart={start}
          onResume={resume}
        />,
      ),
    );
    const continuation = host.querySelector(".study-current-card")!;
    expect(continuation.previousElementSibling?.tagName).toBe("H1");
    expect(continuation.querySelector("h2")?.textContent).toBe("Africa");
    expect(continuation.textContent).toContain("Countries · Capitals · Flags");
    expect(
      continuation.querySelector(".study-current-stats")?.textContent,
    ).toContain("6 of 10 answered");
    expect(
      continuation.querySelector(".study-current-stats")?.textContent,
    ).toContain("5 correct so far");
    const progress = continuation.querySelector("progress")!;
    expect(progress.value).toBe(6);
    expect(progress.max).toBe(10);
    expect(host.querySelector(".study-history-list")).not.toBeNull();
    await click("Resume session");
    expect(resume).toHaveBeenCalledOnce();
  });
  it.each(["all", "continuous"] as const)(
    "shows meaningful progress for %s sessions",
    async (length) => {
      let session = startStudy(
        {
          ...defaultSettings,
          scope: "custom",
          countryIds: ["wurl:CAN", "wurl:BRA"],
          topics: ["countries"],
          length,
        },
        42,
      );
      session = studyReducer(session, {
        type: "pick",
        id: session.prompt.targetId,
      });
      // Repeat answers count toward totals, but not twice toward complete-pass coverage.
      session = {
        ...session,
        history: [...session.history, ...session.history],
      };
      await act(async () =>
        root.render(
          <StudyHistory
            records={[]}
            session={session}
            onView={() => {}}
            onStart={start}
          />,
        ),
      );
      const progress = host.querySelector("progress");
      if (length === "all") {
        expect(progress?.value).toBe(1);
        expect(progress?.max).toBe(2);
        expect(
          host.querySelector(".study-current-stats")?.textContent,
        ).toContain("1 of 2 covered");
      } else {
        expect(progress).toBeNull();
        expect(
          host.querySelector(".study-current-stats")?.textContent,
        ).toContain("2 answered");
      }
    },
  );
  it("routes each empty-state destination without starting a session", async () => {
    const packs = vi.fn(),
      build = vi.fn(),
      review = vi.fn();
    await act(async () =>
      root.render(
        <StudyHistory
          records={[]}
          onView={() => {}}
          onStart={start}
          onPacks={packs}
          onBuild={build}
          onReview={review}
        />,
      ),
    );
    await click("Browse Study Packs");
    await click("Build a session");
    await click("Go to Review");
    expect(packs).toHaveBeenCalledOnce();
    expect(build).toHaveBeenCalledOnce();
    expect(review).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });
  it("keeps the builder's area and hint preview connected to the same controls", async () => {
    await mount();
    expect(preview).toHaveBeenLastCalledWith(current);
    await change("Area", "AF");
    expect(preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: "continent", continent: "AF" }),
    );
    await change("Session length", "all");
    expect(summary()).toContain("One complete pass");
    await openAdvanced();
    expect(host.querySelector("aside.study-hint-note")?.textContent).toContain(
      "Labels and markers may reveal answers.",
    );
    expect(host.querySelectorAll(".study-start .primary-button")).toHaveLength(
      1,
    );
  });
  it.each([
    ["Discover Asia", "continent", "AS", "countries", "map"],
    ["African capitals", "continent", "AF", "capitals", "choices"],
    ["World flags", "all", "AF", "flags", "choices"],
  ])(
    "starts the complete %s path without inheriting unrelated saved settings",
    async (title, scope, continent, topic, method) => {
      await mount(
        {
          ...defaultSettings,
          scope: "custom",
          countryIds: ["wurl:BRA"],
          length: 50,
          countryNames: true,
        },
        false,
      );
      expect(host.querySelector(".study-config")).toBeNull();
      await click(`Preview ${title}`);
      expect(start).not.toHaveBeenCalled();
      expect(host.querySelector("#study-pack-title")?.textContent).toBe(title);
      await click("Start session");
      const settings = start.mock.calls[0][0];
      expect(settings).toMatchObject({
        scope,
        continent,
        topics: [topic],
        length: 10,
        countryIds: [],
        countryNames: false,
      });
      const session = startStudy(settings, 4);
      expect(session.prompt.topic).toBe(topic);
      expect(session.prompt.style).toBe(method);
      expect(session.pool.length).toBeGreaterThan(2);
      expect(settings.choiceCount).toBe(4);
    },
  );
  it("customizes a path, keeps the draft after returning to paths, and leaves session replacement explicit", async () => {
    await mount(defaultSettings, false);
    await click("Preview African capitals");
    await click("Customize");
    expect(select("Area").value).toBe("AF");
    expect(select("Answer method").value).toBe("choices");
    await change("Session length", "20");
    await click("Study Packs");
    expect(start).not.toHaveBeenCalled();
    await click("Session Builder");
    expect(select("Session length").value).toBe("20");
    expect(summary()).toContain(
      "Capitals · Multiple choice · Africa · 20 questions",
    );
    await click("Start session");
    expect(start.mock.calls[0][0]).toEqual(current);
  });
  it("previews packs without saving settings, replacing a session or opening a modal", async () => {
    const build = vi.fn();
    await act(async () =>
      root.render(
        <StudyPacks onStart={start} onBuild={build} onPreview={preview} />,
      ),
    );
    await click("Preview World flags");
    expect(preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: "all", topics: ["flags"] }),
    );
    await click("Preview Discover Asia");
    expect(preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ continent: "AS", topics: ["countries"] }),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(build).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    await click("Start session");
    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        continent: "AS",
        countryNames: false,
        capitalNames: false,
      }),
    );
  });
  it("applies the shared method to newly selected topics and starts the summarized session", async () => {
    await mount();
    expect(
      host.querySelector<HTMLDetailsElement>(".study-advanced")!.open,
    ).toBe(false);
    await change("Answer method", "typing");
    await click("Countries");
    await click("Capitals");
    await click("Flags");
    await click("Countries");
    expect(current.styles).toEqual({
      countries: "typing",
      capitals: "typing",
      flags: "typing",
    });
    await change("Answer method", "choices");
    await change("Area", "AF");
    await change("Session length", "10");
    expect(summary()).toBe(
      "Countries + Capitals + Flags · Multiple choice · Africa · 10 questions",
    );
    await click("Start session");
    const session = startStudy(start.mock.calls[0][0], 4);
    expect(session.settings).toEqual(current);
    expect(session.prompt.style).toBe("choices");
    expect(session.settings.length).toBe(10);
    expect(session.pool.length).toBeGreaterThan(2);
  });
  it("retains saved per-topic methods until the user chooses a shared method", async () => {
    const saved: StudySettings = {
      ...defaultSettings,
      topics: ["countries", "capitals"],
    };
    await mount(saved);
    expect(current).toEqual(saved);
    const toggle = host.querySelector<HTMLInputElement>(
      ".study-method-toggle input",
    )!;
    expect(toggle.checked).toBe(true);
    expect(select("Answer method")).toBeNull();
    expect(host.textContent).not.toContain("Answer method by topic");
    expect(summary()).toContain("Per-topic methods");
    await change("Countries answer method", "choices");
    expect(current.styles.capitals).toBe("typing");
    await act(async () => toggle.click());
    expect(toggle.checked).toBe(false);
    expect(select("Countries answer method")).toBeNull();
    await change("Answer method", "map");
    expect(current.styles).toEqual({
      countries: "map",
      capitals: "map",
      flags: "map",
    });
    expect(summary()).toContain("Select on globe");
  });
  it("validates custom countries and carries the filtered selections into the session", async () => {
    await mount();
    await change("Answer method", "choices");
    await change("Area", "custom");
    const startButton = host.querySelector<HTMLButtonElement>(
      ".study-start button",
    )!;
    expect(startButton.disabled).toBe(true);
    const find = host.querySelector<HTMLInputElement>(
      'input[aria-label="Find countries to include"]',
    )!;
    const choose = async (name: string) => {
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(find, name);
        find.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const checkbox = [
        ...host.querySelectorAll<HTMLLabelElement>(".custom-pool label"),
      ]
        .find((label) => label.textContent === name)!
        .querySelector<HTMLInputElement>("input")!;
      await act(async () => checkbox.click());
    };
    await choose("Brazil");
    expect(startButton.disabled).toBe(true);
    expect(host.textContent).toContain("Include at least two countries");
    await choose("Andorra");
    expect(startButton.disabled).toBe(false);
    expect(summary()).toContain("2 chosen countries");
    await click("Start session");
    expect(new Set(startStudy(start.mock.calls[0][0], 7).pool)).toEqual(
      new Set(["wurl:BRA", "wurl:AND"]),
    );
  });
  it("shows choice count only for relevant methods and preserves advanced preferences", async () => {
    await mount({ ...defaultSettings, choiceCount: 3, revisitMissed: true });
    await openAdvanced();
    expect(
      host.querySelector('select[aria-label="Number of options"]'),
    ).toBeNull();
    await change("Answer method", "mixed");
    await click("Capitals");
    await click("Flags");
    expect(select("Number of options").value).toBe("3");
    await change("Number of options", "4");
    await change("Answer method", "typing");
    expect(
      host.querySelector('select[aria-label="Number of options"]'),
    ).toBeNull();
    expect(current.choiceCount).toBe(4);
    expect(current.revisitMissed).toBe(true);
    await click("Countries");
    await click("Capitals");
    await click("Flags");
    expect(
      host.querySelector<HTMLButtonElement>(".study-start button")!.disabled,
    ).toBe(true);
    expect(host.textContent).toContain("Choose at least one topic.");
  });
});

it("lets the player choose and start with a capital distractor pool", async () => {
  await mount({
    ...defaultSettings,
    topics: ["capitals"],
    styles: { ...defaultSettings.styles, capitals: "choices" },
  });
  const field = select("Other answer choices");
  expect([...field.options].map((option) => option.value)).toEqual([
    "study",
    "region",
    "countryCities",
    "globalCities",
    "globalCapitals",
  ]);
  await change("Other answer choices", "countryCities");
  expect(host.textContent).toContain("Uses major cities included in Ambit.");
  await click("Start session");
  expect(start).toHaveBeenCalledWith(
    expect.objectContaining({ capitalDistractors: "countryCities" }),
  );
  await change("Answer method", "typing");
  expect(select("Other answer choices")).toBeNull();
});

it("hides inactive multiple-choice controls and summaries without losing the saved preference", async () => {
  await mount({ ...defaultSettings, choiceCount: 4, autoAdvance: false });
  const advanced = [
    ...host.querySelectorAll<HTMLElement>(".study-builder-section"),
  ].find(
    (section) =>
      section.querySelector(".study-section-title")?.textContent ===
      "Advanced options",
  )!;
  expect(
    advanced.querySelector(".study-section-summary")?.textContent,
  ).not.toContain("4 answer choices");
  expect(select("Number of options")).toBeNull();
  expect(host.textContent).toContain("Available with two or more topics.");
  await act(async () =>
    host
      .querySelectorAll<HTMLElement>(".study-builder-section > summary")[2]
      .click(),
  );
  await change("Answer method", "choices");
  expect(select("Number of options").value).toBe("4");
  expect(
    advanced.querySelector(".study-section-summary")?.textContent,
  ).toContain("4 answer choices");
});
