import { useEffect, useState } from "react";
import { isRecord } from "./storage";
import type { Journey } from "../game/questions";

export interface PublishedPuzzle {
  id: string;
  revision: number;
  journey: Journey;
}
/** Read-only compatibility for daily packs published before the editor was removed.
 * Drafts and editor metadata are never loaded or rewritten. */
export function publishedPuzzles(value: unknown): PublishedPuzzle[] {
  if (!isRecord(value) || !Array.isArray(value.published)) return [];
  return value.published.flatMap((p): PublishedPuzzle[] => {
    if (!isRecord(p) || !isRecord(p.journey)) return [];
    const j = p.journey;
    if (
      typeof p.id !== "string" ||
      p.id !== j.id ||
      !Number.isInteger(p.revision) ||
      typeof j.description !== "string" ||
      !Array.isArray(j.rounds) ||
      j.rounds.length !== 5 ||
      !j.rounds.every(
        (q) =>
          isRecord(q) &&
          typeof q.id === "string" &&
          typeof q.prompt === "string" &&
          typeof q.mode === "string" &&
          isRecord(q.rule) &&
          (q.map === undefined || isRecord(q.map)) &&
          isRecord(q.focus) &&
          isRecord(q.source),
      )
    )
      return [];
    return [
      {
        id: p.id,
        revision: Number(p.revision),
        journey: (typeof j.title === "string" && j.title.trim()
          ? j
          : { ...j, title: "A local Journey" }) as unknown as Journey,
      },
    ];
  });
}
export function readPublishedPuzzles(): Promise<PublishedPuzzle[]> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve([]);
    let finished = false;
    const finish = (items: PublishedPuzzle[]) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(items);
    };
    const timer = setTimeout(() => finish([]), 3000);
    // The old name is a storage address, not an editor dependency.
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open("wurl-studio-v1", 1);
    } catch {
      finish([]);
      return;
    }
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onerror = request.onblocked = () => finish([]);
    request.onsuccess = () => {
      const db = request.result;
      if (finished || !db.objectStoreNames.contains("workspace")) {
        db.close();
        finish([]);
        return;
      }
      try {
        const tx = db.transaction("workspace", "readonly");
        const read = tx.objectStore("workspace").get("data");
        read.onsuccess = () => finish(publishedPuzzles(read.result));
        read.onerror = () => finish([]);
        tx.oncomplete = tx.onabort = () => {
          db.close();
          finish([]);
        };
      } catch {
        db.close();
        finish([]);
      }
    };
  });
}
export function usePublishedPuzzles() {
  const [state, setState] = useState<{
    ready: boolean;
    items: PublishedPuzzle[];
  }>({ ready: false, items: [] });
  useEffect(() => {
    let live = true;
    void readPublishedPuzzles().then((items) => {
      if (live) setState({ ready: true, items });
    });
    return () => {
      live = false;
    };
  }, []);
  return state;
}
