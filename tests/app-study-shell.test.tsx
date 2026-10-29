// @vitest-environment jsdom
// Install shared mocks before importing the application.
import {
  click as clickButton,
  host,
  member,
  mount,
  probe,
  resetRoot,
  root,
  savedStudy,
  settleLoads,
} from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { createStudySave } from "../src/app/progressSaves";
import { MOBILE_LAYOUT_QUERY } from "../src/app/useMobileLayout";
import { regionBorderVisible } from "../src/globe/outlines";
import {
  STUDY_KEY,
  archiveStudy,
  capitalOf,
  defaultSettings,
  emptyStudy,
  startStudy,
  studyPool,
  studyReducer,
} from "../src/study/engine";
import { STUDY_PATHS } from "../src/study/paths";

async function click(name: string) {
  const labels: Record<string, string> = {
    Custom: "Session Builder",
    History: "Your Sessions",
    "Study Packs": "Study Packs",
    Review: "Review",
  };
  if (labels[name]) {
    if (!host.querySelector(".mode-incoming .study-navigation")) {
      await clickButton("Session settings");
      await clickButton("Pause session");
      if (name === "History") return;
    }
    const link = [
      ...host.querySelectorAll<HTMLAnchorElement>(
        ".mode-incoming .study-navigation a",
      ),
    ].find((a) => a.textContent === labels[name]);
    expect(link, `Study tab ${labels[name]}`).toBeDefined();
    await act(async () => link!.click());
    await settleLoads();
    return;
  }
  if (
    name.startsWith("Preview ") &&
    !host.querySelector(".mode-incoming .study-packs")
  )
    await click("Study Packs");
  if (name.startsWith("Preview ")) {
    const title = name.slice(8);
    for (
      let i = 0;
      i < 10 && host.querySelector("#study-pack-title")?.textContent !== title;
      i++
    )
      await clickButton("Next study pack");
    expect(host.querySelector("#study-pack-title")?.textContent).toBe(title);
    return;
  }
  return clickButton(name);
}

