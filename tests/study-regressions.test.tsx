// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { StudyPanel } from "../src/study/StudyPanel";
import { StudyHistory } from "../src/study/StudyHistory";
import { StudyResults } from "../src/study/StudyResults";
import {
  defaultSettings,
  emptyStudy,
  startStudy,
  studyReducer,
  studyComplete,
  studyReplayTargets,
  countryName,
  validStudy,
} from "../src/study/engine";
import type { StudySession, StudySettings } from "../src/study/engine";

const settings: StudySettings = {
  ...defaultSettings,
  scope: "custom",
  countryIds: ["wurl:CAN", "wurl:BRA"],
  length: "all",
  autoAdvance: false,
};
describe("Study completion, replay, and alternate answers", () => {
  it("does not label the final unanswered question completed, including after finishing", () => {
    let session = startStudy(settings, 42);
    session = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    session = studyReducer(session, { type: "next" });
    expect(session.remaining).toEqual([]);
    expect(studyComplete(session)).toBe(false);
    const ended = studyReducer(session, { type: "finish" });
    expect(studyComplete(ended)).toBe(false);
    const html = renderToStaticMarkup(
      <StudyHistory
        records={[{ id: "ended", finishedAt: 42, session: ended }]}
        onBack={() => {}}
        onView={() => {}}
        onStart={() => {}}
      />,
    );
    expect(html).toContain("Ended early");
    expect(html).not.toContain("Completed");
    session = studyReducer(session, {
      type: "pick",
      id: session.prompt.targetId,
    });
    expect(studyComplete(session)).toBe(true);
    expect(studyReducer(session, { type: "next" }).phase).toBe("summary");
    expect(
      studyComplete(startStudy({ ...settings, countryIds: ["wurl:CAN"] }, 42)),
    ).toBe(false);
  });
  it("retains exact targeted coverage through storage, Repeat, and history Replay", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div"),
      root = createRoot(host);
    const targets = [
      { targetId: "wurl:CAN", topic: "countries" as const },
      { targetId: "wurl:BRA", topic: "flags" as const },
    ];
    let session = startStudy(
      { ...settings, topics: ["countries", "flags"] },
      42,
      targets,
    );
    while (session.phase !== "summary") {
      session = studyReducer(session, {
        type: "pick",
        id: session.prompt.targetId,
      });
      session = studyReducer(session, { type: "next" });
    }
    session = JSON.parse(JSON.stringify(session)) as StudySession;
    expect(
      validStudy({ version: 1, settings: session.settings, session }),
    ).toBe(true);
    const onStart = vi.fn();
    try {
      await act(async () =>
        root.render(
          <StudyResults
            session={session}
            onSetup={() => {}}
            onStart={onStart}
          />,
        ),
      );
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>(".study-result-actions button")!
          .click(),
      );
      expect(onStart).toHaveBeenLastCalledWith(session.settings, targets);
      await act(async () =>
        root.render(
          <StudyHistory
            records={[{ id: "review", finishedAt: 42, session }]}
            onBack={() => {}}
            onView={() => {}}
            onStart={onStart}
          />,
        ),
      );
      await act(async () =>
        host
          .querySelector<HTMLButtonElement>('[aria-label^="Replay session"]')!
          .click(),
      );
      expect(onStart).toHaveBeenLastCalledWith(session.settings, targets);
      const replay = startStudy(
        ...([session.settings, 43, studyReplayTargets(session)] as const),
      );
      expect(replay.remaining).toHaveLength(1);
      const legacy = { ...session, coverage: undefined };
      expect(
        new Set(
          studyReplayTargets(legacy)?.map((t) => `${t.targetId}/${t.topic}`),
        ),
      ).toEqual(new Set(["wurl:CAN/countries", "wurl:BRA/flags"]));
    } finally {
      await act(async () => root.unmount());
      vi.unstubAllGlobals();
    }
  });
  it(
    "offers keyboard answers on map prompts when WebGL is available",
    async () => {
      const webgl = true;
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      const host = document.createElement("div"),
        root = createRoot(host);
      const initial = startStudy(
        {
          ...settings,
          topics: ["capitals"],
          styles: { ...settings.styles, capitals: "map" },
        },
        42,
      );
      function Harness() {
        const [session, setSession] = useState(initial);
        return (
          <StudyPanel
            save={{ ...emptyStudy, settings: initial.settings, session }}
            setup={false}
            active
            webgl={webgl}
            onSettings={() => {}}
            onStart={() => {}}
            onSetup={() => {}}
            onAction={(action) =>
              setSession((current) => studyReducer(current, action))
            }
          />
        );
      }
      try {
        await act(async () => root.render(<Harness />));
        const details = host.querySelector("details")!;
        expect(details.open).toBe(!webgl);
        if (webgl)
          await act(async () => {
            details.open = true;
          });
        const input = host.querySelector("input")!;
        await act(async () => {
          Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            "value",
          )!.set!.call(input, countryName(initial.prompt.targetId));
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
        await act(async () =>
          host
            .querySelector("form")!
            .dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            ),
        );
        expect(host.textContent).toContain("Well spotted.");
        expect(host.textContent).toContain(
          countryName(initial.prompt.targetId),
        );
        expect(host.querySelector(".round-feedback")).not.toBeNull();
      } finally {
        await act(async () => root.unmount());
        vi.unstubAllGlobals();
      }
    },
  );
});

