// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JourneyWorkbench } from "../review/JourneyWorkbench";
import { JourneyCatalogControls } from "../review/JourneyCatalogControls";
import { newestJourney } from "../src/game/journeyRegistry";
import { AppMenu } from "../src/app/AppMenu";
import { POWER_TO_THE_PEOPLE_JOURNEY as template } from "../src/game/powerToThePeopleJourney";
const journey = { ...template, id: "workbench-test-v1" };
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find(
    (b) =>
      b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
  )!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}
it("previews catalog edits before an explicit write and keeps removal separate from deleting source", async () => {
  let registered = false;
  const fetch = vi.fn(async (url: string, options?: RequestInit) => {
    const query = options?.body
      ? JSON.parse(options.body as string)
      : Object.fromEntries(new URL(url, "http://localhost").searchParams);
    if (query.action === "status")
      return Response.json({ registered, canRemove: registered });
    if (options?.method === "POST") registered = query.action === "add";
    return Response.json({
      action: query.action,
      module: "testJourney.ts",
      route: "/journey/test",
      title: "Test Journey",
      id: "test-v1",
      revision: "revision",
      files: [],
    });
  });
  vi.stubGlobal("fetch", fetch);
  await act(async () =>
    root.render(<JourneyCatalogControls filename="testJourney.ts" />),
  );
  const details = host.querySelector("details")!;
  await act(async () => {
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
  });
  expect(host.textContent).toContain("Not registered");
  await click("Preview registration");
  expect(
    fetch.mock.calls.some(([, options]) => options?.method === "POST"),
  ).toBe(false);
  await click("Cancel");
  expect(registered).toBe(false);
  await click("Preview registration");
  await click("Add to catalog");
  expect(host.textContent).toContain("Automatic rotation is off");
  await click("Preview removal");
  expect(registered).toBe(true);
  await click("Remove from catalog");
  expect(registered).toBe(false);
  expect(host.textContent).toContain("Source kept for review");
});
it("shows committed catalog entries without offering unsafe removal", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        registered: true,
        canRemove: false,
        route: "/journey/test",
        reason: "Existing assignments and saves must be retained.",
      }),
    ),
  );
  await act(async () =>
    root.render(<JourneyCatalogControls filename="testJourney.ts" />),
  );
  await act(async () => {
    const details = host.querySelector("details")!;
    details.open = true;
    details.dispatchEvent(new Event("toggle"));
  });
  expect(host.textContent).toContain("Registered");
  expect(host.textContent).toContain("Existing assignments and saves");
  expect(host.textContent).not.toContain("Preview removal");
});
it("keeps administration access authorized throughout the app, including Your Space", async () => {
  for (const [admin, path, visible] of [
    [false, "/", false],
    [false, "/account?tab=profile", false],
    [true, "/", true],
    [true, "/account", true],
    [true, "/account?tab=profile", true],
  ] as const) {
    await act(async () =>
      root.render(
        <AppMenu
          key={`${admin}${path}`}
          admin={admin}
          path={path}
          onNavigate={() => {}}
          onCredits={() => {}}
        />,
      ),
    );
    await click("Open menu");
    expect(!!host.querySelector('[data-dd-action-name="Menu Admin"]')).toBe(
      visible,
    );
    expect(!!host.querySelector('a[href="/review/journeys.html"]')).toBe(
      visible,
    );
  }
});
it("chooses the newest catalog authoring date regardless of catalog order or rotation eligibility", () => {
  const entries = [
    { ...newestJourney()!, id: "older", title: "A", addedAt: "2026-01-01" },
    {
      ...newestJourney()!,
      id: "newest",
      title: "Z",
      addedAt: "2026-11-09",
      dailyEligible: false,
    },
    { ...newestJourney()!, id: "middle", title: "M", addedAt: "2026-10-01" },
  ];
  expect(newestJourney(entries)?.id).toBe("newest");
  expect(newestJourney(entries.reverse())?.id).toBe("newest");
});
it("switches Journey through app navigation while keeping technical URL context", async () => {
  const navigate = vi.fn();
  history.replaceState(
    null,
    "",
    "/review/journeys.html?module=powerToThePeopleJourney.ts&question=old&state=missed&theme=dusk",
  );
  await act(async () =>
    root.render(
      <JourneyWorkbench
        journey={journey}
        filename="powerToThePeopleJourney.ts"
        modules={["powerToThePeopleJourney.ts", "bareMinimumJourney.ts"]}
        seed={17}
        onNavigate={navigate}
      />,
    ),
  );
  const select = host.querySelector<HTMLSelectElement>(
    'select[name="module"]',
  )!;
  await act(async () => {
    select.value = "bareMinimumJourney.ts";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(navigate).toHaveBeenCalledWith(
    "/review/journeys.html?module=bareMinimumJourney.ts&theme=dusk&seed=17",
  );
  expect(host.querySelector("form")).toBeNull();
});

it("sorts Journey sources by their displayed titles", async () => {
  await act(async () =>
    root.render(
      <JourneyWorkbench
        journey={template}
        filename="powerToThePeopleJourney.ts"
        modules={[
          "powerToThePeopleJourney.ts",
          "howAmericaAddsUpJourney.ts",
          "northAmericaJourney.ts",
          "fifteenthJourney.ts",
          "bareMinimumJourney.ts",
        ]}
        seed={1}
        onNavigate={vi.fn()}
      />,
    ),
  );
  const options = [
    ...host.querySelectorAll<HTMLSelectElement>('select[name="module"] option'),
  ];
  expect(options.map((option) => option.textContent)).toEqual([
    "Choose a Journey",
    "A Continent in Pieces",
    "Bare Minimum",
    "How America Adds Up",
    "On Russia’s Doorstep",
    "Power to the People",
  ]);
});

it("keeps recipe previews available by URL without exposing development or catalog controls", async () => {
  await act(async () =>
    root.render(
      <JourneyWorkbench
        journey={{ ...journey, title: "Capital pin" }}
        filename="powerToThePeopleJourney.ts"
        modules={["powerToThePeopleJourney.ts"]}
        recipeId="pin"
        seed={17}
        onNavigate={vi.fn()}
      />,
    ),
  );
  expect(
    host.querySelector('select[name="module"]')?.getAttribute("value"),
  ).toBeNull();
  expect(
    host.querySelector('select[name="module"] option:checked')?.textContent,
  ).toBe("Choose a Journey");
  expect(
    host.querySelectorAll("button, details, input:not([type=hidden])"),
  ).toHaveLength(0);
  expect(host.textContent).not.toContain("Catalog registration");
});