describe("app study shell (DOM only; no browser or WebGL)", () => {
  it("selects Study countries through Earth and previews each hint independently", async () => {
    history.replaceState(null, "", "/study");
    await mount();
    await click("Custom");
    expect(host.querySelector(".page-layout .study-editor")).toBeNull();
    expect(probe.props!.active).toBe(true);
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    expect(probe.props!.states["wurl:BRA"]).toBe("selected");
    expect(probe.props!.selectDisabled).toBe(true);
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(probe.props!.states["wurl:CAN"]).toBe("selected");
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    expect(probe.props!.states["wurl:BRA"]).toBe("disabled");
    expect(probe.focus.at(-1)).toMatchObject({
      lat: member("wurl:CAN").focus.lat,
      lng: member("wurl:CAN").focus.lng,
    });
    const saved = savedStudy().settings;
    expect(saved.scope).toBe("custom");
    expect(saved.countryIds).toEqual(["wurl:CAN"]);
    await act(async () =>
      host.querySelector<HTMLElement>(".study-advanced > summary")!.click(),
    );
    const toggle = async (name: string) =>
      act(async () => {
        const label = [
          ...host.querySelectorAll<HTMLLabelElement>("label"),
        ].find((element) => element.textContent?.trim() === name)!;
        label.querySelector<HTMLInputElement>("input")!.click();
      });
    await toggle("Country borders");
    expect(probe.props!.showBorders).toBe(false);
    await toggle("Country names");
    expect(probe.props!.regionNames).toBe("committed");
    expect(probe.props!.namedRegionIds).toEqual(["wurl:CAN"]);
    expect(probe.props!.borderRegionIds).toEqual([]);
    expect(regionBorderVisible(member("wurl:CAN"), probe.props!)).toBe(false);
    await toggle("Country borders");
    expect(regionBorderVisible(member("wurl:CAN"), probe.props!)).toBe(true);
    expect(probe.props!.places.map((p) => p.name)).toEqual(["Canada"]);
    expect(probe.props!.places[0].markerHidden).toBe(true);
    expect(probe.props!.placeMarkers).toBe(false);
    expect(probe.props!.placeLabels).toBe(true);
    await toggle("Capital markers");
    expect(probe.props!.placeMarkers).toBe(true);
    expect(
      probe.props!.places.find((p) => p.kind === "capital")?.labelHidden,
    ).toBe(true);
    await toggle("Capital names");
    expect(
      probe.props!.places.find((p) => p.kind === "capital")?.labelHidden,
    ).toBe(false);
    await toggle("Country names");
    expect(probe.props!.places.some((p) => p.markerHidden)).toBe(false);
    expect(probe.props!.regionNames).toBe("none");
  });

  it("keeps Customize inline and the globe visible on mobile while area and hint settings change", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    history.replaceState(null, "", "/study");
    await mount();
    await click("Custom");
    expect(location.pathname + location.search).toBe("/study?view=builder");
    expect(probe.props!.states["wurl:CAN"]).toBe("selectable");
    expect(host.querySelector(".mode-outgoing")).toBeNull();
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    expect(host.querySelector("#mobile-map")?.hasAttribute("inert")).toBe(
      false,
    );
    const area = [...host.querySelectorAll<HTMLLabelElement>("label")].find(
      (label) => label.textContent === "Area",
    )!.control as HTMLSelectElement;
    await act(async () => {
      area.value = "AF";
      area.dispatchEvent(new Event("change", { bubbles: true }));
    });
    for (const id of studyPool({
      ...defaultSettings,
      scope: "continent",
      continent: "AF",
    }))
      expect(probe.props!.states[id]).toBe("selectable");
    expect(probe.props!.states["wurl:CAN"]).toBe("disabled");
    const flights = probe.focus.length;
    await act(async () =>
      host.querySelector<HTMLElement>(".study-advanced > summary")!.click(),
    );
    await act(async () => {
      [...host.querySelectorAll<HTMLLabelElement>("label")]
        .find((label) => label.textContent?.trim() === "Country borders")!
        .querySelector<HTMLInputElement>("input")!
        .click();
    });
    expect(probe.focus).toHaveLength(flights);
    await click("History");
    expect(
      Object.values(probe.props!.states).every((state) => state === "disabled"),
    ).toBe(true);
    expect(probe.mounts).toBe(1);
  });

  it.each([false, true])(
    "leaves the Study builder without flashing the overview (mobile: %s)",
    async (mobile) => {
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: mobile && query === MOBILE_LAYOUT_QUERY,
        addEventListener() {},
        removeEventListener() {},
      }));
      history.replaceState(null, "", "/study");
      await mount();
      await click("Custom");
      expect(host.querySelector(".study-extra-options")).not.toBeNull();
      await click("Home");
      expect(host.querySelector(".home-menu")).not.toBeNull();
      expect(host.querySelector(".study-landing")).toBeNull();
      expect(host.querySelector(".mode-outgoing")).toBeNull();
      expect(probe.mounts).toBe(1);
    },
  );

  it("edits hints without replacing Earth, moving the camera, or losing a typed answer", async () => {
    const settings = {
      ...defaultSettings,
      styles: { ...defaultSettings.styles, countries: "typing" as const },
    };
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start session");
    const earth = host.querySelector("canvas");
    const question = host.querySelector(".mode-incoming .study-question")!;
    const input = question.querySelector<HTMLInputElement>("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Bra");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const prompt = question.querySelector("h1")!.textContent;
    const cameraChanges = probe.focus.length;
    await click("Session settings");
    const dialog = document.querySelector<HTMLElement>(
      '[role="dialog"][aria-modal="true"]',
    )!;
    expect(dialog).not.toBeNull();
    expect(dialog.querySelector("h2")?.textContent).toBe("Session settings");
    expect(
      question
        .querySelector(".round-number")
        ?.classList.contains("journey-step"),
    ).toBe(true);
    expect(question.hasAttribute("inert")).toBe(true);
    expect(probe.focus).toHaveLength(cameraChanges);
    expect(probe.props!.regionInteraction).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    expect(question.querySelector(".round-feedback")).toBeNull();
    await click("Hints & pacing");
    const borders = [...dialog.querySelectorAll("label")]
      .find((label) => label.textContent === "Country borders")!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => borders.click());
    expect(probe.props!.showBorders).toBe(true);
    await click("Apply & resume");
    expect(document.querySelector(".study-options-dialog")).toBeNull();
    expect(probe.props!.showBorders).toBe(false);
    expect(probe.props!.regionInteraction).toBe(true);
    expect(input.value).toBe("Bra");
    expect(question.querySelector("h1")!.textContent).toBe(prompt);
    expect(probe.focus).toHaveLength(cameraChanges);
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Session settings",
    );
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });

  it.each([
    { correct: true, markers: false, names: false },
    { correct: false, markers: false, names: false },
    { correct: true, markers: true, names: false },
    { correct: false, markers: false, names: true },
  ])(
    "reveals the correct capital during feedback (correct=$correct, markers=$markers, names=$names) without enabling hints",
    async ({ correct, markers, names }) => {
      vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
      vi.setSystemTime(12);
      const settings = {
        ...defaultSettings,
        topics: ["capitals" as const],
        scope: "custom" as const,
        countryIds: ["wurl:COG", "wurl:GAB", "wurl:CMR"],
        styles: { ...defaultSettings.styles, capitals: "choices" as const },
        capitalMarkers: markers,
        capitalNames: names,
        countryNames: true,
        autoAdvance: false,
      };
      const session = startStudy(settings, 12);
      const capital = capitalOf(session.prompt.targetId);
      localStorage.setItem(
        STUDY_KEY,
        JSON.stringify({ ...emptyStudy, settings }),
      );
      await mount();
      await click("Study");
      await click("Custom");
      await click("Start session");
      const input = host.querySelector<HTMLInputElement>(
        `.mode-incoming .study-choices input[value="${correct ? session.prompt.targetId : session.prompt.choices.find((id) => id !== session.prompt.targetId)}"]`,
      )!;
      expect(input).not.toBeNull();
      await act(async () => input.click());
      await click("Submit answer");
      expect(
        host.querySelector(".mode-incoming .round-feedback")?.textContent,
      ).toContain(correct ? "Well spotted." : "Not quite.");
      const revealed = probe.props!.places.find(
        (place) => place.id === capital.id,
      )!;
      expect(revealed).toMatchObject({
        name: capital.name,
        lat: capital.lat,
        lng: capital.lng,
        markerHidden: false,
        labelHidden: false,
      });
      expect(probe.props!.placeMarkers).toBe(true);
      expect(probe.props!.placeLabels).toBe(true);
      for (const other of probe.props!.places.filter(
        (place) => place.kind === "capital" && place.id !== capital.id,
      )) {
        expect(other.markerHidden).toBe(!markers);
        expect(other.labelHidden).toBe(!names);
        expect(revealed.priority!).toBeGreaterThan(other.priority ?? 0);
      }
      expect(savedStudy().settings).toMatchObject({
        capitalMarkers: markers,
        capitalNames: names,
      });
      await click("Next");
      expect(probe.props!.placeMarkers).toBe(markers);
      expect(
        probe
          .props!.places.filter((place) => place.kind === "capital")
          .every(
            (place) =>
              place.labelHidden === !names && place.markerHidden === !markers,
          ),
      ).toBe(true);
      expect(probe.props!.places.some((place) => place.priority === 1000)).toBe(
        false,
      );
    },
  );

  it.each(["typing", "choices"] as const)(
    "frames the named country for Study capital %s prompts",
    async (style) => {
      const session = startStudy(
        {
          ...defaultSettings,
          topics: ["capitals"],
          scope: "custom",
          countryIds: ["wurl:MEX", "wurl:AND"],
          autoAdvance: false,
          styles: { ...defaultSettings.styles, capitals: style },
        },
        24,
      );
      localStorage.setItem(
        STUDY_KEY,
        JSON.stringify({ ...emptyStudy, settings: session.settings, session }),
      );
      vi.spyOn(Date, "now").mockReturnValue(24);
      await mount();
      await click("Study");
      await click("Custom");
      await click("Start session");
      await click("Start new session");
      expect(probe.focus.at(-1)).toEqual(member(session.prompt.targetId).focus);
      if (style === "choices") {
        const answer = host.querySelector<HTMLInputElement>(
          `.mode-incoming input[value="${session.prompt.targetId}"]`,
        )!;
        const count = probe.focus.length;
        await act(async () => answer.click());
        expect(probe.focus).toHaveLength(count); // answering does not restart travel
        await click("Submit answer");
        await click("Next");
        const next = studyReducer(
          studyReducer(
            studyReducer(session, {
              type: "choice",
              id: session.prompt.targetId,
            }),
            { type: "submit" },
          ),
          { type: "next" },
        );
        expect(probe.focus.at(-1)).toEqual(member(next.prompt.targetId).focus);
      }
    },
  );

  it("keeps Study capital map prompts from focusing their hidden country answer", async () => {
    const session = startStudy(
      {
        ...defaultSettings,
        topics: ["capitals"],
        styles: { ...defaultSettings.styles, capitals: "map" },
      },
      24,
    );
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings: session.settings, session }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    const count = probe.focus.length;
    await click("Start session");
    await click("Start new session");
    expect(probe.focus).toHaveLength(count);
  });

  it("keeps inline setup visible beside the globe and raises only the mobile session-preferences panel", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    await mount();
    await click("Study");
    await click("Custom");
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    await click("Start session");
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    const cog = host.querySelector<HTMLButtonElement>(
      '[aria-label="Session settings"]',
    )!;
    await act(async () => cog.click());
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    const edit = [
      ...document.querySelectorAll<HTMLButtonElement>("button"),
    ].find((b) => b.textContent === "Hints & pacing")!;
    await act(async () => edit.click());
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(true);
    await act(async () =>
      document
        .querySelector<HTMLButtonElement>(
          '[aria-label="Close Session settings"]',
        )!
        .click(),
    );
    expect(
      host.querySelector(".experience")?.hasAttribute("data-panel-only"),
    ).toBe(false);
    expect(probe.mounts).toBe(1);
  });

  it("frames a path and saves completed results for viewing and replay", async () => {
    vi.spyOn(Date, "now").mockReturnValue(24);
    await mount();
    await click("Study");
    await click("Preview Discover Asia");
    await click("Start session");
    expect(host.querySelector(".study-question .study-navigation")).toBeNull();
    expect(host.querySelector(".study-session-context")).toBeNull();
    expect(probe.focus.at(-1)).toMatchObject({ lat: 35, lng: 90 });
    const session = startStudy(STUDY_PATHS[0].settings, 24);
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    const focused = probe.focus.length;
    await click("Next");
    expect(probe.focus).toHaveLength(focused);
    await click("Session settings");
    await click("Finish this session");
    const saved = savedStudy();
    expect(saved.history).toHaveLength(1);
    expect(saved.session?.phase).toBe("summary");
    expect(saved.history![0].session.history[0].correct).toBe(true);
    expect(host.querySelector(".study-summary .settings-button")).toBeNull();
    await act(async () =>
      host
        .querySelector<HTMLAnchorElement>('.study-navigation a[href="/study"]')!
        .click(),
    );
    await settleLoads();
    expect(host.textContent).toContain("Ended early");
    expect(
      Object.values(probe.props!.states).every((state) => state === "disabled"),
    ).toBe(true);
    expect(probe.props!.regionInteraction).toBe(false);
    expect(probe.focus.at(-1)!.altitude).toBeGreaterThanOrEqual(1.65);
    await act(async () =>
      host
        .querySelector<HTMLAnchorElement>('.study-navigation a[href="/study"]')!
        .click(),
    );
    await settleLoads();
    expect(host.querySelector(".study-history")).not.toBeNull();
    expect(savedStudy().session?.phase).toBe("summary");
    await click("Home");
    await click("Study");
    expect(host.querySelector(".study-history")).not.toBeNull();
    expect(host.querySelector(".study-summary")).toBeNull();
    expect(host.textContent).not.toContain("Return to results");
    await act(async () =>
      host
        .querySelector<HTMLAnchorElement>('.study-navigation a[href="/study"]')!
        .click(),
    );
    await settleLoads();
    await act(async () =>
      host.querySelector<HTMLButtonElement>(".study-history-view")!.click(),
    );
    expect(host.querySelector(".study-summary")).not.toBeNull();
    await click("Practice again");
    expect(
      host.querySelector(".study-question .round-number")?.textContent,
    ).toBe("1");
    expect(savedStudy().history).toHaveLength(1);
    await click("Home");
    await act(async () => {
      root.unmount();
      resetRoot();
    });
    await mount();
    await click("Study");
    await act(async () =>
      host
        .querySelector<HTMLAnchorElement>('.study-navigation a[href="/study"]')!
        .click(),
    );
    await settleLoads();
    expect(host.querySelectorAll(".study-history-list li")).toHaveLength(1);
    await act(async () =>
      host.querySelector<HTMLButtonElement>(".study-history-view")!.click(),
    );
    await click("Practice again");
    await click("Start new session");
    expect(
      host.querySelector(".study-question .round-number")?.textContent,
    ).toBe("1");
  });

  it("merges a cross-tab result without discarding a locally queued completion", async () => {
    const settings = { ...defaultSettings, autoAdvance: false };
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings }),
    );
    const other = createStudySave();
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start session");
    let session = startStudy(settings, 42);
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    session = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    const remote = archiveStudy({
      ...other.load(),
      session: { ...session, id: "other-tab" },
    });
    await click("Session settings");
    await act(async () => {
      const finish = [
        ...document.querySelectorAll<HTMLButtonElement>(
          ".study-options-dialog button",
        ),
      ].find((b) => b.textContent?.trim() === "Finish this session")!;
      finish.click();
      other.save(remote);
      dispatchEvent(
        new StorageEvent("storage", {
          key: `${other.prefix}history.other-tab/${other.writer}`,
        }),
      );
    });
    const saved = savedStudy();
    expect(saved.history).toHaveLength(2);
    expect(saved.history?.some((record) => record.id === "other-tab")).toBe(
      true,
    );
    expect(host.querySelector(".study-summary")).not.toBeNull();
    await act(async () =>
      host
        .querySelector<HTMLAnchorElement>('.study-navigation a[href="/study"]')!
        .click(),
    );
    await settleLoads();
    expect(document.querySelectorAll(".study-history-list li")).toHaveLength(2);
  });

  it("advances correct Study answers at 650 ms, while wrong answers wait for Next", async () => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout"] });
    vi.setSystemTime(12);
    let session = startStudy({ ...defaultSettings, topics: ["flags"] }, 12);
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings: session.settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start session");
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    await click("Session settings");
    await act(async () => vi.advanceTimersByTime(1000));
    expect(
      host.querySelector(".mode-incoming .round-number")?.textContent,
    ).toBe("1");
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" })),
    );
    expect(
      host.querySelector(".mode-incoming .round-number")?.textContent,
    ).toBe("1");
    await click("Close Session settings");
    await act(async () => vi.advanceTimersByTime(649));
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).toContain("Well spotted");
    await act(async () => vi.advanceTimersByTime(1));
    session = studyReducer(
      studyReducer(session, { type: "pick", id: session.prompt.targetId }),
      { type: "next" },
    );
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).not.toContain("Well spotted");
    const wrong = session.pool.find((id) => id !== session.prompt.targetId)!;
    await act(async () => probe.props!.onSelect(member(wrong)));
    await act(async () => vi.advanceTimersByTime(1000));
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).toContain("Not quite");
    await click("Next");
    expect(
      host.querySelector(".mode-incoming .study-question")!.textContent,
    ).not.toContain("Not quite");
    expect(savedStudy().session?.prompt.ordinal).toBe(2);
  });

  it("requires map clicks for named-country prompts while preserving the Study orbit", async () => {
    vi.spyOn(Date, "now").mockReturnValue(24);
    let session = startStudy({ ...defaultSettings, autoAdvance: false }, 24);
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings: session.settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start session");
    const question = host.querySelector(".mode-incoming .study-question")!;
    expect(question.querySelector("input")).toBeNull();
    expect(question.textContent).not.toContain("Answer by name");
    probe.currentView = { lat: -15, lng: 133, altitude: 1.7 };
    const count = probe.focus.length;
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    await click("Next");
    expect(probe.focus).toHaveLength(count);
    expect(probe.currentView.lng).toBe(133);
    session = studyReducer(
      studyReducer(session, { type: "pick", id: session.prompt.targetId }),
      { type: "next" },
    );
    probe.currentView = { lat: -15, lng: 133, altitude: 0.5 };
    await act(async () =>
      probe.props!.onSelect(member(session.prompt.targetId)),
    );
    await click("Next");
    expect(probe.focus).toHaveLength(count + 1);
    expect(probe.currentView.altitude).toBeGreaterThan(1.5);
  });

  it("resumes an attempt after navigation and archives it when a new session starts", async () => {
    const settings = {
      ...defaultSettings,
      topics: ["flags"] as typeof defaultSettings.topics,
      borders: false,
    };
    localStorage.setItem(
      STUDY_KEY,
      JSON.stringify({ ...emptyStudy, settings }),
    );
    await mount();
    await click("Study");
    await click("Custom");
    await click("Start session");
    expect(probe.props!.showBorders).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:USA")));
    await click("Home");
    const saved = savedStudy();
    expect(saved.settings).toEqual(settings);
    expect(saved.session?.history).toHaveLength(1);
    expect(saved.history).toBeUndefined();
    await click("Study");
    expect(host.querySelector(".study-history")).not.toBeNull();
    await click("Resume session");
    expect(host.querySelector(".round-feedback")).not.toBeNull();
    await click("Home");
    await act(async () => {
      root.unmount();
      resetRoot();
    });
    await mount();
    await click("Study");
    await click("Resume session");
    expect(savedStudy().session?.id).toBe(saved.session?.id);
    await click("Session settings");
    await click("Hints & pacing");
    expect(
      document.querySelector(".study-options-dialog")?.textContent,
    ).not.toContain("Build a new session");
    await click("Close Session settings");
    await click("Home");
    await click("Study");
    await click("Custom");
    expect(host.querySelector(".study-extra-options")).not.toBeNull();
    expect(host.textContent).not.toContain("Return to results");
    await click("Start session");
    await click("Start new session");
    expect(
      host.querySelector(".study-question .round-number")?.textContent,
    ).toBe("1");
    expect(host.querySelector(".round-feedback")).toBeNull();
    expect(savedStudy().history).toHaveLength(1);
  });
});

