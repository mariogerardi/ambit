// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JourneyWorkbench } from "../review/JourneyWorkbench";
import { AccountMenu } from "../src/app/AccountMenu";
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
it("keeps workbench access in the signed-in Admin menu", async () => {
  await act(async () =>
    root.render(
      <AppMenu path="/" onNavigate={() => {}} onCredits={() => {}} />,
    ),
  );
  await click("Open menu");
  expect(host.querySelector('a[href="/review/journeys.html"]')).toBeNull();
  for (const admin of [false, true]) {
    await act(async () =>
      root.render(
        <AccountMenu
          key={String(admin)}
          signedIn
          admin={admin}
          path="/"
          onNavigate={() => {}}
        />,
      ),
    );
    await click("Account");
    expect(!!host.querySelector('a[href="/review/journeys.html"]')).toBe(admin);
  }
});
it("previews an unregistered source without writing and commits only from its reviewed action", async () => {
  const preview = {
    title: journey.title,
    id: journey.id,
    module: "powerToThePeopleJourney.ts",
    route: "/journey/workbench-test",
    revision: "reviewed",
    files: ["src/game/journeys.ts"],
  };
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify(preview), { status: 200 }));
  await act(async () =>
    root.render(
      <JourneyWorkbench
        journey={journey}
        filename={preview.module}
        modules={[preview.module]}
        seed={1}
        request={request}
      />,
    ),
  );
  expect(request).not.toHaveBeenCalled();
  expect(host.textContent).toContain("held out of automatic Daily selection");
  await click("Preview registration");
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining("?module=powerToThePeopleJourney.ts"),
    undefined,
  );
  expect(host.textContent).toContain("src/game/journeys.ts");
  expect(request).toHaveBeenCalledTimes(1);
  request.mockResolvedValue(
    new Response(JSON.stringify(preview), { status: 200 }),
  );
  await click("Register in local catalog");
  expect(request.mock.calls[1][1]).toMatchObject({
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  expect(JSON.parse(request.mock.calls[1][1]!.body as string)).toMatchObject({
    revision: "reviewed",
    route: preview.route,
  });
  expect(host.textContent).toContain("Registered in the local catalog");
});
it("shows audit errors and never offers a commit after a failed preview", async () => {
  const request = vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        error: "Fix the Journey audit before registering: missing target",
      }),
      { status: 400 },
    ),
  );
  await act(async () =>
    root.render(
      <JourneyWorkbench
        journey={journey}
        filename="powerToThePeopleJourney.ts"
        modules={[]}
        seed={1}
        request={request}
      />,
    ),
  );
  await click("Preview registration");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "missing target",
  );
  expect(host.textContent).not.toContain("Register in local catalog");
  expect(request).toHaveBeenCalledTimes(1);
});

it("switches Journey immediately from the visible selector and submits the current seed", async () => {
  const submit = vi
    .spyOn(HTMLFormElement.prototype, "requestSubmit")
    .mockImplementation(() => {});
  try {
    await act(async () =>
      root.render(
        <JourneyWorkbench
          journey={journey}
          filename="powerToThePeopleJourney.ts"
          modules={["powerToThePeopleJourney.ts", "bareMinimumJourney.ts"]}
          seed={17}
          request={vi.fn()}
        />,
      ),
    );
    const select = host.querySelector<HTMLSelectElement>(
      'select[name="module"]',
    )!;
    expect(select.closest("details")).toBeNull();
    await act(async () => {
      select.value = "bareMinimumJourney.ts";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(submit).toHaveBeenCalledOnce();
    expect([...new FormData(select.form!).entries()]).toEqual([
      ["module", "bareMinimumJourney.ts"],
      ["seed", "17"],
    ]);
  } finally {
    submit.mockRestore();
  }
});

it("opens a recipe sandbox without offering catalog registration", async () => {
  const submit = vi
    .spyOn(HTMLFormElement.prototype, "requestSubmit")
    .mockImplementation(() => {});
  try {
    await act(async () =>
      root.render(
        <JourneyWorkbench
          journey={{ ...journey, title: "Capital pin" }}
          filename="powerToThePeopleJourney.ts"
          modules={["powerToThePeopleJourney.ts"]}
          recipes={[
            { id: "recipe:pin", title: "Capital pin" },
            { id: "recipe:map-multiple", title: "Country pair" },
          ]}
          recipeId="pin"
          seed={17}
          request={vi.fn()}
        />,
      ),
    );
    expect(host.textContent).not.toContain("Catalog registration");
    expect(
      host.querySelector('option[value="powerToThePeopleJourney.ts"]')
        ?.textContent,
    ).toBe("Power to the People");
    const select = host.querySelector<HTMLSelectElement>(
      'select[name="recipe"]',
    )!;
    expect(select.value).toBe("pin");
    await act(async () => {
      select.value = "map-multiple";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(submit).toHaveBeenCalledOnce();
    expect([...new FormData(select.form!).entries()]).toEqual([
      ["recipe", "map-multiple"],
      ["seed", "17"],
    ]);
  } finally {
    submit.mockRestore();
  }
});
