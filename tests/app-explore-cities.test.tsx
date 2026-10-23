// @vitest-environment jsdom
import { click, host, member, mount, probe } from "./helpers/appShell";
import { act } from "react";
import { describe, expect, it } from "vitest";
import { EXPLORE_CITY_BY_ID, exploreCapital } from "../src/geography/places";

const panel = () => host.querySelector(".mode-incoming .explore-card")!;
describe("Explore city navigation (DOM only; mocked globe)", () => {
  it("opens a capital from its country card, shows sourced details, zooms once, and returns to country framing", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:FRA")));
    const before = probe.focus.length;
    await click("Paris");
    const paris = exploreCapital("wurl:FRA")!;
    expect(panel().getAttribute("aria-label")).toBe("City explorer");
    expect(panel().querySelector("h1")?.textContent).toBe("Paris");
    expect(document.activeElement).toBe(panel().querySelector("h1"));
    expect(probe.props!.states["wurl:FRA"]).toBe("hinted");
    expect(panel().textContent).toContain("Listed capital of");
    expect(panel().textContent).toContain("48.853° N");
    expect(panel().querySelector("a")?.href).toBe(
      "https://www.geonames.org/2988507/",
    );
    expect(probe.focus).toHaveLength(before + 1);
    expect(probe.focus.at(-1)).toMatchObject({
      lat: paris.lat,
      lng: paris.lng,
    });
    expect(probe.focus.at(-1)!.altitude).toBeLessThan(0.1);
    expect(probe.props!.places.filter((p) => p.id === paris.id)).toHaveLength(
      1,
    );
    expect(probe.props!.places.find((p) => p.id === paris.id)).toMatchObject({
      inspectionSelected: true,
      visualState: "selected",
    });
    expect(
      probe.props!.places.find((p) => p.id === paris.id)?.answerTarget,
    ).not.toBe(true);
    await click("Population notes");
    expect(document.querySelector(".info-note-tooltip")?.textContent).toContain(
      "not a census year",
    );
    await click("← Back to France");
    expect(panel().querySelector("h1")?.textContent).toBe("France");
    expect(document.activeElement?.textContent).toBe("Paris");
    expect(probe.focus.at(-1)).toEqual(member("wurl:FRA").focus);
    expect(probe.props!.places.some((p) => p.inspectionSelected)).toBe(false);
    expect(probe.mounts).toBe(1);
  });
  it("opens listed major cities and map markers through the same selection path, ignoring unknown markers", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:USA")));
    await click("New York City");
    expect(panel().querySelector("h1")?.textContent).toBe("New York City");
    expect(panel().textContent).not.toContain("Listed capital of");
    expect(probe.props!.placeInteraction).toBe(true);
    const hargeysa = EXPLORE_CITY_BY_ID.get("place:57289")!;
    await act(async () => probe.props!.onPlace(hargeysa));
    expect(panel().querySelector("h1")?.textContent).toBe("Hargeysa");
    expect(panel().textContent).toContain("Somaliland");
    expect(panel().textContent).toContain("GeoNames lists it under Somalia");
    const count = probe.focus.length;
    await act(async () => probe.props!.onPlace({ ...hargeysa, id: "unknown" }));
    expect(probe.focus).toHaveLength(count);
    await click("← Back to Somaliland");
    expect(panel().querySelector("h1")?.textContent).toBe("Somaliland");
    expect(panel().querySelector(".explore-city-list")?.textContent).toContain(
      "Hargeysa",
    );
  });
  it("matches territory capitals to points, preserves selection with layers disabled, and clears it on country or mode changes", async () => {
    await mount();
    await click("Explore");
    await act(async () => probe.props!.onSelect(member("wurl:FRO")));
    await click("Tórshavn");
    expect(panel().querySelector("h1")?.textContent).toBe("Tórshavn");
    await click("Globe settings");
    for (const text of ["Capital markers & names", "Major cities"]) {
      const input = [
        ...document.querySelectorAll(".explore-settings-popover label"),
      ]
        .find((label) => label.textContent?.trim() === text)
        ?.querySelector<HTMLInputElement>("input");
      expect(input).toBeDefined();
      if (input?.checked) await act(async () => input.click());
    }
    expect(probe.props!.places).toHaveLength(1);
    expect(probe.props!.places[0]).toMatchObject({
      name: "Tórshavn",
      inspectionSelected: true,
    });
    await act(async () => probe.props!.onSelect(member("wurl:GRL")));
    expect(panel().querySelector("h1")?.textContent).toBe("Greenland");
    expect(probe.props!.places).toHaveLength(0);
    await click("Nuuk");
    expect(panel().querySelector("h1")?.textContent).toBe("Nuuk");
    await click("Home");
    expect(probe.props!.placeInteraction).toBe(false);
    await click("Explore");
    expect(panel().querySelector(".city-detail")).toBeNull();
    expect(probe.props!.places.some((p) => p.inspectionSelected)).toBe(false);
  });
});
