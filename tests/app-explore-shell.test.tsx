// @vitest-environment jsdom
// Install shared mocks before importing the application.
import { click, host, member, mount, probe } from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it, vi } from "vitest";

describe("app explore shell (DOM only; no browser or WebGL)", () => {
  it("searches and frames territories outside the Study roster and displays only their available profile fields", async () => {
    await mount();
    await click("Explore");
    await click("Search countries");
    const input = host.querySelector<HTMLInputElement>(
      ".explore-search-field input",
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "Faroe");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Faroe Islands");
    const panel = host.querySelector(".mode-incoming .explore-card")!;
    expect(panel.querySelector("h1")?.textContent).toBe("Faroe Islands");
    expect(panel.textContent).toContain("Tórshavn");
    expect(panel.textContent).toContain("Faroese");
    expect(probe.focus.at(-1)).toEqual(member("wurl:FRO").focus);
    await act(async () => probe.props!.onSelect(member("wurl:NE-SOL")));
    expect(panel.querySelector("h1")?.textContent).toBe("Somaliland");
    expect(panel.querySelector(".overline")?.textContent?.trim()).toBe(
      "COUNTRY / TERRITORY",
    );
    expect(panel.textContent).toContain("Eastern Africa");
    expect(panel.textContent).not.toContain("Currency");
    expect(panel.textContent).not.toContain("—");
    await click("Data notes");
    expect(document.querySelector(".info-note-tooltip")?.textContent).toContain(
      "Natural Earth source estimate for 2014",
    );
    await act(async () => probe.props!.onSelect(member("wurl:PSE")));
    expect(panel.querySelector("h1")?.textContent).toBe("Palestine");
    expect(panel.querySelector(".overline")?.textContent?.trim()).toBe(
      "COUNTRY / TERRITORY",
    );
  });
  it("keeps Antarctica on its cached country surface without exposing or fetching placeholder regions", async () => {
    await mount();
    await click("Explore");
    const original = probe.renders.at(-1)!.find((r) => r.id === "wurl:ATA");
    await act(async () => probe.props!.onSelect(member("wurl:ATA")));
    const panel = host.querySelector(".mode-incoming .explore-card")!;
    expect(panel.querySelector("h1")?.textContent).toBe("Antarctica");
    expect(panel.querySelector(".regional-toggle")).toBeNull();
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).not.toContain(
      "/geography/ata-adm1.v1.json",
    );
    expect(probe.renders.at(-1)!.find((r) => r.id === "wurl:ATA")).toBe(
      original,
    );
    expect(probe.mounts).toBe(1);
  });

  it("prioritizes selected-country details, folds settings, and lazily loads a worldwide subdivision branch", async () => {
    await mount();
    await click("Explore");
    expect(host.querySelector(".mode-incoming .explore-controls")).toBeNull();
    await click("Globe settings");
    const popover = document.querySelector(
      '.explore-settings-popover[role="dialog"]',
    )!;
    expect(popover).not.toBeNull();
    expect(host.querySelector(".explore-card")!.contains(popover)).toBe(false);
    expect(popover.contains(document.activeElement)).toBe(true);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.querySelector(".explore-settings-popover")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector('.settings-button[aria-label="Globe settings"]'),
    );
    await click("Globe settings");
    const borderToggle = [
      ...document.querySelectorAll<HTMLLabelElement>(
        ".explore-settings-popover label",
      ),
    ]
      .find((label) => label.textContent?.trim() === "Country borders")!
      .querySelector<HTMLInputElement>("input")!;
    await act(async () => borderToggle.click());
    expect(probe.props!.showBorders).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:BRA")));
    const panel = host.querySelector(".mode-incoming .explore-card")!;
    expect(panel.querySelector("h1")?.textContent).toBe("Brazil");
    expect(panel.querySelector(".explore-controls")).toBeNull();
    expect(panel.querySelector(".explore-search-field")).toBeNull();
    expect(panel.querySelector(".explore-heading .detail-flag")).not.toBeNull();
    expect(panel.textContent).not.toContain("YOUR CURRENT PLACE");
    const toggle = panel.querySelector<HTMLInputElement>(
      ".regional-toggle input",
    )!;
    await act(async () => toggle.click());
    expect(
      probe.props!.regions.filter((r) => r.parentId === "wurl:BRA"),
    ).toHaveLength(27);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toContain(
      "/geography/bra-adm1.v1.json",
    );
    expect(probe.mounts).toBe(1);
  });

  it("automatically frames Explore country taps while water entry preserves the orbit", async () => {
    await mount();
    const before = probe.focus.length;
    await act(async () => probe.props!.onSurfaceTap!(member("wurl:CAN")));
    expect(location.pathname).toBe("/explore");
    expect(host.textContent).toContain("Ottawa");
    expect(probe.focus).toHaveLength(before + 1);
    expect(probe.focus.at(-1)).toEqual(member("wurl:CAN").focus);
    expect(probe.props!.motion).toBe(false);
    await act(async () => probe.props!.onSelect(member("wurl:JPN")));
    expect(host.textContent).toContain("Tokyo");
    expect(probe.focus).toHaveLength(before + 2);
    expect(probe.focus.at(-1)).toEqual(member("wurl:JPN").focus);
    await click("Zoom to country");
    expect(probe.focus.length).toBe(before + 3);
    await click("Home");
    const onHome = probe.focus.length;
    await act(async () => probe.props!.onSurfaceTap!());
    expect(location.pathname).toBe("/explore");
    expect(probe.focus).toHaveLength(onHome);
    expect(probe.props!.motion).toBe(true);
  });

  it("loads a versioned physical snapshot once and keeps the globe through toggles", async () => {
    await mount();
    await click("Explore");
    await click("Globe settings");
    const toggle = [...document.querySelectorAll("label")]
      .find((l) => l.textContent === "Rivers")!
      .querySelector("input")!;
    await act(async () => toggle.click());
    const calls = vi
      .mocked(fetch)
      .mock.calls.map((c) => String(c[0]))
      .filter((url) => url.startsWith("/geography/physical.v1.json"));
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatch(/\?v=[a-f0-9]{16}$/);
    await act(async () => toggle.click());
    await act(async () => toggle.click());
    expect(probe.mounts).toBe(1);
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter((c) =>
          String(c[0]).startsWith("/geography/physical.v1.json"),
        ),
    ).toHaveLength(1);
  });

  it("defaults capitals on and lazily loads only an enabled regional branch while preserving Earth", async () => {
    await mount();
    const canvas = host.querySelector("canvas");
    await click("Explore");
    expect(probe.props!.places.some((p) => p.kind === "capital")).toBe(true);
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    const toggle = [...document.querySelectorAll("label")]
      .find((l) => l.textContent === "Provinces & territories")!
      .querySelector("input")!;
    await act(async () => toggle.click());
    expect(
      probe.props!.regions.filter((r) => r.parentId === "wurl:CAN"),
    ).toHaveLength(13);
    expect(
      probe.props!.regions.find((r) => r.id === "wurl:CAN")?.displayBase,
    ).toBe(true);
    expect(probe.mounts).toBe(1);
    expect(host.querySelector("canvas")).toBe(canvas);
    expect(probe.props!.states["wurl:CAN"]).toBe("selected");
    const ontario = probe.props!.regions.find((r) => r.id === "wurl:CAN-ON")!;
    await act(async () => probe.props!.onSelect(ontario));
    expect(probe.props!.states["wurl:CAN"]).toBe("disabled");
    expect(probe.props!.states["wurl:CAN-ON"]).toBe("selected");
    expect(probe.props!.states["wurl:CAN-MB"]).toBe("disabled");
    expect(probe.focus.at(-1)).toEqual(ontario.focus);
    expect(host.textContent).toContain("Ontario");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(probe.props!.states["wurl:CAN"]).toBe("selected");
    expect(probe.props!.states["wurl:CAN-MB"]).toBe("selected");
    await click("Home");
    expect(probe.props!.regions).toHaveLength(242);
  });

  it("clears subdivisions when changing countries, including returning from Home, and ignores stale region taps", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    const toggle = host.querySelector<HTMLInputElement>(
      ".regional-toggle input",
    )!;
    await act(async () => toggle.click());
    const ontario = probe.props!.regions.find((r) => r.id === "wurl:CAN-ON")!;
    await act(async () => probe.props!.onSelect(ontario));
    expect(host.querySelector(".region-detail")?.textContent).toContain(
      "Ontario",
    );
    await act(async () => probe.props!.onSelect(member("wurl:RUS")));
    expect(host.querySelector(".explore-heading h1")?.textContent).toBe(
      "Russia",
    );
    expect(host.querySelector(".region-detail")).toBeNull();
    expect(probe.props!.states["wurl:RUS"]).toBe("selected");
    expect(
      host.querySelector<HTMLInputElement>(".regional-toggle input")?.checked,
    ).toBe(false);
    await act(async () => probe.props!.onSelect(ontario));
    expect(host.querySelector(".explore-heading h1")?.textContent).toBe(
      "Russia",
    );
    await click("Home");
    await act(async () => probe.props!.onSurfaceTap?.(member("wurl:UZB")));
    expect(host.querySelector(".explore-heading h1")?.textContent).toBe(
      "Uzbekistan",
    );
    expect(host.querySelector(".region-detail")).toBeNull();
    expect(probe.props!.states["wurl:UZB"]).toBe("selected");
  });

  it("frames small Explore countries from search and can refocus the same selection", async () => {
    await mount();
    await click("Explore");
    expect(document.querySelector(".explore-search-popup")).toBeNull();
    expect(host.querySelector(".explore-search-field")).toBeNull();
    await click("Search countries");
    const input = host.querySelector<HTMLInputElement>(
      ".explore-search-field input",
    )!;
    expect(document.activeElement).toBe(input);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, "a");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await click("Andorra");
    expect(document.querySelector(".explore-search-popup")).toBeNull();
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector(".mode-incoming .explore-country-search-trigger"),
    );
    expect(probe.focus.at(-1)).toEqual(member("wurl:AND").focus);
    expect(probe.focus.at(-1)!.altitude).toBeLessThan(0.1);
    const count = probe.focus.length;
    await click("Search another country");
    expect(
      document.querySelector('.explore-country-search[role="dialog"]'),
    ).not.toBeNull();
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(host.querySelector(".country-facts")?.textContent).toContain(
      "Andorra",
    );
    expect(probe.focus).toHaveLength(count);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.querySelector(".explore-country-search")).toBeNull();
    await act(async () => probe.props!.onSelect(member("wurl:AND")));
    expect(probe.focus).toHaveLength(count + 1);
    expect(probe.focus.at(-1)).toEqual(member("wurl:AND").focus);
  });

  it("dismisses Explore search with Escape or Close and restores focus without replacing Earth", async () => {
    await mount();
    await click("Explore");
    const earth = host.querySelector("canvas");
    await click("Search countries");
    const input = host.querySelector<HTMLInputElement>(
      ".explore-search-field input",
    )!;
    await act(async () => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector(".mode-incoming .explore-search-link"),
    );
    await click("Search countries");
    await click("Close search");
    expect(host.querySelector(".explore-search-field")).toBeNull();
    expect(document.activeElement).toBe(
      host.querySelector(".mode-incoming .explore-search-link"),
    );
    expect(host.querySelector("canvas")).toBe(earth);
    expect(probe.mounts).toBe(1);
  });

  it("offers local major cities only in Explore and keeps the canvas through layer toggles", async () => {
    await mount();
    expect(probe.props!.places).toHaveLength(0);
    const canvas = host.querySelector("canvas");
    await click("Explore");
    expect(probe.props!.placeContextual).toBe(true);
    expect(
      probe.props!.places.find((p) => p.name === "Los Angeles"),
    ).toBeDefined();
    await click("Globe settings");
    const checkbox = [
      ...document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
    ].find((input) =>
      input.closest("label")?.textContent?.includes("Major cities"),
    )!;
    expect(checkbox.checked).toBe(true);
    await act(async () => checkbox.click());
    expect(probe.props!.places.some((p) => p.kind === "city")).toBe(false);
    expect(probe.props!.places.some((p) => p.kind === "capital")).toBe(true);
    expect(host.querySelector("canvas")).toBe(canvas);
    await click("Home");
    await click("Play");
    expect(probe.props!.placeContextual).toBe(false);
    expect(host.querySelector("canvas")).toBe(canvas);
  });

  it("clears Explore's prior selection and keeps the live orientation on return", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:CAN")));
    expect(host.textContent).toContain("Canada");
    await click("Study");
    probe.currentView = { lat: 12, lng: 112, altitude: 1.65 };
    const flights = probe.focus.length;
    await click("Explore");
    expect(probe.currentView).toEqual({ lat: 12, lng: 112, altitude: 1.65 });
    expect(probe.focus).toHaveLength(flights);
    expect(probe.props!.states["wurl:CAN"]).not.toBe("selected");
    expect(probe.props!.motion).toBe(true);
    expect(probe.mounts).toBe(1);
  });

  it("keeps Explore qualifications in dismissible notes and labels Türkiye consistently", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:TUR")));
    expect(host.querySelector(".mode-incoming h1")?.textContent).toBe(
      "Türkiye",
    );
    expect(host.textContent).not.toContain("downloaded in October 2026");
    await click("Data notes");
    const note = document.querySelector<HTMLElement>(".info-note-tooltip")!;
    expect(note.textContent).toContain("not a population census date");
    expect(document.activeElement).toBe(note);
    expect(note.parentElement).toBe(document.body);
    await act(async () =>
      dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })),
    );
    expect(document.querySelector(".info-note-tooltip")).toBeNull();
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Data notes",
    );
    await click("Data notes");
    await click("Home");
    expect(document.querySelector(".info-note-tooltip")).toBeNull();
  });
});