it("inspects historical results without replacing active answers and confirms replacement only when starting", async () => {
  const initial = startStudy(
    {
      ...defaultSettings,
      styles: { ...defaultSettings.styles, countries: "typing" },
      autoAdvance: false,
    },
    42,
  );
  let current = studyReducer(
    studyReducer(initial, {
      type: "text",
      value: initial.prompt.targetId === "wurl:CAN" ? "Canada" : "wrong",
    }),
    { type: "submit" },
  );
  current = {
    ...studyReducer(current, { type: "next" }),
    id: crypto.randomUUID(),
    text: "pending answer",
  };
  const old = {
    ...studyReducer(current, { type: "finish" }),
    id: crypto.randomUUID(),
  };
  const record = { id: old.id, finishedAt: 42, session: old };
  createStudySave().save({
    ...emptyStudy,
    settings: current.settings,
    session: current,
    history: [record],
  });
  history.replaceState(null, "", "/study?view=history");
  await mount();
  await act(async () =>
    host.querySelector<HTMLButtonElement>(".study-history-view")!.click(),
  );
  await settleLoads();
  expect(location.search).toContain(`record=${old.id}`);
  expect(host.querySelector(".study-summary")).not.toBeNull();
  expect(savedStudy().session).toMatchObject({
    id: current.id,
    phase: "playing",
    text: "pending answer",
  });
  await click("History");
  await click("Resume session");
  expect(
    host.querySelector<HTMLInputElement>(".study-question input")?.value,
  ).toBe("pending answer");
  await click("History");
  await click("Custom");
  await click("Start session");
  expect(
    document.querySelector(".study-replacement-dialog[open]"),
  ).not.toBeNull();
  expect(savedStudy().session?.id).toBe(current.id);
  await click("Keep current session");
  expect(savedStudy().session?.id).toBe(current.id);
  expect(savedStudy().history).toHaveLength(1);
  await click("Start session");
  await click("Start new session");
  expect(savedStudy().session?.id).not.toBe(current.id);
  expect(savedStudy().history).toHaveLength(2);
});

