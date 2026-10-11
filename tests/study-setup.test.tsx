// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StudySetup, StudyEditor } from "../src/study/StudySetup";
import { defaultSettings, startStudy } from "../src/study/engine";
import type { StudySettings } from "../src/study/engine";

let host: HTMLDivElement, root: Root, current: StudySettings;
const start = vi.fn<(settings: StudySettings) => void>();
const preview = vi.fn<(settings?: StudySettings) => void>();
function Harness({ initial }: { initial: StudySettings }) {
  const [settings, setSettings] = useState(initial);
  current = settings;
  return (
    <StudySetup
      settings={settings}
      onSettings={setSettings}
      onStart={start}
      onPreview={preview}
    />
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
  await act(async () => root.render(<Harness initial={initial} />));
  if (editor) await click("Custom");
}
async function click(name: string) {
  const buttons = [...host.querySelectorAll<HTMLButtonElement>("button")];
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
  it("uses an explicit per-topic checkbox, hides the shared method, and preserves the choice when methods match", async () => {
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
  it("mentions missed-answer repeats only when revisits are enabled", async () => {
    await mount({ ...defaultSettings, length: "all" });
    expect(host.textContent).not.toContain("Missed answers can repeat");
    await openAdvanced();
    const checkbox = [...host.querySelectorAll<HTMLLabelElement>("label")]
      .find(
        (label) => label.textContent?.trim() === "Bring back missed answers",
      )!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => checkbox.click());
    expect(host.textContent).toContain(
      "Missed answers can repeat during the session.",
    );
    await act(async () => checkbox.click());
    expect(host.textContent).not.toContain("Missed answers can repeat");
  });
  it("puts the replacement warning and resume action below Start", async () => {
    const resume = vi.fn();
    await act(async () =>
      root.render(
        <StudyEditor
          settings={defaultSettings}
          onSettings={() => {}}
          onStart={start}
          onResume={resume}
          resumeLabel="Resume session"
        />,
      ),
    );
    const footer = host.querySelector(".study-start")!;
    const warning = footer.querySelector(".study-replacement-note")!;
    expect(host.querySelector(".study-editor-scroll")!.contains(warning)).toBe(
      false,
    );
    expect(warning.previousElementSibling?.className).toBe("primary-button");
    expect(footer.querySelector(".study-session-review h2")?.textContent).toBe(
      "Your session",
    );
    await click("Resume session");
    expect(resume).toHaveBeenCalledOnce();
  });
  it("offers three paths and one builder tile, and previews only builder selections", async () => {
    await mount(defaultSettings, false);
    expect(host.querySelectorAll("article.study-path")).toHaveLength(3);
    expect(host.querySelector("article.study-path small")).toBeNull();
    expect(
      host.querySelector("article.study-path p")?.textContent,
    ).toBeTruthy();
    expect(host.querySelectorAll(".study-path-build")).toHaveLength(1);
    expect(host.textContent).not.toContain("Your own session");
    expect(preview).toHaveBeenLastCalledWith(undefined);
    await click("Custom");
    expect(preview).toHaveBeenLastCalledWith(current);
    await change("Where", "continent");
    await change("Continent", "AF");
    expect(preview).toHaveBeenLastCalledWith(
      expect.objectContaining({ scope: "continent", continent: "AF" }),
    );
    await change("Session length", "all");
    expect(current.length).toBe("all");
    expect(summary()).toContain("One complete pass");
    const scroll = host.querySelector(".study-editor-scroll")!;
    expect(scroll.querySelector(".study-start")).toBeNull();
    expect(scroll.contains(host.querySelector(".study-advanced"))).toBe(true);
    await openAdvanced();
    expect(host.querySelector("aside.study-hint-note")?.textContent).toContain(
      "Names and markers can give away answers.",
    );
    await click("Back to paths");
    expect(preview).toHaveBeenLastCalledWith(undefined);
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
      await click(`Start ${title}`);
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
    await click("Customize African capitals");
    expect(select("Where").value).toBe("continent");
    expect(select("Continent").value).toBe("AF");
    expect(select("Answer method").value).toBe("choices");
    await change("Session length", "20");
    await click("Back to paths");
    expect(start).not.toHaveBeenCalled();
    await click("Custom");
    expect(select("Session length").value).toBe("20");
    expect(summary()).toContain(
      "Capitals · Multiple choice · Africa · 20 questions",
    );
    await click("Start studying");
    expect(start.mock.calls[0][0]).toEqual(current);
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
    await change("Where", "continent");
    await change("Continent", "AF");
    await change("Session length", "10");
    expect(summary()).toBe(
      "Countries + Capitals + Flags · Multiple choice · Africa · 10 questions",
    );
    await click("Start studying");
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
    expect(summary()).toContain("Tap globe");
  });
  it("validates custom countries and carries the filtered selections into the session", async () => {
    await mount();
    await change("Answer method", "choices");
    await change("Where", "custom");
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
    await click("Start studying");
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
  const field = select("Capital distractors");
  expect([...field.options].map((option) => option.value)).toEqual([
    "study",
    "region",
    "countryCities",
    "globalCities",
    "globalCapitals",
  ]);
  await change("Capital distractors", "countryCities");
  expect(host.textContent).toContain("bundled major-city catalog");
  await click("Start studying");
  expect(start).toHaveBeenCalledWith(
    expect.objectContaining({ capitalDistractors: "countryCities" }),
  );
  await change("Answer method", "typing");
  expect(select("Capital distractors")).toBeNull();
});
