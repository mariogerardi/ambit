import { serviceConfig } from "./config";
import { reportFailure } from "./monitoring";
import type { SaveEntry } from "../app/recordSave";

export type SyncStatus = "syncing" | "saved" | "offline" | "error";
export interface CloudEntry extends SaveEntry {
  namespace: "daily" | "study";
}
export interface SyncStore {
  readonly prefix: string;
  readonly writable: boolean;
  entries(): SaveEntry[];
  mergeEntries(entries: SaveEntry[]): void;
}
export type ProgressStores = Record<CloudEntry["namespace"], SyncStore>;
const address = (entry: CloudEntry) =>
  JSON.stringify([entry.namespace, entry.field, entry.writer]);

export async function progressRequest<T>(
  token: string,
  signal: AbortSignal,
  body?: unknown,
  cursor?: string,
): Promise<T> {
  const timeout = AbortSignal.timeout(15000);
  const requestSignal = AbortSignal.any([signal, timeout]);
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(
      `${serviceConfig.apiUrl}/account/saves${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      {
        method: body ? "POST" : "GET",
        signal: requestSignal,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );
    if (response.status === 429 && attempt < 3) {
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timer);
          reject(requestSignal.reason);
        };
        const timer = setTimeout(
          () => {
            requestSignal.removeEventListener("abort", abort);
            resolve();
          },
          1000 * 2 ** attempt,
        );
        requestSignal.addEventListener("abort", abort, { once: true });
        if (requestSignal.aborted) abort();
      });
      continue;
    }
    if (!response.ok)
      throw new Error(
        response.status === 401
          ? "Please sign in again to sync progress."
          : "Couldn’t sync progress. Please try again.",
      );
    return response.json() as Promise<T>;
  }
}

/** Local registers are the durable outbox. Pull before pushing, and acknowledge
 * only the exact revisions sent, so writes during a request remain pending. */
export class ProgressSync {
  private controller = new AbortController();
  private acknowledged = new Map<string, number>();
  private timer?: ReturnType<typeof setTimeout>;
  private poll?: ReturnType<typeof setInterval>;
  private running = false;
  private dirty = false;
  private failures = 0;
  constructor(
    private stores: ProgressStores,
    private accessToken: () => Promise<string | undefined>,
    private status: (status: SyncStatus, message: string) => void,
    private request = progressRequest,
    private restored: () => void = () => {},
  ) {}
  private changed = (event: Event) => {
    if (
      event instanceof StorageEvent &&
      event.key !== null &&
      !Object.values(this.stores).some((store) =>
        event.key!.startsWith(store.prefix),
      )
    )
      return;
    if (
      event instanceof CustomEvent &&
      !Object.values(this.stores).some((store) => event.detail === store.prefix)
    )
      return;
    this.schedule();
  };
  private wake = () => {
    if (document.visibilityState !== "hidden") this.schedule(0);
  };
  start() {
    addEventListener("ambit-save", this.changed);
    addEventListener("storage", this.changed);
    addEventListener("online", this.wake);
    addEventListener("focus", this.wake);
    document.addEventListener("visibilitychange", this.wake);
    this.poll = setInterval(this.wake, 60000);
    this.schedule(0);
  }
  stop() {
    this.controller.abort();
    clearTimeout(this.timer);
    clearInterval(this.poll);
    removeEventListener("ambit-save", this.changed);
    removeEventListener("storage", this.changed);
    removeEventListener("online", this.wake);
    removeEventListener("focus", this.wake);
    document.removeEventListener("visibilitychange", this.wake);
  }
  schedule(delay = 1200) {
    if (this.controller.signal.aborted) return;
    this.dirty = true;
    this.status(
      navigator.onLine ? "syncing" : "offline",
      navigator.onLine
        ? "Syncing your progress…"
        : "Offline. Progress is saved on this device and will sync when you reconnect.",
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), delay);
  }
  private entries(): CloudEntry[] {
    return Object.entries(this.stores).flatMap(([namespace, store]) =>
      store
        .entries()
        .filter((entry) => !entry.field.startsWith("override."))
        .map((entry) => ({
          ...entry,
          namespace: namespace as CloudEntry["namespace"],
        })),
    );
  }
  async flush() {
    if (this.running || this.controller.signal.aborted) return;
    clearTimeout(this.timer);
    this.running = true;
    this.dirty = false;
    const signal = this.controller.signal;
    try {
      if (!Object.values(this.stores).every((store) => store.writable))
        throw new Error(
          "Saving on this device is unavailable. Cloud progress has not been changed.",
        );
      if (!navigator.onLine)
        throw new Error(
          "Offline. Progress is saved on this device and will sync when you reconnect.",
        );
      const token = await this.accessToken();
      if (!token) throw new Error("Please sign in again to sync progress.");
      if (signal.aborted) return;
      const remote: CloudEntry[] = [];
      let cursor: string | undefined;
      const cursors = new Set<string>();
      do {
        const page = await this.request<{
          entries: CloudEntry[];
          cursor?: string;
        }>(token, signal, undefined, cursor);
        if (signal.aborted) return;
        if (
          !Array.isArray(page.entries) ||
          page.entries.some(
            (entry) =>
              !entry ||
              !["daily", "study"].includes(entry.namespace) ||
              entry.version !== 2 ||
              !Number.isSafeInteger(entry.clock) ||
              entry.clock < 0 ||
              typeof entry.field !== "string" ||
              typeof entry.writer !== "string",
          )
        )
          throw new Error("Couldn’t read cloud progress. Please try again.");
        remote.push(...page.entries);
        cursor = page.cursor;
        if (cursor) {
          if (typeof cursor !== "string" || cursors.has(cursor))
            throw new Error("Couldn’t read cloud progress. Please try again.");
          cursors.add(cursor);
        }
      } while (cursor);
      for (const namespace of ["daily", "study"] as const) {
        const store = this.stores[namespace];
        store.mergeEntries(
          remote.filter((entry) => entry.namespace === namespace),
        );
        dispatchEvent(
          new CustomEvent("ambit-progress-received", { detail: store.prefix }),
        );
      }
      this.restored();
      for (const entry of remote)
        this.acknowledged.set(address(entry), entry.clock);
      const pending = this.entries().filter(
        (entry) => entry.clock > (this.acknowledged.get(address(entry)) ?? -1),
      );
      // Stay below both the record-count and UTF-8 request-size limits.
      const encoder = new TextEncoder();
      while (pending.length) {
        const batch: CloudEntry[] = [];
        let bytes = 20;
        while (pending.length && batch.length < 25) {
          const size = encoder.encode(JSON.stringify(pending[0])).length + 1;
          if (size > 950000)
            throw new Error(
              "A saved session is too large to sync. It remains on this device.",
            );
          if (batch.length && bytes + size > 950000) break;
          batch.push(pending.shift()!);
          bytes += size;
        }
        await this.request(token, signal, { entries: batch });
        if (signal.aborted) return;
        for (const entry of batch)
          this.acknowledged.set(address(entry), entry.clock);
      }
      this.failures = 0;
      if (
        this.entries().some(
          (entry) =>
            entry.clock > (this.acknowledged.get(address(entry)) ?? -1),
        )
      )
        this.dirty = true;
      if (!this.dirty)
        this.status(
          "saved",
          "Progress is saved to your account. Sign in on another device to continue.",
        );
    } catch (error) {
      if (signal.aborted) return;
      this.failures++;
      this.status(
        navigator.onLine ? "error" : "offline",
        error instanceof TypeError || error instanceof DOMException
          ? "Couldn’t connect. Progress is saved on this device; syncing will retry."
          : error instanceof Error
            ? error.message
            : "Couldn’t sync progress. Please try again.",
      );
      reportFailure("progress sync");
      this.dirty = true;
    } finally {
      this.running = false;
      if (!signal.aborted && this.dirty) {
        clearTimeout(this.timer);
        this.timer = setTimeout(
          () => void this.flush(),
          this.failures
            ? Math.min(60000, 5000 * 2 ** Math.min(this.failures - 1, 4))
            : 1200,
        );
      }
    }
  }
}