it.each([false, true])(
  "previews Study presets on the shared globe without changing saves (mobile: %s)",
  async (mobile) => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: mobile && query === MOBILE_LAYOUT_QUERY,
      addEventListener() {},
      removeEventListener() {},
    }));
    const settings = {
      ...defaultSettings,
      scope: "custom" as const,
      countryIds: ["wurl:CAN"],
    };
    createStudySave().save({ ...emptyStudy, settings });
    history.replaceState(null, "", "/study");
    await mount();
    await click("Preview Discover Asia");
    expect(probe.focus.at(-1)).toMatchObject({ lat: 35, lng: 90 });
    expect(probe.props!.motion).toBe(false);
    expect(probe.props!.states["wurl:IND"]).toBe("selectable");
    expect(probe.props!.states["wurl:CAN"]).toBe("disabled");
    const saved = savedStudy();
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(savedStudy()).toEqual(saved);
    await click("Preview African capitals");
    expect(probe.focus.at(-1)).toMatchObject({ lat: 3, lng: 20 });
    expect(probe.props!.states["wurl:KEN"]).toBe("selectable");
    expect(probe.props!.states["wurl:IND"]).toBe("disabled");
    expect(
      probe.props!.places.some(
        (place) =>
          place.kind === "capital" && place.id === capitalOf("wurl:KEN").id,
      ),
    ).toBe(true);
    expect(savedStudy()).toEqual(saved);
    await click("Preview World flags");
    expect(probe.props!.states["wurl:CAN"]).toBe("selectable");
    expect(probe.props!.motion).toBe(true);
    expect(probe.props!.places.some((place) => place.kind === "capital")).toBe(
      false,
    );
    expect(savedStudy()).toEqual(saved);
    await click("Preview African capitals");
    expect(probe.focus.at(-1)).toMatchObject({ lat: 3, lng: 20 });
    expect(probe.mounts).toBe(1);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  },
);

