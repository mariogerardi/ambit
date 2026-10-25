// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyResults } from "../src/study/StudyResults";
import {
  answerLabel,
  defaultSettings,
  emptyStudy,
  missedStudyAnswers,
  startStudy,
  studyReducer,
  studyStates,
  studyReplayTargets,
  validStudy,
} from "../src/study/engine";
import type {
  StudyAnswer,
  StudyReviewTarget,
  StudySettings,
} from "../src/study/engine";

const settings: StudySettings = {
  ...defaultSettings,
  scope: "custom",
  countryIds: ["wurl:ZMB", "wurl:LBR"],
  topics: ["countries", "capitals"],
  length: "all",
  autoAdvance: false,
  styles: { countries: "map", capitals: "typing", flags: "map" },
};
function answer(
  targetId: string,
  topic: "countries" | "capitals",
  correct = false,
): StudyAnswer {
  return {
    prompt: {
      targetId,
      topic,
      style: topic === "countries" ? "map" : "typing",
      choices: [],
      ordinal: 0,
    },
    selectedId: topic === "countries" ? "wurl:LBR" : undefined,
    response: topic === "countries" ? "Liberia" : "Wrong capital",
    correct,
  };
}
function summary(
  history = [answer("wurl:ZMB", "countries"), answer("wurl:LBR", "capitals")],
) {
  return { ...startStudy(settings, 24), phase: "summary" as const, history };
}
afterEach(() => vi.unstubAllGlobals());

describe("Study results and targeted review", () => {
  it("clears recovered country/topic pairs and keeps unresolved topics red", () => {
    const session = summary([
      answer("wurl:ZMB", "countries"),
      answer("wurl:ZMB", "capitals"),
      answer("wurl:ZMB", "countries", true),
    ]);
    expect(missedStudyAnswers(session).map((a) => a.prompt.topic)).toEqual([
      "capitals",
    ]);
    expect(studyStates(session)["wurl:ZMB"]).toBe("incorrect");
    session.history.push(answer("wurl:ZMB", "capitals", true));
    expect(missedStudyAnswers(session)).toEqual([]);
    expect(studyStates(session)["wurl:ZMB"]).toBe("correct");
  });
  it("replaces duplicate recap copy with one score and equally explicit next actions", () => {
    const html = renderToStaticMarkup(
      <StudyResults
        session={summary()}
        onSetup={() => {}}
        onStart={() => {}}
      />,
    );
    expect(html).toContain("Session <em>complete.</em>");
    expect(html).toContain("2 places to review");
    expect(html).toContain("Repeat this session");
    expect(html).not.toMatch(
      /Correct answer:|Find Zambia|A LITTLE MORE FAMILIAR|Look what you learned|→/,
    );
    const empty = renderToStaticMarkup(
      <StudyResults
        session={summary([])}
        onSetup={() => {}}
        onStart={() => {}}
      />,
    );
    expect(empty).toContain("No answers yet.");
    expect(empty).not.toContain("NaN");
  });
  it("reserves clean sweeps for nonempty perfect scores and pluralizes missed answers", () => {
    const render = (history: StudyAnswer[]) => renderToStaticMarkup(
      <StudyResults session={summary(history)} onSetup={() => {}} onStart={() => {}} />,
    );
    expect(render([answer("wurl:ZMB", "countries", true)])).toContain("A clean sweep.");
    expect(render([])).not.toContain("A clean sweep.");
    const recovered = render([
      answer("wurl:ZMB", "countries"),
      answer("wurl:ZMB", "countries", true),
    ]);
    expect(recovered).not.toContain("A clean sweep.");
    expect(recovered).toContain("No places left to review.");
    expect(render([answer("wurl:ZMB", "countries")])).toContain("Review missed answer<");
    expect(render([
      answer("wurl:ZMB", "countries"),
      answer("wurl:ZMB", "capitals"),
    ])).toContain("Review missed answers<");
  });
  it("locates a selected missed place and reviews only the exact missed pairs once", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div"),
      root = createRoot(host);
    const onLocate = vi.fn(),
      onStart =
        vi.fn<(s: StudySettings, targets?: StudyReviewTarget[]) => void>();
    const session = summary();
    try {
      await act(async () =>
        root.render(
          <StudyResults
            session={session}
            onSetup={() => {}}
            onStart={onStart}
            onLocate={onLocate}
          />,
        ),
      );
      await act(async () =>
        host.querySelector<HTMLButtonElement>(".study-review-place")!.click(),
      );
      expect(onLocate).toHaveBeenCalledWith(session.history[0]);
      expect(host.textContent).toContain("Your pick: Liberia");
      await act(async () =>
        host.querySelector<HTMLButtonElement>(".primary-button")!.click(),
      );
      const [reviewSettings, targets] = onStart.mock.calls[0];
      expect(reviewSettings.length).toBe("all");
      expect(reviewSettings.revisitMissed).toBe(false);
      let review = startStudy(reviewSettings, 24, targets);
      const seen: string[] = [];
      while (review.phase !== "summary") {
        seen.push(`${review.prompt.targetId}/${review.prompt.topic}`);
        review =
          review.prompt.style === "map"
            ? studyReducer(review, { type: "pick", id: review.prompt.targetId })
            : studyReducer(
                studyReducer(review, {
                  type: "text",
                  value: answerLabel(review.prompt),
                }),
                { type: "submit" },
              );
        review = studyReducer(review, { type: "next" });
      }
      expect(seen.sort()).toEqual(["wurl:LBR/capitals", "wurl:ZMB/countries"]);
      expect(
        validStudy({
          ...emptyStudy,
          settings: reviewSettings,
          session: review,
        }),
      ).toBe(true);
      await act(async () =>
        host.querySelector<HTMLButtonElement>(".study-repeat-button")!.click(),
      );
      expect(onStart.mock.calls[1]).toEqual([
        session.settings,
        studyReplayTargets(session),
      ]);
    } finally {
      await act(async () => root.unmount());
    }
  });
  it("makes a one-country choice review answerable and rejects invalid review targets", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const host = document.createElement("div"),
      root = createRoot(host);
    const onStart =
      vi.fn<(s: StudySettings, targets?: StudyReviewTarget[]) => void>();
    const session = summary([answer("wurl:ZMB", "capitals")]);
    session.settings.styles.capitals = "choices";
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
        host.querySelector<HTMLButtonElement>(".primary-button")!.click(),
      );
      const [reviewSettings, targets] = onStart.mock.calls[0];
      const review = startStudy(reviewSettings, 24, targets);
      expect(review.prompt.style).toBe("typing");
      expect(
        validStudy({
          ...emptyStudy,
          settings: reviewSettings,
          session: review,
        }),
      ).toBe(true);
      expect(() =>
        startStudy(reviewSettings, 24, [
          { targetId: "wurl:RUS", topic: "capitals" },
        ]),
      ).toThrow();
    } finally {
      await act(async () => root.unmount());
    }
  });
});