it.each([false, true])(
  "keeps edit/finish in the cog and reporting in question information (compact=%s)",
  async (compact) => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div"),
      root = createRoot(host);
    document.body.append(host);
    const session = startStudy(settings, 42),
      onReport = vi.fn(),
      onAction = vi.fn();
    const click = async (text: string) =>
      act(async () => {
        const button = [
          ...document.querySelectorAll<HTMLButtonElement>("button"),
        ].find(
          (b) =>
            b.textContent?.trim() === text ||
            b.getAttribute("aria-label") === text,
        );
        expect(button).toBeDefined();
        button!.click();
      });
    try {
      await act(async () =>
        root.render(
          <StudyPanel
            compact={compact}
            active
            webgl
            setup={false}
            save={{ ...emptyStudy, session }}
            onSettings={vi.fn()}
            onStart={vi.fn()}
            onSetup={vi.fn()}
            onAction={onAction}
            onReport={onReport}
          />,
        ),
      );
      expect(host.textContent).not.toContain("Finish session");
      expect(host.querySelector("input")).toBeNull();
      await click("Session settings");
      await click("Edit this session");
      expect(
        document.querySelector(".study-options-dialog")?.textContent,
      ).toContain("Apply & resume");
      await click("Back to session actions");
      await click("Close Session settings");
      await click("Question information");
      await click("Report this question");
      expect(onReport).toHaveBeenCalledWith(session.prompt);
      expect(document.querySelector("[role=dialog]")).toBeNull();
      await click("Session settings");
      await click("Finish this session");
      expect(onAction).toHaveBeenCalledWith({ type: "finish" });
      expect(document.querySelector("[role=dialog]")).toBeNull();
    } finally {
      await act(async () => root.unmount());
      host.remove();
      vi.unstubAllGlobals();
    }
  },
);

it.each([true, false])(
  "does not offer the supplied country name as a map answer (WebGL: %s)",
  (webgl) => {
    const session = startStudy(settings, 42);
    const html = renderToStaticMarkup(
      <StudyPanel
        save={{ ...emptyStudy, session }}
        setup={false}
        active
        webgl={webgl}
        onSettings={vi.fn()}
        onStart={vi.fn()}
        onSetup={vi.fn()}
        onAction={vi.fn()}
      />,
    );
    expect(html).not.toContain("Answer by name");
    expect(html).not.toContain("<input");
    if (!webgl) expect(html).toContain("3D globe is required");
  },
);
it("gives mobile correct-answer feedback time to read before automatic advance", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  const host = document.createElement("div"),
    root = createRoot(host);
  let session = startStudy({ ...settings, autoAdvance: true }, 42);
  session = studyReducer(session, {
    type: "pick",
    id: session.prompt.targetId,
  });
  const onAction = vi.fn();
  try {
    await act(async () =>
      root.render(
        <StudyPanel
          compact
          save={{ ...emptyStudy, session }}
          setup={false}
          active
          webgl
          onSettings={vi.fn()}
          onStart={vi.fn()}
          onSetup={vi.fn()}
          onAction={onAction}
        />,
      ),
    );
    await act(async () => vi.advanceTimersByTime(1000));
    expect(onAction).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(800));
    expect(onAction).toHaveBeenCalledWith({ type: "next" });
  } finally {
    await act(async () => root.unmount());
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