it("starts a global learning review and returns an unanswered ended run to Your Sessions", async () => {
  let old = startStudy({ ...defaultSettings, autoAdvance: false }, 42);
  const wrong = old.pool.find((id) => id !== old.prompt.targetId)!;
  old = studyReducer(old, { type: "pick", id: wrong });
  old = { ...studyReducer(old, { type: "finish" }), id: crypto.randomUUID() };
  createStudySave().save({
    ...emptyStudy,
    history: [{ id: old.id!, finishedAt: Date.now(), session: old }],
  });
  history.replaceState(null, "", "/study?view=review");
  await mount();
  expect(host.querySelector(".study-learning-summary")?.textContent).toContain(
    "ready to review",
  );
  expect(host.querySelector(".study-navigation")?.textContent).not.toContain(
    "Current session",
  );
  await click("Start review");
  expect(savedStudy().session?.learningReview?.targets).toHaveLength(1);
  expect(host.querySelector(".study-question")).not.toBeNull();
  const started = savedStudy().session;
  await click("Review");
  await click("Resume review");
  expect(savedStudy().session).toEqual(started);
  await click("Session settings");
  await click("Finish this session");
  expect(location.pathname + location.search).toBe("/study");
  expect(savedStudy().session).toBeUndefined();
  expect(host.querySelector(".study-summary")).toBeNull();
  expect(savedStudy().history).toHaveLength(1);
});
it("hands Review's globe to Builder without clearing the preview, and animates Builder exits normally", async () => {
  let session = startStudy({ ...defaultSettings, autoAdvance: false }, 42);
  session = studyReducer(session, {
    type: "pick",
    id: session.pool.find((id) => id !== session.prompt.targetId)!,
  });
  session = studyReducer(session, { type: "finish" });
  createStudySave().save({
    ...emptyStudy,
    history: [{ id: "old-review", finishedAt: Date.now(), session }],
  });
  history.replaceState(null, "", "/study?view=review");
  await mount();
  const saved = savedStudy();
  expect(probe.props!.places.some((place) => place.name === "???")).toBe(true);
  const builder = [
    ...host.querySelectorAll<HTMLAnchorElement>(
      ".mode-incoming .study-navigation a",
    ),
  ].find((link) => link.textContent === "Session Builder")!;
  await act(async () => builder.click());
  expect(host.querySelector(".mode-outgoing .study-mistakes")).not.toBeNull();
  expect(host.querySelector(".mode-waiting .study-builder")).not.toBeNull();
  expect(probe.props!.places.some((place) => place.name === "???")).toBe(true);
  await settleLoads();
  expect(probe.props!.places.some((place) => place.name === "???")).toBe(false);
  const packs = [
    ...host.querySelectorAll<HTMLAnchorElement>(
      ".mode-incoming .study-navigation a",
    ),
  ].find((link) => link.textContent === "Study Packs")!;
  await act(async () => packs.click());
  expect(host.querySelector(".mode-outgoing .study-builder")).not.toBeNull();
  expect(host.querySelector(".mode-waiting .study-packs")).not.toBeNull();
  await settleLoads();
  expect(savedStudy()).toEqual(saved);
});

