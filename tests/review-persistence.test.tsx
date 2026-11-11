// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { usePlayerProgress } from "../src/app/usePlayerProgress";
import { JOURNEY_INDEX } from "../src/game/journeyRegistry";
import { createStudySave } from "../src/app/progressSaves";
import { emptyStudy } from "../src/study/engine";

vi.mock("../src/app/useProgressSync", () => ({
  useProgressSync: () => ({ hydrated: true, ready: true, retry: () => {} }),
}));
let host: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let progress: ReturnType<typeof usePlayerProgress>;
const accessToken = async () => undefined;
function Probe({ enabled }: { enabled: boolean }) {
  progress = usePlayerProgress({
    enabled,
    accessToken,
    catalog: JOURNEY_INDEX,
    catalogReady: true,
  });
  return null;
}
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  localStorage.clear();
  vi.unstubAllGlobals();
});
it("opens saves on leaving an initial Review session and pauses writes when returning", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  localStorage.clear();
  const store = createStudySave();
  store.save({
    ...emptyStudy,
    settings: { ...emptyStudy.settings, length: 50 },
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const before = store.load();
  await act(async () => root.render(<Probe enabled={false} />));
  expect(store.load()).toEqual(before);
  await act(async () => root.render(<Probe enabled />));
  expect(progress.study.settings.length).toBe(50);
  await act(async () =>
    progress.setStudy((save) => ({
      ...save,
      settings: { ...save.settings, length: 10 },
    })),
  );
  expect(store.load().settings.length).toBe(10);
  await act(async () => root.render(<Probe enabled={false} />));
  await act(async () =>
    progress.setStudy((save) => ({
      ...save,
      settings: { ...save.settings, length: 20 },
    })),
  );
  expect(store.load().settings.length).toBe(10);
});
