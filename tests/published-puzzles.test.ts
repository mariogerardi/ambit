import { afterEach, describe, expect, it, vi } from "vitest";
import {
  publishedPuzzles,
  readPublishedPuzzles,
} from "../src/app/publishedPuzzles";
import { JOURNEYS } from "../src/game/journeys";
afterEach(() => vi.unstubAllGlobals());
describe("read-only published puzzle compatibility", () => {
  it("loads only previously published five-question packs, ignoring drafts and authoring metadata", () => {
    const journey = { ...JOURNEYS[0], id: "studio:published:legacy" };
    const value = {
      questions: [{ prompt: "unused draft" }],
      assets: [],
      published: [{ id: journey.id, revision: 2, journey }],
    };
    const copy = JSON.stringify(value);
    expect(publishedPuzzles(value)).toEqual([
      { id: journey.id, revision: 2, journey },
    ]);
    expect(JSON.stringify(value)).toBe(copy);
    expect(
      publishedPuzzles({
        published: [
          { id: journey.id, revision: 2, journey: { ...journey, rounds: [] } },
        ],
      }),
    ).toEqual([]);
  });
  it("gives older published Journeys a title without changing their saved data", () => {
    const { title: _title, ...legacy } = JOURNEYS[0];
    const packs = publishedPuzzles({
      published: [{ id: legacy.id, revision: 1, journey: legacy }],
    });
    expect(packs[0].journey.title).toBe("A local Journey");
    expect(legacy).not.toHaveProperty("title");
  });
  it("handles unavailable or security-blocked local storage", async () => {
    vi.stubGlobal("indexedDB", undefined);
    expect(await readPublishedPuzzles()).toEqual([]);
    vi.stubGlobal("indexedDB", {
      open: () => {
        throw Error("Security error");
      },
    });
    expect(await readPublishedPuzzles()).toEqual([]);
  });
  it("opens only a readonly transaction and never writes or loads drafts", async () => {
    const journey = { ...JOURNEYS[0], id: "studio:published:legacy" };
    const read: Record<string, unknown> = {
      result: {
        questions: [],
        published: [{ id: journey.id, revision: 1, journey }],
      },
    };
    const get = vi.fn(() => read);
    const transaction = vi.fn(() => ({ objectStore: () => ({ get }) }));
    const request: Record<string, unknown> = {
      result: {
        objectStoreNames: { contains: () => true },
        transaction,
        close: vi.fn(),
      },
    };
    vi.stubGlobal("indexedDB", { open: () => request });
    const result = readPublishedPuzzles();
    (request.onsuccess as () => void)();
    (read.onsuccess as () => void)();
    expect((await result)[0].journey).toBe(journey);
    expect(transaction).toHaveBeenCalledWith("workspace", "readonly");
    expect(get).toHaveBeenCalledWith("data");
  });
});