it.each([false, true])(
  "lands on Your Sessions with the current run or starting actions (active run: %s)",
  async (activeRun) => {
    const current = {
      ...startStudy(
        {
          ...defaultSettings,
          scope: "continent",
          continent: "AF",
          autoAdvance: false,
        },
        42,
      ),
      id: "active-study",
    };
    createStudySave().save({
      ...emptyStudy,
      ...(activeRun ? { session: current } : {}),
    });
    history.replaceState(null, "", "/study");
    await mount();
    expect(host.querySelector(".study-history h1")?.textContent).toBe(
      "Keep exploring.",
    );
    expect(
      [...host.querySelectorAll(".mode-incoming .study-navigation a")].map(
        (a) => a.textContent,
      ),
    ).toEqual(["Your Sessions", "Study Packs", "Session Builder", "Review"]);
    if (activeRun) {
      expect(host.querySelector(".study-current-card")).not.toBeNull();
      expect(probe.focus.at(-1)).toMatchObject({ lat: 3, lng: 20 });
      expect(probe.props!.states["wurl:KEN"]).toBe("selectable");
      expect(probe.props!.states["wurl:CAN"]).toBe("disabled");
      expect(probe.props!.regionInteraction).toBe(false);
      await click("Resume session");
      expect(savedStudy().session?.id).toBe(current.id);
      expect(location.search).toBe("?view=session");
    } else {
      expect(host.querySelector(".study-current-card")).toBeNull();
      await click("Browse Study Packs");
      expect(location.search).toBe("?view=packs");
      expect(host.querySelector(".study-packs")).not.toBeNull();
      expect(savedStudy().session).toBeUndefined();
    }
  },
);

