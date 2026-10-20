// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { JOURNEYS } from "../src/game/journeys";
import { QuestionSupport, QuestionAccuracy } from "../src/game/QuestionSupport";
import { GameShell } from "../src/game/GameShell";
import { AnswerForm } from "../src/game/AnswerForm";
import { initialGame } from "../src/game/state";
import { createQuestionContext } from "../src/game/questionPreparation";
import { COUNTRY_FACTS } from "../src/game/countryFacts";
import type { RegionFeature } from "../src/geography/types";
const regions = JSON.parse(
  readFileSync("public/geography/world.v1.json", "utf8"),
) as RegionFeature[];
const find = (id: string) => {
  const journey = JOURNEYS.find((j) => j.rounds.some((q) => q.id === id))!;
  const question = journey.rounds.find((q) => q.id === id)!;
  return { journey, question };
};
function markup(html: string) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return host;
}

describe("shared question support", () => {
  it("renders at most one support paragraph across the complete catalog", () => {
    for (const journey of JOURNEYS) {
      const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
      for (const [roundIndex, q] of journey.rounds.entries()) {
        const host = markup(
          renderToStaticMarkup(
            <GameShell
              journey={journey}
              context={context}
              game={{ ...initialGame, phase: "playing", roundIndex }}
              dispatch={() => {}}
              webgl
              frame={() => {}}
              onHome={() => {}}
              onStudy={() => {}}
            />,
          ),
        );
        expect(
          host.querySelectorAll(".question-support").length,
          q.id,
        ).toBeLessThanOrEqual(1);
        expect(
          host.querySelector(
            ".question-instruction,.commit-note,.order-instructions",
          ),
          q.id,
        ).toBeNull();
        expect(host.textContent, q.id).not.toMatch(
          /You can move your pin|Tap another spot|rings also count/,
        );
        expect(q.instruction, q.id).not.toMatch(
          /bullseye|first answer is final|rings also count/i,
        );
        if (q.commitment === "immediate")
          expect(
            host.querySelectorAll(".question-support-commitment"),
            q.id,
          ).toHaveLength(1);
      }
    }
  });

  it("keeps the tap cue and final-answer notice in inline spans of one paragraph", () => {
    const { question } = find("reggaeton-01-jamaica");
    const host = markup(
      renderToStaticMarkup(<QuestionSupport question={question} />),
    );
    expect(host.querySelectorAll("p")).toHaveLength(1);
    expect(host.textContent).toBe(
      "Tap the island. Your first answer is final.",
    );
    expect(host.querySelector("p")?.children[0].tagName).toBe("SPAN");
    expect(host.querySelector("p")?.children[1].className).toBe(
      "question-support-commitment",
    );
  });

  it("omits the duplicate tap sentence when the prompt already supplies the task", () => {
    const { question } = find("missing-borders-01-iberia");
    expect(question.prompt).toMatch(/Tap the territory/);
    expect(question.instruction).toBe("");
    expect(
      markup(renderToStaticMarkup(<QuestionSupport question={question} />))
        .textContent,
    ).toBe("Your first answer is final.");
  });

  it.each([
    ["bridge-golden-gate", 100, 200, 300],
    ["reggaeton-02-colon", 15, 30, 45],
    ["ffe-01-rapa-nui", 200, 450, 700],
    ["reggaeton-05-medellin", 100, 300, 500],
  ])(
    "derives the concise bullseye and full accuracy details from %s",
    (id, inner, middle, outer) => {
      const { question } = find(String(id));
      const body = markup(
        renderToStaticMarkup(<QuestionSupport question={question} />),
      );
      expect(body.textContent).toBe(
        `Aim for the bullseye (within ${inner} km)!`,
      );
      const info = markup(
        renderToStaticMarkup(<QuestionAccuracy question={question} />),
      );
      expect(info.querySelector("summary")?.textContent).toBe("Accuracy");
      expect(info.textContent).toContain(`Within ${outer} km counts.`);
      expect(info.textContent).toContain(`Close: within ${middle} km`);
      expect(info.querySelectorAll("li")).toHaveLength(3);
    },
  );

  it("keeps hidden-boundary exceptions without inventing distance bands", () => {
    const { question } = find("russia-neighbor-fin");
    expect(question.rule.type).toBe("pin-inside");
    expect(
      markup(renderToStaticMarkup(<QuestionSupport question={question} />))
        .textContent,
    ).toBe(question.instruction);
    expect(renderToStaticMarkup(<QuestionAccuracy question={question} />)).toBe(
      "",
    );
  });

  it("keeps compatibility radii honest and preserves exceptional end-game warnings", () => {
    const { question } = find("bridge-golden-gate");
    if (question.rule.type !== "pin-distance")
      throw Error("Expected distance pin");
    const untiered = {
      ...question,
      rule: { ...question.rule, tiers: undefined },
    };
    expect(
      markup(renderToStaticMarkup(<QuestionSupport question={untiered} />))
        .textContent,
    ).toBe("Aim within 300 km.");
    const { question: country } = find("reggaeton-01-jamaica");
    expect(
      markup(
        renderToStaticMarkup(
          <QuestionSupport question={{ ...country, failure: "end-game" }} />,
        ),
      ).textContent,
    ).toContain("one wrong answer ends this Journey");
  });

  it("does not show unusable pin guidance when WebGL is unavailable", () => {
    const { journey, question } = find("bridge-golden-gate");
    const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
    const host = markup(
      renderToStaticMarkup(
        <AnswerForm
          question={question}
          context={context}
          game={{ ...initialGame, phase: "playing" }}
          dispatch={() => {}}
          webgl={false}
        />,
      ),
    );
    expect(host.querySelector(".question-support")).toBeNull();
    expect(host.querySelector(".pin-unavailable")).not.toBeNull();
  });
});

it("makes full accuracy available before answering without spending help or unlocking sources", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const { journey } = find("bridge-golden-gate");
  const context = createQuestionContext(regions, COUNTRY_FACTS, journey);
  const dispatch = vi.fn();
  try {
    await act(async () =>
      root.render(
        <GameShell
          journey={journey}
          context={context}
          game={{ ...initialGame, phase: "playing" }}
          dispatch={dispatch}
          webgl
          frame={() => {}}
          onHome={() => {}}
          onStudy={() => {}}
        />,
      ),
    );
    await act(async () =>
      host
        .querySelector<HTMLButtonElement>(
          '[aria-label="Question information"]',
        )!
        .click(),
    );
    const dialog = document.querySelector('[role="dialog"]')!;
    const summaries = [...dialog.querySelectorAll("summary")];
    const accuracy = summaries.find((s) => s.textContent === "Accuracy")!;
    await act(async () => accuracy.click());
    expect(accuracy.parentElement?.hasAttribute("open")).toBe(true);
    expect(accuracy.parentElement?.textContent).toContain(
      "Within 300 km counts.",
    );
    expect(accuracy.parentElement?.textContent).toContain(
      "Close: within 200 km",
    );
    expect(dispatch).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain("Sources appear after you answer.");
    expect(dialog.querySelector("a")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    host.remove();
    vi.unstubAllGlobals();
  }
});