it("keeps a result scene and camera intact until the destination preview is ready, including revisiting a cached Builder", async () => {
  const settings = { ...defaultSettings, autoAdvance: false };
  let session = startStudy(settings, 42);
  session = studyReducer(session, {
    type: "pick",
    id: session.prompt.targetId,
  });
  session = studyReducer(session, { type: "finish" });
  createStudySave().save({
    ...emptyStudy,
    settings,
    history: [{ id: "transition-result", finishedAt: Date.now(), session }],
  });
  history.replaceState(null, "", "/study?view=builder");
  await mount();
  await click("History");
  await act(async () =>
    host.querySelector<HTMLButtonElement>(".study-history-view")!.click(),
  );
  await settleLoads();
  const before = probe.props!.states;
  const cameraCount = probe.focus.length;
  const builder = [
    ...host.querySelectorAll<HTMLAnchorElement>(
      ".mode-incoming .study-navigation a",
    ),
  ].find((link) => link.textContent === "Session Builder")!;
  await act(async () => builder.click());
  expect(host.querySelector(".mode-outgoing .study-summary")).not.toBeNull();
  expect(probe.props!.states).toEqual(before);
  expect(probe.focus).toHaveLength(cameraCount);
  await settleLoads();
  expect(host.querySelector(".mode-incoming .study-builder")).not.toBeNull();
  expect(probe.props!.states[session.prompt.targetId]).toBe("selectable");
});
